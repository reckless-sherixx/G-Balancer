"""
preprocess.py
Feature engineering and preprocessing pipeline.
Transforms raw grid data into model-ready sequences for the LSTM forecaster
and tabular features for the action recommender.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import joblib
import os


# ─── Constants ────────────────────────────────────────────────────────────────

SEQUENCE_LENGTH = 72          # How many past hours the LSTM looks back
FORECAST_HORIZON = 6          # How many hours ahead we predict
FEATURE_COLS = [
    "solar_kwh",
    "wind_kwh",
    "total_supply_kwh",
    "demand_kwh",
    "battery_pct",
    "surplus_kwh",
    "hour_sin",
    "hour_cos",
    "day_of_week_sin",
    "day_of_week_cos",
    "month_sin",
    "month_cos",
    "is_weekend",
]
TARGET_COLS = ["total_supply_kwh", "demand_kwh"]


def get_scaler_path():
    """Returns the path where the scaler should be saved/loaded."""
    return os.path.join(os.path.dirname(__file__), "..", "models", "scaler.pkl")


# ─── Time Encoding ─────────────────────────────────────────────────────────────

def encode_cyclical(df: pd.DataFrame) -> pd.DataFrame:
    """
    Encodes cyclical time features using sine/cosine transformation.
    This prevents the model from treating hour 23 as far from hour 0.

    Args:
        df: DataFrame with columns hour, day_of_week, month

    Returns:
        DataFrame with sin/cos encoded time columns added
    """
    df = df.copy()
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["day_of_week_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["day_of_week_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    return df


# ─── Lag & Rolling Features ────────────────────────────────────────────────────

def add_lag_features(df: pd.DataFrame, lags: list = [1, 2, 3, 6, 12, 24]) -> pd.DataFrame:
    """
    Adds lagged versions of supply, demand, and surplus.
    Helps the model understand recent trends.

    Args:
        df: Input DataFrame
        lags: List of lag steps (in hours)

    Returns:
        DataFrame with lag columns added
    """
    df = df.copy()
    for lag in lags:
        df[f"supply_lag_{lag}h"] = df["total_supply_kwh"].shift(lag)
        df[f"demand_lag_{lag}h"] = df["demand_kwh"].shift(lag)
        df[f"surplus_lag_{lag}h"] = df["surplus_kwh"].shift(lag)
    return df


def add_rolling_features(df: pd.DataFrame, windows: list = [3, 6, 12, 24]) -> pd.DataFrame:
    """
    Adds rolling mean and std features to capture recent averages and volatility.

    Args:
        df: Input DataFrame
        windows: List of rolling window sizes (in hours)

    Returns:
        DataFrame with rolling feature columns added
    """
    df = df.copy()
    for w in windows:
        df[f"supply_roll_mean_{w}h"] = df["total_supply_kwh"].rolling(w).mean()
        df[f"supply_roll_std_{w}h"] = df["total_supply_kwh"].rolling(w).std()
        df[f"demand_roll_mean_{w}h"] = df["demand_kwh"].rolling(w).mean()
    return df


# ─── Normalization ─────────────────────────────────────────────────────────────

def fit_scaler(df: pd.DataFrame, cols: list) -> MinMaxScaler:
    """
    Fits a MinMaxScaler on specified columns and saves it to disk.

    Args:
        df: Training DataFrame
        cols: Columns to scale

    Returns:
        Fitted MinMaxScaler
    """
    scaler = MinMaxScaler()
    scaler.fit(df[cols].dropna())
    scaler_path = get_scaler_path()
    os.makedirs(os.path.dirname(scaler_path), exist_ok=True)
    joblib.dump(scaler, scaler_path)
    print(f"Scaler saved to {scaler_path}")
    return scaler


def load_scaler() -> MinMaxScaler:
    """Loads the saved scaler from disk."""
    scaler_path = get_scaler_path()
    return joblib.load(scaler_path)


def scale_features(df: pd.DataFrame, cols: list, scaler: MinMaxScaler) -> pd.DataFrame:
    """
    Applies the fitted scaler to the specified columns.

    Args:
        df: DataFrame to transform
        cols: Columns to scale
        scaler: Fitted MinMaxScaler

    Returns:
        DataFrame with scaled columns
    """
    df = df.copy()
    df[cols] = scaler.transform(df[cols])
    return df


# ─── Sequence Builder (for LSTM) ───────────────────────────────────────────────

def build_sequences(
    df: pd.DataFrame,
    feature_cols: list,
    target_cols: list,
    seq_len: int = SEQUENCE_LENGTH,
    horizon: int = FORECAST_HORIZON,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Converts a flat DataFrame into (X, y) sequence pairs for LSTM training.

    X shape: (num_samples, seq_len, num_features)
    y shape: (num_samples, horizon, num_targets)

    Args:
        df: Preprocessed DataFrame (scaled)
        feature_cols: Input feature column names
        target_cols: Target column names to predict
        seq_len: Length of input lookback window
        horizon: Number of future steps to predict

    Returns:
        Tuple of (X, y) numpy arrays
    """
    data = df[feature_cols + target_cols].dropna().values
    feature_indices = list(range(len(feature_cols)))
    target_indices = [len(feature_cols) + i for i in range(len(target_cols))]

    X, y = [], []
    for i in range(seq_len, len(data) - horizon):
        X.append(data[i - seq_len:i, feature_indices])
        y.append(data[i:i + horizon, target_indices])

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


