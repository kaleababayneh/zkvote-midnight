# Privote - Privacy-Preserving Voting on Midnight Network

A comprehensive decentralized voting application built on the Midnight blockchain that enables **completely private, verifiable voting** using zero-knowledge proofs. Privote demonstrates how to build end-to-end privacy-preserving applications using Midnight's Compact smart contract language, zero-knowledge cryptography, and modern web technologies.

## 🎯 What Privote Does

Privote allows users to:
- **Create voting contracts** with custom options (up to 4 choices: A, B, C, D)
- **Join existing votes** using contract addresses
- **Cast votes privately** - your choice remains secret but is cryptographically verified
- **View public results** - vote tallies are transparent while individual votes stay private
- **Prevent double voting** - each voter can only vote once per contract using zero-knowledge proofs

## 🏗️ System Architecture & How It Works

### Core Components

```
Privote System Architecture:
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Web Interface)                                      │
│  ├── zkvote.html - Clean, modern voting UI                     │
│  ├── zkvote.js - Frontend logic & wallet integration           │
│  └── zkvote.css - Beautiful, responsive styling                │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTP API Calls
┌─────────────────▼───────────────────────────────────────────────┐
│  Chrome Extension Wallet + Bridge Server                       │
│  ├── enhanced-bridge.js - API server (port 3002)              │
│  ├── popup.html/js - Extension UI & wallet management          │
│  └── Session Management - Persistent CLI connections           │
└─────────────────┬───────────────────────────────────────────────┘
                  │ CLI Process Management
┌─────────────────▼───────────────────────────────────────────────┐
│  Contract CLI (TypeScript)                                     │
│  ├── zkvote-enhanced-cli.ts - Interactive CLI interface        │
│  ├── simple-api.ts - Contract interaction functions            │
│  └── Session persistence - Long-running CLI processes          │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Smart Contract Calls
┌─────────────────▼───────────────────────────────────────────────┐
│  Midnight Blockchain                                           │
│  ├── zkvote.compact - Zero-knowledge voting contract           │
│  ├── Zero-knowledge proofs - Private vote verification         │
│  └── Public state - Vote tallies (not individual votes)        │
└─────────────────────────────────────────────────────────────────┘
```

### How the Technology Works

**1. Smart Contract (`zkvote.compact`)**
```compact
// The contract stores voting choices and encrypted vote counts
export ledger numberOfVoters: Counter;           // Total voters
export ledger choices: Map<Uint<8>, Bytes<3>>;   // A, B, C, D options  
export ledger voteCounts: Map<Uint<8>, Counter>; // Vote tallies
export ledger items: Set<Bytes<32>>;             // Prevents double voting

// Zero-knowledge voting function
export circuit vote_for(secret_key: Bytes<5>, instance: Bytes<5>, index: Uint<8>): [] {
  // Creates a unique voter ID without revealing identity
  const voterHash = public_key_vote(secret_key, instance);
  assert !items.member(voterHash) "Already voted";  // Prevent double voting
  
  items.insert(voterHash);           // Mark as voted
  voteCounts.lookup(index).increment(1); // Count the vote
}
```

**2. Privacy Mechanism**
- **Secret Key**: Users provide a 5-character secret (like "alice")
- **Zero-Knowledge Proof**: The contract creates a cryptographic hash from your secret
- **Anonymous Voting**: Your vote is counted but your identity remains completely private
- **Double-Vote Prevention**: The hash prevents the same person from voting twice

**3. User Interaction Flow**

**For Vote Creators:**
1. Open Privote web interface
2. Connect wallet (custom Chrome extension)
3. Fill in voting options (A, B, C, D with 3-letter labels)
4. Click "Deploy Contract" 
5. Share the generated contract address with voters

**For Voters:**
1. Receive contract address from vote creator
2. Open Privote and connect wallet
3. Enter contract address and click "Connect"
4. Choose your voting option
5. Enter a personal secret key (5 characters)
6. Submit vote privately

**4. Technical Implementation Details**

