"""
models/demand_forecaster.py
Loads pre-trained ML models and provides forecasting functions.
Models are trained separately using the backend/ml training pipeline.

This module orchestrates:
1. LSTM forecaster for supply/demand prediction from backend/ml/models/forecaster.pt
2. XGBoost recommender for action recommendations from backend/ml/models/recommender.pkl
3. Feature scaling and sequence building using the trained scaler
4. Graceful fallback to formula-based predictions when models unavailable
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import sys
import os
import joblib
from sklearn.preprocessing import MinMaxScaler

# Try to import torch, but make it optional
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None

# Make ml module importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ml", "src"))

# Model artifact paths (trained models)
FORECASTER_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "models", "forecaster.pt")
RECOMMENDER_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "models", "recommender.pkl")
LABEL_ENCODER_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "models", "label_encoder.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "models", "scaler.pkl")

# Fallback paths (legacy)
LEGACY_DEMAND_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "demand_model.joblib")
LEGACY_SUPPLY_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "supply_model.joblib")

# Global model cache
_forecaster = None
_recommender = None
_label_encoder = None
_scaler = None
_observation_buffer = None  # Historical observations for LSTM (72+ hours)


class ObservationBuffer:
    """
    Maintains a rolling 72-hour window of grid observations for LSTM sequence building.
    Observations are added in chronological order; the buffer keeps only the last 72 hours.
    """
    def __init__(self, max_hours: int = 72):
        self.max_hours = max_hours
        self.observations = []  # List of dicts with keys: timestamp, features (13-element array)
    
    def add_observation(self, timestamp: datetime, features: np.ndarray):
        """Add a new observation at timestamp with 13 features."""
        self.observations.append({
            "timestamp": timestamp,
            "features": features.copy()
        })
        # Keep only last 72 hours
        cutoff = datetime.utcnow() - timedelta(hours=self.max_hours)
        self.observations = [o for o in self.observations if o["timestamp"] >= cutoff]
    
    def get_sequence(self, end_time: datetime, seq_len: int = 72) -> np.ndarray | None:
        """
        Extract a sequence of shape (seq_len, 13) ending at end_time.
        Returns None if not enough observations.
        """
        valid = [o for o in self.observations if o["timestamp"] <= end_time]
        if len(valid) < seq_len:
            return None
        # Return last seq_len observations
        sequence = np.array([o["features"] for o in valid[-seq_len:]])
        return sequence
    
    def is_ready(self) -> bool:
        """Check if buffer has at least 72 hours of data."""
        if len(self.observations) < 72:
            return False
        return True


def _generate_synthetic_buffer():
    """
    Generate synthetic 72-hour observation buffer.
    Used at startup when real history is unavailable.
    Returns an ObservationBuffer ready for LSTM inference.
    """
    buffer = ObservationBuffer(max_hours=72)
    now = datetime.utcnow()
    
    # Generate 72 hourly observations backwards from now
    for i in range(72, 0, -1):
        ts = now - timedelta(hours=i)
        hour = ts.hour
        day_of_week = ts.weekday()
        month = ts.month
        
        # Synthesize features matching training schema
        temp = 25 + 10 * np.sin(2 * np.pi * (month - 1) / 12) + np.random.normal(0, 2)
        cloud = np.clip(np.random.normal(30, 20), 0, 100)
        wind = max(0, np.random.normal(15, 5))
        
        solar_irr = 0.0
        if 6 <= hour <= 18:
            solar_irr = 600 * np.sin(np.pi * (hour - 6) / 12) * (1 - cloud / 100) + np.random.normal(0, 30)
            solar_irr = max(0, solar_irr)
        
        # Synthesize grid features
        base_demand = 2500
        hour_factor = 1.2 if 8 <= hour <= 12 else (1.35 if 17 <= hour <= 21 else (0.65 if 0 <= hour <= 5 else 1.0))
        weekend_factor = 0.85 if day_of_week >= 5 else 1.0
        temp_factor = 1.0 + 0.008 * max(0, temp - 25)
        demand_kwh = max(1000, base_demand * hour_factor * weekend_factor * temp_factor + np.random.normal(0, 50))
        
        solar_kwh = max(0, (solar_irr / 1000) * 1200 + np.random.normal(0, 20))
        wind_kwh = max(0, (wind / 40) * 800 + np.random.normal(0, 30))
        total_supply_kwh = solar_kwh + wind_kwh + 1500  # conventional baseline
        
        battery_pct = 50 + np.random.normal(0, 10)
        surplus_kwh = total_supply_kwh - demand_kwh
        
        # Cyclical features
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)
        day_of_week_sin = np.sin(2 * np.pi * day_of_week / 7)
        day_of_week_cos = np.cos(2 * np.pi * day_of_week / 7)
        month_sin = np.sin(2 * np.pi * month / 12)
        month_cos = np.cos(2 * np.pi * month / 12)
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # 13-feature vector (matches LSTM training schema)
        features = np.array([
            solar_kwh, wind_kwh, total_supply_kwh, demand_kwh, battery_pct,
            surplus_kwh, hour_sin, hour_cos, day_of_week_sin, day_of_week_cos,
            month_sin, month_cos, is_weekend
        ], dtype=np.float32)
        
        # Add directly without triggering cutoff calculation during build
        buffer.observations.append({
            "timestamp": ts,
            "features": features.copy()
        })
    
    return buffer


def get_models():
    """
    Load ML models on first call, cache them for subsequent calls.
    Attempts to load from backend/ml/models; provides fallback if unavailable.
    
    Returns:
        tuple of (forecaster model or None, recommender model or None, 
                  label_encoder or None, scaler or None, observation_buffer)
    """
    global _forecaster, _recommender, _label_encoder, _scaler, _observation_buffer
    
    if _forecaster is not None:
        return _forecaster, _recommender, _label_encoder, _scaler, _observation_buffer
    
    try:
        from forecaster import load_model as load_forecaster
        from recommender import load_recommender
        from preprocess import load_scaler
        
        print("📦 Loading trained ML models from backend/ml/models...")
        _forecaster = load_forecaster()
        _recommender, _label_encoder = load_recommender()
        _scaler = load_scaler()
        print("✅ All ML models loaded successfully")
    except Exception as e:
        print(f"⚠️ Warning: Could not load ML models: {e}")
        print("   Falling back to formula-based predictions")
        _forecaster = None
        _recommender = None
        _label_encoder = None
        _scaler = None
    
    # Initialize observation buffer
    if _observation_buffer is None:
        _observation_buffer = _generate_synthetic_buffer()
        print("📊 Observation buffer initialized with synthetic 72-hour history")
    
    return _forecaster, _recommender, _label_encoder, _scaler, _observation_buffer


def _forecast_lstm(buffer: ObservationBuffer, target_hour: datetime) -> dict | None:
    """
    Use LSTM to forecast supply and demand.
    
    Args:
        buffer: ObservationBuffer with 72+ hours of history
        target_hour: Hour to predict for
    
    Returns:
        Dict with 'supply_kwh' and 'demand_kwh', or None if insufficient data
    """
    forecaster, _, _, _, _ = get_models()
    if forecaster is None:
        return None
    
    # Get 72-hour sequence ending just before target_hour
    end_time = target_hour - timedelta(hours=1)
    sequence = buffer.get_sequence(end_time, seq_len=72)
    
    if sequence is None:
        return None
    
    try:
        # Use LSTM to forecast next 6 hours
        if not TORCH_AVAILABLE or forecaster is None:
            return None
        
        with torch.no_grad():
            x = torch.tensor(sequence, dtype=torch.float32).unsqueeze(0)
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            x = x.to(device)
            output = forecaster(x).cpu().numpy()  # (1, 6, 2)
        
        # Extract prediction for first hour (target_hour)
        predictions = output[0, 0, :]  # [supply_kwh, demand_kwh]
        return {
            "supply_kwh": float(predictions[0]),
            "demand_kwh": float(predictions[1])
        }
    except Exception as e:
        print(f"⚠️ LSTM forecast failed: {e}. Using fallback.")
        return None


def predict_demand(hour: int, day_of_week: int, month: int,
                   temperature: float, cloud_cover: float,
                   wind_speed: float, solar_irradiance: float) -> float:
    """
    Predict grid demand.
    Uses LSTM if available and buffer ready; falls back to formula otherwise.
    
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
    _, _, _, _, buffer = get_models()
    
    # Build target hour
    now = datetime.utcnow()
    target = now.replace(hour=hour, minute=0, second=0, microsecond=0)
    
    # Try LSTM prediction
    if buffer and buffer.is_ready():
        lstm_result = _forecast_lstm(buffer, target)
        if lstm_result:
            return max(0.0, round(lstm_result["demand_kwh"], 2))
    
    # Fallback: Formula-based
    base_demand = 2500.0
    hour_factor = 1.2 if 8 <= hour <= 12 else (1.35 if 17 <= hour <= 21 else (0.65 if 0 <= hour <= 5 else 1.0))
    weekend_factor = 0.85 if day_of_week >= 5 else 1.0
    temp_factor = 1.0 + 0.008 * max(0, temperature - 25)
    month_factor = 1.05 if month in [6, 7, 8] else 1.0
    
    demand_mw = (base_demand * hour_factor * weekend_factor * 
                 temp_factor * month_factor + np.random.normal(0, 50))
    
    return max(1000.0, round(float(demand_mw), 2))


