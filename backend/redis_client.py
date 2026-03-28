"""Async Redis client manager + pub/sub helpers with graceful fallback behavior."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, AsyncGenerator, Optional

import redis.asyncio as redis

from redis_keys import GRID_PUBSUB_CHANNEL, normalize_city

logger = logging.getLogger(__name__)


class RedisClientManager:
    def __init__(self) -> None:
        self.url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.client: Optional[redis.Redis] = None
        self._connected = False

    async def connect(self) -> bool:
        """Connect and ping Redis. Never raises; returns connection status."""
        try:
            # decode_responses=True ensures string in/out payloads for JSON handling
            self.client = redis.from_url(self.url, decode_responses=True)
            await self.client.ping()
            self._connected = True
            logger.info("✅ Redis connected: %s", self.url)
            return True
        except Exception as exc:
            self._connected = False
            self.client = None
            logger.warning("⚠️ Redis unavailable (%s). Running without cache/pubsub.", exc)
            return False

    async def disconnect(self) -> None:
        """Close Redis connections gracefully."""
        if not self.client:
            return
        try:
            await self.client.close()
        except Exception:
            # noop - shutdown should always complete
            pass
        finally:
            self.client = None
            self._connected = False

    async def is_redis_available(self) -> bool:
        """Health check for Redis that never raises."""
        if not self.client:
            return False
        try:
            await self.client.ping()
            self._connected = True
            return True
        except Exception:
            self._connected = False
            return False


redis_client = RedisClientManager()


async def get_redis() -> Optional[redis.Redis]:
    """Dependency helper similar to get_db; returns None when unavailable."""
    if await redis_client.is_redis_available():
        return redis_client.client
    return None


async def is_redis_available() -> bool:
    """Module-level availability helper for easy imports."""
    return await redis_client.is_redis_available()


async def publish_grid_update(city: str, payload_dict: dict[str, Any]) -> None:
    """Publish a grid update payload to city channel. Silent no-op on failures."""
    if not await is_redis_available():
        return

    channel = GRID_PUBSUB_CHANNEL.format(city=normalize_city(city))
    try:
        assert redis_client.client is not None
        await redis_client.client.publish(channel, json.dumps(payload_dict))
    except Exception as exc:
        logger.warning("Redis publish skipped (channel=%s): %s", channel, exc)


async def subscribe_grid_updates(city: str) -> AsyncGenerator[dict[str, Any], None]:
    """
    Subscribe to city update channel and yield parsed JSON payloads.
    Automatically unsubscribes and closes pubsub on generator exit.
    """
    if not await is_redis_available():
        return

    channel = GRID_PUBSUB_CHANNEL.format(city=normalize_city(city))
    assert redis_client.client is not None
    pubsub = redis_client.client.pubsub()

    try:
        await pubsub.subscribe(channel)
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                try:
                    payload = message.get("data")
                    if isinstance(payload, (bytes, bytearray)):
                        payload = payload.decode("utf-8")
                    yield json.loads(payload or "{}")
                except Exception as parse_exc:
                    logger.warning("Redis pubsub payload parse failed: %s", parse_exc)
            await asyncio.sleep(0.01)
    finally:
        try:
            await pubsub.unsubscribe(channel)
        except Exception:
            pass
        try:
            await pubsub.close()
        except Exception:
            pass
