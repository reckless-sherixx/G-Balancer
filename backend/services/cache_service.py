# services/cache_service.py
"""Legacy cache helpers retained for compatibility (async Redis only)."""

import json
import logging
from typing import Optional

from redis_client import redis_client, is_redis_available

logger = logging.getLogger(__name__)


async def get_cached_forecast(city: str) -> Optional[dict]:
    key = f"forecast:{city}"
    try:
        if not await is_redis_available() or redis_client.client is None:
            return None
        payload = await redis_client.client.get(key)
        return json.loads(payload) if payload else None
    except Exception as exc:
        logger.warning("legacy cache read failed (%s): %s", key, exc)
        return None


async def cache_forecast(city: str, data: dict, ttl: int = 60) -> None:
    key = f"forecast:{city}"
    try:
        if not await is_redis_available() or redis_client.client is None:
            return
        await redis_client.client.setex(key, ttl, json.dumps(data))
    except Exception as exc:
        logger.warning("legacy cache write failed (%s): %s", key, exc)