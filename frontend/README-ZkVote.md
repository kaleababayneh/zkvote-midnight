# 🗳️ ZkVote - Private Voting Frontend

A sleek, minimalist frontend for creating and participating in private zero-knowledge voting on the Midnight blockchain.

## ✨ Features

- **Deploy Contracts**: Create new voting contracts with 4 custom options (3 characters each)
- **Join Existing Votes**: Connect to deployed contracts by address
- **Private Voting**: Submit votes using secret keys for complete anonymity
- **Real-time Results**: View live voting results with smooth animations
- **Modern UI**: Ultra-clean, minimalist design with smooth interactions
- **Responsive**: Works perfectly on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm
- ZkVote contract CLI (in `../boilerplate/contract-cli`)

### Installation & Launch

```bash
# Navigate to the frontend directory
cd scaffold-midnight/frontend

# Start both API bridge and frontend
./start-zkvote.sh
```

This will:
1. Install all dependencies automatically
2. Start the API bridge on port 3001
3. Start the frontend development server on port 5173
4. Open your browser to http://localhost:5173/zkvote.html

## 🎯 How to Use

### 1. Deploy a New Vote
1. Connect your wallet by clicking the wallet status
2. Enter 4 voting options (exactly 3 characters each)
3. Click "Deploy Contract"
4. Wait for deployment confirmation

### 2. Join an Existing Vote
1. Connect your wallet
2. Enter the contract address
3. Click "Connect"

### 3. Cast Your Vote
1. Select your preferred option
2. Enter a 5-character secret key (for privacy)
3. Click "Submit Vote"
4. Your vote is now recorded anonymously!

### 4. View Results
- Results update automatically
- See vote distribution with animated bars
- Total vote count displayed

## 🛠️ Architecture

### Frontend Components
- **HTML**: Clean, semantic structure (`zkvote.html`)
- **CSS**: Modern design system with CSS custom properties (`src/zkvote.css`)
- **JavaScript**: Vanilla JS application with modular architecture (`src/zkvote.js`)

### API Bridge
- **Express Server**: RESTful API bridge (`api-bridge/server.js`)
- **CLI Integration**: Connects to ZkVote CLI backend
- **Error Handling**: Comprehensive error management

### API Endpoints
- `GET /api/health` - Health check
- `GET /api/wallet/status` - Check wallet connection
- `POST /api/wallet/connect` - Connect wallet
- `POST /api/contract/deploy` - Deploy new voting contract
- `GET /api/contract/state/:address` - Get contract state
- `POST /api/contract/vote` - Submit a vote

## 🎨 Design Philosophy

### Minimalist Approach
- Ultra-thin borders and subtle shadows
- Generous whitespace for clarity
- Smooth animations and transitions
- No unnecessary UI elements

### Color Palette
- **Background**: Deep dark blue (`#0f172a`)
- **Surface**: Slate gray (`#1e293b`)
- **Primary**: Indigo (`#6366f1`)
- **Accent**: Purple (`#a855f7`)
- **Success**: Emerald (`#10b981`)

### Typography
- **Font**: Inter (modern, clean sans-serif)
- **Hierarchy**: Clear size and weight distinctions
- **Readability**: High contrast for accessibility

## 🔧 Development

### Project Structure
```
frontend/
├── zkvote.html           # Main application page
├── src/
│   ├── zkvote.js         # Main application logic
│   └── zkvote.css        # Styles and design system
├── api-bridge/           # Express API server
│   ├── server.js         # Main server file
│   └── package.json      # API dependencies
├── start-zkvote.sh       # Launch script
└── vite.config.js        # Vite configuration
```

### Development Commands
```bash
# Start development server only
npm run dev

# Start API bridge only
cd api-bridge && npm start

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables
The CLI backend uses environment variables for configuration. Make sure your `.env` file is properly configured in the project root.

## 🔐 Security & Privacy

- **Zero Knowledge**: Votes are private and cannot be traced back to voters
- **Secret Keys**: 5-character keys ensure vote anonymity
- **Blockchain Security**: Built on Midnight's privacy-focused blockchain
- **No Data Storage**: Frontend doesn't store any sensitive information

## 🌟 User Experience Features

### Smart Validation
- Real-time input validation with visual feedback
- Automatic character limits and formatting
- Clear error messages and guidance

### Smooth Interactions
- Hover effects with subtle animations
- Loading states for all async operations
- Toast notifications for user feedback
- Responsive button states

### Accessibility
- High contrast ratios for readability
- Keyboard navigation support
- Screen reader friendly
- Responsive design for all devices

## 🚨 Troubleshooting

### Common Issues

**Frontend won't connect to API**
- Ensure the API bridge is running on port 3001
- Check that the CLI backend is properly configured

**Contract deployment fails**
- Verify wallet is connected and has sufficient funds
- Ensure all 4 choices are exactly 3 characters
- Check CLI logs for detailed error messages

**Vote submission fails**
- Verify secret key is exactly 5 characters
- Ensure a voting option is selected
- Check that the contract address is correct

### Debug Mode
Set `LOG_LEVEL=debug` in your environment for detailed logging.

## 📱 Mobile Support

The interface is fully responsive and optimized for mobile devices:
- Touch-friendly button sizes
- Simplified layouts on small screens
- Swipe-friendly interactions
- Mobile-optimized typography

## 🎊 What Makes This Special

This isn't just another voting app - it's a showcase of modern web development best practices combined with cutting-edge blockchain privacy technology:

- **Performance**: Lightning-fast with minimal bundle size
- **Design**: Award-worthy minimalist interface
- **Privacy**: True zero-knowledge voting
- **Accessibility**: Works for everyone
- **Maintainability**: Clean, modular code architecture

Built with ❤️ for the Midnight blockchain ecosystem.
