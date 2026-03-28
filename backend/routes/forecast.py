# routes/forecast.py
from fastapi import APIRouter, Query
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import List, Optional
import json
import logging

from schemas.grid_schema import ForecastRequest, ForecastResponse, HourlyForecast, GridAction
from services.weather_service import fetch_hourly_forecast
from services.grid_balancer import determine_grid_status, determine_action
from models.demand_forecaster import predict_demand, predict_solar, predict_wind
from services.grid_inference_service import run_public_api_forecast_inference
from config import settings
from redis_client import redis_client, is_redis_available
from redis_keys import (
    FORECAST_DET,
    FORECAST_DET_TTL,
    FORECAST_ML,
    FORECAST_ML_TTL,
    normalize_city,
)

router = APIRouter(prefix="/forecast", tags=["Forecast"])
logger = logging.getLogger(__name__)
IST = ZoneInfo("Asia/Kolkata")


def _det_cache_key(request: ForecastRequest, cache_window: str) -> str:
    city = normalize_city(request.city)
    lat = round(float(request.latitude), 4)
    lon = round(float(request.longitude), 4)
    hours = int(request.hours_ahead)
    return FORECAST_DET.format(
        city=city,
        lat=lat,
        lon=lon,
        hours=hours,
        utc_hour=cache_window,
    )


def _ml_cache_key(request: ForecastRequest, cache_window: str) -> str:
    city = normalize_city(request.city)
    lat = round(float(request.latitude), 4)
    lon = round(float(request.longitude), 4)
    hours = int(min(6, request.hours_ahead))
    return FORECAST_ML.format(
        city=city,
        lat=lat,
        lon=lon,
        hours=hours,
        window=cache_window,
    )


@router.get("/", summary="Quick forecast via GET for mobile app")
async def get_forecast_get(
    hours: int = Query(default=12, ge=1, le=168),
    city: str = Query(default=settings.DEFAULT_CITY),
    lat: float = Query(default=settings.DEFAULT_LATITUDE),
    lon: float = Query(default=settings.DEFAULT_LONGITUDE)
):
    """GET endpoint for quick forecast - mobile friendly."""
    request = ForecastRequest(city=city, latitude=lat, longitude=lon, hours_ahead=hours)
    return await get_forecast(request)


@router.post("/", response_model=ForecastResponse,
             summary="Get demand & supply forecast for next N hours")
