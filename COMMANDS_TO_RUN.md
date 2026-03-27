# 🚀 START HERE - Exact Commands

## Terminal 1: Start Backend

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
INFO:     Application startup complete.
⚡ Auto-balanced | Demand: 3464 MW | Solar: 0 MW | Status: normal
```

✅ **Keep this running!**

---

## Terminal 2: Start Mobile

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer"
npx expo start
```

When you see the Expo QR code:

```
Press 'a' to open in Android Emulator
```

**Expected Output in Expo Console:**

```
📱 Platform: android
🌐 API Base URL: http://10.21.39.161:8000
🏠 getGridStatus() called
📡 Fetching: http://10.21.39.161:8000/simulate
✅ Response received
```

✅ **Mobile app should now show grid data!**

---

## Mobile Screen Should Display

```
🔋 Battery Level: 50%
⚡ Grid State: HEALTHY
📊 Current Supply: 28.5 MW
📈 Current Demand: 35.2 MW
🌱 Renewable: 10.3 MW
```

---

## ✅ Success Checklist

- [ ] Terminal 1: Backend startup completes with "✅ App startup complete!"
- [ ] Terminal 1: Console shows "⚡ Auto-balanced | Demand: ..."
- [ ] Terminal 2: Expo starts successfully
- [ ] Terminal 2: Shows "Press 'a' | open Android"
- [ ] Press 'a' in Expo console
- [ ] Android Emulator launches
- [ ] Expo app loads
- [ ] Expo console shows API Base URL: http://10.21.39.161:8000
- [ ] Mobile screen displays Battery Level, Grid State, Supply/Demand
- [ ] No error messages in either console

---

## 🛑 If Something Goes Wrong

### Backend Won't Start

**Check if port 8000 is free:**

```powershell
netstat -ano | findstr :8000
```

If it shows a process using port 8000:

```powershell
taskkill /PID <PID> /F
```

Then restart backend command above.

### Mobile Shows "Network Error"

**Check backend is running:**

```powershell
curl http://10.21.39.161:8000/health
# Should return: {"status":"healthy",...}
```

**Check backend logs** - Look at Terminal 1 for errors

### Missing Packages

If you see package errors:

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\backend"
pip install -r requirements.txt
```

---

## 📚 Documentation

- **QUICK_SETUP.md** - Setup and verification
- **ACTUAL_FIX_EXPLANATION.md** - What was wrong and how it was fixed
- **FIX_SUMMARY.md** - Complete fix summary

---

## 🎯 What Was Fixed

✅ Backend now bound to 0.0.0.0 (all interfaces)
✅ WSL relay process killed (freed port 8000)
✅ All dependencies installed
✅ Torch made optional
✅ Import paths fixed

**Result: System fully operational!**
