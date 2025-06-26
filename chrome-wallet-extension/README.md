# Midnight Wallet Chrome Extension

A beautiful Chrome extension wallet for interacting with Midnight Network smart contracts. This extension provides a clean interface to view your balance, request testnet tokens, and interact with your deployed smart contracts.

## Features

🌙 **Wallet Management**
- View wallet balance in real-time
- Copy wallet address with one click
- Request testnet tokens through faucet
- Beautiful, modern UI with Midnight branding

💰 **Balance & Transactions**
- Real-time balance updates
- Support for tUsdt (testnet tokens)
- Transaction history and status

🔗 **Smart Contract Interaction**
- View current counter value
- Execute increment function
- Deploy new contracts
- Live contract state updates

🔧 **CLI Integration**
- Seamless connection to your CLI
- Bridge server for secure communication
- Fallback simulation mode

## Installation

### 1. Install Dependencies

```bash
cd chrome-wallet-extension
npm install
```

### 2. Start Bridge Server

The bridge server connects your Chrome extension to the CLI:

```bash
npm start
```

This starts the server on `http://localhost:3001`

### 3. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" 
4. Select the `chrome-wallet-extension` folder
5. The Midnight Wallet icon should appear in your toolbar

## Usage

### First Time Setup

1. **Load Extension**: Click the Midnight Wallet icon in Chrome toolbar
2. **Connect to CLI**: The extension will automatically try to connect to your running CLI
3. **View Wallet**: Your wallet address and balance will be displayed

### Basic Operations

**Check Balance**
- Click "Check Balance" or the refresh icon
- Balance updates automatically when connected to CLI

**Request Tokens**
- Click "Request Testnet Tokens" 
- Tokens will be added to your wallet (may take a few minutes)

**Copy Address**
- Click the copy icon next to your wallet address
- Address is copied to clipboard

### Smart Contract Operations

**View Counter**
- Current counter value is displayed in the contract section
- Click refresh icon to update

**Increment Counter**
- Click "Increment Counter" to execute the function
- Transaction will be processed through your CLI
- Counter value updates automatically

**Deploy Contract**
- Click "Deploy Contract" to deploy a new instance
- Contract address will be displayed once deployed

## Architecture

```
Chrome Extension ←→ Bridge Server ←→ CLI ←→ Midnight Network
```

### Components

1. **Chrome Extension** (`popup.html`, `popup.js`, `styles.css`)
   - User interface and wallet interactions
   - Local storage for caching data
   - Communication with bridge server

2. **Bridge Server** (`bridge-server.js`)
   - Express.js server running on localhost:3001
   - Translates HTTP requests to CLI commands
   - Handles CORS for Chrome extension

3. **CLI Integration**
   - Your existing Midnight CLI
   - Executes actual blockchain operations
   - Manages wallet and contract state

### API Endpoints

- `GET /api/status` - Health check
- `GET /api/wallet` - Get wallet information
- `GET /api/balance` - Check current balance
- `POST /api/faucet` - Request testnet tokens
- `POST /api/contract/deploy` - Deploy contract
- `GET /api/contract/counter` - Get counter value  
- `POST /api/contract/increment` - Increment counter

## Development

### Running in Development Mode

```bash
# Start bridge server with auto-reload
npm run dev
```

### Simulation Mode

If the CLI is not available, the extension runs in simulation mode:
- Generates random balance updates
- Simulates contract interactions
- Useful for UI development and testing

### Customization

**Adding New Contract Functions**
1. Add new API endpoint in `bridge-server.js`
2. Add corresponding CLI command execution
3. Update extension UI in `popup.html` and `popup.js`

**Styling**
- Modify `styles.css` for UI customization
- Uses CSS custom properties for theming
- Responsive design for different screen sizes

## File Structure

```
chrome-wallet-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Main UI
├── popup.js               # Frontend logic
├── styles.css             # Styling
├── background.js          # Service worker
├── bridge-server.js       # Backend bridge
├── package.json           # Dependencies
├── icons/                 # Extension icons
└── README.md             # This file
```

## Security

- Extension only communicates with localhost
- No private keys stored in extension
- All sensitive operations handled by CLI
- CORS protection for API endpoints

## Troubleshooting

**Extension Not Loading**
- Check that Developer mode is enabled
- Refresh the extension in chrome://extensions/
- Check browser console for errors

**CLI Connection Failed**
- Ensure bridge server is running (`npm start`)
- Check that CLI is running and accessible
- Verify port 3001 is not blocked

**Balance Not Updating**
- Click refresh button manually
- Check CLI connection status
- Verify wallet has sufficient permissions

**Contract Functions Not Working**
- Ensure contract is deployed
- Check CLI is connected to testnet
- Verify wallet has sufficient balance for gas

## Contributing

This extension is designed to work with your Midnight smart contract scaffold. Feel free to customize it for your specific contract functions and requirements.

## License

MIT License - Feel free to use and modify as needed.
