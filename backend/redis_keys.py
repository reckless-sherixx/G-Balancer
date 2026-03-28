"""Redis key templates and TTLs (single source of truth)."""

from dataclasses import dataclass


@dataclass(frozen=True)
class KeyTemplate:
    template: str

    def format(self, **kwargs) -> str:
        return self.template.format(**kwargs)


# forecast deterministic cache (fallback path)
FORECAST_DET = KeyTemplate("forecast:det:{city}:{lat}:{lon}:{hours}:{utc_hour}")
FORECAST_DET_TTL = 3600

# ML/public-api forecast cache (short window to avoid refresh jitter)
FORECAST_ML = KeyTemplate("forecast:ml:{city}:{lat}:{lon}:{hours}:{window}")
FORECAST_ML_TTL = 600

# latest grid state by city
GRID_STATE_LATEST = KeyTemplate("grid:state:latest:{city}")
GRID_STATE_LATEST_TTL = 90

# weather cache
WEATHER_CURRENT = KeyTemplate("weather:current:{lat}:{lon}")
WEATHER_CURRENT_TTL = 600

WEATHER_HOURLY = KeyTemplate("weather:hourly:{lat}:{lon}:{hours}")
WEATHER_HOURLY_TTL = 1800

# recent+future weather sequence for ML feature construction
WEATHER_RECENT_FUTURE = KeyTemplate("weather:recent-future:{lat}:{lon}:{history}:{future}:{window}")
WEATHER_RECENT_FUTURE_TTL = 600

# alerts cache
GRID_ALERTS = KeyTemplate("grid:alerts:{city}")
GRID_ALERTS_TTL = 60

# pub/sub channel
GRID_PUBSUB_CHANNEL = KeyTemplate("grid:updates:{city}")


def normalize_city(city: str | None) -> str:
    return (city or "mumbai").strip().lower()
