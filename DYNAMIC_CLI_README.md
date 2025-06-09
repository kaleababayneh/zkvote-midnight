 # Dynamic CLI System for Midnight Blockchain Contracts

This dynamic CLI system automatically analyzes Midnight blockchain contracts and generates interactive CLI menus based on the contract's functions and state properties.

## ✨ Features

- **🔍 Automatic Contract Analysis**: Parses compiled TypeScript contract definitions to extract function signatures and ledger state
- **📋 Dynamic Menu Generation**: Creates interactive CLI menus automatically based on contract functions  
- **🎛️ Smart Parameter Collection**: Intelligently prompts users for function parameters with type conversion
- **🔐 Read-Only vs State-Changing**: Automatically detects and handles both read-only queries and state-changing transactions
- **🗳️ Special Handling**: Smart prompts for voting functions (e.g., "0 for Option A, 1 for Option B")
- **🏛️ State Display**: Automatic querying and display of all contract ledger state properties

## 🔧 Implementation

### Core Components

1. **ContractAnalyzer** (`src/contract-analyzer.ts`)
   - Parses TypeScript contract definitions from `contract/src/managed/zkvote/contract/index.d.cts`
   - Extracts function signatures, parameters, return types, and ledger state
   - Maps TypeScript types to user-friendly names

2. **DynamicCLIGenerator** (`src/dynamic-cli-generator.ts`)
   - Generates interactive menu items from contract analysis
   - Creates dynamic function handlers with parameter collection
   - Handles both read-only and state-changing function execution

3. **Enhanced CLI** (`src/cli.ts`)
   - Replaces hardcoded switch statements with dynamic system
   - Integrates seamlessly with existing Midnight wallet and provider infrastructure

### Contract Functions Detected

From the `zkvote.compact` contract, the system automatically detected:

- ✅ `increment()` - Increments the counter by 1
- ✅ `vote_for(index: number)` - Vote for an option (0 for A, 1 for B)  
- ✅ `get_vote_count(index: number)` - Get the vote count for an option (read-only)

### Ledger State Properties

- ✅ `round: number` - Current voting round
- ✅ `votesA: number` - Votes for option A
- ✅ `votesB: number` - Votes for option B  
- ✅ `items: Set<data>` - Set of voting items

## 🚀 Usage

### Testing the System

```bash
# Test contract analysis
npm run analyze

# Test dynamic CLI generation (without blockchain connection)
node --loader ts-node/esm src/test-dynamic-cli.ts

# Run full CLI (requires blockchain connection)
npm run standalone
npm run testnet-remote
npm run testnet-local
```

### Generated CLI Menu

When you run the CLI, you'll see a dynamically generated menu like this:

```
=== Dynamic Contract CLI ===
Contract Address: 0x...
Available functions have been automatically detected from your contract!

You can do one of the following:
  1. Increment
  2. Vote For (1 param)
  3. Get Vote Count (1 param) (read-only)
  4. Display contract state (read-only)
  5. Exit (read-only)
Which would you like to do?
```

### Smart Parameter Collection

For functions that require parameters, the system will intelligently prompt:

```
Select option:
  0. Option A
  1. Option B
Enter choice (0 or 1): 
```

## 🔄 How It Works

1. **Contract Compilation**: Your `.compact` contract is compiled to TypeScript definitions
2. **Analysis**: `ContractAnalyzer` reads the generated `.d.cts` file and extracts function metadata
3. **Menu Generation**: `DynamicCLIGenerator` creates CLI menu items based on the analysis
4. **Dynamic Execution**: Function handlers are created dynamically using bracket notation: `contract.callTx[functionName](...args)`
5. **Type Conversion**: User inputs are automatically converted to appropriate types (BigInt, Uint8Array, etc.)

## 🎯 Benefits

- **🔧 No More Hardcoding**: Add new functions to your contract and they automatically appear in the CLI
- **📝 Self-Documenting**: Function descriptions and parameter prompts are generated automatically
- **🔄 Maintainable**: Changes to contract functions don't require CLI code updates
- **🎨 Consistent UX**: All contract functions get the same professional CLI treatment
- **⚡ Developer Productivity**: Focus on contract logic, not CLI implementation

## 🔮 Future Enhancements

- **📊 Complex Parameter Types**: Support for structs, arrays, and custom types
- **🎨 Theming**: Customizable CLI themes and styling
- **📖 Help System**: Integrated help and documentation
- **🔍 Function Discovery**: Automatic detection of pure vs impure circuits
- **💾 State History**: Track and display contract state changes over time

## 🛠️ Development

The system is built with:
- **TypeScript** for type safety and analysis
- **Node.js** readline for interactive prompts  
- **@midnight-ntwrk/** packages for blockchain integration
- **Regex parsing** for TypeScript definition analysis

## 📁 File Structure

```
counter-cli/src/
├── contract-analyzer.ts      # Contract analysis engine
├── dynamic-cli-generator.ts  # Dynamic menu generation
├── cli.ts                   # Main CLI with dynamic integration
├── test-analyzer.ts         # Contract analysis testing
├── test-dynamic-cli.ts      # CLI generation testing
└── quick-test.ts           # Quick integration test
```

---

🎉 **Congratulations!** You now have a dynamic CLI system that automatically adapts to your contract changes, making Midnight blockchain development more efficient and enjoyable!
