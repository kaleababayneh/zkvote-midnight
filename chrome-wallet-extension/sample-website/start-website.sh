#!/bin/bash

echo "🌐 Starting Midnight DApp Website"
echo "================================="

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: Run this script from the sample-website directory"
    exit 1
fi

# Start a simple HTTP server
echo "🚀 Starting web server on http://localhost:8080"
echo ""
echo "📋 Instructions:"
echo "1. Make sure your Midnight Wallet Extension is loaded in Chrome"
echo "2. Open http://localhost:8080 in Chrome"
echo "3. Click the buttons to interact with your smart contract!"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try different server options
if command -v python3 &> /dev/null; then
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    python -m http.server 8080
elif command -v npx &> /dev/null; then
    npx serve . -p 8080
else
    echo "❌ No suitable web server found. Please install Python or Node.js"
    exit 1
fi
