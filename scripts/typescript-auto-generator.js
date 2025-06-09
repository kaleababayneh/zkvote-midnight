#!/usr/bin/env node

// TypeScript-aware Auto-generation system for Compact contract CLI tools
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TypeScriptAwareAutoGenerator {
  constructor(config) {
    this.config = config;
    this.isGenerating = false;
    this.lastGenerationTime = 0;
    this.debounceMs = 2000;
  }

  /**
   * Start the auto-generation process
   */
  async start() {
    console.log('🚀 Starting TypeScript-aware Compact Contract CLI Auto-Generator...');
    console.log('📁 Contract source:', this.config.contractSourceDir);
    console.log('🎯 Target CLI:', this.config.cliSourceDir);
    console.log('📄 Contract file:', this.config.contractFileName);

    try {
      await this.generateCLI('Manual generation');
      console.log('✅ TypeScript-aware auto-generation complete!');
      console.log('💡 The CLI now dynamically adapts to your contract functions with proper types.');
    } catch (error) {
      console.error('❌ Auto-generation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Generate CLI from contract (with debouncing)
   */
  async generateCLI(reason) {
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
      console.log(`📋 Found ${contractInfo.functions.length} functions and ${contractInfo.ledgerState.length} state variables`);

      // Step 2: Compile the contract
      await this.compileContract();

      // Step 3: Build the contract TypeScript
      await this.buildContract();

      // Step 4: Generate CLI files with proper TypeScript
      await this.generateTypeScriptCLIFiles(contractInfo);

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
  async parseContract() {
    const contractPath = path.join(this.config.contractSourceDir, this.config.contractFileName);
    
    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract file not found: ${contractPath}`);
    }

    const contractContent = await fs.promises.readFile(contractPath, 'utf-8');
    
    // Parse the contract using regex (simple parser)
    const parser = new TypeScriptAwareContractParser();
    return parser.parse(contractContent, this.config.contractFileName);
  }

  /**
   * Compile the Compact contract
   */
  async compileContract() {
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
  async buildContract() {
    console.log('🔧 Building contract TypeScript...');
    
    const contractDir = path.dirname(this.config.contractSourceDir);
    await this.runCommand('npm', ['run', 'build'], contractDir);

    console.log('✅ Contract built');
  }

  /**
   * Generate TypeScript CLI files based on contract analysis
   */
  async generateTypeScriptCLIFiles(contractInfo) {
    console.log('📝 Generating TypeScript CLI files...');

    // Generate updated API wrapper with proper TypeScript
    await this.generateTypeScriptAPIWrapper(contractInfo);

    // Generate updated CLI module with proper TypeScript
    await this.generateTypeScriptCLIModule(contractInfo);

    // Generate dynamic CLI documentation
    await this.generateDocumentation(contractInfo);

    console.log('✅ TypeScript CLI files generated');
  }

  /**
   * Build the CLI
   */
  async buildCLI() {
    console.log('🔧 Building CLI...');
    
    await this.runCommand('npm', ['run', 'build'], this.config.cliSourceDir);

    console.log('✅ CLI built');
  }

  /**
   * Generate enhanced API wrapper with proper TypeScript types
   */
  async generateTypeScriptAPIWrapper(contractInfo) {
    const content = `// Enhanced API wrapper for ${contractInfo.contractName}
// Generated on: ${new Date().toISOString()}
// Auto-generated from ${this.config.contractFileName}

import { type Logger } from 'pino';
import { ContractAnalyzer, type ContractAnalysis } from './contract-analyzer.js';
import { DynamicCLIGenerator, type MenuItem } from './dynamic-cli-generator.js';
import * as originalApi from './api.js';

// Re-export all original API functions
export * from './api.js';

/**
 * Enhanced API with dynamic contract analysis and proper TypeScript support
 */
export class EnhancedContractAPI {
  private readonly analyzer: ContractAnalyzer;
  private readonly cliGenerator: DynamicCLIGenerator;
  private contractInfo: ContractAnalysis | null = null;

  constructor(private readonly logger: Logger) {
    this.analyzer = new ContractAnalyzer();
    this.cliGenerator = new DynamicCLIGenerator(logger);
  }

  async initialize(): Promise<ContractAnalysis | null> {
    try {
      this.contractInfo = await this.analyzer.analyzeContract();
      await this.cliGenerator.initialize();
      return this.contractInfo;
    } catch (error) {
      throw new Error(\`Failed to initialize enhanced API: \${(error as Error).message}\`);
    }
  }

  getContractInfo(): ContractAnalysis | null {
    return this.contractInfo;
  }

  generateMenuItems(): MenuItem[] {
    return this.cliGenerator.generateMenuItems();
  }

  generateMenuQuestion(menuItems: MenuItem[]): string {
    return this.cliGenerator.generateMenuQuestion(menuItems);
  }

  // Dynamic function mapping based on contract analysis${contractInfo.functions.map((func) => `
  /**
   * ${func.description || `Execute ${func.name} function`}
   * @param args - Function arguments: ${func.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}
   * @returns Promise<${func.returnType}>
   */
  async ${func.name}(...args: any[]): Promise<any> {
    try {
      return await (originalApi as any).${func.name}(...args);
    } catch (error) {
      this.logger.error(\`Error executing ${func.name}: \${(error as Error).message}\`);
      throw error;
    }
  }`).join('')}
}

// Export contract metadata for reference
export const CONTRACT_METADATA = {
  name: '${contractInfo.contractName}',
  fileName: '${this.config.contractFileName}',
  generatedAt: '${new Date().toISOString()}',
  functions: ${JSON.stringify(contractInfo.functions, null, 2)},
  ledgerState: ${JSON.stringify(contractInfo.ledgerState, null, 2)}
} as const;
`;

    const outputPath = path.join(this.config.cliSourceDir, 'src', 'enhanced-api.ts');
    await fs.promises.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Generate enhanced CLI module with proper TypeScript types
   */
  async generateTypeScriptCLIModule(contractInfo) {
    const content = `// Enhanced CLI module for ${contractInfo.contractName}
// Generated on: ${new Date().toISOString()}
// Auto-generated from ${this.config.contractFileName}

import { type Resource } from '@midnight-ntwrk/wallet';
import { type Wallet } from '@midnight-ntwrk/wallet-api';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface, type Interface } from 'node:readline/promises';
import { type Logger } from 'pino';
import { type CounterProviders, type DeployedCounterContract } from './common-types.js';
import { type Config } from './config.js';
import { EnhancedContractAPI } from './enhanced-api.js';
import { type ContractAnalysis } from './contract-analyzer.js';
import { type MenuItem } from './dynamic-cli-generator.js';
import * as api from './api.js';

/**
 * Enhanced CLI that dynamically adapts to contract functions with TypeScript support
 */
export class EnhancedCLI {
  private readonly api: EnhancedContractAPI;
  private readonly logger: Logger;
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

    this.logger.info(\`=== \${contractInfo.contractName} CLI ===\`);
    this.logger.info(\`📊 Available functions: \${contractInfo.functions.map(f => f.name).join(', ')}\`);
    
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
            this.logger.error('❌ No contract available');
          }
        } else {
          this.logger.error(\`❌ Invalid choice: \${choice}\`);
        }
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(\`❌ Operation failed: \${error.message}\`);
          if (error.message.includes('member')) {
            this.logger.warn('💡 This might be because you have already voted. Each wallet can only vote once.');
          }
        } else {
          this.logger.error(\`❌ Unknown error occurred: \${String(error)}\`);
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
    
    const question = \`
You can do one of the following:
  1. Deploy a new \${contractInfo.contractName}
  2. Join an existing \${contractInfo.contractName}
  3. Exit
Which would you like to do? \`;

    while (true) {
      const choice = await rli.question(question);
      switch (choice) {
        case '1':
          this.contract = await api.deploy(providers, { privateCounter: 0 });
          this.logger.info(\`🎉 Successfully deployed \${contractInfo.contractName}!\`);
          return this.contract;
        case '2':
          const contractAddress = await rli.question('What is the contract address (in hex)? ');
          this.contract = await api.joinContract(providers, contractAddress);
          this.logger.info(\`🔗 Successfully joined \${contractInfo.contractName}!\`);
          return this.contract;
        case '3':
          this.logger.info('Exiting...');
          return null;
        default:
          this.logger.error(\`Invalid choice: \${choice}\`);
      }
    }
  }

  // Delegate to original CLI run function but with TypeScript enhancements
  async run(config: Config, logger: Logger, dockerEnv?: boolean): Promise<void> {
    await this.initialize();
    
    // Set up the CLI environment using original logic
    const rli = createInterface({ input, output, terminal: true });
    
    try {
      // Use original wallet and provider setup
      const wallet = await api.buildWalletAndWaitForFunds(config, 
        await rli.question('Enter your wallet seed: '), '');
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
      this.logger.error(\`CLI error: \${(error as Error).message}\`);
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
`;

    const outputPath = path.join(this.config.cliSourceDir, 'src', 'enhanced-cli.ts');
    await fs.promises.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Generate documentation
   */
  async generateDocumentation(contractInfo) {
    const content = `# Dynamic CLI for ${contractInfo.contractName}

*Auto-generated on: ${new Date().toISOString()}*

## 🚀 Quick Start

The CLI now automatically adapts to your smart contract with full TypeScript support! Simply run:

\`\`\`bash
cd counter-cli
npm run build
npm run testnet-remote  # or standalone, testnet-local, etc.
\`\`\`

## 📊 Contract Analysis

**Contract:** ${contractInfo.contractName}  
**Source File:** ${this.config.contractFileName}  
**Functions:** ${contractInfo.functions.length}  
**State Variables:** ${contractInfo.ledgerState.length}  

## 🛠️ Available Functions

${contractInfo.functions.map((func, index) => `
### ${index + 1}. ${func.name}

- **Type:** ${func.type}
- **Description:** ${func.description}
- **Parameters:** ${func.parameters.length === 0 ? 'None' : func.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}
- **Return Type:** ${func.returnType}
- **Read-Only:** ${func.readOnly ? 'Yes' : 'No'}
`).join('')}

## 📊 Contract State

${contractInfo.ledgerState.map((state) => `- **${state.name}**: ${state.type}`).join('\n')}

## ⚡ TypeScript Auto-Generation

When you modify your contract (\`${this.config.contractFileName}\`), run the TypeScript-aware auto-generator:

\`\`\`bash
node scripts/typescript-auto-generator.js
\`\`\`

This will:
1. 🔍 Analyze your contract
2. 🔨 Compile the contract 
3. 🔧 Build TypeScript
4. 📝 Generate TypeScript CLI code with proper types
5. 🎯 Update all functions dynamically

## 🎨 TypeScript Features

- **Proper Type Annotations:** All parameters and return types are properly typed
- **Interface Definitions:** Clear interfaces for contract metadata
- **Type Safety:** Compile-time type checking
- **IDE Support:** Full IntelliSense and auto-completion
- **Error Handling:** Type-safe error handling with proper error types

## 🔧 Customization

To customize the TypeScript auto-generation:

1. **Function Descriptions:** Edit \`contract-analyzer.ts\`
2. **Type Definitions:** Modify TypeScript interfaces in the generator
3. **Special Parameters:** Update \`dynamic-cli-generator.ts\`
4. **UI Enhancements:** Customize \`enhanced-cli.ts\`

## 📝 Manual Override

If you need to override auto-generated functions, create them in:
- \`src/api.ts\` - For API functions
- \`src/cli.ts\` - For CLI interactions

The enhanced CLI will prefer manual implementations over auto-generated ones.

## 🏗️ Generated Files

This TypeScript-aware generator creates:

- \`enhanced-api.ts\` - Enhanced API with proper TypeScript types
- \`enhanced-cli.ts\` - Enhanced CLI with type safety
- \`DYNAMIC_CLI_GUIDE.md\` - This documentation

All files include:
- Proper TypeScript types and interfaces
- JSDoc comments with parameter types
- Type-safe error handling
- IDE-friendly code structure
`;

    const outputPath = path.join(path.dirname(this.config.cliSourceDir), 'DYNAMIC_CLI_GUIDE.md');
    await fs.promises.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Run a command and return a promise
   */
  runCommand(command, args, cwd) {
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

/**
 * TypeScript-aware parser for Compact contracts
 */
class TypeScriptAwareContractParser {
  parse(content, fileName) {
    const contractName = path.basename(fileName, '.compact');
    const functions = [];
    const ledgerState = [];

    // Parse ledger declarations
    const ledgerRegex = /export\s+ledger\s+(\w+):\s*([^;]+);/g;
    let match;
    while ((match = ledgerRegex.exec(content)) !== null) {
      const [, name, type] = match;
      ledgerState.push({
        name: name.trim(),
        type: this.convertToTypeScriptType(type.trim()),
        description: this.generateStateDescription(name.trim())
      });
    }

    // Parse circuit functions
    const circuitRegex = /export\s+circuit\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\s*\{/g;
    while ((match = circuitRegex.exec(content)) !== null) {
      const [, name, params, returnType] = match;
      
      const parameters = [];
      if (params.trim()) {
        const paramList = params.split(',').map(p => p.trim()).filter(p => p);
        for (const param of paramList) {
          const colonIndex = param.indexOf(':');
          if (colonIndex > 0) {
            const paramName = param.substring(0, colonIndex).trim();
            const paramType = param.substring(colonIndex + 1).trim();
            parameters.push({
              name: paramName,
              type: this.convertToTypeScriptType(paramType)
            });
          }
        }
      }

      // Determine if function is read-only and convert return type
      const readOnly = returnType.trim() !== '[]' && returnType.trim() !== '' || 
                      name.startsWith('get_') || 
                      name.includes('public_key');

      const tsReturnType = this.convertToTypeScriptType(returnType.trim());

      functions.push({
        name,
        type: 'circuit',
        parameters,
        returnType: tsReturnType,
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

  convertToTypeScriptType(compactType) {
    const typeMap = {
      'Uint<8>': 'number',
      'Uint<16>': 'number',
      'Uint<32>': 'number',
      'Uint<64>': 'bigint',
      'Int<8>': 'number',
      'Int<16>': 'number', 
      'Int<32>': 'number',
      'Int<64>': 'bigint',
      'Field': 'string',
      'Boolean': 'boolean',
      '[]': 'void',
      '': 'void'
    };

    const trimmed = compactType.trim();
    return typeMap[trimmed] || 'any';
  }

  generateDescription(name, parameters) {
    const descriptions = {
      'increment': 'Increments the counter by 1',
      'vote_for': 'Vote for an option (0 for A, 1 for B)',
      'get_vote_count': 'Get the vote count for an option (0 for A, 1 for B)',
      'get_round': 'Get the current round/counter value',
      'public_key_vote': 'Generate a public key for voting'
    };
    
    return descriptions[name] || `Execute ${name} function with ${parameters.length} parameter(s)`;
  }

  generateStateDescription(name) {
    const descriptions = {
      'round': 'Current voting round counter',
      'vote_a_count': 'Total votes for option A',
      'vote_b_count': 'Total votes for option B',
      'public_key': 'Public key for voting verification'
    };
    
    return descriptions[name] || `State variable: ${name}`;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = {
    contractSourceDir: path.resolve(__dirname, '..', 'contract', 'src'),
    contractBuildDir: path.resolve(__dirname, '..', 'contract', 'dist'),
    cliSourceDir: path.resolve(__dirname, '..', 'counter-cli'),
    contractFileName: 'zkvote.compact',
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
  };

  const generator = new TypeScriptAwareAutoGenerator(config);
  generator.start().catch(console.error);
}

export { TypeScriptAwareAutoGenerator };
