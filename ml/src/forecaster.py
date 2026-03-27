"""
forecaster.py
LSTM-based time-series forecaster for renewable energy supply and grid demand.

Architecture:
  - Input: (batch, 72 hours, n_features)
  - 2-layer stacked LSTM with dropout
  - Fully connected output head
  - Output: (batch, 6 hours, 2) → [predicted_supply, predicted_demand]
"""

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
import os

MODEL_PATH = "../models/forecaster.pt"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ─── Dataset ──────────────────────────────────────────────────────────────────

class GridSequenceDataset(Dataset):
    """
    PyTorch Dataset wrapping (X, y) numpy arrays for the LSTM.
    X: input sequences of shape (seq_len, n_features)
    y: target sequences of shape (horizon, n_targets)
    """

    def __init__(self, X: np.ndarray, y: np.ndarray):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


# ─── Model Definition ─────────────────────────────────────────────────────────

class EnergyForecaster(nn.Module):
    """
    Stacked LSTM model for multi-step energy forecasting.

    Args:
        input_size: Number of input features per timestep
        hidden_size: Number of LSTM hidden units
        num_layers: Number of stacked LSTM layers
        output_size: Number of target variables (supply + demand = 2)
        forecast_horizon: Number of future steps to predict
        dropout: Dropout rate between LSTM layers
    """

    def __init__(
        self,
        input_size: int = 13,
        hidden_size: int = 128,
        num_layers: int = 2,
        output_size: int = 2,
        forecast_horizon: int = 6,
        dropout: float = 0.2,
    ):
        super(EnergyForecaster, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.forecast_horizon = forecast_horizon
        self.output_size = output_size

        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        self.dropout = nn.Dropout(dropout)

        # Maps the final LSTM hidden state to horizon * output_size values
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, forecast_horizon * output_size),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass.

        Args:
            x: Input tensor of shape (batch, seq_len, input_size)

        Returns:
            Output tensor of shape (batch, forecast_horizon, output_size)
        """
        # h0, c0 default to zeros when not provided
        lstm_out, _ = self.lstm(x)

        # Take only the last timestep's output
        last_out = lstm_out[:, -1, :]  # (batch, hidden_size)
        last_out = self.dropout(last_out)

        out = self.fc(last_out)  # (batch, horizon * output_size)
        out = out.view(-1, self.forecast_horizon, self.output_size)
        return out


# ─── Training ─────────────────────────────────────────────────────────────────

def train_forecaster(
    X: np.ndarray,
    y: np.ndarray,
    epochs: int = 50,
    batch_size: int = 64,
    lr: float = 1e-3,
    val_split: float = 0.2,
) -> EnergyForecaster:
    """
    Trains the LSTM forecaster on the prepared sequences.

    Args:
        X: Input array (n_samples, seq_len, n_features)
        y: Target array (n_samples, horizon, n_targets)
        epochs: Training epochs
        batch_size: Mini-batch size
        lr: Learning rate
        val_split: Fraction of data used for validation

    Returns:
        Trained EnergyForecaster model
    """
    print(f"Training on device: {DEVICE}")
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=val_split, shuffle=False)

    train_ds = GridSequenceDataset(X_train, y_train)
    val_ds = GridSequenceDataset(X_val, y_val)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size)

    model = EnergyForecaster(
        input_size=X.shape[2],
        forecast_horizon=y.shape[1],
        output_size=y.shape[2],
    ).to(DEVICE)

    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)
    criterion = nn.MSELoss()

    best_val_loss = float("inf")

    for epoch in range(1, epochs + 1):
        # Training phase
        model.train()
        train_losses = []
        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(DEVICE), y_batch.to(DEVICE)
            optimizer.zero_grad()
            preds = model(X_batch)
            loss = criterion(preds, y_batch)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_losses.append(loss.item())

        # Validation phase
        model.eval()
        val_losses = []
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch, y_batch = X_batch.to(DEVICE), y_batch.to(DEVICE)
                preds = model(X_batch)
                val_losses.append(criterion(preds, y_batch).item())

        avg_train = np.mean(train_losses)
        avg_val = np.mean(val_losses)
        scheduler.step(avg_val)

        if avg_val < best_val_loss:
            best_val_loss = avg_val
            save_model(model)

        if epoch % 10 == 0 or epoch == 1:
            print(f"Epoch {epoch:3d}/{epochs} | Train Loss: {avg_train:.4f} | Val Loss: {avg_val:.4f}")

    print(f"\nTraining complete. Best val loss: {best_val_loss:.4f}")
    return model


# ─── Persistence ──────────────────────────────────────────────────────────────

def save_model(model: EnergyForecaster, path: str = MODEL_PATH):
    """Saves model weights to disk."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    torch.save(model.state_dict(), path)
    print(f"Model saved to {path}")


def load_model(path: str = MODEL_PATH, input_size: int = 13) -> EnergyForecaster:
    """
    Loads a saved model from disk.

    Args:
        path: Path to the saved .pt file
        input_size: Must match what the model was trained with

    Returns:
        Loaded EnergyForecaster in eval mode
    """
    model = EnergyForecaster(input_size=input_size)
    model.load_state_dict(torch.load(path, map_location=DEVICE))
    model.eval()
    model.to(DEVICE)
    print(f"Forecaster loaded from {path}")
    return model


# ─── Inference ────────────────────────────────────────────────────────────────

def predict(model: EnergyForecaster, sequence: np.ndarray) -> dict:
    """
    Runs a single inference pass with the forecaster.

    Args:
        model: Loaded EnergyForecaster
        sequence: Input array of shape (seq_len, n_features) — one window

    Returns:
        Dict with:
            predicted_supply: list of float (kWh per hour, next 6h)
            predicted_demand: list of float (kWh per hour, next 6h)
    """
    model.eval()
    with torch.no_grad():
        x = torch.tensor(sequence, dtype=torch.float32).unsqueeze(0).to(DEVICE)
        output = model(x)  # (1, horizon, 2)
        output = output.squeeze(0).cpu().numpy()  # (horizon, 2)

    return {
        "predicted_supply": output[:, 0].tolist(),
        "predicted_demand": output[:, 1].tolist(),
    }


if __name__ == "__main__":
    from preprocess import run_pipeline

    print("Running preprocessing pipeline...")
    result = run_pipeline("../data/processed/synthetic_grid_data.csv", fit=True)

    print("\nStarting LSTM training...")
    model = train_forecaster(
        result["X_lstm"],
        result["y_lstm"],
        epochs=50,
        batch_size=64,
    )

    # Test inference
    sample_seq = result["X_lstm"][0]  # (72, 13)
    predictions = predict(model, sample_seq)
    print("\nSample prediction:")
    print(f"  Predicted supply (next 6h): {[round(v, 2) for v in predictions['predicted_supply']]}")
    print(f"  Predicted demand (next 6h): {[round(v, 2) for v in predictions['predicted_demand']]}")