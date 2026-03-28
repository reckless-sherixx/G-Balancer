# 🐧 Running Backend from WSL (Windows Subsystem for Linux)

## Current Problem

You're in WSL (good!) but in the wrong directory:

```bash
# ❌ Wrong - You're here
/mnt/c/Users/KIIT/Documents/G-Balancer
# Error: "Could not import module main"

# ✅ Right - You need to be here
/mnt/c/Users/KIIT/Documents/G-Balancer/backend
```

---

## 🚀 Correct Commands for WSL

### Step 1: Navigate to Backend Directory

```bash
cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend
```

### Step 2: Check Python is Available

```bash
python3 --version
# Should show: Python 3.x.x
```

### Step 3: Install Requirements (if not done)

```bash
pip3 install -r requirements.txt
```

### Step 4: Start Backend on All Interfaces

```bash
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Expected Output:**

```
INFO:     Will watch for changes in these directories: ['/mnt/c/Users/KIIT/Documents/G-Balancer/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXX] using WatchFiles
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.

======================================================================
🚀 Starting Intelligent Energy Grid Balancer v1.0.0
...
✅ App startup complete!
======================================================================
INFO:     Application startup complete.
```

✅ **Backend is now running and reachable!**

---

## 🌐 From Windows PowerShell (Alternative)

If you prefer to use **PowerShell** instead of WSL:

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🔍 Verify Backend is Running

### From WSL:

```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy",...}
```

### From Windows PowerShell (different terminal):

```powershell
curl http://10.21.39.161:8000/health
# Should return: {"status":"healthy",...}
```

---

## 📱 Start Mobile (PowerShell)

Once backend is running, open **another terminal** in PowerShell:

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer"
npx expo start
# Then press 'a' for Android
```

---

## 🛑 Common WSL Issues

### Issue: "Could not import module main"

**Solution:** Make sure you're in the `backend` directory, not the root directory

```bash
# ❌ Wrong
cd /mnt/c/Users/KIIT/Documents/G-Balancer

# ✅ Right
cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend
```

### Issue: "No module named 'uvicorn'"

**Solution:** Install requirements

```bash
pip3 install -r requirements.txt
```

### Issue: Port 8000 already in use

**Solution:** Kill the process using port 8000

```bash
# Find process using port 8000
lsof -i :8000

# Kill it (replace XXXX with PID)
kill -9 XXXX
```

### Issue: Python3 not found

**Solution:** Use `python` instead of `python3`

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## ✅ Summary for WSL Users

| Step          | Command                                                           |
| ------------- | ----------------------------------------------------------------- |
| Navigate      | `cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend`               |
| Install deps  | `pip3 install -r requirements.txt`                                |
| Start backend | `python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload` |
| Test health   | `curl http://localhost:8000/health`                               |

---

## 🎯 Key Difference: WSL vs PowerShell

| Aspect          | WSL                   | PowerShell     |
| --------------- | --------------------- | -------------- |
| Path            | `/mnt/c/Users/...`    | `c:\Users\...` |
| Python          | `python3` or `python` | `python`       |
| Package manager | `pip3`                | `pip`          |
| Commands        | Linux/Unix style      | Windows style  |

**Both work!** Choose whichever you're comfortable with. WSL is great for Linux users, PowerShell for Windows users.

---

## 💡 Pro Tips

1. **Keep backend running:** Don't close the terminal where backend is running
2. **Separate terminals:** Use different terminal windows for backend and mobile
3. **Watch logs:** Backend logs show all requests/responses - very helpful for debugging
4. **Reload on change:** `--reload` flag auto-restarts backend when you modify code
