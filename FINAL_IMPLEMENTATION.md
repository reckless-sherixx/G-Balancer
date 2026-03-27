# G-Balancer: Final Implementation Guide

**Version**: 1.0  
**Last Updated**: March 28, 2026  
**Status**: ✅ Ready for Integration Testing

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Installation & Setup](#installation--setup)
5. [Running the System](#running-the-system)
6. [API Reference](#api-reference)
7. [Mobile App Integration](#mobile-app-integration)
8. [ML Model Training](#ml-model-training)
9. [Database Schema](#database-schema)
10. [Troubleshooting](#troubleshooting)
11. [Deployment](#deployment)

---

## 🎯 System Overview

**G-Balancer** is an intelligent energy grid management system that:

- **Forecasts demand** using LSTM neural networks
- **Predicts renewable generation** (solar, wind) using XGBoost
- **Recommends grid actions** (charge, discharge, load-shed, stable)
- **Persists grid state** in async SQLite database
- **Provides real-time dashboard** via React Native mobile app and web UI

### Key Features

✅ Real-time grid status monitoring  
✅ 24-hour supply/demand forecasting  
✅ ML-based action recommendations  
✅ Weather integration (Open-Meteo free API)  
✅ Mobile app with live charts  
✅ Async database for high throughput  
✅ Automatic balancing job (every 60s)  
✅ Alert system for grid anomalies

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/G-Balancer.git
cd G-Balancer
```

### 2. Backend Setup (5 minutes)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Start server
python -m uvicorn main:app --reload --port 8000
```

**Expected Output**:

```
🚀 Starting Intelligent Energy Grid Balancer v1.0
⏰ Scheduler started — balancing every 60s
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

Visit http://localhost:8000/docs for interactive API docs.

### 3. Mobile App Setup (5 minutes)

```bash
cd mobile/gbalancer

# Install dependencies
npm install

# Start Expo
npx expo start
```

In the Expo prompt:

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code for physical device

The Grid Operations Center dashboard should load, showing:

- Battery Level
- Grid State (HEALTHY/WARNING/CRITICAL)
- Current Supply & Demand
- 12-hour forecast chart

---

## 🏗️ Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────────┐
│                         Mobile Frontend                          │
│              React Native / Expo (Typescript)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Grid Operations Center (Home Screen)                   │   │
│  │  - Real-time metrics (battery, supply, demand)          │   │
│  │  - 24-hour forecast chart                               │   │
│  │  - Recommended actions                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                  ↓ HTTP via Expo                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                             │
│              Python / AsyncIO / SQLAlchemy                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Mobile Routes (/simulate, /grid-status, /predict)     │   │
│  │  Core Routes (/forecast, /grid, /dashboard, /ws)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↓ uses                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Core Services                                          │   │
│  │  - weather_service.py → Open-Meteo + NASA POWER        │   │
│  │  - grid_balancer.py → action + status logic             │   │
│  │  - alert_service.py → anomaly detection               │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↓ loads                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ML Models                                              │   │
│  │  - Demand Forecaster (LSTM, 72-hour → 6-hour)         │   │
│  │  - Recommender (XGBoost, action classifier)            │   │
│  │  - Fallback: physics-based + rule-based               │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↓ persists to                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Async SQLite Database                                  │   │
│  │  - GridStateDB (hourly snapshots)                       │   │
│  │  - AlertDB (anomalies & recommendations)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     External Data Sources                        │
│  - Open-Meteo (hourly weather) — Free API, no key needed        │
│  - NASA POWER (satellite solar irradiance) — Free, daily        │
│  - OPSD (India grid demand) — Historical for training           │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Mobile App** sends HTTP request to backend
2. **Backend Routes** validate input and call services
3. **Services** fetch weather, compute predictions, generate alerts
4. **ML Models** (or fallback logic) predict supply/demand/action
5. **Database** persists grid state and alerts
6. **Response** is normalized and sent to mobile app
7. **Mobile Dashboard** displays metrics, forecast, recommendations

---

## 💻 Installation & Setup

### Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 18+** (for mobile)
- **Git**
- **Virtual environment** (venv or conda)

### Backend Installation

1. **Clone & Navigate**

   ```bash
   cd backend
   ```

2. **Create Virtual Environment**

   ```bash
   python -m venv venv
   source venv/bin/activate       # Linux/Mac
   # OR
   venv\Scripts\activate.bat        # Windows
   ```

3. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

   **Key Packages**:
   - `fastapi` — web framework
   - `uvicorn` — ASGI server
   - `sqlalchemy` — async ORM
   - `httpx` — async HTTP client
   - `pandas`, `numpy` — data processing
   - `torch`, `scikit-learn` — ML
   - `apscheduler` — job scheduling

4. **Configure Environment** (optional)
   Create `.env` file in `backend/`:
   ```env
   APP_NAME=Intelligent Energy Grid Balancer
   DEFAULT_CITY=New Delhi
   DEFAULT_LATITUDE=28.6139
   DEFAULT_LONGITUDE=77.2090
   BALANCE_INTERVAL_SECONDS=60
   BATTERY_CAPACITY_MWH=500
   MAX_GRID_CAPACITY_MW=5000
   ```

### Mobile Installation

1. **Navigate to Mobile Directory**

   ```bash
   cd mobile/gbalancer
   ```

2. **Install Node Dependencies**

   ```bash
   npm install
   ```

3. **Configure Backend URL** (optional)
   Create `.env.local`:
   ```env
   EXPO_PUBLIC_ML_API_URL=http://10.0.2.2:8000  # Android emulator
   # OR for iOS: http://localhost:8000
   # OR for physical device: http://192.168.x.x:8000
   ```

---

## ⚙️ Running the System

### Option 1: Local Development

#### Terminal 1: Backend

```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

#### Terminal 2: Mobile (Android Emulator)

```bash
cd mobile/gbalancer
npx expo start
# Press 'a' for Android emulator
```

Or for iOS Simulator:

```bash
npx expo start
# Press 'i' for iOS simulator
```

### Option 2: Docker

#### Backend (Docker)

```bash
cd backend
docker build -t gbalancer-backend .
docker run -p 8000:8000 gbalancer-backend
```

#### Mobile (Expo Cloud)

```bash
cd mobile/gbalancer
npx eas build --platform android
```

### Option 3: Production (Cloud)

See [Deployment](#deployment) section.

---

## 🔌 API Reference

### Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://your-api.cloud-provider.com`

### Endpoints (Mobile-Friendly)

#### 1. GET /simulate

Returns 24-hour simulated supply/demand/battery profile.

**Request**:

```
GET /simulate
```

**Response** (200 OK):

```json
{
  "total_supply_kwh": [5.2, 5.8, 6.1, ..., 4.9],
  "demand_kwh": [18.0, 17.5, 16.8, ..., 19.2],
  "battery_pct": [50.0, 51.2, 52.1, ..., 49.8]
}
```

---

#### 2. POST /grid-status

Returns current grid health status and recommended action.

**Request**:

```
POST /grid-status
Content-Type: application/json

{
  "battery_level_pct": 50.0,
  "current_supply_kwh": 28.5,
  "current_demand_kwh": 21.2
}
```

**Response** (200 OK):

```json
{
  "status": "HEALTHY",
  "recommended_action": "STABLE"
}
```

**Status Values**: `HEALTHY`, `WARNING`, `CRITICAL`  
**Action Values**: `STABLE`, `CHARGE_BATTERY`, `STORE`, `LOAD_SHED`

---

#### 3. GET /forecast

Returns supply/demand forecast for next N hours.

**Request**:

```
GET /forecast?hours=12&city=New%20Delhi&lat=28.6139&lon=77.2090
```

**Response** (200 OK):

```json
{
  "horizonHours": 12,
  "points": [
    {
      "timestamp": "2026-03-28T14:00:00Z",
      "supply": 22.5,
      "demand": 18.3
    },
    {
      "timestamp": "2026-03-28T15:00:00Z",
      "supply": 24.0,
      "demand": 17.9
    },
    ...
  ]
}
```

---

#### 4. POST /predict

Returns recommended actions for given supply/demand scenarios.

**Request**:

```
POST /predict
Content-Type: application/json

{
  "solar_output_kwh": [15.0, 16.2, 17.1, 16.5, 15.2, 13.0],
  "wind_output_kwh": [8.5, 8.2, 8.0, 7.8, 7.5, 7.2],
  "demand_kwh": [20.0, 19.5, 19.0, 21.0, 22.5, 23.0],
  "battery_level_pct": 50.0,
  "forecast_horizon_hours": 6
}
```

**Response** (200 OK):

```json
{
  "recommended": [
    "STABLE",
    "STORE",
    "STABLE",
    "CHARGE_BATTERY",
    "STABLE",
    "STABLE"
  ],
  "source": "recommender"
}
```

**Source Values**: `recommender` (ML model) or `rule_based` (fallback)

---

### Full API Documentation

Visit http://localhost:8000/docs for interactive Swagger UI.

---

## 📱 Mobile App Integration

### Home Screen (`app/(tabs)/index.tsx`)

The Grid Operations Center dashboard displays:

1. **Header Card**
   - App title and description
   - Current API endpoint
   - "Refresh Data" button

2. **Metrics Grid**
   - **Battery Level** (%)
   - **Grid State** (HEALTHY/WARNING/CRITICAL)
   - **Current Supply** (MW)
   - **Current Demand** (MW)
   - **Current Surplus** (kWh)

3. **Forecast Section**
   - 12-hour forecast chart
   - Average supply, demand, and delta
   - Visual representation of supply vs demand

4. **Data Flow Section**
   - Overview of the processing pipeline

### Data Fetching Hooks (`features/grid/hooks.ts`)

```typescript
// Hook for grid status (battery, supply, demand)
const { data: status, loading, error, refresh } = useGridStatusData();

// Hook for forecast data
const { data: forecast, loading, error, refresh } = useForecastData();

// Hook for predictions (with custom input)
const { data: prediction, predict } = usePredictionData(initialPayload);
```

### API Layer (`features/grid/api.ts`)

Functions for making HTTP requests:

- `getForecast()` → GET /forecast
- `getGridStatus()` → GET /simulate + POST /grid-status
- `getPrediction(input)` → POST /predict

Normalization functions ensure mobile app works even if backend changes response format.

---

## 🤖 ML Model Training

### Overview

G-Balancer uses two ML models:

1. **Demand Forecaster** (LSTM)
   - Predicts electricity demand for next 6 hours
   - Inputs: past 72 hours of demand, weather, time-of-day
   - Output: 6-hour forecast

2. **Recommender** (XGBoost)
   - Classifies recommended grid action
   - Inputs: solar, wind, demand, battery level
   - Output: action (STABLE, CHARGE_BATTERY, STORE, LOAD_SHED)

### Training Data

**Real Data Sources**:

- **Open-Meteo**: Hourly weather (free, no key)
- **NASA POWER**: Satellite solar irradiance (free, daily)
- **OPSD**: India grid demand (historical)
- **IEA**: Generation capacity reference

### Training Steps

#### Step 1: Collect Real Data

```bash
cd backend/ml
python src/real_data_collector.py
# Creates: backend/ml/data/real/india_grid_data_real.csv
```

#### Step 2: Preprocess Data

```bash
python src/preprocess.py
# Creates: backend/ml/data/processed/preprocessed_data.pkl
#          backend/ml/data/processed/scaler.pkl
```

#### Step 3: Train Demand Forecaster

```bash
python src/forecaster.py
# Creates: backend/ml/models/forecaster.pt
```

#### Step 4: Train Recommender

```bash
python src/recommender.py
# Creates: backend/ml/models/recommender.pkl
#          backend/ml/models/label_encoder.pkl
```

### Model Artifacts

After training, expect these files:

```
backend/ml/models/
  ├── forecaster.pt          # LSTM model (PyTorch)
  ├── recommender.pkl        # XGBoost classifier
  ├── label_encoder.pkl      # For decoding actions
  └── scaler.pkl             # For feature scaling
```

### Fallback Behavior

If models are not trained:

- **Demand Forecasting**: Uses formula: `base_demand + time_of_day_effect + weather_effect`
- **Recommender**: Uses rule-based logic: `if battery < 15% then LOAD_SHED, elif battery > 85% then STORE, else STABLE`

---

## 💾 Database Schema

### GridStateDB Table

Records grid state snapshots (created by scheduler every 60s).

| Column                     | Type         | Description                          |
| -------------------------- | ------------ | ------------------------------------ |
| id                         | Integer (PK) | Auto-incremented ID                  |
| timestamp                  | DateTime     | UTC timestamp                        |
| city                       | String       | Grid location                        |
| current_demand_mw          | Float        | Demand in MW                         |
| solar_generation_mw        | Float        | Solar output in MW                   |
| wind_generation_mw         | Float        | Wind output in MW                    |
| conventional_generation_mw | Float        | Conventional (coal, gas) in MW       |
| total_supply_mw            | Float        | Total supply in MW                   |
| net_balance_mw             | Float        | Supply - Demand in MW                |
| battery_level_mwh          | Float        | Battery level in MWh                 |
| battery_percentage         | Float        | Battery % (0-100)                    |
| grid_status                | String       | Status (OK, WARNING, CRITICAL)       |
| recommended_action         | String       | Action (STABLE, CHARGE, STORE, SHED) |
| action_description         | String       | Human-readable action                |

### AlertDB Table

Records anomalies and alerts.

| Column             | Type         | Description                      |
| ------------------ | ------------ | -------------------------------- |
| id                 | Integer (PK) | Auto-incremented ID              |
| timestamp          | DateTime     | UTC timestamp                    |
| city               | String       | Grid location                    |
| severity           | String       | Severity (LOW, MEDIUM, CRITICAL) |
| title              | String       | Alert title                      |
| message            | String       | Alert message                    |
| recommended_action | String       | Suggested action                 |

### Schema Creation

Schema is automatically created on backend startup:

```python
# In backend/main.py
await init_db()  # Called in app lifespan
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

```bash
# Solution: Install dependencies
cd backend
pip install -r requirements.txt
```

**Error**: `Port 8000 already in use`

```bash
# Solution: Use different port
python -m uvicorn main:app --port 8001
```

### Mobile App Can't Connect to Backend

**Symptom**: "Could not fetch one or more endpoints" error

**Android Emulator**:

- Ensure `10.0.2.2:8000` is used (not `localhost`)
- Check backend is running: `curl http://localhost:8000/health`
- Verify firewall allows port 8000

**iOS Simulator**:

- Use `localhost:8000` or `127.0.0.1:8000`
- Ensure backend is on same machine or network

**Physical Device**:

- Set environment variable:
  ```bash
  export EXPO_PUBLIC_ML_API_URL="http://192.168.1.100:8000"
  npx expo start
  ```
- Replace `192.168.1.100` with your machine's IP address

### Weather API Returns Empty

**Cause**: Open-Meteo API unreachable

**Fix**:

1. Check internet connection
2. Test API manually:
   ```bash
   curl "https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&hourly=temperature_2m"
   ```

### Database Locked / SQLite Error

**Cause**: Multiple processes writing to database simultaneously

**Fix**:

1. Restart backend
2. Delete `grid.db` and recreate:
   ```bash
   rm backend/grid.db
   # Backend will recreate on startup
   ```

### Models Not Loading / Predictions Fail

**Cause**: Model files not found or corrupted

**Fix**:

1. Check files exist:
   ```bash
   ls backend/ml/models/
   ```
2. Retrain models:
   ```bash
   cd backend/ml
   python src/preprocess.py
   python src/forecaster.py
   python src/recommender.py
   ```

---

## 🚢 Deployment

### Docker Deployment

#### Build Image

```bash
cd backend
docker build -t gbalancer-backend:latest .
```

#### Run Container

```bash
docker run \
  -p 8000:8000 \
  -e APP_NAME="G-Balancer" \
  -e DEFAULT_CITY="New Delhi" \
  gbalancer-backend:latest
```

### Cloud Deployment (AWS, GCP, Heroku)

#### 1. Prepare Backend

```bash
# Ensure requirements.txt is up to date
pip freeze > backend/requirements.txt
```

#### 2. Push to Cloud

**Heroku Example**:

```bash
cd backend
heroku login
heroku create gbalancer-backend
heroku config:set APP_NAME="G-Balancer"
git push heroku main
```

**AWS Example**:

```bash
cd backend
aws elasticbeanstalk create-environment --environment-name gbalancer-prod
```

#### 3. Update Mobile App

```bash
export EXPO_PUBLIC_ML_API_URL="https://gbalancer-backend.herokuapp.com"
npx expo start
```

#### 4. Deploy Mobile

```bash
npx eas build --platform android --release-channel production
npx eas submit --platform android --latest
```

---

## ✅ Verification Checklist

- [ ] Backend starts without errors
- [ ] `/health` endpoint returns 200 OK
- [ ] `/simulate` returns 24-hour profile
- [ ] `/grid-status` accepts POST with battery level
- [ ] `/forecast` returns supply/demand points
- [ ] `/predict` accepts solar/wind/demand arrays
- [ ] Mobile app connects without "could not fetch" errors
- [ ] Battery level, supply, demand display on home screen
- [ ] Forecast chart renders correctly
- [ ] "Refresh Data" button updates metrics
- [ ] Database file created (`backend/grid.db`)
- [ ] Scheduler job runs every 60s (check logs)
- [ ] No CORS errors in browser/mobile console

---

## 📚 Additional Resources

- **API Docs**: http://localhost:8000/docs
- **Mobile Integration Guide**: `MOBILE_INTEGRATION_GUIDE.md`
- **ML Training Guide**: `documentation/ML_TRAINING_GUIDE.md`
- **Quick Start**: `documentation/QUICK_START.md`
- **Implementation Status**: `IMPLEMENTATION_STATUS.md`

---

## 📞 Support & Issues

For issues or questions:

1. Check the **Troubleshooting** section above
2. Review logs in backend terminal
3. Test endpoints with `curl` or Postman
4. Open an issue on GitHub

---

## 📄 License

This project is licensed under the MIT License. See `LICENSE` for details.

---

**Last Updated**: March 28, 2026  
**Maintained by**: G-Balancer Team  
**Version**: 1.0 — Final Release
