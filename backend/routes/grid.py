# routes/grid.py
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timedelta, timezone
from typing import List
import json
import logging

from database.db import get_db, GridStateDB, AlertDB
from schemas.grid_schema import GridState, GridStateCreate, Alert
from services.grid_balancer import run_balancer, update_battery
from services.alert_service import generate_alerts_from_state
from services.forecast_service import get_forecast_recommendations
from services.grid_inference_service import run_grid_inference
from config import settings
from redis_client import redis_client, is_redis_available
from redis_keys import (
    GRID_STATE_LATEST,
    GRID_STATE_LATEST_TTL,
    GRID_ALERTS,
    GRID_ALERTS_TTL,
    normalize_city,
)

router = APIRouter(prefix="/grid", tags=["Grid"])
logger = logging.getLogger(__name__)

# Global battery state (in production, persist this in DB)
_battery_level_mwh: float = settings.BATTERY_CAPACITY_MWH * 0.5  # start at 50%


@router.post("/state", response_model=GridState,
             summary="Submit current grid readings and get balancing decision")
async def submit_grid_state(payload: GridStateCreate,
                             db: AsyncSession = Depends(get_db)):
    global _battery_level_mwh

    state = run_balancer(
        current_demand_mw=payload.current_demand_mw,
        solar_generation_mw=payload.solar_generation_mw,
        wind_generation_mw=payload.wind_generation_mw,
        conventional_generation_mw=payload.conventional_generation_mw,
        battery_level_mwh=payload.battery_level_mwh,
        city=payload.city
    )

    # Get forecast recommendation for next hour to inform battery strategy
    forecast_action = state.recommended_action
    try:
        next_hour_forecast = await get_forecast_recommendations(
            city=payload.city,
            hours_ahead=1
        )
        if next_hour_forecast:
            # Use next hour's recommendation to enhance current decision
            # If next hour needs discharge but current doesn't, prepare battery
            # If next hour needs storage but current has surplus, charge aggressively
            forecast_action = next_hour_forecast
    except Exception as e:
        # Fallback to current action if forecast unavailable
        print(f"Forecast lookup failed: {e}")
        forecast_action = state.recommended_action

    # Update battery simulation using combined current + forecast strategy
    _battery_level_mwh, battery_status = update_battery(
        _battery_level_mwh, forecast_action, state.net_balance_mw
    )
    
    # Update state with latest battery level and status
    state.battery_level_mwh = _battery_level_mwh
    state.battery_percentage = (_battery_level_mwh / settings.BATTERY_CAPACITY_MWH) * 100
    state.battery_status = battery_status

    # Persist to DB
    db_record = GridStateDB(
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
    )
    db.add(db_record)

    # Generate and save alerts
    alerts = generate_alerts_from_state(state)
    for a in alerts:
        db.add(AlertDB(
            timestamp=a.timestamp, city=a.city,
            severity=a.severity.value, title=a.title,
            message=a.message,
            recommended_action=a.recommended_action.value
        ))

    await db.commit()

    # Update latest-state cache
    cache_city = normalize_city(state.city)
    latest_key = GRID_STATE_LATEST.format(city=cache_city)
    try:
        if await is_redis_available() and redis_client.client is not None:
            await redis_client.client.setex(
                latest_key,
                GRID_STATE_LATEST_TTL,
                json.dumps(state.model_dump(mode="json")),
            )
    except Exception as exc:
        logger.warning("grid latest-state cache write failed (%s): %s", latest_key, exc)

    # Invalidate alerts cache whenever new alerts are created
    if alerts:
        alerts_key = GRID_ALERTS.format(city=cache_city)
        try:
            if await is_redis_available() and redis_client.client is not None:
                await redis_client.client.delete(alerts_key)
        except Exception as exc:
            logger.warning("grid alerts cache invalidation failed (%s): %s", alerts_key, exc)

    return state


@router.get("/state/latest", response_model=GridState,
            summary="Get latest grid state for a city")
async def get_latest_state(city: str = Query(default=settings.DEFAULT_CITY),
                            db: AsyncSession = Depends(get_db),
                            response: Response = None):
    cache_city = normalize_city(city)
    latest_key = GRID_STATE_LATEST.format(city=cache_city)

    redis_available = await is_redis_available()
    if redis_available and redis_client.client is not None:
        try:
            cached_payload = await redis_client.client.get(latest_key)
            if cached_payload:
                if response is not None:
                    response.headers["X-Cache"] = "HIT"
                return json.loads(cached_payload)
        except Exception as exc:
            logger.warning("grid latest-state cache read failed (%s): %s", latest_key, exc)

    result = await db.execute(
        select(GridStateDB)
        .where(GridStateDB.city == city)
        .order_by(desc(GridStateDB.timestamp))
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="No grid state found for this city")

    state = _db_to_schema(record)
    if redis_available and redis_client.client is not None:
        if response is not None:
            response.headers["X-Cache"] = "MISS"
        try:
            await redis_client.client.setex(
                latest_key,
                GRID_STATE_LATEST_TTL,
                json.dumps(state.model_dump(mode="json")),
            )
        except Exception as exc:
            logger.warning("grid latest-state cache write failed (%s): %s", latest_key, exc)
    return state


