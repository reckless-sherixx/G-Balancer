# G-Balancer Full Implementation Guide

## Quick Start

This guide explains how to get G-Balancer fully functional end-to-end.

### Prerequisites

- Python 3.10+
- Node.js 18+
- WSL2 (Windows) or native Linux/Mac
- Virtual environment (venv or conda)

### Installation Steps

#### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r requirements.txt
```

#### 2. ML Model Training with Real Data

**CRITICAL: Models must be trained before the system works!**

The system uses **real data from free APIs** (no synthetic data). Follow the complete instructions in `ML_TRAINING_GUIDE.md`:

```bash
# Step 0: Collect 90 days of REAL grid data from free APIs (recommended)
python3 ml/src/real_data_collector.py
# Fetches: weather, solar irradiance, electricity demand, wind data
# No API keys needed. Output: backend/ml/data/real/india_grid_data_real.csv

# Step 1: Preprocess data & fit scaler
python3 ml/src/preprocess.py
# Automatically uses real data if available, falls back to synthetic

# Step 2: Train LSTM forecaster (2-5 minutes on CPU)
python3 ml/src/forecaster.py

# Step 3: Train XGBoost recommender (1-2 minutes)
python3 ml/src/recommender.py
```

**Why real data:**

- Real weather patterns from Open-Meteo API
- Real solar irradiance from NASA POWER API
- Real electricity demand from India grid (OPSD)
- No authentication required, completely free
- Produces accurate models that work with actual grid data

After training, verify models load:

````bash
python3 -c "
import sys
sys.path.insert(0, 'ml/src')
from forecaster import load_model as load_forecaster
from recommender import load_recommender
from preprocess import load_scaler

forecaster = load_forecaster()
recommender, encoder = load_recommender()
scaler = load_scaler()
print('✓ All models loaded successfully!')
"
```from forecaster import load_model
from recommender import load_recommender
from preprocess import load_scaler
print('Loading models...')
forecaster = load_model()
recommender, encoder = load_recommender()
scaler = load_scaler()
print('✓ All models loaded successfully!')
"
````

#### 3. Start Backend API Server

```bash
cd backend
python3 -m uvicorn main:app --reload --port 8000
```

Server should start at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

Check `GET /health` endpoint:

```bash
curl http://localhost:8000/health
```

#### 4. Frontend Setup

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:3000` in browser

#### 5. Mobile App Setup

```bash
cd mobile/gbalancer
npm install
npm run android  # or: npm run ios
```

---

## Architecture Overview

```
G-BALANCER
│
├── Backend (FastAPI)
│   ├── /ml/src/             → ML training pipelines
│   ├── /ml/models/          → Trained model artifacts
│   ├── services/            → Core logic (balancing, alerts, weather)
│   ├── routes/              → REST & WebSocket endpoints
│   ├── models/              → Forecasting functions
│   ├── schemas/             → Data validation (Pydantic)
│   ├── database/            → Async SQLite
│   └── main.py              → FastAPI app + scheduler
│
├── Web Client (Next.js + React)
│   ├── app/                 → Pages & layout
│   ├── components/          → Dashboard UI
│   └── hooks/               → Custom React hooks
│
├── Mobile App (React Native + Expo)
│   └── app/(tabs)/          → 3 main screens
│
└── ML Training Notebooks
    └── /ml/notebooks/       → Jupyter notebooks (reference)
