# routes/dashboard.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from datetime import datetime, timedelta, timezone

from database.db import get_db, GridStateDB, AlertDB
from schemas.grid_schema import GridState, GridStatus, GridAction, WeatherData
from services.weather_service import fetch_current_weather
from services.grid_balancer import run_balancer
from services.alert_service import generate_alerts_from_state
from models.demand_forecaster import predict_demand, predict_solar, predict_wind
from config import settings

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", summary="Full dashboard snapshot — current state + forecast + alerts")
async def get_dashboard(
    city: str  = Query(default=settings.DEFAULT_CITY),
    lat:  float = Query(default=settings.DEFAULT_LATITUDE),
    lon:  float = Query(default=settings.DEFAULT_LONGITUDE),
    db:  AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)

    # ── 1. Fetch live weather ─────────────────────────────────────────
    weather = await fetch_current_weather(lat, lon)

    # ── 2. Run predictions for current hour ───────────────────────────
    demand_mw = predict_demand(
        hour=now.hour, day_of_week=now.weekday(), month=now.month,
        temperature=weather.temperature_c,
        cloud_cover=weather.cloud_cover_percent,
        wind_speed=weather.wind_speed_kmh,
        solar_irradiance=weather.solar_irradiance or 0
    )
    solar_mw = predict_solar(
        hour=now.hour, day_of_week=now.weekday(), month=now.month,
        temperature=weather.temperature_c,
        cloud_cover=weather.cloud_cover_percent,
        wind_speed=weather.wind_speed_kmh,
        solar_irradiance=weather.solar_irradiance or 0
    )
    wind_mw = predict_wind(weather.wind_speed_kmh)
    conventional_mw = max(0, demand_mw - solar_mw - wind_mw)

    # Battery — fetch last known level from DB, default 50%
    battery_mwh = settings.BATTERY_CAPACITY_MWH * 0.5
    last_state_res = await db.execute(
        select(GridStateDB).where(GridStateDB.city == city)
        .order_by(desc(GridStateDB.timestamp)).limit(1)
    )
    last_state = last_state_res.scalar_one_or_none()
    if last_state:
        battery_mwh = last_state.battery_level_mwh

    # ── 3. Run balancer ───────────────────────────────────────────────
    current_state = run_balancer(
        current_demand_mw=demand_mw,
        solar_generation_mw=solar_mw,
        wind_generation_mw=wind_mw,
        conventional_generation_mw=conventional_mw,
        battery_level_mwh=battery_mwh,
        city=city
    )

    # ── 4. Get recent alerts ──────────────────────────────────────────
    alerts_res = await db.execute(
        select(AlertDB)
        .where(AlertDB.city == city, AlertDB.is_resolved == False)
        .order_by(desc(AlertDB.timestamp)).limit(5)
    )
    db_alerts = alerts_res.scalars().all()

    from routes.grid import _alert_db_to_schema
    recent_alerts = [_alert_db_to_schema(a) for a in db_alerts]

    # Also add any new alerts from current state
    new_alerts = generate_alerts_from_state(current_state)
    recent_alerts = new_alerts + recent_alerts

    # ── 5. Stats for last 24h ─────────────────────────────────────────
    since_24h = now - timedelta(hours=24)
    stats_res = await db.execute(
        select(
            func.avg(GridStateDB.current_demand_mw).label("avg_demand"),
            func.max(GridStateDB.current_demand_mw).label("peak_demand"),
            func.avg(GridStateDB.solar_generation_mw).label("avg_solar"),
            func.avg(GridStateDB.wind_generation_mw).label("avg_wind"),
            func.count(GridStateDB.id).label("total_records")
        )
        .where(GridStateDB.city == city, GridStateDB.timestamp >= since_24h)
    )
    stats_row = stats_res.one()

    stats = {
        "last_24h_avg_demand_mw": round(stats_row.avg_demand or demand_mw, 2),
        "last_24h_peak_demand_mw": round(stats_row.peak_demand or demand_mw, 2),
        "last_24h_avg_solar_mw": round(stats_row.avg_solar or solar_mw, 2),
        "last_24h_avg_wind_mw": round(stats_row.avg_wind or wind_mw, 2),
        "renewable_percentage": round(
            (solar_mw + wind_mw) / max(1, demand_mw) * 100, 1
        ),
        "total_readings_stored": stats_row.total_records
    }

    return {
        "current_state": current_state,
        "weather":        weather,
        "recent_alerts":  recent_alerts[:5],
        "stats":          stats,
        "generated_at":   now.isoformat()
    }


@router.get("/summary", summary="Lightweight status summary")
async def get_summary(city: str = Query(default=settings.DEFAULT_CITY),
                       db: AsyncSession = Depends(get_db)):
    """Returns only the key metrics — useful for a status card."""
    weather = await fetch_current_weather()
    now     = datetime.now(timezone.utc)

    demand_mw = predict_demand(
        hour=now.hour, day_of_week=now.weekday(), month=now.month,
        temperature=weather.temperature_c,
        cloud_cover=weather.cloud_cover_percent,
        wind_speed=weather.wind_speed_kmh,
        solar_irradiance=weather.solar_irradiance or 0
    )
    solar_mw = predict_solar(
        hour=now.hour, day_of_week=now.weekday(), month=now.month,
        temperature=weather.temperature_c,
        cloud_cover=weather.cloud_cover_percent,
        wind_speed=weather.wind_speed_kmh,
        solar_irradiance=weather.solar_irradiance or 0
    )
    wind_mw = predict_wind(weather.wind_speed_kmh)

    return {
        "city":              city,
        "timestamp":         now.isoformat(),
        "demand_mw":         round(demand_mw, 1),
        "solar_mw":          round(solar_mw, 1),
        "wind_mw":           round(wind_mw, 1),
        "temperature_c":     weather.temperature_c,
        "cloud_cover":       weather.cloud_cover_percent,
        "renewable_share_pct": round((solar_mw + wind_mw) / max(1, demand_mw) * 100, 1)
    }
