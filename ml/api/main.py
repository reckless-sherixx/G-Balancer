"""
main.py
FastAPI server exposing the ML models as a REST API.
Loads the LSTM forecaster and XGBoost recommender on startup
and serves predictions to the backend.

Run with:
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
"""

import sys
import os
import numpy as np
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Make src importable
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

from forecaster import load_model as load_forecaster, predict as run_forecast, EnergyForecaster
from recommender import (
    load_recommender,
    recommend,
    features_from_forecast,
    compute_urgency,
)
from preprocess import FEATURE_COLS, SEQUENCE_LENGTH, load_scaler
from schemas import (
    PredictRequest,
    PredictResponse,
    ForecastResponse,
    GridStatusRequest,
    GridStatusResponse,
    HealthResponse,
)


# ─── Global model state ───────────────────────────────────────────────────────

class ModelStore:
    forecaster: EnergyForecaster = None
    recommender = None
    label_encoder = None
    scaler = None
    forecaster_loaded: bool = False
    recommender_loaded: bool = False


models = ModelStore()


# ─── Startup / Shutdown ───────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Loads all ML models into memory when the server starts."""
    print("Loading ML models...")
    try:
        models.forecaster = load_forecaster(input_size=len(FEATURE_COLS))
        models.forecaster_loaded = True
        print("✓ Forecaster loaded")
    except Exception as e:
        print(f"✗ Forecaster failed to load: {e}")

    try:
        models.recommender, models.label_encoder = load_recommender()
        models.recommender_loaded = True
        print("✓ Recommender loaded")
    except Exception as e:
        print(f"✗ Recommender failed to load: {e}")

    try:
        models.scaler = load_scaler()
        print("✓ Scaler loaded")
    except Exception as e:
        print(f"✗ Scaler failed to load: {e}")

    print("API ready.")
    yield
    print("Shutting down.")


# ─── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Intelligent Energy Grid Balancer — ML API",
    description="LSTM forecasting + XGBoost action recommender for renewable energy grid stabilization",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def preprocess_input_sequence(request: PredictRequest) -> np.ndarray:
    """
    Converts the raw API request into a (seq_len, n_features) numpy array
    that the LSTM expects.

    If the request contains fewer hours than SEQUENCE_LENGTH (72),
    the sequence is zero-padded on the left.
    """
    solar = np.array(request.solar_output_kwh)
    wind = np.array(request.wind_output_kwh)
    demand = np.array(request.demand_kwh)
    supply = solar + wind
    surplus = supply - demand

    n = len(solar)
    hours = np.arange(n) % 24

    # Build time encodings
    hour_sin = np.sin(2 * np.pi * hours / 24)
    hour_cos = np.cos(2 * np.pi * hours / 24)

    # Stack all features in the same order as FEATURE_COLS
    # FEATURE_COLS = [solar, wind, supply, demand, battery, surplus,
    #                 hour_sin, hour_cos, dow_sin, dow_cos, mon_sin, mon_cos, is_weekend]
    battery_col = np.full(n, request.battery_level_pct / 100.0)
    dow_sin = np.zeros(n)     # unknown in inference context — set to 0
    dow_cos = np.ones(n)
    mon_sin = np.zeros(n)
    mon_cos = np.ones(n)
    is_weekend = np.zeros(n)

    features = np.stack([
        solar, wind, supply, demand, battery_col, surplus,
        hour_sin, hour_cos, dow_sin, dow_cos, mon_sin, mon_cos, is_weekend
    ], axis=1)  # (n, 13)

    # Pad or trim to SEQUENCE_LENGTH
    if n < SEQUENCE_LENGTH:
        pad = np.zeros((SEQUENCE_LENGTH - n, features.shape[1]))
        features = np.vstack([pad, features])
    else:
        features = features[-SEQUENCE_LENGTH:]

    # Apply scaler if available
    if models.scaler is not None:
        features = models.scaler.transform(features)

    return features.astype(np.float32)


def generate_hour_labels(horizon: int) -> list[str]:
    """Generates human-readable hour labels for the forecast window."""
    now = datetime.now()
    return [(now + timedelta(hours=i + 1)).strftime("%H:00") for i in range(horizon)]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["Meta"])
