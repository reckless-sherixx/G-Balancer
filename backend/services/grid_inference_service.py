# services/grid_inference_service.py
"""
Smart Grid ML Inference Service

Integrates two pre-trained models:
1. Forecaster (PyTorch LSTM): Predicts next 6 hours of supply/demand
2. Recommender (XGBoost): Recommends grid action based on current state

Data flow:
1. Fetch 72 hours of grid data
2. Structure into 13 features
3. Preprocess with scaler
4. Run through Forecaster and Recommender
5. Return JSON with recommendation + 6-hour forecast
"""

import numpy as np
import pandas as pd
import joblib
import torch
import torch.nn as nn
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import math
import logging

from database.db import GridStateDB
from config import settings
from models.demand_forecaster import predict_wind
from services.weather_service import fetch_recent_and_future_hourly_weather

logger = logging.getLogger(__name__)

FEATURE_COLUMNS = [
    "solar_kwh",
    "wind_kwh",
    "total_supply_kwh",
    "demand_kwh",
    "battery_pct",
    "surplus_kwh",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
    "month_sin",
    "month_cos",
    "is_weekend",
]

# ─── LSTM Forecaster Model ────────────────────────────────────────────
class LSTMForecaster(nn.Module):
    """Fixed architecture matching saved `forecaster.pt` weights."""

    def __init__(self, input_size: int = 13, hidden_size: int = 128,
                 num_layers: int = 2, output_size: int = 12):
        super(LSTMForecaster, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers

        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Linear(64, output_size),
        )

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out


# ─── Data Processing Functions ────────────────────────────────────────
def _get_temporal_features(timestamp: datetime) -> Tuple[float, float, float, float, float, float]:
    """
    Generate temporal features from a timestamp.
    
    Returns:
        (hour_sin, hour_cos, day_sin, day_cos, month_sin, month_cos)
    """
    # Hour features (24-hour cycle)
    hour = timestamp.hour
    hour_sin = math.sin(2 * math.pi * hour / 24)
    hour_cos = math.cos(2 * math.pi * hour / 24)
    
    # Day features (365-day cycle)
    day_of_year = timestamp.timetuple().tm_yday
    day_sin = math.sin(2 * math.pi * day_of_year / 365)
    day_cos = math.cos(2 * math.pi * day_of_year / 365)
    
    # Month features (12-month cycle)
    month = timestamp.month
    month_sin = math.sin(2 * math.pi * month / 12)
    month_cos = math.cos(2 * math.pi * month / 12)
    
    return hour_sin, hour_cos, day_sin, day_cos, month_sin, month_cos


def _get_is_weekend(timestamp: datetime) -> int:
    """Check if timestamp is weekend (Saturday=5, Sunday=6 in weekday())"""
    return 1 if timestamp.weekday() >= 5 else 0


def _formula_demand_mw(
    hour: int,
    day_of_week: int,
    month: int,
    temperature: float,
) -> float:
    """Deterministic demand estimate (fallback formula equivalent)."""
    base_demand = 2500.0
    hour_factor = 1.2 if 8 <= hour <= 12 else (1.35 if 17 <= hour <= 21 else (0.65 if 0 <= hour <= 5 else 1.0))
    weekend_factor = 0.85 if day_of_week >= 5 else 1.0
    temp_factor = 1.0 + 0.008 * max(0.0, temperature - 25.0)
    month_factor = 1.05 if month in [6, 7, 8] else 1.0
    demand_mw = base_demand * hour_factor * weekend_factor * temp_factor * month_factor
    return max(1000.0, round(float(demand_mw), 2))


