#!/usr/bin/env python3
"""
Quick Backend Integration Test
Tests that all required endpoints are responding correctly.
Run this in the backend directory after starting the server.
"""

import asyncio
import httpx
import json
from datetime import datetime

async def test_endpoints():
    """Test all mobile-required endpoints."""
    BASE_URL = "http://localhost:8000"
    
    print("=" * 70)
    print("🧪 G-BALANCER BACKEND INTEGRATION TEST")
    print("=" * 70)
    print(f"Testing backend at: {BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}\n")
    
    tests_passed = 0
    tests_failed = 0
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        
        # Test 1: Health check
        print("1️⃣  Testing /health endpoint...")
        try:
            resp = await client.get(f"{BASE_URL}/health")
            if resp.status_code == 200:
                data = resp.json()
                print(f"   ✅ Status: {resp.status_code}")
                print(f"   ✅ Server Status: {data['status']}")
                tests_passed += 1
            else:
                print(f"   ❌ Status: {resp.status_code}")
                tests_failed += 1
        except Exception as e:
            print(f"   ❌ Error: {e}")
            tests_failed += 1
        print()
        
        # Test 2: Root endpoint
        print("2️⃣  Testing / (root) endpoint...")
        try:
            resp = await client.get(f"{BASE_URL}/")
            if resp.status_code == 200:
                data = resp.json()
                print(f"   ✅ Status: {resp.status_code}")
                print(f"   ✅ App: {data['app']}")
                print(f"   ✅ Version: {data['version']}")
                tests_passed += 1
            else:
                print(f"   ❌ Status: {resp.status_code}")
                tests_failed += 1
        except Exception as e:
            print(f"   ❌ Error: {e}")
            tests_failed += 1
        print()
        
        # Test 3: /simulate (mobile requirement)
        print("3️⃣  Testing /simulate endpoint (CRITICAL FOR MOBILE)...")
        try:
            resp = await client.get(f"{BASE_URL}/simulate")
            if resp.status_code == 200:
                data = resp.json()
                supply_count = len(data.get('total_supply_kwh', []))
                demand_count = len(data.get('demand_kwh', []))
                battery_count = len(data.get('battery_pct', []))
                
                print(f"   ✅ Status: {resp.status_code}")
                print(f"   ✅ Supply data points: {supply_count}")
                print(f"   ✅ Demand data points: {demand_count}")
                print(f"   ✅ Battery data points: {battery_count}")
                
                if supply_count > 0 and demand_count > 0 and battery_count > 0:
                    print(f"   ✅ Sample supply: {data['total_supply_kwh'][0]:.2f} kWh")
                    print(f"   ✅ Sample demand: {data['demand_kwh'][0]:.2f} kWh")
                    print(f"   ✅ Sample battery: {data['battery_pct'][0]:.1f}%")
                    tests_passed += 1
                else:
                    print(f"   ❌ Empty data arrays")
                    tests_failed += 1
            else:
                print(f"   ❌ Status: {resp.status_code}")
                tests_failed += 1
        except Exception as e:
            print(f"   ❌ Error: {e}")
            print(f"   💡 Make sure backend is running: uvicorn main:app --reload --port 8000")
            tests_failed += 1
        print()
        
        # Test 4: /grid-status (mobile requirement)
        print("4️⃣  Testing /grid-status endpoint (CRITICAL FOR MOBILE)...")
        try:
            resp = await client.post(
                f"{BASE_URL}/grid-status",
                json={
                    "battery_level_pct": 50,
                    "current_supply_kwh": 15,
                    "current_demand_kwh": 20
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                print(f"   ✅ Status: {resp.status_code}")
                print(f"   ✅ Grid Status: {data.get('status')}")
                print(f"   ✅ Recommended Action: {data.get('recommended_action')}")
                tests_passed += 1
            else:
                print(f"   ❌ Status: {resp.status_code}")
                print(f"   ❌ Response: {resp.text}")
                tests_failed += 1
        except Exception as e:
            print(f"   ❌ Error: {e}")
            tests_failed += 1
        print()
        
        # Test 5: /predict (mobile requirement)
        print("5️⃣  Testing /predict endpoint (CRITICAL FOR MOBILE)...")
        try:
            resp = await client.post(
                f"{BASE_URL}/predict",
                json={
                    "solar_output_kwh": [0, 2, 5, 10, 12, 10, 5, 2, 0],
                    "wind_output_kwh": [8, 8, 8, 8, 8, 8, 8, 8, 8],
                    "demand_kwh": [20, 20, 21, 22, 23, 22, 21, 20, 20],
                    "battery_level_pct": 50,
                    "forecast_horizon_hours": 6
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                recommended = data.get('recommended', [])
                print(f"   ✅ Status: {resp.status_code}")
                print(f"   ✅ Recommended actions: {len(recommended)} steps")
                print(f"   ✅ Source: {data.get('source')}")
                if recommended:
                    print(f"   ✅ Sample action: {recommended[0]}")
                tests_passed += 1
            else:
                print(f"   ❌ Status: {resp.status_code}")
                print(f"   ❌ Response: {resp.text}")
                tests_failed += 1
        except Exception as e:
            print(f"   ❌ Error: {e}")
            tests_failed += 1
        print()
        
        # Test 6: /forecast (mobile fallback)
        print("6️⃣  Testing /forecast endpoint (mobile fallback)...")
        try:
            resp = await client.get(f"{BASE_URL}/forecast/?hours=12")
            if resp.status_code == 200:
                data = resp.json()
                points = data.get('points', [])
                print(f"   ✅ Status: {resp.status_code}")
                print(f"   ✅ Forecast points: {len(points)}")
                if points:
                    print(f"   ✅ First point timestamp: {points[0].get('timestamp')}")
                tests_passed += 1
            else:
                print(f"   ⚠️  Status: {resp.status_code} (non-critical)")
                tests_failed += 1
        except Exception as e:
            print(f"   ⚠️  Error: {e} (non-critical)")
            tests_failed += 1
        print()
    
    # Summary
    print("=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"📈 Total: {tests_passed + tests_failed}\n")
    
    if tests_failed == 0:
        print("🎉 ALL TESTS PASSED! Backend is ready for mobile integration.")
        print("\n📱 Next steps:")
        print("1. Update mobile/gbalancer/features/grid/api.ts with your machine IP")
        print("2. Run: npx expo start")
        print("3. Press 'a' for Android emulator or 'i' for iOS simulator")
        print("4. Mobile app should now fetch data successfully!\n")
        return True
    else:
        print("⚠️  SOME TESTS FAILED!")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure backend is running: uvicorn main:app --reload --port 8000")
        print("2. Check backend logs for errors")
        print("3. Verify all dependencies are installed: pip install -r requirements.txt")
        print("4. Check that port 8000 is not in use")
        print("5. Try running with: uvicorn main:app --reload --port 8000 --log-level debug\n")
        return False

if __name__ == "__main__":
    import sys
    success = asyncio.run(test_endpoints())
    sys.exit(0 if success else 1)
