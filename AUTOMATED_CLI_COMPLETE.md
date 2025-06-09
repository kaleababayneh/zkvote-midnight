# 🎯 Automated CLI Generator for Compact Smart Contracts

## Overview

This project provides a **complete automated tool** for developers to generate CLI code from Compact smart contracts. When you write or modify your Compact contract, the CLI tool is automatically regenerated, mapping every contract function to corresponding CLI functions with **proper TypeScript support**.

## ✨ Key Features

- **🔄 Fully Automated**: No manual setup required
- **📋 Contract Analysis**: Automatically extracts functions and state from `.compact` files
- **🎯 TypeScript-Aware**: Generates proper TypeScript with type annotations and interfaces
- **🚀 Dynamic CLI**: CLI adapts automatically to contract changes
- **🔧 Developer-Friendly**: IDE-friendly code with JSDoc comments
- **⚡ One-Command Regeneration**: Simple `npm run auto-generate-ts` command

## 🏗️ Architecture

```
contract/src/zkvote.compact
           ↓ (Contract Analysis)
scripts/typescript-auto-generator.js
           ↓ (Code Generation)
counter-cli/src/enhanced-*.ts
           ↓ (TypeScript Build)
counter-cli/dist/enhanced-*.js
           ↓ (Runtime)
Dynamic CLI with Type Safety
```

## 🚀 Quick Start

### 1. Generate CLI from Contract
```bash
# Generate TypeScript CLI from contract
npm run auto-generate-ts

# Build the generated TypeScript
npm run build
```

### 2. Run the Enhanced CLI
```bash
cd counter-cli
npm run testnet-remote
# Enter your 64-character hex wallet seed
# Use the dynamically generated CLI!
```

### 3. Test the System
```bash
# Test the auto-generation system
node scripts/test-enhanced-cli.js

# Run the complete demo
node scripts/demo-auto-generation.js
```

## 📋 Generated Files

The auto-generator creates these TypeScript files:

- **`enhanced-api.ts`** - Enhanced API wrapper with proper TypeScript types
- **`enhanced-cli.ts`** - Full-featured CLI with dynamic function mapping
- **`simple-enhanced-cli.ts`** - Simplified CLI wrapper for easy integration

All files include:
- ✅ Proper TypeScript type annotations
- ✅ Interface definitions for contract functions
- ✅ Type-safe error handling
- ✅ JSDoc comments with parameter types
- ✅ Integration with existing API functions

## 🔧 Contract Analysis

The system automatically analyzes your `.compact` contract and extracts:

### Functions Detected
- `increment()` → Increments the counter by 1
- `get_round()` → Gets the current round number
- `vote_for(index: number)` → Vote for an option (0 for A, 1 for B)
- `get_vote_count(index: number)` → Get vote count for an option

### State Variables
- `round: number` - Current voting round
- `votesA: number` - Votes for option A
- `votesB: number` - Votes for option B  
- `items: Set<data>` - Collection of voting items

## 🎯 Dynamic CLI Menu

The generated CLI automatically creates menu items based on your contract:

```
1. Increment                    (calls increment function)
2. Get Round                    (calls get_round function)
3. Vote For (1 param)          (calls vote_for function)
4. Get Vote Count (1 param)    (calls get_vote_count function)
5. Display contract state      (shows current state)
6. Exit                        (exits CLI)
```

## 🔄 Workflow Integration

### After Modifying Your Contract:

1. **Edit** your `.compact` contract file
2. **Run** `npm run auto-generate-ts` 
3. **Build** with `npm run build`
4. **Use** the updated CLI immediately!

### NPM Scripts Available:

```json
{
  "auto-generate": "node scripts/auto-generator.js",
  "auto-generate-ts": "node scripts/typescript-auto-generator.js", 
  "auto-generate-verbose": "node scripts/typescript-auto-generator.js --verbose"
}
```

## 🧪 Testing & Verification

### Test the Enhanced CLI:
```bash
node scripts/test-enhanced-cli.js
```

Expected output:
```
🧪 Testing Enhanced CLI Auto-Generation
=====================================

📋 Contract Analysis Results:
   Name: ZkVote Contract
   Functions: 4
   State Variables: 4

🔧 Available Functions:
   1. increment() -> void
   2. get_round() -> number
   3. vote_for(index: number) -> void
   4. get_vote_count(index: number) -> number

✅ Enhanced CLI Auto-Generation Test Complete!
```

### Run Complete Demo:
```bash
node scripts/demo-auto-generation.js
```

## 💡 Key Benefits

### For Developers:
- **Zero Manual Setup** - Contract changes instantly reflect in CLI
- **Type Safety** - Full TypeScript support with proper error handling
- **IDE Support** - Intellisense, auto-completion, and error detection
- **Consistent Interface** - Standardized CLI patterns across all contracts

### For Projects:
- **Rapid Prototyping** - Quickly test contract functions
- **Easy Debugging** - Interactive CLI for contract exploration
- **Team Collaboration** - Shared CLI interface for all team members
- **Production Ready** - Proper error handling and logging

## 🔍 Technical Details

### Contract Parser:
- Uses regex patterns to extract function signatures
- Identifies parameter types and return types
- Analyzes contract state variables
- Handles Compact-specific syntax

### TypeScript Generator:
- Generates proper TypeScript interfaces
- Creates type-safe function wrappers
- Implements error handling with typed exceptions
- Maintains compatibility with existing API

### CLI Generator:
- Dynamic menu generation based on contract analysis
- Parameter validation and input handling
- State display and debugging features
- Graceful error handling and user feedback

## 🎉 Success Metrics

✅ **Contract Analysis**: Successfully parsed ZkVote contract with 4 functions and 4 state variables  
✅ **TypeScript Generation**: Generated type-safe enhanced API, CLI, and wrapper files  
✅ **Build Process**: All TypeScript files compile without errors  
✅ **CLI Integration**: Enhanced CLI initializes and shows dynamic contract analysis  
✅ **Menu System**: Generated 6 interactive menu items from contract functions  
✅ **Type Safety**: Proper error handling with typed exceptions  

## 🚀 Ready to Use!

Your automated CLI generation system is now complete and fully functional. The tool successfully:

1. **Analyzes** your Compact smart contract
2. **Generates** TypeScript CLI code with proper types
3. **Builds** the code without errors
4. **Creates** dynamic interactive CLI menus
5. **Integrates** seamlessly with existing infrastructure

**Next Steps:**
1. `cd counter-cli && npm run testnet-remote`
2. Enter your 64-character hex wallet seed
3. Use the dynamically generated CLI!

**To regenerate after contract changes:**
```bash
npm run auto-generate-ts && npm run build
```

---

*This automated CLI generation system eliminates manual setup and makes the entire CLI generation process automated based on contract structure with proper TypeScript support.* 🎯