def _formula_solar_mw(
    hour: int,
    temperature: float,
    cloud_cover: float,
    solar_irradiance: float,
) -> float:
    """Deterministic solar estimate (fallback formula equivalent)."""
    if hour < 6 or hour > 18:
        return 0.0

    cloud_factor = 1.0 - (cloud_cover / 100.0) * 0.8
    temp_factor = 1.0 - 0.003 * max(0.0, temperature - 25.0)
    irradiance_factor = min(max(solar_irradiance, 0.0) / 1000.0, 1.0)
    solar_mw = 1200.0 * irradiance_factor * cloud_factor * temp_factor
    return max(0.0, round(float(solar_mw), 2))


async def fetch_72hour_data(db: AsyncSession, city: str = settings.DEFAULT_CITY) -> List[Dict]:
    """
    Fetch 72 hours of grid data from database.
    
    Returns:
        List of GridStateDB records ordered by timestamp (oldest first)
    """
    since = datetime.now(timezone.utc) - timedelta(hours=72)
    
    result = await db.execute(
        select(GridStateDB)
        .where(GridStateDB.city == city, GridStateDB.timestamp >= since)
        .order_by(GridStateDB.timestamp)
    )
    
    records = result.scalars().all()
    
    if len(records) == 0:
        logger.warning(f"No data found for {city} in last 72 hours")
        return []
    
    logger.info(f"Fetched {len(records)} records for {city}")
    return records


def _structure_features(records: List[GridStateDB]) -> np.ndarray:
    """
    Structure grid data into 13 features.
    
    Features (in order):
    1. solar_kwh (from solar_generation_mw)
    2. wind_kwh (from wind_generation_mw)
    3. total_supply_kwh (from total_supply_mw)
    4. demand_kwh (from current_demand_mw)
    5. battery_pct (from battery_percentage)
    6. surplus_kwh (net_balance_mw if > 0, else 0)
    7-8. hour_sin, hour_cos (temporal)
    9-10. day_sin, day_cos (temporal)
    11-12. month_sin, month_cos (temporal)
    13. is_weekend
    
    Returns:
        (N, 13) array where N = number of records
    """
    if len(records) == 0:
        raise ValueError("No records provided to structure features")
    
    features_list = []
    
    for record in records:
        # Convert MW to kWh (assuming hourly readings)
        solar_kwh = record.solar_generation_mw * 1000
        wind_kwh = record.wind_generation_mw * 1000
        total_supply_kwh = record.total_supply_mw * 1000
        demand_kwh = record.current_demand_mw * 1000
        battery_pct = record.battery_percentage / 100.0  # Normalize to 0-1
        
        # Surplus (positive balance only)
        surplus_kwh = max(0, record.net_balance_mw * 1000)
        
        # Temporal features
        hour_sin, hour_cos, day_sin, day_cos, month_sin, month_cos = _get_temporal_features(record.timestamp)
        is_weekend = _get_is_weekend(record.timestamp)
        
        feature_row = [
            solar_kwh,
            wind_kwh,
            total_supply_kwh,
            demand_kwh,
            battery_pct,
            surplus_kwh,
            hour_sin,
            hour_cos,
            day_sin,
            day_cos,
            month_sin,
            month_cos,
            is_weekend
        ]
        features_list.append(feature_row)
    
    return np.array(features_list, dtype=np.float32)


def _load_scaler() -> object:
    """Load MinMaxScaler from pkl file"""
    scaler_path = Path(__file__).parent.parent / "ml" / "models" / "scaler.pkl"
    if not scaler_path.exists():
        raise FileNotFoundError(f"Scaler not found at {scaler_path}")
    return joblib.load(scaler_path)


def _load_label_encoder() -> object:
    """Load LabelEncoder from pkl file"""
    encoder_path = Path(__file__).parent.parent / "ml" / "models" / "label_encoder.pkl"
    if not encoder_path.exists():
        raise FileNotFoundError(f"Label encoder not found at {encoder_path}")
    return joblib.load(encoder_path)


