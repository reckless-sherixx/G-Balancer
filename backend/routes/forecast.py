# routes/forecast.py
from fastapi import APIRouter, Query
from datetime import datetime, timezone, timedelta
from typing import List

from schemas.grid_schema import ForecastRequest, ForecastResponse, HourlyForecast, GridAction
from services.weather_service import fetch_hourly_forecast
from services.grid_balancer import determine_grid_status, determine_action
from models.demand_forecaster import predict_demand, predict_solar, predict_wind
from config import settings

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.post("/", response_model=ForecastResponse,
             summary="Get demand & supply forecast for next N hours")
async def get_forecast(request: ForecastRequest):
    # Fetch weather forecast from Open-Meteo (free)
    weather_list = await fetch_hourly_forecast(
        request.latitude, request.longitude, request.hours_ahead
    )

    hourly_forecasts: List[HourlyForecast] = []
    battery_sim = settings.BATTERY_CAPACITY_MWH * 0.5  # simulate starting at 50%

    for w in weather_list:
        ts = datetime.fromisoformat(w["timestamp"])

        # Predict demand and generation
        demand_mw = predict_demand(
            hour=ts.hour,
            day_of_week=ts.weekday(),
            month=ts.month,
            temperature=w["temperature_c"],
            cloud_cover=w["cloud_cover_percent"],
            wind_speed=w["wind_speed_kmh"],
            solar_irradiance=w["solar_irradiance"]
        )
        solar_mw = predict_solar(
            hour=ts.hour,
            day_of_week=ts.weekday(),
            month=ts.month,
            temperature=w["temperature_c"],
            cloud_cover=w["cloud_cover_percent"],
            wind_speed=w["wind_speed_kmh"],
            solar_irradiance=w["solar_irradiance"]
        )
        wind_mw = predict_wind(w["wind_speed_kmh"])

        # Conventional generation fills the gap (up to capacity)
        conventional_mw = max(0, min(3000, demand_mw - solar_mw - wind_mw))
        total_supply    = solar_mw + wind_mw + conventional_mw
        net_balance     = total_supply - demand_mw
        battery_pct     = battery_sim / settings.BATTERY_CAPACITY_MWH

        status          = determine_grid_status(net_balance, settings.MAX_GRID_CAPACITY_MW)
        action, _       = determine_action(status, battery_pct, net_balance)

        # Confidence: higher for near-future, lower for far future
        hours_ahead_val = (ts - datetime.now(timezone.utc).replace(tzinfo=None)).seconds // 3600
        confidence      = max(0.5, 0.95 - hours_ahead_val * 0.01)

        hourly_forecasts.append(HourlyForecast(
            timestamp=ts,
            predicted_demand_mw=demand_mw,
            predicted_solar_mw=solar_mw,
            predicted_wind_mw=wind_mw,
            net_balance_mw=round(net_balance, 2),
            recommended_action=action,
            confidence=round(confidence, 2)
        ))

    # Summary stats
    demands  = [h.predicted_demand_mw for h in hourly_forecasts]
    balances = [h.net_balance_mw for h in hourly_forecasts]

    summary = {
        "peak_demand_mw":     round(max(demands), 2),
        "min_demand_mw":      round(min(demands), 2),
        "avg_demand_mw":      round(sum(demands) / len(demands), 2),
        "hours_with_surplus": sum(1 for b in balances if b > 0),
        "hours_with_deficit": sum(1 for b in balances if b < 0),
        "critical_hours":     sum(1 for h in hourly_forecasts
                                  if h.recommended_action == GridAction.REDUCE_LOAD)
    }

    return ForecastResponse(
        city=request.city,
        generated_at=datetime.now(timezone.utc),
        hourly=hourly_forecasts,
        summary=summary
    )


@router.get("/quick", summary="Quick 24-hour forecast for default city")
async def quick_forecast(
    city: str  = Query(default=settings.DEFAULT_CITY),
    lat:  float = Query(default=settings.DEFAULT_LATITUDE),
    lon:  float = Query(default=settings.DEFAULT_LONGITUDE)
):
    request = ForecastRequest(city=city, latitude=lat,
                               longitude=lon, hours_ahead=24)
    return await get_forecast(request)
