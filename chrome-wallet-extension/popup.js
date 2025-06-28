// Midnight Wallet Extension - Popup Script
class MidnightWallet {
    constructor() {
        this.walletData = null;
        this.contractData = null;
        this.cliConnected = false;
        this.init();
    }

    async init() {
        await this.loadWalletData();
        this.setupEventListeners();
        this.updateUI();
        // Don't auto-connect to CLI - only connect when user clicks the button
        this.logMessage('Wallet initialized');
    }

    async loadWalletData() {
        try {
            // Load wallet data from storage
            const result = await chrome.storage.local.get(['walletData', 'contractData', 'lastAction']);
            this.walletData = result.walletData || null;
            this.contractData = result.contractData || null;
            this.lastAction = result.lastAction || null;

            // Try to load from .env file simulation
            if (!this.walletData) {
                await this.loadFromEnvFile();
            }
        } catch (error) {
            console.error('Error loading wallet data:', error);
            this.logMessage('Error loading wallet data', 'error');
        }
    }

    async loadFromEnvFile() {
        // Simulate reading from .env file (in real implementation, this would connect to your CLI)
        // For now, we'll use placeholder data
        this.walletData = {
            seed: 'YOUR_WALLET_SEED',
            address: 'mn_shield-addr_test1mjngjmnlutcq50trhcsk3hugvt9wyjnhq3c7prryd5nqmvtzva0sxqpvzkdy4k9u7eyffff53cge62tqylevq3wqps86tdjuahsquwvucsr4vs4f',
            balance: '0',
            lastUpdated: Date.now()
        };
        await this.saveWalletData();
    }

    async saveWalletData() {
        await chrome.storage.local.set({ 
            walletData: this.walletData,
            contractData: this.contractData 
        });
    }

    setupEventListeners() {
        // Refresh balance
        document.getElementById('refreshBalance').addEventListener('click', () => {
            this.refreshBalance();
        });

        // Copy address
        document.getElementById('copyAddress').addEventListener('click', () => {
            this.copyAddress();
        });

        // Request tokens
        document.getElementById('requestTokens').addEventListener('click', () => {
            this.requestTokens();
        });

        // Check balance
        document.getElementById('checkBalance').addEventListener('click', () => {
            this.checkBalance();
        });

        // Connect CLI
        document.getElementById('connectCli').addEventListener('click', () => {
            this.connectToCLI();
        });
    }

    updateUI() {
        // Update wallet address
        if (this.walletData && this.walletData.address) {
            document.getElementById('walletAddress').textContent = this.formatAddress(this.walletData.address);
        }

        // Update balance
        if (this.walletData && this.walletData.balance !== undefined) {
            const balance = this.formatBalance(this.walletData.balance);
            document.getElementById('balanceAmount').textContent = balance.formatted;
            const balanceUsdElement = document.getElementById('balanceUsd');
            if (balanceUsdElement) {
                balanceUsdElement.textContent = `${balance.micro} microTusdt`;
            }
        }

        // Update counter value
        if (this.contractData && this.contractData.counterValue !== undefined) {
            // Remove this since we're not showing counter in popup anymore
        }

        // Update extension status
        document.getElementById('extensionStatus').textContent = this.cliConnected ? 'Connected' : 'Standby';
        
        // Show last action if any
        if (this.lastAction) {
            document.getElementById('lastAction').textContent = this.lastAction;
        }

        // Update network status
        this.updateNetworkStatus();
    }

    updateNetworkStatus() {
        const statusDot = document.getElementById('networkStatus');
        if (this.cliConnected) {
            statusDot.className = 'status-dot connected';
        } else {
            statusDot.className = 'status-dot disconnected';
        }
    }

    formatAddress(address) {
        if (!address) return '--';
        return `${address.slice(0, 12)}...${address.slice(-12)}`;
    }

