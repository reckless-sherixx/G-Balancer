# 📚 DOCUMENTATION INDEX

**G-Balancer System Documentation**  
**Last Updated:** March 28, 2026

---

## 🎯 Start Here

### For Immediate Setup (5 minutes)

1. **👉 [`COMMANDS_TO_RUN.md`](COMMANDS_TO_RUN.md)** - Exact copy-paste commands
   - Backend startup command
   - Mobile startup command
   - Expected output
   - Success checklist

### For WSL Users (Linux Subsystem)

2. **👉 [`WSL_QUICK_START.md`](WSL_QUICK_START.md)** - Quick WSL setup
   - Copy-paste WSL commands
   - Common WSL issues & fixes
   - Path differences (WSL vs PowerShell)

---

## 📖 Comprehensive Guides

### Understanding the System

3. **[`COMPLETE_SYSTEM_GUIDE.md`](COMPLETE_SYSTEM_GUIDE.md)** - Full system documentation
   - What the system does
   - Architecture diagram
   - Project structure
   - API endpoints
   - Database schema
   - Data sources
   - Request/response examples
   - Debugging tips
   - Troubleshooting

### Setup & Configuration

4. **[`QUICK_SETUP.md`](QUICK_SETUP.md)** - Setup guide
   - Verification commands
   - Expected console output
   - Reference table

5. **[`WSL_SETUP_GUIDE.md`](WSL_SETUP_GUIDE.md)** - Complete WSL guide
   - WSL vs PowerShell differences
   - Installation in WSL
   - Common WSL issues
   - Pro tips

---

## 🔧 Troubleshooting & Fixes

### Understanding What Was Fixed

6. **[`ACTUAL_FIX_EXPLANATION.md`](ACTUAL_FIX_EXPLANATION.md)** - Detailed fix explanation
   - What was actually wrong (NOT IP addresses!)
   - Root causes
   - Why network error happened
   - Key takeaways

7. **[`FIX_SUMMARY.md`](FIX_SUMMARY.md)** - Fix summary
   - Root cause analysis
   - Fixes applied
   - Current system status
   - Quick reference table

---

## 📊 Implementation Details

### Original Implementation Guides

8. **`documentation/IMPLEMENTATION_GUIDE.md`** - Architecture & design
   - System components
   - Service layer design
   - Database design
   - ML integration

9. **`documentation/ML_TRAINING_GUIDE.md`** - ML model training
   - Data collection
   - Feature engineering
   - Model training
   - Model evaluation

10. **`documentation/QUICK_START.md`** - Original quick start
    - Project setup
    - Development environment
    - Running the system

---

## 🎯 By Use Case

### "I just want to run it"

→ Start with **[`COMMANDS_TO_RUN.md`](COMMANDS_TO_RUN.md)** (5 min)

### "I'm on Windows (PowerShell)"

→ Follow **[`COMMANDS_TO_RUN.md`](COMMANDS_TO_RUN.md)**

### "I'm on Linux/WSL"

→ Follow **[`WSL_QUICK_START.md`](WSL_QUICK_START.md)**

### "I want to understand everything"

→ Read **[`COMPLETE_SYSTEM_GUIDE.md`](COMPLETE_SYSTEM_GUIDE.md)**

### "Something is broken"

→ Check **[`ACTUAL_FIX_EXPLANATION.md`](ACTUAL_FIX_EXPLANATION.md)** and **[`COMPLETE_SYSTEM_GUIDE.md`](COMPLETE_SYSTEM_GUIDE.md)**

### "I want to train ML models"

→ See **`documentation/ML_TRAINING_GUIDE.md`**

### "I need to understand the architecture"

→ Read **[`COMPLETE_SYSTEM_GUIDE.md`](COMPLETE_SYSTEM_GUIDE.md)** or **`documentation/IMPLEMENTATION_GUIDE.md`**

---

## 🗂️ File Organization

```
G-Balancer/
├── 📍 COMMANDS_TO_RUN.md               ← START HERE
├── 📍 WSL_QUICK_START.md               ← START HERE (WSL users)
├── 📍 QUICK_SETUP.md                   ← Verification guide
├── 📍 WSL_SETUP_GUIDE.md               ← Full WSL setup
├── 📍 COMPLETE_SYSTEM_GUIDE.md         ← Full documentation
├── 📍 ACTUAL_FIX_EXPLANATION.md        ← Technical fix details
├── 📍 FIX_SUMMARY.md                   ← Fix overview
├── 📍 DOCUMENTATION_INDEX.md           ← This file
│
├── documentation/                      ← Original docs
│   ├── QUICK_START.md
│   ├── IMPLEMENTATION_GUIDE.md
│   └── ML_TRAINING_GUIDE.md
│
├── backend/                            ← Backend code
│   ├── main.py
│   ├── requirements.txt
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── database/
│   └── ml/
│
└── mobile/gbalancer/                   ← Mobile app
    ├── package.json
    ├── app/
    └── features/grid/
```

