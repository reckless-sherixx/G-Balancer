# services/weather_service.py
import httpx
import logging
import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import List
from schemas.grid_schema import WeatherData
from config import settings
from redis_client import redis_client, is_redis_available
from redis_keys import (
    WEATHER_CURRENT,
    WEATHER_CURRENT_TTL,
    WEATHER_HOURLY,
    WEATHER_HOURLY_TTL,
    WEATHER_RECENT_FUTURE,
    WEATHER_RECENT_FUTURE_TTL,
)

logger = logging.getLogger(__name__)
IST = ZoneInfo("Asia/Kolkata")

async def fetch_current_weather(lat: float = settings.DEFAULT_LATITUDE,
                                 lon: float = settings.DEFAULT_LONGITUDE) -> WeatherData:
    """
    Fetch current weather using Open-Meteo (Free, no API key needed)
    """
    lat_key = round(float(lat), 2)
    lon_key = round(float(lon), 2)
    cache_key = WEATHER_CURRENT.format(lat=lat_key, lon=lon_key)

    if await is_redis_available() and redis_client.client is not None:
        try:
            cached = await redis_client.client.get(cache_key)
            if cached:
                payload = json.loads(cached)
                return WeatherData(**payload)
        except Exception as exc:
            logger.warning("weather current cache read failed (%s): %s", cache_key, exc)

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ["temperature_2m", "cloudcover", "windspeed_10m"],
        "hourly": ["shortwave_radiation"],
        "timezone": "Asia/Kolkata",
        "forecast_days": 1
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(settings.WEATHER_API_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    current = data.get("current", {})
    hourly  = data.get("hourly", {})

    # Get solar irradiance for current hour
    current_hour_index = datetime.now(IST).hour
    solar_vals = hourly.get("shortwave_radiation", [0])
    solar_irradiance = solar_vals[current_hour_index] if current_hour_index < len(solar_vals) else 0.0

    response = WeatherData(
    timestamp=datetime.now(IST),
        temperature_c=current.get("temperature_2m", 28.0),
        cloud_cover_percent=current.get("cloudcover", 20.0),
        wind_speed_kmh=current.get("windspeed_10m", 15.0),
        solar_irradiance=solar_irradiance
    )

    if await is_redis_available() and redis_client.client is not None:
        try:
            await redis_client.client.setex(
                cache_key,
                WEATHER_CURRENT_TTL,
                json.dumps(response.model_dump(mode="json")),
            )
        except Exception as exc:
            logger.warning("weather current cache write failed (%s): %s", cache_key, exc)

    return response

async def fetch_hourly_forecast(lat: float = settings.DEFAULT_LATITUDE,
                                 lon: float = settings.DEFAULT_LONGITUDE,
                                 hours: int = 24) -> List[dict]:
    """
    Fetch hourly weather forecast (up to 72 hours ahead)
    """
    lat_key = round(float(lat), 2)
    lon_key = round(float(lon), 2)
    cache_key = WEATHER_HOURLY.format(lat=lat_key, lon=lon_key, hours=int(hours))

    if await is_redis_available() and redis_client.client is not None:
        try:
            cached = await redis_client.client.get(cache_key)
            if cached:
                payload = json.loads(cached)
                if isinstance(payload, list):
                    return payload
        except Exception as exc:
            logger.warning("weather hourly cache read failed (%s): %s", cache_key, exc)

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "temperature_2m",
            "cloudcover",
            "windspeed_10m",
            "shortwave_radiation"
        ],
        "timezone": "Asia/Kolkata",
        "forecast_days": min(3, (hours // 24) + 1)
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(settings.WEATHER_API_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    hourly = data.get("hourly", {})
    times  = hourly.get("time", [])

    result = []
    for i in range(min(hours, len(times))):
        result.append({
            "timestamp": times[i],
            "temperature_c": hourly["temperature_2m"][i],
            "cloud_cover_percent": hourly["cloudcover"][i],
            "wind_speed_kmh": hourly["windspeed_10m"][i],
            "solar_irradiance": hourly["shortwave_radiation"][i]
        })

    if await is_redis_available() and redis_client.client is not None:
        try:
            await redis_client.client.setex(cache_key, WEATHER_HOURLY_TTL, json.dumps(result))
        except Exception as exc:
            logger.warning("weather hourly cache write failed (%s): %s", cache_key, exc)

    return result


async def fetch_recent_and_future_hourly_weather(
    lat: float = settings.DEFAULT_LATITUDE,
    lon: float = settings.DEFAULT_LONGITUDE,
    history_hours: int = 72,
    future_hours: int = 6,
) -> List[dict]:
    """
    Fetch recent historical + near-future hourly weather from Open-Meteo.

    Uses Open-Meteo forecast endpoint with `past_days` support to retrieve
    the latest historical hours used for model input feature construction.

    Returns:
        Hourly rows ordered by time asc containing timestamp and weather signals.
    """
    history_days = max(1, min(7, (history_hours + 23) // 24))
    forecast_days = max(1, min(3, (future_hours + 23) // 24))

    lat_key = round(float(lat), 2)
    lon_key = round(float(lon), 2)
    cache_window = datetime.now(IST).strftime("%Y%m%d%H")
    cache_key = WEATHER_RECENT_FUTURE.format(
        lat=lat_key,
        lon=lon_key,
        history=int(history_hours),
        future=int(future_hours),
        window=cache_window,
    )

    if await is_redis_available() and redis_client.client is not None:
        try:
            cached = await redis_client.client.get(cache_key)
            if cached:
                payload = json.loads(cached)
                if isinstance(payload, list):
                    return payload
        except Exception as exc:
            logger.warning("weather recent+future cache read failed (%s): %s", cache_key, exc)

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "temperature_2m",
            "cloudcover",
            "windspeed_10m",
            "shortwave_radiation",
        ],
        "timezone": "Asia/Kolkata",
        "past_days": history_days,
        "forecast_days": forecast_days,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(settings.WEATHER_API_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    if not times:
        return []

    temp_series = hourly.get("temperature_2m", [])
    cloud_series = hourly.get("cloudcover", [])
    wind_series = hourly.get("windspeed_10m", [])
    solar_series = hourly.get("shortwave_radiation", [])

    def _value_at(values: list, index: int, default: float = 0.0) -> float:
        if index < len(values):
            value = values[index]
            if isinstance(value, (int, float)):
                return float(value)
        return default

    rows: List[dict] = []
    for i, ts in enumerate(times):
        rows.append({
            "timestamp": ts,
            "temperature_c": _value_at(temp_series, i, 28.0),
            "cloud_cover_percent": _value_at(cloud_series, i, 20.0),
            "wind_speed_kmh": _value_at(wind_series, i, 15.0),
            "solar_irradiance": _value_at(solar_series, i, 0.0),
        })

    required_count = history_hours + future_hours
    result = rows[-required_count:] if len(rows) > required_count else rows

    if await is_redis_available() and redis_client.client is not None:
        try:
            await redis_client.client.setex(
                cache_key,
                WEATHER_RECENT_FUTURE_TTL,
                json.dumps(result),
            )
        except Exception as exc:
            logger.warning("weather recent+future cache write failed (%s): %s", cache_key, exc)

    return result

async def fetch_nasa_solar(lat: float = settings.DEFAULT_LATITUDE,
                            lon: float = settings.DEFAULT_LONGITUDE) -> float:
    """
    Fetch solar irradiance from NASA POWER API (free)
    Returns average GHI in W/m²
    """
    from datetime import timedelta
    end   = datetime.now(IST)
    start = end - timedelta(days=7)

    params = {
        "latitude":   lat,
        "longitude":  lon,
        "start":      start.strftime("%Y%m%d"),
        "end":        end.strftime("%Y%m%d"),
        "parameters": "ALLSKY_SFC_SW_DWN",
        "community":  "RE",
        "format":     "JSON",
        "header":     "false"
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(settings.NASA_POWER_API, params=params)
            resp.raise_for_status()
            data = resp.json()

        values = list(
            data["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"].values()
        )
        valid = [v for v in values if v != -999]
        return round(sum(valid) / len(valid), 2) if valid else 200.0
    except Exception:
        return 200.0  # fallback default
