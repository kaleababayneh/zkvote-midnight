import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { contracts, witnesses } from '@midnight-ntwrk/contract';
import { type CoinInfo, nativeToken, Transaction, type TransactionId } from '@midnight-ntwrk/ledger';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { getLedgerNetworkId, getZswapNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  type BalancedTransaction,
  createBalancedTx,
  type MidnightProvider,
  type UnbalancedTransaction,
  type WalletProvider,
} from '@midnight-ntwrk/midnight-js-types';
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { webcrypto } from 'crypto';
import { type Logger } from 'pino';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import {
  type ZkvoteProviders,
  type DeployedZkvoteContract,
  ZkvotePrivateStateId,
} from './common-types';
import { type Config, contractConfig } from './config';

// Get the zkvote contract module
const getContractModule = () => {
  const contractNames = Object.keys(contracts);
  if (contractNames.length === 0) {
    throw new Error('No contract found in contracts object');
  }
  return contracts[contractNames[0]];
};

const contractModule = getContractModule();

let logger: Logger;

// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

export const getZkvoteLedgerState = async (
  providers: ZkvoteProviders,
  contractAddress: ContractAddress,
): Promise<any> => {
  assertIsContractAddress(contractAddress);
  logger.info('Checking zkvote contract ledger state...');
  const state = await providers.publicDataProvider
    .queryContractState(contractAddress)
    .then((contractState) => (contractState != null ? contractModule.ledger(contractState.data) : null))
  if (state) {
    logger.info(`Number of voters: ${state.numberOfVoters}`);
    logger.info(`Vote counts map size: ${state.voteCounts.size()}`);
    logger.info(`Items set size: ${state.items.size()}`);
    logger.info(`Choices map size: ${state.choices.size()}`);
  }
  return state;
};

export const zkvoteContractInstance = new contractModule.Contract(witnesses);

export const joinContract = async (
  providers: ZkvoteProviders,
  contractAddress: string,
): Promise<DeployedZkvoteContract> => {
  const zkvoteContract = await findDeployedContract(providers, {
    contractAddress,
    contract: zkvoteContractInstance,
    privateStateId: ZkvotePrivateStateId,
    initialPrivateState: { secretKey: new Uint8Array(32).fill(1) },
  });
  logger.info(`Joined zkvote contract at address: ${zkvoteContract.deployTxData.public.contractAddress}`);
  return zkvoteContract;
};

export const deploy = async (
  providers: ZkvoteProviders,
  privateState: any,
  choiceA: string = "AAA", 
  choiceB: string = "BBB", 
  choiceC: string = "CCC", 
  choiceD: string = "DDD"
): Promise<DeployedZkvoteContract> => {
  logger.info(`Deploying zkvote contract with choices: ${choiceA}, ${choiceB}, ${choiceC}, ${choiceD}...`);
  
  // Convert strings to Uint8Array (Bytes<3> in the contract)
  const encoder = new TextEncoder();
  const choiceABytes = new Uint8Array(3);
  const choiceBBytes = new Uint8Array(3);
  const choiceCBytes = new Uint8Array(3);
  const choiceDBytes = new Uint8Array(3);
  
  // Encode and pad/truncate to exactly 3 bytes
  const aEncoded = encoder.encode(choiceA);
  const bEncoded = encoder.encode(choiceB);
  const cEncoded = encoder.encode(choiceC);
  const dEncoded = encoder.encode(choiceD);
  
  choiceABytes.set(aEncoded.slice(0, 3));
  choiceBBytes.set(bEncoded.slice(0, 3));
  choiceCBytes.set(cEncoded.slice(0, 3));
  choiceDBytes.set(dEncoded.slice(0, 3));
  
  try {
    // The contract constructor expects 4 choice arguments
    logger.info(`Debug: Attempting to deploy with constructor args`);
    logger.info(`Choice A bytes: [${Array.from(choiceABytes)}]`);
    logger.info(`Choice B bytes: [${Array.from(choiceBBytes)}]`);
    logger.info(`Choice C bytes: [${Array.from(choiceCBytes)}]`);
    logger.info(`Choice D bytes: [${Array.from(choiceDBytes)}]`);
    
    // Try passing constructor arguments in the options object
    const zkvoteContract = await deployContract(providers, {
      contract: zkvoteContractInstance,
      privateStateId: ZkvotePrivateStateId,
      initialPrivateState: privateState,
      args: [choiceABytes, choiceBBytes, choiceCBytes, choiceDBytes]
    } as any);
    
    logger.info(`Deployed zkvote contract at address: ${zkvoteContract.deployTxData.public.contractAddress}`);
    return zkvoteContract;
  } catch (error) {
    logger.error(`Deployment failed: ${error}`);
    throw error;
  }
};

