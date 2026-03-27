# Mobile-Backend Integration Guide

## Overview

This document describes how the mobile app (`mobile/gbalancer`) integrates with the FastAPI backend (`backend/`).

---

## Architecture

### Frontend (React Native / Expo)

- **Location**: `mobile/gbalancer/`
- **API Layer**: `features/grid/api.ts` — HTTP client wrapper
- **Hooks**: `features/grid/hooks.ts` — React hooks for data fetching
- **Screens**: `app/(tabs)/index.tsx` — Grid Operations Center dashboard

### Backend (FastAPI)

- **Location**: `backend/`
- **Mobile Routes**: `routes/mobile_compat.py` — lightweight endpoints for mobile
- **Core Services**: `services/` — weather, grid balancing, alerts
- **ML Models**: `models/demand_forecaster.py` — forecasting & recommendations
- **Database**: `database/db.py` — persistence layer (SQLite + async SQLAlchemy)
- **Scheduler**: `main.py` — auto-balance job runs every 60s

---

## API Endpoints

### Endpoints Used by Mobile App

#### 1. **GET /simulate**

Returns a 24-hour simulated supply/demand/battery profile based on current weather.

**Request**: `GET http://localhost:8000/simulate`

**Response**:

```json
{
  "total_supply_kwh": [5.2, 5.8, 6.1, ...],  // 24 values
  "demand_kwh": [18.0, 17.5, 16.8, ...],      // 24 values
  "battery_pct": [50.0, 51.2, 52.1, ...]      // 24 values
}
```

**Used by**: `getGridStatus()` in `api.ts` — extracts current supply/demand from last element.

---

#### 2. **POST /grid-status**

Returns grid health status and recommended action given current conditions.

**Request**:

```json
POST http://localhost:8000/grid-status
{
  "battery_level_pct": 50.0,
  "current_supply_kwh": 28.5,
  "current_demand_kwh": 21.2
}
```

**Response**:

```json
{
  "status": "HEALTHY", // or "WARNING" / "CRITICAL"
  "recommended_action": "STABLE" // or "CHARGE_BATTERY", "STORE", "LOAD_SHED"
}
```

**Used by**: `getGridStatus()` in `api.ts` — displays battery level, grid state, and recommendations.

---

#### 3. **GET /forecast**

Returns 12–24 hour demand & supply forecast.

**Request**: `GET http://localhost:8000/forecast?hours=12`

**Response**:

```json
{
  "horizonHours": 12,
  "points": [
    {
      "timestamp": "2026-03-28T14:00:00Z",
      "supply": 22.5,
      "demand": 18.3
    },
    ...
  ]
}
```

**Used by**: `useForecastData()` hook in `index.tsx` — displays forecast charts.

---

#### 4. **POST /predict**

Returns recommended actions for a sequence of supply/demand scenarios.

**Request**:

```json
POST http://localhost:8000/predict
{
  "solar_output_kwh": [15.0, 16.2, ...],
  "wind_output_kwh": [8.5, 8.2, ...],
  "demand_kwh": [20.0, 19.5, ...],
  "battery_level_pct": 50.0,
  "forecast_horizon_hours": 6
}
```

**Response**:

```json
{
  "recommended": ["STABLE", "STORE", "STABLE", ...],
  "source": "recommender"  // or "rule_based" if model unavailable
}
```

**Used by**: `getPrediction()` in `api.ts` — shows ML-recommended actions.

---

## Network Configuration

### For Android Emulator

The mobile app detects Android and uses `http://10.0.2.2:8000` — this special IP routes to the host machine's localhost.

```typescript
// In api.ts
const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000" // Android emulator → host localhost
    : "http://localhost:8000"; // iOS simulator
```

### For Physical Device

Set environment variable before running Expo:

```bash
export EXPO_PUBLIC_ML_API_URL="http://192.168.x.x:8000"  # your machine's IP
npm start  # or npx expo start
```