def _load_forecaster_model(device: str = "cpu") -> LSTMForecaster:
    """Load forecaster.pt into LSTM model"""
    model_path = Path(__file__).parent.parent / "ml" / "models" / "forecaster.pt"
    if not model_path.exists():
        raise FileNotFoundError(f"Forecaster model not found at {model_path}")
    
    model = LSTMForecaster(input_size=13, hidden_size=128, num_layers=2, output_size=12)
    state_dict = torch.load(model_path, map_location=device)
    try:
        model.load_state_dict(state_dict)
    except Exception:
        model.load_state_dict(state_dict, strict=False)
    model.to(device)
    model.eval()
    return model


def _load_recommender_model() -> object:
    """Load recommender.pkl (XGBoost model)"""
    recommender_path = Path(__file__).parent.parent / "ml" / "models" / "recommender.pkl"
    if not recommender_path.exists():
        raise FileNotFoundError(f"Recommender model not found at {recommender_path}")
    return joblib.load(recommender_path)


# ─── Inference Functions ──────────────────────────────────────────────
def preprocess_features(features: np.ndarray, scaler: object) -> np.ndarray:
    """
    Apply MinMaxScaler to features.
    
    Args:
        features: (N, 13) array
        scaler: Fitted MinMaxScaler
    
    Returns:
        Scaled (N, 13) array
    """
    # Reshape to apply scaler
    original_shape = features.shape
    features_flat = features.reshape(-1, features.shape[-1])

    # If scaler was fitted with DataFrame column names, preserve names to avoid
    # sklearn warning: "X does not have valid feature names".
    if hasattr(scaler, "feature_names_in_"):
        columns = list(getattr(scaler, "feature_names_in_"))
        if len(columns) != features_flat.shape[-1]:
            columns = FEATURE_COLUMNS
        features_input = pd.DataFrame(features_flat, columns=columns)
        features_scaled = scaler.transform(features_input)
    else:
        features_scaled = scaler.transform(features_flat)

    return features_scaled.reshape(original_shape)


def run_forecaster(features: np.ndarray, model: LSTMForecaster, 
                   device: str = "cpu") -> np.ndarray:
    """
    Run LSTM forecaster on 72-hour window.
    
    Args:
        features: (72, 13) array (already scaled)
        model: Loaded LSTM model
        device: CPU or CUDA
    
    Returns:
        (6, 2) array of predictions (supply, demand for next 6 hours)
    """
    # Add batch dimension: (1, 72, 13)
    # Avoid torch.from_numpy bridge because some runtimes throw
    # RuntimeError: Numpy is not available.
    features_tensor = torch.tensor(
        features.tolist(),
        dtype=torch.float32,
        device=device,
    ).unsqueeze(0)
    
    with torch.no_grad():
        predictions = model(features_tensor)

    # Model output: (1, 12) => reshape to (6, 2), without .numpy() bridge.
    output_list = predictions.squeeze(0).detach().cpu().tolist()
    output = np.array(output_list, dtype=np.float32).reshape(6, 2)
    return output


