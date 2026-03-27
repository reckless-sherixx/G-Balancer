# 🎯 Debugging Implementation Summary

## Overview

Comprehensive debugging and console logging has been added to both the mobile app and backend to help diagnose network and integration issues.

**Your Machine IP:** `10.21.39.161:8000`

---

## Changes Made

### 1. Mobile App Debugging (`mobile/gbalancer/features/grid/api.ts`)

#### Platform & API URL Logging

```typescript
console.log(`📱 Platform: ${Platform.OS}`);
console.log(`🌐 API Base URL: ${DEFAULT_BASE_URL}`);
```

#### Enhanced Request Function

- Logs every request with method and URL
- Logs response status and received data
- Catches and logs network errors with context

#### Function-Level Logging

**getForecast():**

- Logs endpoint being called
- Shows attempt to fetch /forecast
- Falls back to /simulate with detailed logging
- Shows final point count

**getGridStatus():**

- Logs step 1: simulation data fetch
- Shows supply, demand, battery values from simulation
- Logs step 2: /grid-status POST request
- Shows normalized grid status with message

**getPrediction():**

- Logs input parameters (grid stress, surplus, battery)
- Shows predict body building with point counts
- Logs HTTP response and normalized results
- Shows action, confidence, and urgency

#### Normalization Function Logging

**normalizeForecastResponse():**

- Logs raw points count
- Shows if converting arrays vs. using points directly
- Logs final converted point count

**normalizeGridStatus():**

- Logs status, battery, supply, demand values

**normalizePredictResponse():**

- Logs action, confidence percentage, urgency score

---

### 2. Backend Debugging

#### Main App Startup (`backend/main.py`)

Comprehensive startup logging:

```
======================================================================
🚀 Starting G-Balancer v0.1.0
======================================================================
⏰ Timestamp: [ISO timestamp]
🌍 Location: [City] ([lat], [lon])
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
```

#### Mobile Routes (`backend/routes/mobile_compat.py`)

**GET /simulate Endpoint:**

- Logs endpoint entry with purpose
- Shows weather fetch status
- Displays simulation start time and initial battery
- Logs first and last hour data points
- Shows data ranges (min/max for supply, demand, battery)
- Logs response ready with summary

**POST /grid-status Endpoint:**

- Logs request data (battery, supply, demand)
- Calculates and logs supply/demand ratio
- Shows status determination logic
- Logs recommended action
- Shows final response

**POST /predict Endpoint:**

- Logs request array counts
- Validates array lengths
- Shows recommender model loading attempt
- Logs fallback to rule-based logic
- Shows sample actions (first 3)

---

## Console Log Emoji Key

| Emoji | Meaning         | Example                       |
| ----- | --------------- | ----------------------------- |
| 📱    | Platform info   | `📱 Platform: android`        |
| 🌐    | Network/API     | `🌐 API Base URL: http://...` |
| 📊    | Forecast ops    | `📊 getForecast() called`     |
| 🏠    | Grid status     | `🏠 getGridStatus() called`   |
| 🤖    | Prediction      | `🤖 getPrediction() called`   |
| 📡    | Network request | `📡 Fetching: http://...`     |
| ✅    | Success         | `✅ Response received`        |
| ⚠️    | Warning         | `⚠️  Weather fetch failed`    |
| ❌    | Error           | `❌ Network error`            |
| 🔴    | Critical error  | `🔴 Network error`            |
| 📍    | Location/time   | `📍 Hour 12 (day-hour 14)`    |
| 📋    | Processing step | `📋 Falling back to...`       |
| 📈    | Data point      | `📈 First point: supply=X`    |
| 🔋    | Battery info    | `🔋 Battery range: 30-70%`    |
| 🔵    | Endpoint        | `🔵 [ENDPOINT] /simulate`     |
| 📥    | Input           | `📥 Request received`         |
| 📤    | Output          | `📤 Response ready`           |
| ⚙️    | Processing      | `⚙️  Fetching weather...`     |
| 💡    | Decision        | `💡 Action: STABLE`           |

---

## How to Use Debugging

### 1. Start Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Watch for startup logs confirming database, models, and scheduler are ready.

### 2. Start Mobile App

```powershell
cd mobile/gbalancer
npm install
npx expo start
```

Press 'a' for Android emulator.

### 3. Monitor Logs

**Backend Terminal:**

- Watch for [ENDPOINT] logs when mobile app requests data
- Check for error messages prefixed with ❌ or 🔴