### Starting Backend

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  HomeScreen (index.tsx)                              │ │
│  │  - useGridStatusData() → shows Battery, Status       │ │
│  │  - useForecastData()   → shows 12-hour forecast      │ │
│  │  - usePredictionData() → shows recommended actions   │ │
│  └───────────────────────────────────────────────────────┘ │
│           ↓ calls hooks from features/grid/hooks.ts        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  API Layer (features/grid/api.ts)                    │ │
│  │  - getForecast() → GET /forecast                     │ │
│  │  - getGridStatus() → GET /simulate + POST /grid-status
│  │  - getPrediction() → POST /predict                   │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓ HTTP
                    (10.0.2.2:8000)
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (main.py)                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Mobile Routes (routes/mobile_compat.py)            │ │
│  │  - GET /simulate                                     │ │
│  │  - POST /grid-status                                 │ │
│  │  - POST /predict                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│           ↓ calls services                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Core Services                                       │ │
│  │  - weather_service.py → fetches Open-Meteo API      │ │
│  │  - grid_balancer.py → calculates status + actions   │ │
│  │  - alert_service.py → generates alerts              │ │
│  └───────────────────────────────────────────────────────┘ │
│           ↓ loads models / predicts                        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ML & Database                                       │ │
│  │  - demand_forecaster.py → LSTM/XGBoost predictions  │ │
│  │  - db.py → async SQLite persistence                 │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Integration Testing

### 1. Start Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**Expected output**:

```
🚀 Starting Intelligent Energy Grid Balancer v1.0
⏰ Scheduler started — balancing every 60s
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. Test Endpoints with curl

```bash
# Test /simulate
curl http://localhost:8000/simulate

# Test /grid-status
curl -X POST http://localhost:8000/grid-status \
  -H "Content-Type: application/json" \
  -d '{"battery_level_pct": 50, "current_supply_kwh": 28.5, "current_demand_kwh": 21.2}'

# Test /forecast
curl http://localhost:8000/forecast?hours=12

# Test /predict
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "solar_output_kwh": [15.0, 16.2, 17.1, 16.5, 15.2, 13.0],
    "wind_output_kwh": [8.5, 8.2, 8.0, 7.8, 7.5, 7.2],
    "demand_kwh": [20.0, 19.5, 19.0, 21.0, 22.5, 23.0],
    "battery_level_pct": 50.0,
    "forecast_horizon_hours": 6
  }'
```

### 3. Start Mobile App

```bash
cd mobile/gbalancer
npm install  # if needed
npx expo start
```

In Expo DevTools:

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code for physical device

### 4. Navigate to Home Screen

- The app should load the Grid Operations Center dashboard
- "Refresh Data" button fetches latest status and forecast
- Battery Level, Grid State, Current Supply, Current Demand, and Surplus should display
- Forecast chart should show the next 12 hours

### 5. Verify Data Flow

- Check backend logs for incoming requests:
  ```
  [14:23:45] ⚡ Auto-balanced | Demand: 22 MW | Solar: 15 MW | Status: OK
  ```
- Check mobile app — metrics should update with each refresh
- Check forecast chart — should show realistic 24-hour pattern

---

## Common Issues & Fixes

### Issue: Mobile app shows "Could not fetch one or more endpoints"

**Cause**: Backend is not reachable from emulator/device.

**Fix**:

1. Ensure backend is running: `python -m uvicorn backend.main:app --reload --port 8000`
2. Check IP address:
   - Android emulator: Must use `10.0.2.2` (not `localhost` or `127.0.0.1`)
   - iOS simulator: Can use `localhost` or `127.0.0.1`
   - Physical device: Use your machine's LAN IP (e.g., `192.168.1.100`)
3. Set environment variable:
   ```bash
   export EXPO_PUBLIC_ML_API_URL="http://10.0.2.2:8000"
   npx expo start
   ```

### Issue: Backend returns 422 Unprocessable Entity

**Cause**: Request body doesn't match expected schema.

**Fix**: Check the request format matches the schema in `routes/mobile_compat.py`:

- `grid-status` requires `battery_level_pct`, `current_supply_kwh`, `current_demand_kwh`
- `predict` requires `solar_output_kwh`, `demand_kwh`, `battery_level_pct`

### Issue: Forecast returns empty array

**Cause**: Weather service failed or model is not trained.

**Fix**:

1. Check backend logs for weather API errors
2. Ensure backend has internet (Open-Meteo requires HTTPS)
3. Fallback in mobile app will construct forecast from `/simulate` data

### Issue: Mobile app battery level doesn't update

**Cause**: `/simulate` endpoint is not being called or state is stale.

**Fix**:

1. Tap "Refresh Data" button in mobile app
2. Check backend logs: should see `GET /simulate` request
3. Verify battery calculation logic in `mobile_compat.py` line ~65–75

---

## Production Deployment

### For Docker

```bash
# Backend (Docker)
cd backend
docker build -t gbalancer-backend .
docker run -p 8000:8000 gbalancer-backend

