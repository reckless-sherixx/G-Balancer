# 🐛 Debugging Guide - Mobile & Backend Integration

## Overview

This guide shows you how to use the comprehensive debug logging that has been added to both the mobile app and backend.

---

## 📱 Mobile App Console Logs

### Where to See Mobile Logs

**Android Emulator or Physical Device:**

```bash
# In Expo terminal
Press 'j' to toggle debugger
Look for console logs in the terminal or use React Native Debugger
```

**Or use Expo Web Console:**

```
http://localhost:19000  # Expo dev server web interface
```

### Expected Log Sequence When Tapping "Refresh Data"

```
📱 Platform: android
🌐 API Base URL: http://10.21.39.161:8000

📊 getForecast() called
   Endpoint: http://10.21.39.161:8000/forecast
   Attempting to fetch /forecast...
   📡 Fetching: http://10.21.39.161:8000/forecast
   ✅ Response received: {...}
   ✅ /forecast successful
   Normalized forecast: 12 points
   ✅ Normalized forecast: 12 points

🏠 getGridStatus() called
   Endpoint: http://10.21.39.161:8000/simulate + http://10.21.39.161:8000/grid-status
   Step 1: Fetching simulation data...
   📡 Fetching: http://10.21.39.161:8000/simulate
   ✅ Response received: {...}
   ✅ Simulation received
      Supply: 28.45 kWh
      Demand: 20.00 kWh
      Battery: 50.0%
   Step 2: Posting to /grid-status...
   📡 Fetching: http://10.21.39.161:8000/grid-status
   ✅ Response received: {...}
   ✅ /grid-status response received
   📡 Normalizing grid status response...
      Status: HEALTHY
      Battery: 50.0%
      Supply: 28.45, Demand: 20.00
   ✅ Normalized grid status: HEALTHY
      Message:
```

### Log Levels

```
📱 - Platform info
🌐 - Network/API
📊 - Forecast operations
🏠 - Grid status operations
🤖 - Prediction operations
📡 - Network requests
✅ - Success
⚠️  - Warning/Fallback
❌ - Error
📍 - Location/time info
📋 - Processing steps
📈 - Data points
🔋 - Battery status
🔴 - Critical error
```

---

## 🔧 Backend Console Logs

### Where to See Backend Logs

**PowerShell Terminal where backend is running:**

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

### Expected Log Output

**On Startup:**

```
======================================================================
🚀 Starting G-Balancer v0.1.0
======================================================================
⏰ Timestamp: 2026-03-28T14:23:45.123456+00:00
🌍 Location: Delhi (28.7, 77.2)
🔌 Port: 8000
📚 Docs: http://localhost:8000/docs

📋 Initialization steps:
   1️⃣  Initializing database...
      ✅ Database ready
   2️⃣  Loading ML models...
      ✅ Models loaded
   3️⃣  Starting scheduler...
      ✅ Scheduler started (interval: 60s)

✅ App startup complete!
======================================================================
Ready to receive requests on:
  📱 Mobile endpoints: /simulate, /grid-status, /predict
  📊 Forecast endpoint: /forecast
  📡 Dashboard: /dashboard
  🔌 WebSocket: /ws/grid/{city}
  📚 API Docs: /docs
======================================================================
```

**When Mobile App Calls /simulate:**

```
🔵 [ENDPOINT] /simulate (GET)
   📋 Purpose: Generate 24-hour supply/demand/battery profiles
   ⚙️  Fetching current weather...
   ✅ Weather fetched: 28°C, 45% cloud
   📅 Starting simulation from: 2026-03-28T14:23:45.123456+00:00
   🔋 Initial battery: 50.0%
   📍 Hour  0 (day-hour 14): supply= 20.00MW, demand= 20.00MW, battery= 50.0%
   📍 Hour 23 (day-hour 13): supply= 15.50MW, demand= 20.50MW, battery= 45.5%
   ✅ Response ready: 24 hours of data
   📊 Supply range: 0.00 - 20.00 MW
   📊 Demand range: 8.00 - 32.00 MW
   🔋 Battery range: 30.0% - 70.0%
```

**When Mobile App Calls /grid-status:**

```
🔵 [ENDPOINT] /grid-status (POST)
   📥 Request received:
      Battery: 50%
      Supply: 28.45 kWh
      Demand: 20.0 kWh
   ⚙️  Supply/Demand ratio: 1.42
   ✅ Status: HEALTHY
   💡 Action: STABLE
   📤 Response: {"status": "HEALTHY", "recommended_action": "STABLE"}
```

**When Mobile App Calls /predict:**

```
🔵 [ENDPOINT] /predict (POST)
   📥 Request received:
      Solar points: 9
      Wind points: 9
      Demand points: 9
      Battery: 50%
   ✅ Validation passed
   ⚙️  Attempting to load recommender model...
   ⚠️  Recommender loading failed: No recommender model found
   📋 Falling back to rule-based logic...
   ✅ Generated 9 rule-based actions
   📤 Response: actions=['STABLE', 'STABLE', 'CHARGE_BATTERY']... (showing first 3)
```

---

## 🔍 Debugging Common Issues

### Issue 1: Mobile App Cannot Connect to Backend

**Symptoms in Mobile Console:**

```
❌ Network error on http://10.21.39.161:8000/simulate: TypeError: Network request failed
```

