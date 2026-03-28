from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import math

from services.weather_service import fetch_current_weather

router = APIRouter(tags=["mobile"])


class GridStatusRequest(BaseModel):
    battery_level_pct: float = Field(..., ge=0, le=100)
    current_supply_kwh: float
    current_demand_kwh: float


class PredictRequest(BaseModel):
    forecasted_surplus: float = Field(..., description="Forecasted surplus/deficit (kWh), can be negative")
    battery_level_pct: float = Field(..., ge=0, le=100)
    grid_stress: float = Field(..., ge=0, le=1, description="0-1 normalized grid stress")
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23)
    is_weekend: Optional[int] = Field(default=None, ge=0, le=1)


def _predict_action_from_logic(req: PredictRequest) -> dict:
    """Deterministic backend decision logic for mobile action recommendations."""
    now = datetime.now(timezone.utc)
    hour = req.hour_of_day if req.hour_of_day is not None else now.hour
    weekend = req.is_weekend if req.is_weekend is not None else (1 if now.weekday() >= 5 else 0)

    surplus = float(req.forecasted_surplus)
    battery = float(req.battery_level_pct)
    stress = float(req.grid_stress)

    # Peak windows are more sensitive to deficits.
    is_peak_window = 1 if hour in {8, 9, 10, 18, 19, 20, 21, 22} else 0
    effective_stress = min(1.0, stress + (0.08 * is_peak_window) + (0.05 if weekend else 0.0))

    # Action policy:
    # - Large/high-risk deficit: REDISTRIBUTE
    # - Moderate deficit with usable battery: RELEASE
    # - Surplus with battery headroom: STORE
    # - Near-balanced: STABLE
    if surplus <= -8.0 or (effective_stress >= 0.85 and surplus < -3.0) or (battery < 20.0 and surplus < 0):
        action = "REDISTRIBUTE"
        reason = "High-risk deficit conditions detected; rerouting energy to protect critical loads."
    elif surplus < -1.0:
        if battery >= 25.0:
            action = "RELEASE"
            reason = "Forecasted deficit with usable battery reserve; discharge recommended."
        else:
            action = "REDISTRIBUTE"
            reason = "Deficit with low battery reserve; rerouting preferred over discharge."
    elif surplus > 2.0:
        if battery >= 95.0:
            action = "REDISTRIBUTE"
            reason = "Surplus available but battery nearly full; reroute energy externally."
        else:
            action = "STORE"
            reason = "Surplus detected with battery headroom; charging is recommended."
    else:
        action = "STABLE"
        reason = "Grid conditions are near-balanced; no aggressive balancing action required."

    deficit_pressure = max(0.0, -surplus) / 12.0
    battery_risk = max(0.0, (30.0 - battery) / 30.0)
    urgency = min(1.0, 0.45 * deficit_pressure + 0.35 * effective_stress + 0.20 * battery_risk)
    confidence = min(0.98, max(0.6, 0.65 + abs(surplus) / 35.0 + effective_stress * 0.12))

    return {
        "action": action,
        "recommended_action": action,
        "confidence": round(float(confidence), 4),
        "urgency_score": round(float(urgency), 3),
        "surplus_kwh": surplus,
        "reason": (
            f"{reason} Inputs: surplus={surplus:.2f} kWh, battery={battery:.1f}%, "
            f"stress={stress:.2f}, hour={hour}, weekend={weekend}."
        ),
        "source": "backend-rule-engine",
    }


