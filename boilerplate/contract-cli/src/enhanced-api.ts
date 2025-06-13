// Enhanced API wrapper for Bboard Contract
// Generated on: 2025-06-13T09:20:03.645Z
// Auto-generated from bboard.compact

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
   * Execute post function
   */
  async post(...args: any[]): Promise<any> {
    return await (originalApi as any).post(...args);
  }
  /**
   * Execute take_down function
   */
  async take_down(...args: any[]): Promise<any> {
    return await (originalApi as any).take_down(...args);
  }
  /**
   * Execute public_key function
   */
  async public_key(...args: any[]): Promise<any> {
    return await (originalApi as any).public_key(...args);
  }
}

// Export contract metadata for reference
export const CONTRACT_METADATA = {
  name: 'Bboard Contract',
  fileName: 'bboard.compact',
  generatedAt: '2025-06-13T09:20:03.645Z',
  functions: [
  {
    "name": "post",
    "parameters": [
      {
        "name": "new_message",
        "type": "Opaque<\"string\">"
      }
    ],
    "returnType": "[]",
    "readOnly": false
  },
  {
    "name": "take_down",
    "parameters": [],
    "returnType": "Opaque<\"string\">",
    "readOnly": true
  },
  {
    "name": "public_key",
    "parameters": [
      {
        "name": "sk",
        "type": "Bytes<32>"
      },
      {
        "name": "instance",
        "type": "Bytes<32>"
      }
    ],
    "returnType": "Bytes<32>",
    "readOnly": true
  }
],
  ledgerState: [
  {
    "name": "state",
    "type": "STATE"
  },
  {
    "name": "message",
    "type": "Maybe<Opaque<\"string\">>"
  },
  {
    "name": "instance",
    "type": "Counter"
  },
  {
    "name": "poster",
    "type": "Bytes<32>"
  }
],
  witnesses: [
  {
    "name": "local_secret_key",
    "ledgerType": "typeof Ledger",
    "privateType": "BBoardPrivateState",
    "returns": [
      "// EXERCISE 2: WHAT ARE THE CORRECT TWO VALUES TO RETURN HERE?\n    privateState",
      "// EXERCISE ANSWER\n    privateState.secretKey",
      "// EXERCISE ANSWER"
    ]
  }
]
} as const;
