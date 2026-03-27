"""
models/demand_forecaster.py
Loads pre-trained ML models and provides forecasting functions.
Models are trained separately using the backend/ml training pipeline.
"""
import numpy as np
from datetime import datetime
import sys
import os

# Make ml module importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ml", "src"))

# Global model cache
_forecaster = None
_recommender = None
_label_encoder = None
_scaler = None


def get_models():
    """
    Load ML models on first call, cache them for subsequent calls.
    Returns tuple of (forecaster, recommender, encoder, scaler)
    """
    global _forecaster, _recommender, _label_encoder, _scaler
    
    if _forecaster is None:
        try:
            from forecaster import load_model as load_forecaster
            from recommender import load_recommender
            from preprocess import load_scaler
            
            print("📦 Loading ML models...")
            _forecaster = load_forecaster()
            _recommender, _label_encoder = load_recommender()
            _scaler = load_scaler()
            print("✅ ML models loaded successfully")
        except Exception as e:
            print(f"⚠️ Warning: Could not load ML models: {e}")
            print("   Models must be trained first. See ML_TRAINING_GUIDE.md")
            _forecaster = None
    
    return _forecaster, _recommender, _label_encoder, _scaler


def predict_demand(hour: int, day_of_week: int, month: int,
                   temperature: float, cloud_cover: float,
                   wind_speed: float, solar_irradiance: float) -> float:
    """
    Predict grid demand using rule-based estimation.
    Falls back to formula if ML model not available.
    
    Args:
        hour: Hour of day (0-23)
        day_of_week: Day of week (0=Monday, 6=Sunday)
        month: Month (1-12)
        temperature: Temperature in Celsius
        cloud_cover: Cloud cover percentage (0-100)
        wind_speed: Wind speed in km/h
        solar_irradiance: Solar irradiance in W/m²
    
    Returns:
        Predicted demand in MW
    """
    # Base demand: ~2500 MW for Mumbai-scale grid
    base_demand = 2500.0
    
    # Hour-based factor
    if 8 <= hour <= 12:
        hour_factor = 1.2
    elif 17 <= hour <= 21:
        hour_factor = 1.35
    elif 0 <= hour <= 5:
        hour_factor = 0.65
    else:
        hour_factor = 1.0
    
    # Weekend factor
    weekend_factor = 0.85 if day_of_week >= 5 else 1.0
    
    # Temperature factor (AC load increases with heat)
    temp_factor = 1.0 + 0.008 * max(0, temperature - 25)
    
    # Month factor (seasonal variation)
    month_factor = 1.05 if month in [6, 7, 8] else 1.0  # higher in monsoon
    
    demand_mw = (base_demand * hour_factor * weekend_factor * 
                 temp_factor * month_factor + np.random.normal(0, 50))
    
    return max(1000.0, round(float(demand_mw), 2))


def predict_solar(hour: int, day_of_week: int, month: int,
                  temperature: float, cloud_cover: float,
                  wind_speed: float, solar_irradiance: float) -> float:
    """
    Predict solar generation using solar irradiance.
    
    Args:
        hour: Hour of day (0-23)
        temperature: Temperature in Celsius
        cloud_cover: Cloud cover percentage (0-100)
        solar_irradiance: Solar irradiance in W/m² (from weather API)
    
    Returns:
        Predicted solar generation in MW
    """
    # Solar capacity in the region: ~1200 MW
    solar_capacity = 1200.0
    
    # If nighttime, solar is zero
    if hour < 6 or hour > 18:
        return 0.0
    
    # Cloud cover reduces solar generation
    cloud_factor = 1.0 - (cloud_cover / 100.0) * 0.8  # 0.8 max reduction
    
    # Temperature slightly reduces efficiency
    temp_factor = 1.0 - 0.003 * max(0, temperature - 25)
    
    # Convert solar irradiance to generation
    # Assume 1000 W/m² = 100% capacity
    irradiance_factor = min(solar_irradiance / 1000.0, 1.0)
    
    solar_mw = (solar_capacity * irradiance_factor * 
                cloud_factor * temp_factor + np.random.normal(0, 20))
    
    return max(0.0, round(float(solar_mw), 2))


