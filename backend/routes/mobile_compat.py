from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

from services import grid_balancer
from services.weather_service import fetch_current_weather
from models import demand_forecaster

router = APIRouter(tags=["mobile"])


class GridStatusRequest(BaseModel):
    battery_level_pct: float = Field(..., ge=0, le=100)
    current_supply_kwh: float
    current_demand_kwh: float


class PredictRequest(BaseModel):
    solar_output_kwh: List[float]
    wind_output_kwh: Optional[List[float]] = None
    demand_kwh: List[float]
    battery_level_pct: float = Field(..., ge=0, le=100)
    forecast_horizon_hours: int = Field(6, gt=0)


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
    """Accepts short arrays of recent solar/wind/demand and returns a recommended action sequence.

    This endpoint tries to use the trained recommender when available; otherwise it falls
    back to the deterministic grid_balancer logic.
    """
    print("\n🔵 [ENDPOINT] /predict (POST)")
    print(f"   📥 Request received:")
    print(f"      Solar points: {len(req.solar_output_kwh)}")
    print(f"      Wind points: {len(req.wind_output_kwh) if req.wind_output_kwh else 0}")
    print(f"      Demand points: {len(req.demand_kwh)}")
    print(f"      Battery: {req.battery_level_pct}%")
    
    # Basic validation: arrays must be same length for timestep alignment
    n = len(req.solar_output_kwh)
    if len(req.demand_kwh) != n:
        print(f"   ❌ Error: Array length mismatch (solar={n}, demand={len(req.demand_kwh)})")
        raise HTTPException(status_code=422, detail="solar_output_kwh and demand_kwh must be the same length")

    print(f"   ✅ Validation passed")

    # Compose features expected by the recommender or the balancer
    try:
        # Try to use recommender model if available
        print("   ⚙️  Attempting to load recommender model...")
        recommender = demand_forecaster.get_recommender()
        if recommender is not None:
            print("   ✅ Recommender model loaded")
            # Build a simple tabular input: average recent values + battery
            avg_solar = sum(req.solar_output_kwh) / n if n else 0.0
            avg_demand = sum(req.demand_kwh) / n if n else 0.0
            avg_wind = 0.0
            if req.wind_output_kwh:
                avg_wind = sum(req.wind_output_kwh) / len(req.wind_output_kwh)

            print(f"   📊 Averages: solar={avg_solar:.2f}, wind={avg_wind:.2f}, demand={avg_demand:.2f}")

            features = [[avg_solar, avg_wind, avg_demand, req.battery_level_pct]]
            try:
                print("   🤖 Running recommender.predict()...")
                preds = recommender.predict(features)
                # Try to decode; else return raw
                try:
                    decoded = demand_forecaster.decode_recommender_labels(preds)
                    print(f"   ✅ Decoded predictions: {decoded}")
                except Exception as e:
                    print(f"   ⚠️  Could not decode, returning raw: {e}")
                    decoded = preds.tolist() if hasattr(preds, "tolist") else list(preds)
                
                response = {"recommended": decoded, "source": "recommender"}
                print(f"   📤 Response: {response}\n")
                return response
            except Exception as e:
                print(f"   ⚠️  Recommender predict failed: {e}")
                pass

    except Exception as e:
        # If any recommender call fails, fall back to rule-based
        print(f"   ⚠️  Recommender loading failed: {e}")
        pass

    # Fallback: produce per-step actions using current values and balancer helper
    print("   📋 Falling back to rule-based logic...")
    actions = []
    for i in range(n):
        try:
            supply = req.solar_output_kwh[i] + (req.wind_output_kwh[i] if req.wind_output_kwh and i < len(req.wind_output_kwh) else 0.0)
            demand = req.demand_kwh[i]
            supply_demand = supply / (demand + 1)
            
            if req.battery_level_pct < 15 or supply_demand < 0.8:
                action = "LOAD_SHED"
            elif req.battery_level_pct > 85 and supply_demand > 1.2:
                action = "STORE"
            elif supply_demand < 0.95:
                action = "CHARGE_BATTERY"
            else:
                action = "STABLE"
        except Exception as e:
            print(f"   ⚠️  Error at step {i}: {e}")
            action = "STABLE"
        actions.append(action)

    response = {"recommended": actions, "source": "rule_based"}
    print(f"   ✅ Generated {len(actions)} rule-based actions")
    print(f"   📤 Response: actions={actions[:3]}... (showing first 3)\n")
    return response

