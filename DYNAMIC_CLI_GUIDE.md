# Dynamic CLI for Zkvotrs Contract

*Auto-generated on: 2025-06-09T07:26:26.894Z*

## 🚀 Quick Start

The CLI now automatically adapts to your smart contract! Simply run:

```bash
cd counter-cli
npm run build
npm run testnet-remote  # or standalone, testnet-local, etc.
```

## 📊 Contract Analysis

**Contract:** Zkvotrs Contract  
**Source File:** zkvotrs.compact  
**Functions:** 6  
**State Variables:** 4  

## 🛠️ Available Functions


### 1. megaBoostCounterxx

- **Description:** Increments the counter/round by 1
- **Parameters:** None
- **Return Type:** []
- **Read-Only:** No

### 2. awesome_function_first

- **Description:** Execute awesome_function_first function with 0 parameter(s)
- **Parameters:** None
- **Return Type:** Uint<64>
- **Read-Only:** Yes

### 3. get_round

- **Description:** Get the current round/counter value
- **Parameters:** None
- **Return Type:** Uint<64>
- **Read-Only:** Yes

### 4. vote_for

- **Description:** Vote for an option (0 for A, 1 for B)
- **Parameters:** index (Uint<8>)
- **Return Type:** []
- **Read-Only:** No

### 5. get_vote_count

- **Description:** Get the vote count for an option (0 for A, 1 for B)
- **Parameters:** index (Uint<8>)
- **Return Type:** Uint<64>
- **Read-Only:** Yes

### 6. public_key_vote

- **Description:** Generate a public key for voting
- **Parameters:** sk (Bytes<3>), instance (Bytes<3>)
- **Return Type:** Bytes<32>
- **Read-Only:** Yes


## 📊 Contract State

- **round** (Counter)
- **votesA** (Counter)
- **votesB** (Counter)
- **items** (Set<Bytes<32>>)

## ⚡ Auto-Generation

When you modify your contract (`zkvotrs.compact`), run the auto-generator:

```bash
node scripts/auto-generator.js
```

This will:
1. 🔍 Analyze your contract
2. 🔨 Compile the contract 
3. 🔧 Build TypeScript
4. 📝 Generate CLI code
5. 🎯 Update all functions dynamically

## 🎨 Features

- **Dynamic Menus:** Menu options are generated from your contract functions
- **Type Safety:** Automatic parameter type conversion
- **Error Handling:** Comprehensive error messages and suggestions
- **State Display:** View all contract state variables
- **Transaction Tracking:** See transaction IDs and block confirmations

## 🔧 Customization

To customize the auto-generation:

1. **Function Descriptions:** Edit `contract-analyzer.ts`
2. **Special Parameters:** Modify `dynamic-cli-generator.ts`
3. **UI Enhancements:** Update `enhanced-cli.ts`

## 📝 Manual Override

If you need to override auto-generated functions, create them in:
- `src/api.ts` - For API functions
- `src/cli.ts` - For CLI interactions

The enhanced CLI will prefer manual implementations over auto-generated ones.