def _structure_features_from_weather_rows(
    weather_rows: List[Dict],
    initial_battery_pct: float = 50.0,
) -> np.ndarray:
    """Build 13-feature matrix from public weather API rows."""
    if not weather_rows:
        raise ValueError("No weather rows available for feature construction")

    battery_level_mwh = settings.BATTERY_CAPACITY_MWH * max(0.1, min(1.0, initial_battery_pct / 100.0))
    features_list = []

    for row in weather_rows:
        ts = datetime.fromisoformat(row["timestamp"])
        if ts.tzinfo is not None:
            ts = ts.replace(tzinfo=None)

        temp = float(row.get("temperature_c", 28.0))
        cloud = float(row.get("cloud_cover_percent", 20.0))
        wind_speed = float(row.get("wind_speed_kmh", 15.0))
        solar_irradiance = float(row.get("solar_irradiance", 0.0))

        demand_mw = _formula_demand_mw(
            hour=ts.hour,
            day_of_week=ts.weekday(),
            month=ts.month,
            temperature=temp,
        )
        solar_mw = _formula_solar_mw(
            hour=ts.hour,
            temperature=temp,
            cloud_cover=cloud,
            solar_irradiance=solar_irradiance,
        )
        wind_mw = predict_wind(wind_speed)

        conventional_mw = max(0, min(3000, demand_mw - solar_mw - wind_mw))
        total_supply_mw = solar_mw + wind_mw + conventional_mw
        net_balance_mw = total_supply_mw - demand_mw

        # simple battery simulation to make sequence realistic
        battery_level_mwh = max(
            settings.BATTERY_CAPACITY_MWH * settings.BATTERY_MIN_LEVEL,
            min(
                settings.BATTERY_CAPACITY_MWH,
                battery_level_mwh + max(-settings.BATTERY_CHARGE_RATE, min(settings.BATTERY_CHARGE_RATE, net_balance_mw)),
            ),
        )
        battery_pct = battery_level_mwh / settings.BATTERY_CAPACITY_MWH

        hour_sin, hour_cos, day_sin, day_cos, month_sin, month_cos = _get_temporal_features(ts)
        is_weekend = _get_is_weekend(ts)

        features_list.append([
            solar_mw * 1000,
            wind_mw * 1000,
            total_supply_mw * 1000,
            demand_mw * 1000,
            battery_pct,
            max(0, net_balance_mw * 1000),
            hour_sin,
            hour_cos,
            day_sin,
            day_cos,
            month_sin,
            month_cos,
            is_weekend,
        ])

    return np.array(features_list, dtype=np.float32)


def _decode_recommendation_label(prediction: np.ndarray, label_encoder: Optional[object]) -> str:
    """Decode recommender output with label encoder fallback maps."""
    if label_encoder is not None:
        try:
            decoded = label_encoder.inverse_transform(prediction)
            return str(decoded[0]).upper()
        except Exception:
            pass

    raw = prediction[0]
    if isinstance(raw, str):
        return raw.upper()

    action_map = {0: "STORE", 1: "RELEASE", 2: "REDISTRIBUTE"}
    return action_map.get(int(raw), "REDISTRIBUTE")


