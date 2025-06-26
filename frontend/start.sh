#!/bin/bash

echo "🌙 Midnight DApp Frontend Setup"
echo "==============================="

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🚀 Starting Midnight DApp Frontend with real wallet integration"
echo ""
echo "This will start:"
echo "  - Wallet API Server on http://localhost:3001"
echo "  - Frontend website on http://localhost:8080"
echo ""
echo "Make sure you have:"
echo "  - Generated a wallet with 'npm run generate-key' (from root directory)"
echo "  - Set up your .env file with WALLET_SEED"
echo ""

# Start both API server and frontend
npm run start-full
