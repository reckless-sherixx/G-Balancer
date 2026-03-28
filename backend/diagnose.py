#!/usr/bin/env python3
"""
Network Diagnostic Script
Helps identify why mobile app cannot reach backend
"""

import socket
import asyncio
import sys
import platform
import subprocess
from pathlib import Path

print("="*70)
print("🔍 G-BALANCER NETWORK DIAGNOSTIC TOOL")
print("="*70)
print(f"OS: {platform.system()}")
print(f"Python: {platform.python_version()}")
print()

# ─── Test 1: Check if backend is running ──────────────────────────────
print("1️⃣  CHECKING IF BACKEND IS RUNNING")
print("-"*70)

def check_port_listening(port=8000):
    """Check if port 8000 is listening"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        return result == 0
    except Exception as e:
        print(f"   Error: {e}")
        return False

is_listening = check_port_listening()
if is_listening:
    print("   ✅ Port 8000 is LISTENING (backend is running)")
else:
    print("   ❌ Port 8000 is NOT listening (backend is NOT running)")
    print("      Fix: Start backend with: uvicorn main:app --reload --port 8000")

print()

# ─── Test 2: Check machine IP address ─────────────────────────────────
print("2️⃣  CHECKING MACHINE IP ADDRESS")
print("-"*70)

def get_local_ip():
    """Get local IP address"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except Exception:
        return "Unable to determine"

local_ip = get_local_ip()
expected_ip = "10.21.39.161"

print(f"   Your machine IP: {local_ip}")
print(f"   Expected IP: {expected_ip}")

if local_ip == expected_ip:
    print("   ✅ IP matches expected value")
elif local_ip == "127.0.0.1":
    print("   ⚠️  Got loopback IP (127.0.0.1)")
    print("      This might be a network issue")
else:
    print(f"   ⚠️  IP mismatch: got {local_ip}, expected {expected_ip}")
    print("      Update mobile app config with correct IP")

print()

# ─── Test 3: Check connectivity to localhost ──────────────────────────
print("3️⃣  CHECKING LOCALHOST CONNECTIVITY")
print("-"*70)

async def test_http_connection(host, port, path="/health"):
    """Test HTTP connection"""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            url = f"http://{host}:{port}{path}"
            response = await client.get(url)
            return response.status_code == 200, response.text
    except ImportError:
        print("   ⚠️  httpx not installed, skipping HTTP test")
        return None, None
    except asyncio.TimeoutError:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)

if is_listening:
    try:
        success, response = asyncio.run(test_http_connection("127.0.0.1", 8000))
        if success:
            print("   ✅ Localhost (127.0.0.1:8000) is reachable and responding")
        else:
            print(f"   ❌ Localhost failed: {response}")
    except Exception as e:
        print(f"   ⚠️  Could not test: {e}")
else:
    print("   ⏭️  Skipping (backend not running)")

print()

# ─── Test 4: Check firewall ───────────────────────────────────────────
print("4️⃣  CHECKING FIREWALL STATUS")
print("-"*70)

