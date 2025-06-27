#!/bin/bash

# Test script for the enhanced bridge server
echo "🧪 Testing Enhanced Midnight Wallet Bridge"
echo "==========================================="

# Check if server is running
echo "1. Checking server status..."
response=$(curl -s http://localhost:3001/api/status 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Server is running"
    echo "Response: $response"
else
    echo "❌ Server is not running. Start it first with ./restart.sh"
    exit 1
fi

echo ""
echo "2. Testing wallet info..."
wallet_response=$(curl -s http://localhost:3001/api/wallet 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Wallet endpoint working"
    echo "Response: $wallet_response"
else
    echo "❌ Wallet endpoint failed"
fi

echo ""
echo "3. Checking running processes..."
processes_response=$(curl -s http://localhost:3001/api/processes 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Processes endpoint working"
    echo "Response: $processes_response"
else
    echo "❌ Processes endpoint failed"
fi

echo ""
echo "🎯 To test contract deployment, use:"
echo "curl -X POST http://localhost:3001/api/contract/deploy"
echo ""
echo "🎯 To test contract increment, use:"
echo "curl -X POST http://localhost:3001/api/contract/increment"
echo ""
echo "🎯 To test faucet request, use:"
echo "curl -X POST http://localhost:3001/api/faucet"
