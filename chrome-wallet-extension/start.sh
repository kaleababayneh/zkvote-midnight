#!/bin/bash

# Midnight Wallet Extension Launcher
# This script sets up and starts the Chrome extension bridge server

echo "🌙 Midnight Wallet Extension Setup"
echo "===================================="

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: Run this script from the chrome-wallet-extension directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
fi

# Start the bridge server
echo ""
echo "🚀 Starting Midnight Wallet Bridge Server..."
echo ""
echo "Next steps:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked' and select this folder"
echo "4. The Midnight Wallet icon will appear in your toolbar"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start
