#!/usr/bin/env node

// Auto-generation system for Compact contract CLI tools
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CompactCLIAutoGenerator {
  constructor(config) {
    this.config = config;
    this.isGenerating = false;
    this.lastGenerationTime = 0;
    this.debounceMs = 2000; // 2 second debounce
  }

  /**
   * Start the auto-generation process (one-time run)
   */
  async start() {
    console.log('🚀 Starting Compact Contract CLI Auto-Generator...');
    console.log('📁 Contract source:', this.config.contractSourceDir);
    console.log('🎯 Target CLI:', this.config.cliSourceDir);
    console.log('📄 Contract file:', this.config.contractFileName);

    try {
      await this.generateCLI('Manual generation');
      console.log('✅ Auto-generation complete!');
      console.log('💡 The CLI now dynamically adapts to your contract functions.');
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
      console.log(`📋 Found ${contractInfo.functions.length} functions and ${Object.keys(contractInfo.ledgerState).length} state variables`);

      // Step 2: Compile the contract
      await this.compileContract();

      // Step 3: Build the contract TypeScript
      await this.buildContract();

      // Step 4: Update core API to match contract functions
      await this.updateCoreAPI(contractInfo);

      // Step 5: Generate CLI files
      await this.generateCLIFiles(contractInfo);

      // Step 6: Build CLI
      await this.buildCLI();

      console.log('✅ Generation complete!\n');
    } catch (error) {
      console.error('❌ Generation failed:', error);
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Auto-detect the contract file in the contract directory
   * Since there's always exactly one .compact file, this is simple
   */
  detectContractFile() {
    const contractDir = this.config.contractSourceDir;
    
    if (!fs.existsSync(contractDir)) {
      throw new Error(`Contract directory not found: ${contractDir}`);
    }

    // Look for the single .compact file in the contract directory
    const files = fs.readdirSync(contractDir);
    const compactFiles = files.filter(file => file.endsWith('.compact'));
    
    if (compactFiles.length === 0) {
      throw new Error(`No .compact files found in ${contractDir}`);
    }
    
    if (compactFiles.length > 1) {
      console.log(`⚠️  Found ${compactFiles.length} .compact files: ${compactFiles.join(', ')}`);
      console.log(`📄 Using the first one: ${compactFiles[0]}`);
    }
    
    const detectedFile = compactFiles[0];
    console.log(`🔍 Auto-detected contract file: ${detectedFile}`);
    
    return detectedFile;
  }

  /**
   * Parse the Compact contract to extract function and state information
   */
  async parseContract() {
    // Auto-detect contract file if not explicitly set or if the set file doesn't exist
    let contractFileName = this.config.contractFileName;
    
    if (!contractFileName) {
      contractFileName = this.detectContractFile();
      // Update config for consistency
      this.config.contractFileName = contractFileName;
    } else {
      const explicitPath = path.join(this.config.contractSourceDir, contractFileName);
      if (!fs.existsSync(explicitPath)) {
        console.log(`⚠️  Specified contract file not found: ${contractFileName}`);
        contractFileName = this.detectContractFile();
        // Update config for consistency
        this.config.contractFileName = contractFileName;
      }
    }
    
    const contractPath = path.join(this.config.contractSourceDir, contractFileName);
    
    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract file not found: ${contractPath}`);
    }

    const contractContent = await fs.promises.readFile(contractPath, 'utf-8');
    
    // Parse the contract using regex (simple parser)
    const parser = new CompactContractParser();
    return parser.parse(contractContent, contractFileName);
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
   * Generate CLI files based on contract analysis
   */
  async generateCLIFiles(contractInfo) {
    console.log('📝 Generating CLI files...');

    // Generate updated API wrapper
    await this.generateAPIWrapper(contractInfo);

    // Generate updated CLI module
    await this.generateCLIModule(contractInfo);

    // Generate dynamic CLI documentation
    await this.generateDocumentation(contractInfo);

    // Update core API file
    await this.updateCoreAPI(contractInfo);

    console.log('✅ CLI files generated');
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
   * Generate enhanced API wrapper file
   */
  async generateAPIWrapper(contractInfo) {
    const contractName = path.basename(this.config.contractFileName, '.compact');
    const content = `// Enhanced API wrapper for ${contractInfo.contractName}
// Generated on: ${new Date().toISOString()}
// Auto-generated from ${this.config.contractFileName}

import { type Logger } from 'pino';
import { ContractAnalyzer } from './contract-analyzer.js';
import { DynamicCLIGenerator } from './dynamic-cli-generator.js';
import * as originalApi from './api.js';

// Re-export all original API functions
export * from './api.js';

/**
 * Contract information interface
 */
export interface ContractInfo {
  contractName: string;
  functions: Array<{
    name: string;
    parameters: Array<{ name: string; type: string }>;
    returnType: string;
    readOnly: boolean;
    description: string;
  }>;
  ledgerState: Array<{ name: string; type: string }>;
}

/**
 * Enhanced API with dynamic contract analysis
 */
export class EnhancedContractAPI {
  private analyzer: ContractAnalyzer;
  private cliGenerator: DynamicCLIGenerator;
  private contractInfo: ContractInfo | null;

  constructor(logger: Logger) {
    this.analyzer = new ContractAnalyzer();
    this.cliGenerator = new DynamicCLIGenerator(logger);
    this.contractInfo = null;
  }

  async initialize(): Promise<ContractInfo> {
    try {
      const analysis = await this.analyzer.analyzeContract();
      await this.cliGenerator.initialize();
      
      // Convert ContractAnalysis to ContractInfo format
      this.contractInfo = {
        contractName: analysis.contractName,
        functions: analysis.functions.map(func => ({
          ...func,
          readOnly: this.analyzer.isReadOnlyFunction(func.name),
          description: func.description || \`Execute \${func.name} function\`
        })),
        ledgerState: Object.entries(analysis.ledgerState).map(([name, type]) => ({ name, type }))
      };
      
      return this.contractInfo;
    } catch (error) {
      throw new Error(\`Failed to initialize enhanced API: \${error instanceof Error ? error.message : String(error)}\`);
    }
  }

  getContractInfo(): ContractInfo | null {
    return this.contractInfo;
  }

  generateMenuItems(): any[] {
    return this.cliGenerator.generateMenuItems();
  }

  generateMenuQuestion(menuItems: any[]): string {
    return this.cliGenerator.generateMenuQuestion(menuItems);
  }

  // Dynamic function mapping based on contract analysis${contractInfo.functions.map((func) => `
  /**
   * ${func.description || `Execute ${func.name} function`}
   */
  async ${func.name}(...args: any[]): Promise<any> {
    return await (originalApi as any).${func.name}(...args);
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
   * Generate enhanced CLI module
   */
  async generateCLIModule(contractInfo) {
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
            this.logger.error('❌ Contract not available');
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
          this.logger.error(\`❌ Unknown error occurred: \${error}\`);
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
      this.logger.error(\`CLI error: \${error instanceof Error ? error.message : String(error)}\`);
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

The CLI now automatically adapts to your smart contract! Simply run:

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

- **Description:** ${func.description}
- **Parameters:** ${func.parameters.length === 0 ? 'None' : func.parameters.map(p => `${p.name} (${p.type})`).join(', ')}
- **Return Type:** ${func.returnType}
- **Read-Only:** ${func.readOnly ? 'Yes' : 'No'}
`).join('')}

## 📊 Contract State

${contractInfo.ledgerState.map((state) => `- **${state.name}** (${state.type})`).join('\n')}

## ⚡ Auto-Generation

When you modify your contract (\`${this.config.contractFileName}\`), run the auto-generator:

\`\`\`bash
node scripts/auto-generator.js
\`\`\`

This will:
1. 🔍 Analyze your contract
2. 🔨 Compile the contract 
3. 🔧 Build TypeScript
4. 📝 Generate CLI code
5. 🎯 Update all functions dynamically

## 🎨 Features

- **Dynamic Menus:** Menu options are generated from your contract functions
- **Type Safety:** Automatic parameter type conversion
- **Error Handling:** Comprehensive error messages and suggestions
- **State Display:** View all contract state variables
- **Transaction Tracking:** See transaction IDs and block confirmations

## 🔧 Customization

To customize the auto-generation:

1. **Function Descriptions:** Edit \`contract-analyzer.ts\`
2. **Special Parameters:** Modify \`dynamic-cli-generator.ts\`
3. **UI Enhancements:** Update \`enhanced-cli.ts\`

## 📝 Manual Override

If you need to override auto-generated functions, create them in:
- \`src/api.ts\` - For API functions
- \`src/cli.ts\` - For CLI interactions

The enhanced CLI will prefer manual implementations over auto-generated ones.
`;

    const outputPath = path.join(path.dirname(this.config.cliSourceDir), 'DYNAMIC_CLI_GUIDE.md');
    await fs.promises.writeFile(outputPath, content, 'utf-8');
  }

  /**
   * Update the core API file to match contract functions
   */
  async updateCoreAPI(contractInfo) {
    console.log('🔧 Updating core API to match contract functions...');
    
    const apiPath = path.join(this.config.cliSourceDir, 'src', 'api.ts');
    let apiContent = await fs.promises.readFile(apiPath, 'utf-8');
    
    // Find all functions (prioritize increment-like functions, but handle any function)
    const allFunctions = contractInfo.functions;
    const incrementFunctions = allFunctions.filter(f => 
      f.name.toLowerCase().includes('increment') || 
      f.name.toLowerCase().includes('boost') || 
      f.name.toLowerCase().includes('counter')
    );
    
    let primaryFunction = null;
    if (incrementFunctions.length > 0) {
      primaryFunction = incrementFunctions[0];
    } else {
      // If no increment-like function, use the first non-readonly function
      primaryFunction = allFunctions.find(f => !f.readOnly);
    }
    
    if (primaryFunction) {
      console.log(`🎯 Primary function detected: ${primaryFunction.name}`);
      
      // Update ALL function calls in the increment function - be more aggressive
      apiContent = apiContent.replace(
        /await counterContract\.callTx\.(\w+)\(\);/g,
        `await counterContract.callTx.${primaryFunction.name}();`
      );
      
      // Also handle any other possible patterns
      apiContent = apiContent.replace(
        /counterContract\.callTx\.(\w+)\(\)/g,
        `counterContract.callTx.${primaryFunction.name}()`
      );
    }
    
    // Update zkConfigProvider types to use actual function names from contract (impure circuits only)
    const impureFunctionNames = contractInfo.functions
      .filter(f => !f.readOnly && !f.name.includes('public_key'))
      .map(f => `'${f.name}'`)
      .join(' | ');
    
    if (impureFunctionNames) {
      
      // Find and replace the NodeZkConfigProvider type parameter more precisely
      apiContent = apiContent.replace(
        /new NodeZkConfigProvider<[^>]+>/g,
        `new NodeZkConfigProvider<${impureFunctionNames}>`
      );
      
      // Also handle generic type parameters
      apiContent = apiContent.replace(
        /NodeZkConfigProvider<[^>]+>/g,
        `NodeZkConfigProvider<${impureFunctionNames}>`
      );
    }
    
    // Remove any CounterCircuits import since we're using inline types and dynamic imports
    apiContent = apiContent.replace(
      /import { type CounterProviders, type DeployedCounterContract, type CounterCircuits } from '\.\/common-types\.js';/g,
      `import { type CounterProviders, type DeployedCounterContract } from './common-types.js';`
    );
    
    // Also remove from other possible import patterns
    apiContent = apiContent.replace(
      /, type CounterCircuits/g,
      ''
    );
    
    // Remove any hardcoded Zkvote references and replace with dynamic imports
    apiContent = apiContent.replace(
      /import { Zkvote, witnesses }/g,
      'import { contracts, witnesses }'
    );
    
    // Replace Zkvote usage with dynamic contract access
    apiContent = apiContent.replace(
      /Zkvote\./g,
      'contractModule.'
    );
    
    // Add dynamic contract module accessor if not present
    if (!apiContent.includes('const contractModule = ') && !apiContent.includes('getContractModule')) {
      const importSection = apiContent.match(/(import[\s\S]*?from[^;]+;)\s*\n/g);
      if (importSection) {
        const lastImport = importSection[importSection.length - 1];
        const insertPoint = apiContent.indexOf(lastImport) + lastImport.length;
        const dynamicHelperCode = `
// Get the dynamic contract module
const getContractModule = () => {
  const contractNames = Object.keys(contracts);
  if (contractNames.length === 0) {
    throw new Error('No contract found in contracts object');
  }
  return contracts[contractNames[0]];
};

const contractModule = getContractModule();
`;
        apiContent = apiContent.slice(0, insertPoint) + dynamicHelperCode + apiContent.slice(insertPoint);
      }
    }
    
    // Write the updated API file
    await fs.promises.writeFile(apiPath, apiContent, 'utf-8');
    console.log('✅ Core API updated');
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
 * Simple parser for Compact contracts
 */
class CompactContractParser {
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
        type: type.trim()
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
              type: paramType
            });
          }
        }
      }

      // Determine if function is read-only
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

  generateDescription(name, parameters) {
    const descriptions = {
      'incrementosas': 'Increments the counter/round by 1',
      'increment': 'Increments the counter by 1',
      'incrementCounter': 'Increments the counter by 1',
      'incrementMainCounter': 'Increments the main counter by 1',
      'boostCounter': 'Boosts the counter by 1',
      'superBoostCounter': 'Super boosts the counter by 1',
      'vote_for': 'Vote for an option (0 for A, 1 for B)',
      'get_vote_count': 'Get the vote count for an option (0 for A, 1 for B)',
      'get_round': 'Get the current round/counter value',
      'public_key_vote': 'Generate a public key for voting'
    };
    
    // Handle variations of increment/boost/counter functions
    if (name.toLowerCase().includes('increment') || 
        name.toLowerCase().includes('boost') || 
        name.toLowerCase().includes('counter')) {
      return 'Increments the counter/round by 1';
    }
    
    return descriptions[name] || `Execute ${name} function with ${parameters.length} parameter(s)`;
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = {
    contractSourceDir: path.resolve(__dirname, '..', 'contract', 'src'),
    contractBuildDir: path.resolve(__dirname, '..', 'contract', 'dist'),
    cliSourceDir: path.resolve(__dirname, '..', 'counter-cli'),
    contractFileName: null, // Auto-detect any .compact file
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
  };

  const generator = new CompactCLIAutoGenerator(config);
  generator.start().catch(console.error);
}

export { CompactCLIAutoGenerator };
