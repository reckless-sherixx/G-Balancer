# services/forecast_service.py
"""
Forecast service: Provides forecast-based recommendations for battery management.
Integrates with forecast route to get next-hour recommendations.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from schemas.grid_schema import GridAction, ForecastRequest, ForecastResponse
from services.weather_service import fetch_hourly_forecast
from services.grid_balancer import determine_grid_status, determine_action
from models.demand_forecaster import predict_demand, predict_solar, predict_wind
from config import settings


async def get_forecast_recommendations(
    city: str = settings.DEFAULT_CITY,
    hours_ahead: int = 1,
    latitude: float = settings.DEFAULT_LATITUDE,
    longitude: float = settings.DEFAULT_LONGITUDE
) -> Optional[GridAction]:
    """
    Get the recommended action from forecast for a specific hour ahead.
    
    Args:
        city: City name (for reference, not used in weather fetch)
        hours_ahead: How many hours in the future (1 = next hour, 2 = hour after, etc.)
        latitude: Grid location latitude
        longitude: Grid location longitude
    
    Returns:
        GridAction recommendation for that hour, or None if unavailable
    """
    try:
        # Fetch weather forecast (uses lat/lon, not city name)
        weather_forecast = await fetch_hourly_forecast(
            lat=latitude,
            lon=longitude,
            hours=hours_ahead + 1  # Get up to this hour
        )
        
        if not weather_forecast or len(weather_forecast) < hours_ahead:
            return None
        
        # Get the weather for the target hour
        target_hour_idx = hours_ahead - 1
        if target_hour_idx >= len(weather_forecast):
            return None
        
        target_weather = weather_forecast[target_hour_idx]
        
        # Calculate predicted values for that hour
        target_time = datetime.now(timezone.utc) + timedelta(hours=hours_ahead)
        target_time = target_time.replace(tzinfo=None)
        
        predicted_demand = predict_demand(
            hour=target_time.hour,
            day_of_week=target_time.weekday(),
            month=target_time.month,
            temperature=target_weather.get("temperature_c", 20),
            cloud_cover=target_weather.get("cloud_cover_percent", 50),
            wind_speed=target_weather.get("wind_speed_kmh", 10),
            solar_irradiance=target_weather.get("solar_irradiance", 0)
        )
        
        predicted_solar = predict_solar(
            hour=target_time.hour,
            day_of_week=target_time.weekday(),
            month=target_time.month,
            temperature=target_weather.get("temperature_c", 20),
            cloud_cover=target_weather.get("cloud_cover_percent", 50),
            wind_speed=target_weather.get("wind_speed_kmh", 10),
            solar_irradiance=target_weather.get("solar_irradiance", 0)
        )
        
        predicted_wind = predict_wind(target_weather.get("wind_speed_kmh", 10))
        
        # Calculate net balance
        conventional = max(0, min(3000, predicted_demand - predicted_solar - predicted_wind))
        total_supply = predicted_solar + predicted_wind + conventional
        net_balance = total_supply - predicted_demand
        
        # Determine status and action for that hour
        status = determine_grid_status(net_balance, settings.MAX_GRID_CAPACITY_MW)
        
        # Use current battery percentage for determining action
        # (In a real system, you'd simulate battery forward in time)
        current_battery_pct = 0.5  # Default to 50%
        action, _ = determine_action(status, current_battery_pct, net_balance)
        
        return action
        
    except Exception as e:
        print(f"Error getting forecast recommendation: {e}")
        return None


async def get_forecast_24hour_actions(
    city: str = settings.DEFAULT_CITY,
    latitude: float = settings.DEFAULT_LATITUDE,
    longitude: float = settings.DEFAULT_LONGITUDE
) -> list[tuple[int, GridAction]]:
    """
    Get recommended actions for the next 24 hours.
    
    Returns:
        List of (hours_ahead, GridAction) tuples
    """
    actions = []
    
    try:
        # Fetch weather forecast (uses lat/lon, not city name)
        weather_forecast = await fetch_hourly_forecast(
            lat=latitude,
            lon=longitude,
            hours=24
        )
        
        if not weather_forecast:
            return []
        
        for hours_ahead in range(1, min(25, len(weather_forecast) + 1)):
            action = await get_forecast_recommendations(
                city=city,
                hours_ahead=hours_ahead,
                latitude=latitude,
                longitude=longitude
            )
            
            if action:
                actions.append((hours_ahead, action))
        
        return actions
        
    except Exception as e:
        print(f"Error getting 24-hour forecast actions: {e}")
        return []
