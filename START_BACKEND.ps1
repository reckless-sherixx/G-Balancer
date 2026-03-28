# PowerShell script to start G-Balancer backend in WSL
# This will keep the backend running in a persistent WSL terminal

Write-Host "`n🚀 Starting G-Balancer Backend..." -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Kill any existing Python processes
Write-Host "`n🔄 Cleaning up old processes..." -ForegroundColor Yellow
wsl bash -c "killall -9 python3 2>/dev/null; true"
Start-Sleep -Seconds 2

# Start the backend
Write-Host "`n⏳ Starting backend on port 8000..." -ForegroundColor Yellow
Write-Host "   Command: python3 -m uvicorn main:app --host 0.0.0.0 --port 8000`n" -ForegroundColor Gray

# Run in WSL (this will keep running)
wsl bash -c "cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000"

