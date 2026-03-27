# routes/grid.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timedelta, timezone
from typing import List

from database.db import get_db, GridStateDB, AlertDB
from schemas.grid_schema import GridState, GridStateCreate, Alert
from services.grid_balancer import run_balancer, update_battery
from services.alert_service import generate_alerts_from_state
from config import settings

router = APIRouter(prefix="/grid", tags=["Grid"])

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

    # Update battery simulation
    _battery_level_mwh = update_battery(
        _battery_level_mwh, state.recommended_action, state.net_balance_mw
    )

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
    return state


@router.get("/state/latest", response_model=GridState,
            summary="Get latest grid state for a city")
async def get_latest_state(city: str = Query(default=settings.DEFAULT_CITY),
                            db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GridStateDB)
        .where(GridStateDB.city == city)
        .order_by(desc(GridStateDB.timestamp))
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="No grid state found for this city")
    return _db_to_schema(record)


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
    result = await db.execute(
        select(AlertDB)
        .where(AlertDB.city == city, AlertDB.is_resolved == resolved)
        .order_by(desc(AlertDB.timestamp))
        .limit(limit)
    )
    records = result.scalars().all()
    return [_alert_db_to_schema(r) for r in records]


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


# ─── Helpers ──────────────────────────────────────────────────────────
from schemas.grid_schema import GridStatus, GridAction

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
