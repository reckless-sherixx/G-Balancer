# 📖 COMPLETE SYSTEM DOCUMENTATION

**Project:** G-Balancer (Intelligent Energy Grid Balancer)  
**Status:** ✅ Fully Operational  
**Date:** March 28, 2026

---

## 🎯 What This System Does

The **G-Balancer** is an intelligent energy grid management system that:

- 📊 **Forecasts** electricity demand and renewable generation using ML models
- ⚡ **Balances** supply and demand in real-time
- 🔋 **Manages** battery storage for peak shaving and load leveling
- 🚨 **Alerts** operators about grid anomalies
- 📱 **Displays** real-time status on mobile app

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Battery Level | Grid State | Supply | Demand        │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
                     │ (10.21.39.161:8000)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /simulate │ /grid-status │ /predict │ /forecast    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services: Weather | Grid Balancer | Alerts | DB   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ML Models: Forecaster | Recommender | Fallback    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬──────────────────────┬─────────────────┘
                     │                      │
        ┌────────────▼───────────┐  ┌──────▼──────────┐
        │  External APIs:        │  │  SQLite DB      │
        │  - Open-Meteo         │  │  (Grid State)   │
        │  - NASA POWER         │  │  (Alerts)       │
        │  - OPSD, IEA          │  └─────────────────┘
        └───────────────────────┘
```

---

## 📁 Project Structure

```
G-Balancer/
├── backend/                    # FastAPI backend
│   ├── main.py                # App entry point
│   ├── config.py              # Configuration settings
│   ├── requirements.txt        # Python dependencies
│   ├── routes/                # API endpoints
│   │   ├── grid.py
│   │   ├── forecast.py
│   │   ├── dashboard.py
│   │   ├── websocket_route.py
│   │   └── mobile_compat.py   # Mobile-specific endpoints
│   ├── services/              # Business logic
│   │   ├── weather_service.py
│   │   ├── grid_balancer.py
│   │   └── alert_service.py
│   ├── models/                # ML model loading
│   │   └── demand_forecaster.py
│   ├── database/              # Async database
│   │   └── db.py
│   ├── schemas/               # Pydantic schemas
│   │   └── grid_schema.py
│   └── ml/                    # ML training pipeline
│       ├── src/               # ML source code
│       ├── notebooks/         # Jupyter training notebooks
│       └── models/            # Trained model artifacts
│
├── mobile/gbalancer/          # React Native (Expo) app
│   ├── package.json
│   ├── tsconfig.json
│   ├── app/                   # App screens
│   └── features/grid/
│       ├── api.ts             # API communication layer
│       └── screens/           # UI components
│
├── client/                    # Next.js web dashboard
│   ├── package.json
│   └── app/                   # Dashboard components
│
└── documentation/             # Guides and setup
    ├── QUICK_START.md
    ├── IMPLEMENTATION_GUIDE.md
    └── ML_TRAINING_GUIDE.md
```

---

## 🚀 How to Run

### Option 1: Windows PowerShell (Recommended for Windows Users)

**Terminal 1 - Backend:**

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Mobile:**

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer"
npx expo start
# Press 'a' for Android
```

### Option 2: WSL/Linux (for Linux Users)

**Terminal 1 - Backend:**

```bash
cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Mobile:**

```bash
cd /mnt/c/Users/KIIT/Documents/G-Balancer/mobile/gbalancer
npx expo start
# Press 'a' for Android
```

---

## 🔌 API Endpoints

### Mobile Endpoints

| Endpoint       | Method | Purpose            | Request                           | Response                                |
| -------------- | ------ | ------------------ | --------------------------------- | --------------------------------------- |
| `/simulate`    | GET    | 24h forecast       | -                                 | `{supply: [], demand: [], battery: []}` |
| `/grid-status` | POST   | Grid health        | `{battery_level, supply, demand}` | `{status, action, battery}`             |
| `/predict`     | POST   | Get recommendation | `{solar, wind, demand, battery}`  | `{action, description, confidence}`     |
| `/forecast`    | GET    | Quick forecast     | -                                 | `{hourly_forecast: [...]}`              |

### Dashboard Endpoints

| Endpoint             | Method | Purpose               |
| -------------------- | ------ | --------------------- |
| `/grid/state/latest` | GET    | Get latest grid state |
| `/grid/state`        | POST   | Submit grid reading   |
| `/grid/alerts`       | GET    | Get active alerts     |
| `/dashboard/`        | GET    | Dashboard view        |
| `/ws/grid/{city}`    | WS     | Real-time updates     |

### Health

| Endpoint  | Method | Purpose                     | Response                                           |
| --------- | ------ | --------------------------- | -------------------------------------------------- |
| `/health` | GET    | Backend health check        | `{"status": "healthy", "scheduler_running": true}` |
| `/docs`   | GET    | API documentation (Swagger) | Interactive API explorer                           |

---

## 🔧 Key Configuration

**File:** `backend/config.py`

```python
DEFAULT_CITY = "Mumbai"
DEFAULT_LATITUDE = 19.07
DEFAULT_LONGITUDE = 72.87
BATTERY_CAPACITY_MWH = 100
BALANCE_INTERVAL_SECONDS = 60
```

---

## 🗄️ Database Schema

**SQLite Database** with two main tables:

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
    grid_status TEXT,
    recommended_action TEXT,
    action_description TEXT
);
```

### AlertDB

```sql
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME,
    city TEXT,
    severity TEXT,
    title TEXT,
    message TEXT,
    recommended_action TEXT
);
```

---

## 🧠 ML Models

### 1. Forecaster (LSTM)

