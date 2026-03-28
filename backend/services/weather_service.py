# services/weather_service.py
import httpx
from datetime import datetime, timezone
from typing import List
from schemas.grid_schema import WeatherData
from config import settings

async def fetch_current_weather(lat: float = settings.DEFAULT_LATITUDE,
                                 lon: float = settings.DEFAULT_LONGITUDE) -> WeatherData:
    """
    Fetch current weather using Open-Meteo (Free, no API key needed)
    """
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
    current_hour_index = datetime.now().hour
    solar_vals = hourly.get("shortwave_radiation", [0])
    solar_irradiance = solar_vals[current_hour_index] if current_hour_index < len(solar_vals) else 0.0

    return WeatherData(
        timestamp=datetime.now(timezone.utc),
        temperature_c=current.get("temperature_2m", 28.0),
        cloud_cover_percent=current.get("cloudcover", 20.0),
        wind_speed_kmh=current.get("windspeed_10m", 15.0),
        solar_irradiance=solar_irradiance
    )

async def fetch_hourly_forecast(lat: float = settings.DEFAULT_LATITUDE,
                                 lon: float = settings.DEFAULT_LONGITUDE,
                                 hours: int = 24) -> List[dict]:
    """
    Fetch hourly weather forecast (up to 72 hours ahead)
    """
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
    return result

async def fetch_nasa_solar(lat: float = settings.DEFAULT_LATITUDE,
                            lon: float = settings.DEFAULT_LONGITUDE) -> float:
    """
    Fetch solar irradiance from NASA POWER API (free)
    Returns average GHI in W/m²
    """
    from datetime import timedelta
    end   = datetime.now()
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
