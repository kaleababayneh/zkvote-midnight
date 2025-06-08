# Counter DApp

A simple counter decentralized application built on Midnight Network, demonstrating basic smart contract interactions.

## Features

- 🔗 Wallet connection integration
- ➕ Increment counter value
- ➖ Decrement counter value
- 🔄 Refresh current value from contract
- 🎨 Modern Material-UI design
- 📱 Responsive layout

## Getting Started

### Prerequisites

- Node.js (LTS version recommended)
- Midnight Lace Wallet browser extension
- Access to a Midnight Network node

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update the `.env` file with your Midnight Network configuration:
```bash
VITE_NODE_URL=http://localhost:8080
VITE_INDEXER_URL=http://localhost:8081
VITE_PROOF_SERVER_URL=http://localhost:6300
VITE_NETWORK_ID=testnet
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Usage

1. **Connect Wallet**: Click the "Connect Wallet" button in the header to connect your Midnight Lace Wallet
2. **Interact with Counter**: Once connected, use the increment/decrement buttons to modify the counter value
3. **Refresh**: Use the refresh button to get the latest value from the smart contract

## Architecture

The DApp is built with:
- **React 18** - User interface framework
- **TypeScript** - Type safety and better developer experience
- **Material-UI** - Component library and theming
- **Vite** - Fast build tool and development server
- **Midnight SDK** - Integration with Midnight Network

## Smart Contract

This DApp interacts with a simple counter smart contract written in Compact that supports:
- `increment()` - Increases the counter value by 1
- `decrement()` - Decreases the counter value by 1
- Reading the current counter value

## Contributing

This is a demonstration project. Feel free to fork and modify for your own use cases.

## License

This project is licensed under the Apache 2.0 License.
