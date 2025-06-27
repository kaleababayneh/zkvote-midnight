import './style.css'

// Midnight DApp Frontend with Vite and Real API Integration
class MidnightDApp {
  constructor() {
    this.isWalletConnected = false;
    this.walletData = null;
    this.isAPIRunning = false;
    this.apiBaseUrl = 'http://localhost:3001/api';
    
    this.init();
  }

  async init() {
    this.log('Initializing Midnight DApp...');
    this.setupEventListeners();
    await this.checkAPIStatus();
    await this.refreshWalletStatus();
  }

  setupEventListeners() {
    // Connect wallet button
    document.getElementById('connectBtn').addEventListener('click', () => {
      this.connectWallet();
    });

    // Action buttons
    document.getElementById('tokensBtn').addEventListener('click', () => {
      this.requestTokens();
    });
    
    document.getElementById('deployBtn').addEventListener('click', () => {
      this.deployContract();
    });
    
    document.getElementById('joinBtn').addEventListener('click', () => {
      this.joinContract();
    });
    
    document.getElementById('incrementBtn').addEventListener('click', () => {
      this.incrementCounter();
    });
    
    document.getElementById('getBtn').addEventListener('click', () => {
      this.getContractState();
    });

    // Tab switching (global functions still needed for onclick in HTML)
    window.switchTab = (tabName) => {
      this.switchTab(tabName);
    };
  }

  async checkAPIStatus() {
    try {
      console.log('Checking API status at:', this.apiBaseUrl);
      const response = await fetch(`${this.apiBaseUrl}/status`);
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        
        this.isAPIRunning = true;
        this.updateWarningMessage('✅ Midnight Wallet API Connected');
        this.log('Midnight wallet bridge server connected successfully', 'success');
      } else {
        throw new Error(`API responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('API check failed:', error);
      this.isAPIRunning = false;
      this.updateWarningMessage('⚠️ Wallet API Offline: Start Chrome extension bridge server');
      this.log(`Midnight wallet API server not available: ${error.message}`, 'error');
    }
  }

  updateWarningMessage(message) {
    const warningElement = document.getElementById('extensionWarning');
    warningElement.textContent = message;
    warningElement.className = `extension-warning ${this.isAPIRunning ? 'success' : ''}`;
  }

  async connectWallet() {
    if (!this.isAPIRunning) {
      this.log('Midnight wallet bridge server not available. Please start it first.', 'error');
      this.showToast('❌ Start bridge server first', 'error');
      return;
    }

    // Show loading state with animation
    this.setButtonLoading('connectBtn', true);
    
    // Show connecting modal
    const connectingModal = this.showModal({
      type: 'info',
      icon: '🔗',
      title: 'Connecting Wallet',
      message: 'Establishing connection to Midnight wallet...',
      details: '<div class="spinner"></div> Please wait while we connect to your wallet.',
      status: 'pending'
    });
    
    this.log('Connecting to Midnight wallet...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/wallet`);
      console.log('Wallet connection response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Wallet data received:', data);
        
        // Close connecting modal
        this.closeModal(connectingModal);
        
        if (data.address) {
          this.isWalletConnected = true;
          this.walletData = {
            address: data.address,
            balance: data.balance || '0'
          };
          this.updateWalletDisplay();
          this.updateConnectionStatus(true);
          this.enableActionButtons();
          this.log('Midnight wallet connected successfully!', 'success');
          this.showToast('✅ Midnight Wallet Connected!', 'success');
        } else {
          throw new Error('No wallet data received from bridge server');
        }
      } else {
        throw new Error(`Bridge server responded with status ${response.status}`);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      this.log(`Midnight wallet connection failed: ${error.message}`, 'error');
      this.showToast('❌ Wallet Connection Failed', 'error');
    }
    
    this.setButtonLoading('connectBtn', false);
  }

