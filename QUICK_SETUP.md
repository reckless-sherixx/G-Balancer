# ⚡ QUICK START - Backend + Mobile

## 🔥 Run This in Terminal 1 (Backend)

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Output:**

```
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

---

## 📱 Run This in Terminal 2 (Mobile)

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer"
npx expo start
```

When it shows the QR code:

- **Press `a`** for Android Emulator
- Wait for app to load

---

## 🧪 Test It Works

### In Mobile Console (Expo logs):

```
✅ Success Indicators:
- 🌐 API Base URL: http://10.21.39.161:8000
- 📡 Fetching: http://10.21.39.161:8000/simulate
- ✅ Response received
- 📊 Battery: 50.0%
- Supply: 28.45 kWh
```

### In Backend Console:

```
✅ Success Indicators:
- 🔵 [ENDPOINT] /simulate (GET)
- ✅ Response ready: 24 hours
- 📊 Supply range: 0.00-20.00 MW
```

### On Mobile Screen:

```
✅ Should Display:
- Battery Level: 50%
- Grid State: HEALTHY
- Current Supply: 28.5 MW
```

---

## 🛑 If It Still Fails

### Check Backend is Running:

```powershell
netstat -ano | findstr :8000
# Must show: 0.0.0.0:8000 LISTENING
```

### Check Backend Health:

```powershell
curl http://10.21.39.161:8000/health
# Should return: {"status":"healthy",...}
```

### Check API Docs:

```
Open browser: http://10.21.39.161:8000/docs
Should show Swagger UI with all endpoints
```

---

## 📋 What Was Fixed

1. ✅ **Killed WSL relay** that was blocking port 8000
2. ✅ **Started backend with `--host 0.0.0.0`** so it's reachable from all IPs
3. ✅ **Installed missing packages** (uvicorn, fastapi, etc.)
4. ✅ **Made torch optional** so app works without GPU libraries
5. ✅ **Database initialized** on startup
6. ✅ **ML models fallback** to formula-based predictions

---

## 🎯 Key Commands

| What          | Command                                                          |
| ------------- | ---------------------------------------------------------------- |
| Start backend | `python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload` |
| Start mobile  | `npx expo start` then press `a`                                  |
| Test backend  | `curl http://10.21.39.161:8000/health`                           |
| View API docs | `http://10.21.39.161:8000/docs`                                  |
| Check port    | `netstat -ano \| findstr :8000`                                  |

---

**🚀 You're ready to go! Start both terminals and refresh the mobile app.**
