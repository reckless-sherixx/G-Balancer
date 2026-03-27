"""
recommender.py
XGBoost-based grid action recommender.
Takes forecasted supply/demand and current grid state as input,
and outputs the recommended balancing action + urgency score.

Actions:
  STORE       → Surplus detected, charge batteries
  RELEASE     → Deficit detected, discharge batteries
  REDISTRIBUTE → Deficit + low battery, reroute between zones
  STABLE      → Grid is balanced, no action needed
"""

import numpy as np
import pandas as pd
import joblib
import os
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder

MODEL_PATH = "../models/recommender.pkl"
ENCODER_PATH = "../models/label_encoder.pkl"

ACTION_LABELS = ["REDISTRIBUTE", "RELEASE", "STABLE", "STORE"]  # alphabetical for LabelEncoder


# ─── Training ─────────────────────────────────────────────────────────────────

def train_recommender(X: pd.DataFrame, y: pd.Series) -> XGBClassifier:
    """
    Trains the XGBoost action recommender on tabular grid features.

    Args:
        X: Feature DataFrame (surplus, battery, rolling stats, time encodings)
        y: Action label Series (STORE, RELEASE, REDISTRIBUTE, STABLE)

    Returns:
        Trained XGBClassifier
    """
    print("Encoding action labels...")
    le = LabelEncoder()
    le.fit(ACTION_LABELS)
    y_encoded = le.transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    print(f"Training recommender on {len(X_train)} samples...")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Save
    save_recommender(model, le)
    return model


# ─── Persistence ──────────────────────────────────────────────────────────────

def save_recommender(model: XGBClassifier, encoder: LabelEncoder):
    """Saves model and label encoder to disk."""
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    print(f"Recommender saved to {MODEL_PATH}")
    print(f"Label encoder saved to {ENCODER_PATH}")


def load_recommender() -> tuple[XGBClassifier, LabelEncoder]:
    """
    Loads the saved recommender model and label encoder.

    Returns:
        Tuple of (XGBClassifier, LabelEncoder)
    """
    model = joblib.load(MODEL_PATH)
    encoder = joblib.load(ENCODER_PATH)
    print("Recommender model and encoder loaded.")
    return model, encoder


# ─── Urgency Score ────────────────────────────────────────────────────────────

def compute_urgency(surplus_kwh: float, battery_pct: float) -> float:
    """
    Computes a 0–1 urgency score reflecting how critical the grid situation is.

    Logic:
        - High urgency when deficit is large (surplus is very negative)
        - High urgency when battery is nearly empty during deficit
        - Low urgency when grid is balanced

    Args:
        surplus_kwh: Current supply minus demand (can be negative)
        battery_pct: Battery state of charge (0–100)

    Returns:
        float between 0 and 1
    """
    if surplus_kwh >= 0:
        # No deficit — urgency scales slightly with surplus (overload risk)
        urgency = min(surplus_kwh / 20.0, 0.4)
    else:
        # Deficit — urgency scales with deficit depth and low battery
        deficit_urgency = min(abs(surplus_kwh) / 10.0, 0.7)
        battery_risk = max(0, (30 - battery_pct) / 30.0) * 0.3  # extra risk if battery < 30%
        urgency = min(deficit_urgency + battery_risk, 1.0)

    return round(urgency, 3)


# ─── Inference ────────────────────────────────────────────────────────────────

def recommend(
    model: XGBClassifier,
    encoder: LabelEncoder,
    features: dict,
) -> dict:
    """
    Runs inference on the action recommender.

    Args:
        model: Loaded XGBClassifier
        encoder: Loaded LabelEncoder
        features: Dict of input features with keys matching training columns

    Returns:
        Dict with:
            recommended_action: str (STORE / RELEASE / REDISTRIBUTE / STABLE)
            confidence: float (probability of predicted class)
            urgency_score: float (0–1)
            all_probabilities: dict mapping each action to its probability
    """
    feature_df = pd.DataFrame([features])
    proba = model.predict_proba(feature_df)[0]  # (n_classes,)
    pred_idx = int(np.argmax(proba))
    action = encoder.inverse_transform([pred_idx])[0]
    confidence = float(proba[pred_idx])

    all_probs = {
        encoder.inverse_transform([i])[0]: round(float(p), 4)
        for i, p in enumerate(proba)
    }

    urgency = compute_urgency(
        surplus_kwh=features.get("surplus_kwh", 0.0),
        battery_pct=features.get("battery_pct", 50.0),
    )

    return {
        "recommended_action": action,
        "confidence": round(confidence, 4),
        "urgency_score": urgency,
        "all_probabilities": all_probs,
    }


# ─── Helper: Build features from LSTM forecast output ─────────────────────────

def features_from_forecast(
    predicted_supply: list[float],
    predicted_demand: list[float],
    battery_pct: float,
    hour: int,
    is_weekend: int = 0,
) -> dict:
    """
    Constructs the recommender's input features from the LSTM forecast output
    and current grid state. This bridges Model 1 → Model 2.

    Args:
        predicted_supply: List of predicted supply values (next 6h)
        predicted_demand: List of predicted demand values (next 6h)
        battery_pct: Current battery charge (0–100)
        hour: Current hour of day (0–23)
        is_weekend: 1 if weekend, 0 if weekday

    Returns:
        Dict of features for the recommender
    """
    supply_arr = np.array(predicted_supply)
    demand_arr = np.array(predicted_demand)
    surplus_arr = supply_arr - demand_arr

    return {
        "surplus_kwh": float(surplus_arr.mean()),
        "battery_pct": battery_pct,
        "supply_roll_mean_6h": float(supply_arr.mean()),
        "demand_roll_mean_6h": float(demand_arr.mean()),
        "supply_roll_std_6h": float(supply_arr.std()),
        "hour_sin": np.sin(2 * np.pi * hour / 24),
        "hour_cos": np.cos(2 * np.pi * hour / 24),
        "is_weekend": is_weekend,
    }


if __name__ == "__main__":
    from preprocess import run_pipeline

    print("Running preprocessing pipeline...")
    result = run_pipeline("../data/processed/synthetic_grid_data.csv", fit=False)

    print("\nTraining action recommender...")
    model = train_recommender(result["X_rec"], result["y_rec"])

    # Test inference
    test_features = features_from_forecast(
        predicted_supply=[11.2, 10.8, 9.4, 12.1, 13.5, 11.9],
        predicted_demand=[10.5, 11.0, 12.3, 10.8, 9.9, 10.2],
        battery_pct=62.0,
        hour=14,
        is_weekend=0,
    )

    loaded_model, loaded_encoder = load_recommender()
    result_rec = recommend(loaded_model, loaded_encoder, test_features)

    print("\nSample recommendation:")
    print(f"  Action: {result_rec['recommended_action']}")
    print(f"  Confidence: {result_rec['confidence']}")
    print(f"  Urgency: {result_rec['urgency_score']}")
    print(f"  Probabilities: {result_rec['all_probabilities']}")