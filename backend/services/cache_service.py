# services/cache_service.py
import redis
import json

r = redis.Redis(host='localhost', port=6379, db=0)

def get_cached_forecast(city: str):
    data = r.get(f"forecast:{city}")
    return json.loads(data) if data else None

def cache_forecast(city: str, data: dict, ttl: int = 60):
    r.setex(f"forecast:{city}", ttl, json.dumps(data))