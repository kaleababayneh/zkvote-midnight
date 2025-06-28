import { WalletData, ContractData, ChromeMessage, MessageAction } from '../types';
import { Logger } from '../shared/utils';

// Chrome API type declaration
declare const chrome: typeof globalThis.chrome;

class BackgroundService {
  private logger = Logger;

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.logger.log('Background service initialized');
  }

  private setupEventListeners(): void {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener(() => {
      this.logger.log('Midnight Wallet Extension installed');
      this.initializeStorage();
    });

    // Handle messages from popup, content scripts, and websites
    chrome.runtime.onMessage.addListener((request: ChromeMessage, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle external connections (from websites)
    chrome.runtime.onConnectExternal.addListener((port) => {
      this.handleExternalConnection(port);
    });
  }

  private async initializeStorage(): Promise<void> {
    try {
      const defaultWalletData: WalletData = {
        seed: null,
        address: null,
        balance: '0',
        lastUpdated: null
      };

      const defaultContractData: ContractData = {
        address: null,
        counterValue: 0,
        deployed: false,
        lastUpdated: null
      };

      await chrome.storage.local.set({
        walletData: defaultWalletData,
        contractData: defaultContractData,
        lastAction: null
      });

      this.logger.log('Storage initialized with default values');
    } catch (error) {
      this.logger.error('Failed to initialize storage:', error);
    }
  }

  private async handleMessage(request: ChromeMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void): Promise<void> {
    this.logger.log('Background received message:', request);

    try {
      switch (request.action as MessageAction) {
        case 'getWalletData':
          await this.handleGetWalletData(sendResponse);
          break;

        case 'updateWalletData':
          await this.handleUpdateWalletData(request.data, sendResponse);
          break;

        case 'getContractData':
          await this.handleGetContractData(sendResponse);
          break;

        case 'updateContractData':
          await this.handleUpdateContractData(request.data, sendResponse);
          break;

        case 'deployContract':
          await this.handleDeployContract(request.data, sendResponse);
          break;

        case 'incrementCounter':
          await this.handleIncrementCounter(request.data, sendResponse);
          break;

        case 'requestTokens':
          await this.handleRequestTokens(sendResponse);
          break;

        case 'getBalance':
          await this.handleGetBalance(sendResponse);
          break;

        case 'connectToCLI':
          await this.handleConnectToCLI(sendResponse);
          break;

        case 'getProcessStatus':
          await this.handleGetProcessStatus(request.data, sendResponse);
          break;

        default:
          this.logger.warn('Unknown message action:', request.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetWalletData(sendResponse: (response: any) => void): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['walletData']);
      sendResponse(result.walletData);
    } catch (error) {
      this.logger.error('Error getting wallet data:', error);
      sendResponse(null);
    }
  }

  private async handleUpdateWalletData(data: WalletData, sendResponse: (response: any) => void): Promise<void> {
    try {
      await chrome.storage.local.set({ walletData: data });
      sendResponse({ success: true });
    } catch (error) {
      this.logger.error('Error updating wallet data:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleGetContractData(sendResponse: (response: any) => void): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['contractData']);
      sendResponse(result.contractData);
    } catch (error) {
      this.logger.error('Error getting contract data:', error);
      sendResponse(null);
    }
  }

  private async handleUpdateContractData(data: ContractData, sendResponse: (response: any) => void): Promise<void> {
    try {
      await chrome.storage.local.set({ contractData: data });
      sendResponse({ success: true });
    } catch (error) {
      this.logger.error('Error updating contract data:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleDeployContract(data: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      // Forward to bridge server
      const response = await fetch('http://localhost:3001/api/contract/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {})
      });

      const result = await response.json();
      sendResponse(result);
    } catch (error) {
      this.logger.error('Error deploying contract:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Bridge server not available' });
    }
  }

  private async handleIncrementCounter(data: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/contract/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {})
      });

      const result = await response.json();
      sendResponse(result);
    } catch (error) {
      this.logger.error('Error incrementing counter:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Bridge server not available' });
    }
  }

  private async handleRequestTokens(sendResponse: (response: any) => void): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      sendResponse(result);
    } catch (error) {
      this.logger.error('Error requesting tokens:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Bridge server not available' });
    }
  }

  private async handleGetBalance(sendResponse: (response: any) => void): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/wallet/balance');
      const result = await response.json();
      sendResponse(result);
    } catch (error) {
      this.logger.error('Error getting balance:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Bridge server not available' });
    }
  }

  private async handleConnectToCLI(sendResponse: (response: any) => void): Promise<void> {
    try {
      const response = await fetch('http://localhost:3001/api/status');
      const result = await response.json();
      sendResponse(result);
    } catch (error) {
      this.logger.error('Error connecting to CLI:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Bridge server not available' });
    }
  }

  private async handleGetProcessStatus(data: { processId: string }, sendResponse: (response: any) => void): Promise<void> {
    try {
      const response = await fetch(`http://localhost:3001/api/process/${data.processId}/status`);
      const result = await response.json();
      sendResponse(result);
    } catch (error) {
      this.logger.error('Error getting process status:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Bridge server not available' });
    }
  }

  private handleExternalConnection(port: chrome.runtime.Port): void {
    this.logger.log('External connection established:', port.name);

    port.onMessage.addListener((message) => {
      this.logger.log('External message received:', message);
      // Handle messages from external websites
      // Forward to appropriate handlers based on message type
    });

    port.onDisconnect.addListener(() => {
      this.logger.log('External connection disconnected');
    });
  }
}

// Initialize the background service
new BackgroundService();
