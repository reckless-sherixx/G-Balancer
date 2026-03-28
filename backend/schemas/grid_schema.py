# schemas/grid_schema.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class GridStatus(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"
    SURPLUS = "surplus"

class GridAction(str, Enum):
    STORE_ENERGY = "store_energy"
    DISCHARGE_BATTERY = "discharge_battery"
    REDUCE_LOAD = "reduce_load"
    REROUTE_ENERGY = "reroute_energy"
    NO_ACTION = "no_action"

class BatteryStatus(str, Enum):
    CHARGING = "charging"
    DISCHARGING = "discharging"
    IDLE = "idle"

# ─── Forecast Schemas ────────────────────────────────────────────────
class ForecastRequest(BaseModel):
    city: str = "Mumbai"
    latitude: float = 19.07
    longitude: float = 72.87
    hours_ahead: int = Field(default=24, ge=1, le=72)

class HourlyForecast(BaseModel):
    timestamp: datetime
    predicted_demand_mw: float
    predicted_solar_mw: float
    predicted_wind_mw: float
    net_balance_mw: float         # supply - demand (positive = surplus)
    recommended_action: GridAction
    confidence: float             # model confidence 0-1

class ForecastResponse(BaseModel):
    city: str
    generated_at: datetime
    hourly: List[HourlyForecast]
    summary: dict

# ─── Grid State Schemas ───────────────────────────────────────────────
class GridState(BaseModel):
    timestamp: datetime
    city: str
    current_demand_mw: float
    solar_generation_mw: float
    wind_generation_mw: float
    conventional_generation_mw: float
    total_supply_mw: float
    net_balance_mw: float
    battery_level_mwh: float
    battery_percentage: float
    battery_status: BatteryStatus
    grid_status: GridStatus
    recommended_action: GridAction
    action_description: str

class GridStateCreate(BaseModel):
    city: str
    current_demand_mw: float
    solar_generation_mw: float
    wind_generation_mw: float
    conventional_generation_mw: float
    battery_level_mwh: float

# ─── Alert Schemas ────────────────────────────────────────────────────
class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Alert(BaseModel):
    id: Optional[int] = None
    timestamp: datetime
    city: str
    severity: AlertSeverity
    title: str
    message: str
    recommended_action: GridAction
    is_resolved: bool = False

# ─── Weather Schemas ──────────────────────────────────────────────────
class WeatherData(BaseModel):
    timestamp: datetime
    temperature_c: float
    cloud_cover_percent: float
    wind_speed_kmh: float
    solar_irradiance: Optional[float] = None

# ─── Dashboard Schema ─────────────────────────────────────────────────
class DashboardResponse(BaseModel):
    current_state: GridState
    weather: WeatherData
    forecast_24h: List[HourlyForecast]
    recent_alerts: List[Alert]
    stats: dict