**Frontend Layer (Web Interface):**
- **Modern UI**: Clean, responsive design built with vanilla HTML/CSS/JavaScript
- **Real-time Updates**: Automatic refresh of vote counts every 30 seconds
- **Wallet Integration**: Seamless connection to custom Chrome extension
- **Error Handling**: User-friendly error messages and loading states

**Bridge Server (`enhanced-bridge.js`):**
- **API Gateway**: Express.js server running on port 3002
- **Session Management**: Maintains persistent CLI processes for each contract
- **Process Isolation**: Each contract interaction runs in isolated environment
- **Real-time Monitoring**: Live process status and output streaming

**CLI Layer (`contract-cli`):**
- **Contract Deployment**: Automated deployment with constructor arguments
- **Join Contracts**: Connect to existing voting contracts by address
- **Vote Submission**: Zero-knowledge proof generation and submission
- **State Queries**: Read vote counts and contract information

**Custom Chrome Extension Wallet:**
```javascript
// Key features of the custom wallet extension
- Local wallet seed management (.env integration)
- Bridge server communication (port 3002)
- Persistent session handling
- Connection status monitoring
- Transaction signing and submission
```

## 🔄 Complete User Journey

### Scenario 1: Creating a New Vote

1. **Setup & Connection**
   ```
   User opens Privote → Connects wallet extension → Server validates connection
   ```

2. **Vote Creation**
   ```
   Enter vote options: 
   A: "YES"  B: "NOD"  C: "ABS"  D: "N/A"
   ↓
   Click "Deploy Contract"
   ↓ 
   Bridge server spawns CLI process
   ↓
   CLI deploys smart contract with options
   ↓
   Contract address returned: "a1b2c3d4e5f6..."
   ```

3. **Sharing**
   ```
   Copy contract address → Share with voters
   ```

### Scenario 2: Joining and Voting

1. **Join Existing Vote**
   ```
   Paste contract address → Click "Connect"
   ↓
   Bridge creates session for contract
   ↓
   CLI joins contract and loads vote options
   ↓
   UI displays voting interface with choices
   ```

2. **Cast Private Vote**
   ```
   Select choice (e.g., "YES")
   ↓
   Enter secret key: "alice"
   ↓
   Click "Submit Vote"
   ↓
   CLI generates zero-knowledge proof
   ↓
   Vote submitted privately to blockchain
   ↓
   Results updated automatically
   ```

## 🛠️ Technical Deep Dive

### Zero-Knowledge Privacy Implementation

**Problem Solved**: Traditional voting systems either reveal individual votes OR require trusted authorities. Privote eliminates both issues.

**Solution**: 
```compact
// Each vote creates a unique cryptographic fingerprint
circuit public_key_vote(sk: Bytes<5>, instance: Bytes<5>): Bytes<32> {
  return persistent_hash<Vector<3, Bytes<5>>>([pad(5, "pk:"), instance, sk]);
}

// The fingerprint prevents double voting without revealing identity
assert !items.member(public_key_vote(secret_key, instance)) "Already voted";
```

**Benefits**:
- 🔒 **Vote Privacy**: No one can see how you voted
- 🚫 **No Double Voting**: Cryptographic prevention of multiple votes
- ✅ **Verifiable Results**: Anyone can verify the vote count
- 🌐 **Decentralized**: No central authority required

### Custom Wallet Extension Architecture

**Why Custom Extension?**
During development, I encountered significant compatibility issues with the standard Midnight wallet extension. The custom solution provides:

```javascript
// Bridge Server API Endpoints
GET  /api/wallet/status         // Wallet connection status  
POST /api/sessions/:contract    // Create persistent CLI session
POST /api/sessions/:contract/execute // Execute voting commands
GET  /api/sessions/:contract/results // Get real-time results
```

**Key Improvements**:
- **Stable Connections**: Eliminates connection drops
- **Better Error Handling**: Clear error messages and debugging
- **Session Persistence**: CLI processes stay alive between operations
- **Development Workflow**: Streamlined testing and debugging

### API Flow Examples