    formatBalance(balance) {
        // Convert string to number and handle both string and numeric inputs
        const balanceNum = typeof balance === 'string' ? parseFloat(balance) : (balance || 0);
        
        if (isNaN(balanceNum) || balanceNum === 0) {
            return {
                formatted: '0.000000',
                micro: '0'
            };
        }
        
        // Balance comes in microDUST, convert to DUST by dividing by 1,000,000
        const dustAmount = balanceNum / 1000000;
        const microDustAmount = Math.round(balanceNum);

        return {
            formatted: dustAmount.toLocaleString('en-US', { 
                minimumFractionDigits: 6,
                maximumFractionDigits: 6 
            }),
            micro: microDustAmount.toLocaleString()
        };
    }

    async showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text;
        overlay.classList.add('show');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.remove('show');
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    logMessage(message, type = 'info') {
        const log = document.getElementById('statusLog');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'message';
        messageSpan.textContent = message;
        
        entry.appendChild(timestamp);
        entry.appendChild(messageSpan);
        
        if (type === 'error') {
            messageSpan.style.color = 'var(--error-color)';
        }
        
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    async connectToCLI() {
        this.showLoading('Connecting to CLI...');
        this.logMessage('Attempting to connect to CLI...');
        
        try {
            // Try to connect to local server (your CLI would expose an API)
            const response = await fetch('http://localhost:3002/api/status', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                this.cliConnected = true;
                const statusElement = document.getElementById('cliStatusText');
                if (statusElement) statusElement.textContent = 'Connected to CLI';
                this.updateNetworkStatus();
                this.showToast('Connected to CLI successfully!');
                this.logMessage('Connected to CLI');
                
                // Auto-load wallet data and balance when connecting
                await this.loadCLIData();
                await this.autoRefreshBalance();
            } else {
                throw new Error('CLI not responding');
            }
        } catch (error) {
            this.cliConnected = false;
            const statusElement = document.getElementById('cliStatusText');
            if (statusElement) statusElement.textContent = 'CLI not available - Using simulation mode';
            this.updateNetworkStatus();
            this.showToast('CLI not available. Using simulation mode.', 'warning');
            this.logMessage('CLI connection failed, using simulation mode', 'error');
        }
        
        this.hideLoading();
    }

    async loadCLIData() {
        try {
            this.logMessage('Loading wallet data from CLI...');
            
            // Load wallet status from bridge server
            const walletResponse = await fetch('http://localhost:3002/api/wallet/status');
            if (walletResponse.ok) {
                const walletData = await walletResponse.json();
                if (walletData.success && walletData.data) {
                    // Update wallet data with CLI response
                    this.walletData = {
                        seed: walletData.data.seed || this.walletData?.seed,
                        address: walletData.data.address || this.walletData?.address,
                        balance: walletData.data.balance || '0',
                        lastUpdated: Date.now()
                    };
                    await this.saveWalletData();
                    this.logMessage('Wallet data loaded from CLI');
                }
            }

            // Load contract data if available
            try {
                const contractResponse = await fetch('http://localhost:3002/api/contract/status');
                if (contractResponse.ok) {
                    const contractData = await contractResponse.json();
                    if (contractData.success && contractData.data) {
                        this.contractData = {
                            address: contractData.data.address,
                            counterValue: contractData.data.counterValue || 0,
                            deployed: contractData.data.deployed || false,
                            lastUpdated: Date.now()
                        };
                        await this.saveWalletData();
                        this.logMessage('Contract data loaded from CLI');
                    }
                }
            } catch (contractError) {
                // Contract data is optional, don't fail if not available
                this.logMessage('No contract data available');
            }

            this.updateUI();
        } catch (error) {
            console.error('Error loading CLI data:', error);
            this.logMessage('Error loading CLI data', 'error');
        }
    }

    async checkCLIConnection() {
        await this.connectToCLI();
    }

    async autoRefreshBalance() {
        // Automatically refresh balance after connecting to CLI
        try {
            this.logMessage('Auto-refreshing balance...');
            const response = await fetch('http://localhost:3002/api/wallet/balance');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.walletData.balance = data.data.balance || '0';
                    this.walletData.lastUpdated = Date.now();
                    await this.saveWalletData();
                    this.updateUI();
                    this.logMessage(`Balance auto-updated: ${this.formatBalance(this.walletData.balance).formatted} DUST`);
                }
            }
        } catch (error) {
            this.logMessage('Auto-balance refresh failed, using cached data', 'warning');
        }
    }

    async refreshBalance() {
        this.showLoading('Refreshing balance...');
        this.logMessage('Refreshing balance...');
        
        try {
            if (this.cliConnected) {
                const response = await fetch('http://localhost:3002/api/wallet/balance');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        this.walletData.balance = data.data.balance || '0';
                        this.walletData.lastUpdated = Date.now();
                        await this.saveWalletData();
                        this.updateUI();
                        this.showToast('Balance updated!');
                        this.logMessage(`Balance updated: ${this.formatBalance(this.walletData.balance).formatted} DUST`);
                    } else {
                        throw new Error(data.error || 'Invalid response format');
                    }
                } else {
                    throw new Error('Failed to fetch balance from server');
                }
            } else {
                // Simulation mode
            }
        } catch (error) {
            this.showToast('Failed to refresh balance', 'error');
            this.logMessage(`Failed to refresh balance: ${error.message}`, 'error');
        }
        
        this.hideLoading();
    }


    async copyAddress() {
        if (this.walletData && this.walletData.address) {
            try {
                await navigator.clipboard.writeText(this.walletData.address);
                this.showToast('Address copied to clipboard!');
                this.logMessage('Address copied to clipboard');
            } catch (error) {
                this.showToast('Failed to copy address', 'error');
            }
        }
    }

    async requestTokens() {
        this.showLoading('Requesting testnet tokens...');
        this.logMessage('Requesting testnet tokens...');
        
        try {
            if (this.cliConnected) {
                const response = await fetch('http://localhost:3002/api/faucet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.showToast('Tokens requested successfully!');
                    this.logMessage('Tokens requested successfully');
                    // Refresh balance after a delay
                    setTimeout(() => this.refreshBalance(), 5000);
                } else {
                    throw new Error('Faucet request failed');
                }
            } else {
                // Simulation mode
            }
        } catch (error) {
            this.showToast('Failed to request tokens', 'error');
            this.logMessage('Failed to request tokens', 'error');
        }
        
        this.hideLoading();
    }



    async checkBalance() {
        await this.refreshBalance();
    }

    async incrementCounter() {
        this.showLoading('Incrementing counter...');
        this.logMessage('Executing increment function...');
        
        try {
            if (this.cliConnected) {
                const response = await fetch('http://localhost:3002/api/contract/increment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Show if session was used
                    if (data.sessionUsed) {
                        this.logMessage('Using persistent CLI session for faster execution');
                    }
                    
                    this.showToast('Counter incremented successfully!');
                    this.logMessage(`Transaction ID: ${data.txId || 'Unknown'}`);
                    if (data.blockHeight) {
                        this.logMessage(`Confirmed at block: ${data.blockHeight}`);
                    }
                    
                    // Refresh counter after a delay
                    setTimeout(() => this.refreshCounter(), 3000);
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Increment failed');
                }
            } else {
                // Simulation mode
                this.contractData = {
                    ...this.contractData,
                    counterValue: (this.contractData?.counterValue || 0) + 1,
                    lastUpdated: Date.now()
                };
                await this.saveWalletData();
                this.updateUI();
                this.showToast('Counter incremented (simulation mode)');
                this.logMessage('Counter incremented in simulation mode');
            }
        } catch (error) {
            this.showToast(`Failed to increment counter: ${error.message}`, 'error');
            this.logMessage(`Failed to increment counter: ${error.message}`, 'error');
        }
        
        this.hideLoading();
    }


    async deployContract() {
        this.showLoading('Deploying contract...');
        this.logMessage('Deploying new contract...');
        
        try {
            if (this.cliConnected) {
                const response = await fetch('http://localhost:3002/api/contract/deploy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initialCounter: 0 })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // If we got a processId, start polling for real-time updates
                    if (data.processId) {
                        await this.pollProcessStatus(data.processId, 'Deploying contract');
                    }
                    
                    this.contractData = {
                        address: data.contractAddress,
                        counterValue: 0,
                        deployed: true,
                        lastUpdated: Date.now(),
                        progress: data.progress || []
                    };
                    await this.saveWalletData();
                    this.updateUI();
                    this.showToast('Contract deployed successfully!');
                    this.logMessage(`Contract deployed at: ${data.contractAddress}`);
                    
                    // Show progress summary if available
                    if (data.progress && data.progress.length > 0) {
                        this.logMessage(`Deployment completed in ${data.progress.length} steps`);
                    }
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Deployment failed');
                }
            } else {
                // Simulation mode
                this.contractData = {
                    address: `sim_contract_${Date.now()}`,
                    counterValue: 0,
                    deployed: true,
                    lastUpdated: Date.now()
                };
                await this.saveWalletData();
                this.updateUI();
                this.showToast('Contract deployed (simulation mode)');
                this.logMessage('Contract deployed in simulation mode');
            }
        } catch (error) {
            this.showToast(`Failed to deploy contract: ${error.message}`, 'error');
            this.logMessage(`Failed to deploy contract: ${error.message}`, 'error');
        }
        
        this.hideLoading();
    }

    // Poll process status for real-time updates
    async pollProcessStatus(processId, operationName) {
        const maxPolls = 60; // Poll for up to 5 minutes (5 second intervals)
        let pollCount = 0;
        
        const poll = async () => {
            try {
                const response = await fetch(`http://localhost:3002/api/process/${processId}/status`);
                if (response.ok) {
                    const statusData = await response.json();
                    
                    // Update loading text with latest progress
                    if (statusData.progress && statusData.progress.length > 0) {
                        const latestProgress = statusData.progress[statusData.progress.length - 1];
                        this.showLoading(`${operationName}: ${latestProgress.message}`);
                        this.logMessage(`Progress: ${latestProgress.message}`);
                    }
                    
                    // Check if process is complete
                    if (statusData.status === 'completed' || statusData.status === 'failed' || !statusData.isRunning) {
                        return; // Stop polling
                    }
                    
                    // Continue polling if still running and under limit
                    pollCount++;
                    if (pollCount < maxPolls) {
                        setTimeout(poll, 5000); // Poll every 5 seconds
                    }
                } else {
                    console.warn('Failed to fetch process status');
                }
            } catch (error) {
                console.warn('Error polling process status:', error);
            }
        };
        
        // Start polling after a short delay
        setTimeout(poll, 2000);
    }



    async refreshCounter() {
        this.showLoading('Refreshing counter...');
        this.logMessage('Refreshing counter value...');
        
        try {
            if (this.cliConnected) {
                const response = await fetch('http://localhost:3002/api/contract/counter');
                if (response.ok) {
                    const data = await response.json();
                    this.contractData = {
                        ...this.contractData,
                        counterValue: data.value,
                        lastUpdated: Date.now()
                    };
                    await this.saveWalletData();
                    this.updateUI();
                    this.showToast('Counter value updated!');
                    this.logMessage(`Counter value: ${data.value}`);
                } else {
                    throw new Error('Failed to fetch counter');
                }
            } else {
                // Simulation mode - just show current value
                this.showToast('Counter refreshed (simulated)');
                this.logMessage(`Current counter value: ${this.contractData?.counterValue || 0}`);
            }
        } catch (error) {
            this.showToast('Failed to refresh counter', 'error');
            this.logMessage('Failed to refresh counter', 'error');
        }
        
        this.hideLoading();
    }
}

// Initialize wallet when popup loads
document.addEventListener('DOMContentLoaded', () => {
    new MidnightWallet();
});
