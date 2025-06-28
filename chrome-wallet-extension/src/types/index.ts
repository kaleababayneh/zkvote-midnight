// Chrome Extension Types
export interface WalletData {
  seed: string | null;
  address: string | null;
  balance: string;
  lastUpdated: number | null;
}

export interface ContractData {
  address: string | null;
  counterValue: number;
  deployed: boolean;
  lastUpdated: number | null;
}

export interface ProcessStatus {
  status: 'pending' | 'running' | 'success' | 'completed' | 'error';
  message: string;
  progress: number;
  txId?: string;
  error?: string;
  contractAddress?: string;
  timestamp: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Specific API Response Types
export interface WalletGenerateResponse {
  processId: string;
  seed: string;
  address: string;
  balance: string;
}

export interface DeployResponse {
  processId: string;
  message: string;
}

export interface IncrementResponse {
  processId: string;
  message: string;
}

export interface BalanceResponse {
  balance: string;
  address: string;
}

export interface CounterResponse {
  value: number;
  contractAddress: string;
}

// Bridge Server Types
export interface CLICommand {
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
}

export interface ProcessInfo {
  id: string;
  pid?: number;
  command: string;
  status: ProcessStatus;
  startTime: number;
  endTime?: number;
}

// Chrome Extension Message Types
export interface ChromeMessage {
  action: string;
  data?: any;
  tabId?: number;
}

export type MessageAction = 
  | 'getWalletData'
  | 'updateWalletData'
  | 'getContractData'
  | 'updateContractData'
  | 'deployContract'
  | 'incrementCounter'
  | 'requestTokens'
  | 'getBalance'
  | 'connectToCLI'
  | 'getProcessStatus';

// API Endpoints Types
export interface DeployRequest {
  autoExit?: boolean;
}

export interface IncrementRequest {
  contractAddress?: string;
}

export interface FaucetRequest {
  amount?: number;
}

export interface JoinContractRequest {
  contractAddress: string;
}
