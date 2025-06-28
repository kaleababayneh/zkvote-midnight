// Simple enhanced CLI for ZkVote contract
// Simplified version without dynamic analysis

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Configure dotenv to load from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type ZkvoteProviders, type DeployedZkvoteContract } from './common-types.js';
import { type Config } from './config.js';
import * as api from './simple-api.js';

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new ZkVote contract
  2. Join an existing ZkVote contract
  3. Exit
Which would you like to do? `;

const MAIN_MENU_QUESTION = `
ZkVote Contract - What would you like to do?
  1. Increment voter count
  2. Cast a vote
  3. Get vote count for a choice
  4. Display contract state
  5. Exit
Which would you like to do? `;

export class SimpleEnhancedCLI {
  private contract: DeployedZkvoteContract | null = null;

  constructor(private logger: Logger) {}

  async initialize(): Promise<void> {
    this.logger.info('🎯 Enhanced ZkVote CLI initialized');
  }

  async runEnhancedCLI(providers: ZkvoteProviders, rli: Interface): Promise<void> {
    this.logger.info('=== ZkVote Contract CLI ===');
    
    if (!this.contract) {
      this.logger.error('No contract deployed or joined');
      return;
    }

    this.logger.info(`Contract Address: ${this.contract.deployTxData.public.contractAddress}`);
    
    while (true) {
      const choice = await rli.question(MAIN_MENU_QUESTION);
      
      try {
        switch (choice) {
          case '1':
            await this.incrementVoters(providers);
            break;
          case '2':
            await this.castVote(providers, rli);
            break;
          case '3':
            await this.getVoteCount(providers, rli);
            break;
          case '4':
            await this.displayState(providers);
            break;
          case '5':
            this.logger.info('Exiting...');
            return;
          default:
            this.logger.error(`Invalid choice: ${choice}`);
        }
      } catch (error) {
        this.logger.error(`Operation failed: ${error}`);
      }
    }
  }

  private async incrementVoters(providers: ZkvoteProviders): Promise<void> {
    if (!this.contract) return;
    
    this.logger.info('🔄 Incrementing voter count...');
    const txId = await api.incrementVoters(providers, this.contract);
    this.logger.info(`✅ Voter count incremented! Transaction: ${txId}`);
  }

  private async castVote(providers: ZkvoteProviders, rli: Interface): Promise<void> {
    if (!this.contract) return;
    
    const secretKey = await rli.question('Enter your secret key (5 chars): ');
    const choiceStr = await rli.question('Enter choice (0=A, 1=B, 2=C, 3=D): ');
    
    const choiceIndex = parseInt(choiceStr, 10);
    if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
      throw new Error('Invalid choice. Must be 0, 1, 2, or 3');
    }
    
    this.logger.info(`🗳️  Casting vote for choice ${choiceIndex}...`);
    const txId = await api.voteFor(providers, this.contract, secretKey, choiceIndex);
    this.logger.info(`✅ Vote cast! Transaction: ${txId}`);
  }

  private async getVoteCount(providers: ZkvoteProviders, rli: Interface): Promise<void> {
    if (!this.contract) return;
    
    const choiceStr = await rli.question('Enter choice to check (0=A, 1=B, 2=C, 3=D): ');
    
    const choiceIndex = parseInt(choiceStr, 10);
    if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
      throw new Error('Invalid choice. Must be 0, 1, 2, or 3');
    }
    
    this.logger.info(`📊 Getting vote count for choice ${choiceIndex}...`);
    const count = await api.getVoteCount(providers, this.contract, choiceIndex);
    this.logger.info(`Choice ${choiceIndex} has ${count} votes`);
  }

  private async displayState(providers: ZkvoteProviders): Promise<void> {
    if (!this.contract) return;
    
    this.logger.info('📋 Displaying contract state...');
    await api.displayZkvoteState(providers, this.contract);
  }

  async deployOrJoin(providers: ZkvoteProviders, rli: Interface): Promise<DeployedZkvoteContract | null> {
    while (true) {
      const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
      switch (choice) {
        case '1':
          this.logger.info('🚀 Deploying new ZkVote contract...');
          this.contract = await api.deploy(providers, { secretKey: new Uint8Array(32).fill(1) });
          return this.contract;
        case '2':
          const contractAddress = await rli.question('What is the contract address (in hex)? ');
          this.logger.info('🔗 Joining existing contract...');
          this.contract = await api.joinContract(providers, contractAddress);
          return this.contract;
        case '3':
          this.logger.info('Exiting...');
          return null;
        default:
          this.logger.error(`Invalid choice: ${choice}`);
      }
    }
  }
}

const buildWallet = async (config: Config, rli: Interface): Promise<(Wallet & Resource) | null> => {
  if (config.constructor.name === 'StandaloneConfig') {
    return await api.buildWalletAndWaitForFunds(config, GENESIS_MINT_WALLET_SEED, '');
  }

  // Check for seed phrase in environment variable first
  let seedPhrase = process.env.WALLET_SEED;
  
  if (!seedPhrase) {
    console.log('No WALLET_SEED found in environment variables. Please enter manually or add to .env file.');
    seedPhrase = await rli.question('Enter your wallet seed: ');
  } else {
    console.log('✅ Using wallet seed from environment variable');
  }
  
  return await api.buildWalletAndWaitForFunds(config, seedPhrase, '');
};

export const runEnhanced = async (config: Config, logger: Logger): Promise<void> => {
  api.setLogger(logger);
  const rli = createInterface({ input, output, terminal: true });
  
  try {
    const wallet = await buildWallet(config, rli);
    if (wallet === null) {
      return;
    }

    const providers = await api.configureProviders(wallet, config);
    const enhancedCLI = new SimpleEnhancedCLI(logger);
    await enhancedCLI.initialize();
    
    const contract = await enhancedCLI.deployOrJoin(providers, rli);
    if (contract !== null) {
      await enhancedCLI.runEnhancedCLI(providers, rli);
    }
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`Found error '${e.message}'`);
      logger.info('Exiting...');
      logger.debug(`${e.stack}`);
    } else {
      throw e;
    }
  } finally {
    rli.close();
    rli.removeAllListeners();
  }
};