- **Input:** 72-hour historical sequence of weather + demand
- **Output:** 6-hour ahead forecast of supply and demand
- **Training:** `notebooks/02_forecaster_train.ipynb`
- **Artifact:** `models/forecaster.pt`

### 2. Recommender (XGBoost)

- **Input:** Current supply, demand, battery level
- **Output:** Grid action (STORE, DISCHARGE, REROUTE, LOAD_SHED)
- **Training:** `notebooks/03_recommender_train.ipynb`
- **Artifact:** `models/recommender.pkl`

### 3. Fallback (Formula-Based)

- Loads when ML models unavailable
- Uses:
  - Seasonal decomposition for demand
  - Cloud cover for solar generation
  - Wind speed for wind generation
- Zero dependencies - always works!

---

## 📊 Data Sources

| Source         | Data                        | Free   | Link                                    |
| -------------- | --------------------------- | ------ | --------------------------------------- |
| **Open-Meteo** | Current weather             | ✅ Yes | https://open-meteo.com                  |
| **NASA POWER** | Historical solar irradiance | ✅ Yes | https://power.larc.nasa.gov             |
| **OPSD**       | India demand data           | ✅ Yes | https://data.open-power-system-data.org |
| **IEA**        | Capacity data               | ✅ Yes | https://www.iea.org                     |

All data sources are **free** and **no authentication required**!

---

## 🔄 Request/Response Flow

### Example: Get Grid Status

**Mobile App (TypeScript):**

```typescript
const response = await fetch("http://10.21.39.161:8000/grid-status", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    battery_level_pct: 50,
    current_supply_kwh: 28.5,
    current_demand_kwh: 35.2,
  }),
});
const data = await response.json();
// { status: "HEALTHY", action: "STORE", battery_percentage: 50 }
```

**Backend (Python):**

```python
@router.post("/grid-status")
async def grid_status(request: GridStatusRequest):
    # 1. Fetch current weather
    weather = await fetch_current_weather()

    # 2. Generate 24-hour simulation
    simulation = await simulate()

    # 3. Calculate grid balance
    state = run_balancer(...)

    # 4. Return status and recommended action
    return {
        "status": state.grid_status.value,
        "action": state.recommended_action.value,
        "battery_percentage": state.battery_percentage
    }
```

---

## 🐛 Debugging

### Enable Verbose Logging

Backend logs everything:

- All API requests received
- Weather API calls
- Database operations
- Model predictions
- Grid decisions
- Errors and warnings

Watch the backend terminal to see what's happening!

### Test Backend Health

```bash
curl http://10.21.39.161:8000/health
# {"status":"healthy","timestamp":"2026-03-28T...","scheduler_running":true}
```

### View API Documentation

Open browser: `http://10.21.39.161:8000/docs`

Interactive Swagger UI showing all endpoints!

---

## 🛠️ Troubleshooting

### Backend won't start

1. Check directory:

   ```bash
   cd backend  # Make sure you're in backend!
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Check port 8000:
   ```bash
   netstat -ano | findstr :8000
   # If used, kill the process
   ```

### Mobile can't reach backend

1. Check backend is running (should see startup logs)
2. Check port 8000 is listening:
   ```bash
   netstat -ano | findstr :8000
   # Should show: 0.0.0.0:8000 LISTENING
   ```
3. Check in mobile console - should show API URL being used

### Import errors

```bash
pip install -r requirements.txt
# or
pip3 install -r requirements.txt  # for WSL
```

---

## 📚 Documentation Files

| File                        | Purpose                        |
| --------------------------- | ------------------------------ |
| `QUICK_START.md`            | 60-second setup guide          |
| `COMMANDS_TO_RUN.md`        | Exact copy-paste commands      |
| `WSL_QUICK_START.md`        | Commands for WSL users         |
| `WSL_SETUP_GUIDE.md`        | Complete WSL setup guide       |
| `ACTUAL_FIX_EXPLANATION.md` | What was wrong, what was fixed |
| `FIX_SUMMARY.md`            | Summary of all fixes           |
| `IMPLEMENTATION_GUIDE.md`   | Architecture and design        |
| `ML_TRAINING_GUIDE.md`      | ML model training pipeline     |

---

## ✅ Verification Checklist

Before deploying:

- [ ] Backend starts without errors
- [ ] `/health` endpoint returns `{"status":"healthy"}`
- [ ] Mobile app launches in Expo
- [ ] Mobile connects to backend (check console logs)
- [ ] Mobile displays grid data
- [ ] No "Network request failed" errors
- [ ] Backend logs show incoming requests
- [ ] Database has entries
- [ ] Scheduler is running

---

## 🚀 Next Steps

1. **Run the system** using commands above
2. **Monitor the logs** in both terminals
3. **Test the mobile app** - tap buttons and watch logs
4. **Train ML models** (optional):
   ```bash
   cd backend/ml
   jupyter notebook
   # Open 02_forecaster_train.ipynb
   ```
5. **Deploy to production** (when ready)

---

## 📞 Quick Reference

| What          | Command                                                          |
| ------------- | ---------------------------------------------------------------- |
| Start backend | `python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload` |
| Start mobile  | `cd mobile/gbalancer && npx expo start`                          |
| Test health   | `curl http://10.21.39.161:8000/health`                           |
| View docs     | `http://10.21.39.161:8000/docs`                                  |
| Install deps  | `pip install -r requirements.txt`                                |
| Run tests     | `python -m pytest` (when available)                              |

---

## 🎉 You're Ready!

The system is fully functional and ready to use. Follow the "How to Run" section above and enjoy the live energy grid dashboard! 🚀
