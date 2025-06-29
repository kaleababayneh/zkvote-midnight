// Enhanced API wrapper for Zkvote Contract
// Generated on: 2025-06-29T18:59:12.301Z
// Auto-generated from zkvote.compact

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
  witnesses: Array<{
    name: string;
    ledgerType: string;
    privateType: string;
    returns: string[];
  }>;
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
          description: func.description || `Execute ${func.name} function`
        })),
        ledgerState: Object.entries(analysis.ledgerState).map(([name, type]) => ({ name, type })),
        witnesses: analysis.witnesses.map(witness => ({
          name: witness.name,
          ledgerType: witness.ledgerType,
          privateType: witness.privateType,
          returns: witness.returns
        }))
      };
      
      return this.contractInfo;
    } catch (error) {
      throw new Error(`Failed to initialize enhanced API: ${error instanceof Error ? error.message : String(error)}`);
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

  // Dynamic function mapping based on contract analysis
  /**
   * Execute increment function
   */
  async increment(...args: any[]): Promise<any> {
    return await (originalApi as any).increment(...args);
  }
  /**
   * Execute vote_for function
   */
  async vote_for(...args: any[]): Promise<any> {
    return await (originalApi as any).vote_for(...args);
  }
  /**
   * Execute get_vote_count function
   */
  async get_vote_count(...args: any[]): Promise<any> {
    return await (originalApi as any).get_vote_count(...args);
  }
}

// Export contract metadata for reference
export const CONTRACT_METADATA = {
  name: 'Zkvote Contract',
  fileName: 'zkvote.compact',
  generatedAt: '2025-06-29T18:59:12.301Z',
  functions: [
  {
    "name": "increment",
    "parameters": [],
    "returnType": "[]",
    "readOnly": false
  },
  {
    "name": "vote_for",
    "parameters": [
      {
        "name": "secret_key",
        "type": "Bytes<5>"
      },
      {
        "name": "instance",
        "type": "Bytes<5>"
      },
      {
        "name": "index",
        "type": "Uint<8>"
      }
    ],
    "returnType": "[]",
    "readOnly": false
  },
  {
    "name": "get_vote_count",
    "parameters": [
      {
        "name": "index",
        "type": "Uint<8>"
      }
    ],
    "returnType": "Uint<64>",
    "readOnly": true
  }
],
  ledgerState: [
  {
    "name": "numberOfVoters",
    "type": "Counter"
  },
  {
    "name": "choices",
    "type": "Map<Uint<8>, Bytes<3>>"
  },
  {
    "name": "voteCounts",
    "type": "Map<Uint<8>, Counter>"
  },
  {
    "name": "items",
    "type": "Set<Bytes<32>>"
  }
],
  witnesses: []
} as const;
