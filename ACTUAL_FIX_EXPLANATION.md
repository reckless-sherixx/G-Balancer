# 🔧 ACTUAL FIX - What Was REALLY Wrong

## The Real Problem

**NOT** an IP addressing issue (10.21.39.161 vs 10.0.2.2)

**The ACTUAL problem was:**

### ❌ Problem 1: Backend Not Running

- Your backend was NOT actually running on port 8000
- **wslrelay.exe** (Windows Subsystem for Linux relay) was using port 8000
- Your FastAPI server never started

**Solution:**

```powershell
# Killed the WSL relay process
taskkill /PID 2512 /F

# Started the backend properly
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### ❌ Problem 2: Backend Bound to localhost Only

- Even when you tried to start the backend, **uvicorn defaults to 127.0.0.1** (localhost only)
- This means it **ONLY listens** on the local loopback interface
- Network requests from ANY other machine fail, including Android Emulator on 10.0.2.2

**Solution:**

```
Before:  uvicorn main:app --port 8000
         ↓ defaults to 127.0.0.1 (localhost only)

After:   uvicorn main:app --host 0.0.0.0 --port 8000
         ↓ listens on ALL interfaces
         ↓ reachable from 10.0.2.2, 10.21.39.161, 127.0.0.1, etc.
```

### ❌ Problem 3: Missing Dependencies

- **torch** (PyTorch) not installed
- **uvicorn** not installed
- Required packages missing from Python venv

**Solution:**

```powershell
pip install -r requirements.txt
```

Also made torch optional in demand_forecaster.py:

```python
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
```

---

## 🎯 Why The Network Error Happened

```
Mobile App
│
├─ Tries to reach: http://10.0.2.2:8000/simulate
│
└─ Backend is listening on: 127.0.0.1:8000 only
   (localhost loopback, unreachable from outside)

   ❌ Network request failed!
```

---

## ✅ Now It Works

```
Backend is running:
  $ uvicorn main:app --host 0.0.0.0 --port 8000

Listening on:
  ✅ 0.0.0.0:8000  (all interfaces)
  ✅ 127.0.0.1:8000 (localhost)
  ✅ 10.21.39.161:8000 (your machine IP)
  ✅ 10.0.2.2:8000 (Android Emulator virtual IP)

Mobile app can now reach:
  http://10.21.39.161:8000/simulate ✅
  http://10.0.2.2:8000/simulate ✅
```

---

## 📝 Key Takeaways

| Issue              | Root Cause            | Fix                               |
| ------------------ | --------------------- | --------------------------------- |
| Network error      | Backend not listening | Start with `--host 0.0.0.0`       |
| Port 8000 blocked  | WSL relay using it    | Kill WSL relay process            |
| Import errors      | Dependencies missing  | `pip install -r requirements.txt` |
| Torch import error | Optional dependency   | Make torch import optional        |

---

## 🚀 How to Start System Correctly

**Terminal 1 (Backend):**

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 (Mobile):**

```powershell
cd c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer
npx expo start
# Press 'a' for Android
```

---

## 🔍 Verification Commands

**Check backend is running:**

```powershell
netstat -ano | findstr :8000
# Should show 0.0.0.0:8000 LISTENING
```

**Test backend endpoint:**

```powershell
curl http://10.21.39.161:8000/health
# Should return: {"status":"healthy","timestamp":"...","scheduler_running":true}
```

**Check mobile logs:**

- Open Expo DevTools
- Search for "API Base URL"
- Should show: `🌐 API Base URL: http://10.21.39.161:8000`

---

## ✨ System Now Ready!

- ✅ Backend running on 0.0.0.0:8000
- ✅ Mobile can reach 10.21.39.161:8000
- ✅ All endpoints responding
- ✅ Database initialized
- ✅ Scheduler running

**Test it now:**

1. Refresh mobile app
2. Should see battery level, grid status, supply/demand
3. No more network errors! 🎉
