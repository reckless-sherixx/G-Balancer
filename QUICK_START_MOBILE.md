# 🚀 Quick Start - Mobile & Backend Integration

## Problem: "Could not fetch one or more endpoints - network request failed"

This guide will help you get the backend running and connected to the mobile app.

---

## Step 1: Start the Backend (Windows PowerShell)

```powershell
# Navigate to backend directory
cd c:\Users\KIIT\Documents\G-Balancer\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload --port 8000
```

**Expected output:**

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete
```

✅ **Backend is now running locally on http://localhost:8000**

---

## Step 2: Verify Backend is Working

Open this in your browser (while backend is running):

```
http://localhost:8000/health
```

You should see:

```json
{
  "status": "healthy",
  "timestamp": "2026-03-28T...",
  "scheduler_running": true
}
```

---

## Step 3: Get Your Machine's IP Address

Open a **new PowerShell window** and run:

```powershell
ipconfig
```

Look for your IPv4 address. It will look like one of these:

- `192.168.1.100` (WiFi)
- `10.0.0.5` (Corporate network)
- `172.16.x.x` (Docker/VM)

**Save this IP address** - you'll need it in the next step.

---

## Step 4: Update Mobile App Configuration

Edit the file: `mobile/gbalancer/features/grid/api.ts`

**Find this line (around line 14):**

```typescript
const DEFAULT_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
```

**Keep it as-is!** This configuration:

- ✅ Android Emulator → uses `http://10.0.2.2:8000` (special IP for emulator)
- ✅ iOS Simulator → uses `http://localhost:8000`
- ✅ Physical device → edit to use your IP from Step 3

If using a **physical device**, change to:

```typescript
const DEFAULT_BASE_URL = "http://192.168.1.100:8000"; // Replace with YOUR IP
```

---

## Step 5: Start the Mobile App

Open **another PowerShell window**:

```powershell
# Navigate to mobile app directory
cd c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer

# Install dependencies (first time only)
npm install

# Start Expo development server
npx expo start
```

**Expected output:**

```
Starting Metro bundler...
...
⚠️  Metro bundler is ready!

Press:
  a   - open Android Emulator
  i   - open iOS Simulator
  w   - open web
  r   - reload app
  q   - quit
```

---

## Step 6: Open Mobile App in Emulator

### For Android Emulator:

```
In the Expo terminal, press: a
```

The app will open in Android emulator and automatically try to connect to `http://10.0.2.2:8000`

### For iOS Simulator:

```
In the Expo terminal, press: i
```

The app will open in iOS simulator and automatically try to connect to `http://localhost:8000`

---

## Step 7: Verify Connection

Once the mobile app opens:

1. **Look for the "Refresh Data" button** at the top
2. **Click it** to fetch data from the backend
3. **Check the result:**
   - ✅ **Success**: You see grid data (Battery Level, Supply, Demand, etc.)
   - ❌ **Failure**: You see "Could not fetch one or more endpoints"

### If it fails:

Check the **browser console** or **Metro logs** for network errors:

```
🔴 Network error on http://10.0.2.2:8000/simulate: TypeError: Network request failed
```

---

## Step 8: Run Integration Tests (Optional)

In a **third PowerShell window**:

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\backend

# Make sure venv is activated
.\venv\Scripts\Activate.ps1

# Run the test script
python test_integration.py
```

**Expected output:**

```
🧪 G-BALANCER BACKEND INTEGRATION TEST
...
1️⃣  Testing /health endpoint...
   ✅ Status: 200
   ✅ Server Status: healthy
...
🎉 ALL TESTS PASSED! Backend is ready for mobile integration.
```

---

## Troubleshooting

### ❌ "Could not fetch one or more endpoints"

**Cause 1: Backend not running**

- Solution: Check that you ran `uvicorn main:app --reload --port 8000` in Step 1
- Verify: Open `http://localhost:8000/health` in browser

**Cause 2: Wrong IP address**

- Solution: Update `api.ts` with your correct machine IP from Step 3
- Verify: Run `ipconfig` again and double-check the IPv4 address

**Cause 3: Firewall blocking port 8000**

- Solution: Check Windows Defender Firewall settings
- Alternative: Use a different port: `uvicorn main:app --reload --port 8001`

**Cause 4: Dependencies missing**

- Solution: Run `pip install -r requirements.txt` again
- Verify: Check for error messages in backend terminal

### ❌ "Metro bundler not found"

**Solution:**

```powershell
cd mobile/gbalancer
npm install
npx expo start
```

### ❌ Android Emulator can't connect

**Try Method 1: Emulator special IP**

```typescript
const DEFAULT_BASE_URL = "http://10.0.2.2:8000"; // Android emulator special IP
```

**Try Method 2: Your machine's actual IP**

```powershell
ipconfig  # Get your IPv4 address
```

```typescript
const DEFAULT_BASE_URL = "http://192.168.1.100:8000"; // Replace with your IP
```

**Try Method 3: Check emulator network**

```powershell
# In Android emulator, open Settings > Network > WiFi and note the IP
# Use that IP in the app configuration
```

---

## ✅ Success Checklist

- [ ] Backend running: `uvicorn main:app --reload --port 8000`
- [ ] Backend responds: `http://localhost:8000/health` works
- [ ] Got machine IP: `ipconfig` shows IPv4 address
- [ ] Updated `api.ts`: Correct IP for your platform
- [ ] Mobile app running: `npx expo start`
- [ ] Emulator/simulator opened: Press 'a' or 'i'
- [ ] Clicked "Refresh Data" in app
- [ ] See grid data: Battery, Supply, Demand, etc.

---

## 📱 What You'll See on Mobile

Once connected, you should see:

```
┌─────────────────────────────────────────┐
│ Grid Operations Center                  │
│ Live ML insight for supply-demand...    │
│ API: http://10.0.2.2:8000              │
│ [Refresh Data]                          │
└─────────────────────────────────────────┘

Battery Level: 50%
Grid State: HEALTHY
Current Supply: 28.5 MW
Current Demand: 20.0 MW
Current Surplus: 8.5 kWh

Forecast Snapshot (Next 12 points)
[Chart showing supply/demand curves]
```

---

## 📞 Still Having Issues?

1. **Check backend logs** - look for error messages in the terminal where you ran `uvicorn`
2. **Check Metro logs** - look for network errors in Expo terminal
3. **Run test script** - `python test_integration.py` to verify endpoints work
4. **Check network** - `ipconfig` to verify your IP address is correct
5. **Restart everything** - kill all terminals, start fresh from Step 1

---

## 🎯 Next Steps

Once the mobile app successfully shows grid data:

1. **Explore the dashboard** - view forecasts and metrics
2. **Train ML models** (optional) - for better predictions
   ```powershell
   cd backend/ml/src
   python preprocess.py
   python forecaster.py
   python recommender.py
   ```
3. **Monitor backend logs** - see how predictions are being made
4. **Customize thresholds** - adjust grid action rules in services/

---

**Need help?** Check the detailed docs:

- `NETWORK_DIAGNOSTICS.md` - detailed network troubleshooting
- `FINAL_IMPLEMENTATION.md` - complete architecture overview
- `MOBILE_INTEGRATION_GUIDE.md` - detailed mobile integration steps
