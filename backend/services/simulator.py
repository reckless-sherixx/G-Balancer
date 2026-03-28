# routes/simulator.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.grid_balancer import run_balancer

router = APIRouter(prefix="/simulator", tags=["Simulator"])

class SimulationScenario(BaseModel):
    scenario: str          # "solar_drop", "demand_spike", "battery_failure", "heatwave"
    severity: float        # 0.0 to 1.0
    city: str = "Mumbai"
    base_demand_mw: float = 3000
    base_solar_mw: float = 800
    base_wind_mw: float = 300
    base_battery_mwh: float = 250

class SimulationResult(BaseModel):
    scenario: str
    severity: float
    original_state: dict
    simulated_state: dict
    impact_description: str
    risk_level: str
    recommended_actions: list[str]

@router.post("/run", response_model=SimulationResult)
async def run_simulation(scenario: SimulationScenario):
    # Original state
    original = run_balancer(
        current_demand_mw=scenario.base_demand_mw,
        solar_generation_mw=scenario.base_solar_mw,
        wind_generation_mw=scenario.base_wind_mw,
        conventional_generation_mw=2000,
        battery_level_mwh=scenario.base_battery_mwh,
        city=scenario.city
    )
    
    # Apply scenario
    demand = scenario.base_demand_mw
    solar  = scenario.base_solar_mw
    wind   = scenario.base_wind_mw
    battery = scenario.base_battery_mwh
    
    if scenario.scenario == "solar_drop":
        solar *= (1 - scenario.severity)
        impact = f"Solar output dropped {scenario.severity*100:.0f}% due to cloud cover"
    
    elif scenario.scenario == "demand_spike":
        demand *= (1 + scenario.severity)
        impact = f"Demand spiked {scenario.severity*100:.0f}% (heatwave/festival)"
    
    elif scenario.scenario == "battery_failure":
        battery *= (1 - scenario.severity)
        impact = f"Battery storage degraded to {battery:.0f} MWh"
    
    elif scenario.scenario == "heatwave":
        demand *= (1 + scenario.severity * 0.4)
        solar  *= (1 - scenario.severity * 0.1)  # panels lose efficiency in heat
        impact = f"Heatwave: +{scenario.severity*40:.0f}% demand, -10% solar efficiency"
    
    elif scenario.scenario == "wind_drop":
        wind *= (1 - scenario.severity)
        impact = f"Wind generation dropped {scenario.severity*100:.0f}%"
    
    else:
        impact = "Unknown scenario"
    
    # Simulated state
    simulated = run_balancer(
        current_demand_mw=demand,
        solar_generation_mw=solar,
        wind_generation_mw=wind,
        conventional_generation_mw=2000,
        battery_level_mwh=battery,
        city=scenario.city
    )
    
    risk = "LOW"
    if simulated.grid_status.value == "warning":  risk = "MEDIUM"
    if simulated.grid_status.value == "critical":  risk = "HIGH"
    
    return SimulationResult(
        scenario=scenario.scenario,
        severity=scenario.severity,
        original_state={"status": original.grid_status.value,
                        "balance": original.net_balance_mw},
        simulated_state={"status": simulated.grid_status.value,
                         "balance": simulated.net_balance_mw,
                         "action": simulated.recommended_action.value},
        impact_description=impact,
        risk_level=risk,
        recommended_actions=[simulated.action_description]
    )