**Mobile/Expo Terminal:**

- Press 'j' to open debugger
- Console will show all 📱, 🌐, 📡, ✅, ❌ logs
- Use Expo web console at `http://localhost:19000`

### 4. Tap "Refresh Data" in Mobile App

Expected log flow:

**Mobile:**

```
📱 Platform: android
🌐 API Base URL: http://10.21.39.161:8000

📊 getForecast() called
   📡 Fetching: http://10.21.39.161:8000/forecast
   ✅ Response received: [...]

🏠 getGridStatus() called
   Step 1: Fetching simulation data...
   📡 Fetching: http://10.21.39.161:8000/simulate
   ✅ Simulation received
   📊 Grid Status: HEALTHY
```

**Backend:**

```
🔵 [ENDPOINT] /simulate (GET)
   ✅ Weather fetched: 28°C, 45% cloud
   📊 Supply range: 0.00 - 20.00 MW

🔵 [ENDPOINT] /grid-status (POST)
   📥 Battery: 50%, Supply: 28.45, Demand: 20.0
   ✅ Status: HEALTHY
   💡 Action: STABLE
```

---

## Debugging Workflows

### Scenario 1: "Could not fetch one or more endpoints"

**Check Mobile Logs:**

```
❌ Network error on http://10.21.39.161:8000/simulate: TypeError: Network request failed
```

**Action Items:**

1. Verify backend is running: `http://10.21.39.161:8000/health`
2. Check IP is correct: `ipconfig` in PowerShell
3. Check firewall isn't blocking port 8000
4. Verify mobile has network connectivity

### Scenario 2: Backend Endpoint Returns Empty Data

**Check Backend Logs:**

```
✅ Response ready: 24 hours of data
📊 Supply range: 0.00 - 0.00 MW  ← Problem: all zeros!
```

**Action Items:**

1. Check weather service is working
2. Verify simulation logic in /simulate endpoint
3. Check for exceptions in supply/demand calculation

### Scenario 3: Slow Response Times

**Check Logs for Duration:**

```
📡 Fetching: http://10.21.39.161:8000/simulate
[... 3 seconds later ...]
✅ Response received
```

**Action Items:**

1. Check CPU usage (ML model loading?)
2. Check database queries
3. Check weather API latency
4. Consider caching /simulate responses

---

## Log Filtering (Advanced)

If logs are too verbose, you can filter by emoji in your editor:

**In VS Code, search console logs:**

- `❌` - Show only errors
- `✅` - Show only successes
- `📡` - Show only network requests
- `⏰` - Show timing info

**In terminal, grep logs:**

```powershell
# Windows PowerShell
Get-Content logs.txt | Select-String "❌"  # Only errors
```

---

## Performance Insights

From logs, you can see:

**Response Times:**

```
📡 Fetching: ... [time] ✅ Response received
```

**Data Quality:**

```
📊 Supply range: 0.00 - 20.00 MW
📊 Demand range: 8.00 - 32.00 MW
```

**Decision Making:**

```
⚙️  Supply/Demand ratio: 1.42
💡 Action: STABLE
```

---

## Next Steps

1. **Run backend with debug logs enabled:**

   ```powershell
   uvicorn main:app --reload --port 8000 --log-level debug
   ```

2. **Open mobile app in Expo debugger:**
   - Press 'j' in Expo terminal to open debugger
   - Open Expo web console at `http://localhost:19000`

3. **Tap "Refresh Data" and monitor logs**

4. **Check DEBUGGING_GUIDE.md for detailed issue resolution**

---

## File Changes Summary

| File                                    | Changes                                                     |
| --------------------------------------- | ----------------------------------------------------------- |
| `mobile/gbalancer/features/grid/api.ts` | Added comprehensive logging to all API functions            |
| `backend/main.py`                       | Enhanced startup logging with detailed initialization steps |
| `backend/routes/mobile_compat.py`       | Added detailed logs to /simulate, /grid-status, /predict    |
| `DEBUGGING_GUIDE.md`                    | New comprehensive debugging guide                           |

---

## IP Configuration Reminder

Your setup is configured for:

```
Backend IP: 10.21.39.161:8000
Platform: Android Emulator (uses same IP directly)
```

If you need to change it later:

- Edit: `mobile/gbalancer/features/grid/api.ts`
- Update: `const DEFAULT_BASE_URL = 'http://YOUR_IP:8000';`
- Restart: `npx expo start`
