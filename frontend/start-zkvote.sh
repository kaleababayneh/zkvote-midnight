#!/bin/bash

# ZkVote Frontend Launcher
echo "🗳️  Starting ZkVote Frontend..."
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if WALLET_SEED is set
if [ -z "$WALLET_SEED" ]; then
    echo "⚠️  WALLET_SEED environment variable not found."
    echo "💡 Make sure you have a .env file in the project root with:"
    echo "   WALLET_SEED=your_wallet_seed_here"
    echo ""
fi

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down ZkVote..."
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Set up cleanup on script exit
trap cleanup SIGINT SIGTERM

# Navigate to the frontend directory
cd "$(dirname "$0")"

# Install dependencies for API bridge if needed
echo "📦 Installing API bridge dependencies..."
cd api-bridge
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start API server in background
echo "🚀 Starting ZkVote API Server on port 3001..."
npm start &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Navigate back to frontend
cd ..

# Install frontend dependencies if needed
echo "📦 Installing frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start frontend development server
echo "🌐 Starting frontend on port 5173..."
echo ""
echo "🎉 ZkVote is starting up!"
echo "   Frontend: http://localhost:5173/zkvote.html"
echo "   API Server: http://localhost:3001/api/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait
