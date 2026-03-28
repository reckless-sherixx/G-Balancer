# Intelligent Energy Grid Balancer — Backend

## 🚀 Quick Start

```bash
# 1. Clone / enter project
cd energy_grid_balancer

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the server
python -m uvicorn main:app --reload --port 8000
```

Server starts at → **http://localhost:8000**  
Swagger docs at → **http://localhost:8000/docs**

---

## 📁 Project Structure

```
energy_grid_balancer/
├── main.py                  ← FastAPI app + scheduler
├── config.py                ← All settings & thresholds
├── requirements.txt
├── models/
│   └── demand_forecaster.py ← XGBoost ML models (demand + solar)
├── routes/
│   ├── grid.py              ← Grid state & alert endpoints
│   ├── forecast.py          ← Prediction endpoints
│   ├── dashboard.py         ← Combined dashboard endpoint
│   └── websocket_route.py   ← Real-time WebSocket stream
├── services/
│   ├── weather_service.py   ← Open-Meteo + NASA POWER API
│   ├── grid_balancer.py     ← Core balancing logic
│   └── alert_service.py     ← Alert generation
├── schemas/
│   └── grid_schema.py       ← Pydantic request/response models
└── database/
    └── db.py                ← SQLAlchemy + SQLite (async)
```

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API overview |
| GET | `/health` | Health check |
| GET | `/dashboard/` | Full dashboard snapshot |
| GET | `/dashboard/summary` | Lightweight status card |
| POST | `/grid/state` | Submit readings → get decision |
| GET | `/grid/state/latest` | Latest grid state |
| GET | `/grid/history` | Historical states |
| GET | `/grid/alerts` | Active alerts |
| POST | `/forecast/` | 24–72 hr forecast |
| GET | `/forecast/quick` | Quick 24h forecast |
| WS | `/ws/grid/{city}` | Real-time WebSocket |

---

## 🌤️ Free Data Sources Used (No API Keys Needed)

- **Open-Meteo** → Live weather + hourly forecast
- **NASA POWER** → Solar irradiance data
- **SQLite** → Local database (upgrade to PostgreSQL for production)

---

## ⚙️ Configuration (`config.py`)

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_GRID_CAPACITY_MW` | 5000 | Total grid capacity |
| `BATTERY_CAPACITY_MWH` | 500 | Energy storage capacity |
| `CRITICAL_DEMAND_THRESHOLD` | 0.90 | Trigger critical alert |
| `WARNING_DEMAND_THRESHOLD` | 0.75 | Trigger warning alert |
| `BALANCE_INTERVAL_SECONDS` | 60 | How often auto-balance runs |
| `DEFAULT_CITY` | Mumbai | Default city |

---

## 🔄 WebSocket Usage (Frontend)

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/grid/Mumbai");

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Demand:", data.current_demand_mw, "MW");
    console.log("Status:", data.grid_status);
    console.log("Action:", data.recommended_action);
};
```

---

## 🧪 Example API Call

```bash
# Submit current grid readings
curl -X POST http://localhost:8000/grid/state \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Mumbai",
    "current_demand_mw": 3200,
    "solar_generation_mw": 800,
    "wind_generation_mw": 300,
    "conventional_generation_mw": 2000,
    "battery_level_mwh": 250
  }'
```
