"""
simulator.py
Generates synthetic but realistic energy grid data for training and testing.
Simulates solar output, wind output, grid demand, and battery state.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta


def simulate_solar(hours: int = 24, noise_std: float = 0.5, peak_kwh: float = 10.0) -> np.ndarray:
    """
    Simulates solar panel output using a Gaussian bell curve peaking at noon.
    Solar output is zero at night and peaks around 12:00.

    Args:
        hours: Number of hours to simulate
        noise_std: Standard deviation of Gaussian noise
        peak_kwh: Peak solar output in kWh

    Returns:
        np.ndarray of shape (hours,) with simulated solar output
    """
    t = np.arange(hours)
    # Bell curve centered at hour 12 (noon), std=3 hours
    solar = peak_kwh * np.exp(-0.5 * ((t % 24 - 12) / 3) ** 2)
    solar = np.maximum(0, solar + np.random.normal(0, noise_std, hours))
    return solar


def simulate_wind(hours: int = 24, base_speed: float = 5.0, noise_std: float = 1.5) -> np.ndarray:
    """
    Simulates wind energy output using a random walk with mean reversion.
    Wind is more unpredictable than solar — no strong diurnal pattern.

    Args:
        hours: Number of hours to simulate
        base_speed: Mean wind speed (m/s)
        noise_std: Volatility of wind speed changes

    Returns:
        np.ndarray of shape (hours,) with simulated wind output in kWh
    """
    speeds = [base_speed]
    for _ in range(hours - 1):
        # Mean-reverting random walk
        change = np.random.normal(0, noise_std)
        new_speed = speeds[-1] + change - 0.1 * (speeds[-1] - base_speed)
        speeds.append(max(0, new_speed))

    speeds = np.array(speeds)
    # Wind power is proportional to cube of wind speed (simplified)
    wind_kwh = 0.05 * (speeds ** 2)
    return wind_kwh


def simulate_demand(hours: int = 24, base_demand: float = 10.0) -> np.ndarray:
    """
    Simulates grid electricity demand.
    Demand follows a daily pattern: high in morning/evening, low at night.

    Args:
        hours: Number of hours to simulate
        base_demand: Baseline demand in kWh

    Returns:
        np.ndarray of shape (hours,) with simulated demand
    """
    t = np.arange(hours)
    hour_of_day = t % 24

    # Morning peak at 8am, evening peak at 7pm
    morning_peak = 1.5 * np.exp(-0.5 * ((hour_of_day - 8) / 2) ** 2)
    evening_peak = 2.0 * np.exp(-0.5 * ((hour_of_day - 19) / 2) ** 2)
    night_dip = -0.3 * np.exp(-0.5 * ((hour_of_day - 3) / 2) ** 2)

    demand = base_demand + morning_peak + evening_peak + night_dip
    demand += np.random.normal(0, 0.4, hours)
    return np.maximum(0, demand)


def simulate_battery(supply: np.ndarray, demand: np.ndarray,
                     capacity_kwh: float = 50.0, initial_pct: float = 0.5) -> np.ndarray:
    """
    Simulates battery state-of-charge over time based on supply/demand balance.

    Args:
        supply: Total renewable supply per hour
        demand: Grid demand per hour
        capacity_kwh: Maximum battery storage capacity
        initial_pct: Initial battery charge as a fraction (0–1)

    Returns:
        np.ndarray of shape (hours,) with battery % at each timestep
    """
    battery = [initial_pct * capacity_kwh]

    for i in range(len(supply) - 1):
        delta = supply[i] - demand[i]
        new_level = battery[-1] + delta
        new_level = np.clip(new_level, 0, capacity_kwh)
        battery.append(new_level)

    return np.array(battery) / capacity_kwh * 100  # return as percentage


def generate_dataset(days: int = 365, freq_hours: int = 1) -> pd.DataFrame:
    """
    Generates a full multi-day dataset for model training.

    Args:
        days: Number of days of data to simulate
        freq_hours: Timestep resolution in hours

    Returns:
        pd.DataFrame with columns:
            timestamp, solar_kwh, wind_kwh, total_supply_kwh,
            demand_kwh, battery_pct, surplus_kwh,
            hour, day_of_week, month, is_weekend
    """
    hours = days * 24 // freq_hours
    start_time = datetime(2023, 1, 1)

    solar = simulate_solar(hours)
    wind = simulate_wind(hours)
    demand = simulate_demand(hours)
    supply = solar + wind
    battery = simulate_battery(supply, demand)
    surplus = supply - demand

    timestamps = [start_time + timedelta(hours=i * freq_hours) for i in range(hours)]

    df = pd.DataFrame({
        "timestamp": timestamps,
        "solar_kwh": solar,
        "wind_kwh": wind,
        "total_supply_kwh": supply,
        "demand_kwh": demand,
        "battery_pct": battery,
        "surplus_kwh": surplus,
    })

    # Time-based features
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["month"] = df["timestamp"].dt.month
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    # Action label for recommender training
    df["action"] = df.apply(_label_action, axis=1)

    return df


def _label_action(row) -> str:
    """
    Rule-based labeling for training the action recommender.
    Maps surplus and battery state to a grid action.
    """
    surplus = row["surplus_kwh"]
    battery = row["battery_pct"]

    if surplus > 2.0 and battery < 90:
        return "STORE"
    elif surplus < -2.0 and battery > 10:
        return "RELEASE"
    elif surplus < -2.0 and battery <= 10:
        return "REDISTRIBUTE"
    else:
        return "STABLE"


if __name__ == "__main__":
    import os
    print("Generating 365-day synthetic dataset...")
    df = generate_dataset(days=365)
    output_dir = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "synthetic_grid_data.csv")
    df.to_csv(output_path, index=False)
    print(f"Saved {len(df)} rows to {output_path}")
    print(df.head(10))
    print("\nAction distribution:")
    print(df["action"].value_counts())