async def run_public_api_forecast_inference(
    city: str = settings.DEFAULT_CITY,
    latitude: float = settings.DEFAULT_LATITUDE,
    longitude: float = settings.DEFAULT_LONGITUDE,
    hours_ahead: int = 6,
    device: str = "cpu",
) -> Dict:
    """
    Inference pipeline using public weather API-derived real inputs.

    - Fetch last 72h weather + near-future weather from Open-Meteo
    - Build 13-feature sequence (72x13)
    - Scale and infer with LSTM + recommender
    """
    try:
        forecast_horizon = max(1, min(6, hours_ahead))
        weather_rows = await fetch_recent_and_future_hourly_weather(
            lat=latitude,
            lon=longitude,
            history_hours=72,
            future_hours=forecast_horizon,
        )
        if len(weather_rows) < 72:
            return {
                "status": "error",
                "city": city,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "message": f"Insufficient public API history: got {len(weather_rows)} hourly rows, need at least 72",
            }

        history_rows = weather_rows[-(72 + forecast_horizon):-forecast_horizon] if forecast_horizon > 0 else weather_rows[-72:]
        future_rows = weather_rows[-forecast_horizon:] if forecast_horizon > 0 else []

        features = _structure_features_from_weather_rows(history_rows, initial_battery_pct=50.0)

        scaler = _load_scaler()
        label_encoder = None
        try:
            label_encoder = _load_label_encoder()
        except Exception:
            logger.warning("Label encoder load failed; using fallback label map")

        forecaster = _load_forecaster_model(device=device)
        recommender = _load_recommender_model()

        scaled_features = preprocess_features(features, scaler)

        forecast_scaled = run_forecaster(scaled_features, forecaster, device=device)

        # inverse only supply/demand feature positions
        inv_template = np.zeros((forecast_scaled.shape[0], 13), dtype=np.float32)
        inv_template[:, 2] = forecast_scaled[:, 0]  # total_supply_kwh
        inv_template[:, 3] = forecast_scaled[:, 1]  # demand_kwh
        forecast_inverse = scaler.inverse_transform(inv_template)

        predicted_supply_mw = forecast_inverse[:, 2] / 1000.0
        predicted_demand_mw = forecast_inverse[:, 3] / 1000.0

        current_state_reduced = scaled_features[-1:].reshape(1, -1)[:, :8]
        recommendation_idx = recommender.predict(current_state_reduced)
        recommendation_label = _decode_recommendation_label(recommendation_idx, label_encoder)

        forecast_6h = []
        for idx in range(forecast_horizon):
            ts_str = future_rows[idx]["timestamp"] if idx < len(future_rows) else datetime.now(timezone.utc).isoformat()
            ts = datetime.fromisoformat(ts_str)

            # split supply into solar/wind parts to keep mobile contract
            proxy_solar = _formula_solar_mw(
                hour=ts.hour,
                temperature=float(future_rows[idx].get("temperature_c", 28.0)) if idx < len(future_rows) else 28.0,
                cloud_cover=float(future_rows[idx].get("cloud_cover_percent", 20.0)) if idx < len(future_rows) else 20.0,
                solar_irradiance=float(future_rows[idx].get("solar_irradiance", 0.0)) if idx < len(future_rows) else 0.0,
            )
            proxy_wind = predict_wind(float(future_rows[idx].get("wind_speed_kmh", 15.0)) if idx < len(future_rows) else 15.0)
            renewable_proxy = max(proxy_solar + proxy_wind, 1e-6)

            supply_mw = float(predicted_supply_mw[idx])
            demand_mw = float(predicted_demand_mw[idx])
            solar_share = max(0.0, proxy_solar / renewable_proxy)
            wind_share = max(0.0, proxy_wind / renewable_proxy)

            forecast_6h.append({
                "hour": idx + 1,
                "timestamp": ts.isoformat(),
                "supply_mw": supply_mw,
                "demand_mw": demand_mw,
                "predicted_solar_mw": max(0.0, supply_mw * solar_share),
                "predicted_wind_mw": max(0.0, supply_mw * wind_share),
                "balance_mw": supply_mw - demand_mw,
            })

        return {
            "status": "success",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "city": city,
            "recommendation": recommendation_label,
            "confidence": 0.85,
            "forecast_6h": forecast_6h,
            "data_points": len(history_rows),
            "source": "open-meteo-public-api",
        }
    except Exception as e:
        logger.error("Public API inference failed: %s", e, exc_info=True)
        return {
            "status": "error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "city": city,
            "message": str(e),
        }


def run_recommender(features: np.ndarray, model: object) -> str:
    """
    Run XGBoost recommender on current state.
    
    Args:
        features: (72, 13) array
        model: Loaded XGBoost model
    
    Returns:
        Action string: "STORE", "RELEASE", or "REDISTRIBUTE"
    """
    # Take only the last row (most recent)
    current_state = features[-1:, :]  # (1, 13)
    
    # Slice to first 8 features
    features_for_model = current_state[:, :8]  # (1, 8)
    
    # Predict (returns numeric class)
    prediction = model.predict(features_for_model)[0]
    
    # Map to action labels
    action_map = {0: "STORE", 1: "RELEASE", 2: "REDISTRIBUTE"}
    action = action_map.get(int(prediction), "REDISTRIBUTE")
    
    return action


