# 🚀 Midnight Contract Deployment Workflow

## Overview

The `npm run deploy` command provides a complete, automated deployment workflow for Midnight Compact contracts. This single command handles everything from contract compilation to launching an interactive CLI on a local Midnight network.

## What Happens When You Run `npm run deploy`

### 1. 🔍 **Prerequisites Check**
- Verifies `.compact` contract file exists in project root
- Checks Docker availability and version
- Validates project structure and dependencies

### 2. 🔨 **Contract Compilation** (`npm run dev`)
- Syncs `.compact` files from root to `boilerplate/contract/src/`
- Compiles contract with `compactc` compiler
- Generates TypeScript types and definitions
- Updates API functions to match contract
- Detects and includes witness functions
- Builds CLI with dynamic contract analysis

### 3. 🐳 **Local Network Setup** (`npm run standalone`)
- Pulls and starts Docker containers for local Midnight node
- Configures proof server, indexer, and blockchain node
- Sets up local development environment

### 4. 📦 **Contract Deployment**
- Automatically deploys compiled contract to local network
- Generates contract address and transaction details
- Prepares wallet and funding for testing

### 5. 🎯 **Interactive CLI Launch**
- Starts interactive CLI with all contract functions
- Provides menu-driven interface for contract interaction
- Supports parameter input and result display
- Handles both read and write operations

## Available Commands

```bash
# Full deployment workflow
npm run deploy

# Quick deployment (skip prerequisite checks)
npm run deploy:quick

# Preview commands without execution
npm run deploy --dry-run

# Show help and options
npm run deploy --help

# Individual steps
npm run dev          # Compile and generate CLI only
npm run wallet       # Deploy to testnet instead
```

## Directory Structure

```
example-counter/
├── basic.compact                    # 📝 Your contract (edit here)
├── scripts/
│   └── deploy.js                   # 🚀 Deployment orchestrator
└── boilerplate/
    ├── contract/
    │   └── src/
    │       ├── basic.compact       # 📄 Auto-synced contract
    │       ├── witnesses.ts        # 🔑 Witness functions
    │       └── managed/            # 🔨 Compiled output
    └── contract-cli/
        ├── standalone.yml          # 🐳 Docker configuration
        └── src/
            ├── api.ts             # 🔌 Generated API
            ├── cli.ts             # 🖥️ Interactive CLI
            └── enhanced-api.ts    # 📊 Contract metadata
```

## Features

### ✅ **Automatic Detection**
- Contract functions and parameters
- Witness functions with proper typing
- Ledger state variables
- Return types and descriptions

### ✅ **Robust Parsing**
- Multi-line function definitions
- Indented code formatting
- TypeScript type annotations
- Nested objects and arrays

### ✅ **Smart Updates**
- Zero manual configuration
- Auto-sync from root directory
- Dynamic CLI generation
- Hot-reload development

### ✅ **Docker Integration**
- Containerized Midnight node
- Proof server automation
- Network isolation
- Clean environment setup

## Prerequisites

- **Docker Desktop**: Must be running for local deployment
- **Node.js 18+**: Required for compilation and CLI
- **Compact Compiler**: `compactc` must be available in PATH
- **Contract File**: `.compact` file in project root

## Example Workflow

```bash
# 1. Create your contract
cat > my-voting.compact << 'EOF'
pragma language_version 0.15;
import CompactStandardLibrary;

export ledger votes: Counter;

export circuit vote(): [] {
  votes.increment(1);
}

export circuit get_votes(): Uint<64> {
  return votes;
}
EOF

# 2. Deploy everything
npm run deploy

# 3. Use the interactive CLI that opens automatically
# ✅ Contract deployed to local network
# 🎯 CLI ready for testing
# 📊 All functions auto-detected
```

## Benefits

1. **🚀 Speed**: Single command for complete deployment
2. **🔄 Consistency**: Same process every time
3. **🛡️ Safety**: Prerequisites checked before execution
4. **🧪 Testing**: Immediate CLI for contract interaction
5. **📝 Documentation**: Auto-generated function docs
6. **🔍 Debugging**: Clear error messages and suggestions

## Troubleshooting

### Docker Issues
```bash
# Check Docker status
docker --version
docker ps

# Start Docker Desktop if needed
open -a Docker
```

### Contract Issues
```bash
# Verify contract syntax
compactc --check my-contract.compact

# Check for compilation errors
npm run dev
```

### Network Issues
```bash
# Clean up existing containers
docker compose -f boilerplate/contract-cli/standalone.yml down

# Fresh deployment
npm run deploy
```

This deployment system ensures that any changes to your `.compact` contract or witness functions are automatically reflected in the generated CLI, providing a seamless development experience for Midnight applications.
