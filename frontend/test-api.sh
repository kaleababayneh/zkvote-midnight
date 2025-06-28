#!/bin/bash

# ZkVote API Test Script
echo "🧪 Testing ZkVote API Server..."
echo ""

API_URL="http://localhost:3001"

# Function to test an endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    echo "📡 Testing $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract body (all but last line)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "200" ]; then
        echo "✅ Success ($status_code)"
        echo "   Response: $(echo "$body" | jq -r '.message // .success' 2>/dev/null || echo "$body")"
    else
        echo "❌ Failed ($status_code)"
        echo "   Response: $body"
    fi
    echo ""
}

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "💡 Install 'jq' for better JSON output formatting"
    echo ""
fi

# Test health endpoint
test_endpoint "GET" "/api/health"

# Test wallet status
test_endpoint "GET" "/api/wallet/status"

# Test wallet connect
test_endpoint "POST" "/api/wallet/connect" "{}"

# Test contract deployment (with sample choices)
echo "🚀 Testing contract deployment..."
deploy_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"choices":["YES","NO","ABS","N/A"]}' \
    "$API_URL/api/contract/deploy")

echo "Deploy response: $deploy_response"

# Extract contract address if deployment was successful
contract_address=$(echo "$deploy_response" | jq -r '.contractAddress' 2>/dev/null)

if [ "$contract_address" != "null" ] && [ "$contract_address" != "" ]; then
    echo "✅ Contract deployed: $contract_address"
    echo ""
    
    # Wait a moment for deployment to settle
    echo "⏳ Waiting for deployment to settle..."
    sleep 5
    
    # Test getting contract state
    test_endpoint "GET" "/api/contract/state/$contract_address"
    
    # Test submitting a vote
    echo "🗳️ Testing vote submission..."
    test_endpoint "POST" "/api/contract/vote" "{\"contractAddress\":\"$contract_address\",\"choiceIndex\":0,\"secretKey\":\"test1\"}"
    
    # Wait for vote to be processed
    echo "⏳ Waiting for vote to be processed..."
    sleep 3
    
    # Test getting updated state
    test_endpoint "GET" "/api/contract/state/$contract_address"
    
else
    echo "❌ Contract deployment failed, skipping further tests"
fi

echo "🏁 API testing complete!"
