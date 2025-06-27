#!/bin/bash

# Enhanced Midnight Wallet Bridge Restart Script
# Ensures clean process termination and restart

echo "🔄 Restarting Enhanced Midnight Wallet Bridge..."
echo "=================================================="

# Function to kill process by port
kill_by_port() {
    local port=$1
    echo "🔍 Checking for processes on port $port..."
    
    # Find process using port 3001
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo "🔪 Killing process $pid on port $port"
        kill -TERM $pid 2>/dev/null
        sleep 2
        
        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            echo "🔨 Force killing process $pid"
            kill -KILL $pid 2>/dev/null
        fi
        
        echo "✅ Process on port $port terminated"
    else
        echo "ℹ️  No process found on port $port"
    fi
}

# Function to kill processes by name
kill_by_name() {
    local name=$1
    echo "🔍 Checking for processes named '$name'..."
    
    local pids=$(pgrep -f "$name" 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo "🔪 Killing processes: $pids"
        pkill -f "$name" 2>/dev/null
        sleep 2
        
        # Force kill if still running
        pkill -9 -f "$name" 2>/dev/null
        echo "✅ Processes named '$name' terminated"
    else
        echo "ℹ️  No processes found matching '$name'"
    fi
}

# Change to script directory
cd "$(dirname "$0")"

# Stop any existing bridge servers
kill_by_port 3001
kill_by_name "enhanced-bridge.js"
kill_by_name "bridge-server.js"

# Wait a moment for cleanup
echo "⏳ Waiting for cleanup..."
sleep 3

# Start the enhanced bridge server
echo "🚀 Starting Enhanced Midnight Wallet Bridge Server..."
echo ""
echo "🔧 New Features:"
echo "  ✓ Isolated process execution"
echo "  ✓ Command queue management" 
echo "  ✓ Process monitoring"
echo "  ✓ Timeout protection"
echo "  ✓ Emergency process termination"
echo ""
echo "🎯 Each CLI command now runs in its own isolated process"
echo "🎯 Commands are queued to prevent interference"
echo "🎯 Deploy commands get high priority execution"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server with error handling
if [ -f "enhanced-bridge.js" ]; then
    npm start
else
    echo "❌ enhanced-bridge.js not found"
    echo "Using fallback bridge-server.js..."
    node bridge-server.js
fi