**Debug Steps:**

1. **Check Backend is Running**

   ```powershell
   # In backend terminal, should see:
   INFO:     Uvicorn running on http://127.0.0.1:8000
   ```

2. **Check IP Address is Correct**

   ```powershell
   # In PowerShell terminal
   ipconfig
   # Look for IPv4 Address, should match 10.21.39.161
   ```

3. **Check Firewall**

   ```powershell
   # Windows Defender might be blocking port 8000
   # Try accessing in browser:
   http://10.21.39.161:8000/health
   ```

4. **Check Network Connection**
   ```powershell
   # From mobile device/emulator, try pinging backend
   ping 10.21.39.161
   # Should get response
   ```

### Issue 2: Backend Endpoint Returns 500 Error

**Symptoms in Backend Console:**

```
🔵 [ENDPOINT] /grid-status (POST)
   📥 Request received:
   ...
   ❌ Error: <some exception>
```

**Debug Steps:**

1. **Check Full Error Message**
   - Look at the exception text in console
   - Common causes:
     - Weather service failed
     - Database connection failed
     - Invalid input data

2. **Run Test Integration Script**

   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   python test_integration.py
   ```

3. **Check Dependencies**
   ```powershell
   pip install -r requirements.txt
   ```

### Issue 3: Mobile App Shows Empty Data

**Symptoms in Mobile Console:**

```
📊 getForecast() called
   Attempting to fetch /forecast...
   📡 Fetching: http://10.21.39.161:8000/forecast
   ✅ Response received: {...}
   Normalized forecast: 0 points  ← PROBLEM: Empty points array
```

**Debug Steps:**

1. **Check Backend Response Format**
   - In browser: `http://10.21.39.161:8000/forecast?hours=12`
   - Verify response has `points` array with data

2. **Check Normalization Logic**
   - Mobile app tries to parse `points`, `hours`, `predicted_supply`, `predicted_demand`
   - Backend should return one of these formats

3. **Use /simulate Fallback**
   - /simulate endpoint is more reliable and doesn't require forecast service
   - Mobile app automatically falls back if /forecast fails

### Issue 4: Scheduler Not Running

**Symptoms in Backend Console:**

```
3️⃣  Starting scheduler...
   ❌ Error: Failed to start scheduler
```

**Debug Steps:**

1. **Check APScheduler is Installed**

   ```powershell
   pip install apscheduler
   ```

2. **Check for Background Task Errors**
   - Look for auto-balance task errors in logs
   - Usually shows when it's running (every 60 seconds)

---

## 📊 Performance & Data Validation

### Expected Data Ranges

When debugging, check if values fall within expected ranges:

**Supply (MW):**

- Min: 0 (nighttime)
- Max: ~40 (peak renewable)
- Typical: 15-30

**Demand (MW):**

- Min: 8 (night)
- Max: 32 (peak hours)
- Typical: 20-25

**Battery (%):**

- Min: 0 (depleted)
- Max: 100 (full)
- Typical: 30-70

**Supply/Demand Ratio:**

- < 0.8: LOAD_SHED likely
- 0.8-0.95: CHARGE_BATTERY likely
- 0.95-1.2: STABLE (normal)
- > 1.2: STORE possible

### Example Valid Response

```json
{
  "total_supply_kwh": [8.5, 10.2, 15.3, 20.0, 25.5, 28.3, 28.0, 25.5],
  "demand_kwh": [20.0, 20.5, 21.0, 22.0, 23.0, 22.5, 21.0, 20.0],
  "battery_pct": [50.0, 48.5, 47.0, 45.5, 45.0, 48.0, 52.0, 55.5]
}
```

---

## 🎯 Quick Debug Checklist

### Backend Startup

- [ ] Terminal shows "Uvicorn running on http://127.0.0.1:8000"
- [ ] Shows "App startup complete!"
- [ ] Shows all three initialization steps passed

### Mobile App Startup

- [ ] Shows correct platform (android/ios)
- [ ] Shows correct API base URL (http://10.21.39.161:8000)
- [ ] Can reach Expo debugger

### First Data Fetch

- [ ] Mobile shows "getForecast() called"
- [ ] Backend shows "[ENDPOINT] /simulate (GET)"
- [ ] Mobile receives response with data arrays
- [ ] Mobile shows "✅" for all normalize operations
- [ ] Backend shows response ranges

### Subsequent Fetches

- [ ] Mobile shows "getGridStatus() called"
- [ ] Backend shows "[ENDPOINT] /grid-status (POST)"
- [ ] Response includes status (HEALTHY/WARNING/CRITICAL)
- [ ] Response includes action (STABLE/CHARGE_BATTERY/LOAD_SHED)

---

## 🚨 Emergency Debug Mode

If something is really broken, enable maximum logging:

**Backend:**

```powershell
uvicorn main:app --reload --port 8000 --log-level debug
```

**Mobile (in Expo terminal):**

```
Press 'd' to open debugger
```

---

## 📞 Getting Help

If stuck, gather these debug outputs:

1. **Full backend startup log** (first 50 lines)
2. **Mobile console log from first fetch** (10-20 lines)
3. **Backend endpoint logs** from when error occurs (5-10 lines)
4. **Your machine IP** (`ipconfig` output)
5. **API response** in browser at `http://10.21.39.161:8000/simulate`

Then share this info for faster debugging!
