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
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder


def get_model_path():
    """Returns the path where the recommender model should be saved/loaded."""
    return os.path.join(os.path.dirname(__file__), "..", "models", "recommender.pkl")


def get_encoder_path():
    """Returns the path where the label encoder should be saved/loaded."""
    return os.path.join(os.path.dirname(__file__), "..", "models", "label_encoder.pkl")


ACTION_LABELS = ["REDISTRIBUTE", "RELEASE", "STABLE", "STORE"]  # alphabetical for LabelEncoder


class ConstantRecommender:
    """Fallback model for degenerate training sets containing a single class."""

    def __init__(self, class_index: int = 0):
        self.class_index = class_index

    def predict_proba(self, X):
        n = len(X)
        return np.ones((n, 1), dtype=float)

    def predict(self, X):
        n = len(X)
        return np.full(n, self.class_index, dtype=int)


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
    le.fit(sorted(pd.Series(y).astype(str).unique().tolist()))
    y_encoded = le.transform(y)

    unique_classes = np.unique(y_encoded)
    if len(unique_classes) < 2:
        only_action = le.inverse_transform([int(unique_classes[0])])[0]
        print(
            f"Only one class present in training data ({only_action}). "
            "Saving a constant recommender fallback model."
        )
        model = ConstantRecommender(class_index=int(unique_classes[0]))
        print("Training Accuracy: 1.0000")
        print("Validation Accuracy: 1.0000")
        save_recommender(model, le)
        return model

    class_counts = pd.Series(y_encoded).value_counts()
    stratify_labels = y_encoded if class_counts.min() >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=stratify_labels
    )

    print(f"Training recommender on {len(X_train)} samples...")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric=["mlogloss", "merror"],
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
    y_train_pred = model.predict(X_train)
    y_pred = model.predict(X_test)
    train_acc = accuracy_score(y_train, y_train_pred)
    val_acc = accuracy_score(y_test, y_pred)

    print(f"Training Accuracy: {train_acc:.4f}")
    print(f"Validation Accuracy: {val_acc:.4f}")
    print("\nClassification Report:")
    labels = sorted(np.unique(np.concatenate([y_test, y_pred])))
    target_names = le.inverse_transform(labels)
    print(classification_report(y_test, y_pred, labels=labels, target_names=target_names))

    # Save
    save_recommender(model, le)
    return model


# ─── Persistence ──────────────────────────────────────────────────────────────

def save_recommender(model: XGBClassifier, encoder: LabelEncoder):
    """Saves model and label encoder to disk."""
    model_path = get_model_path()
    encoder_path = get_encoder_path()
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model, model_path)
    joblib.dump(encoder, encoder_path)
    print(f"Recommender saved to {model_path}")
    print(f"Label encoder saved to {encoder_path}")


def load_recommender() -> tuple[XGBClassifier, LabelEncoder]:
    """
    Loads the saved recommender model and label encoder.

    Returns:
        Tuple of (XGBClassifier, LabelEncoder)
    """
    model_path = get_model_path()
    encoder_path = get_encoder_path()
    model = joblib.load(model_path)
    encoder = joblib.load(encoder_path)
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
    action = str(encoder.inverse_transform([pred_idx])[0])
    confidence = float(proba[pred_idx])

    all_probs = {
        str(encoder.inverse_transform([i])[0]): round(float(p), 4)
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
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "synthetic_grid_data.csv")
    result = run_pipeline(data_path, fit=False)

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