// Simple wrapper functions that work around type issues
export const incrementVoters = async (
  providers: ZkvoteProviders,
  zkvoteContract: DeployedZkvoteContract,
): Promise<string> => {
  logger.info('Incrementing vote count...');
  try {
    // Use any type to bypass strict typing issues
    const result = await (zkvoteContract as any).callTx.increment();
    logger.info(`Incremented! Transaction ${result.public.txId} added in block ${result.public.blockHeight}`);
    return result.public.txId;
  } catch (error) {
    logger.error(`Failed to increment: ${error}`);
    throw error;
  }
};

export const voteFor = async (
  providers: ZkvoteProviders,
  zkvoteContract: DeployedZkvoteContract,
  secretKey: string,
  choiceIndex: number
): Promise<string> => {
  logger.info(`Voting for choice ${choiceIndex} with secret key...`);
  
  try {
    const encoder = new TextEncoder();
    const secretKeyBytes = encoder.encode(secretKey.slice(0, 5).padEnd(5, '\0'));
    const instanceBytes = encoder.encode("zkvot"); // 5 bytes as per contract
    
    // Use any type to bypass strict typing issues
    const result = await (zkvoteContract as any).callTx.vote_for(
      secretKeyBytes.slice(0, 5), 
      instanceBytes, 
      BigInt(choiceIndex)
    );
    
    logger.info(`Vote submitted! Transaction ${result.public.txId} added in block ${result.public.blockHeight}`);
    return result.public.txId;
  } catch (error) {
    logger.error(`Failed to vote: ${error}`);
    throw error;
  }
};

// Simple wrapper for voting without needing to specify secret key
export const vote = async (
  providers: ZkvoteProviders,
  zkvoteContract: DeployedZkvoteContract,
  choiceIndex: number
): Promise<string> => {
  const defaultSecretKey = "vote" + choiceIndex; // Simple default secret key
  return await voteFor(providers, zkvoteContract, defaultSecretKey, choiceIndex);
};

export const getVoteCount = async (
  providers: ZkvoteProviders,
  zkvoteContract: DeployedZkvoteContract,
  choiceIndex: number
): Promise<bigint> => {
  logger.info(`Getting vote count for choice ${choiceIndex}...`);
  
  try {
    // Use any type to bypass strict typing issues  
    const result = await (zkvoteContract as any).callTx.get_vote_count(BigInt(choiceIndex));
    
    const count = result.returnValue || result.public?.returnValue || BigInt(0);
    logger.info(`Vote count for choice ${choiceIndex}: ${count}`);
    return count;
  } catch (error) {
    logger.error(`Failed to get vote count: ${error}`);
    throw error;
  }
};

