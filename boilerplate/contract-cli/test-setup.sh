#!/bin/bash

echo "🚀 Testing ZkVote Contract CLI Setup"
echo "=================================="

# Check if the contract source exists
if [ -f "../contract/src/zkvote.compact" ]; then
    echo "✅ ZkVote contract found"
else
    echo "❌ ZkVote contract not found in ../contract/src/"
    exit 1
fi

# Check if managed contract exists
if [ -d "../contract/src/managed/zkvote" ]; then
    echo "✅ Managed contract directory found"
else
    echo "❌ Managed contract directory not found. Run 'npm run auto-generate' in the contract directory first"
    exit 1
fi

# Check if TypeScript compilation works
echo "🔧 Checking TypeScript compilation..."
npm run typecheck

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    exit 1
fi

# Check if the main API files exist
if [ -f "src/simple-api.ts" ] && [ -f "src/zkvote-cli.ts" ]; then
    echo "✅ ZkVote CLI files found"
else
    echo "❌ ZkVote CLI files missing"
    exit 1
fi

echo ""
echo "🎉 ZkVote Contract CLI setup complete!"
echo ""
echo "Available commands:"
echo "  npm run standalone     - Run with local Docker environment"
echo "  npm run testnet-local  - Run with local testnet"
echo "  npm run testnet-remote - Run with remote testnet"
echo ""
echo "The CLI now provides a simplified interface specifically for the ZkVote contract:"
echo "  1. Increment voter count"
echo "  2. Cast a vote (with secret key and choice)"
echo "  3. Get vote count for choices"
echo "  4. Display contract state"
