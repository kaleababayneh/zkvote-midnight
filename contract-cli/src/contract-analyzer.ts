// This file is part of example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0

import fs from 'node:fs';
import path from 'node:path';

export interface ContractFunction {
  name: string;
  parameters: Array<{
    name: string;
    type: string;
  }>;
  returnType: string;
  description?: string;
}

export interface ContractAnalysis {
  contractName: string;
  functions: ContractFunction[];
  ledgerState: {
    [key: string]: string;
  };
}

/**
 * Analyzes the contract to extract function signatures and information
 */
export class ContractAnalyzer {
  private contractPath: string;
  private typesPath: string;

  constructor() {
    // Use relative path to the compiled contract - fix URL decoding
    const currentDir = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
    const contractSourceDir = path.resolve(currentDir, '..', '..', 'contract', 'src');
    const managedDir = path.join(contractSourceDir, 'managed');
    
    // Auto-detect the contract from the actual .compact file in source
    const contractName = this.detectContractFromSource(contractSourceDir);
    this.contractPath = path.join(managedDir, contractName);
    this.typesPath = path.join(this.contractPath, 'contract', 'index.d.cts');
  }

  /**
   * Auto-detect the contract name from the actual .compact file in source directory
   * This ensures we always use the current contract file, not old managed directories
   */
  private detectContractFromSource(contractSourceDir: string): string {
    if (!fs.existsSync(contractSourceDir)) {
      throw new Error(`Contract source directory not found: ${contractSourceDir}`);
    }

    // Look for .compact files in the source directory
    const files = fs.readdirSync(contractSourceDir);
    const compactFiles = files.filter(file => file.endsWith('.compact'));
    
    if (compactFiles.length === 0) {
      throw new Error(`No .compact files found in ${contractSourceDir}`);
    }
    
    if (compactFiles.length > 1) {
      console.log(`⚠️  Found ${compactFiles.length} .compact files: ${compactFiles.join(', ')}`);
      console.log(`📄 Using the first one: ${compactFiles[0]}`);
    }
    
    // Get the contract name from the .compact file (without extension)
    const contractFileName = compactFiles[0];
    const contractName = path.basename(contractFileName, '.compact');
    
    console.log(`🔍 Auto-detected contract from source: ${contractName} (from ${contractFileName})`);
    
    // Verify the managed directory exists
    const managedDir = path.join(contractSourceDir, 'managed');
    const expectedManagedPath = path.join(managedDir, contractName);
    
    if (!fs.existsSync(expectedManagedPath)) {
      console.log(`⚠️  Managed directory not found: ${expectedManagedPath}`);
      console.log(`💡 You may need to run: npm run auto-generate`);
    }
    
    return contractName;
  }

  /**
   * Analyzes the contract and returns available functions
   */
  async analyzeContract(): Promise<ContractAnalysis> {
    try {
      // Read the contract types file
      const typesContent = await fs.promises.readFile(this.typesPath, 'utf-8');
      
      // Parse the contract functions from the types
      const functions = this.parseFunctions(typesContent);
      const ledgerState = this.parseLedgerState(typesContent);
      
      // Extract contract name from the contract path
      const contractBaseName = path.basename(this.contractPath);
      const contractName = `${contractBaseName.charAt(0).toUpperCase() + contractBaseName.slice(1)} Contract`;
      
      return {
        contractName,
        functions,
        ledgerState
      };
    } catch (error) {
      console.error('Error analyzing contract:', error);
      throw new Error(`Failed to analyze contract: ${error}`);
    }
  }

  /**
   * Parse function signatures from TypeScript definitions
   */
  private parseFunctions(content: string): ContractFunction[] {
    const functions: ContractFunction[] = [];
    
    // Extract ImpureCircuits type to get the main contract functions
    const impureCircuitsMatch = content.match(/export type ImpureCircuits<T> = \{([^}]+)\}/s);
    if (impureCircuitsMatch) {
      const functionsBlock = impureCircuitsMatch[1];
      
      // Parse each function signature - updated regex to handle the actual format
      const functionRegex = /(\w+)\(context:\s*__compactRuntime\.CircuitContext<T>(?:,\s*([^)]+))?\):\s*__compactRuntime\.CircuitResults<T,\s*([^>]+)>/g;
      let match;
      