async def get_forecast(request: ForecastRequest):
    now_ist = datetime.now(IST)
    cache_window = now_ist.strftime("%Y%m%d%H")
    ml_cache_window = now_ist.strftime("%Y%m%d%H%M")
    ml_cache_window = f"{ml_cache_window[:-1]}0"  # 10-minute bucket

    redis_available = await is_redis_available()

    # ML path cache: keeps quick refreshes consistent while still updating frequently
    ml_cache_key = _ml_cache_key(request, ml_cache_window)
    if redis_available and redis_client.client is not None:
        try:
            cached_payload = await redis_client.client.get(ml_cache_key)
            if cached_payload:
                parsed = json.loads(cached_payload)
                if isinstance(parsed, dict):
                    parsed_summary = dict(parsed.get("summary") or {})
                    parsed_summary["cache_source"] = "redis"
                    parsed_summary["cache_window_10m"] = ml_cache_window
                    parsed["summary"] = parsed_summary
                return parsed
        except Exception as exc:
            logger.warning("forecast ML cache read failed (%s): %s", ml_cache_key, exc)

    # Primary path: ML inference pipeline using public API-derived 72h features
    ml_result = await run_public_api_forecast_inference(
        city=request.city,
        latitude=request.latitude,
        longitude=request.longitude,
        hours_ahead=min(6, request.hours_ahead),
        device="cpu",
    )

    def _map_recommendation_to_grid_action(label: str) -> GridAction:
        normalized = (label or "").upper()
        if normalized == "STORE":
            return GridAction.STORE_ENERGY
        if normalized == "RELEASE":
            return GridAction.DISCHARGE_BATTERY
        if normalized == "REDISTRIBUTE":
            return GridAction.REROUTE_ENERGY
        return GridAction.NO_ACTION

    if ml_result.get("status") == "success":
        hourly_forecasts: List[HourlyForecast] = []
        recommendation = _map_recommendation_to_grid_action(ml_result.get("recommendation", ""))

        for row in ml_result.get("forecast_6h", []):
            ts = datetime.fromisoformat(row.get("timestamp", datetime.now(IST).isoformat()))
            net_balance = float(row.get("balance_mw", 0.0))
            hourly_forecasts.append(HourlyForecast(
                timestamp=ts,
                predicted_demand_mw=float(row.get("demand_mw", 0.0)),
                predicted_solar_mw=float(row.get("predicted_solar_mw", 0.0)),
                predicted_wind_mw=float(row.get("predicted_wind_mw", 0.0)),
                net_balance_mw=round(net_balance, 2),
                recommended_action=recommendation,
                confidence=float(ml_result.get("confidence", 0.85)),
            ))

        if hourly_forecasts:
            demands = [h.predicted_demand_mw for h in hourly_forecasts]
            balances = [h.net_balance_mw for h in hourly_forecasts]

            summary = {
                "peak_demand_mw": round(max(demands), 2),
                "min_demand_mw": round(min(demands), 2),
                "avg_demand_mw": round(sum(demands) / len(demands), 2),
                "hours_with_surplus": sum(1 for b in balances if b > 0),
                "hours_with_deficit": sum(1 for b in balances if b < 0),
                "critical_hours": sum(1 for h in hourly_forecasts if h.recommended_action == GridAction.REDUCE_LOAD),
                "model_recommendation": ml_result.get("recommendation", "UNKNOWN"),
                "source": ml_result.get("source", "ml-model"),
            }

            response = ForecastResponse(
                city=request.city,
                generated_at=now_ist,
                hourly=hourly_forecasts,
                summary=summary,
            )

            if redis_available and redis_client.client is not None:
                try:
                    await redis_client.client.setex(
                        ml_cache_key,
                        FORECAST_ML_TTL,
                        json.dumps(response.model_dump(mode="json")),
                    )
                except Exception as exc:
                    logger.warning("forecast ML cache write failed (%s): %s", ml_cache_key, exc)

            return response

    # Fallback path: deterministic weather-model forecast with Redis caching
    det_cache_key = _det_cache_key(request, cache_window)
    if redis_available and redis_client.client is not None:
        try:
            cached_payload = await redis_client.client.get(det_cache_key)
            if cached_payload:
                parsed = json.loads(cached_payload)
                if isinstance(parsed, dict):
                    parsed_summary = dict(parsed.get("summary") or {})
                    parsed_summary["cache_source"] = "redis"
                    parsed_summary["cache_window_utc"] = cache_window
                    parsed["summary"] = parsed_summary
                return parsed
        except Exception as exc:
            logger.warning("forecast deterministic cache read failed (%s): %s", det_cache_key, exc)
    elif not redis_available:
        logger.warning("Redis unavailable for forecast deterministic cache. Computing fresh response.")

    weather_list = await fetch_hourly_forecast(
        request.latitude, request.longitude, request.hours_ahead
    )

    hourly_forecasts: List[HourlyForecast] = []
    battery_sim = settings.BATTERY_CAPACITY_MWH * 0.5

    for w in weather_list:
        ts = datetime.fromisoformat(w["timestamp"])
        demand_mw = predict_demand(
            hour=ts.hour,
            day_of_week=ts.weekday(),
            month=ts.month,
            temperature=w["temperature_c"],
            cloud_cover=w["cloud_cover_percent"],
            wind_speed=w["wind_speed_kmh"],
            solar_irradiance=w["solar_irradiance"],
        )
        solar_mw = predict_solar(
            hour=ts.hour,
            day_of_week=ts.weekday(),
            month=ts.month,
            temperature=w["temperature_c"],
            cloud_cover=w["cloud_cover_percent"],
            wind_speed=w["wind_speed_kmh"],
            solar_irradiance=w["solar_irradiance"],
        )
        wind_mw = predict_wind(w["wind_speed_kmh"])

        conventional_mw = max(0, min(3000, demand_mw - solar_mw - wind_mw))
        total_supply = solar_mw + wind_mw + conventional_mw
        net_balance = total_supply - demand_mw
        battery_pct = battery_sim / settings.BATTERY_CAPACITY_MWH

        status = determine_grid_status(net_balance, settings.MAX_GRID_CAPACITY_MW)
        action, _ = determine_action(status, battery_pct, net_balance)

        now_ist_naive = now_ist.replace(tzinfo=None)
        hours_ahead_val = max(0, int((ts - now_ist_naive).total_seconds() // 3600))
        confidence = max(0.5, 0.95 - hours_ahead_val * 0.01)

        hourly_forecasts.append(HourlyForecast(
            timestamp=ts,
            predicted_demand_mw=demand_mw,
            predicted_solar_mw=solar_mw,
            predicted_wind_mw=wind_mw,
            net_balance_mw=round(net_balance, 2),
            recommended_action=action,
            confidence=round(confidence, 2),
        ))

    demands = [h.predicted_demand_mw for h in hourly_forecasts]
    balances = [h.net_balance_mw for h in hourly_forecasts]

    summary = {
        "peak_demand_mw": round(max(demands), 2),
        "min_demand_mw": round(min(demands), 2),
        "avg_demand_mw": round(sum(demands) / len(demands), 2),
        "hours_with_surplus": sum(1 for b in balances if b > 0),
        "hours_with_deficit": sum(1 for b in balances if b < 0),
        "critical_hours": sum(1 for h in hourly_forecasts if h.recommended_action == GridAction.REDUCE_LOAD),
        "source": "fallback-weather-model",
        "cache_source": "computed",
        "cache_window_utc": cache_window,
    }

    response = ForecastResponse(
        city=request.city,
        generated_at=now_ist,
        hourly=hourly_forecasts,
        summary=summary,
    )

    if redis_available and redis_client.client is not None:
        try:
            await redis_client.client.setex(
                det_cache_key,
                FORECAST_DET_TTL,
                json.dumps(response.model_dump(mode="json")),
            )
        except Exception as exc:
            logger.warning("forecast deterministic cache write failed (%s): %s", det_cache_key, exc)

    return response


@router.get("/quick", summary="Quick 24-hour forecast for default city")
async def quick_forecast(
    city: str  = Query(default=settings.DEFAULT_CITY),
    lat:  float = Query(default=settings.DEFAULT_LATITUDE),
    lon:  float = Query(default=settings.DEFAULT_LONGITUDE)
):
    request = ForecastRequest(city=city, latitude=lat,
                               longitude=lon, hours_ahead=24)
    return await get_forecast(request)
