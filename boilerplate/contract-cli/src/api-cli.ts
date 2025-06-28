import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';

// Configure dotenv to load from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { type Logger } from 'pino';
import { type ZkvoteProviders, type DeployedZkvoteContract } from './common-types.js';
import { type Config, TestnetRemoteConfig } from './config.js';
import * as api from './simple-api.js';

let logger: Logger;

// Helper function to decode bytes to string
const decodeChoiceLabel = (bytes: Uint8Array): string => {
  try {
    const decoder = new TextDecoder('utf-8');
    // Remove null bytes and decode
    const filteredBytes = bytes.filter(b => b !== 0);
    return decoder.decode(new Uint8Array(filteredBytes));
  } catch (error) {
    return `[${Array.from(bytes).join(', ')}]`;
  }
};

// Create a simple logger
function createLogger(): Logger {
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

// Non-interactive API operations
async function performOperation(): Promise<void> {
  const args = process.argv.slice(2);
  const operation = args[0];

  if (!operation) {
    console.error('ERROR: No operation specified');
    process.exit(1);
  }

  try {
    const config = new TestnetRemoteConfig();
    logger = createLogger();
    api.setLogger(logger);
    
    // Build wallet using environment seed
    const seedPhrase = process.env.WALLET_SEED;
    if (!seedPhrase) {
      throw new Error('WALLET_SEED environment variable is required');
    }
    
    const wallet = await api.buildWalletAndWaitForFunds(config, seedPhrase, '');
    
    // Configure providers
    const providers = await api.configureProviders(wallet, config);
    
    switch (operation) {
      case 'deploy':
        await handleDeploy(providers, args.slice(1));
        break;
      case 'state':
        await handleState(providers, args.slice(1));
        break;
      case 'vote':
        await handleVote(providers, args.slice(1));
        break;
      default:
        console.error('ERROR: Unknown operation: ' + operation);
        process.exit(1);
    }
    
    await wallet.close();
    
  } catch (error: unknown) {
    console.error('ERROR: Exception in performOperation');
    if (error instanceof Error) {
      console.error('ERROR:' + error.message);
      console.error('Stack:', error.stack);
    } else if (error && typeof error === 'object') {
      console.error('ERROR:' + JSON.stringify(error, null, 2));
    } else {
      console.error('ERROR:' + String(error));
    }
    process.exit(1);
  }
}

async function handleDeploy(providers: ZkvoteProviders, args: string[]): Promise<void> {
  try {
    if (args.length < 4) {
      throw new Error('Deploy requires 4 choice arguments');
    }
    
    const [choiceA, choiceB, choiceC, choiceD] = args;
    
    logger.info(`Deploying contract with choices: ${choiceA}, ${choiceB}, ${choiceC}, ${choiceD}`);
    
    const deployResult = await api.deploy(
      providers,
      { secretKey: new Uint8Array(32).fill(1) },
      choiceA,
      choiceB,
      choiceC,
      choiceD
    );
    
    const contractAddress = deployResult.deployTxData.public.contractAddress;
    console.log('CONTRACT_ADDRESS:' + contractAddress);
  } catch (error) {
    console.error('ERROR: Exception in handleDeploy');
    if (error instanceof Error) {
      console.error('ERROR:' + error.message);
      console.error('Stack:', error.stack);
    } else {
      console.error('ERROR:' + String(error));
    }
    throw error;
  }
}

async function handleState(providers: ZkvoteProviders, args: string[]): Promise<void> {
  if (args.length < 1) {
    throw new Error('State requires contract address argument');
  }
  
  const contractAddress = args[0];
  
  logger.info(`Getting state for contract: ${contractAddress}`);
  
  const ledgerState = await api.getZkvoteLedgerState(providers, contractAddress as any);
  
  if (!ledgerState) {
    throw new Error('Contract not found');
  }
  
  // Output state information
  console.log('TOTAL_VOTERS:' + ledgerState.numberOfVoters);
  
  // Parse choices and vote counts
  try {
    const choicesIterator = ledgerState.choices[Symbol.iterator]();
    let result = choicesIterator.next();
    let choiceIndex = 0;
    
    while (!result.done) {
      const [mapKey, choiceBytes] = result.value;
      
      try {
        const choiceLabel = decodeChoiceLabel(choiceBytes);
        let voteCount = 0;
        
        // Get vote count from the voteCounts Map
        if (ledgerState.voteCounts.member(mapKey)) {
          voteCount = Number(ledgerState.voteCounts.lookup(mapKey).read());
        }
        
        console.log(`CHOICE_${choiceIndex}:${choiceLabel}:${voteCount}`);
        choiceIndex++;
      } catch (error) {
        logger.warn(`Failed to process choice at index ${choiceIndex}: ${error}`);
      }
      
      result = choicesIterator.next();
    }
  } catch (error) {
    logger.error(`Error parsing choices: ${error}`);
    throw new Error('Failed to parse contract choices');
  }
}

async function handleVote(providers: ZkvoteProviders, args: string[]): Promise<void> {
  if (args.length < 2) {
    throw new Error('Vote requires contract address and choice index arguments');
  }
  
  const contractAddress = args[0];
  const choiceIndex = parseInt(args[1]);
  
  if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
    throw new Error('Choice index must be a number between 0 and 3');
  }
  
  logger.info(`Voting for choice ${choiceIndex} in contract: ${contractAddress}`);
  
  // Join the contract first
  const contract = await api.joinContract(providers, contractAddress);
  
  // Vote (this will call the appropriate vote method based on choice index)
  const txId = await api.vote(providers, contract, choiceIndex);
  
  console.log('VOTE_SUCCESS:' + txId);
}

// Run the operation
performOperation().catch((error) => {
  console.error('ERROR: Uncaught error in performOperation');
  if (error instanceof Error) {
    console.error('ERROR:' + error.message);
    console.error('Stack:', error.stack);
  } else if (error && typeof error === 'object') {
    console.error('ERROR:' + JSON.stringify(error, null, 2));
  } else {
    console.error('ERROR:' + String(error));
  }
  process.exit(1);
});

// Handle any other uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('ERROR: Uncaught exception');
  if (error instanceof Error) {
    console.error('ERROR:' + error.message);
    console.error('Stack:', error.stack);
  } else {
    console.error('ERROR:' + String(error));
  }
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('ERROR: Unhandled promise rejection');
  if (reason instanceof Error) {
    console.error('ERROR:' + reason.message);
    console.error('Stack:', reason.stack);
  } else {
    console.error('ERROR:' + String(reason));
  }
  process.exit(1);
});
