#!/bin/bash

# G-Balancer Backend Service Script
# Manages the FastAPI backend in WSL

LOG_FILE="/tmp/gbalancer-backend.log"
PID_FILE="/tmp/gbalancer-backend.pid"

# Function to start the backend
start_backend() {
    echo "🚀 Starting G-Balancer backend..."
    
    # Kill any existing process
    if [ -f "$PID_FILE" ]; then
        kill $(cat "$PID_FILE") 2>/dev/null
        sleep 1
    fi
    
    # Start the backend in background and capture PID
    cd /mnt/c/Users/KIIT/Documents/G-Balancer/backend
    nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    echo "✅ Backend started (PID: $(cat $PID_FILE))"
    sleep 2
    echo "🌐 Access at: http://localhost:8000/docs"
}

# Function to stop the backend
stop_backend() {
    if [ -f "$PID_FILE" ]; then
        kill $(cat "$PID_FILE")
        rm "$PID_FILE"
        echo "✅ Backend stopped"
    else
        echo "ℹ️  Backend not running"
    fi
}

# Function to show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "❌ Log file not found"
    fi
}

# Function to check status
check_status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "✅ Backend is running (PID: $PID)"
            curl -s http://localhost:8000/simulate | head -1
        else
            echo "❌ Backend is not running"
            rm "$PID_FILE"
        fi
    else
        echo "❌ Backend is not running"
    fi
}

# Main script logic
case "${1:-start}" in
    start)
        start_backend
        ;;
    stop)
        stop_backend
        ;;
    logs)
        show_logs
        ;;
    status)
        check_status
        ;;
    restart)
        stop_backend
        sleep 1
        start_backend
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
