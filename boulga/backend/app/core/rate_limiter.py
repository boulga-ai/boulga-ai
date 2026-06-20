from typing import Optional

import redis.asyncio as aioredis

from app.config import settings

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    """Retourne True si la requête est autorisée, False si le quota est dépassé."""
    client = await get_redis()
    current = await client.incr(key)
    if current == 1:
        await client.expire(key, window_seconds)
    return current <= max_requests