@router.get("/history", response_model=List[GridState],
            summary="Get grid state history for past N hours")
async def get_grid_history(city: str = Query(default=settings.DEFAULT_CITY),
                            hours: int = Query(default=24, ge=1, le=168),
                            db: AsyncSession = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await db.execute(
        select(GridStateDB)
        .where(GridStateDB.city == city, GridStateDB.timestamp >= since)
        .order_by(desc(GridStateDB.timestamp))
    )
    records = result.scalars().all()
    return [_db_to_schema(r) for r in records]


@router.get("/alerts", response_model=List[Alert],
            summary="Get recent alerts")
async def get_alerts(city: str = Query(default=settings.DEFAULT_CITY),
                     resolved: bool = Query(default=False),
                     limit: int = Query(default=20, ge=1, le=100),
                     db: AsyncSession = Depends(get_db)):
    cache_city = normalize_city(city)
    alerts_key = GRID_ALERTS.format(city=cache_city)

    redis_available = await is_redis_available()
    if redis_available and redis_client.client is not None:
        try:
            cached_payload = await redis_client.client.get(alerts_key)
            if cached_payload:
                parsed = json.loads(cached_payload)
                if isinstance(parsed, list):
                    return parsed
        except Exception as exc:
            logger.warning("grid alerts cache read failed (%s): %s", alerts_key, exc)

    result = await db.execute(
        select(AlertDB)
        .where(AlertDB.city == city, AlertDB.is_resolved == resolved)
        .order_by(desc(AlertDB.timestamp))
        .limit(limit)
    )
    records = result.scalars().all()
    response_payload = [_alert_db_to_schema(r) for r in records]

    if redis_available and redis_client.client is not None:
        try:
            await redis_client.client.setex(
                alerts_key,
                GRID_ALERTS_TTL,
                json.dumps([a.model_dump(mode="json") for a in response_payload]),
            )
        except Exception as exc:
            logger.warning("grid alerts cache write failed (%s): %s", alerts_key, exc)

    return response_payload


@router.patch("/alerts/{alert_id}/resolve",
              summary="Mark an alert as resolved")
async def resolve_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AlertDB).where(AlertDB.id == alert_id))
    alert  = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    await db.commit()
    return {"message": f"Alert {alert_id} resolved"}


@router.get("/infer", response_model=dict,
            summary="Run ML inference on 72-hour window for demand/supply forecast and grid action recommendation")
async def run_inference(city: str = Query(default=settings.DEFAULT_CITY),
                        device: str = Query(default="cpu", description="Device: 'cpu' or 'cuda'"),
                        db: AsyncSession = Depends(get_db)):
    """
    Run Smart Grid ML Inference Service.
    
    This endpoint:
    1. Fetches 72 hours of historical grid data
    2. Structures data into 13 features (solar, wind, demand, battery, temporal, etc.)
    3. Preprocesses with MinMaxScaler
    4. Runs LSTM Forecaster to predict next 6 hours (supply & demand)
    5. Runs XGBoost Recommender to suggest grid action (STORE/RELEASE/REDISTRIBUTE)
    
    Returns:
    ```json
    {
        "timestamp": "2026-03-28T...",
        "city": "Mumbai",
        "recommendation": "STORE|RELEASE|REDISTRIBUTE",
        "confidence": 0.85,
        "forecast_6h": [
            {"hour": 1, "supply_mw": X, "demand_mw": Y, "balance_mw": Z},
            ...
        ],
        "data_points": 72,
        "status": "success"
    }
    ```
    """
    result = await run_grid_inference(db, city=city, device=device)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message", "Inference failed"))
    
    return result


# ─── Helpers ──────────────────────────────────────────────────────────
from schemas.grid_schema import GridStatus, GridAction, BatteryStatus

def _db_to_schema(r: GridStateDB) -> GridState:
    return GridState(
        timestamp=r.timestamp,
        city=r.city,
        current_demand_mw=r.current_demand_mw,
        solar_generation_mw=r.solar_generation_mw,
        wind_generation_mw=r.wind_generation_mw,
        conventional_generation_mw=r.conventional_generation_mw,
        total_supply_mw=r.total_supply_mw,
        net_balance_mw=r.net_balance_mw,
        battery_level_mwh=r.battery_level_mwh,
        battery_percentage=r.battery_percentage,
        battery_status=BatteryStatus(r.battery_status),
        grid_status=GridStatus(r.grid_status),
        recommended_action=GridAction(r.recommended_action),
        action_description=r.action_description
    )

def _alert_db_to_schema(r: AlertDB) -> Alert:
    from schemas.grid_schema import AlertSeverity
    return Alert(
        id=r.id,
        timestamp=r.timestamp,
        city=r.city,
        severity=AlertSeverity(r.severity),
        title=r.title,
        message=r.message,
        recommended_action=GridAction(r.recommended_action),
        is_resolved=r.is_resolved
    )