```

---

## Key Components

### 1. ML Models (`backend/ml/`)

**Forecaster (LSTM)**

- Input: 72 hours of historical data
- Output: 6-hour ahead predictions (supply & demand)
- Architecture: 2-layer LSTM (128 hidden units)
- Training: 50 epochs on synthetic data

**Recommender (XGBoost)**

- Input: Forecast + battery state + time features
- Output: Grid action (STORE/RELEASE/REDISTRIBUTE/STABLE)
- 300 trees, max depth 6
- Multi-class classification

**Scaler (MinMaxScaler)**

- Normalizes features to [0, 1] range
- Saved as `backend/ml/models/scaler.pkl`

### 2. Backend Services

**weather_service.py**

- `fetch_current_weather(lat, lon)` → Real-time weather from Open-Meteo
- `fetch_hourly_forecast(lat, lon, hours)` → 72-hour forecast
- `fetch_nasa_solar(lat, lon)` → Solar irradiance from NASA POWER API

**grid_balancer.py**

- `run_balancer()` → Core logic:
  - Computes supply/demand/surplus
  - Updates battery charge/discharge
  - Determines grid status (HEALTHY/WARNING/CRITICAL)
  - Recommends action (STORE/RELEASE/REDISTRIBUTE/STABLE)

**alert_service.py**

- `generate_alerts_from_state()` → Rule-based alerts
  - CRITICAL: Battery < 10% AND deficit
  - CRITICAL: Demand > 90% capacity
  - WARNING: Battery < 25% OR deficit > 5 MW
  - WARNING: Frequency deviation > 0.5 Hz

**demand_forecaster.py**

- `predict_demand()` → Uses ML models or fallback formula
- `predict_solar()` → Based on solar irradiance
- `predict_wind()` → Physics-based from wind speed

### 3. Backend Routes

**Grid Endpoints** (`routes/grid.py`)

- `POST /grid/state` → Submit readings → get decision
- `GET /grid/state/latest` → Latest state
- `GET /grid/history` → Last 100 states
- `GET /grid/alerts` → Active alerts

**Forecast Endpoints** (`routes/forecast.py`)

- `POST /forecast/` → 24-72h predictions
- `GET /forecast/quick` → Quick 24h forecast

**Dashboard** (`routes/dashboard.py`)

- `GET /dashboard/` → Full snapshot
- `GET /dashboard/summary` → Lightweight metrics

**WebSocket** (`routes/websocket_route.py`)

- `WS /ws/grid/{city}` → Real-time updates every 30s

### 4. Database

**GridStateDB**

- Stores historical grid snapshots
- Schema: timestamp, city, demand, supply, battery, action, status

**AlertDB**

- Stores alert history
- Schema: timestamp, city, severity, title, message

---

## Data Flows

### Real-Time Grid Balancing (60-second cycle)

```
Scheduler (/main.py::auto_balance_task)
    ↓
Fetch Weather (Open-Meteo API)
    ↓
Predict Demand/Solar/Wind
    ↓
Run Balancer (compute surplus, battery, action)
    ↓
Generate Alerts
    ↓
Save to Database
    ↓
Broadcast via WebSocket
```

### Frontend Interaction (10-second refresh)

```
Dashboard Component
    ↓
fetch GET /dashboard/
    ↓
Backend runs full pipeline:
    - Fetch live weather
    - Predict supply/demand
    - Run balancer
    - Generate alerts
    ↓
Return GridState object
    ↓
Frontend renders with GSAP animations
```

### Mobile App Interaction

```
Overview Tab
    ↓
fetch GET /grid-status (lightweight)
    ↓
Display battery %, grid state, supply/demand
    ↓
Pull-to-refresh every 30s

Forecast Tab
    ↓
fetch GET /forecast
    ↓
Display 24h bar chart (supply vs demand)

Actions Tab
    ↓
User inputs surplus, battery, stress
    ↓
POST /predict
    ↓