def predict_wind(wind_speed: float) -> float:
    """
    Predict wind generation from wind speed.
    Uses power curve: P = k * v^3 (simplified)
    
    Args:
        wind_speed: Wind speed in km/h
    
    Returns:
        Predicted wind generation in MW
    """
    # Wind capacity: ~800 MW
    wind_capacity = 800.0
    
    # Convert km/h to m/s
    wind_ms = wind_speed / 3.6
    
    # Wind power follows v^3 curve
    # Assume rated power (100% capacity) at 14 m/s
    power_factor = min((wind_ms / 14.0) ** 3, 1.0)
    
    wind_mw = wind_capacity * power_factor + np.random.normal(0, 25)
    
    return max(0.0, round(float(wind_mw), 2))


# ─── Feature Engineering ──────────────────────────────────────────────
def make_features(hour: int, day_of_week: int, month: int,
                   temperature: float, cloud_cover: float,
                   wind_speed: float, solar_irradiance: float) -> np.ndarray:
    """
    Build feature vector for a single time step.
    """
    is_weekend    = 1 if day_of_week >= 5 else 0
    is_peak_hours = 1 if (8 <= hour <= 12 or 17 <= hour <= 21) else 0
    is_summer     = 1 if month in [3, 4, 5, 6] else 0

    # Cyclical encoding for hour and month
    hour_sin  = np.sin(2 * np.pi * hour / 24)
    hour_cos  = np.cos(2 * np.pi * hour / 24)
    month_sin = np.sin(2 * np.pi * month / 12)
    month_cos = np.cos(2 * np.pi * month / 12)

    return np.array([[
        hour, day_of_week, month,
        temperature, cloud_cover, wind_speed, solar_irradiance,
        is_weekend, is_peak_hours, is_summer,
        hour_sin, hour_cos, month_sin, month_cos
    ]])

# ─── Synthetic Training Data ──────────────────────────────────────────
def generate_synthetic_data(n_days: int = 365) -> pd.DataFrame:
    """
    Generate realistic synthetic energy data for training.
    Based on typical Mumbai grid patterns.
    """
    records = []
    start_date = datetime(2023, 1, 1)

    for day in range(n_days):
        current = start_date + timedelta(days=day)
        for hour in range(24):
            # Temperature varies by season and hour
            base_temp = 25 + 10 * np.sin(2 * np.pi * (current.month - 1) / 12)
            hour_temp = base_temp + 5 * np.sin(2 * np.pi * (hour - 6) / 24)
            temperature = hour_temp + np.random.normal(0, 1.5)

            # Cloud cover
            cloud_cover = max(0, min(100, np.random.normal(30, 20)))

            # Wind speed
            wind_speed = max(0, np.random.normal(15, 5))

            # Solar irradiance (zero at night)
            if 6 <= hour <= 18:
                solar_irradiance = max(0,
                    600 * np.sin(np.pi * (hour - 6) / 12) * (1 - cloud_cover / 100)
                    + np.random.normal(0, 30)
                )
            else:
                solar_irradiance = 0.0

            # ── Demand pattern ────────────────────────────────────────
            # Base: 2500 MW for Mumbai
            base_demand = 2500
            # Peak hours effect
            if 8 <= hour <= 12:
                hour_factor = 1.2
            elif 17 <= hour <= 21:
                hour_factor = 1.35
            elif 0 <= hour <= 5:
                hour_factor = 0.65
            else:
                hour_factor = 1.0

            weekend_factor = 0.85 if current.weekday() >= 5 else 1.0
            temp_factor    = 1.0 + 0.008 * max(0, temperature - 25)  # AC load
            demand_mw = (base_demand * hour_factor * weekend_factor
                         * temp_factor + np.random.normal(0, 80))

            # ── Solar generation ──────────────────────────────────────
            # Assume 1200 MW solar capacity in region
            solar_mw = max(0, (solar_irradiance / 1000) * 1200
                          + np.random.normal(0, 20))

            # ── Wind generation ───────────────────────────────────────
            # Assume 800 MW wind capacity
            wind_mw = max(0, (wind_speed / 40) * 800 + np.random.normal(0, 30))

            records.append({
                "hour": hour,
                "day_of_week": current.weekday(),
                "month": current.month,
                "temperature": round(temperature, 2),
                "cloud_cover": round(cloud_cover, 2),
                "wind_speed": round(wind_speed, 2),
                "solar_irradiance": round(solar_irradiance, 2),
                "demand_mw": round(max(1000, demand_mw), 2),
                "solar_mw": round(solar_mw, 2),
                "wind_mw": round(wind_mw, 2)
            })

    return pd.DataFrame(records)

