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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from config import settings
from database.db import init_db
from routes.grid import router as grid_router
from routes.forecast import router as forecast_router
from routes.dashboard import router as dashboard_router
from routes.websocket_route import router as ws_router
from models.demand_forecaster import get_models   # pre-load models on startup

# ─── Scheduled task: auto-balance every minute ────────────────────────
scheduler = AsyncIOScheduler()

async def auto_balance_task():
    """
    Background job: fetch weather + run predictions + log grid state.
    Runs every BALANCE_INTERVAL_SECONDS (default: 60s).
    """
    try:
        from services.weather_service import fetch_current_weather
        from models.demand_forecaster import predict_demand, predict_solar, predict_wind
        from services.grid_balancer import run_balancer, update_battery
        from services.alert_service import generate_alerts_from_state
        from database.db import AsyncSessionLocal, GridStateDB, AlertDB

        now     = datetime.now(timezone.utc)
        weather = await fetch_current_weather()

        demand_mw = predict_demand(
            hour=now.hour, day_of_week=now.weekday(), month=now.month,
            temperature=weather.temperature_c,
            cloud_cover=weather.cloud_cover_percent,
            wind_speed=weather.wind_speed_kmh,
            solar_irradiance=weather.solar_irradiance or 0
        )
        solar_mw       = predict_solar(
            hour=now.hour, day_of_week=now.weekday(), month=now.month,
            temperature=weather.temperature_c,
            cloud_cover=weather.cloud_cover_percent,
            wind_speed=weather.wind_speed_kmh,
            solar_irradiance=weather.solar_irradiance or 0
        )
        wind_mw        = predict_wind(weather.wind_speed_kmh)
        conventional   = max(0, demand_mw - solar_mw - wind_mw)

        # Use a fixed battery level for the scheduler (simplified)
        battery_mwh = settings.BATTERY_CAPACITY_MWH * 0.5

        state = run_balancer(
            current_demand_mw=demand_mw,
            solar_generation_mw=solar_mw,
            wind_generation_mw=wind_mw,
            conventional_generation_mw=conventional,
            battery_level_mwh=battery_mwh,
            city=settings.DEFAULT_CITY
        )

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
            await db.commit()

        print(f"[{now.strftime('%H:%M:%S')}] ⚡ Auto-balanced | "
              f"Demand: {demand_mw:.0f} MW | "
              f"Solar: {solar_mw:.0f} MW | "
              f"Status: {state.grid_status.value}")

    except Exception as e:
        print(f"❌ Auto-balance error: {e}")


# ─── App Lifespan ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} v{settings.VERSION}")
    await init_db()
    get_models()   # pre-load / train ML models

    scheduler.add_job(
        auto_balance_task,
        "interval",
        seconds=settings.BALANCE_INTERVAL_SECONDS,
        id="auto_balance",
        replace_existing=True
    )
    scheduler.start()
    print(f"⏰ Scheduler started — balancing every {settings.BALANCE_INTERVAL_SECONDS}s")

    yield  # app runs here

    # Shutdown
    scheduler.shutdown()
    print("🛑 Scheduler stopped. Goodbye!")


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