Returns: action, confidence, urgency
```

---

## API Contracts

### Backend → Weather APIs

**Open-Meteo** (Free, no API key)

```
GET https://api.open-meteo.com/v1/forecast
?latitude=19.07&longitude=72.87
&current=temperature_2m,cloudcover,windspeed_10m
&hourly=shortwave_radiation
```

**NASA POWER** (Free, no API key)

```
GET https://power.larc.nasa.gov/api/temporal/hourly/point
?latitude=19.07&longitude=72.87
&start=20260327&end=20260327
&parameters=ALLSKY_SFC_SW_DWN
```

### Frontend → Backend

```json
{
  "GET /dashboard/": {
    "response": {
      "timestamp": "2026-03-27T15:30:00Z",
      "city": "Mumbai",
      "current_demand_mw": 3200,
      "total_supply_mw": 2800,
      "solar_generation_mw": 800,
      "wind_generation_mw": 300,
      "battery_level_mwh": 250,
      "battery_percentage": 50,
      "grid_status": "WARNING",
      "recommended_action": "RELEASE",
      "forecast_24h": [...],
      "alerts": [...]
    }
  }
}
```

### Mobile ← Backend

```json
{
  "POST /predict": {
    "request": {
      "solar_output_kwh": [100, 150, 200, ...],
      "wind_output_kwh": [50, 55, 60, ...],
      "demand_kwh": [200, 250, 300, ...],
      "battery_level_pct": 65,
      "forecast_horizon_hours": 6
    },
    "response": {
      "recommended_action": "STORE",
      "confidence": 0.89,
      "urgency_score": 0.15,
      "surplus_kwh": 25.5,
      "predicted_supply": [250, 280, 310, ...],
      "predicted_demand": [225, 260, 290, ...]
    }
  }
}
```

---

## Configuration

### Backend Config (`backend/config.py`)

```python
# Grid thresholds
MAX_GRID_CAPACITY_MW = 5000.0
BATTERY_CAPACITY_MWH = 500.0
CRITICAL_DEMAND_THRESHOLD = 0.90   # 90% → critical
WARNING_DEMAND_THRESHOLD = 0.75    # 75% → warning

# Default city
DEFAULT_LATITUDE = 19.07
DEFAULT_LONGITUDE = 72.87
DEFAULT_CITY = "Mumbai"

# Scheduler
BALANCE_INTERVAL_SECONDS = 60

# Database
DATABASE_URL = "sqlite+aiosqlite:///./energy_grid.db"
```

### Environment Variables (`.env`)

```bash
# Optional: Override defaults
DATABASE_URL=sqlite+aiosqlite:///./energy_grid.db
LOG_LEVEL=INFO
DEBUG=True
```

---

## Testing

### 1. Health Checks

```bash
# Backend
curl http://localhost:8000/health

# ML API (if running)
curl http://localhost:8001/health
```

### 2. Submit Test Reading

```bash
curl -X POST http://localhost:8000/grid/state \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Mumbai",
    "current_demand_mw": 3200,
    "solar_generation_mw": 800,
    "wind_generation_mw": 300,
    "conventional_generation_mw": 0,
    "battery_level_mwh": 250
  }'
```

### 3. Get Dashboard

```bash
curl http://localhost:8000/dashboard/
```

### 4. Get Forecast

```bash
curl http://localhost:8000/forecast/quick
```

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'forecaster'"

→ Models not trained yet. Run `python3 ml/src/forecaster.py` first

### "FileNotFoundError: scaler.pkl"

→ Preprocess not run. Execute `python3 ml/src/preprocess.py`

### "Cannot find module 'open-meteo' / 'openmeteo-requests'"

→ Missing dependency. Run `pip install -r requirements.txt` again

### WebSocket not connecting

→ Check CORS headers in `main.py` - ensure frontend URL is in `allow_origins`

### Database locked

→ Delete `energy_grid.db` and restart backend

### Port 8000 already in use

→ `lsof -i :8000` and kill process, or use `--port 8001`

---

## Production Deployment

### Docker Compose

```bash
docker-compose up -d
```

Includes:

- Backend (port 8000)
- ML API (port 8001)
- PostgreSQL (replaces SQLite)
- Redis (caching)

### Environment Variables for Production

```env
DATABASE_URL=postgresql://user:pass@postgres:5432/gbalancer
REDIS_URL=redis://redis:6379
LOG_LEVEL=WARNING
DEBUG=False
ALLOWED_HOSTS=myapp.com,www.myapp.com
```

---

## Next Steps

1. **Train Models** → Follow `ML_TRAINING_GUIDE.md`
2. **Start Backend** → `python3 -m uvicorn main:app`
3. **Test API** → Swagger docs at `/docs`
4. **Start Web** → `npm run dev` in client/
5. **Start Mobile** → `npm run android/ios` in mobile/gbalancer/
6. **Monitor Logs** → Check console for auto_balance_task output

---

## Support

For detailed ML model training: See `ML_TRAINING_GUIDE.md`  
For API documentation: Visit `http://localhost:8000/docs` (Swagger)  
For architecture details: See root `README.md`
