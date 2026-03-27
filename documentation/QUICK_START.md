# G-Balancer: Complete Setup & Implementation Roadmap

**Date Created:** March 27, 2026  
**Project:** Intelligent Energy Grid Balancer  
**Status:** Ready for Implementation

---

## 📋 Executive Summary

G-Balancer is a **fully architected** intelligent energy grid balancing system. All structural code exists. You now need to:

1. **Train the ML models** (automated scripts provided)
2. **Fill in 15-18 business logic functions** (30-45 min each)
3. **Wire frontend components to real APIs** (15-20 min each)

**Estimated total time: 8-12 hours of implementation work**

---

## 🎯 Three Levels of Implementation

### Level 1: Bare Minimum (4 hours)

Get a **working end-to-end grid balancer** running:

- Train ML models ✅ (scripts ready)
- Complete 5 core backend services ✅ (functions stubbed)
- Test with Swagger UI ✅ (auto-generated)

### Level 2: Full Backend (8 hours)

Complete **all backend services and routes**:

- Weather integration ✅
- Grid balancing logic ✅
- Alerts system ✅
- Database persistence ✅
- All REST endpoints ✅
- WebSocket real-time ✅

### Level 3: Complete System (12 hours)

Full **web + mobile client integration**:

- Next.js dashboard ✅ (animations ready, wire to APIs)
- React Native app ✅ (UI ready, wire to APIs)
- End-to-end testing ✅

---

## 📁 What Exists vs. What Needs Implementation

### ✅ Fully Complete (Ready to Use)

```
backend/
├── ml/src/real_data_collector.py ← Collect real data from free APIs
├── ml/src/simulator.py          ← Synthetic data (optional fallback)
├── ml/src/preprocess.py         ← Feature engineering (works with real data)
├── ml/src/forecaster.py         ← LSTM training
├── ml/src/recommender.py        ← XGBoost training
├── config.py                    ← All settings configured
├── main.py                      ← FastAPI app ready
├── models/demand_forecaster.py  ← Forecast functions complete
└── schemas/grid_schema.py       ← All Pydantic models defined

client/
├── Next.js setup complete
├── All dashboard components exist
└── GSAP animations ready

mobile/gbalancer/
├── Expo + React Native setup
├── All 3 tabs scaffolded
└── UI components ready
```

### 🔧 Needs Business Logic (15-25% complete)

```
backend/
├── services/weather_service.py         ← 40% (add real API calls)
├── services/grid_balancer.py           ← 0% (pure logic needed)
├── services/alert_service.py           ← 0% (threshold rules)
├── database/db.py                      ← 50% (async methods)
├── routes/grid.py                      ← 20% (endpoints exist)
├── routes/forecast.py                  ← 20%
├── routes/dashboard.py                 ← 20%
└── routes/websocket_route.py           ← 30% (connection manager exists)

client/
├── components/dashboard/*.tsx          ← 70% (wire to APIs)
└── hooks/useGridData.ts               ← Not created yet

mobile/gbalancer/
├── features/grid/api.ts                ← 40% (hook signatures only)
└── app/(tabs)/*.tsx                    ← 70% (wire to APIs)
```

---

## 🚀 Quick Start: 4-Hour Path to Working System

### Hour 1: ML Model Training with Real Data

```bash
cd backend

# Collect 90 days of real grid data from free APIs (5-10 min)
python3 ml/src/real_data_collector.py
# Output: 2160 real data rows in backend/ml/data/real/india_grid_data_real.csv

# Preprocess & fit scaler (2 min)
python3 ml/src/preprocess.py
# Output: backend/ml/models/scaler.pkl

# Train LSTM forecaster (2-5 min on CPU, 30s on GPU)
python3 ml/src/forecaster.py
# Output: backend/ml/models/forecaster.pt

# Train XGBoost recommender (1-2 min)
python3 ml/src/recommender.py
# Output: backend/ml/models/recommender.pkl + label_encoder.pkl
```

**Total: ~15 minutes with real data from free APIs (no API keys needed)**

### Hour 2: Core Backend Logic

Complete these 5 critical functions (15 min each):

