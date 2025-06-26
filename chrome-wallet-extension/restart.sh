#!/bin/bash

echo "🔄 Restarting Midnight Bridge Server..."

# Kill existing server
pkill -f "enhanced-bridge.js" || echo "No existing server found"

# Wait a moment
sleep 2

# Start the server
echo "🚀 Starting enhanced bridge server..."
cd "$(dirname "$0")"
npm start