  async refreshWalletStatus() {
    if (!this.isAPIRunning || !this.isWalletConnected) return;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/wallet`);
      if (response.ok) {
        const data = await response.json();
        if (data.address) {
          this.walletData = {
            address: data.address,
            balance: data.balance || '0'
          };
          this.updateWalletDisplay();
          this.log('Wallet balance refreshed from Midnight testnet', 'success');
        }
      }
    } catch (error) {
      this.log(`Failed to refresh wallet status: ${error.message}`, 'error');
    }
  }

  updateWalletDisplay() {
    if (this.walletData) {
      // Update address
      if (this.walletData.address) {
        document.getElementById('walletAddress').textContent = 
          `${this.walletData.address.substring(0, 20)}...${this.walletData.address.slice(-20)}`;
      }
      
      // Update balance
      if (this.walletData.balance !== undefined) {
        const balance = Number(this.walletData.balance) / 1_000_000;
        document.getElementById('walletBalance').textContent = 
          `${balance.toFixed(2)} tUsdt`;
      }
    }
  }

  updateConnectionStatus(connected) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const connectBtn = document.getElementById('connectBtn');
    
    if (connected) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'Wallet Connected';
      connectBtn.textContent = '🔗 Connected';
      connectBtn.disabled = true;
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = 'Wallet Not Connected';
      connectBtn.textContent = '🔗 Connect Wallet';
      connectBtn.disabled = false;
    }
  }

  enableActionButtons() {
    const buttons = ['tokensBtn', 'deployBtn', 'incrementBtn', 'getBtn'];
    buttons.forEach(btnId => {
      document.getElementById(btnId).disabled = false;
    });
  }

  async requestTokens() {
    if (!this.isWalletConnected) {
      this.showToast('❌ Please connect Midnight wallet first', 'error');
      return;
    }

    this.setButtonLoading('tokensBtn', true);
    this.log('Requesting tUSDT tokens from Midnight testnet faucet...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.log('tUSDT tokens requested from testnet faucet successfully!', 'success');
          this.showToast('✅ Testnet Tokens Requested!', 'success');
          // Refresh balance after delay to show updated balance
          setTimeout(() => this.refreshWalletStatus(), 10000);
        } else {
          throw new Error(data.error || 'Token request failed');
        }
      } else {
        throw new Error('Faucet request failed');
      }
    } catch (error) {
      this.log(`Testnet token request failed: ${error.message}`, 'error');
      this.showToast('❌ Token Request Failed', 'error');
    }

    this.setButtonLoading('tokensBtn', false);
  }

  async deployContract() {
    if (!this.isWalletConnected) {
      this.showToast('❌ Please connect Midnight wallet first', 'error');
      return;
    }

    // Show confirmation dialog
    const confirmed = await this.showConfirmation(
      'deploy a new counter contract',
      'This will deploy a new smart contract to the Midnight testnet. Gas fees may apply.'
    );
    
    if (!confirmed) {
      this.log('Contract deployment cancelled by user', 'info');
      return;
    }

    this.setButtonLoading('deployBtn', true);
    this.log('Deploying counter contract to Midnight testnet...');
    
    // Show deployment progress modal
    const deployModal = this.showModal({
      type: 'info',
      icon: '🚀',
      title: 'Deploying Contract',
      message: 'Your contract is being deployed to Midnight testnet...',
      details: '<div class="spinner"></div> This may take up to 3 minutes. Please wait...',
      status: 'pending'
    });

    try {
      const response = await fetch(`${this.apiBaseUrl}/contract/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractType: 'counter' })
      });
      
      // Close deployment modal
      this.closeModal(deployModal);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Deploy response:', data);
        
        if (data.success && data.contractAddress) {
          // Update contract info in UI
          this.updateContractInfo(data.contractAddress, 'deployed');
          
          // Show success modal with transaction details
          this.showModal({
            type: 'success',
            icon: '✅',
            title: 'Contract Deployed Successfully!',
            message: 'Your counter contract has been deployed to Midnight testnet.',
            details: `Contract Address: ${data.contractAddress}`,
            status: 'success',
            showClose: true,
            closeText: 'Continue'
          });
          
          this.log(`Counter contract deployed successfully! Address: ${data.contractAddress}`, 'success');
          this.showToast('✅ Contract Deployed!', 'success');
        } else {
          throw new Error(data.error || data.message || 'Deployment returned no address');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      // Close deployment modal if still open
      this.closeModal(deployModal);
      
      // Show error modal
      this.showModal({
        type: 'error',
        icon: '❌',
        title: 'Deployment Failed',
        message: 'Contract deployment failed. Please try again.',
        details: `Error: ${error.message}`,
        status: 'error',
        showClose: true
      });
      
      console.error('Deploy error:', error);
      this.log(`Contract deployment failed: ${error.message}`, 'error');
      this.showToast('❌ Deployment Failed', 'error');
    }

    this.setButtonLoading('deployBtn', false);
  }

  async joinContract() {
    if (!this.isWalletConnected) {
      this.showToast('❌ Please connect Midnight wallet first', 'error');
      return;
    }

    // Show input modal for contract address
    const contractAddress = await this.promptForContractAddress();
    if (!contractAddress) {
      this.log('Contract join cancelled by user', 'info');
      return;
    }

    this.setButtonLoading('joinBtn', true);
    this.log(`Joining contract: ${contractAddress}`);
    
    // Show joining progress modal
    const joinModal = this.showModal({
      type: 'info',
      icon: '🔗',
      title: 'Joining Contract',
      message: 'Connecting to existing contract...',
      details: `<div class="spinner"></div> Contract: ${contractAddress}`,
      status: 'pending'
    });

    try {
      const response = await fetch(`${this.apiBaseUrl}/contract/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress })
      });
      
      // Close joining modal
      this.closeModal(joinModal);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Join response:', data);
        
        if (data.success) {
          // Update contract info in UI
          this.updateContractInfo(contractAddress, 'joined');
          
          // Show success modal
          this.showModal({
            type: 'success',
            icon: '✅',
            title: 'Contract Joined Successfully!',
            message: 'You have successfully connected to the existing contract.',
            details: `Contract Address: ${contractAddress}`,
            status: 'success',
            showClose: true,
            closeText: 'Continue'
          });
          
          this.log(`Successfully joined contract: ${contractAddress}`, 'success');
          this.showToast('✅ Contract Joined!', 'success');
        } else {
          throw new Error(data.error || data.message || 'Join failed');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      // Close joining modal if still open
      this.closeModal(joinModal);
      
      // Show error modal
      this.showModal({
        type: 'error',
        icon: '❌',
        title: 'Join Failed',
        message: 'Failed to join contract. Please check the address and try again.',
        details: `Error: ${error.message}`,
        status: 'error',
        showClose: true
      });
      
      console.error('Join error:', error);
      this.log(`Contract join failed: ${error.message}`, 'error');
      this.showToast('❌ Join Failed', 'error');
    }

    this.setButtonLoading('joinBtn', false);
  }
  
  promptForContractAddress() {
    return new Promise((resolve) => {
      const modalId = this.showModal({
        type: 'info',
        icon: '🔗',
        title: 'Join Existing Contract',
        message: `
          <p>Enter the contract address you want to join:</p>
          <input type="text" id="contractAddressInput" placeholder="Contract address (64 hex characters)" 
                 style="width: 100%; padding: 8px; margin: 8px 0; border: 1px solid #ccc; border-radius: 4px; font-family: monospace;">
          <small style="color: #666;">Example: 0200974c4e2ef3ed5c837d61631c732b944c23abac957406c5eae018e4e8b8b331c3</small>
        `,
        showCancel: true,
        showConfirm: true,
        confirmText: 'Join Contract',
        onConfirm: () => {
          const input = document.getElementById('contractAddressInput');
          const address = input?.value?.trim();
          if (address && /^[0-9a-fA-F]{64}$/.test(address)) {
            resolve(address);
          } else {
            this.showToast('❌ Invalid contract address format', 'error');
            resolve(null);
          }
        }
      });
      
      // Auto-resolve if no user interaction after 60 seconds
      setTimeout(() => resolve(null), 60000);
    });
  }

  async incrementCounter() {
    if (!this.isWalletConnected) {
      this.showToast('❌ Please connect Midnight wallet first', 'error');
      return;
    }

    // Show confirmation dialog
    const confirmed = await this.showConfirmation(
      'increment the counter',
      'This will execute a transaction on the Midnight network to increment the counter by 1.'
    );
    
    if (!confirmed) {
      this.log('Counter increment cancelled by user', 'info');
      return;
    }

    this.setButtonLoading('incrementBtn', true);
    this.log('Incrementing counter on Midnight testnet...');
    
    // Show transaction processing modal
    const txModal = this.showModal({
      type: 'info',
      icon: '⏳',
      title: 'Processing Transaction',
      message: 'Your increment transaction is being processed...',
      details: '<div class="spinner"></div> Please wait while the transaction is confirmed on the network.',
      status: 'pending'
    });

    try {
      const response = await fetch(`${this.apiBaseUrl}/contract/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Close processing modal
      this.closeModal(txModal);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Increment response:', data);
        
        if (data.success && data.txId) {
          // Show success modal with transaction details
          this.showModal({
            type: 'success',
            icon: '✅',
            title: 'Transaction Successful!',
            message: 'Counter has been incremented successfully.',
            details: `Transaction ID: ${data.txId}${data.blockHeight ? `<br>Block Height: ${data.blockHeight}` : ''}`,
            status: 'success',
            showClose: true,
            closeText: 'Continue'
          });
          
          this.log(`Counter incremented successfully! TX: ${data.txId}${data.blockHeight ? `, Block: ${data.blockHeight}` : ''}`, 'success');
          this.showToast('✅ Counter Incremented!', 'success');
        } else {
          this.log(`Counter increment failed: ${data.error || data.message}`, 'error');
          this.showToast('❌ Increment Failed', 'error');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Increment error:', error);
      this.log(`Counter increment failed: ${error.message}`, 'error');
      this.showToast('❌ Increment Failed', 'error');
    }

    this.setButtonLoading('incrementBtn', false);
  }

  async getContractState() {
    if (!this.isWalletConnected) {
      this.showToast('❌ Please connect Midnight wallet first', 'error');
      return;
    }

    this.log('Reading counter state from Midnight testnet...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/contract/state`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Contract state response:', data);
        
        if (data.success && data.state) {
          this.log(`Contract state: Counter = ${data.state.counter}, Deployed = ${data.state.deployed}`, 'success');
          this.showToast(`📊 Counter Value: ${data.state.counter}`, 'success');
        } else {
          this.log(`Get contract state failed: ${data.error || 'No contract deployed'}`, 'warning');
          this.showToast('⚠️ No Contract Deployed', 'warning');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Get state error:', error);
      this.log(`Failed to get contract state: ${error.message}`, 'error');
      this.showToast('❌ Failed to Get State', 'error');
    }
  }

  // Modal and UI utilities
  showModal(config) {
    const modalContainer = document.getElementById('modalContainer');
    const modalId = 'modal-' + Date.now();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = modalId;
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-icon ${config.type || 'info'}">
            ${config.icon || '🔔'}
          </div>
          <div class="modal-title">${config.title}</div>
        </div>
        <div class="modal-body">
          ${config.message}
          ${config.details ? `<div class="tx-status ${config.status || 'pending'}">${config.details}</div>` : ''}
        </div>
        <div class="modal-footer">
          ${config.showCancel ? '<button class="btn btn-secondary" onclick="window.closeModal(\'' + modalId + '\')">Cancel</button>' : ''}
          ${config.showConfirm ? '<button class="btn btn-primary" onclick="window.confirmModal(\'' + modalId + '\')">' + (config.confirmText || 'Confirm') + '</button>' : ''}
          ${config.showClose ? '<button class="btn btn-primary" onclick="window.closeModal(\'' + modalId + '\')">' + (config.closeText || 'Close') + '</button>' : ''}
        </div>
      </div>
    `;
    
    modalContainer.appendChild(modal);
    
    // Store callbacks
    window.confirmModal = (id) => {
      if (config.onConfirm) config.onConfirm();
      this.closeModal(id);
    };
    
    window.closeModal = (id) => {
      this.closeModal(id);
    };
    
    return modalId;
  }
  
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  }
  
  showConfirmation(action, details) {
    return new Promise((resolve) => {
      this.showModal({
        type: 'warning',
        icon: '⚠️',
        title: 'Confirm Transaction',
        message: `Are you sure you want to ${action}?`,
        details: details,
        status: 'pending',
        showCancel: true,
        showConfirm: true,
        confirmText: 'Confirm',
        onConfirm: () => resolve(true),
      });
      
      // Auto-resolve if no user interaction after 30 seconds
      setTimeout(() => resolve(false), 30000);
    });
  }
  
  showTransactionStatus(txId, status = 'pending') {
    const statusConfig = {
      pending: { icon: '⏳', title: 'Transaction Pending', type: 'info' },
      success: { icon: '✅', title: 'Transaction Successful', type: 'success' },
      error: { icon: '❌', title: 'Transaction Failed', type: 'error' }
    };
    
    const config = statusConfig[status];
    return this.showModal({
      ...config,
      message: `Your transaction is ${status === 'pending' ? 'being processed' : status === 'success' ? 'complete' : 'failed'}.`,
      details: txId ? `Transaction ID: ${txId}` : '',
      status: status,
      showClose: status !== 'pending'
    });
  }
  
  setButtonLoading(buttonId, loading = true) {
    const button = document.getElementById(buttonId);
    if (button) {
      if (loading) {
        button.classList.add('loading');
        button.disabled = true;
      } else {
        button.classList.remove('loading');
        button.disabled = false;
      }
    }
  }
  
  updateContractInfo(address, status = 'deployed') {
    const contractInfo = document.getElementById('contractInfo');
    const contractAddress = document.getElementById('contractAddress');
    const contractStatus = document.getElementById('contractStatus');
    
    if (address) {
      contractInfo.style.display = 'block';
      contractAddress.textContent = address;
      contractStatus.textContent = status === 'deployed' ? 'Deployed' : 'Joined';
      contractStatus.className = `contract-status ${status}`;
    } else {
      contractInfo.style.display = 'none';
    }
  }

  // Utility functions
  switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(`${tabName}-content`).classList.add('active');
    
    // Add active class to selected tab
    event.target.classList.add('active');
  }

  log(message, type = 'info') {
    const logContainer = document.getElementById('activityLog');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    
    entry.innerHTML = `
      <div class="log-time">${timestamp}</div>
      <div class="log-message">${emoji} ${message}</div>
    `;
    
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
    
    // Keep only last 50 entries
    while (logContainer.children.length > 50) {
      logContainer.removeChild(logContainer.firstChild);
    }
    
    console.log(`[${timestamp}] ${message}`);
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Initialize the DApp when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MidnightDApp();
});
