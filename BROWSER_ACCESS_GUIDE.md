# 🌐 Accessing G-Balancer Backend in Browser

## ✅ Backend is Running!

Your backend is now running in WSL on **port 8000**.

---

## 🔗 Open in Browser

### **Option 1: Interactive API Docs (Recommended)**

```
http://localhost:8000/docs
```

- ✅ Full Swagger UI
- ✅ Test all endpoints interactively
- ✅ See request/response examples
- ✅ Most user-friendly

### **Option 2: Alternative API Docs**

```
http://localhost:8000/redoc
```

- ReDoc alternative documentation
- Clean, formatted API reference

### **Option 3: Raw Data Endpoints**

```
http://localhost:8000/simulate
```

- Returns JSON grid data
- Used by mobile app
- Can view raw response

---

## 🎯 What You'll See

### At http://localhost:8000/docs

You'll see a page like this:

```
┌─────────────────────────────────────────┐
│      FastAPI - Swagger UI               │
│  G-Balancer Energy Grid Management      │
├─────────────────────────────────────────┤
│                                         │
│  ENDPOINTS:                             │
│  ✅ GET /simulate                       │
│  ✅ POST /grid-status                   │
│  ✅ POST /predict                       │
│  ✅ GET /forecast                       │
│  ✅ GET /dashboard                      │
│  ✅ WS /ws/grid/{city}                  │
│  ✅ GET /docs                           │
│                                         │
│  [Try it out] buttons for each endpoint │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🧪 Testing an Endpoint

### Click "GET /simulate"

```
▼ GET /simulate
  Get current grid status and simulation data

  [Try it out] [Execute]
```

### After clicking "Execute"

```
Response:
{
  "battery_percentage": 67.5,
  "total_supply": 450.2,
  "demand": 380.5,
  "solar": 185.3,
  "wind": 120.8
}
```

---

## 🚀 Troubleshooting

### If page doesn't load:

**1️⃣ Check if backend is running:**

```powershell
# Run in PowerShell:
wsl bash -c "ps aux | grep uvicorn"
```

Should show process running

**2️⃣ Restart backend:**

```powershell
# Kill all processes
wsl bash -c "killall -9 python3"

# Start fresh
wsl bash -c "cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000"
```

**3️⃣ Check port is not blocked:**

```bash
# Inside WSL:
curl http://localhost:8000/docs
```

Should return HTML

**4️⃣ Check firewall:**

- Windows Defender Firewall might block port 8000
- Check: Settings → Privacy & Security → Windows Defender Firewall
- Ensure "Allow an app through firewall" includes Python

---

## 📱 Mobile App Connection

While backend is running at `http://localhost:8000`:

```bash
cd mobile/gbalancer
npx expo start
# Press 'a' for Android Emulator
```

Mobile will connect to: `http://10.21.39.161:8000/simulate`

---

## 💡 Tips

- **Keep terminal open** - Backend runs in the terminal window
- **View logs** - All requests logged in terminal output
- **Auto-refresh** - Mobile refreshes every 30 seconds automatically
- **Test endpoints** - Use `/docs` Swagger UI to test all endpoints

---

## ✨ You're Ready!

✅ Backend running on http://localhost:8000
✅ API docs at http://localhost:8000/docs
✅ Data available at http://localhost:8000/simulate
✅ Mobile ready to connect

**Open your browser and go to: http://localhost:8000/docs** 🎉
