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
  1. Deploy a new contract
  2. Join an existing contract
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
      logger.info('🚀 Auto-deploying new ZkVote contract...');
      return await api.deploy(providers, { secretKey: new Uint8Array(32).fill(1) });
    }
  }
  
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        return await api.deploy(providers, { secretKey: new Uint8Array(32).fill(1) });
      case '2':
        return await join(providers, rli);
      case '3':
        logger.info('Exiting...');
        rli.close();
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

const mainLoop = async (providers: ZkvoteProviders, rli: Interface): Promise<void> => {
  const counterContract = await deployOrJoin(providers, rli);
  if (counterContract === null) {
    return;
  }
  
  logger.info('=== ZkVote Contract CLI ===');
  logger.info(`Contract Address: ${counterContract.deployTxData.public.contractAddress}`);
  
  // Check if this is auto-deployment - if so, exit after deployment
  if (process.env.AUTO_DEPLOY === 'true') {
    logger.info('✅ Auto-deployment completed, exiting...');
    // Close readline interface and force exit
    rli.close();
    process.exit(0);
  }
  
  // Check if this is a quick deployment test
  if (process.env.QUICK_TEST === 'true') {
    logger.info('🧪 Running quick deployment test...');
    
    try {
      await api.incrementVoters(providers, counterContract);
      logger.info('✅ Quick test completed successfully!');
      logger.info('🎉 Contract deployed and tested - ready for use!');
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(`❌ Quick test failed: ${error.message}`);
      } else {
        logger.error(`❌ Unknown error during quick test: ${error}`);
      }
    }
    
    logger.info('💡 Use `npm run wallet` for full testnet CLI or restart for interactive mode');
    rli.close();
    return;
  }

  const MENU_QUESTION = `
ZkVote Contract - What would you like to do?
  1. Increment voter count
  2. Cast a vote
  3. Get vote count for a choice
  4. Display contract state
  5. Exit
Which would you like to do? `;
  
  while (true) {
    const choice = await rli.question(MENU_QUESTION);
    
    try {
      switch (choice) {
        case '1':
          await api.incrementVoters(providers, counterContract);
          break;
        case '2':
          const secretKey = await rli.question('Enter your secret key (5 chars): ');
          const choiceStr = await rli.question('Enter choice (0=A, 1=B, 2=C, 3=D): ');
          const choiceIndex = parseInt(choiceStr, 10);
          if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
            logger.error('Invalid choice. Must be 0, 1, 2, or 3');
            continue;
          }
          await api.voteFor(providers, counterContract, secretKey, choiceIndex);
          break;
        case '3':
          const queryChoiceStr = await rli.question('Enter choice to check (0=A, 1=B, 2=C, 3=D): ');
          const queryChoiceIndex = parseInt(queryChoiceStr, 10);
          if (isNaN(queryChoiceIndex) || queryChoiceIndex < 0 || queryChoiceIndex > 3) {
            logger.error('Invalid choice. Must be 0, 1, 2, or 3');
            continue;
          }
          await api.getVoteCount(providers, counterContract, queryChoiceIndex);
          break;
        case '4':
          await api.displayZkvoteState(providers, counterContract);
          break;
        case '5':
          logger.info('Exiting...');
          rli.close();
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
        rli.close();
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