# ─── Recommender Feature Builder ──────────────────────────────────────────────

def build_recommender_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Extracts flat tabular features for the action recommender model.
    Uses forecast outputs + battery state as inputs.

    Args:
        df: Full preprocessed DataFrame (must contain action column)

    Returns:
        Tuple of (X_features DataFrame, y_labels Series)
    """
    rec_features = [
        "surplus_kwh",
        "battery_pct",
        "supply_roll_mean_6h",
        "demand_roll_mean_6h",
        "supply_roll_std_6h",
        "hour_sin",
        "hour_cos",
        "is_weekend",
    ]
    available = [c for c in rec_features if c in df.columns]
    X = df[available].dropna()
    y = df.loc[X.index, "action"]
    return X, y


# ─── Full Pipeline ─────────────────────────────────────────────────────────────

def run_pipeline(csv_path: str, fit: bool = True) -> dict:
    """
    Runs the complete preprocessing pipeline from raw CSV to model-ready arrays.

    Args:
        csv_path: Path to the raw/processed CSV file
        fit: If True, fits and saves a new scaler. If False, loads existing.

    Returns:
        Dict with keys:
            X_lstm, y_lstm        → LSTM training sequences
            X_rec, y_rec          → Recommender features and labels
            scaler                → Fitted scaler object
            df_processed          → Fully processed DataFrame
    """
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path, parse_dates=["timestamp"])

    print("Encoding cyclical time features...")
    df = encode_cyclical(df)

    print("Adding lag features...")
    df = add_lag_features(df)

    print("Adding rolling features...")
    df = add_rolling_features(df)

    # Drop rows with NaN from lag/rolling (first ~24 rows)
    df = df.dropna().reset_index(drop=True)

    # Fit or load scaler
    scale_cols = [c for c in FEATURE_COLS if c in df.columns]
    if fit:
        print("Fitting scaler on training data...")
        scaler = fit_scaler(df, scale_cols)
    else:
        print("Loading existing scaler...")
        scaler = load_scaler()

    df = scale_features(df, scale_cols, scaler)

    print("Building LSTM sequences...")
    X_lstm, y_lstm = build_sequences(df, FEATURE_COLS, TARGET_COLS)

    print("Building recommender features...")
    X_rec, y_rec = build_recommender_features(df)

    print(f"\nPipeline complete:")
    print(f"  LSTM X: {X_lstm.shape}, y: {y_lstm.shape}")
    print(f"  Recommender X: {X_rec.shape}, y: {y_rec.shape}")

    return {
        "X_lstm": X_lstm,
        "y_lstm": y_lstm,
        "X_rec": X_rec,
        "y_rec": y_rec,
        "scaler": scaler,
        "df_processed": df,
    }


if __name__ == "__main__":
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "synthetic_grid_data.csv")
    result = run_pipeline(data_path, fit=True)
