from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database.db import GridStateDB, get_db
from schemas.grid_schema import (
    AlertSeverity,
    BatteryStatus,
    GridAction,
    GridState,
    GridStatus,
)
from services.alert_service import generate_alerts_from_state
from services.carbon_tracker import calculate_carbon_saved
from services.festival_calendar import (
    INDIA_FESTIVALS_2026,
    IPL_2026_MATCHES,
    apply_festival_adjustment,
    get_demand_multiplier,
)

router = APIRouter()
IST = ZoneInfo("Asia/Kolkata")

SEVERITY_ORDER = {
    "CRITICAL": 4,
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
    "NONE": 0,
}


def _db_to_grid_state(record: GridStateDB) -> GridState:
    return GridState(
        timestamp=record.timestamp,
        city=record.city,
        current_demand_mw=record.current_demand_mw,
        solar_generation_mw=record.solar_generation_mw,
        wind_generation_mw=record.wind_generation_mw,
        conventional_generation_mw=record.conventional_generation_mw,
        total_supply_mw=record.total_supply_mw,
        net_balance_mw=record.net_balance_mw,
        battery_level_mwh=record.battery_level_mwh,
        battery_percentage=record.battery_percentage,
        battery_status=BatteryStatus(record.battery_status),
        grid_status=GridStatus(record.grid_status),
        recommended_action=GridAction(record.recommended_action),
        action_description=record.action_description,
    )