def health_check():
    """
    Confirms the API is live and reports which models are loaded.
    Call this from your backend before making predictions.
    """
    return HealthResponse(
        status="ok",
        forecaster_loaded=models.forecaster_loaded,
        recommender_loaded=models.recommender_loaded,
    )


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
def predict(request: PredictRequest):
    """
    Main prediction endpoint.

    Pipeline:
        1. Preprocess raw input into (72, 13) feature sequence
        2. Run LSTM forecaster → predicted supply & demand for next N hours
        3. Compute surplus = supply - demand
        4. Build recommender features from forecast
        5. Run XGBoost recommender → action + confidence
        6. Compute urgency score
        7. Return full response

    This is the primary endpoint called by the React Native app (via backend).
    """
    if not models.forecaster_loaded:
        raise HTTPException(status_code=503, detail="Forecaster model not loaded")
    if not models.recommender_loaded:
        raise HTTPException(status_code=503, detail="Recommender model not loaded")

    try:
        # Step 1: Preprocess
        sequence = preprocess_input_sequence(request)

        # Step 2: LSTM forecast
        forecast = run_forecast(models.forecaster, sequence)
        predicted_supply = forecast["predicted_supply"]
        predicted_demand = forecast["predicted_demand"]

        # Trim to requested horizon
        horizon = request.forecast_horizon_hours
        predicted_supply = predicted_supply[:horizon]
        predicted_demand = predicted_demand[:horizon]

        # Step 3: Surplus
        surplus_arr = np.array(predicted_supply) - np.array(predicted_demand)
        mean_surplus = float(surplus_arr.mean())

        # Step 4: Build recommender features
        now_hour = datetime.now().hour
        rec_features = features_from_forecast(
            predicted_supply=predicted_supply,
            predicted_demand=predicted_demand,
            battery_pct=request.battery_level_pct,
            hour=now_hour,
            is_weekend=1 if datetime.now().weekday() >= 5 else 0,
        )

        # Step 5: Action recommendation
        rec_result = recommend(models.recommender, models.label_encoder, rec_features)

        return PredictResponse(
            forecast_horizon=f"{horizon}h",
            predicted_supply=[round(v, 3) for v in predicted_supply],
            predicted_demand=[round(v, 3) for v in predicted_demand],
            recommended_action=rec_result["recommended_action"],
            urgency_score=rec_result["urgency_score"],
            confidence=rec_result["confidence"],
            surplus_kwh=round(mean_surplus, 3),
            battery_level_pct=request.battery_level_pct,
            action_probabilities=rec_result["all_probabilities"],
            generated_at=datetime.now(),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/forecast", response_model=ForecastResponse, tags=["Prediction"])
def get_last_forecast():
    """
    Returns the most recent cached forecast with hour labels.
    Used by the frontend chart component to display the supply/demand curve
    without triggering a new inference pass.

    In production you'd cache the last /predict result in Redis.
    For the hackathon we generate a demo forecast directly.
    """
    from simulator import simulate_solar, simulate_wind, simulate_demand

    hours = 6
    solar = simulate_solar(hours).tolist()
    wind = simulate_wind(hours).tolist()
    supply = [s + w for s, w in zip(solar, wind)]
    demand = simulate_demand(hours).tolist()
    surplus = [round(s - d, 3) for s, d in zip(supply, demand)]

    return ForecastResponse(
        hours=generate_hour_labels(hours),
        predicted_supply=[round(v, 3) for v in supply],
        predicted_demand=[round(v, 3) for v in demand],
        predicted_surplus=surplus,
    )


@app.post("/grid-status", response_model=GridStatusResponse, tags=["Grid"])
def grid_status(request: GridStatusRequest):
    """
    Lightweight endpoint for the grid health summary card.
    No ML inference — pure rule-based status from current values.
    Called frequently (e.g. every 30s) for the live dashboard.
    """
    surplus = request.current_supply_kwh - request.current_demand_kwh
    battery = request.battery_level_pct

    if battery < 10 and surplus < -2:
        status = "CRITICAL"
        message = "Severe deficit and critically low battery. Immediate redistribution needed."
    elif battery < 25 or surplus < -3:
        status = "WARNING"
        message = "Battery low or supply deficit detected. Consider releasing stored energy."
    elif surplus > 5 and battery > 90:
        status = "WARNING"
        message = "High surplus with battery near full. Risk of overload — consider curtailment."
    else:
        status = "HEALTHY"
        message = "Grid is balanced. No immediate action required."

    return GridStatusResponse(
        status=status,
        surplus_kwh=round(surplus, 3),
        battery_level_pct=battery,
        message=message,
    )


@app.get("/simulate", tags=["Dev"])
def simulate_sample():
    """
    Dev-only endpoint that returns a realistic simulated 24h grid snapshot.
    Useful for testing the frontend without sending real data.
    """
    from simulator import simulate_solar, simulate_wind, simulate_demand, simulate_battery

    hours = 24
    solar = simulate_solar(hours).tolist()
    wind = simulate_wind(hours).tolist()
    supply = [s + w for s, w in zip(solar, wind)]
    demand = simulate_demand(hours).tolist()
    supply_arr = np.array(supply)
    demand_arr = np.array(demand)
    battery = simulate_battery(supply_arr, demand_arr).tolist()

    return {
        "hours": list(range(hours)),
        "solar_kwh": [round(v, 2) for v in solar],
        "wind_kwh": [round(v, 2) for v in wind],
        "total_supply_kwh": [round(v, 2) for v in supply],
        "demand_kwh": [round(v, 2) for v in demand],
        "battery_pct": [round(v, 2) for v in battery],
        "surplus_kwh": [round(s - d, 2) for s, d in zip(supply, demand)],
    }