      while ((match = functionRegex.exec(functionsBlock)) !== null) {
        const [, name, paramStr, returnType] = match;
        
        const parameters: Array<{name: string, type: string}> = [];
        
        // Parse parameters if they exist
        if (paramStr && paramStr.trim()) {
          // Handle parameters like "index_0: bigint"
          const params = paramStr.split(',').map(p => p.trim());
          params.forEach((param, index) => {
            const colonIndex = param.indexOf(':');
            if (colonIndex > 0) {
              const paramName = param.substring(0, colonIndex).trim();
              const paramType = param.substring(colonIndex + 1).trim();
              
              // Clean up parameter name (remove _0 suffix)
              const cleanName = paramName.replace(/_\d+$/, '');
              
              parameters.push({
                name: cleanName || `param_${index}`,
                type: this.mapTypeScriptTypeToUserFriendly(paramType)
              });
            }
          });
        }
        
        functions.push({
          name,
          parameters,
          returnType: this.mapTypeScriptTypeToUserFriendly(returnType.trim()),
          description: this.generateFunctionDescription(name, parameters)
        });
      }
    }
    
    return functions;
  }

  /**
   * Parse ledger state structure from TypeScript definitions
   */
  private parseLedgerState(content: string): {[key: string]: string} {
    const ledgerState: {[key: string]: string} = {};
    
    const ledgerTypeMatch = content.match(/export type Ledger = \{([^}]+)\}/s);
    if (ledgerTypeMatch) {
      const ledgerBlock = ledgerTypeMatch[1];
      
      // Parse each property - handle both readonly and regular properties
      const lines = ledgerBlock.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      for (const line of lines) {
        // Match patterns like "readonly round: bigint;" or "items: { ... }"
        const simpleMatch = line.match(/(?:readonly\s+)?(\w+):\s*(bigint|boolean|string|number);?/);
        if (simpleMatch) {
          const [, name, type] = simpleMatch;
          ledgerState[name] = this.mapTypeScriptTypeToUserFriendly(type);
        } else if (line.includes(':') && line.includes('{')) {
          // Handle complex types like "items: { ... }"
          const complexMatch = line.match(/(?:readonly\s+)?(\w+):\s*\{/);
          if (complexMatch) {
            const [, name] = complexMatch;
            ledgerState[name] = 'Set<data>';
          }
        }
      }
    }
    
    return ledgerState;
  }

  /**
   * Map TypeScript types to user-friendly names
   */
  private mapTypeScriptTypeToUserFriendly(type: string): string {
    const typeMap: {[key: string]: string} = {
      'bigint': 'number',
      'Uint8Array': 'bytes',
      '[]': 'void',
      'boolean': 'boolean',
      'string': 'text'
    };
    
    return typeMap[type] || type;
  }

  /**
   * Generate human-readable descriptions for functions
   */
  private generateFunctionDescription(name: string, parameters: Array<{name: string, type: string}>): string {
    const descriptions: {[key: string]: string} = {
      'increment': 'Increments the counter by 1',
      'incrementosas': 'Increments the counter/round by 1',
      'get_round': 'Get the current round/counter value',
      'vote_for': 'Vote for an option (0 for A, 1 for B)',
      'get_vote_count': 'Get the vote count for an option (0 for A, 1 for B)',
      'public_key_vote': 'Generate a public key for voting'
    };
    
    // Handle variations of increment functions
    if (name.startsWith('increment')) {
      return 'Increments the counter/round by 1';
    }
    
    return descriptions[name] || `Execute ${name} function with ${parameters.length} parameter(s)`;
  }

  /**
   * Check if a function is a read-only function (doesn't modify state)
   */
  isReadOnlyFunction(functionName: string): boolean {
    const readOnlyFunctions = ['get_round', 'get_vote_count', 'public_key_vote'];
    return readOnlyFunctions.includes(functionName);
  }

  /**
   * Check if a function requires special parameter handling
   */
  requiresSpecialHandling(paramName: string): boolean {
    const specialParams = ['index'];
    return specialParams.includes(paramName);
  }
}