# Mobile (compile to APK/IPA or use Expo Cloud)
cd mobile/gbalancer
npx eas build --platform android  # requires Expo account
```

### For Cloud (AWS/GCP/Heroku)

1. Push backend to cloud platform
2. Set environment variables (database URL, API keys)
3. Update mobile app to use cloud backend URL:
   ```bash
   export EXPO_PUBLIC_ML_API_URL="https://your-api.cloud-provider.com"
   ```

---

## API Contract Summary

| Endpoint       | Method | Mobile App Call   | Purpose                           |
| -------------- | ------ | ----------------- | --------------------------------- |
| `/simulate`    | GET    | `getGridStatus()` | Get current supply/demand/battery |
| `/grid-status` | POST   | `getGridStatus()` | Determine grid health + action    |
| `/forecast`    | GET    | `getForecast()`   | 12–24 hour supply/demand forecast |
| `/predict`     | POST   | `getPrediction()` | Get ML-recommended actions        |

---

## Files Modified for Integration

### Backend

- ✅ `routes/mobile_compat.py` — NEW: lightweight mobile endpoints
- ✅ `main.py` — updated to include mobile_compat router
- ✅ `routes/forecast.py` — added GET endpoint for mobile app
- ✅ `.gitignore` — added venv, model artifacts, data exclusions

### Mobile

- ✅ `features/grid/api.ts` — updated base URL (10.0.2.2 for Android emulator)
- ✅ `features/grid/api.ts` — improved error handling and fallback logic
- ✅ `features/grid/hooks.ts` — existing data fetching hooks (no changes needed)
- ✅ `app/(tabs)/index.tsx` — existing dashboard (no changes needed)

---

## Next Steps

1. **Run Data Collection** (optional, for real training data):

   ```bash
   python backend/ml/src/real_data_collector.py
   ```

2. **Train ML Models** (optional, for better predictions):

   ```bash
   python backend/ml/src/preprocess.py
   python backend/ml/src/forecaster.py
   python backend/ml/src/recommender.py
   ```

3. **Start Backend with Models**:

   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```

4. **Run Mobile App**:

   ```bash
   cd mobile/gbalancer
   npx expo start
   # Press 'a' for Android emulator
   ```

5. **Monitor Dashboard**:
   - Battery Level, Grid State, Supply, Demand, Surplus update in real-time
   - Forecast chart shows next 12 hours
   - Tap "Refresh Data" to fetch latest

---

## Support

For issues:

1. Check backend logs: `python -m uvicorn backend.main:app --reload --port 8000`
2. Check mobile logs: Expo DevTools console
3. Test endpoints manually with `curl` or Postman
4. Review `IMPLEMENTATION_GUIDE.md` and `QUICK_START.md` for full setup