1. **`weather_service.py::fetch_current_weather()`** (15 min)

   ```python
   # Call Open-Meteo API
   # Return WeatherData(temp, cloud_cover, wind_speed, solar_irradiance)
   ```

2. **`grid_balancer.py::run_balancer()`** (20 min)

   ```python
   # Compute: supply, demand, surplus, battery delta
   # Return: GridState with status + action
   ```

3. **`alert_service.py::generate_alerts_from_state()`** (15 min)

   ```python
   # Check thresholds
   # Return: list of Alert objects
   ```

4. **`routes/grid.py::POST /grid/state`** (15 min)

   ```python
   # Validate input
   # Call run_balancer()
   # Save to DB
   # Return GridState
   ```

5. **`routes/dashboard.py::GET /dashboard/`** (15 min)
   ```python
   # Fetch weather
   # Run predictions
   # Run balancer
   # Return everything
   ```

**Total: ~80 minutes**

### Hour 3: Test Backend

```bash
# Start server
python3 -m uvicorn main:app --reload --port 8000

# Open browser: http://localhost:8000/docs
# Test all endpoints in Swagger UI

# Or test with curl
curl -X POST http://localhost:8000/grid/state \
  -H "Content-Type: application/json" \
  -d '{"city":"Mumbai","current_demand_mw":3200,...}'
```

**Time: ~15 minutes testing**

### Hour 4: Wire Dashboard to Real Data

Replace mock data in 3 key components:

1. **`CoreMetrics.tsx`**: Wire to `/dashboard/summary`
2. **`AIDecision.tsx`**: Wire `recommended_action` from API
3. **`AlertsFeed.tsx`**: Wire to `/grid/alerts`

```typescript
// Example pattern
const { data } = useSWR("/api/dashboard/summary", fetcher, {
  refreshInterval: 10000,
});
```

**Time: ~20 minutes**

**Total Time: ~4 hours for minimal working system ✅**

---

## 📊 Implementation Timeline by Component

### Backend Services (3-4 hours)

| Component                   | Time   | Difficulty | Dependencies                      |
| --------------------------- | ------ | ---------- | --------------------------------- |
| `weather_service.py`        | 20 min | Easy       | httpx installed ✅                |
| `grid_balancer.py`          | 30 min | Medium     | config.py ✅, GridState schema ✅ |
| `alert_service.py`          | 20 min | Easy       | config.py ✅, GridState ✅        |
| `database/db.py`            | 30 min | Medium     | SQLAlchemy ✅, aiosqlite ✅       |
| `routes/grid.py`            | 30 min | Medium     | Above 4 services                  |
| `routes/forecast.py`        | 20 min | Easy       | demand_forecaster.py ✅           |
| `routes/dashboard.py`       | 25 min | Medium     | weather + forecaster              |
| `routes/websocket_route.py` | 20 min | Easy       | ConnectionManager exists ✅       |

### Frontend (2-3 hours)

| Component                     | Time   | Difficulty | Notes                         |
| ----------------------------- | ------ | ---------- | ----------------------------- |
| `CoreMetrics.tsx`             | 15 min | Easy       | Just swap mock for API        |
| `BatteryPanel.tsx`            | 15 min | Easy       | Same pattern                  |
| `EnergyChart.tsx`             | 25 min | Medium     | Add chart library + data wire |
| `AIDecision.tsx`              | 15 min | Easy       | Update text source            |
| `AlertsFeed.tsx`              | 15 min | Easy       | Map real alerts               |
| `FlowVisualizer.tsx`          | 15 min | Easy       | Update status colors          |
| Create `hooks/useGridData.ts` | 20 min | Easy       | Consolidate API calls         |

### Mobile (1-2 hours)

| Component              | Time   | Difficulty | Notes                |
| ---------------------- | ------ | ---------- | -------------------- |
| `features/grid/api.ts` | 25 min | Easy       | Implement hooks      |
| Overview tab wiring    | 15 min | Easy       | Use real API data    |
| Forecast tab wiring    | 20 min | Medium     | Add chart library    |
| Actions tab wiring     | 15 min | Easy       | Wire form submission |

