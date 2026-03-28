# routes/websocket_route.py
"""
WebSocket endpoint — pushes live grid updates to the frontend dashboard
every N seconds without the client needing to poll.
"""
import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services.weather_service import fetch_current_weather
from models.demand_forecaster import predict_demand, predict_solar, predict_wind
from services.grid_balancer import run_balancer
from config import settings
from redis_client import is_redis_available, subscribe_grid_updates

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)

# Simple connection manager
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()


async def _polling_fallback_loop(websocket: WebSocket, city: str, battery_sim: float):
    """Original 30s polling loop kept as fallback when Redis pub/sub is unavailable."""
    while True:
        now = datetime.now(timezone.utc)

        # Fetch live weather
        weather = await fetch_current_weather()

        # Predict
        demand_mw = predict_demand(
            hour=now.hour, day_of_week=now.weekday(), month=now.month,
            temperature=weather.temperature_c,
            cloud_cover=weather.cloud_cover_percent,
            wind_speed=weather.wind_speed_kmh,
            solar_irradiance=weather.solar_irradiance or 0
        )
        solar_mw = predict_solar(
            hour=now.hour, day_of_week=now.weekday(), month=now.month,
            temperature=weather.temperature_c,
            cloud_cover=weather.cloud_cover_percent,
            wind_speed=weather.wind_speed_kmh,
            solar_irradiance=weather.solar_irradiance or 0
        )
        wind_mw = predict_wind(weather.wind_speed_kmh)
        conventional = max(0, demand_mw - solar_mw - wind_mw)

        state = run_balancer(
            current_demand_mw=demand_mw,
            solar_generation_mw=solar_mw,
            wind_generation_mw=wind_mw,
            conventional_generation_mw=conventional,
            battery_level_mwh=battery_sim,
            city=city
        )

        payload = {
            "timestamp": state.timestamp.isoformat(),
            "city": state.city,
            "current_demand_mw": state.current_demand_mw,
            "solar_generation_mw": state.solar_generation_mw,
            "wind_generation_mw": state.wind_generation_mw,
            "conventional_mw": state.conventional_generation_mw,
            "total_supply_mw": state.total_supply_mw,
            "net_balance_mw": state.net_balance_mw,
            "battery_level_mwh": state.battery_level_mwh,
            "battery_percentage": state.battery_percentage,
            "grid_status": state.grid_status.value,
            "recommended_action": state.recommended_action.value,
            "action_description": state.action_description,
            "temperature_c": weather.temperature_c,
            "cloud_cover_pct": weather.cloud_cover_percent
        }

        await websocket.send_json(payload)
        await asyncio.sleep(30)


@router.websocket("/ws/grid/{city}")
async def grid_websocket(websocket: WebSocket, city: str = settings.DEFAULT_CITY):
    """
    Connect to receive real-time grid state updates every 30 seconds.
    Frontend usage:
        const ws = new WebSocket("ws://localhost:8000/ws/grid/Mumbai");
        ws.onmessage = (e) => console.log(JSON.parse(e.data));
    """
    await manager.connect(websocket)
    battery_sim = settings.BATTERY_CAPACITY_MWH * 0.5

    try:
        # Preferred path: Redis pub/sub event stream
        if await is_redis_available():
            try:
                async for payload in subscribe_grid_updates(city):
                    await websocket.send_json(payload)
                # If generator exits unexpectedly, fallback to polling
                await _polling_fallback_loop(websocket, city, battery_sim)
            except WebSocketDisconnect:
                raise
            except Exception as exc:
                logger.warning("Redis pub/sub subscribe failed for city=%s. Falling back to polling: %s", city, exc)
                await _polling_fallback_loop(websocket, city, battery_sim)
        else:
            await _polling_fallback_loop(websocket, city, battery_sim)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
