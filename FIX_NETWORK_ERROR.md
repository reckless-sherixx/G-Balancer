# 🎯 IMMEDIATE ACTION PLAN - Fix Network Error

## Problem

Mobile app shows: `TypeError: Network request failed`

## Root Cause

**Android Emulator cannot reach your machine's IP (10.21.39.161) directly.**

Android Emulator uses special IP: **10.0.2.2** to reach the host machine.

---

## ✅ FIX (Already Applied)

Your mobile app (`mobile/gbalancer/features/grid/api.ts`) has been updated:

```typescript
const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000" // ✅ Android Emulator special IP
    : "http://10.21.39.161:8000"; // iOS or physical device
```

This means:

- **Android Emulator** → Uses `http://10.0.2.2:8000` ✅
- **iOS Simulator** → Uses `http://10.21.39.161:8000` ✅
- **Physical Device** → Uses `http://10.21.39.161:8000` ✅

---

## 🚀 STEPS TO GET IT WORKING (Do These Now)

### Step 1: Make Sure Backend is Running

**Terminal 1 (Backend):**

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\backend

# Activate environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start backend
uvicorn main:app --reload --port 8000
```

**Wait for this output:**

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
🚀 Starting G-Balancer v0.1.0
```

✅ When you see this, backend is ready!

---

### Step 2: Verify Backend is Working

**In your browser, open:**

```
http://10.21.39.161:8000/health
```

**Should see:**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-28T...",
  "scheduler_running": true
}
```

✅ If you see this, backend is working!

---

### Step 3: Start Mobile App with New Configuration

**Terminal 2 (Mobile App):**

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer

# Start Expo
npx expo start
```

**In Expo terminal, press: `a`**

```
Press:
  a   - open Android Emulator  ← PRESS THIS
  i   - open iOS Simulator
  w   - open web
  r   - reload app
  q   - quit
```

---

### Step 4: Watch the Mobile App

**You should see:**

**In Expo console (Terminal 2):**

```
📱 Platform: android
🌐 API Base URL: http://10.0.2.2:8000

🏠 getGridStatus() called
   Endpoint: http://10.0.2.2:8000/simulate + http://10.0.2.2:8000/grid-status
   📡 Fetching: http://10.0.2.2:8000/simulate
   ✅ Response received: {...}
   ✅ Simulation received
      Supply: 28.45 kWh
      Demand: 20.00 kWh
      Battery: 50.0%
```

**And in Backend terminal (Terminal 1):**

```
🔵 [ENDPOINT] /simulate (GET)
   ✅ Weather fetched: 28°C, 45% cloud
   ✅ Response ready: 24 hours of data
   📊 Supply range: 0.00 - 20.00 MW
```

✅ If you see logs like this, **IT'S WORKING!**

---

### Step 5: Tap "Refresh Data" in Mobile App

1. Look at mobile phone screen
2. Tap the **"Refresh Data"** button at top
3. Should see data appear:
   - Battery Level: 50%
   - Grid State: HEALTHY
   - Current Supply: 28.5 MW
   - Current Demand: 20.0 MW
   - Current Surplus: 8.5 kWh

---

## 🔍 If It Still Doesn't Work

### Check 1: Is Backend Really Running?

```powershell
# In a NEW PowerShell window, check if port 8000 is listening:
netstat -ano | findstr :8000

# Should show something like:
# TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING
```

If **nothing** shows up, backend is NOT running. Go back to Step 1.

---

### Check 2: Firewall Blocking?

```powershell
# Try to reach backend from your machine
curl http://10.21.39.161:8000/health

# If you get "connection refused", Windows Firewall is blocking it
```

**Fix Windows Firewall:**

1. Open "Windows Defender Firewall"
2. Click "Allow an app through firewall"
3. Click "Change settings"
4. Find "Python" in the list
5. Check both "Private" and "Public"
6. Click OK

**Or allow the specific port:**

1. Open "Windows Defender Firewall" → "Advanced settings"
2. Right-click "Inbound Rules" → "New Rule"
3. Select "Port" → Click Next
4. Select "TCP", Port: 8000 → Click Next
5. Allow the connection → Next
6. Name: "Allow Port 8000" → Finish

---

### Check 3: Are Dependencies Installed?

```powershell
cd backend
.\venv\Scripts\Activate.ps1

# Check for errors
pip install -r requirements.txt

# Try importing
python -c "import main; print('✅ OK')"
```

If error, reinstall:

```powershell
pip install --upgrade -r requirements.txt
```

---

### Check 4: Run Diagnostic Script

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python diagnose.py
```

This will show you:

- ✅ If backend is running
- ✅ If your IP is correct
- ✅ If dependencies are installed
- ✅ What to fix next

---

## 🎯 Expected Success

When everything works:

**Mobile Console Shows:**

```
🏠 getGridStatus() called
   Step 1: Fetching simulation data...
   📡 Fetching: http://10.0.2.2:8000/simulate
   ✅ Response received
   ✅ Simulation received
      Supply: 28.45 kWh
      Demand: 20.00 kWh
      Battery: 50.0%
```

**Backend Console Shows:**

```
🔵 [ENDPOINT] /simulate (GET)
   ✅ Weather fetched: 28°C, 45% cloud
   ✅ Response ready: 24 hours of data
```

**Mobile Screen Shows:**

```
Grid Operations Center
Live ML insight for supply-demand balance, battery health, and dispatch readiness.
API: http://10.0.2.2:8000

Battery Level: 50%
Grid State: HEALTHY
Current Supply: 28.5 MW
Current Demand: 20.0 MW
Current Surplus: 8.5 kWh

Forecast Snapshot (Next 12 points)
[Chart with bars showing supply and demand]
```

---

## 📝 Summary of What Changed

1. **Mobile app now uses correct IP for Android Emulator:**
   - Before: `http://10.21.39.161:8000` (doesn't work for emulator!)
   - After: `http://10.0.2.2:8000` for Android (works!)

2. **Mobile app still uses correct IP for physical devices/iOS:**
   - Before: `http://10.21.39.161:8000`
   - After: Same, but with proper comments explaining why

3. **Backend endpoints are ready:**
   - `/simulate` - returns supply/demand/battery data
   - `/grid-status` - returns status and action
   - `/predict` - returns recommended actions

4. **Console logging is comprehensive:**
   - Every step is logged with emojis
   - Easy to see where connection fails
   - Full request/response debugging

---

## ⏱️ Typical Success Timeline

1. Start backend: **5 seconds**
2. Verify in browser: **5 seconds**
3. Start mobile app: **30 seconds**
4. Open emulator: **20 seconds**
5. Tap refresh: **2 seconds**
6. See data: **🎉 SUCCESS!**

**Total time: ~60 seconds**

---

## 🆘 Still Stuck?

Run diagnostic:

```powershell
cd backend
python diagnose.py
```

Then check:

1. Is backend running? (netstat check)
2. Is your IP correct? (ipconfig check)
3. Are dependencies installed? (pip list check)
4. Can you reach http://10.21.39.161:8000/health? (YES/NO)

If still stuck, provide output of diagnostic script for faster help!
