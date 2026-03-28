# config.py
from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    APP_NAME: str = "Intelligent Energy Grid Balancer"
    VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./energy_grid.db")

    # Weather API (Open-Meteo - Free, no key needed)
    WEATHER_API_BASE: str = "https://api.open-meteo.com/v1/forecast"

    # NASA POWER API (Free, no key needed)
    NASA_POWER_API: str = "https://power.larc.nasa.gov/api/temporal/hourly/point"

    # Default city: Mumbai
    DEFAULT_LATITUDE: float = 19.07
    DEFAULT_LONGITUDE: float = 72.87
    DEFAULT_CITY: str = "Mumbai"

    # Grid thresholds
    CRITICAL_DEMAND_THRESHOLD: float = 0.90   # 90% of grid capacity → critical alert
    WARNING_DEMAND_THRESHOLD: float = 0.75    # 75% of grid capacity → warning
    SURPLUS_THRESHOLD: float = 0.20           # 20% surplus → store/reroute
    MAX_GRID_CAPACITY_MW: float = 5000.0      # Example: 5000 MW for Mumbai

    # Battery storage
    BATTERY_CAPACITY_MWH: float = 500.0
    BATTERY_CHARGE_RATE: float = 100.0        # MW per hour
    BATTERY_MIN_LEVEL: float = 0.10           # Keep min 10% charge

    # Scheduler interval (seconds)
    BALANCE_INTERVAL_SECONDS: int = 60

settings = Settings()