# ─── Model Training ───────────────────────────────────────────────────
def train_models():
    print("🔄 Training forecasting models on synthetic data...")
    df = generate_synthetic_data(365)

    feature_cols = [
        "hour", "day_of_week", "month",
        "temperature", "cloud_cover", "wind_speed", "solar_irradiance",
        "is_weekend", "is_peak_hours", "is_summer",
        "hour_sin", "hour_cos", "month_sin", "month_cos"
    ]

    # Add derived features
    df["is_weekend"]    = (df["day_of_week"] >= 5).astype(int)
    df["is_peak_hours"] = df["hour"].apply(
        lambda h: 1 if (8 <= h <= 12 or 17 <= h <= 21) else 0
    )
    df["is_summer"]  = df["month"].apply(lambda m: 1 if m in [3, 4, 5, 6] else 0)
    df["hour_sin"]   = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"]   = np.cos(2 * np.pi * df["hour"] / 24)
    df["month_sin"]  = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"]  = np.cos(2 * np.pi * df["month"] / 12)

    X = df[feature_cols].values

    # ── Train demand model ────────────────────────────────────────────
    demand_model = XGBRegressor(n_estimators=200, max_depth=6,
                                learning_rate=0.05, random_state=42)
    demand_model.fit(X, df["demand_mw"].values)
    joblib.dump(demand_model, MODEL_PATH)

    # ── Train solar model ─────────────────────────────────────────────
    solar_model = XGBRegressor(n_estimators=150, max_depth=5,
                               learning_rate=0.05, random_state=42)
    solar_model.fit(X, df["solar_mw"].values)
    joblib.dump(solar_model, SUPPLY_MODEL_PATH)

    # ── Save scaler ───────────────────────────────────────────────────
    scaler = MinMaxScaler()
    scaler.fit(X)
    joblib.dump(scaler, SCALER_PATH)

    print("✅ Models trained and saved!")
    return demand_model, solar_model

# ─── Load or Train ────────────────────────────────────────────────────
def load_models():
    if os.path.exists(MODEL_PATH) and os.path.exists(SUPPLY_MODEL_PATH):
        demand_model = joblib.load(MODEL_PATH)
        solar_model  = joblib.load(SUPPLY_MODEL_PATH)
        print("✅ Models loaded from disk")
    else:
        demand_model, solar_model = train_models()
    return demand_model, solar_model

# ─── Prediction Functions ─────────────────────────────────────────────
_demand_model = None
_solar_model  = None

def get_models():
    global _demand_model, _solar_model
    if _demand_model is None or _solar_model is None:
        _demand_model, _solar_model = load_models()
    return _demand_model, _solar_model

def predict_demand(hour: int, day_of_week: int, month: int,
                   temperature: float, cloud_cover: float,
                   wind_speed: float, solar_irradiance: float) -> float:
    demand_model, _ = get_models()
    features = make_features(hour, day_of_week, month,
                              temperature, cloud_cover, wind_speed, solar_irradiance)
    pred = demand_model.predict(features)[0]
    return max(0.0, round(float(pred), 2))

def predict_solar(hour: int, day_of_week: int, month: int,
                  temperature: float, cloud_cover: float,
                  wind_speed: float, solar_irradiance: float) -> float:
    _, solar_model = get_models()
    features = make_features(hour, day_of_week, month,
                              temperature, cloud_cover, wind_speed, solar_irradiance)
    pred = solar_model.predict(features)[0]
    return max(0.0, round(float(pred), 2))

def predict_wind(wind_speed: float, capacity_mw: float = 800.0) -> float:
    """Simple physics-based wind prediction (no ML needed)"""
    if wind_speed < 3:   return 0.0   # cut-in speed
    if wind_speed > 25:  return 0.0   # cut-out speed
    factor = min(1.0, (wind_speed / 15) ** 2)
    return round(factor * capacity_mw + np.random.normal(0, 10), 2)
