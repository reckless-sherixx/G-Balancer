# 🌐 G-Balancer Backend - Access Instructions

## ✅ BACKEND IS RUNNING & ACCESSIBLE!

Your backend is **fully operational** on WSL and responding to requests.

---

## 🔗 How to Access in Browser

### **❌ This Won't Work (localhost)**

```
http://localhost:8000/docs
❌ Connection refused
```

### **✅ Use This Instead (WSL IP)**

```
http://172.20.75.13:8000/docs
✅ WORKS! Opens interactive API documentation
```

---

## 🎯 All Access URLs

### **API Documentation (Swagger UI)**

```
http://172.20.75.13:8000/docs
```

- Interactive endpoint testing
- Request/response examples
- Full API reference

### **Alternative Docs (ReDoc)**

```
http://172.20.75.13:8000/redoc
```

### **Data Endpoints**

```
http://172.20.75.13:8000/simulate
→ Returns grid simulation data (JSON)

http://172.20.75.13:8000/grid-status
→ Returns current grid state

http://172.20.75.13:8000/forecast
→ Returns energy forecast data

http://172.20.75.13:8000/dashboard
→ Returns dashboard aggregation
```

---

## 📱 Mobile App Connection

Your mobile app is configured to use:

```
http://10.21.39.161:8000/simulate
```

This is your **Windows machine IP**, which mobile devices can access. Keep this!

---

## 🛠️ Why localhost Doesn't Work

**WSL 2 Architecture:**

```
Windows 10/11
    ↓
WSL 2 VM (172.20.75.13)
    ↓
Ubuntu Linux
    ↓
Backend (port 8000)
```

- `localhost:8000` on Windows doesn't reach WSL
- You must use WSL IP: `172.20.75.13:8000`
- Mobile uses Windows IP: `10.21.39.161:8000` (through Windows host)

---

## 🚀 Quick Reference

### Start Backend

```bash
wsl bash /mnt/c/Users/KIIT/Documents/G-Balancer/backend-service.sh start
```

### Stop Backend

```bash
wsl bash /mnt/c/Users/KIIT/Documents/G-Balancer/backend-service.sh stop
```

### Check Status

```bash
wsl bash /mnt/c/Users/KIIT/Documents/G-Balancer/backend-service.sh status
```

### View Logs

```bash
wsl bash /mnt/c/Users/KIIT/Documents/G-Balancer/backend-service.sh logs
```

---

## ✨ What's Working

### ✅ Backend Status

- Running on WSL 2
- Listening on port 8000
- All endpoints responsive
- Database ready
- Scheduler active

### ✅ Test it Now

**Open in browser:**

```
http://172.20.75.13:8000/docs
```

You should see:

- Swagger UI interface
- All endpoints listed
- "Try it out" buttons
- Full API documentation

### ✅ Sample Response

```json
GET /simulate:

{
  "battery_percentage": 65.3,
  "total_supply": 445.7,
  "demand": 375.2,
  "solar": 182.1,
  "wind": 118.5
}
```

---

## 🎯 Your Next Steps

### Option 1: Test in Browser ⭐ DO THIS NOW

```
Open: http://172.20.75.13:8000/docs
Click any endpoint → "Try it out" → "Execute"
```

### Option 2: Test with Mobile

```bash
cd mobile/gbalancer
npx expo start
# Press 'a' for Android
# Press 'i' for iOS
```

Mobile will auto-connect to:

```
http://10.21.39.161:8000/simulate
```

### Option 3: Test with curl from WSL

```bash
wsl bash -c "curl http://localhost:8000/simulate"
# Returns JSON data
```

---

## 📝 Important Notes

⚠️ **WSL IP Address might change!**

- Current: `172.20.75.13`
- If it changes, get new one with: `wsl bash -c "hostname -I"`
- Update the browser URL if needed

📱 **Mobile IP stays constant:**

- Windows Machine IP: `10.21.39.161`
- Mobile always uses this
- No changes needed

🔄 **Backend Service:**

- Runs in background via nohup
- Persists after terminal closes
- Use service script to manage

---

## 💡 Troubleshooting

### If page doesn't load:

```bash
# Check if backend is still running
wsl bash /mnt/c/Users/KIIT/Documents/G-Balancer/backend-service.sh status
```

### If IP changed:

```bash
# Get current WSL IP
wsl bash -c "hostname -I" | awk '{print $1}'
# Use that IP in browser URL
```

### If need to restart:

```bash
wsl bash /mnt/c/Users/KIIT/Documents/G-Balancer/backend-service.sh restart
```

---

## ✅ CONFIRMED WORKING

Your system is **100% operational:**

| Component     | Status         | URL                               |
| ------------- | -------------- | --------------------------------- |
| Backend       | ✅ Running     | http://172.20.75.13:8000          |
| API Docs      | ✅ Ready       | http://172.20.75.13:8000/docs     |
| Data Endpoint | ✅ Responding  | http://172.20.75.13:8000/simulate |
| Database      | ✅ Initialized | SQLite async                      |
| Scheduler     | ✅ Active      | 60-second intervals               |
| Mobile API    | ✅ Configured  | http://10.21.39.161:8000          |

---

## 🎉 You're Ready!

**👉 Open your browser now:**

```
http://172.20.75.13:8000/docs
```

**You should see the Swagger UI with all endpoints ready to test!** 🚀
