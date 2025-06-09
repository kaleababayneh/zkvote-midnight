#!/usr/bin/env node

// This file is part of example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';
import { ContractAnalyzer } from './contract-analyzer.js';

/**
 * Auto-generates CLI functions and API wrappers based on contract analysis
 */
class CLIAutoGenerator {
  private analyzer: ContractAnalyzer;
  private outputDir: string;

  constructor() {
    this.analyzer = new ContractAnalyzer();
    this.outputDir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
  }

  async generate(): Promise<void> {
    console.log('🔍 Analyzing contract...');
    
    try {
      const analysis = await this.analyzer.analyzeContract();
      
      console.log(`✅ Contract analyzed: ${analysis.contractName}`);
      console.log(`📋 Found ${analysis.functions.length} functions:`);
      
      analysis.functions.forEach(func => {
        const params = func.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
        console.log(`   - ${func.name}(${params}) -> ${func.returnType}`);
      });

      // Generate API wrappers
      await this.generateAPIWrappers(analysis);
      
      // Generate CLI documentation
      await this.generateCLIDocumentation(analysis);
      
      console.log('🎉 CLI auto-generation complete!');
      console.log('💡 The CLI will now dynamically adapt to your contract functions.');
      
    } catch (error) {
      console.error('❌ Failed to analyze contract:', error);
      console.error('🔧 Make sure your contract is compiled and built before running the CLI.');
      process.exit(1);
    }
  }

  /**
   * Generate API wrapper functions for better type safety and documentation
   */
  private async generateAPIWrappers(analysis: any): Promise<void> {
    const wrapperContent = this.generateAPIWrapperContent(analysis);
    const wrapperPath = path.join(this.outputDir, 'generated-api-wrappers.ts');
    
    await fs.promises.writeFile(wrapperPath, wrapperContent, 'utf-8');
    console.log(`📝 Generated API wrappers: ${path.relative(process.cwd(), wrapperPath)}`);
  }

  /**
   * Generate CLI documentation based on contract functions
   */
  private async generateCLIDocumentation(analysis: any): Promise<void> {
    const docContent = this.generateDocumentationContent(analysis);
    const docPath = path.join(this.outputDir, '..', 'DYNAMIC_CLI_GUIDE.md');
    
    await fs.promises.writeFile(docPath, docContent, 'utf-8');
    console.log(`📚 Generated CLI guide: ${path.relative(process.cwd(), docPath)}`);
  }

  /**
   * Generate the content for API wrapper file
   */
  private generateAPIWrapperContent(analysis: any): string {
    return `// Auto-generated API wrappers for ${analysis.contractName}
// Generated on: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - This file is auto-generated

import { type CounterProviders, type DeployedCounterContract } from './common-types.js';
import { type FinalizedTxData } from '@midnight-ntwrk/midnight-js-types';
import { type Logger } from 'pino';

/**
 * Auto-generated API wrappers for contract functions
 */
export class GeneratedAPIWrappers {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

${analysis.functions.map((func: any) => this.generateFunctionWrapper(func)).join('\n\n')}
}

/**
 * Function parameter types
 */
export interface FunctionParameters {
${analysis.functions.map((func: any) => 
  `  ${func.name}: [${func.parameters.map((p: any) => this.mapToTypeScriptType(p.type)).join(', ')}];`
).join('\n')}
}

/**
 * Contract state interface
 */
export interface ContractState {
${Object.entries(analysis.ledgerState).map(([name, type]) => 
  `  ${name}: ${this.mapToTypeScriptType(type as string)};`
).join('\n')}
}
`;
  }

