#!/bin/bash

# ==============================================================================
#  LeaningPhysics - Development Startup Script
# ==============================================================================
#
# This script launches the full-stack development environment.
# It starts the backend server in the background and the frontend server
# in the foreground.
#
# Press Ctrl+C to stop both servers.
#
# ==============================================================================

# Function to be called on script exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    # Kill the backend server process using its PID
    if [ -n "$backend_pid" ]; then
        kill $backend_pid
        echo "Backend server stopped."
    fi
    # The frontend server (in foreground) will be stopped by Ctrl+C automatically
    echo "Frontend server stopped."
    exit 0
}

# Trap the EXIT signal (sent on Ctrl+C) to call the cleanup function
trap cleanup EXIT

# --- Start Backend Server ---
echo "Starting backend server in the background (http://localhost:8000)..."
# Start the backend in a subshell to handle directory change, and run it in the background
(cd backend && python main.py) &
# Store the Process ID (PID) of the last background command
backend_pid=$!

# Give the backend a moment to start up
sleep 3

# --- Start Frontend Server ---
echo "Starting frontend server in the foreground (http://localhost:3000)..."
# Start the frontend in a subshell and keep it in the foreground
(cd frontend && npm run dev)

# The script will wait here until `npm run dev` is terminated.
# The `trap` command will then call the `cleanup` function.
