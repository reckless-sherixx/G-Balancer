# 🚀 WSL QUICK START - Copy & Paste These Commands

## In WSL Terminal

### Command 1: Navigate to Backend

```bash
cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend
```

### Command 2: Install Dependencies (first time only)

```bash
pip3 install -r requirements.txt
```

### Command 3: Start Backend

```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Keep this terminal open!** You should see:

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
```

---

## In PowerShell Terminal (Different Window)

### Command 4: Start Mobile App

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer"
npx expo start
```

### Then Press: `a` (in the Expo terminal)

This opens Android Emulator and loads your app.

---

## 📱 Expected Mobile Output

In Expo console, you should see:

```
📱 Platform: android
🌐 API Base URL: http://10.21.39.161:8000
🏠 getGridStatus() called
📡 Fetching: http://10.21.39.161:8000/simulate
✅ Response received
```

On mobile screen, you should see:

```
🔋 Battery Level: 50%
⚡ Grid State: HEALTHY
📊 Current Supply: 28.5 MW
📈 Current Demand: 35.2 MW
```

---

## ✅ Verification (in another WSL terminal)

```bash
curl http://localhost:8000/health
```

Should return:

```json
{
  "status": "healthy",
  "timestamp": "2026-03-28T...",
  "scheduler_running": true
}
```

---

## 🎯 Complete Workflow

1. **WSL Terminal 1:** Run backend setup (Commands 1-3)
2. **PowerShell Terminal:** Run mobile (Command 4 + press 'a')
3. **WSL Terminal 2 (optional):** Test with curl
4. **Result:** Mobile app shows grid data! 🎉

---

## 🛑 If Something Goes Wrong

### Backend won't start - "Could not import module main"

**Check you're in the right directory:**

```bash
pwd
# Should show: /mnt/c/Users/KIIT/Documents/G-Balancer/backend

# If not:
cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend
```

### Port 8000 in use

```bash
lsof -i :8000
kill -9 <PID>
```

Then restart backend.

### Module not found errors

```bash
pip3 install -r requirements.txt
```

---

## 📚 More Info

- **WSL Setup:** See `WSL_SETUP_GUIDE.md`
- **Fix Details:** See `ACTUAL_FIX_EXPLANATION.md`
- **PowerShell Setup:** See `COMMANDS_TO_RUN.md`
