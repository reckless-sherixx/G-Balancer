# 🚨 Network Connectivity Troubleshooting

## Error: "Network request failed"

Your mobile app is trying to reach `http://10.21.39.161:8000` but **cannot establish a connection**.

### Root Causes (Check in order):

---

## 1️⃣ **Backend Not Running** (Most Common)

### Check if backend is running:

**PowerShell:**

```powershell
# Option A: Check if process is listening on port 8000
netstat -ano | findstr :8000

# Should show something like:
# TCP    127.0.0.1:8000         0.0.0.0:0              LISTENING
```

**Option B: Try in browser:**

```
http://10.21.39.161:8000/health
```

### If NOT running, start it:

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies (if not already done)
pip install -r requirements.txt

# Start backend
uvicorn main:app --reload --port 8000
```

**Expected output:**

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
🚀 Starting G-Balancer v0.1.0
```

✅ **If you see this, backend is running. Move to Step 2.**

---

## 2️⃣ **IP Address Mismatch**

### Verify your machine IP:

```powershell
# Get your IP address
ipconfig

# Look for line like:
# IPv4 Address. . . . . . . . . . . : 10.21.39.161
```

**Is it really `10.21.39.161`?**

- ✅ **YES** → Skip to Step 3
- ❌ **NO** → Update mobile app config

### If IP is different, update mobile app:

**Edit:** `mobile/gbalancer/features/grid/api.ts`

**Find:**

```typescript
const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "http://10.21.39.161:8000"
    : "http://10.21.39.161:8000";
```

**Replace with your actual IP:**

```typescript
const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.1.100:8000"
    : "http://192.168.1.100:8000";
// Replace 192.168.1.100 with YOUR IPv4 address
```

**Then restart mobile app:**

```powershell
# Press Ctrl+C in Expo terminal
# Then restart:
npx expo start
# Press 'a' for Android emulator
```

---

## 3️⃣ **Firewall Blocking Port 8000**

### Test from command line:

```powershell
# Try to reach backend from your machine
curl http://10.21.39.161:8000/health

# If you get "connection refused" or timeout, firewall is blocking
```

### Fix Windows Defender Firewall:

**Option A: Allow Python through firewall**

1. Open "Windows Defender Firewall"
2. Click "Allow an app through firewall"
3. Click "Change settings"
4. Find "Python" in list
5. Check both "Private" and "Public"
6. Click OK

**Option B: Allow port 8000**

1. Open "Windows Defender Firewall" → "Advanced settings"
2. Right-click "Inbound Rules" → "New Rule"
3. Select "Port" → Click Next
4. Select "TCP" → Port: 8000 → Click Next
5. Allow the connection → Click Next
6. Name it "Allow 8000" → Click Finish

**Option C: Temporarily disable firewall** (for testing only!)

```powershell
# ⚠️ WARNING: Only do this for testing!
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled $false

# Re-enable it later:
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled $true
```

---

## 4️⃣ **Emulator/Device Network Issue**

### For Android Emulator:

**Check if emulator can reach host:**

```powershell
# In emulator, open browser and navigate to:
http://10.0.2.2:8000/health
# Note: 10.0.2.2 is special IP for emulator to reach host

# If that works, you need to use 10.0.2.2 in your app:
```

**Update mobile app for emulator:**

```typescript
const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000" // Android emulator special IP
    : "http://10.21.39.161:8000"; // iOS or physical device
```

### For Physical Device:

**Make sure device is on same WiFi:**

1. Open device WiFi settings
2. Check it's connected to the same WiFi as your PC
3. Note the WiFi name (SSID)

**Test connectivity:**

```powershell
# On your PC, get your WiFi IP (not Ethernet):
ipconfig /all

# Look for "Wireless LAN adapter" section
# Use that IPv4 address in your app
```

---

## 5️⃣ **Backend Dependency Issues**

### If backend crashes on startup:

**Check for errors:**

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\backend

# Try to import main
python -c "import main; print('✅ Main module loads')"

# If error, check dependencies:
pip install -r requirements.txt --upgrade
```

**Common issues:**

- Missing `aiosqlite` for database
- Missing `httpx` for HTTP requests
- Missing `apscheduler` for scheduler

**Install all at once:**

```powershell
pip install fastapi uvicorn pydantic httpx pandas numpy scikit-learn xgboost joblib sqlalchemy aiosqlite websockets apscheduler python-multipart python-dotenv
```

---

## 🧪 Step-by-Step Verification

### Step 1: Start Backend

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

Watch for:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
🚀 Starting G-Balancer v0.1.0
```

