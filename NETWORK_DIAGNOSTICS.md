# Network Diagnostics & Integration Troubleshooting

## Issue: "Could not fetch one or more endpoints - network request failed"

This error occurs when the mobile app cannot reach the backend API. Follow these steps to diagnose and fix.

---

## 1. **Verify Backend is Running**

### On Windows PowerShell:

```powershell
# Navigate to backend directory
cd c:\Users\KIIT\Documents\G-Balancer\backend

# Activate virtual environment (if using venv)
# For Windows:
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start the backend
uvicorn main:app --reload --port 8000
```

Expected output:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete
```

---

## 2. **Test Backend Endpoints Directly**

Once the backend is running, test these endpoints in a browser or with `curl`:

### Test /simulate endpoint

```bash
curl -X GET http://localhost:8000/simulate
```

Expected response:

```json
{
  "total_supply_kwh": [0.0, 2.5, 5.0, ...],
  "demand_kwh": [20.0, 20.5, 21.0, ...],
  "battery_pct": [50.0, 50.1, 50.2, ...]
}
```

### Test /grid-status endpoint

```bash
curl -X POST http://localhost:8000/grid-status \
  -H "Content-Type: application/json" \
  -d '{
    "battery_level_pct": 50,
    "current_supply_kwh": 15,
    "current_demand_kwh": 20
  }'
```

Expected response:

```json
{
  "status": "HEALTHY",
  "recommended_action": "STABLE"
}
```

### Test /predict endpoint

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "solar_output_kwh": [0, 2, 5, 10, 12, 10, 5, 2, 0],
    "wind_output_kwh": [8, 8, 8, 8, 8, 8, 8, 8, 8],
    "demand_kwh": [20, 20, 21, 22, 23, 22, 21, 20, 20],
    "battery_level_pct": 50,
    "forecast_horizon_hours": 6
  }'
```

Expected response:

```json
{
  "recommended": ["STABLE", "STABLE", "CHARGE_BATTERY", ...],
  "source": "rule_based"
}
```

---

## 3. **Identify Your Machine's IP Address**

The mobile app needs to connect to your **machine's local IP address**, not `localhost`.

### On Windows PowerShell:

```powershell
# Method 1: Get IPv4 address
ipconfig

# Look for "IPv4 Address" under "Wireless LAN adapter" or "Ethernet adapter"
# Typically something like: 192.168.x.x or 10.x.x.x
```

### Example output:

```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

---

## 4. **Update Mobile App Configuration**

Once you have your machine's IP address, update `mobile/gbalancer/features/grid/api.ts`:

### Current (BROKEN):

```typescript
const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "http://10.21.39.161:8000"
    : "http://10.21.39.161:8000";
```

### Update to YOUR IP:

```typescript
const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "http://192.168.1.100:8000"
    : "http://192.168.1.100:8000";
```

Replace `192.168.1.100` with your actual machine IP address from step 3.

---

## 5. **Test Mobile App Connection**

### Option A: Using Expo (Android Emulator)

```bash
cd mobile/gbalancer

# Install dependencies
npm install

# Start Expo
npx expo start

# Press 'a' to open Android emulator
# If using emulator, Android maps host via 10.0.2.2
```

Update the API URL for Android emulator:

```typescript
const DEFAULT_BASE_URL = "http://10.0.2.2:8000"; // Android emulator special IP
```

### Option B: Physical Device

Update the API URL to your machine's actual IP:

```typescript
const DEFAULT_BASE_URL = "http://192.168.1.100:8000"; // Your actual machine IP
```

---

## 6. **Common Issues & Solutions**

### Issue: "Network request failed" on mobile

- **Cause**: Mobile app using wrong IP address or backend not running
- **Fix**:
  1. Verify backend is running: `http://localhost:8000/docs` in browser
  2. Get correct machine IP: `ipconfig` in PowerShell
  3. Update `api.ts` with correct IP
  4. Restart Expo: `npx expo start`

### Issue: Backend returns 404

- **Cause**: Routes not registered correctly in `main.py`
- **Fix**: Check that all routers are imported and included:
  ```python
  from routes.mobile_compat import router as mobile_router
  app.include_router(mobile_router)
  ```

### Issue: CORS errors

- **Cause**: Frontend and backend on different domains
- **Fix**: Backend already has CORS middleware enabled:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],  # Allow all origins
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

### Issue: Android Emulator can't reach host

- **Solution**: Use `http://10.0.2.2:8000` (Android emulator special IP for host machine)
- **Alternative**: Use `http://192.168.1.100:8000` (your actual machine IP on WiFi)

