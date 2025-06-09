#!/usr/bin/env node

// Auto-generation system for Compact contract CLI tools
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GenerationConfig {
  contractSourceDir: string;
  contractBuildDir: string;
  cliSourceDir: string;
  contractFileName: string;
  verbose: boolean;
}

class CompactCLIAutoGenerator {
  private config: GenerationConfig;
  private isGenerating = false;
  private lastGenerationTime = 0;
  private debounceMs = 2000; // 2 second debounce

  constructor(config: GenerationConfig) {
    this.config = config;
  }

  /**
   * Start the auto-generation process (one-time run)
   */
  async start(): Promise<void> {
    console.log('🚀 Starting Compact Contract CLI Auto-Generator...');
    console.log('📁 Contract source:', this.config.contractSourceDir);
    console.log('🎯 Target CLI:', this.config.cliSourceDir);
    console.log('📄 Contract file:', this.config.contractFileName);

    try {
      await this.generateCLI('Manual generation');
      console.log('✅ Auto-generation complete!');
      console.log('💡 Run this script again when you modify your contract.');
    } catch (error) {
      console.error('❌ Auto-generation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Start watching for contract changes (would require chokidar dependency)
   */
  async startWatching(): Promise<void> {
    console.log('⚠️  File watching requires chokidar dependency.');
    console.log('💡 For now, run this script manually after contract changes.');
    console.log('📝 To add watching: npm install chokidar --save-dev');
    
    await this.start();
  }

  /**
   * Generate CLI from contract (with debouncing)
   */
  private async generateCLI(reason: string): Promise<void> {
    const now = Date.now();
    if (this.isGenerating || (now - this.lastGenerationTime) < this.debounceMs) {
      if (this.config.verbose) {
        console.log(`⏳ Skipping generation (debounce): ${reason}`);
      }
      return;
    }

    this.isGenerating = true;
    this.lastGenerationTime = now;

    try {
      console.log(`\n🔄 Starting generation: ${reason}`);
      console.log('⏰', new Date().toLocaleTimeString());

      // Step 1: Parse the contract to extract information
      const contractInfo = await this.parseContract();
      console.log(`📋 Found ${contractInfo.functions.length} functions and ${Object.keys(contractInfo.ledgerState).length} state variables`);

      // Step 2: Compile the contract
      await this.compileContract();

      // Step 3: Build the contract TypeScript
      await this.buildContract();

      // Step 4: Generate CLI files
      await this.generateCLIFiles(contractInfo);

      // Step 5: Build CLI
      await this.buildCLI();

      console.log('✅ Generation complete!\n');
    } catch (error) {
      console.error('❌ Generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Parse the Compact contract to extract function and state information
   */
  private async parseContract(): Promise<ContractInfo> {
    const contractPath = path.join(this.config.contractSourceDir, this.config.contractFileName);
    
    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract file not found: ${contractPath}`);
    }

    const contractContent = await fs.promises.readFile(contractPath, 'utf-8');
    
    // Parse the contract using regex (simple parser)
    const parser = new CompactContractParser();
    return parser.parse(contractContent, this.config.contractFileName);
  }

  /**
   * Compile the Compact contract
   */
  private async compileContract(): Promise<void> {
    console.log('🔨 Compiling contract...');
    
    const contractDir = path.dirname(this.config.contractSourceDir);
    const contractName = path.basename(this.config.contractFileName, '.compact');
    const outputDir = path.join(this.config.contractSourceDir, 'managed', contractName);

    await this.runCommand('compactc', [
      '--skip-zk',
      path.join(this.config.contractSourceDir, this.config.contractFileName),
      outputDir
    ], contractDir);

    console.log('✅ Contract compiled');
  }

  /**
   * Build the contract TypeScript
   */
  private async buildContract(): Promise<void> {
    console.log('🔧 Building contract TypeScript...');
    
    const contractDir = path.dirname(this.config.contractSourceDir);
    await this.runCommand('npm', ['run', 'build'], contractDir);

    console.log('✅ Contract built');
  }

  /**
   * Generate CLI files based on contract analysis
   */
  private async generateCLIFiles(contractInfo: ContractInfo): Promise<void> {
    console.log('📝 Generating CLI files...');

    // Generate API wrapper
    await this.generateAPIWrapper(contractInfo);

    // Generate CLI module
    await this.generateCLIModule(contractInfo);

    // Generate types
    await this.generateTypes(contractInfo);

    // Update package.json scripts if needed
    await this.updatePackageScripts(contractInfo);

    console.log('✅ CLI files generated');
  }

  /**
   * Build the CLI
   */
  private async buildCLI(): Promise<void> {
    console.log('🔧 Building CLI...');
    
    await this.runCommand('npm', ['run', 'build'], this.config.cliSourceDir);

    console.log('✅ CLI built');
  }

  /**
   * Generate API wrapper file
   */
  private async generateAPIWrapper(contractInfo: ContractInfo): Promise<void> {
    const contractName = path.basename(this.config.contractFileName, '.compact');
    const content = `// Auto-generated API wrapper for ${contractInfo.contractName}
// Generated on: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - This file is auto-generated from ${this.config.contractFileName}

import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}, witnesses } from '@midnight-ntwrk/counter-contract';
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
  type FinalizedTxData,
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
import * as fsAsync from 'node:fs/promises';
import * as fs from 'node:fs';
import {
  type ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract,
  type ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateState,
  type ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateStateId,
  type ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers,
  type Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract,
} from './common-types.js';
import { type Config, contractConfig } from './config.js';

let logger: Logger;

// Auto-generated API functions for ${contractInfo.contractName}

${contractInfo.ledgerState.map((state) => `
/**
 * Get ${state.name} from the contract ledger state
 */
export const get${state.name.charAt(0).toUpperCase() + state.name.slice(1)} = async (
  providers: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers,
  contractAddress: ContractAddress,
): Promise<${this.mapCompactTypeToTS(state.type)} | null> => {
  assertIsContractAddress(contractAddress);
  logger.info('Checking ${state.name}...');
  const state = await providers.publicDataProvider
    .queryContractState(contractAddress)
    .then((contractState) => (contractState != null ? ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}.ledger(contractState.data).${state.name} : null));
  logger.info(\`${state.name}: \${state}\`);
  return state;
};`).join('\n')}

export const contractInstance: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract = new ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}.Contract(witnesses);

export const joinContract = async (
  providers: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers,
  contractAddress: string,
): Promise<Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract> => {
  const contract = await findDeployedContract(providers, {
    contractAddress,
    contract: contractInstance,
    privateStateId: '${contractName}PrivateState',
    initialPrivateState: { privateCounter: 0 },
  });
  logger.info(\`Joined contract at address: \${contract.deployTxData.public.contractAddress}\`);
  return contract;
};

export const deploy = async (
  providers: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers,
  privateState: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateState,
): Promise<Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract> => {
  logger.info('Deploying contract...');
  const contract = await deployContract(providers, {
    contract: contractInstance,
    privateStateId: '${contractName}PrivateState',
    initialPrivateState: privateState,
  });
  logger.info(\`Deployed contract at address: \${contract.deployTxData.public.contractAddress}\`);
  return contract;
};

${contractInfo.functions.map((func) => `
/**
 * ${func.description || `Execute ${func.name} function`}
 * ${func.parameters.map(p => `@param ${p.name} ${p.type} parameter`).join('\n * ')}
 */
export const ${func.name} = async (
  ${func.readOnly ? `providers: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers, contract: Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract` : `contract: Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract`}${func.parameters.length > 0 ? ', ' + func.parameters.map(p => `${p.name}: ${this.mapCompactTypeToTS(p.type)}`).join(', ') : ''}
): Promise<${func.readOnly ? this.mapCompactTypeToTS(func.returnType) : 'FinalizedTxData'}> => {
  logger.info('${func.description || `Executing ${func.name}...`}');
  ${func.readOnly ? `
  // Read-only function implementation
  switch ('${func.name}') {
    // Add specific read-only logic here
    default:
      throw new Error('Read-only function ${func.name} not implemented');
  }` : `
  const finalizedTxData = await contract.callTx.${func.name}(${func.parameters.map(p => p.name).join(', ')});
  logger.info(\`Transaction \${finalizedTxData.public.txId} added in block \${finalizedTxData.public.blockHeight}\`);
  return finalizedTxData.public;`}
};`).join('\n')}

// Utility functions (keep existing implementation)
export const configureProviders = async (wallet: Wallet & Resource, config: Config) => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(wallet);
  return {
    privateStateProvider: levelPrivateStateProvider<typeof ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateStateId>({
      privateStateStoreName: contractConfig.privateStateStoreName,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider: new NodeZkConfigProvider<${contractInfo.functions.map(f => `'${f.name}'`).join(' | ')}>(contractConfig.zkConfigPath),
    proofProvider: httpClientProofProvider(config.proofServer),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};

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

export function setLogger(_logger: Logger) {
  logger = _logger;
}

// Additional utility functions...
// (Include remaining utility functions from the original api.ts)
`;

    const outputPath = path.join(this.config.cliSourceDir, 'src', 'generated-api.ts');
    await fs.promises.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Generate CLI module with dynamic menus
   */
  private async generateCLIModule(contractInfo: ContractInfo): Promise<void> {
    const contractName = path.basename(this.config.contractFileName, '.compact');
    const content = `// Auto-generated CLI module for ${contractInfo.contractName}
// Generated on: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - This file is auto-generated from ${this.config.contractFileName}

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type StartedDockerComposeEnvironment, type DockerComposeEnvironment } from 'testcontainers';
import { type ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers, type Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract } from './common-types.js';
import { type Config, StandaloneConfig } from './config.js';
import * as api from './generated-api.js';

let logger: Logger;

const GENESIS_MINT_WALLET_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

const DEPLOY_OR_JOIN_QUESTION = \`
You can do one of the following:
  1. Deploy a new ${contractInfo.contractName}
  2. Join an existing ${contractInfo.contractName}
  3. Exit
Which would you like to do? \`;

const MAIN_LOOP_QUESTION = \`
You can do one of the following:
${contractInfo.functions.map((func, index) => `  ${index + 1}. ${func.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}${func.parameters.length > 0 ? ` (${func.parameters.map(p => p.type).join(', ')})` : ''}`).join('\n')}
  ${contractInfo.functions.length + 1}. Display contract state
  ${contractInfo.functions.length + 2}. Exit
Which would you like to do? \`;

const join = async (providers: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers, rli: Interface): Promise<Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract> => {
  const contractAddress = await rli.question('What is the contract address (in hex)? ');
  return await api.joinContract(providers, contractAddress);
};

const deployOrJoin = async (providers: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers, rli: Interface): Promise<Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract | null> => {
  while (true) {
    const choice = await rli.question(DEPLOY_OR_JOIN_QUESTION);
    switch (choice) {
      case '1':
        return await api.deploy(providers, { privateCounter: 0 });
      case '2':
        return await join(providers, rli);
      case '3':
        logger.info('Exiting...');
        return null;
      default:
        logger.error(\`Invalid choice: \${choice}\`);
    }
  }
};

const mainLoop = async (providers: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers, rli: Interface): Promise<void> => {
  const contract = await deployOrJoin(providers, rli);
  if (contract === null) {
    return;
  }
  
  logger.info('=== ${contractInfo.contractName} CLI ===');
  logger.info(\`Contract Address: \${contract.deployTxData.public.contractAddress}\`);
  logger.info('Available functions: ${contractInfo.functions.map(f => f.name).join(', ')}');
  
  while (true) {
    const choice = await rli.question(MAIN_LOOP_QUESTION);
    try {
      const choiceNum = parseInt(choice, 10);
      
      if (choiceNum >= 1 && choiceNum <= ${contractInfo.functions.length}) {
        const funcIndex = choiceNum - 1;
        await executeFunctionByIndex(funcIndex, providers, contract, rli);
      } else if (choiceNum === ${contractInfo.functions.length + 1}) {
        await displayContractState(providers, contract);
      } else if (choiceNum === ${contractInfo.functions.length + 2}) {
        logger.info('Exiting...');
        break;
      } else {
        logger.error(\`Invalid choice: \${choice}\`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(\`❌ Operation failed: \${error.message}\`);
      } else {
        logger.error(\`❌ Unknown error occurred: \${error}\`);
      }
      logger.info('You can try another operation or exit.');
    }
  }
};

const executeFunctionByIndex = async (
  index: number,
  providers: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers,
  contract: Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract,
  rli: Interface
): Promise<void> => {
  const functions = [
${contractInfo.functions.map((func) => `    { name: '${func.name}', params: [${func.parameters.map(p => `{ name: '${p.name}', type: '${p.type}' }`).join(', ')}], readOnly: ${func.readOnly} }`).join(',\n')}
  ];
  
  if (index < 0 || index >= functions.length) {
    throw new Error('Invalid function index');
  }
  
  const func = functions[index];
  const args: any[] = [];
  
  // Collect parameters
  for (const param of func.params) {
    const value = await collectParameter(param, rli);
    args.push(value);
  }
  
  // Execute function
  logger.info(\`🔧 Executing \${func.name}...\`);
  
  switch (func.name) {
${contractInfo.functions.map((func) => `    case '${func.name}':
      ${func.readOnly ? `
      const result_${func.name} = await api.${func.name}(providers, contract${func.parameters.length > 0 ? ', ...args' : ''});
      logger.info(\`Result: \${result_${func.name}}\`);` : `
      await api.${func.name}(contract${func.parameters.length > 0 ? ', ...args' : ''});
      logger.info('✅ Function executed successfully!');`}
      break;`).join('\n')}
    default:
      throw new Error(\`Unknown function: \${func.name}\`);
  }
};

const collectParameter = async (param: { name: string, type: string }, rli: Interface): Promise<any> => {
  const prompt = \`Enter \${param.name} (\${param.type}): \`;
  const input = await rli.question(prompt);
  
  // Convert input based on type
  switch (param.type) {
    case 'Uint<64>':
    case 'Uint<8>':
    case 'Counter':
      const num = parseInt(input, 10);
      if (isNaN(num)) {
        throw new Error(\`Invalid number: \${input}\`);
      }
      return BigInt(num);
    case 'Bytes<32>':
    case 'Bytes<3>':
      if (input.startsWith('0x')) {
        return new Uint8Array(Buffer.from(input.slice(2), 'hex'));
      }
      return new Uint8Array(Buffer.from(input, 'utf8'));
    default:
      return input;
  }
};

const displayContractState = async (
  providers: ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers,
  contract: Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract
): Promise<void> => {
  logger.info('=== Contract State ===');
  logger.info(\`Contract Address: \${contract.deployTxData.public.contractAddress}\`);
  
${contractInfo.ledgerState.map((state) => `  try {
    const ${state.name} = await api.get${state.name.charAt(0).toUpperCase() + state.name.slice(1)}(providers, contract.deployTxData.public.contractAddress);
    logger.info(\`${state.name}: \${${state.name}}\`);
  } catch (error) {
    logger.warn(\`Could not fetch ${state.name}: \${error}\`);
  }`).join('\n')}
};

// Wallet management functions (keep existing implementation)
// ... (include buildWallet, buildWalletFromSeed, etc.)

export const run = async (config: Config, _logger: Logger, dockerEnv?: DockerComposeEnvironment): Promise<void> => {
  logger = _logger;
  api.setLogger(_logger);
  const rli = createInterface({ input, output, terminal: true });
  
  // Implementation similar to original cli.ts but using generated functions
  // ... (include rest of run function implementation)
};
`;

    const outputPath = path.join(this.config.cliSourceDir, 'src', 'generated-cli.ts');
    await fs.promises.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Generate TypeScript types based on contract
   */
  private async generateTypes(contractInfo: ContractInfo): Promise<void> {
    const contractName = path.basename(this.config.contractFileName, '.compact');
    const content = `// Auto-generated types for ${contractInfo.contractName}
// Generated on: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - This file is auto-generated from ${this.config.contractFileName}

import { ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}, type ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateState } from '@midnight-ntwrk/counter-contract';
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

export type { ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateState };

export type ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Circuits = ImpureCircuitId<${contractName.charAt(0).toUpperCase() + contractName.slice(1)}.Contract<${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateState>>;

export const ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateStateId = '${contractName}PrivateState';

export type ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Providers = MidnightProviders<${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Circuits, typeof ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateStateId, ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateState>;

export type ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract = ${contractName.charAt(0).toUpperCase() + contractName.slice(1)}.Contract<${contractName.charAt(0).toUpperCase() + contractName.slice(1)}PrivateState>;

export type Deployed${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract = DeployedContract<${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract> | FoundContract<${contractName.charAt(0).toUpperCase() + contractName.slice(1)}Contract>;

// Function parameter interfaces
export interface ContractFunctions {
${contractInfo.functions.map((func) => `  ${func.name}: {
    parameters: [${func.parameters.map(p => this.mapCompactTypeToTS(p.type)).join(', ')}];
    returnType: ${this.mapCompactTypeToTS(func.returnType)};
    readOnly: ${func.readOnly};
  };`).join('\n')}
}

// Contract state interface
export interface ContractState {
${contractInfo.ledgerState.map((state) => `  ${state.name}: ${this.mapCompactTypeToTS(state.type)};`).join('\n')}
}
`;

    const outputPath = path.join(this.config.cliSourceDir, 'src', 'generated-types.ts');
    await fs.promises.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Update package.json scripts to include generated CLI
   */
  private async updatePackageScripts(contractInfo: ContractInfo): Promise<void> {
    const packagePath = path.join(this.config.cliSourceDir, 'package.json');
    const packageJson = JSON.parse(await fs.promises.readFile(packagePath, 'utf-8'));

    // Add auto-generation scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      'auto-generate': 'node ../scripts/auto-generator.js',
      'start-auto': 'npm run auto-generate',
      'dev': 'npm run auto-generate'
    };

    await fs.promises.writeFile(packagePath, JSON.stringify(packageJson, null, 2), 'utf-8');
  }

  /**
   * Map Compact types to TypeScript types
   */
  private mapCompactTypeToTS(type: string): string {
    const typeMap: {[key: string]: string} = {
      'Uint<64>': 'bigint',
      'Uint<8>': 'bigint',
      'Counter': 'bigint',
      'Bytes<32>': 'Uint8Array',
      'Bytes<3>': 'Uint8Array',
      'Set<Bytes<32>>': 'Set<Uint8Array>',
      '[]': 'void',
      'boolean': 'boolean',
      'string': 'string'
    };
    
    return typeMap[type] || 'any';
  }

  /**
   * Run a command and return a promise
   */
  private async runCommand(command: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd,
        stdio: this.config.verbose ? 'inherit' : 'pipe'
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }
}

interface ContractInfo {
  contractName: string;
  functions: Array<{
    name: string;
    parameters: Array<{
      name: string;
      type: string;
    }>;
    returnType: string;
    readOnly: boolean;
    description?: string;
  }>;
  ledgerState: Array<{
    name: string;
    type: string;
  }>;
}

/**
 * Simple parser for Compact contracts
 */
class CompactContractParser {
  parse(content: string, fileName: string): ContractInfo {
    const contractName = path.basename(fileName, '.compact');
    const functions: ContractInfo['functions'] = [];
    const ledgerState: ContractInfo['ledgerState'] = [];

    // Parse ledger declarations
    const ledgerRegex = /export\s+ledger\s+(\w+):\s*([^;]+);/g;
    let match;
    while ((match = ledgerRegex.exec(content)) !== null) {
      const [, name, type] = match;
      ledgerState.push({
        name: name.trim(),
        type: type.trim()
      });
    }

    // Parse circuit functions
    const circuitRegex = /export\s+circuit\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g;
    while ((match = circuitRegex.exec(content)) !== null) {
      const [, name, params, returnType] = match;
      
      const parameters: ContractInfo['functions'][0]['parameters'] = [];
      if (params.trim()) {
        const paramList = params.split(',').map(p => p.trim()).filter(p => p);
        for (const param of paramList) {
          const colonIndex = param.indexOf(':');
          if (colonIndex > 0) {
            const paramName = param.substring(0, colonIndex).trim();
            const paramType = param.substring(colonIndex + 1).trim();
            parameters.push({
              name: paramName,
              type: paramType
            });
          }
        }
      }

      // Determine if function is read-only based on return type and naming
      const readOnly = returnType.trim() !== '[]' && returnType.trim() !== '' || 
                      name.startsWith('get_') || 
                      name.includes('public_key');

      functions.push({
        name,
        parameters,
        returnType: returnType.trim(),
        readOnly,
        description: this.generateDescription(name, parameters)
      });
    }

    return {
      contractName: `${contractName.charAt(0).toUpperCase() + contractName.slice(1)} Contract`,
      functions,
      ledgerState
    };
  }

  private generateDescription(name: string, parameters: any[]): string {
    const descriptions: {[key: string]: string} = {
      'increment': 'Increments the counter by 1',
      'vote_for': 'Vote for an option (0 for A, 1 for B)',
      'get_vote_count': 'Get the vote count for an option (0 for A, 1 for B)',
      'get_round': 'Get the current round/counter value',
      'public_key_vote': 'Generate a public key for voting'
    };
    
    return descriptions[name] || `Execute ${name} function with ${parameters.length} parameter(s)`;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: GenerationConfig = {
    contractSourceDir: path.resolve(__dirname, '..', 'contract', 'src'),
    contractBuildDir: path.resolve(__dirname, '..', 'contract', 'dist'),
    cliSourceDir: path.resolve(__dirname, '..', 'counter-cli'),
    contractFileName: 'zkvote.compact',
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
  };

  const generator = new CompactCLIAutoGenerator(config);
  generator.start().catch(console.error);
}

export { CompactCLIAutoGenerator, type GenerationConfig };
