import { WalletData, ContractData, APIResponse, ProcessStatus, WalletGenerateResponse, DeployResponse, IncrementResponse, BalanceResponse, CounterResponse } from '../types';
import { Logger, APIClient, formatAddress, formatBalance } from '../shared/utils';

interface UIElements {
  balanceAmount: HTMLElement;
  walletAddress: HTMLElement;
  contractAddress: HTMLElement;
  counterValue: HTMLElement;
  connectionStatus: HTMLElement;
  contractStatus: HTMLElement;
  statusLog: HTMLElement;
  loadingModal: HTMLElement;
  joinModal: HTMLElement;
}

class MidnightWalletPopup {
  private walletData: WalletData | null = null;
  private contractData: ContractData | null = null;
  private cliConnected: boolean = false;
  private apiClient: APIClient;
  private logger = Logger;
  private elements: UIElements;
  private currentProcessId: string | null = null;

  constructor() {
    this.apiClient = new APIClient();
    this.elements = this.getUIElements();
    this.init();
  }

  private getUIElements(): UIElements {
    return {
      balanceAmount: document.getElementById('balanceAmount')!,
      walletAddress: document.getElementById('walletAddress')!,
      contractAddress: document.getElementById('contractAddress')!,
      counterValue: document.getElementById('counterValue')!,
      connectionStatus: document.getElementById('connectionStatus')!,
      contractStatus: document.getElementById('contractStatus')!,
      statusLog: document.getElementById('statusLog')!,
      loadingModal: document.getElementById('loadingModal')!,
      joinModal: document.getElementById('joinModal')!
    };
  }

  private async init(): Promise<void> {
    await this.loadWalletData();
    this.setupEventListeners();
    this.updateUI();
    await this.checkCLIConnection();
    this.logMessage('Wallet initialized');
  }

  private async loadWalletData(): Promise<void> {
    try {
      // Get wallet data from background script
      const walletData = await this.sendMessageToBackground('getWalletData');
      const contractData = await this.sendMessageToBackground('getContractData');
      
      this.walletData = walletData;
      this.contractData = contractData;

      // If no wallet data exists, try to load from bridge server
      if (!this.walletData || !this.walletData.address) {
        await this.loadWalletFromBridge();
      }
    } catch (error) {
      this.logger.error('Error loading wallet data:', error);
      this.logMessage('Error loading wallet data', 'error');
    }
  }

  private async loadWalletFromBridge(): Promise<void> {
    try {
      const response = await this.apiClient.get<WalletData>('/wallet/status');
      if (response.success && response.data) {
        this.walletData = response.data as WalletData;
        await this.saveWalletData();
      }
    } catch (error) {
      this.logger.error('Error loading wallet from bridge:', error);
    }
  }

  private async saveWalletData(): Promise<void> {
    try {
      await this.sendMessageToBackground('updateWalletData', this.walletData);
      await this.sendMessageToBackground('updateContractData', this.contractData);
    } catch (error) {
      this.logger.error('Error saving wallet data:', error);
    }
  }

  private setupEventListeners(): void {
    // Wallet actions
    document.getElementById('generateWalletBtn')?.addEventListener('click', () => {
      this.generateWallet();
    });

    document.getElementById('requestTokensBtn')?.addEventListener('click', () => {
      this.requestTokens();
    });

    document.getElementById('refreshBalanceBtn')?.addEventListener('click', () => {
      this.refreshBalance();
    });

    document.getElementById('copyAddressBtn')?.addEventListener('click', () => {
      this.copyAddress();
    });

    // Contract actions
    document.getElementById('deployContractBtn')?.addEventListener('click', () => {
      this.deployContract();
    });

    document.getElementById('joinContractBtn')?.addEventListener('click', () => {
      this.showJoinModal();
    });

    document.getElementById('incrementBtn')?.addEventListener('click', () => {
      this.incrementCounter();
    });

    document.getElementById('getCounterBtn')?.addEventListener('click', () => {
      this.getCounterValue();
    });

    // Modal actions
    document.getElementById('closeJoinModal')?.addEventListener('click', () => {
      this.hideJoinModal();
    });

    document.getElementById('cancelJoinBtn')?.addEventListener('click', () => {
      this.hideJoinModal();
    });

    document.getElementById('confirmJoinBtn')?.addEventListener('click', () => {
      this.joinContract();
    });

    document.getElementById('clearStatusBtn')?.addEventListener('click', () => {
      this.clearStatusLog();
    });
  }