---

## 📋 Quick Reference

### Common Commands

**Backend (PowerShell):**

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Backend (WSL):**

```bash
cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Mobile:**

```powershell
cd "c:\Users\KIIT\Documents\G-Balancer\mobile\gbalancer"
npx expo start
# Press 'a'
```

**Test Health:**

```bash
curl http://10.21.39.161:8000/health
```

**View Docs:**

```
http://10.21.39.161:8000/docs
```

---

## ✅ Verification Checklist

Before you start, verify:

- [ ] You have Python 3.8+ installed
- [ ] You have Node.js installed (for mobile)
- [ ] You have Expo CLI: `npm install -g expo-cli`
- [ ] You can access the G-Balancer directory
- [ ] Port 8000 is available

---

## 🚀 TL;DR - Quick Start

1. Read **[`COMMANDS_TO_RUN.md`](COMMANDS_TO_RUN.md)** (2 min)
2. Run the commands (5 min)
3. Open mobile app
4. Done! 🎉

For more details, see **[`COMPLETE_SYSTEM_GUIDE.md`](COMPLETE_SYSTEM_GUIDE.md)** or **[`ACTUAL_FIX_EXPLANATION.md`](ACTUAL_FIX_EXPLANATION.md)**

---

## 📞 Document Categories

### 🔴 Critical (Read First)

- `COMMANDS_TO_RUN.md` - How to run everything
- `ACTUAL_FIX_EXPLANATION.md` - What was wrong (if you got the error)

### 🟡 Important (Read Next)

- `COMPLETE_SYSTEM_GUIDE.md` - Full system understanding
- `QUICK_SETUP.md` - Verification steps

### 🟢 Helpful (Reference)

- `WSL_SETUP_GUIDE.md` - If using WSL
- `FIX_SUMMARY.md` - If interested in fixes

### 🔵 Advanced (Optional)

- `documentation/IMPLEMENTATION_GUIDE.md` - Architecture
- `documentation/ML_TRAINING_GUIDE.md` - ML models

---

## 🎯 Navigation Tips

- **Confused about setup?** → `COMMANDS_TO_RUN.md`
- **Got an error?** → `ACTUAL_FIX_EXPLANATION.md`
- **Want to understand the system?** → `COMPLETE_SYSTEM_GUIDE.md`
- **Using WSL?** → `WSL_QUICK_START.md`
- **Want to verify it works?** → `QUICK_SETUP.md`
- **Need API documentation?** → `http://10.21.39.161:8000/docs` (after backend starts)

---

## 📅 Document History

| Document                  | Created | Last Updated | Status     |
| ------------------------- | ------- | ------------ | ---------- |
| COMMANDS_TO_RUN.md        | Mar 28  | Mar 28       | ✅ Current |
| COMPLETE_SYSTEM_GUIDE.md  | Mar 28  | Mar 28       | ✅ Current |
| ACTUAL_FIX_EXPLANATION.md | Mar 28  | Mar 28       | ✅ Current |
| FIX_SUMMARY.md            | Mar 28  | Mar 28       | ✅ Current |
| WSL_QUICK_START.md        | Mar 28  | Mar 28       | ✅ Current |
| WSL_SETUP_GUIDE.md        | Mar 28  | Mar 28       | ✅ Current |
| QUICK_SETUP.md            | Mar 27  | Mar 28       | ✅ Updated |

---

## 🎓 Learning Path

**5-Minute Path:**

1. `COMMANDS_TO_RUN.md`
2. Run the commands
3. See it work!

**30-Minute Path:**

1. `COMMANDS_TO_RUN.md`
2. `COMPLETE_SYSTEM_GUIDE.md` (skim)
3. `ACTUAL_FIX_EXPLANATION.md` (if you got the error)
4. Run and explore

**Full Understanding Path:**

1. `COMPLETE_SYSTEM_GUIDE.md` (full read)
2. `ACTUAL_FIX_EXPLANATION.md` (understand the fix)
3. `documentation/IMPLEMENTATION_GUIDE.md` (architecture)
4. `documentation/ML_TRAINING_GUIDE.md` (if interested in ML)
5. Run and explore the code

---

## ✨ Key Insights

### What Was Fixed

- ✅ Backend now running on `0.0.0.0:8000` (all interfaces)
- ✅ Port 8000 freed from WSL relay
- ✅ All dependencies installed
- ✅ Torch made optional
- ✅ Import paths fixed

### What Works Now

- ✅ Backend reachable from mobile on 10.21.39.161:8000
- ✅ All endpoints responding
- ✅ Database initialized
- ✅ Scheduler running
- ✅ Real-time data flowing

### Why It Works

- Backend listens on 0.0.0.0 (all interfaces)
- Mobile can reach 10.21.39.161:8000
- No import errors
- All dependencies available
- Formula-based fallback for ML

---

**🚀 Ready to start? Go to [`COMMANDS_TO_RUN.md`](COMMANDS_TO_RUN.md)**
