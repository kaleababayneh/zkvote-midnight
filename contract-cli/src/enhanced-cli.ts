// Enhanced CLI module for Boiler-plate Contract
// Generated on: 2025-06-09T08:56:56.649Z
// Auto-generated from boiler-plate.compact

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type CounterProviders, type DeployedCounterContract } from './common-types.js';
import { type Config } from './config.js';
import { EnhancedContractAPI, type ContractInfo } from './enhanced-api.js';
import * as api from './api.js';

/**
 * Menu item interface
 */
interface MenuItem {
  id: string;
  label: string;
  action: (providers: CounterProviders, contract: DeployedCounterContract, rli: Interface) => Promise<void>;
}

/**
 * Enhanced CLI that dynamically adapts to contract functions
 */
export class EnhancedCLI {
  private api: EnhancedContractAPI;
  private logger: Logger;
  private contract: DeployedCounterContract | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
    this.api = new EnhancedContractAPI(logger);
  }

  async initialize(): Promise<void> {
    await this.api.initialize();
    this.logger.info('🎯 Enhanced CLI initialized with dynamic contract analysis');
  }

  async runEnhancedCLI(providers: CounterProviders, rli: Interface): Promise<void> {
    const contractInfo = this.api.getContractInfo();
    if (!contractInfo) {
      throw new Error('Contract info not available');
    }
    
    this.logger.info(`=== ${contractInfo.contractName} CLI ===`);
    this.logger.info(`📊 Available functions: ${contractInfo.functions.map(f => f.name).join(', ')}`);
    
    // Use the dynamic CLI generator for the main loop
    const menuItems = this.api.generateMenuItems();
    
    while (true) {
      const question = this.api.generateMenuQuestion(menuItems);
      const choice = await rli.question(question);
      
      try {
        const choiceNum = parseInt(choice, 10) - 1;
        
        if (choiceNum >= 0 && choiceNum < menuItems.length) {
          const selectedItem = menuItems[choiceNum];
          
          if (selectedItem.id === 'exit') {
            this.logger.info('👋 Goodbye!');
            break;
          }
          
          // Execute the selected action
          if (this.contract) {
            await selectedItem.action(providers, this.contract, rli);
          } else {
            this.logger.error('❌ Contract not available');
          }
        } else {
          this.logger.error(`❌ Invalid choice: ${choice}`);
        }
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`❌ Operation failed: ${error.message}`);
          if (error.message.includes('member')) {
            this.logger.warn('💡 This might be because you have already voted. Each wallet can only vote once.');
          }
        } else {
          this.logger.error(`❌ Unknown error occurred: ${error}`);
        }
        this.logger.info('You can try another operation or exit.');
      }
    }
  }

  async deployOrJoin(providers: CounterProviders, rli: Interface): Promise<DeployedCounterContract | null> {
    // Use original deploy/join logic but enhanced with dynamic feedback
    const contractInfo = this.api.getContractInfo();
    if (!contractInfo) {
      throw new Error('Contract info not available');
    }
    
    const question = `
You can do one of the following:
  1. Deploy a new ${contractInfo.contractName}
  2. Join an existing ${contractInfo.contractName}
  3. Exit
Which would you like to do? `;

    while (true) {
      const choice = await rli.question(question);
      switch (choice) {
        case '1':
          this.contract = await api.deploy(providers, { privateCounter: 0 });
          this.logger.info(`🎉 Successfully deployed ${contractInfo.contractName}!`);
          return this.contract;
        case '2':
          const contractAddress = await rli.question('What is the contract address (in hex)? ');
          this.contract = await api.joinContract(providers, contractAddress);
          this.logger.info(`🔗 Successfully joined ${contractInfo.contractName}!`);
          return this.contract;
        case '3':
          this.logger.info('Exiting...');
          return null;
        default:
          this.logger.error(`Invalid choice: ${choice}`);
      }
    }
  }

  // Delegate to original CLI run function but with enhancements
  async run(config: Config, logger: Logger, dockerEnv?: boolean): Promise<void> {
    await this.initialize();
    
    // Set up the CLI environment using original logic
    const rli = createInterface({ input, output, terminal: true });
    
    try {
      // Use API wallet and provider setup
      const wallet = await api.buildFreshWallet(config);
      if (wallet !== null) {
        const providers = await api.configureProviders(wallet, config);
        
        // Deploy or join contract
        const contract = await this.deployOrJoin(providers, rli);
        if (contract !== null) {
          this.contract = contract;
          // Run enhanced CLI loop
          await this.runEnhancedCLI(providers, rli);
        }
      }
    } catch (error) {
      this.logger.error(`CLI error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      rli.close();
    }
  }
}

// Export for backward compatibility
export const runEnhanced = async (config: Config, logger: Logger, dockerEnv?: boolean): Promise<void> => {
  const enhancedCli = new EnhancedCLI(logger);
  await enhancedCli.run(config, logger, dockerEnv);
};

// Also export original run function
export { run as runOriginal } from './cli.js';