  private updateUI(): void {
    this.updateWalletInfo();
    this.updateContractInfo();
    this.updateConnectionStatus();
    this.updateButtonStates();
  }

  private updateWalletInfo(): void {
    if (this.walletData?.address) {
      this.elements.walletAddress.textContent = formatAddress(this.walletData.address);
      this.elements.balanceAmount.textContent = formatBalance(this.walletData.balance);
    } else {
      this.elements.walletAddress.textContent = 'Not Connected';
      this.elements.balanceAmount.textContent = '0.000';
    }
  }

  private updateContractInfo(): void {
    if (this.contractData?.address) {
      this.elements.contractAddress.textContent = formatAddress(this.contractData.address);
      this.elements.counterValue.textContent = this.contractData.counterValue.toString();
      this.updateContractStatus('online', 'Contract Deployed');
    } else {
      this.elements.contractAddress.textContent = 'Not Deployed';
      this.elements.counterValue.textContent = '0';
      this.updateContractStatus('offline', 'Not Deployed');
    }
  }

  private updateConnectionStatus(): void {
    const statusElement = this.elements.connectionStatus;
    const statusDot = statusElement.querySelector('.status-dot')!;
    const statusText = statusElement.querySelector('span:last-child')!;

    if (this.cliConnected) {
      statusDot.className = 'status-dot online';
      statusText.textContent = 'Connected';
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Disconnected';
    }
  }

  private updateContractStatus(status: 'online' | 'offline', text: string): void {
    const statusElement = this.elements.contractStatus;
    const statusDot = statusElement.querySelector('.status-dot')!;
    const statusText = statusElement.querySelector('span:last-child')!;

    statusDot.className = `status-dot ${status}`;
    statusText.textContent = text;
  }

  private updateButtonStates(): void {
    const hasWallet = Boolean(this.walletData?.address);
    const hasContract = Boolean(this.contractData?.address);

    // Enable/disable buttons based on wallet and contract state
    this.setButtonEnabled('requestTokensBtn', hasWallet);
    this.setButtonEnabled('refreshBalanceBtn', hasWallet);
    this.setButtonEnabled('deployContractBtn', hasWallet);
    this.setButtonEnabled('joinContractBtn', hasWallet);
    this.setButtonEnabled('incrementBtn', hasContract);
    this.setButtonEnabled('getCounterBtn', hasContract);
  }

  private setButtonEnabled(buttonId: string, enabled: boolean): void {
    const button = document.getElementById(buttonId) as HTMLButtonElement;
    if (button) {
      button.disabled = !enabled;
    }
  }

  private async checkCLIConnection(): Promise<void> {
    try {
      const response = await this.apiClient.get('/status');
      this.cliConnected = response.success;
      this.updateConnectionStatus();
      
      if (response.success) {
        this.logMessage('Connected to bridge server');
      } else {
        this.logMessage('Bridge server not available', 'warning');
      }
    } catch (error) {
      this.cliConnected = false;
      this.updateConnectionStatus();
      this.logMessage('Bridge server not available', 'error');
    }
  }

  private async generateWallet(): Promise<void> {
    try {
      this.showLoading('Generating Wallet', 'Creating new wallet...');
      
      const response = await this.apiClient.post<WalletGenerateResponse>('/wallet/generate');
      
      if (response.success && response.data) {
        const walletData = response.data as WalletGenerateResponse;
        this.walletData = {
          seed: walletData.seed,
          address: walletData.address,
          balance: walletData.balance,
          lastUpdated: Date.now()
        };
        await this.saveWalletData();
        this.updateUI();
        this.logMessage('Wallet generated successfully', 'success');
      } else {
        throw new Error(response.error || 'Failed to generate wallet');
      }
    } catch (error) {
      this.logger.error('Error generating wallet:', error);
      this.logMessage('Failed to generate wallet', 'error');
    } finally {
      this.hideLoading();
    }
  }

