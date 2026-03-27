"""
schemas.py
Pydantic models defining the request and response shapes for the ML API.
Used by FastAPI for automatic validation, serialization, and documentation.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime


# ─── Shared Sub-models ────────────────────────────────────────────────────────

class WeatherForecast(BaseModel):
    """
    Optional weather context passed alongside historical grid data.
    Used to improve forecast accuracy.
    """
    cloud_cover: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Fraction of sky covered by clouds (0 = clear, 1 = fully overcast)"
    )
    wind_speed_ms: float = Field(
        default=5.0,
        ge=0.0,
        description="Wind speed in meters per second"
    )
    temperature_c: Optional[float] = Field(
        default=None,
        description="Ambient temperature in Celsius (affects demand)"
    )


# ─── Request Models ───────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    """
    Input payload for the /predict endpoint.
    Requires the last 72 hours of grid data plus current battery state.
    """
    solar_output_kwh: list[float] = Field(
        ...,
        min_items=24,
        max_items=168,
        description="Hourly solar output for the last N hours (min 24, max 168)"
    )
    wind_output_kwh: list[float] = Field(
        ...,
        min_items=24,
        max_items=168,
        description="Hourly wind output for the last N hours"
    )
    demand_kwh: list[float] = Field(
        ...,
        min_items=24,
        max_items=168,
        description="Hourly grid demand for the last N hours"
    )
    battery_level_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Current battery state of charge as a percentage (0–100)"
    )
    weather_forecast: Optional[WeatherForecast] = Field(
        default=None,
        description="Upcoming weather data to improve forecast quality"
    )
    forecast_horizon_hours: int = Field(
        default=6,
        ge=1,
        le=24,
        description="How many hours ahead to forecast (default: 6)"
    )

    @validator("wind_output_kwh", "demand_kwh")
    def lengths_must_match(cls, v, values):
        if "solar_output_kwh" in values and len(v) != len(values["solar_output_kwh"]):
            raise ValueError("solar_output_kwh, wind_output_kwh, and demand_kwh must all be the same length")
        return v

    class Config:
        schema_extra = {
            "example": {
                "solar_output_kwh": [0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 1.5, 4.2, 7.1, 9.3, 10.0,
                                     9.8, 9.5, 8.7, 7.2, 5.1, 3.0, 1.2, 0.3, 0.0, 0.0, 0.0,
                                     0.0, 0.0],
                "wind_output_kwh": [2.1] * 24,
                "demand_kwh": [8.0, 7.5, 7.2, 7.0, 7.1, 7.8, 9.2, 11.0, 12.5, 11.8, 11.0,
                               10.5, 10.2, 10.0, 10.3, 10.8, 11.5, 13.0, 14.2, 13.5, 12.0,
                               11.0, 10.0, 9.0],
                "battery_level_pct": 62.0,
                "weather_forecast": {
                    "cloud_cover": 0.3,
                    "wind_speed_ms": 7.2
                }
            }
        }


class GridStatusRequest(BaseModel):
    """
    Lightweight request for the /grid-status endpoint.
    Returns current grid health without running the full forecast pipeline.
    """
    battery_level_pct: float = Field(..., ge=0, le=100)
    current_supply_kwh: float = Field(..., ge=0)
    current_demand_kwh: float = Field(..., ge=0)


# ─── Response Models ──────────────────────────────────────────────────────────

class PredictResponse(BaseModel):
    """
    Full prediction response from /predict.
    Includes LSTM forecast + recommender action + urgency metrics.
    """
    forecast_horizon: str = Field(description="Forecast window description, e.g. '6h'")
    predicted_supply: list[float] = Field(description="Predicted renewable supply per hour (kWh)")
    predicted_demand: list[float] = Field(description="Predicted grid demand per hour (kWh)")
    recommended_action: str = Field(description="One of: STORE, RELEASE, REDISTRIBUTE, STABLE")
    urgency_score: float = Field(ge=0.0, le=1.0, description="How urgent action is (0=calm, 1=critical)")
    confidence: float = Field(ge=0.0, le=1.0, description="Model confidence in the recommended action")
    surplus_kwh: float = Field(description="Predicted average surplus (negative = deficit)")
    battery_level_pct: float = Field(description="Current battery level echoed back")
    action_probabilities: dict = Field(description="Softmax probabilities for all action classes")
    generated_at: datetime = Field(description="Timestamp when this prediction was generated")

    class Config:
        schema_extra = {
            "example": {
                "forecast_horizon": "6h",
                "predicted_supply": [11.2, 10.8, 9.4, 12.1, 13.5, 11.9],
                "predicted_demand": [10.5, 11.0, 12.3, 10.8, 9.9, 10.2],
                "recommended_action": "STORE",
                "urgency_score": 0.74,
                "confidence": 0.89,
                "surplus_kwh": 3.2,
                "battery_level_pct": 62.0,
                "action_probabilities": {
                    "STORE": 0.89,
                    "STABLE": 0.07,
                    "RELEASE": 0.03,
                    "REDISTRIBUTE": 0.01
                },
                "generated_at": "2024-03-15T14:00:00"
            }
        }


class ForecastResponse(BaseModel):
    """
    Response from /forecast — LSTM output only, no recommender.
    Used for charting historical vs predicted curves on the frontend.
    """
    hours: list[str] = Field(description="Hour labels for the forecast window")
    predicted_supply: list[float]
    predicted_demand: list[float]
    predicted_surplus: list[float]


class GridStatusResponse(BaseModel):
    """
    Response from /grid-status — lightweight health check.
    """
    status: str = Field(description="One of: HEALTHY, WARNING, CRITICAL")
    surplus_kwh: float
    battery_level_pct: float
    message: str


class HealthResponse(BaseModel):
    """Response from /health — confirms API is live and models are loaded."""
    status: str
    forecaster_loaded: bool
    recommender_loaded: bool
    version: str = "1.0.0"