def predict_solar(hour: int, day_of_week: int, month: int,
                  temperature: float, cloud_cover: float,
                  wind_speed: float, solar_irradiance: float) -> float:
    """
    Predict solar generation.
    Uses LSTM if available and buffer ready; falls back to formula otherwise.
    
    Args:
        hour: Hour of day (0-23)
        temperature: Temperature in Celsius
        cloud_cover: Cloud cover percentage (0-100)
        solar_irradiance: Solar irradiance in W/m² (from weather API)
    
    Returns:
        Predicted solar generation in MW
    """
    _, _, _, _, buffer = get_models()
    
    # Build target hour
    now = datetime.utcnow()
    target = now.replace(hour=hour, minute=0, second=0, microsecond=0)
    
    # Try LSTM prediction (will return supply_kwh which includes solar, wind, conventional)
    if buffer and buffer.is_ready():
        lstm_result = _forecast_lstm(buffer, target)
        if lstm_result:
            # For now, decompose supply into components
            # This is a simplification; in production you'd track components separately
            supply_total = lstm_result["supply_kwh"]
            # Estimate solar as a fraction of supply based on time of day
            if 6 <= hour <= 18:
                solar_fraction = 0.4 if hour in [10, 11, 12] else 0.25
                return max(0.0, round(supply_total * solar_fraction, 2))
            else:
                return 0.0
    
    # Fallback: Formula-based
    if hour < 6 or hour > 18:
        return 0.0
    
    cloud_factor = 1.0 - (cloud_cover / 100.0) * 0.8
    temp_factor = 1.0 - 0.003 * max(0, temperature - 25)
    irradiance_factor = min(solar_irradiance / 1000.0, 1.0)
    
    solar_mw = (1200.0 * irradiance_factor * cloud_factor * 
                temp_factor + np.random.normal(0, 20))
    
    return max(0.0, round(float(solar_mw), 2))


def predict_wind(wind_speed: float) -> float:
    """
    Predict wind generation from wind speed.
    Uses physics-based power curve: P = k * v^3 (wind speed cut-in/cut-out limits).
    
    Args:
        wind_speed: Wind speed in km/h
    
    Returns:
        Predicted wind generation in MW
    """
    wind_capacity = 800.0
    wind_ms = wind_speed / 3.6
    
    # Wind turbine cut-in (3 m/s) and cut-out (25 m/s) speeds
    if wind_ms < 3.0:
        return 0.0
    if wind_ms > 25.0:
        return 0.0
    
    # Power curve: cubic relationship to rated speed
    power_factor = min((wind_ms / 14.0) ** 3, 1.0)
    wind_mw = wind_capacity * power_factor + np.random.normal(0, 25)
    
    return max(0.0, round(float(wind_mw), 2))


def add_observation(timestamp: datetime, features: np.ndarray):
    """
    Manually add observations to the global buffer.
    Called by grid state handlers to update the buffer with real observations.
    """
    _, _, _, _, buffer = get_models()
    if buffer:
        buffer.add_observation(timestamp, features)