  private async requestTokens(): Promise<void> {
    try {
      this.showLoading('Requesting Tokens', 'Requesting tokens from faucet...');
      
      const response = await this.apiClient.post('/faucet');
      
      if (response.success) {
        this.logMessage('Tokens requested successfully', 'success');
        // Refresh balance after token request
        setTimeout(() => this.refreshBalance(), 2000);
      } else {
        throw new Error(response.error || 'Failed to request tokens');
      }
    } catch (error) {
      this.logger.error('Error requesting tokens:', error);
      this.logMessage('Failed to request tokens', 'error');
    } finally {
      this.hideLoading();
    }
  }

  private async refreshBalance(): Promise<void> {
    try {
      this.showLoading('Refreshing Balance', 'Getting latest balance...');
      
      const response = await this.apiClient.get<BalanceResponse>('/wallet/balance');
      
      if (response.success && response.data) {
        const balanceData = response.data as BalanceResponse;
        if (this.walletData) {
          this.walletData.balance = balanceData.balance;
          this.walletData.lastUpdated = Date.now();
          await this.saveWalletData();
          this.updateWalletInfo();
        }
        this.logMessage('Balance updated', 'success');
      } else {
        throw new Error(response.error || 'Failed to refresh balance');
      }
    } catch (error) {
      this.logger.error('Error refreshing balance:', error);
      this.logMessage('Failed to refresh balance', 'error');
    } finally {
      this.hideLoading();
    }
  }

  private async copyAddress(): Promise<void> {
    if (this.walletData?.address) {
      try {
        await navigator.clipboard.writeText(this.walletData.address);
        this.logMessage('Address copied to clipboard', 'success');
      } catch (error) {
        this.logger.error('Error copying address:', error);
        this.logMessage('Failed to copy address', 'error');
      }
    }
  }

  private async deployContract(): Promise<void> {
    try {
      this.showLoading('Deploying Contract', 'Deploying smart contract...');
      
      const response = await this.apiClient.post<DeployResponse>('/contract/deploy');
      
      if (response.success && response.data) {
        const deployData = response.data as DeployResponse;
        this.currentProcessId = deployData.processId;
        await this.pollProcessStatus(deployData.processId, (status) => {
          if (status.contractAddress) {
            this.contractData = {
              address: status.contractAddress,
              counterValue: 0,
              deployed: true,
              lastUpdated: Date.now()
            };
            this.saveWalletData();
            this.updateUI();
          }
        });
      } else {
        throw new Error(response.error || 'Failed to start deployment');
      }
    } catch (error) {
      this.logger.error('Error deploying contract:', error);
      this.logMessage('Failed to deploy contract', 'error');
      this.hideLoading();
    }
  }

  private async incrementCounter(): Promise<void> {
    try {
      this.showLoading('Incrementing Counter', 'Executing increment transaction...');
      
      const response = await this.apiClient.post<IncrementResponse>('/contract/increment');
      
      if (response.success && response.data) {
        const incrementData = response.data as IncrementResponse;
        this.currentProcessId = incrementData.processId;
        await this.pollProcessStatus(incrementData.processId, (status) => {
          if (this.contractData) {
            this.contractData.counterValue++;
            this.contractData.lastUpdated = Date.now();
            this.saveWalletData();
            this.updateUI();
          }
        });
      } else {
        throw new Error(response.error || 'Failed to start increment');
      }
    } catch (error) {
      this.logger.error('Error incrementing counter:', error);
      this.logMessage('Failed to increment counter', 'error');
      this.hideLoading();
    }
  }

  private async getCounterValue(): Promise<void> {
    try {
      this.showLoading('Getting Counter', 'Fetching current counter value...');
      
      const response = await this.apiClient.get<CounterResponse>('/contract/counter');
      
      if (response.success && response.data) {
        const counterData = response.data as CounterResponse;
        if (this.contractData) {
          this.contractData.counterValue = counterData.value;
          this.contractData.lastUpdated = Date.now();
          await this.saveWalletData();
          this.updateUI();
        }
        this.logMessage(`Counter value: ${counterData.value}`, 'success');
      } else {
        throw new Error(response.error || 'Failed to get counter value');
      }
    } catch (error) {
      this.logger.error('Error getting counter value:', error);
      this.logMessage('Failed to get counter value', 'error');
    } finally {
      this.hideLoading();
    }
  }