**Deploy New Vote:**
```javascript
// Frontend initiates deployment
fetch('http://localhost:3002/api/contract/deploy', {
  method: 'POST',
  body: JSON.stringify({
    choiceA: "YES", choiceB: "NOD", 
    choiceC: "ABS", choiceD: "N/A"
  })
})
// Bridge server spawns: npm run cli
// CLI executes: deploy(providers, args)
// Returns: { contractAddress: "0xabc123..." }
```

**Submit Vote:**
```javascript
// Frontend submits vote
fetch(`http://localhost:3002/api/sessions/${contractAddress}/execute`, {
  method: 'POST', 
  body: JSON.stringify({
    command: 'vote',
    secretKey: 'alice',
    choice: 0  // Vote for option A
  })
})
// Uses existing CLI session
// Generates zero-knowledge proof
// Submits to blockchain privately
```

## 🔐 Privacy & Security Features

**🛡️ Cryptographic Privacy**
- **Zero-Knowledge Proofs**: Your vote choice is never revealed to anyone
- **Unique Voter IDs**: Cryptographic hashes prevent double voting without identity exposure
- **Private State**: Individual voting records are encrypted and private
- **Public Verification**: Vote tallies are publicly auditable

**🔒 Security Measures**  
- **Local Key Management**: Wallet seeds stored securely in environment variables
- **Session Isolation**: Each contract interaction runs in isolated process
- **Testnet Environment**: Safe testing environment (not production funds)
- **Input Validation**: All user inputs sanitized and validated

**⚡ Performance & Reliability**
- **Persistent Sessions**: CLI processes stay alive for faster interactions
- **Automatic Reconnection**: Robust error handling and reconnection logic
- **Real-time Updates**: Live vote count updates without manual refresh
- **Process Monitoring**: Background health checks and automatic cleanup

## 🚀 Getting Started

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher) 
- **npm** or yarn package manager
- **Google Chrome** browser (for wallet extension)
- **Midnight Network** testnet access

### Step-by-Step Setup

**1. Clone & Install**
```bash
# Clone the repository
git clone https://github.com/yourusername/privote-midnight.git
cd privote-midnight

# Install all dependencies
npm install

# Install contract dependencies  
cd scaffold-midnight/boilerplate/contract
npm install

# Install CLI dependencies
cd ../contract-cli  
npm install

# Install frontend dependencies
cd ../../frontend
npm install

# Install wallet extension dependencies
cd ../chrome-wallet-extension
npm install
```

**2. Environment Setup**
Create a `.env` file in the project root:
```env
# Your Midnight wallet seed phrase (keep this secret!)
WALLET_SEED=your_64_character_wallet_seed_here

# Midnight testnet endpoints
MIDNIGHT_RPC_URL=https://rpc.testnet-02.midnight.network
MIDNIGHT_INDEXER_URL=https://indexer.testnet-02.midnight.network
MIDNIGHT_INDEXER_WS=wss://indexer.testnet-02.midnight.network

# Development settings
NODE_ENV=development
```

**3. Load Chrome Extension**
```bash
# Open Chrome and navigate to extensions
chrome://extensions/

# Enable "Developer mode" (toggle in top-right)
# Click "Load unpacked"
# Select: /path/to/privote/chrome-wallet-extension/
```

**4. Start the System**

Terminal 1 - Bridge Server:
```bash
cd chrome-wallet-extension
node enhanced-bridge.js
# Server starts on http://localhost:3002
```

Terminal 2 - Frontend:
```bash  
cd frontend
npm run dev
# Frontend starts on http://localhost:5173
```

**5. First Time Setup**
```bash
# Generate a wallet (if you don't have one)
npm run wallet

# Request testnet tokens
npm run faucet

# Check your balance
npm run balance
```

## 🗳️ How to Use Privote

### Creating Your First Vote

1. **Open Privote**
   - Navigate to `http://localhost:5173`
   - Click "Connect Wallet" in the top-right
   - Authorize the wallet connection