  /**
   * Generate a wrapper function for a contract function
   */
  private generateFunctionWrapper(func: any): string {
    const paramList = func.parameters.map((p: any) => 
      `${p.name}: ${this.mapToTypeScriptType(p.type)}`
    ).join(', ');
    
    const paramArgs = func.parameters.map((p: any) => p.name).join(', ');
    
    const returnType = func.returnType === 'void' ? 'Promise<FinalizedTxData>' : 'Promise<any>';
    
    return `  /**
   * ${func.description}
   * @param contract - The deployed contract instance
${func.parameters.map((p: any) => `   * @param ${p.name} - ${p.type} parameter`).join('\n')}
   */
  async ${func.name}(contract: DeployedCounterContract${paramList ? `, ${paramList}` : ''}): ${returnType} {
    this.logger.info(\`🔧 Executing ${func.name}...\`);
    
    try {
      const result = await contract.callTx.${func.name}(${paramArgs});
      this.logger.info(\`Transaction \${result.public.txId} added in block \${result.public.blockHeight}\`);
      return result.public;
    } catch (error) {
      this.logger.error(\`Failed to execute ${func.name}:\`, error);
      throw error;
    }
  }`;
  }

  /**
   * Generate documentation content
   */
  private generateDocumentationContent(analysis: any): string {
    return `# Dynamic CLI Guide for ${analysis.contractName}

*Auto-generated on: ${new Date().toISOString()}*

## Overview

This CLI automatically adapts to your smart contract functions. When you run \`npm run start\`, the system analyzes your compiled contract and generates a dynamic menu with all available functions.

## Contract Analysis

**Contract Name:** ${analysis.contractName}
**Functions Found:** ${analysis.functions.length}
**Ledger State Properties:** ${Object.keys(analysis.ledgerState).length}

## Available Functions

${analysis.functions.map((func: any, index: number) => `
### ${index + 1}. ${func.name}

**Description:** ${func.description}
**Parameters:** ${func.parameters.length === 0 ? 'None' : func.parameters.map((p: any) => `${p.name} (${p.type})`).join(', ')}
**Return Type:** ${func.returnType}
**Read-Only:** ${this.analyzer.isReadOnlyFunction(func.name) ? 'Yes' : 'No'}
`).join('\n')}

## Contract State

The following state variables are available for querying:

${Object.entries(analysis.ledgerState).map(([name, type]) => 
`- **${name}** (${type})`
).join('\n')}

## How It Works

1. **Contract Analysis:** The system reads your compiled contract TypeScript definitions
2. **Function Detection:** All exported circuit functions are automatically detected
3. **Parameter Collection:** The CLI automatically prompts for required parameters
4. **Type Conversion:** Input values are automatically converted to the correct types
5. **Execution:** Functions are called dynamically on your contract instance

## Usage

\`\`\`bash
cd counter-cli
npm run build
npm run start
\`\`\`

The CLI will:
1. Analyze your contract automatically
2. Generate a menu with all available functions
3. Handle parameter input and type conversion
4. Execute functions and display results
5. Show transaction hashes and block confirmations

## Customization

To customize function descriptions or add special handling:
1. Edit \`src/contract-analyzer.ts\`
2. Modify the \`generateFunctionDescription\` method
3. Add special cases in \`requiresSpecialHandling\` method

## Supported Parameter Types

- **number** (converted to BigInt)
- **boolean** (true/false)
- **text** (string values)
- **bytes** (hex strings or UTF-8)

## Error Handling

The CLI includes comprehensive error handling:
- Invalid parameter values
- Contract execution errors
- Network connectivity issues
- Transaction failures

All errors are logged with helpful context and suggestions for resolution.
`;
  }

  /**
   * Map user-friendly types to TypeScript types
   */
  private mapToTypeScriptType(userType: string): string {
    const typeMap: {[key: string]: string} = {
      'number': 'bigint',
      'bytes': 'Uint8Array',
      'void': 'void',
      'boolean': 'boolean',
      'text': 'string'
    };
    
    return typeMap[userType] || 'any';
  }
}

// Run the generator if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new CLIAutoGenerator();
  generator.generate().catch(console.error);
}

export { CLIAutoGenerator };