  private showJoinModal(): void {
    this.elements.joinModal.style.display = 'flex';
  }

  private hideJoinModal(): void {
    this.elements.joinModal.style.display = 'none';
    const input = document.getElementById('contractAddressInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  private async joinContract(): Promise<void> {
    const input = document.getElementById('contractAddressInput') as HTMLInputElement;
    const contractAddress = input.value.trim();

    if (!contractAddress) {
      this.logMessage('Please enter a contract address', 'error');
      return;
    }

    try {
      this.hideJoinModal();
      this.showLoading('Joining Contract', 'Connecting to existing contract...');
      
      const response = await this.apiClient.post('/contract/join', { contractAddress });
      
      if (response.success) {
        this.contractData = {
          address: contractAddress,
          counterValue: 0,
          deployed: true,
          lastUpdated: Date.now()
        };
        await this.saveWalletData();
        this.updateUI();
        this.logMessage('Successfully joined contract', 'success');
      } else {
        throw new Error(response.error || 'Failed to join contract');
      }
    } catch (error) {
      this.logger.error('Error joining contract:', error);
      this.logMessage('Failed to join contract', 'error');
    } finally {
      this.hideLoading();
    }
  }

  private async pollProcessStatus(processId: string, onComplete?: (status: ProcessStatus) => void): Promise<void> {
    const maxAttempts = 180; // 3 minutes
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const response = await this.apiClient.get(`/process/${processId}/status`);
        
        if (response.success && response.data) {
          const status = response.data as ProcessStatus;
          
          // Update loading modal with progress
          this.updateLoadingProgress(status.message, status.progress);
          
          if (status.status === 'success' || status.status === 'completed') {
            this.hideLoading();
            this.logMessage('Operation completed successfully', 'success');
            if (onComplete) onComplete(status);
            return;
          } else if (status.status === 'error') {
            this.hideLoading();
            this.logMessage(status.message || 'Operation failed', 'error');
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          this.hideLoading();
          this.logMessage('Operation timed out', 'warning');
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          this.hideLoading();
          this.logMessage('Lost connection to bridge server', 'error');
        }
      }
    };

    setTimeout(poll, 1000);
  }

  private showLoading(title: string, message: string): void {
    const modal = this.elements.loadingModal;
    const titleElement = document.getElementById('modalTitle');
    const messageElement = document.getElementById('modalMessage');

    if (titleElement) titleElement.textContent = title;
    if (messageElement) messageElement.textContent = message;
    
    modal.style.display = 'flex';
  }

  private hideLoading(): void {
    this.elements.loadingModal.style.display = 'none';
  }

  private updateLoadingProgress(message: string, progress: number): void {
    const messageElement = document.getElementById('modalMessage');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (messageElement) messageElement.textContent = message;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}%`;
  }

  private logMessage(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `status-item ${type}`;
    logEntry.innerHTML = `
      <span class="timestamp">${timestamp}</span>
      <span class="message">${message}</span>
    `;

    this.elements.statusLog.appendChild(logEntry);
    this.elements.statusLog.scrollTop = this.elements.statusLog.scrollHeight;

    // Keep only last 50 entries
    while (this.elements.statusLog.children.length > 50) {
      this.elements.statusLog.removeChild(this.elements.statusLog.firstChild!);
    }
  }

  private clearStatusLog(): void {
    this.elements.statusLog.innerHTML = '';
    this.logMessage('Status log cleared');
  }

  private async sendMessageToBackground(action: string, data?: any): Promise<any> {
    return new Promise((resolve) => {
      if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome.runtime) {
        (window as any).chrome.runtime.sendMessage({ action, data }, (response: any) => {
          resolve(response);
        });
      } else {
        // Fallback if chrome API is not available
        resolve(null);
      }
    });
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MidnightWalletPopup();
});