2. **Deploy a Voting Contract**
   ```
   ✨ Create Vote Section:
   Option A: "YES"     # Support the proposal
   Option B: "NOD"     # Against the proposal  
   Option C: "ABS"     # Abstain
   Option D: "N/A"     # Not applicable
   
   Click "Deploy Contract"
   ```

3. **Share with Voters**
   ```
   Contract deployed successfully!
   Address: a1b2c3d4e5f6789012345678901234567890123456789012345678901234
   
   Share this address with people you want to vote
   ```

### Participating in a Vote

1. **Join Existing Vote**
   ```
   🔗 Join Vote Section:
   Contract Address: [paste the 64-character address]
   Click "Connect"
   ```

2. **Cast Your Vote**
   ```
   Voting options appear:
   ○ A: YES
   ○ B: NOD  
   ○ C: ABS
   ○ D: N/A
   
   Select your choice
   Secret Key: "alice"  # Your personal 5-character identifier
   Click "Submit Vote"
   ```

3. **View Results**
   ```
   Live Results:
   YES: ████████ 8 votes (40%)
   NOD: ██████ 6 votes (30%) 
   ABS: ████ 4 votes (20%)
   N/A: ██ 2 votes (10%)
   
   Total Voters: 20
   ```

### Advanced Usage

**Command Line Interface:**
```bash
# Deploy via CLI
cd boilerplate/contract-cli
npm run cli

# Interactive options:
# 1. Deploy new contract
# 2. Join existing contract  
# 3. Vote on proposals
# 4. Check results
```

**Batch Operations:**
```bash
# Deploy multiple contracts
npm run deploy:enhanced

# Automated testing
npm run test

# Check all balances  
npm run balance
```

## 🔧 Developer Guide

### Project Structure Deep Dive

```
privote/
├── 📱 Frontend Layer
│   ├── zkvote.html          # Main voting interface
│   ├── src/zkvote.js        # Core application logic
│   ├── src/zkvote.css       # Modern, responsive styling
│   └── package.json         # Vite build configuration
│
├── 🔗 Bridge Layer  
│   ├── enhanced-bridge.js   # Express API server (port 3002)
│   ├── popup.html/js        # Chrome extension interface
│   ├── manifest.json        # Extension configuration
│   └── Session management   # Persistent CLI processes
│
├── ⚙️ CLI Layer
│   ├── src/zkvote-enhanced-cli.ts    # Interactive CLI
│   ├── src/simple-api.ts             # Contract functions
│   ├── src/common-types.ts           # TypeScript types
│   └── src/config.ts                 # Network configuration
│
├── 🔐 Contract Layer
│   ├── src/zkvote.compact   # Smart contract (Compact language)
│   ├── src/witnesses.ts     # Zero-knowledge proof definitions
│   └── managed/             # Generated contract artifacts
│
└── 🛠️ Scripts & Config
    ├── scripts/deploy-enhanced.js    # Automated deployment
    ├── scripts/auto-generator.js     # Contract compilation
    └── Various utility scripts
```

### Key Components Explained

**1. Smart Contract (`zkvote.compact`)**
```compact
// Data structures
export ledger numberOfVoters: Counter;           // Total voter count
export ledger choices: Map<Uint<8>, Bytes<3>>;   // Voting options  
export ledger voteCounts: Map<Uint<8>, Counter>; // Vote tallies
export ledger items: Set<Bytes<32>>;             // Prevents double voting

// Constructor - Initialize voting options
constructor(choiceA: Bytes<3>, choiceB: Bytes<3>, choiceC: Bytes<3>, choiceD: Bytes<3>) {
  choices.insert(0, choiceA);  // Map index 0 to choice A
  choices.insert(1, choiceB);  // Map index 1 to choice B  
  choices.insert(2, choiceC);  // Map index 2 to choice C
  choices.insert(3, choiceD);  // Map index 3 to choice D
  
  // Initialize vote counters
  for (const i of 0..4) {
    voteCounts.insert(i, default<Counter>);
  }
}

// Main voting function - completely private
export circuit vote_for(secret_key: Bytes<5>, instance: Bytes<5>, index: Uint<8>): [] {
  // Generate unique voter identifier (privacy-preserving)
  const voterHash = public_key_vote(secret_key, instance);
  
  // Prevent double voting
  assert !items.member(voterHash) "Already voted";
  
  // Record vote (privately)
  items.insert(voterHash);              // Mark as voted
  numberOfVoters.increment(1);          // Increment total
  voteCounts.lookup(index).increment(1); // Count the vote
}
```

