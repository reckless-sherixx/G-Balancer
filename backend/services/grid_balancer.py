# services/grid_balancer.py
"""
Core Grid Balancing Engine.
Compares supply vs demand and decides what action to take.
"""
from datetime import datetime, timezone
from schemas.grid_schema import GridState, GridStatus, GridAction, BatteryStatus
from config import settings


def calculate_solar_from_irradiance(irradiance: float,
                                     cloud_cover: float,
                                     capacity_mw: float = 1200.0) -> float:
    """
    Estimate solar generation from irradiance.
    capacity_mw: total installed solar capacity in the region.
    """
    efficiency  = 0.18           # 18% panel efficiency
    panel_area  = capacity_mw * 1e6 / (1000 * efficiency)   # m²
    cloud_factor = 1 - (cloud_cover / 100) * 0.75
    raw = irradiance * efficiency * cloud_factor
    return round(max(0.0, min(raw / 1000 * capacity_mw, capacity_mw)), 2)


def determine_grid_status(net_balance_mw: float,
                           max_capacity: float) -> GridStatus:
    demand_ratio = -net_balance_mw / max_capacity  # only relevant if deficit

    if net_balance_mw >= max_capacity * settings.SURPLUS_THRESHOLD:
        return GridStatus.SURPLUS
    elif net_balance_mw < 0:
        if demand_ratio >= (1 - settings.CRITICAL_DEMAND_THRESHOLD):
            return GridStatus.CRITICAL
        elif demand_ratio >= (1 - settings.WARNING_DEMAND_THRESHOLD):
            return GridStatus.WARNING
        else:
            return GridStatus.WARNING
    return GridStatus.NORMAL


def determine_action(status: GridStatus,
                     battery_pct: float,
                     net_balance_mw: float) -> tuple[GridAction, str]:
    if status == GridStatus.SURPLUS:
        if battery_pct < 0.95:
            return (GridAction.STORE_ENERGY,
                    f"Surplus of {abs(net_balance_mw):.0f} MW detected. "
                    f"Storing excess energy in batteries (currently at {battery_pct*100:.0f}%).")
        else:
            return (GridAction.REROUTE_ENERGY,
                    f"Batteries full. Rerouting {abs(net_balance_mw):.0f} MW surplus "
                    f"to neighbouring grids / pumped hydro.")

    elif status == GridStatus.CRITICAL:
        if battery_pct > settings.BATTERY_MIN_LEVEL:
            return (GridAction.DISCHARGE_BATTERY,
                    f"CRITICAL: Deficit of {abs(net_balance_mw):.0f} MW. "
                    f"Discharging batteries and activating backup generators.")
        else:
            return (GridAction.REDUCE_LOAD,
                    f"CRITICAL: Batteries low ({battery_pct*100:.0f}%). "
                    f"Initiating demand-side load shedding for non-critical zones.")

    elif status == GridStatus.WARNING:
        if battery_pct > settings.BATTERY_MIN_LEVEL + 0.1:
            return (GridAction.DISCHARGE_BATTERY,
                    f"WARNING: Deficit of {abs(net_balance_mw):.0f} MW. "
                    f"Partially discharging batteries to cover shortfall.")
        else:
            return (GridAction.REDUCE_LOAD,
                    f"WARNING: Low battery reserve. "
                    f"Requesting voluntary load reduction from industrial consumers.")

    return (GridAction.NO_ACTION,
            f"Grid balanced. Net balance: {net_balance_mw:+.0f} MW. "
            f"No action required.")


