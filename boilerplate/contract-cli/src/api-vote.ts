#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger as loggerUtils } from './logger-utils.js';

// Configure dotenv to load from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

import * as api from './simple-api.js';
import { TestnetRemoteConfig } from './config.js';

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

// Parse command line arguments
const [, , contractAddress, choice, secretKey] = process.argv;

if (!contractAddress || !choice || !secretKey) {
  console.error('Usage: api-vote <contractAddress> <choice> <secretKey>');
  console.error('Choice should be 0-3 (0=A, 1=B, 2=C, 3=D)');
  process.exit(1);
}

const choiceIndex = parseInt(choice, 10);
if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
  console.error('Invalid choice. Must be 0, 1, 2, or 3');
  process.exit(1);
}

async function apiVote() {
  try {
    console.log(`🗳️  Starting API vote for contract: ${contractAddress}`);
    console.log(`📊 Voting for choice: ${choiceIndex} (${['A', 'B', 'C', 'D'][choiceIndex]})`);
    
    const config = new TestnetRemoteConfig();
    const logger = await loggerUtils(config.logDir);
    api.setLogger(logger);
    
    console.log('✅ Building wallet...');
    const wallet = await api.buildWalletAndWaitForFunds(config, GENESIS_MINT_WALLET_SEED, '');
    console.log('✅ Wallet initialized');
    
    console.log('✅ Configuring providers...');
    const providers = await api.configureProviders(wallet, config);
    console.log('✅ Providers configured');
    
    console.log(`🔗 Joining contract: ${contractAddress}`);
    const zkvoteContract = await api.joinContract(providers, contractAddress);
    console.log('✅ Contract joined');
    
    console.log(`🗳️  Submitting vote...`);
    const txId = await api.voteFor(providers, zkvoteContract, secretKey, choiceIndex);
    console.log(`✅ Vote submitted! Transaction: ${txId}`);
    
    // Get updated state to return vote results
    console.log('📊 Getting updated contract state...');
    const state = await api.getZkvoteLedgerState(providers, contractAddress);
    
    const result = {
      success: true,
      transactionId: txId,
      voteResults: {
        numberOfVoters: state.numberOfVoters,
        choices: [] as string[],
        voteCounts: [] as number[]
      }
    };
    
    // Extract vote counts and choices
    for (let i = 0; i < 4; i++) {
      const voteCount = state.voteCounts.get(BigInt(i)) || BigInt(0);
      const choice = state.choices.get(BigInt(i)) || '';
      result.voteResults.choices[i] = choice;
      result.voteResults.voteCounts[i] = Number(voteCount);
    }
    
    console.log('JSON_RESULT_START');
    console.log(JSON.stringify(result));
    console.log('JSON_RESULT_END');
    
  } catch (error) {
    console.error(`❌ API vote failed: ${error instanceof Error ? error.message : String(error)}`);
    
    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
    
    console.log('JSON_RESULT_START');
    console.log(JSON.stringify(errorResult));
    console.log('JSON_RESULT_END');
    
    process.exit(1);
  }
}

apiVote().catch(console.error);
