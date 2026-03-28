# main.py
"""
Intelligent Energy Grid Balancer — FastAPI Backend
===================================================
Run with:  uvicorn main:app --reload --port 8000
Docs at:   http://localhost:8000/docs
"""
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import settings
from database.db import init_db, migrate_add_battery_status
from routes.grid import router as grid_router
from routes.forecast import router as forecast_router
from routes.dashboard import router as dashboard_router
from routes.websocket_route import router as ws_router
from routes.mobile_compat import router as mobile_router
from routes.insights import router as insights_router
from models.demand_forecaster import get_models   # pre-load models on startup
from redis_client import redis_client, publish_grid_update
from redis_keys import GRID_ALERTS, normalize_city

# ─── Scheduled task: auto-balance every minute ────────────────────────
scheduler = AsyncIOScheduler()
_auto_battery_level_mwh: float = settings.BATTERY_CAPACITY_MWH * 0.5
IST = ZoneInfo("Asia/Kolkata")


def _battery_status_from_action(action_value: str | None) -> str:
    """Map grid action labels to battery status labels used by DB schema."""
    if not action_value:
        return "idle"
    normalized = str(action_value).lower()
    if normalized in {"store_energy", "store", "charging"}:
        return "charging"
    if normalized in {"discharge_battery", "release", "discharging"}:
        return "discharging"
    return "idle"

async def auto_balance_task():
    """
    Background job: fetch weather + run predictions + log grid state.
    Uses forecast recommendations to inform battery charging/discharging strategy.
    Runs every BALANCE_INTERVAL_SECONDS (default: 60s).
    """
    try:
        global _auto_battery_level_mwh

        from services.weather_service import fetch_current_weather
        from models.demand_forecaster import predict_demand, predict_solar, predict_wind
        from services.grid_balancer import run_balancer, update_battery
        from services.alert_service import generate_alerts_from_state
        from services.forecast_service import get_forecast_recommendations
        from database.db import AsyncSessionLocal, GridStateDB, AlertDB

        now = datetime.now(timezone.utc)
        local_now = datetime.now(IST)
        weather = await fetch_current_weather()

        demand_mw = predict_demand(
            hour=local_now.hour, day_of_week=local_now.weekday(), month=local_now.month,
            temperature=weather.temperature_c,
            cloud_cover=weather.cloud_cover_percent,
            wind_speed=weather.wind_speed_kmh,
            solar_irradiance=weather.solar_irradiance or 0
        )
        solar_mw       = predict_solar(
            hour=local_now.hour, day_of_week=local_now.weekday(), month=local_now.month,
            temperature=weather.temperature_c,
            cloud_cover=weather.cloud_cover_percent,
            wind_speed=weather.wind_speed_kmh,
            solar_irradiance=weather.solar_irradiance or 0
        )
        wind_mw        = predict_wind(weather.wind_speed_kmh)

        # Avoid perfectly balancing supply=demand every cycle so dashboard reflects
        # real surplus/deficit dynamics from weather + time-of-day conditions.
        peak_bias = 120.0 if 18 <= local_now.hour <= 22 else (-80.0 if 1 <= local_now.hour <= 5 else 0.0)
        weather_bias = (weather.cloud_cover_percent * 1.8) - (weather.wind_speed_kmh * 0.9)
        conventional_target = demand_mw * 0.58 + weather_bias + peak_bias
        conventional = max(600.0, min(2800.0, conventional_target))

        battery_mwh = _auto_battery_level_mwh

        state = run_balancer(
            current_demand_mw=demand_mw,
            solar_generation_mw=solar_mw,
            wind_generation_mw=wind_mw,
            conventional_generation_mw=conventional,
            battery_level_mwh=battery_mwh,
            city=settings.DEFAULT_CITY
        )

        # Publish event-driven updates via Redis pub/sub (graceful no-op if unavailable)
        try:
            await publish_grid_update(state.city, state.model_dump(mode="json"))
        except Exception:
            # pub/sub must never break balancing flow
            pass

        # Enhanced battery strategy: Use forecast for next hour to inform decisions
        battery_action = state.recommended_action
        try:
            next_hour_action = await get_forecast_recommendations(
                city=settings.DEFAULT_CITY,
                hours_ahead=1,
                latitude=settings.DEFAULT_LATITUDE,
                longitude=settings.DEFAULT_LONGITUDE
            )
            if next_hour_action:
                battery_action = next_hour_action
                print(f"  📊 Forecast (next hour): {battery_action.value} → Using forecast-informed strategy")
        except Exception as e:
            print(f"  ⚠️  Forecast lookup failed: {e}, using current action")

        # Persist battery evolution across scheduler ticks.
        interval_hours = max(1e-6, settings.BALANCE_INTERVAL_SECONDS / 3600.0)
        _auto_battery_level_mwh, battery_status = update_battery(
            battery_level_mwh=_auto_battery_level_mwh,
            action=battery_action,
            net_balance_mw=state.net_balance_mw,
            interval_hours=interval_hours,
        )

        # Reflect updated battery + forecast-informed action in persisted state.
        state.battery_level_mwh = _auto_battery_level_mwh
        state.battery_percentage = round((_auto_battery_level_mwh / settings.BATTERY_CAPACITY_MWH) * 100, 1)
        state.battery_status = battery_status
        if battery_action is not None:
            state.recommended_action = battery_action

        async with AsyncSessionLocal() as db:
            db.add(GridStateDB(
                timestamp=state.timestamp,
                city=state.city,
                current_demand_mw=state.current_demand_mw,
                solar_generation_mw=state.solar_generation_mw,
                wind_generation_mw=state.wind_generation_mw,
                conventional_generation_mw=state.conventional_generation_mw,
                total_supply_mw=state.total_supply_mw,
                net_balance_mw=state.net_balance_mw,
                battery_level_mwh=state.battery_level_mwh,
                battery_percentage=state.battery_percentage,
                battery_status=state.battery_status.value,
                grid_status=state.grid_status.value,
                recommended_action=state.recommended_action.value,
                action_description=state.action_description
            ))
            alerts = generate_alerts_from_state(state)
            for a in alerts:
                db.add(AlertDB(
                    timestamp=a.timestamp, city=a.city,
                    severity=a.severity.value, title=a.title,
                    message=a.message,
                    recommended_action=a.recommended_action.value
                ))
            # Invalidate alerts cache whenever new alerts are written
            if alerts:
                try:
                    if await redis_client.is_redis_available() and redis_client.client is not None:
                        alerts_key = GRID_ALERTS.format(city=normalize_city(state.city))
                        await redis_client.client.delete(alerts_key)
                except Exception:
                    pass
            await db.commit()

        print(f"[{now.strftime('%H:%M:%S')}] ⚡ Auto-balanced | "
              f"Demand: {demand_mw:.0f} MW | "
              f"Solar: {solar_mw:.0f} MW | "
              f"Action: {battery_action.value} | "
              f"Status: {state.grid_status.value}")

    except Exception as e:
        print(f"❌ Auto-balance error: {e}")