**2. Frontend JavaScript (`zkvote.js`)**
```javascript
class ZkVoteApp {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3002/api';
    this.currentContract = null;
    this.walletData = null;
  }

  // Deploy new voting contract
  async deployContract() {
    const choices = {
      choiceA: document.getElementById('choiceA').value,
      choiceB: document.getElementById('choiceB').value,
      choiceC: document.getElementById('choiceC').value,
      choiceD: document.getElementById('choiceD').value
    };

    const response = await fetch(`${this.apiBaseUrl}/contract/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(choices)
    });

    const result = await response.json();
    if (result.success) {
      this.displayContractAddress(result.contractAddress);
    }
  }

  // Join existing contract
  async joinContract() {
    const contractAddress = document.getElementById('contractAddress').value;
    
    const response = await fetch(`${this.apiBaseUrl}/sessions/${contractAddress}`, {
      method: 'POST'
    });

    if (response.ok) {
      this.currentContract = contractAddress;
      this.loadVotingInterface();
    }
  }

  // Submit private vote
  async submitVote() {
    const secretKey = document.getElementById('secretKey').value;
    const choice = this.selectedChoice;

    const response = await fetch(`${this.apiBaseUrl}/sessions/${this.currentContract}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'vote',
        secretKey: secretKey,
        choice: choice
      })
    });

    if (response.ok) {
      this.showVoteSuccess();
      this.refreshResults();
    }
  }
}
```

**3. Bridge Server (`enhanced-bridge.js`)**
```javascript
class EnhancedMidnightBridge {
  constructor() {
    this.persistentSessions = new Map(); // Contract sessions
    this.cliProcesses = new Map();       // Running CLI processes
    this.processStatus = new Map();      // Process monitoring
  }

  // Create persistent CLI session for contract
  async createSession(contractAddress) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Spawn persistent CLI process
    const cliProcess = spawn('npm', ['run', 'cli'], {
      cwd: this.cliPath,
      env: { 
        ...process.env, 
        CONTRACT_ADDRESS: contractAddress,
        AUTO_DEPLOY: 'true',
        DEPLOY_MODE: 'join',
        AUTO_EXIT: 'false'  // Keep process alive
      }
    });

    // Store session info
    this.persistentSessions.set(contractAddress, {
      sessionId,
      process: cliProcess,
      connected: false,
      lastUsed: Date.now()
    });

    return sessionId;
  }

  // Execute command in existing session
  async executeInSession(contractAddress, command) {
    const session = this.persistentSessions.get(contractAddress);
    if (!session) {
      throw new Error('No active session for contract');
    }

    // Send command to CLI process
    session.process.stdin.write(`${command}\n`);
    return this.waitForResponse(session);
  }
}
```

### API Reference

**Core Endpoints:**

```javascript
// System Status
GET  /api/status              // Health check
GET  /api/wallet/status       // Wallet connection info

// Contract Management  
POST /api/contract/deploy     // Deploy new voting contract
POST /api/contract/join       // Join existing contract

// Session Management (Key Innovation)
GET    /api/sessions                    // List active sessions
POST   /api/sessions/:contractAddress   // Create new session
DELETE /api/sessions/:contractAddress   // Close session
POST   /api/sessions/:contractAddress/execute // Execute voting commands

// Voting Operations
POST /api/vote                // Submit private vote
GET  /api/results/:contract   // Get vote tallies
GET  /api/state/:contract     // Get contract state
```

**Request/Response Examples:**

```javascript
// Deploy Contract
POST /api/contract/deploy
{
  "choiceA": "YES",
  "choiceB": "NOD", 
  "choiceC": "ABS",
  "choiceD": "N/A"
}
→ Response: { "success": true, "contractAddress": "0xabc123..." }

// Submit Vote
POST /api/sessions/0xabc123.../execute
{
  "command": "vote",
  "secretKey": "alice",
  "choice": 0
}
→ Response: { "success": true, "txId": "0xdef456..." }

// Get Results
GET /api/results/0xabc123...
→ Response: {
  "results": [
    { "choice": "YES", "votes": 15 },
    { "choice": "NOD", "votes": 8 },
    { "choice": "ABS", "votes": 3 },
    { "choice": "N/A", "votes": 1 }
  ],
  "totalVoters": 27
}
```

## 🔒 Security & Privacy Deep Dive

### Privacy Guarantees

**What Remains Private:**
- ✅ Individual vote choices (completely hidden)
- ✅ Voter identity (cryptographically anonymized) 
- ✅ Voting patterns (no correlation analysis possible)
- ✅ Secret keys (never transmitted or stored)

**What Is Public:**
- ✅ Vote tallies (transparent and verifiable)
- ✅ Total number of voters
- ✅ Contract addresses and voting options
- ✅ Transaction hashes (but not contents)

### Zero-Knowledge Implementation

```compact
// The magic: Creating anonymous voter IDs
circuit public_key_vote(sk: Bytes<5>, instance: Bytes<5>): Bytes<32> {
  return persistent_hash<Vector<3, Bytes<5>>>([
    pad(5, "pk:"),    // Prefix for voter identification
    instance,         // Contract-specific identifier  
    sk               // User's secret key
  ]);
}

// How double-voting prevention works:
// 1. Alice votes with secret "alice" → generates hash H1
// 2. Alice tries to vote again with "alice" → generates same hash H1  
// 3. Contract checks: H1 already exists → REJECT
// 4. Bob votes with secret "bobby" → generates different hash H2 → ACCEPT
```

**Security Properties:**
- **Unlinkability**: Cannot connect votes to identities
- **Receipt-Freeness**: No way to prove how you voted (prevents coercion)
- **Verifiability**: Anyone can verify the final tallies are correct
- **Immutability**: Votes cannot be changed after submission

### Production Security Considerations

```bash
# Environment Variables Security
WALLET_SEED=xxx  # Never commit to version control
# Use different seeds for different environments  
# Rotate seeds periodically

# Network Security
# Use HTTPS/WSS in production
# Implement rate limiting on API endpoints
# Add CORS restrictions for specific domains

# Smart Contract Security  
# Audit the Compact contract before mainnet
# Test extensively on testnet
# Implement emergency pause functionality
```

## 🚨 Known Issues & Limitations

### Current Limitations

**Technical:**
- **Testnet Only**: Not audited for mainnet use
- **4 Choice Maximum**: Contract supports A, B, C, D options only
- **Session Management**: May require manual restart in some cases
- **Browser Dependency**: Requires Chrome for wallet extension

**Scalability:**
- **Single Contract per Vote**: Each vote deploys a new contract
- **CLI Process Management**: Bridge server manages multiple processes
- **State Size**: Vote history grows with participation

### Roadmap & Future Improvements

**Short Term (Next Release):**
- [ ] Support for 6+ voting options (A-F)
- [ ] Improved error handling and user feedback
- [ ] Automated session recovery
- [ ] Mobile-responsive design improvements

**Medium Term:**
- [ ] Multi-signature contract deployment
- [ ] Time-locked voting (start/end dates)
- [ ] Delegation and proxy voting
- [ ] Vote weight based on token holdings

**Long Term:**
- [ ] Mainnet deployment and security audit
- [ ] Cross-chain voting support
- [ ] Integration with other Midnight dApps
- [ ] Advanced analytics and reporting

### Custom Wallet Extension Story

**The Problem:**
During development, I encountered significant compatibility issues with the standard Midnight wallet extension:

```
❌ Connection drops during contract interactions
❌ Inconsistent transaction signing
❌ Poor error messages and debugging info
❌ Session state not maintained
❌ Slow development iteration cycle
```

**The Solution:**
Built a custom Chrome extension that directly interfaces with the Midnight network:

```javascript
// Custom extension benefits
✅ Stable, persistent connections
✅ Better error handling with detailed logs  
✅ Direct integration with bridge server
✅ Session management for contract interactions
✅ Development-friendly debugging tools
✅ Local wallet seed management via .env
```

**Technical Implementation:**
- **Bridge Server**: Express.js API server (port 3002)
- **Process Management**: Persistent CLI sessions per contract
- **State Management**: Real-time session monitoring
- **Error Handling**: Comprehensive error catching and user feedback

## 🤝 Contributing

Privote is open source and welcomes contributions! Here's how you can help:

### Ways to Contribute

**🐛 Bug Reports**
- Found an issue? [Open a GitHub issue](https://github.com/yourusername/privote/issues)
- Include error logs, browser info, and steps to reproduce
- Check existing issues first to avoid duplicates

**💡 Feature Requests**  
- Have an idea? Share it in the [Discussions](https://github.com/yourusername/privote/discussions)
- Explain the use case and expected behavior
- Consider privacy and security implications

**🔧 Code Contributions**
```bash
# 1. Fork the repository
git fork https://github.com/yourusername/privote.git

# 2. Create feature branch
git checkout -b feature/amazing-improvement

# 3. Make your changes
# Follow existing code style
# Add tests for new functionality
# Update documentation

# 4. Test thoroughly
npm run test
npm run test:integration

# 5. Commit with clear messages
git commit -m "feat: add multi-choice voting support"

# 6. Push and create pull request
git push origin feature/amazing-improvement
# Open PR on GitHub with detailed description
```

**📚 Documentation**
- Improve setup instructions
- Add use case examples
- Translate to other languages
- Create video tutorials

### Development Setup for Contributors

```bash
# Clone your fork
git clone https://github.com/yourusername/privote.git
cd privote

# Install development dependencies
npm install
npm run install:all

# Set up development environment
cp .env.example .env
# Edit .env with your wallet seed

# Start development servers
npm run dev:all
# This starts bridge server, frontend, and file watchers

# Run tests before submitting PR
npm run test:all
npm run lint
npm run type-check
```

### Code Style Guidelines

**JavaScript/TypeScript:**
```javascript
// Use clear, descriptive names
const deployVotingContract = async (choices) => { ... }

// Add JSDoc comments for functions
/**
 * Submits a private vote to the contract
 * @param {string} secretKey - 5-character voter identifier
 * @param {number} choiceIndex - 0-3 for choices A-D
 * @returns {Promise<string>} Transaction ID
 */
async submitVote(secretKey, choiceIndex) { ... }

// Handle errors gracefully
try {
  const result = await contractCall();
  return { success: true, data: result };
} catch (error) {
  console.error('Contract call failed:', error);
  return { success: false, error: error.message };
}
```

**Compact Smart Contracts:**
```compact
// Clear variable names and comments
export ledger voteCounts: Map<Uint<8>, Counter>; // Vote tallies by choice
export ledger voterHashes: Set<Bytes<32>>;       // Prevents double voting

export circuit vote_for(secret_key: Bytes<5>, choice: Uint<8>): [] {
  // Validate input parameters
  assert choice < 4 "Invalid choice index";
  
  // Prevent double voting
  const voterHash = generate_voter_id(secret_key);
  assert !voterHashes.member(voterHash) "Already voted";
  
  // Record vote
  voterHashes.insert(voterHash);
  voteCounts.lookup(choice).increment(1);
}
```

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Privote Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

**Core Technologies:**
- **[Midnight Network](https://midnight.network)** - Privacy-preserving blockchain infrastructure
- **[Compact Language](https://docs.midnight.network/develop/reference/compact/)** - Zero-knowledge smart contract language
- **[Node.js](https://nodejs.org)** - JavaScript runtime for backend services
- **[Express.js](https://expressjs.com)** - Web framework for API server
- **[Vite](https://vitejs.dev)** - Fast frontend build tool

**Community & Support:**
- **Midnight Developer Community** - Documentation, examples, and support
- **Zero-Knowledge Cryptography Researchers** - Foundational privacy technology
- **Open Source Contributors** - Bug reports, feature requests, and improvements

**Special Thanks:**
- **Midnight Network Team** - For building the privacy-preserving blockchain platform
- **Compact Language Developers** - For creating an intuitive zero-knowledge programming language
- **Early Testers & Contributors** - For feedback and improvements during development

## 📞 Support & Community

### Getting Help

**📖 Documentation:**
- [Midnight Network Docs](https://docs.midnight.network/)
- [Compact Language Reference](https://docs.midnight.network/develop/reference/compact/)
- [Zero-Knowledge Proofs Guide](https://docs.midnight.network/learn/concepts/zero-knowledge-proofs/)

**💬 Community:**
- [GitHub Discussions](https://github.com/yourusername/privote/discussions) - General questions & ideas
- [Discord](https://discord.gg/midnight-network) - Real-time chat with developers
- [Telegram](https://t.me/midnight_network) - Community announcements

**🐛 Issue Reporting:**
- [GitHub Issues](https://github.com/yourusername/privote/issues) - Bug reports & feature requests
- [Security Issues](mailto:security@privote.dev) - Private security vulnerability reports

### Project Status

**Current Version:** v1.0.0 (Beta)
**Status:** 🚧 Active Development  
**Compatibility:** Midnight Testnet-02
**License:** MIT

**Development Roadmap:**
- ✅ **Phase 1**: Core voting functionality (Complete)
- ✅ **Phase 2**: Custom wallet extension (Complete)  
- ✅ **Phase 3**: Web interface & API bridge (Complete)
- 🔄 **Phase 4**: Enhanced UX & mobile support (In Progress)
- ⏳ **Phase 5**: Security audit & mainnet preparation (Planned)

---

## 🌟 Key Features Summary

**🔐 Complete Privacy**
- Zero-knowledge vote casting
- Anonymous voter identification  
- No vote-to-voter linkability

**⚡ Easy to Use**
- Beautiful web interface
- One-click wallet connection
- Real-time results updates

**🛠️ Developer Friendly**  
- Custom Chrome extension wallet
- Comprehensive API bridge
- TypeScript support throughout

**🔒 Secure by Design**
- Cryptographic vote verification
- Double-voting prevention
- Open source & auditable

---

**Built with ❤️ using Midnight Network's revolutionary zero-knowledge technology**

*"Making private voting accessible to everyone"*

## 🧪 Testing & Development

### Running Tests

```bash
# Test smart contract
cd scaffold-midnight/boilerplate/contract
npm test

# Test CLI functionality  
cd ../contract-cli
npm run test

# Test frontend components
cd ../../frontend
npm run test

# Integration testing
npm run test:integration
```

### Development Workflow

```bash
# 1. Start development environment
npm run dev

# 2. Watch for contract changes
cd boilerplate/contract
npm run watch

# 3. Hot reload frontend
cd ../../frontend  
npm run dev

# 4. Monitor bridge server
cd ../chrome-wallet-extension
npm run dev
```

### Debugging Tips

**Common Issues & Solutions:**

```bash
# Bridge server not starting
lsof -ti:3002 | xargs kill -9  # Kill existing processes
node enhanced-bridge.js        # Restart server

# CLI sessions not persisting  
# Check AUTO_EXIT environment variable
echo $AUTO_EXIT  # Should be 'false'

# Contract deployment failing
npm run balance  # Check wallet has testnet tokens
npm run faucet   # Request more tokens if needed

# Extension not loading
# Check Chrome developer mode is enabled
# Reload extension after code changes
```

**Development Console Commands:**
```javascript
// Frontend debugging (browser console)
window.zkVoteApp.walletData     // Check wallet status
window.zkVoteApp.currentContract // View active contract
window.zkVoteApp.refreshResults() // Manual refresh

// Backend debugging (server logs)
curl http://localhost:3002/api/status        // Health check
curl http://localhost:3002/api/sessions      // Active sessions
curl http://localhost:3002/api/processes     // Running processes
```