### Issue: iOS Simulator can't reach host

- **Solution**: Use `http://localhost:8000` or `http://192.168.1.100:8000` (machine IP)

---

## 7. **Quick Verification Checklist**

- [ ] Backend running: `uvicorn main:app --reload --port 8000`
- [ ] Tested `/simulate` endpoint in browser: `http://localhost:8000/simulate`
- [ ] Got your machine's IP address: `ipconfig` command
- [ ] Updated `api.ts` with correct IP address
- [ ] Restarted mobile app: `npx expo start`
- [ ] Mobile app can now fetch data without errors

---

## 8. **Detailed Backend Startup**

If you're still having issues, start the backend with full debugging:

```powershell
# Navigate to backend
cd c:\Users\KIIT\Documents\G-Balancer\backend

# Activate venv
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Start with verbose logging
uvicorn main:app --reload --port 8000 --log-level debug
```

Watch for error messages that indicate:

- Missing dependencies (install with `pip install -r requirements.txt`)
- Port already in use (use `--port 8001` instead)
- Import errors (check `PYTHONPATH` or file structure)

---

## 9. **API Endpoints Summary**

| Endpoint       | Method | Purpose                                  | Mobile App Usage                   |
| -------------- | ------ | ---------------------------------------- | ---------------------------------- |
| `/simulate`    | GET    | Get 24-hour supply/demand/battery arrays | `getForecast()`, `getGridStatus()` |
| `/grid-status` | POST   | Get current grid status + action         | `getGridStatus()`                  |
| `/predict`     | POST   | Get recommended actions for given arrays | `getPrediction()`                  |
| `/forecast`    | GET    | Get detailed forecast (fallback)         | `getForecast()`                    |

---

## 10. **Test Integration Script**

Save this as `test_integration.py` in the backend directory:

```python
#!/usr/bin/env python3
import asyncio
import httpx
import sys

async def test_backend():
    base_url = "http://localhost:8000"

    print("🔍 Testing G-Balancer Backend Integration...\n")

    async with httpx.AsyncClient() as client:
        # Test 1: /simulate
        print("1. Testing /simulate endpoint...")
        try:
            resp = await client.get(f"{base_url}/simulate", timeout=5)
            data = resp.json()
            print(f"   ✓ Status: {resp.status_code}")
            print(f"   ✓ Supply hours: {len(data.get('total_supply_kwh', []))}")
            print(f"   ✓ Demand hours: {len(data.get('demand_kwh', []))}")
            print()
        except Exception as e:
            print(f"   ✗ Failed: {e}\n")
            return False

        # Test 2: /grid-status
        print("2. Testing /grid-status endpoint...")
        try:
            resp = await client.post(
                f"{base_url}/grid-status",
                json={
                    "battery_level_pct": 50,
                    "current_supply_kwh": 15,
                    "current_demand_kwh": 20
                },
                timeout=5
            )
            data = resp.json()
            print(f"   ✓ Status: {resp.status_code}")
            print(f"   ✓ Grid Status: {data.get('status')}")
            print(f"   ✓ Recommended Action: {data.get('recommended_action')}")
            print()
        except Exception as e:
            print(f"   ✗ Failed: {e}\n")
            return False

        # Test 3: /predict
        print("3. Testing /predict endpoint...")
        try:
            resp = await client.post(
                f"{base_url}/predict",
                json={
                    "solar_output_kwh": [0, 2, 5, 10, 12, 10, 5, 2, 0],
                    "wind_output_kwh": [8, 8, 8, 8, 8, 8, 8, 8, 8],
                    "demand_kwh": [20, 20, 21, 22, 23, 22, 21, 20, 20],
                    "battery_level_pct": 50,
                    "forecast_horizon_hours": 6
                },
                timeout=5
            )
            data = resp.json()
            print(f"   ✓ Status: {resp.status_code}")
            print(f"   ✓ Recommended actions: {len(data.get('recommended', []))} steps")
            print(f"   ✓ Source: {data.get('source')}")
            print()
        except Exception as e:
            print(f"   ✗ Failed: {e}\n")
            return False

    print("✅ All endpoints responding correctly!\n")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_backend())
    sys.exit(0 if success else 1)
```

Run it:

```powershell
python test_integration.py
```

---

## Next Steps

1. **Verify backend is running** and all endpoints respond
2. **Update mobile app IP address** to your machine's actual IP
3. **Restart mobile app** in Expo
4. **Check mobile app screens** for live data

If issues persist, share the **exact error message** from:

- Mobile app (when pressing Refresh Data)
- Browser console (Network tab)
- Backend terminal output