# ─── App Lifespan ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("\n" + "="*70)
    print(f"🚀 Starting {settings.APP_NAME} v{settings.VERSION}")
    print("="*70)
    print(f"⏰ Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print(f"🌍 Location: {settings.DEFAULT_CITY} ({settings.DEFAULT_LATITUDE}, {settings.DEFAULT_LONGITUDE})")
    print(f"🔌 Port: 8000")
    print(f"📚 Docs: http://localhost:8000/docs")
    
    print("\n📋 Initialization steps:")
    
    print("   1️⃣  Initializing database...")
    await init_db()
    print("      ✅ Database ready")
    
    print("   1️⃣.5️⃣ Running migrations...")
    await migrate_add_battery_status()
    print("      ✅ Migrations complete")
    
    print("   2️⃣  Loading ML models...")
    get_models()   # pre-load / train ML models
    print("      ✅ Models loaded")

    print("   3️⃣  Starting scheduler...")
    scheduler.add_job(
        auto_balance_task,
        "interval",
        seconds=settings.BALANCE_INTERVAL_SECONDS,
        id="auto_balance",
        replace_existing=True
    )
    scheduler.start()
    print(f"      ✅ Scheduler started (interval: {settings.BALANCE_INTERVAL_SECONDS}s)")

    print("   4️⃣  Connecting Redis...")
    print(f"      🔎 Redis target: {redis_client.get_provider_name()}")
    redis_ok = await redis_client.connect()
    if redis_ok:
        print("      ✅ Redis connected")
    else:
        print("      ⚠️  Redis unavailable - running without cache/pubsub")
    
    print("\n✅ App startup complete!")
    print("="*70)
    print("Ready to receive requests on:")
    print("  📱 Mobile endpoints: /simulate, /grid-status, /predict")
    print("  📊 Forecast endpoint: /forecast")
    print("  📡 Dashboard: /dashboard")
    print("  🔌 WebSocket: /ws/grid/{city}")
    print("  📚 API Docs: /docs")
    print("="*70 + "\n")

    yield  # app runs here

    # Shutdown
    print("\n🛑 Shutting down...")
    scheduler.shutdown()
    await redis_client.disconnect()
    print("✅ Scheduler stopped. Goodbye!\n")


# ─── App Instance ─────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="""
## Intelligent Energy Grid Balancer API

Balances renewable and conventional energy supply against real-time demand using:
- **ML Forecasting** (XGBoost) for demand & solar prediction
- **Live Weather** via Open-Meteo (free, no key needed)
- **Automated Grid Actions** (store / discharge / reroute / load-shed)
- **Real-time WebSocket** stream for dashboard
- **Alert System** for anomaly detection
    """,
    lifespan=lifespan
)

# ─── CORS (allow React frontend) ──────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ─── Routers ──────────────────────────────────────────────────────────
app.include_router(grid_router)
app.include_router(forecast_router)
app.include_router(dashboard_router)
app.include_router(ws_router)
app.include_router(mobile_router)  # Mobile app compatibility endpoints
app.include_router(mobile_router, prefix="/mobile")  # Alias paths for /mobile/* clients
app.include_router(insights_router, prefix="/insights", tags=["insights"])


# ─── Root ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
async def root():
    return {
        "app":     settings.APP_NAME,
        "version": settings.VERSION,
        "docs":    "/docs",
        "status":  "running",
        "endpoints": {
            "dashboard":       "GET  /dashboard/",
            "current_state":   "GET  /grid/state/latest",
            "submit_readings": "POST /grid/state",
            "forecast":        "POST /forecast/",
            "quick_forecast":  "GET  /forecast/quick",
            "alerts":          "GET  /grid/alerts",
            "websocket":       "WS   /ws/grid/{city}"
        }
    }


@app.get("/health", tags=["Root"])
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scheduler_running": scheduler.running
    }