**Total: 10-13 hours for complete system**

---

## 💾 Database Schema (Already Defined)

### GridStateDB

```sql
CREATE TABLE grid_state (
  id INTEGER PRIMARY KEY,
  timestamp DATETIME,
  city TEXT,
  current_demand_mw FLOAT,
  solar_generation_mw FLOAT,
  wind_generation_mw FLOAT,
  conventional_generation_mw FLOAT,
  total_supply_mw FLOAT,
  net_balance_mw FLOAT,
  battery_level_mwh FLOAT,
  battery_percentage FLOAT,
  grid_status TEXT,  -- HEALTHY, WARNING, CRITICAL
  recommended_action TEXT,  -- STORE, RELEASE, REDISTRIBUTE, STABLE
  action_description TEXT
);
```

### AlertDB

```sql
CREATE TABLE alert (
  id INTEGER PRIMARY KEY,
  timestamp DATETIME,
  city TEXT,
  severity TEXT,  -- INFO, WARNING, CRITICAL
  title TEXT,
  message TEXT,
  recommended_action TEXT,
  resolved BOOLEAN
);
```

Both tables are **auto-created** by SQLAlchemy on app startup (`await init_db()`)

---

## 🔌 API Endpoints (Routes Defined)

### Grid Management

- ✅ `POST /grid/state` — Submit readings
- ✅ `GET /grid/state/latest` — Get current state
- ✅ `GET /grid/history` — Historical states
- ✅ `GET /grid/alerts` — Active alerts

### Forecasting

- ✅ `POST /forecast/` — 24-72h forecast
- ✅ `GET /forecast/quick` — Quick 24h

### Dashboard

- ✅ `GET /dashboard/` — Full snapshot
- ✅ `GET /dashboard/summary` — Lightweight metrics

### Real-Time

- ✅ `WS /ws/grid/{city}` — WebSocket stream

### Meta

- ✅ `GET /` — API overview
- ✅ `GET /health` — Health check

All are **route signatures defined**, need implementations filled in.

---

## 🧠 Business Logic to Implement

### 1. Grid Balancing Algorithm

```
Input: demand_mw, solar_mw, wind_mw, conventional_mw, battery_level, capacity
Output: action, status, battery_delta

Logic:
  surplus = solar + wind - demand

  if surplus > 0 and battery < 90%:
    action = STORE (charge battery)
  elif surplus < 0 and battery > 20%:
    action = RELEASE (discharge battery)
  elif surplus < 0 and battery <= 20%:
    action = REDISTRIBUTE (reroute from other zones)
  else:
    action = STABLE

  if demand / capacity > 0.90:
    status = CRITICAL
  elif demand / capacity > 0.75:
    status = WARNING
  else:
    status = HEALTHY
```

### 2. Alert Generation

```
Rule set (from config.py thresholds):
- Battery < 10% AND deficit → CRITICAL alert
- Demand > 90% capacity → CRITICAL alert
- Battery < 25% → WARNING alert
- Deficit > 5 MW → WARNING alert
- Frequency deviation > 0.5 Hz → WARNING alert
- Otherwise → INFO
```

### 3. Feature Engineering for ML

Already built into:

- `backend/ml/src/preprocess.py` (lag features, rolling stats)
- `backend/models/demand_forecaster.py` (feature extraction)

Just load the scaler and call model.predict()

---

## 🔐 Security Considerations

### Already Implemented

- ✅ CORS enabled for localhost:3000 and :5173
- ✅ Input validation with Pydantic
- ✅ Async SQLite prevents SQL injection
- ✅ Type hints for runtime safety

### To Add for Production

- [ ] Rate limiting (FastAPI middleware)
- [ ] Authentication (JWT tokens)
- [ ] HTTPS/TLS (reverse proxy)
- [ ] Logging & monitoring

---

## 🌐 Deployment

### Local Development

```bash
cd backend && python3 -m uvicorn main:app --reload
cd client && npm run dev
cd mobile/gbalancer && npm run android
```

### Docker Compose (Provided)

```bash
docker-compose up -d
# Services: Backend, ML API, PostgreSQL, Redis
```

