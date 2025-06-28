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
import { type StartedDockerComposeEnvironment, type DockerComposeEnvironment } from 'testcontainers';
import { type ZkvoteProviders, type DeployedZkvoteContract } from './common-types';
import { type Config, StandaloneConfig } from './config';
import * as api from './simple-api';

let logger: Logger;

/**
 * This seed gives access to tokens minted in the genesis block of a local development node - only
 * used in standalone networks to build a wallet with initial funds.
 */
const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const DEPLOY_OR_JOIN_QUESTION = `
You can do one of the following:
  1. Deploy a new zkvote contract
  2. Join an existing zkvote contract
  3. Exit
Which would you like to do? `;

const join = async (providers: ZkvoteProviders, rli: Interface): Promise<DeployedZkvoteContract> => {
  const contractAddress = await rli.question('What is the contract address (in hex)? ');
  return await api.joinContract(providers, contractAddress);
};

const deployOrJoin = async (providers: ZkvoteProviders, rli: Interface): Promise<DeployedZkvoteContract | null> => {
  // Check if auto-deploy is enabled (set by deployment script)
  if (process.env.AUTO_DEPLOY === 'true') {
    const deployMode = process.env.DEPLOY_MODE || 'new';
    
    if (deployMode === 'join') {
      logger.info('🔗 Auto-joining existing contract...');
      const contractAddress = await rli.question('What is the contract address (in hex)? ');
      return await api.joinContract(providers, contractAddress);
    } else {
      logger.info('🚀 Auto-deploying new zkvote contract...');
      return await api.deploy(providers, { secretKey: new Uint8Array(32).fill(1) });
    }
  }
  
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        // Ask for voting choices
        const choiceA = await rli.question('Enter choice A (max 3 chars): ');
        const choiceB = await rli.question('Enter choice B (max 3 chars): ');
        const choiceC = await rli.question('Enter choice C (max 3 chars): ');
        const choiceD = await rli.question('Enter choice D (max 3 chars): ');
        return await api.deploy(providers, { secretKey: new Uint8Array(32).fill(1) }, choiceA, choiceB, choiceC, choiceD);
      case '2':
        return await join(providers, rli);
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const ZKVOTE_MENU = `
You can do one of the following:
  1. Increment voter count
  2. Cast a vote
  3. Get vote count for a choice
  4. Display contract state
  5. Exit
Which would you like to do? `;

const mainLoop = async (providers: ZkvoteProviders, rli: Interface): Promise<void> => {
  const zkvoteContract = await deployOrJoin(providers, rli);
  if (zkvoteContract === null) {
    return;
  }
  
  logger.info('=== ZkVote Contract CLI ===');
  logger.info(`Contract Address: ${zkvoteContract.deployTxData.public.contractAddress}`);
  
  // Check if this is a quick deployment test
  if (process.env.AUTO_DEPLOY === 'true' && process.env.QUICK_TEST === 'true') {
    logger.info('🧪 Running quick deployment test...');
    
    try {
      // Test displaying state
      await api.displayZkvoteState(providers, zkvoteContract);
      logger.info('✅ Quick test completed successfully!');
      logger.info('🎉 ZkVote contract deployed and tested - ready for use!');
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(`❌ Quick test failed: ${error.message}`);
      } else {
        logger.error(`❌ Unknown error during quick test: ${error}`);
      }
    }
    
    logger.info('💡 Use `npm run wallet` for full testnet CLI or restart for interactive mode');
    return;
  }
  
  while (true) {
    const choice = await rli.question(ZKVOTE_MENU);
    
    try {
      switch (choice) {
        case '1':
          await api.incrementVoters(providers, zkvoteContract);
          break;
        case '2':
          const secretKey = await rli.question('Enter your secret voting key (5 chars): ');
          const choiceIndex = await rli.question('Enter choice index (0-3): ');
          const index = parseInt(choiceIndex, 10);
          if (index < 0 || index > 3) {
            logger.error('Invalid choice index. Must be 0-3.');
            break;
          }
          await api.voteFor(providers, zkvoteContract, secretKey, index);
          break;
        case '3':
          const queryIndex = await rli.question('Enter choice index to query (0-3): ');
          const queryIdx = parseInt(queryIndex, 10);
          if (queryIdx < 0 || queryIdx > 3) {
            logger.error('Invalid choice index. Must be 0-3.');
            break;
          }
          await api.getVoteCount(providers, zkvoteContract, queryIdx);
          break;
        case '4':
          await api.displayZkvoteState(providers, zkvoteContract);
          break;
        case '5':
          logger.info('Exiting...');
          return;
        default:
          logger.error(`Invalid choice: ${choice}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(`❌ Operation failed: ${error.message}`);
      } else {
        logger.error(`❌ Unknown error occurred: ${error}`);
      }
      logger.info('You can try another operation or exit.');
    }
  }
};

const buildWalletFromSeed = async (config: Config, rli: Interface): Promise<Wallet & Resource> => {
  // Check for seed phrase in environment variable first
  let seedPhrase = process.env.WALLET_SEED;
  
  if (!seedPhrase) {
    logger.info('No WALLET_SEED found in environment variables. Please enter manually or add to .env file.');
    seedPhrase = await rli.question('Enter your wallet seed: ');
  } else {
    logger.info('✅ Using wallet seed from environment variable');
  }
  
  return await api.buildWalletAndWaitForFunds(config, seedPhrase, '');
};

const WALLET_LOOP_QUESTION = `
You can do one of the following:
  1. Build a fresh wallet
  2. Build wallet from a seed
  3. Exit
Which would you like to do? `;

const buildWallet = async (config: Config, rli: Interface): Promise<(Wallet & Resource) | null> => {
  if (config instanceof StandaloneConfig) {
    return await api.buildWalletAndWaitForFunds(config, GENESIS_MINT_WALLET_SEED, '');
  }
  while (true) {
    const choice = await rli.question(WALLET_LOOP_QUESTION);
    switch (choice) {
      case '1':
        return await api.buildFreshWallet(config);
      case '2':
        return await buildWalletFromSeed(config, rli);
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const mapContainerPort = (env: StartedDockerComposeEnvironment, url: string, containerName: string) => {
  const mappedUrl = new URL(url);
  const container = env.getContainer(containerName);

  mappedUrl.port = String(container.getFirstMappedPort());

  return mappedUrl.toString().replace(/\/+$/, '');
};

export const run = async (config: Config, _logger: Logger, dockerEnv?: DockerComposeEnvironment): Promise<void> => {
  logger = _logger;
  api.setLogger(_logger);
  const rli = createInterface({ input, output, terminal: true });
  let env;
  if (dockerEnv !== undefined) {
    env = await dockerEnv.up();

    if (config instanceof StandaloneConfig) {
      config.indexer = mapContainerPort(env, config.indexer, 'counter-indexer');
      config.indexerWS = mapContainerPort(env, config.indexerWS, 'counter-indexer');
      config.node = mapContainerPort(env, config.node, 'counter-node');
      config.proofServer = mapContainerPort(env, config.proofServer, 'counter-proof-server');
    }
  }
  const wallet = await buildWallet(config, rli);
  try {
    if (wallet !== null) {
      const providers = await api.configureProviders(wallet, config);
      await mainLoop(providers, rli);
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
    try {
      rli.close();
      rli.removeAllListeners();
    } catch (e) {
      logger.error(`Error closing readline interface: ${e}`);
    } finally {
      try {
        if (wallet !== null) {
          await wallet.close();
        }
      } catch (e) {
        logger.error(`Error closing wallet: ${e}`);
      } finally {
        try {
          if (env !== undefined) {
            await env.down();
            logger.info('Goodbye');
          }
        } catch (e) {
          logger.error(`Error shutting down docker environment: ${e}`);
        }
      }
    }
  }
};