export const displayZkvoteState = async (
  providers: ZkvoteProviders,
  zkvoteContract: DeployedZkvoteContract,
): Promise<void> => {
  const contractAddress = zkvoteContract.deployTxData.public.contractAddress;
  const state = await getZkvoteLedgerState(providers, contractAddress);
  
  if (!state) {
    logger.info(`No zkvote contract state found at ${contractAddress}.`);
    return;
  }
  
  logger.info(`=== Zkvote Contract State ===`);
  logger.info(`Contract Address: ${contractAddress}`);
  logger.info(`Total Voters: ${state.numberOfVoters}`);
  logger.info(`Number of choices: ${state.choices.size()}`);
  
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
  
  // Read choices and vote counts directly from the ledger state - NO separate requests!
  logger.info(`=== Voting Results ===`);
  
  // Iterate through all choices in the map using the proper iterator
  try {
    // Check if choices map is empty
    if (state.choices.isEmpty()) {
      logger.info("No choices found in the contract");
    } else {
      // Iterate over the choices Map using the iterator
      const choicesIterator = state.choices[Symbol.iterator]();
      let result = choicesIterator.next();
      
      while (!result.done) {
        const [choiceIndex, choiceBytes] = result.value;
        
        try {
          const choiceLabel = decodeChoiceLabel(choiceBytes);
          let voteCount = 0;
          
          // Get vote count from the voteCounts Map
          if (state.voteCounts.member(choiceIndex)) {
            voteCount = Number(state.voteCounts.lookup(choiceIndex).read());
          }
          
          logger.info(`${choiceIndex}: "${choiceLabel}" - ${voteCount} votes`);
        } catch (error) {
          logger.info(`${choiceIndex}: Choice ${choiceIndex} - 0 votes (error: ${error})`);
        }
        
        result = choicesIterator.next();
      }
    }
  } catch (error) {
    logger.error(`Error iterating over choices: ${error}`);
    logger.info("Fallback: No choices could be displayed");
  }
  
  logger.info(`Unique voters (items set): ${state.items.size()}`);
};

// Utility functions
export const createWalletAndMidnightProvider = async (wallet: Wallet): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(wallet.state());
  return {
    coinPublicKey: state.coinPublicKey,
    encryptionPublicKey: state.encryptionPublicKey,
    balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
      return wallet
        .balanceTransaction(
          ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
          newCoins,
        )
        .then((tx) => wallet.proveTransaction(tx))
        .then((zswapTx) => Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId()))
        .then(createBalancedTx);
    },
    submitTx(tx: BalancedTransaction): Promise<TransactionId> {
      return wallet.submitTransaction(tx);
    },
  };
};

export const waitForFunds = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap((state) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        logger.info(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state) => {
        return state.syncProgress?.synced === true;
      }),
      Rx.map((s) => s.balances[nativeToken()] ?? 0n),
      Rx.filter((balance) => balance > 0n),
    ),
  );

export const buildWalletAndWaitForFunds = async (
  { indexer, indexerWS, node, proofServer }: Config,
  seed: string,
  filename: string,
): Promise<Wallet & Resource> => {
  logger.info('Building wallet from scratch');
  const wallet = await WalletBuilder.buildFromSeed(
    indexer,
    indexerWS,
    proofServer,
    node,
    seed,
    getZswapNetworkId(),
    'info',
  );
  wallet.start();

  const state = await Rx.firstValueFrom(wallet.state());
  logger.info(`Your wallet seed is: ${seed}`);
  logger.info(`Your wallet address is: ${state.address}`);
  let balance = state.balances[nativeToken()];
  if (balance === undefined || balance === 0n) {
    logger.info(`Your wallet balance is: 0`);
    logger.info(`Waiting to receive tokens...`);
    balance = await waitForFunds(wallet);
  }
  logger.info(`Your wallet balance is: ${balance}`);
  return wallet;
};

export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  webcrypto.getRandomValues(bytes);
  return bytes;
};

export const buildFreshWallet = async (config: Config): Promise<Wallet & Resource> =>
  await buildWalletAndWaitForFunds(config, toHex(randomBytes(32)), '');

export const configureProviders = async (wallet: Wallet & Resource, config: Config) => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
  return {
    privateStateProvider: levelPrivateStateProvider<typeof ZkvotePrivateStateId>({
      privateStateStoreName: contractConfig.privateStateStoreName,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider: new NodeZkConfigProvider<'increment' | 'vote_for' | 'get_vote_count'>(contractConfig.zkConfigPath),
    proofProvider: httpClientProofProvider(config.proofServer),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};

export function setLogger(_logger: Logger) {
  logger = _logger;
}
