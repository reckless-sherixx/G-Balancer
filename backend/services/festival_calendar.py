# services/festival_calendar.py
from datetime import date

INDIA_FESTIVALS_2026 = {
    date(2026, 1, 14): {"name": "Makar Sankranti", "demand_multiplier": 1.15},
    date(2026, 1, 26): {"name": "Republic Day",    "demand_multiplier": 1.10},
    date(2026, 3, 25): {"name": "Holi",            "demand_multiplier": 1.20},
    date(2026, 4, 14): {"name": "Dr. Ambedkar Jayanti", "demand_multiplier": 1.05},
    date(2026, 8, 15): {"name": "Independence Day", "demand_multiplier": 1.12},
    date(2026, 10, 2): {"name": "Gandhi Jayanti",  "demand_multiplier": 1.05},
    date(2026, 10, 20): {"name": "Diwali",         "demand_multiplier": 1.45},  # MASSIVE spike
    date(2026, 10, 21): {"name": "Diwali+1",       "demand_multiplier": 1.30},
    date(2026, 11, 4): {"name": "Diwali Padwa",    "demand_multiplier": 1.20},
    date(2026, 12, 25): {"name": "Christmas",      "demand_multiplier": 1.08},
}

# IPL matches also spike demand (TVs, ACs)
IPL_2026_MATCHES = [
    date(2026, 3, 22), date(2026, 3, 23),  # Opening weekend
    # Add match dates here
]

def get_demand_multiplier(target_date: date) -> tuple[float, str]:
    if target_date in INDIA_FESTIVALS_2026:
        festival = INDIA_FESTIVALS_2026[target_date]
        return festival["demand_multiplier"], festival["name"]
    if target_date in IPL_2026_MATCHES:
        return 1.18, "IPL Match Day"
    return 1.0, "Normal Day"

def apply_festival_adjustment(base_demand: float, target_date: date) -> float:
    multiplier, event = get_demand_multiplier(target_date)
    return round(base_demand * multiplier, 2), event