def update_battery(battery_level_mwh: float,
                   action: GridAction,
                   net_balance_mw: float,
                   interval_hours: float = 1.0) -> tuple[float, BatteryStatus]:
    """
    Simulate battery charge/discharge based on net energy balance.
    
    Returns: (battery_level_mwh, battery_status)
    
    Logic:
    - SURPLUS (net_balance_mw > 0): Charge battery with excess energy → CHARGING
    - DEFICIT (net_balance_mw < 0): Discharge battery to cover shortfall → DISCHARGING
    - BALANCED (net_balance_mw = 0): No battery change → IDLE
    
    The action parameter determines the strategy (e.g., STORE_ENERGY, DISCHARGE_BATTERY)
    but the actual charging/discharging is driven by the net_balance_mw.
    """
    cap   = settings.BATTERY_CAPACITY_MWH
    rate  = settings.BATTERY_CHARGE_RATE
    battery_status = BatteryStatus.IDLE

    # Charge battery if there's surplus energy AND battery not full
    if net_balance_mw > 0 and battery_level_mwh < cap:
        # Charge at rate limited by: (1) available surplus, (2) max charge rate, (3) space in battery
        charge_amount = min(
            abs(net_balance_mw),  # Available surplus
            rate,                  # Max charge rate (MWh/hour)
            cap - battery_level_mwh  # Space in battery
        ) * interval_hours
        battery_level_mwh = battery_level_mwh + charge_amount
        battery_status = BatteryStatus.CHARGING
        # print(f"  🔋 Battery CHARGING: +{charge_amount:.2f} MWh (surplus: {net_balance_mw:.2f} MW)")

    # Discharge battery if there's deficit energy AND battery has charge
    elif net_balance_mw < 0 and battery_level_mwh > 0:
        # Discharge at rate limited by: (1) deficit needed, (2) max discharge rate, (3) available charge
        discharge_amount = min(
            abs(net_balance_mw),  # Deficit to cover
            rate,                  # Max discharge rate (MWh/hour)
            battery_level_mwh      # Available charge in battery
        ) * interval_hours
        battery_level_mwh = battery_level_mwh - discharge_amount
        battery_status = BatteryStatus.DISCHARGING
        # print(f"  🔋 Battery DISCHARGING: -{discharge_amount:.2f} MWh (deficit: {net_balance_mw:.2f} MW)")

    # No change if balanced or battery constraints hit
    else:
        battery_status = BatteryStatus.IDLE

    # Ensure battery stays within bounds [0, capacity]
    battery_level_mwh = max(0, min(cap, battery_level_mwh))
    
    return round(battery_level_mwh, 2), battery_status


def run_balancer(
    current_demand_mw: float,
    solar_generation_mw: float,
    wind_generation_mw: float,
    conventional_generation_mw: float,
    battery_level_mwh: float,
    city: str = settings.DEFAULT_CITY
) -> GridState:
    """
    Main balancing function. Takes current readings, returns full GridState.
    """
    total_supply_mw = (solar_generation_mw
                       + wind_generation_mw
                       + conventional_generation_mw)
    net_balance_mw  = total_supply_mw - current_demand_mw

    battery_pct = battery_level_mwh / settings.BATTERY_CAPACITY_MWH
    status      = determine_grid_status(net_balance_mw, settings.MAX_GRID_CAPACITY_MW)
    action, description = determine_action(status, battery_pct, net_balance_mw)
    
    # Determine battery status based on net balance
    cap = settings.BATTERY_CAPACITY_MWH
    battery_status = BatteryStatus.IDLE
    if net_balance_mw > 0 and battery_level_mwh < cap:
        battery_status = BatteryStatus.CHARGING
    elif net_balance_mw < 0 and battery_level_mwh > 0:
        battery_status = BatteryStatus.DISCHARGING

    return GridState(
        timestamp=datetime.now(timezone.utc),
        city=city,
        current_demand_mw=round(current_demand_mw, 2),
        solar_generation_mw=round(solar_generation_mw, 2),
        wind_generation_mw=round(wind_generation_mw, 2),
        conventional_generation_mw=round(conventional_generation_mw, 2),
        total_supply_mw=round(total_supply_mw, 2),
        net_balance_mw=round(net_balance_mw, 2),
        battery_level_mwh=round(battery_level_mwh, 2),
        battery_percentage=round(battery_pct * 100, 1),
        battery_status=battery_status,
        grid_status=status,
        recommended_action=action,
        action_description=description
    )