### Kubernetes (For scale)

- Helm charts can be created from Docker images
- HPA for auto-scaling based on grid load

---

## 📞 Quick Reference: Which File to Edit

| Task                   | File                                    | Function                       |
| ---------------------- | --------------------------------------- | ------------------------------ |
| Add weather source     | `services/weather_service.py`           | `fetch_current_weather()`      |
| Change grid thresholds | `config.py`                             | Update constants               |
| Modify balancing logic | `services/grid_balancer.py`             | `run_balancer()`               |
| Add alert types        | `services/alert_service.py`             | `generate_alerts_from_state()` |
| New REST endpoint      | `routes/grid.py` (or forecast.py)       | Add @router decorator          |
| Update dashboard UI    | `client/components/dashboard/`          | Any .tsx file                  |
| Change mobile API      | `mobile/gbalancer/features/grid/api.ts` | Hook implementation            |
| Retrain ML models      | `backend/ml/src/`                       | Run \*.py scripts              |

---

## ✨ Key Features Already Implemented

- ✅ ML forecasting architecture (LSTM + XGBoost)
- ✅ Synthetic data generation (365 days realistic grid patterns)
- ✅ Feature engineering & scaling pipeline
- ✅ FastAPI application structure
- ✅ Async SQLite database
- ✅ APScheduler for background tasks (60-second balance cycle)
- ✅ WebSocket infrastructure
- ✅ Pydantic schemas for all data models
- ✅ GSAP animations on frontend
- ✅ React Native navigation structure
- ✅ Environment variables & configuration
- ✅ Comprehensive API documentation (Swagger/OpenAPI)

---

## 🎓 Learning Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com
- **SQLAlchemy Async:** https://docs.sqlalchemy.org/asyncio
- **PyTorch LSTM:** https://pytorch.org/docs/stable/nn.html#lstm
- **XGBoost:** https://xgboost.readthedocs.io
- **React Hooks:** https://react.dev/reference/react/hooks
- **React Native:** https://reactnative.dev

---

## 🏁 Success Criteria

✅ **Complete when:**

- [ ] ML models trained and loadable
- [ ] Backend starts without errors
- [ ] Swagger UI shows all endpoints
- [ ] Can submit reading via POST /grid/state
- [ ] Database saves states correctly
- [ ] WebSocket broadcasts updates
- [ ] Web dashboard displays real data
- [ ] Mobile app fetches predictions
- [ ] Full end-to-end test succeeds

---

## 📞 Troubleshooting Checklist

| Issue                             | Solution                                      |
| --------------------------------- | --------------------------------------------- |
| "ModuleNotFoundError: forecaster" | Run `python3 ml/src/forecaster.py` to train   |
| "FileNotFoundError: scaler.pkl"   | Run `python3 ml/src/preprocess.py` first      |
| "Port 8000 already in use"        | Change port with `--port 8001`                |
| "Import error in routes"          | Check `sys.path` manipulation in main imports |
| "Database locked"                 | Delete `.db` file and restart                 |
| "CORS error in browser"           | Check `allow_origins` in main.py              |
| "WebSocket won't connect"         | Ensure backend is running and CORS enabled    |

---

## 🎯 Next Steps

**1. Today (0-2 hours):**

- Read this document ✓ (you're here!)
- Read `ML_TRAINING_GUIDE.md`
- Run ML training scripts

**2. Tomorrow (4-6 hours):**

- Implement 5 core backend services
- Test with Swagger UI

**3. This week (8-12 hours):**

- Complete remaining routes
- Wire frontend to real APIs
- Full system test

**4. Production (ongoing):**

- Deploy with Docker Compose
- Monitor & scale
- Gather real grid data

---

## 🙏 Final Notes

This project demonstrates a **production-grade architecture** for:

- Real-time ML inference
- Async HTTP servers
- WebSocket streaming
- Cross-platform mobile apps
- Full-stack TypeScript/Python

All core patterns are in place. You're implementing business logic on top of solid infrastructure. Each file has clear docstrings explaining what goes where.

**Good luck! You've got this.** 🚀