async def _get_latest_state(db: AsyncSession, city: str) -> GridState | None:
    normalized_city = (city or "").strip().lower()

    if normalized_city:
        result = await db.execute(
            select(GridStateDB)
            .where(func.lower(GridStateDB.city) == normalized_city)
            .order_by(desc(GridStateDB.timestamp))
            .limit(1)
        )
        record = result.scalar_one_or_none()
        if record:
            return _db_to_grid_state(record)

    default_city = (settings.DEFAULT_CITY or "").strip().lower()
    if default_city and default_city != normalized_city:
        result = await db.execute(
            select(GridStateDB)
            .where(func.lower(GridStateDB.city) == default_city)
            .order_by(desc(GridStateDB.timestamp))
            .limit(1)
        )
        record = result.scalar_one_or_none()
        if record:
            return _db_to_grid_state(record)

    # Final fallback: latest state across all cities so insights never show all-zero
    result = await db.execute(
        select(GridStateDB)
        .order_by(desc(GridStateDB.timestamp))
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        return None
    return _db_to_grid_state(record)


def _alert_to_dict(alert: Any) -> dict[str, Any]:
    severity = str(alert.severity.value).upper() if hasattr(alert.severity, "value") else str(alert.severity).upper()
    recommended_action = (
        str(alert.recommended_action.value)
        if hasattr(alert.recommended_action, "value")
        else str(alert.recommended_action)
    )
    return {
        "severity": severity,
        "title": str(alert.title),
        "message": str(alert.message),
        "recommended_action": recommended_action,
        "timestamp": alert.timestamp.isoformat(),
    }


def _build_upcoming_events(base_demand_mw: float, days_ahead: int) -> list[dict[str, Any]]:
    today = datetime.now(IST).date()
    events: list[dict[str, Any]] = []

    for day_offset in range(days_ahead + 1):
        target_date = today + timedelta(days=day_offset)
        multiplier, event_name = get_demand_multiplier(target_date)

        if multiplier <= 1.0:
            continue

        expected_demand_mw, resolved_event_name = apply_festival_adjustment(
            base_demand=base_demand_mw,
            target_date=target_date,
        )

        events.append(
            {
                "date": target_date.isoformat(),
                "event_name": resolved_event_name or event_name,
                "demand_multiplier": round(multiplier, 2),
                "base_demand_mw": round(base_demand_mw, 2),
                "expected_demand_mw": round(expected_demand_mw, 2),
                "days_until": day_offset,
                "is_high_impact": multiplier >= 1.20,
            }
        )

    events.sort(key=lambda item: item["date"])
    return events


@router.get("/alerts")
async def get_insights_alerts(
    city: str = Query(default=settings.DEFAULT_CITY),
    db: AsyncSession = Depends(get_db),
):
    latest_state = await _get_latest_state(db, city)
    resolved_city = latest_state.city if latest_state is not None else city
    if latest_state is None:
        return {
            "city": resolved_city,
            "alert_count": 0,
            "alerts": [],
        }

    alerts = generate_alerts_from_state(latest_state)
    payload_alerts = [_alert_to_dict(alert) for alert in alerts]

    return {
        "city": resolved_city,
        "alert_count": len(payload_alerts),
        "alerts": payload_alerts,
    }


@router.get("/carbon")
async def get_insights_carbon(
    city: str = Query(default=settings.DEFAULT_CITY),
    db: AsyncSession = Depends(get_db),
):
    latest_state = await _get_latest_state(db, city)
    resolved_city = latest_state.city if latest_state is not None else city

    solar_mw = latest_state.solar_generation_mw if latest_state else 0.0
    wind_mw = latest_state.wind_generation_mw if latest_state else 0.0
    total_supply_mw = latest_state.total_supply_mw if latest_state else 0.0

    solar_mwh = float(solar_mw)
    wind_mwh = float(wind_mw)
    carbon = calculate_carbon_saved(solar_mwh=solar_mwh, wind_mwh=wind_mwh)

    renewable_mw = float(solar_mw) + float(wind_mw)
    renewable_percentage = (
        (renewable_mw / float(total_supply_mw) * 100.0)
        if float(total_supply_mw) > 0
        else 0.0
    )

    return {
        "city": resolved_city,
        "solar_mw": round(float(solar_mw), 2),
        "wind_mw": round(float(wind_mw), 2),
        "renewable_percentage": round(renewable_percentage, 2),
        "carbon": carbon,
        "generated_at": datetime.now(IST).isoformat(),
    }


@router.get("/festivals")
async def get_insights_festivals(
    city: str = Query(default=settings.DEFAULT_CITY),
    days_ahead: int = Query(default=30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    latest_state = await _get_latest_state(db, city)
    resolved_city = latest_state.city if latest_state is not None else city
    has_state = latest_state is not None
    base_demand_mw = latest_state.current_demand_mw if latest_state else 0.0

    upcoming_events = _build_upcoming_events(base_demand_mw=float(base_demand_mw), days_ahead=days_ahead)
    next_high_impact_event = next((event for event in upcoming_events if event["is_high_impact"]), None)

    response = {
        "city": resolved_city,
        "days_ahead": days_ahead,
        "upcoming_events": upcoming_events,
        "next_high_impact_event": next_high_impact_event,
    }

    if not has_state:
        response["note"] = "No grid state found; base_demand_mw defaulted to 0.0"

    return response


@router.get("/summary")
async def get_insights_summary(
    city: str = Query(default=settings.DEFAULT_CITY),
    db: AsyncSession = Depends(get_db),
):
    latest_state = await _get_latest_state(db, city)
    resolved_city = latest_state.city if latest_state is not None else city

    if latest_state is None:
        alerts: list[Any] = []
        alert_count = 0
        highest_severity = "NONE"
        solar_mw = 0.0
        wind_mw = 0.0
        total_supply_mw = 0.0
        base_demand_mw = 0.0
    else:
        alerts = generate_alerts_from_state(latest_state)
        alert_count = len(alerts)
        severity_values = [
            (str(alert.severity.value).upper() if hasattr(alert.severity, "value") else str(alert.severity).upper())
            for alert in alerts
        ]
        highest_severity = "NONE"
        if severity_values:
            highest_severity = max(severity_values, key=lambda value: SEVERITY_ORDER.get(value, 0))

        solar_mw = float(latest_state.solar_generation_mw)
        wind_mw = float(latest_state.wind_generation_mw)
        total_supply_mw = float(latest_state.total_supply_mw)
        base_demand_mw = float(latest_state.current_demand_mw)

    carbon_data = calculate_carbon_saved(solar_mwh=solar_mw, wind_mwh=wind_mw)
    renewable_percentage = (
        ((solar_mw + wind_mw) / total_supply_mw * 100.0)
        if total_supply_mw > 0
        else 0.0
    )

    upcoming_events = _build_upcoming_events(base_demand_mw=base_demand_mw, days_ahead=90)
    next_event = upcoming_events[0] if upcoming_events else None

    next_event_payload = None
    if next_event is not None:
        next_event_payload = {
            "date": next_event["date"],
            "event_name": next_event["event_name"],
            "days_until": next_event["days_until"],
            "demand_multiplier": next_event["demand_multiplier"],
        }

    return {
        "city": resolved_city,
        "alert_count": alert_count,
        "highest_severity": highest_severity,
        "carbon_saved_today_kg": round(float(carbon_data.get("co2_saved_kg", 0.0)), 2),
        "renewable_percentage": round(renewable_percentage, 2),
        "next_event": next_event_payload,
        "generated_at": datetime.now(IST).isoformat(),
    }
