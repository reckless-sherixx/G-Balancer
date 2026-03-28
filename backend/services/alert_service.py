# services/alert_service.py
from datetime import datetime, timezone
from typing import List
from schemas.grid_schema import Alert, AlertSeverity, GridState, GridStatus, GridAction


def _resolve_alert_action(state: GridState) -> GridAction:
    """Return an actionable recommendation for alerts, avoiding NO_ACTION on deficit states."""
    current = state.recommended_action
    if current != GridAction.NO_ACTION:
        return current

    # Deficit states should never suggest NO_ACTION.
    if state.grid_status == GridStatus.CRITICAL:
        return GridAction.DISCHARGE_BATTERY if state.battery_percentage > 12 else GridAction.REDUCE_LOAD
    if state.grid_status == GridStatus.WARNING:
        return GridAction.DISCHARGE_BATTERY

    return GridAction.NO_ACTION

def generate_alerts_from_state(state: GridState) -> List[Alert]:
    """
    Analyse a GridState and produce zero or more Alert objects.
    """
    alerts: List[Alert] = []
    now = datetime.now(timezone.utc)
    recommended_action = _resolve_alert_action(state)

    # ── Critical demand alert ─────────────────────────────────────────
    if state.grid_status == GridStatus.CRITICAL:
        alerts.append(Alert(
            timestamp=now,
            city=state.city,
            severity=AlertSeverity.CRITICAL,
            title="🚨 Critical Grid Deficit",
            message=(
                f"Demand exceeds supply by {abs(state.net_balance_mw):.0f} MW. "
                f"Risk of blackout in {state.city}. "
                f"Immediate action required."
            ),
            recommended_action=recommended_action
        ))

    # ── Warning alert ─────────────────────────────────────────────────
    elif state.grid_status == GridStatus.WARNING:
        alerts.append(Alert(
            timestamp=now,
            city=state.city,
            severity=AlertSeverity.HIGH,
            title="⚠️ Grid Supply Warning",
            message=(
                f"Supply deficit of {abs(state.net_balance_mw):.0f} MW detected. "
                f"Battery at {state.battery_percentage:.0f}%. "
                f"Monitor closely."
            ),
            recommended_action=recommended_action
        ))

    # ── Low battery alert ─────────────────────────────────────────────
    if state.battery_percentage < 15:
        alerts.append(Alert(
            timestamp=now,
            city=state.city,
            severity=AlertSeverity.HIGH,
            title="🔋 Battery Storage Critical",
            message=(
                f"Battery level is critically low at {state.battery_percentage:.0f}% "
                f"({state.battery_level_mwh:.0f} MWh). "
                f"Charge immediately when surplus is available."
            ),
            recommended_action=GridAction.STORE_ENERGY
        ))

    # ── Surplus alert ─────────────────────────────────────────────────
    elif state.grid_status == GridStatus.SURPLUS and state.battery_percentage > 90:
        alerts.append(Alert(
            timestamp=now,
            city=state.city,
            severity=AlertSeverity.LOW,
            title="⚡ Energy Surplus — Reroute Required",
            message=(
                f"Surplus of {state.net_balance_mw:.0f} MW with batteries near full "
                f"({state.battery_percentage:.0f}%). "
                f"Rerouting to neighbouring grid."
            ),
            recommended_action=GridAction.REROUTE_ENERGY
        ))

    # ── Solar drop alert ──────────────────────────────────────────────
    if state.solar_generation_mw < 50 and 9 <= datetime.now().hour <= 15:
        alerts.append(Alert(
            timestamp=now,
            city=state.city,
            severity=AlertSeverity.MEDIUM,
            title="☁️ Solar Generation Drop",
            message=(
                f"Solar output has dropped to {state.solar_generation_mw:.0f} MW "
                f"during peak solar hours. Likely due to heavy cloud cover."
            ),
            recommended_action=GridAction.DISCHARGE_BATTERY
        ))

    return alerts