if platform.system() == "Windows":
    try:
        # Check if Windows Defender Firewall is enabled
        result = subprocess.run(
            ["powershell", "-Command", "Get-NetFirewallProfile -Name Private | Select-Object -ExpandProperty Enabled"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if "True" in result.stdout:
            print("   ⚠️  Windows Firewall is ENABLED")
            print("      This might be blocking port 8000")
            print("      Solution: Allow Python through firewall or disable for testing")
        else:
            print("   ℹ️  Windows Firewall is disabled or permissive")
    except Exception as e:
        print(f"   ⚠️  Could not check firewall: {e}")
else:
    print("   ℹ️  Non-Windows system detected")

print()

# ─── Test 5: Check dependencies ────────────────────────────────────────
print("5️⃣  CHECKING BACKEND DEPENDENCIES")
print("-"*70)

required_packages = [
    "fastapi", "uvicorn", "pydantic", "httpx", "pandas", "numpy",
    "scikit-learn", "xgboost", "joblib", "sqlalchemy", "aiosqlite",
    "websockets", "apscheduler", "python-multipart", "python-dotenv"
]

missing = []
for package in required_packages:
    try:
        __import__(package.replace("-", "_"))
    except ImportError:
        missing.append(package)

if missing:
    print(f"   ❌ Missing {len(missing)} packages:")
    for pkg in missing:
        print(f"      - {pkg}")
    print("      Fix: pip install -r requirements.txt")
else:
    print(f"   ✅ All {len(required_packages)} required packages are installed")

print()

# ─── Test 6: Check if main.py can be imported ──────────────────────────
print("6️⃣  CHECKING BACKEND MODULE")
print("-"*70)

backend_path = Path.cwd() / "backend"
if backend_path.exists():
    print(f"   ℹ️  Found backend directory: {backend_path}")
    
    try:
        # Try importing main module
        sys.path.insert(0, str(backend_path))
        import main
        print("   ✅ Backend main.py imports successfully")
        print(f"      App name: {main.settings.APP_NAME}")
        print(f"      Version: {main.settings.VERSION}")
        print(f"      Default city: {main.settings.DEFAULT_CITY}")
    except Exception as e:
        print(f"   ❌ Backend import failed: {e}")
        print("      Fix: Check for syntax errors in main.py")
else:
    print(f"   ℹ️  Could not find backend directory")
    print("      Make sure you're in the right directory")

print()

# ─── Summary ──────────────────────────────────────────────────────────
print("="*70)
print("📊 DIAGNOSTIC SUMMARY")
print("="*70)

checks = {
    "Backend running on port 8000": is_listening,
    "Correct machine IP": local_ip == expected_ip,
    "All dependencies installed": len(missing) == 0,
}

passed = sum(1 for v in checks.values() if v is True)
total = len(checks)

print(f"\nPassed: {passed}/{total}")
print()

for check, result in checks.items():
    status = "✅" if result else "❌"
    print(f"  {status} {check}")

print()

# ─── Recommendations ──────────────────────────────────────────────────
print("="*70)
print("🎯 NEXT STEPS")
print("="*70)
print()

if not is_listening:
    print("1. ❌ BACKEND NOT RUNNING")
    print("   Command: uvicorn main:app --reload --port 8000")
    print("   Location: c:\\Users\\KIIT\\Documents\\G-Balancer\\backend")
    print()
elif local_ip != expected_ip:
    print(f"1. ⚠️  IP MISMATCH")
    print(f"   Expected: {expected_ip}")
    print(f"   Got: {local_ip}")
    print(f"   Update: mobile/gbalancer/features/grid/api.ts")
    print(f"   Change DEFAULT_BASE_URL to: http://{local_ip}:8000")
    print()
elif missing:
    print("1. ❌ MISSING DEPENDENCIES")
    print("   Command: pip install -r requirements.txt")
    print()
else:
    print("1. ✅ BACKEND IS READY")
    print("   Start mobile app: npx expo start")
    print("   Press 'a' for Android emulator")
    print()

print("2. CHECK FIREWALL")
print("   If network errors persist, check Windows Defender Firewall")
print("   Allow Python or port 8000 through firewall")
print()

print("3. USE EMULATOR SPECIAL IP")
print("   If using Android Emulator, use: http://10.0.2.2:8000")
print()

print("="*70)
print()

# ─── Test Network from Emulator Perspective ────────────────────────────
print("ℹ️  ANDROID EMULATOR SPECIAL CASE")
print("-"*70)
print("Android Emulator cannot reach 10.21.39.161:8000 directly.")
print("Instead, it uses a special IP: 10.0.2.2")
print()
print("Update mobile/gbalancer/features/grid/api.ts:")
print()
print("  const DEFAULT_BASE_URL = Platform.OS === 'android'")
print("    ? 'http://10.0.2.2:8000'        // Android Emulator")
print("    : 'http://10.21.39.161:8000';   // Physical device")
print()
print("="*70)