✅ When you see this, **backend is ready**. Move to Step 2.

### Step 2: Test Backend from Browser

Open your browser and navigate to:

```
http://10.21.39.161:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2026-03-28T...",
  "scheduler_running": true
}
```

✅ If you see this, **backend is working**. Move to Step 3.

### Step 3: Test Backend from Mobile Emulator

**In Android Emulator browser**, navigate to:

```
http://10.0.2.2:8000/health
# Note: 10.0.2.2 is special IP for emulator!
```

- ✅ Works → Update mobile app to use `http://10.0.2.2:8000`
- ❌ Doesn't work → Network/firewall issue (Step 4)

### Step 4: Test from Mobile App

1. Start Expo:

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer
npx expo start
# Press 'a' for Android emulator
```

2. In the mobile app, tap "Refresh Data"

3. Check console logs:

```
🏠 getGridStatus() called
   Endpoint: http://10.0.2.2:8000/simulate
   📡 Fetching: http://10.0.2.2:8000/simulate
   ✅ Response received: {...}
```

✅ If you see ✅, **integration is working!**

---

## 🔧 Quick Fixes Checklists

### Minimal Fix (Try this first)

- [ ] Backend running: `uvicorn main:app --reload --port 8000`
- [ ] Browser test: `http://10.21.39.161:8000/health` works
- [ ] Verify IP: `ipconfig` shows `10.21.39.161`
- [ ] Restart mobile app: `npx expo start`
- [ ] Tap "Refresh Data" in mobile app

### If Still Not Working

- [ ] Check firewall: `netstat -ano | findstr :8000`
- [ ] Allow Python through firewall
- [ ] Update mobile app to use `http://10.0.2.2:8000` for emulator
- [ ] Check backend logs for startup errors
- [ ] Reinstall dependencies: `pip install -r requirements.txt`

### Nuclear Option

```powershell
# Stop everything
# Kill all Python processes (backend)
Get-Process python | Stop-Process -Force

# Kill Expo
# Ctrl+C in Expo terminal

# Delete and reinstall
cd backend
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Start fresh
uvicorn main:app --reload --port 8000
```

---

## 📋 Diagnostic Commands

**Check if backend is listening:**

```powershell
netstat -ano | findstr :8000
```

**Test connectivity to backend:**

```powershell
# From Windows
curl http://10.21.39.161:8000/health -Verbose

# From PowerShell (alternative)
Invoke-WebRequest http://10.21.39.161:8000/health -Verbose
```

**Check Python is running:**

```powershell
Get-Process python | Select-Object Name, Id, ProcessName
```

**Check port availability:**

```powershell
Test-NetConnection -ComputerName 10.21.39.161 -Port 8000 -Verbose
```

**View backend logs in real-time:**

```powershell
# Keep terminal open where backend is running
# Look for [ENDPOINT] logs when mobile app makes requests
```

---

## 🎯 Expected Success State

When everything is working:

**Backend Terminal:**

```
🔵 [ENDPOINT] /simulate (GET)
   ✅ Weather fetched: 28°C
   📊 Supply range: 0.00 - 20.00 MW
   ✅ Response ready: 24 hours of data

🔵 [ENDPOINT] /grid-status (POST)
   📥 Request received
   ✅ Status: HEALTHY
```

**Mobile Console:**

```
🏠 getGridStatus() called
   📡 Fetching: http://10.0.2.2:8000/simulate
   ✅ Response received
   ✅ Simulation received
      Supply: 28.45 kWh
      Demand: 20.00 kWh
      Battery: 50.0%
```

**Mobile Screen:**

```
Battery Level: 50%
Grid State: HEALTHY
Current Supply: 28.5 MW
Current Demand: 20.0 MW
Current Surplus: 8.5 kWh
```

---

## 📞 Still Stuck?

Please provide:

1. **Output of `ipconfig`** (to verify IP)
2. **Output of `netstat -ano | findstr :8000`** (to verify port)
3. **First 20 lines from backend startup** (to check for errors)
4. **Full mobile app error log** (from Expo console)
5. **Can you access `http://10.21.39.161:8000/health` in browser?** (YES/NO)

Share these and I can pinpoint the exact issue!
