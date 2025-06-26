# 🌙 Midnight DApp Frontend

A clean, optimized Midnight DApp frontend that connects to the **existing Chrome extension bridge server** for real Midnight testnet integration.

## ✨ Features

- **Real Midnight Testnet Integration**: Uses existing bridge server on port 3001
- **Simplified Architecture**: No duplicate APIs, connects directly to bridge
- **Live Wallet Operations**: Real balance, address, and faucet functionality
- **Smart Contract Ready**: Deploy, increment, and query contract operations
- **Modern Vite Build**: Fast development and optimized production builds
- **Clean UX**: Direct wallet connection without unnecessary modals

## � Quick Start

### Prerequisites

1. **Start the Chrome extension bridge server**:
   ```bash
   cd /Users/kaleab/Documents/KLace/scaffold-midnight/chrome-wallet-extension
   npm start
   ```
   This runs the bridge server on `http://localhost:3001`

2. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   ```

### Running the Frontend

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🔗 How It Works

1. **Bridge Server** (port 3001): Chrome extension bridge with all wallet functionality
2. **Frontend** (port 5173): Clean Vite-based interface
3. **Direct Connection**: Frontend calls bridge server API endpoints directly

### API Integration

The frontend connects to these bridge server endpoints:
- `GET /api/status` - Check bridge server status
- `GET /api/wallet` - Get wallet address and balance  
- `POST /api/faucet` - Request testnet tokens
- `POST /api/contract/deploy` - Deploy contract
- `POST /api/contract/increment` - Increment counter
- `GET /api/contract/state` - Get contract state

## 🛠 Development

```bash
npm run dev      # Start development server
npm run build    # Build for production  
npm run preview  # Preview production build
```

## 📁 Clean Structure

```
frontend/
├── src/
│   ├── main.js          # Clean DApp logic
│   └── style.css        # Modern UI styles
├── public/
│   └── midnight-icon.svg # Midnight icon
├── index.html           # Simplified HTML
├── package.json         # Minimal dependencies
└── vite.config.js       # Vite configuration
```

## 🎯 Optimizations Made

- ✅ **Removed duplicate API server** (uses existing bridge)
- ✅ **Simplified wallet connection** (no unnecessary modal)
- ✅ **Clean dependencies** (removed Express, CORS, etc.)
- ✅ **Direct API integration** (cleaner code flow)
- ✅ **Better error handling** (with console logging)
- ✅ **Responsive design** (works on all devices)

## 🔧 Usage

1. **Start bridge server** in chrome-wallet-extension directory
2. **Start frontend** with `npm run dev`
3. **Click "Connect Wallet"** - instant connection to your real Midnight wallet
4. **Use contract functions** - all connected to real testnet operations

The frontend now efficiently uses the existing infrastructure without duplication!

## 🌐 Usage

1. **Start the application**: Run `./start.sh` or `npm run start-full`
2. **Open your browser**: Navigate to `http://localhost:8080`
3. **Connect wallet**: Click "Connect Wallet" for real integration or simulation
4. **Interact with contracts**: Deploy, increment, and query your smart contracts

## 🔗 API Endpoints

The wallet API server runs on `http://localhost:3003` with these endpoints:

- `GET /api/health` - Health check
- `GET /api/wallet/balance` - Get current wallet balance
- `POST /api/wallet/connect` - Connect to wallet  
- `POST /api/wallet/request-tokens` - Request testnet tokens

## 📱 Operating Modes

### Real Wallet Mode ✅
- **When**: API server is running and wallet is configured
- **Features**: Real balance checking, actual wallet address, live testnet data
- **Indicator**: Green success message in UI

### Simulation Mode 💡  
- **When**: API server is not running or wallet not configured
- **Features**: Simulated wallet operations, demo data, full UI functionality
- **Indicator**: Blue demo mode message in UI

## 🔧 Troubleshooting

### "API server not running"
```bash
# Check if wallet is generated
npm run balance  # (from root directory)

# If wallet not found, generate one
npm run generate-key  # (from root directory)

# Start API server
npm run api
```

### "Connection failed"
- Ensure your `.env` file exists in the root project directory
- Verify `WALLET_SEED` is set in `.env`
- Check internet connection for testnet access
- Verify port 3003 is not in use (ports 3001-3002 are used by Midnight Chrome wallet)

### "Balance shows 0"
```bash
# Request testnet tokens
npm run faucet  # (from root directory)
```

## 📁 Project Structure

```
frontend/
├── index.html          # Main frontend application
├── wallet-api.js       # Real wallet API server
├── package.json        # Dependencies and scripts
├── start.sh           # Quick start script
└── README.md          # This file
```

## 🔄 Development

### Running in Development Mode
```bash
npm run dev  # Starts API + frontend with auto-reload
```

### API Server Only
```bash
npm run api  # Just the wallet API on :3003
```

### Frontend Only
```bash
npm run serve  # Just the frontend on :8080
```

## 🌙 Integration with Midnight

This frontend integrates with:
- **Midnight Testnet**: Real blockchain interactions
- **Wallet Builder**: Uses `@midnight-ntwrk/wallet` for real wallet operations
- **Native Tokens**: Handles tUsdt balance and transactions
- **Smart Contracts**: Deploys and interacts with Compact contracts

## 🎯 Next Steps

- Add more contract interactions
- Implement transaction history
- Add multi-wallet support
- Enhance error handling
- Add contract deployment UI

---

**Note**: This frontend works independently of the Chrome extension and provides a complete web-based interface for Midnight DApp development.
