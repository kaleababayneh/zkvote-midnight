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

    // Direct connection without modal for better UX
    this.setButtonLoading('connectBtn', true);
    this.log('Connecting to Midnight wallet...');
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/wallet`);
      console.log('Wallet connection response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Wallet data received:', data);
        
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

    this.setButtonLoading('deployBtn', true);
    this.log('Deploying counter contract to Midnight testnet...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/contract/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractType: 'counter' })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Deploy response:', data);
        
        if (data.success) {
          this.log(`Counter contract deployed successfully! Address: ${data.contractAddress || 'N/A'}`, 'success');
          this.showToast('✅ Contract Deployed!', 'success');
        } else {
          this.log(`Contract deployment failed: ${data.error || data.message}`, 'error');
          this.showToast('❌ Deployment Failed', 'error');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Deploy error:', error);
      this.log(`Contract deployment failed: ${error.message}`, 'error');
      this.showToast('❌ Deployment Failed', 'error');
    }

    this.setButtonLoading('deployBtn', false);
  }

  async incrementCounter() {
    if (!this.isWalletConnected) {
      this.showToast('❌ Please connect Midnight wallet first', 'error');
      return;
    }

    this.setButtonLoading('incrementBtn', true);
    this.log('Incrementing counter on Midnight testnet...');

    try {
      const response = await fetch(`${this.apiBaseUrl}/contract/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Increment response:', data);
        
        if (data.success) {
          this.log(`Counter incremented successfully! New value: ${data.result || 'Unknown'}`, 'success');
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

  // Utility functions
  setButtonLoading(buttonId, loading) {
    const button = document.getElementById(buttonId);
    if (loading) {
      button.disabled = true;
      button.style.opacity = '0.6';
      button.style.cursor = 'not-allowed';
    } else {
      if (this.isWalletConnected || buttonId === 'connectBtn') {
        button.disabled = false;
      }
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  }

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