# ─── Main Inference Function ──────────────────────────────────────────
async def run_grid_inference(db: AsyncSession, city: str = settings.DEFAULT_CITY,
                             device: str = "cpu") -> Dict:
    """
    Complete inference pipeline.
    
    Steps:
    1. Fetch 72 hours of data
    2. Structure into 13 features
    3. Preprocess with scaler
    4. Run forecaster
    5. Run recommender
    6. Return formatted JSON
    
    Args:
        db: AsyncSession for database access
        city: City name for which to run inference
        device: "cpu" or "cuda"
    
    Returns:
        {
            "timestamp": ISO timestamp,
            "city": city name,
            "recommendation": "STORE"|"RELEASE"|"REDISTRIBUTE",
            "confidence": 0.0-1.0,
            "forecast_6h": [
                {"hour": 1, "supply_kwh": X, "demand_kwh": Y},
                ...
            ],
            "data_points": number of records used,
            "status": "success" or "error"
        }
    """
    try:
        # Step 1: Fetch 72 hours of data
        logger.info(f"Fetching 72 hours of data for {city}...")
        records = await fetch_72hour_data(db, city)
        
        if len(records) < 10:  # Need minimum data
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "city": city,
                "status": "error",
                "message": f"Insufficient data: only {len(records)} records found (need at least 10)"
            }
        
        # Step 2: Structure features
        logger.info("Structuring features...")
        features = _structure_features(records)
        logger.info(f"Features shape: {features.shape}")
        
        # Step 3: Load models and scaler
        logger.info("Loading models...")
        scaler = _load_scaler()
        label_encoder = _load_label_encoder()
        forecaster = _load_forecaster_model(device)
        recommender = _load_recommender_model()
        
        # Step 4: Preprocess
        logger.info("Preprocessing features...")
        features_scaled = preprocess_features(features, scaler)
        
        # Step 5: Run forecaster
        logger.info("Running forecaster...")
        forecast_raw = run_forecaster(features_scaled, forecaster, device)
        
        # Inverse transform forecast to original scale
        # We need to inverse transform the supply and demand columns
        # Create dummy array with correct shape (6, 13) where supply/demand are in right positions
        forecast_full = np.zeros((forecast_raw.shape[0], 13), dtype=np.float32)
        forecast_full[:, 2] = forecast_raw[:, 0]  # supply_kwh at position 2 (total_supply_kwh)
        forecast_full[:, 3] = forecast_raw[:, 1]  # demand_kwh at position 3 (demand_kwh)
        
        # Inverse scale
        forecast_full_inv = scaler.inverse_transform(forecast_full)
        supply_forecast = forecast_full_inv[:, 2] / 1000  # Convert back to MW
        demand_forecast = forecast_full_inv[:, 3] / 1000  # Convert back to MW
        
        # Step 6: Run recommender
        logger.info("Running recommender...")
        recommendation = run_recommender(features_scaled, recommender)
        
        # Build forecast array
        forecast_array = [
            {
                "hour": i + 1,
                "supply_mw": float(supply_forecast[i]),
                "demand_mw": float(demand_forecast[i]),
                "balance_mw": float(supply_forecast[i] - demand_forecast[i])
            }
            for i in range(len(supply_forecast))
        ]
        
        logger.info(f"Inference complete: {recommendation}")
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "city": city,
            "recommendation": recommendation,
            "confidence": 0.85,  # Could be enhanced with model uncertainty
            "forecast_6h": forecast_array,
            "data_points": len(records),
            "status": "success"
        }
    
    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "city": city,
            "status": "error",
            "message": str(e)
        }


# ─── Convenience Functions ────────────────────────────────────────────
def get_model_info() -> Dict:
    """Return information about loaded models"""
    return {
        "forecaster": {
            "type": "LSTM",
            "layers": 2,
            "hidden_size": 128,
            "input_size": 13,
            "output_size": 6,
            "output_features": 2
        },
        "recommender": {
            "type": "XGBoost",
            "output_classes": ["STORE", "RELEASE", "REDISTRIBUTE"]
        },
        "features": [
            "solar_kwh", "wind_kwh", "total_supply_kwh", "demand_kwh",
            "battery_pct", "surplus_kwh", "hour_sin", "hour_cos",
            "day_sin", "day_cos", "month_sin", "month_cos", "is_weekend"
        ]
    }
