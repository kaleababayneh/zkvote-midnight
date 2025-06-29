#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';

// Configure dotenv to load from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

import * as api from './simple-api.js';
import { TestnetRemoteConfig } from './config.js';

// Parse command line arguments
const [, , contractAddress, choice, secretKey] = process.argv;

if (!contractAddress || !choice || !secretKey) {
  console.error('Usage: direct-vote <contractAddress> <choice> <secretKey>');
  console.error('Choice should be 0-3 (0=A, 1=B, 2=C, 3=D)');
  process.exit(1);
}

const choiceIndex = parseInt(choice, 10);
if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
  console.error('Invalid choice. Must be 0, 1, 2, or 3');
  process.exit(1);
}

// Create a simple logger
function createLogger() {
  return pino({
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname'
      }
    }
  });
}

async function directVote() {
  try {
    console.log(`🗳️  Starting direct vote for contract: ${contractAddress}`);
    
    // Initialize config and logger
    const config = new TestnetRemoteConfig();
    const logger = createLogger();
    api.setLogger(logger);
    
    // Build wallet using environment seed
    const seedPhrase = process.env.WALLET_SEED;
    if (!seedPhrase) {
      throw new Error('WALLET_SEED environment variable is required');
    }
    
    const wallet = await api.buildWalletAndWaitForFunds(config, seedPhrase, '');
    console.log('✅ Wallet initialized');
    
    // Configure providers
    const providers = await api.configureProviders(wallet, config);
    console.log('✅ Providers initialized');
    
    // Join the contract
    console.log(`🔗 Joining contract: ${contractAddress}`);
    const contract = await api.joinContract(providers, contractAddress);
    console.log('✅ Contract joined successfully');
    
    // Cast the vote
    console.log(`🗳️  Casting vote for choice ${choiceIndex}...`);
    const txId = await api.voteFor(providers, contract, secretKey, choiceIndex);
    console.log(`✅ Vote cast! Transaction: ${txId}`);
    
    // Get updated state 
    console.log('📊 Getting updated vote counts...');
    const results: Record<string, string> = {};
    for (let i = 0; i < 4; i++) {
      try {
        const count = await api.getVoteCount(providers, contract, i);
        results[`choice${i}`] = count.toString();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to get count for choice ${i}: ${errorMessage}`);
        results[`choice${i}`] = '0';
      }
    }
    
    console.log('📋 Final voting results:');
    console.log(`  A (0): ${results.choice0} votes`);
    console.log(`  B (1): ${results.choice1} votes`);  
    console.log(`  C (2): ${results.choice2} votes`);
    console.log(`  D (3): ${results.choice3} votes`);
    
    // Output JSON for parsing
    console.log('JSON_RESULT_START');
    console.log(JSON.stringify({
      success: true,
      transaction: txId,
      choice: choiceIndex,
      choiceName: ['A', 'B', 'C', 'D'][choiceIndex],
      results: results,
      timestamp: new Date().toISOString()
    }));
    console.log('JSON_RESULT_END');
    
    await wallet.close();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Direct vote failed: ${errorMessage}`);
    console.log('JSON_RESULT_START');
    console.log(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }));
    console.log('JSON_RESULT_END');
    process.exit(1);
  }
}

directVote();

directVote();
