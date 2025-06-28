# ZkVote Contract CLI

This is a simplified CLI for interacting with the ZkVote contract. The dynamic contract analyzer has been removed and replaced with hardcoded functions specific to the voting contract.

## Contract Overview

The ZkVote contract allows for anonymous voting with the following features:
- 4 voting choices (A, B, C, D)
- Anonymous voting using secret keys
- Vote counting and tracking
- Prevents double voting

## Available Functions

### 1. Increment Voter Count
- Manually increments the total voter count
- Function: `increment()`

### 2. Cast a Vote
- Cast an anonymous vote for one of the choices
- Function: `vote_for(secret_key, instance, choice_index)`
- Requires:
  - `secret_key`: 5-byte secret key for anonymous voting
  - `instance`: Instance identifier (hardcoded as "zkvot")
  - `choice_index`: 0-3 for choices A-D

### 3. Get Vote Count
- Get the current vote count for a specific choice
- Function: `get_vote_count(choice_index)`
- Returns: Number of votes for the specified choice

### 4. Display Contract State
- Shows the current state of the contract including:
  - Total number of voters
  - Vote counts for all choices
  - Contract address
  - Unique voters count

## Usage

### Local Development (Standalone)
```bash
npm run standalone
```

### Testnet Local
```bash
npm run testnet-local
```

### Testnet Remote
```bash
npm run testnet-remote
```

## Changes Made

1. **Removed Dynamic Contract Analysis**: The `contract-analyzer.ts` and `dynamic-cli-generator.ts` are no longer used
2. **Hardcoded ZkVote Functions**: Created specific functions for the voting contract in `simple-api.ts`
3. **Simplified CLI**: Created `zkvote-cli.ts` with hardcoded menu options for voting operations
4. **Updated Entry Points**: Modified all entry point files to use the new CLI

## Files Modified

- `common-types.ts` - Updated types from Counter to Zkvote
- `simple-api.ts` - New API with hardcoded zkvote functions
- `zkvote-cli.ts` - New CLI with voting-specific menu
- `index.ts` - Updated exports
- `standalone.ts` - Updated import
- `testnet-local.ts` - Updated import
- `testnet-remote-start-proof-server.ts` - Updated import

## Contract Structure

The contract has these ledger state variables:
- `numberOfVoters`: Counter for total voters
- `choices`: List of voting choices (4 items)
- `voteCounts`: Map of choice index to vote count
- `items`: Set of voter public keys (prevents double voting)

The contract constructor takes 4 choice parameters (each 3 bytes) to set up the voting options.