@router.get("/simulate")
async def simulate():
    """Return a simulated 24-hour time-series with current weather-based generation.

    Mobile app calls this to get: total_supply_kwh, demand_kwh, battery_pct arrays.
    """
    print("\n🔵 [ENDPOINT] /simulate (GET)")
    print("   📋 Purpose: Generate 24-hour supply/demand/battery profiles")
    
    try:
        print("   ⚙️  Fetching current weather...")
        weather = await fetch_current_weather()
        print(f"   ✅ Weather fetched: {weather.temperature_c}°C, {weather.cloud_cover_percent}% cloud")
    except Exception as e:
        # Fallback if weather service fails
        print(f"   ⚠️  Weather fetch failed: {e}")
        weather = None

    hours = 24
    now = datetime.now(timezone.utc)
    print(f"   📅 Starting simulation from: {now.isoformat()}")
    
    # Generate deterministic 24-hour profiles based on time-of-day
    total_supply = []
    demand = []
    battery = []
    
    battery_level = 50.0  # Start at 50%
    print(f"   🔋 Initial battery: {battery_level}%")
    
    for i in range(hours):
        hour_of_day = (now.hour + i) % 24
        
        # Solar generation (peaks at noon)
        solar = max(0.0, 20 * (1 - ((hour_of_day - 12) / 12) ** 2)) if 6 <= hour_of_day <= 18 else 0
        
        # Wind (relatively constant but varies by hour)
        wind = 8 + 3 * (1 - (hour_of_day / 24))
        
        # Total supply
        supply_mw = solar + wind
        total_supply.append(max(0.0, supply_mw))
        
        # Demand (peaks in morning and evening)
        base_demand = 20
        peak_demand = 12 if (hour_of_day >= 17 and hour_of_day <= 22) or (hour_of_day >= 6 and hour_of_day <= 9) else 0
        demand_mw = base_demand + peak_demand + (weather.temperature_c - 20) * 0.5 if weather else base_demand + peak_demand
        demand.append(max(0.0, demand_mw))
        
        # Simulate battery: charge on surplus, discharge on deficit
        net = total_supply[-1] - demand[-1]
        if net > 0:
            battery_level = min(100, battery_level + net * 0.1)
        else:
            battery_level = max(0, battery_level + net * 0.1)
        
        battery.append(max(0.0, battery_level))
        
        # Log first and last hours
        if i == 0 or i == hours - 1:
            print(f"   📍 Hour {i:2d} (day-hour {hour_of_day:2d}): "
                  f"supply={total_supply[-1]:6.2f}MW, demand={demand[-1]:6.2f}MW, battery={battery[-1]:5.1f}%")
    
    response = {
        "total_supply_kwh": total_supply,
        "demand_kwh": demand,
        "battery_pct": battery
    }
    
    print(f"   ✅ Response ready: {len(total_supply)} hours of data")
    print(f"   📊 Supply range: {min(total_supply):.2f} - {max(total_supply):.2f} MW")
    print(f"   📊 Demand range: {min(demand):.2f} - {max(demand):.2f} MW")
    print(f"   🔋 Battery range: {min(battery):.1f}% - {max(battery):.1f}%\n")
    
    return response


@router.post("/grid-status")
async def grid_status(req: GridStatusRequest):
    """Return a quick grid status (OK/WARNING/CRITICAL) and recommended immediate action.

    This endpoint mirrors the mobile client's expectations for a single-step status check.
    """
    print("\n🔵 [ENDPOINT] /grid-status (POST)")
    print(f"   📥 Request received:")
    print(f"      Battery: {req.battery_level_pct}%")
    print(f"      Supply: {req.current_supply_kwh} kWh")
    print(f"      Demand: {req.current_demand_kwh} kWh")
    
    try:
        # Determine status based on supply vs demand and battery level
        supply_demand_ratio = req.current_supply_kwh / (req.current_demand_kwh + 1)
        print(f"   ⚙️  Supply/Demand ratio: {supply_demand_ratio:.2f}")
        
        if req.battery_level_pct < 10:
            status = "CRITICAL"
            print(f"   🚨 Status: CRITICAL (battery < 10%)")
        elif req.battery_level_pct < 25:
            status = "WARNING"
            print(f"   ⚠️  Status: WARNING (battery < 25%)")
        elif supply_demand_ratio < 0.9:
            status = "WARNING"
            print(f"   ⚠️  Status: WARNING (supply < 90% of demand)")
        else:
            status = "HEALTHY"
            print(f"   ✅ Status: HEALTHY")
        
        # Determine action
        if req.battery_level_pct < 15 or supply_demand_ratio < 0.8:
            action = "LOAD_SHED"
            print(f"   💡 Action: LOAD_SHED")
        elif req.battery_level_pct > 85 and supply_demand_ratio > 1.2:
            action = "STORE"
            print(f"   💡 Action: STORE")
        elif supply_demand_ratio < 0.95:
            action = "CHARGE_BATTERY"
            print(f"   💡 Action: CHARGE_BATTERY")
        else:
            action = "STABLE"
            print(f"   💡 Action: STABLE")
            
    except Exception as exc:
        print(f"   ❌ Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

    response = {
        "status": status,
        "recommended_action": action
    }
    
    print(f"   📤 Response: {response}\n")
    return response


@router.post("/predict")
async def predict(req: PredictRequest):
    """Predict one recommended grid action from direct user inputs.

    Uses deterministic backend logic based on surplus, battery, stress, and time context.
    """
    print("\n🔵 [ENDPOINT] /predict (POST)")
    print(f"   📥 Request received:")
    print(f"      Forecasted surplus: {req.forecasted_surplus}")
    print(f"      Battery: {req.battery_level_pct}%")
    print(f"      Grid stress: {req.grid_stress}")

    response = _predict_action_from_logic(req)
    print(
        "   ✅ Rule-engine response: "
        f"action={response['recommended_action']}, "
        f"confidence={response['confidence']}, "
        f"urgency={response['urgency_score']}\n"
    )
    return response

