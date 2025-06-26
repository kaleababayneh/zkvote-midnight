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
        this.checkCLIConnection();
        this.logMessage('Wallet initialized');
    }

    async loadWalletData() {
        try {
            // Load wallet data from storage
            const result = await chrome.storage.local.get(['walletData', 'contractData']);
            this.walletData = result.walletData || null;
            this.contractData = result.contractData || null;

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

        // Increment counter
        document.getElementById('incrementCounter').addEventListener('click', () => {
            this.incrementCounter();
        });

        // Deploy contract
        document.getElementById('deployContract').addEventListener('click', () => {
            this.deployContract();
        });

        // Refresh counter
        document.getElementById('refreshCounter').addEventListener('click', () => {
            this.refreshCounter();
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
            document.getElementById('balanceUsd').textContent = balance.micro;
        }

        // Update counter value
        if (this.contractData && this.contractData.counterValue !== undefined) {
            document.getElementById('counterValue').textContent = this.contractData.counterValue;
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

    formatBalance(microBalance) {
        const balance = Number(microBalance) || 0;
        const tusdt = balance / 1_000_000;
        return {
            formatted: tusdt.toLocaleString('en-US', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 6 
            }),
            micro: `${balance.toLocaleString()} microTusdt`
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
            const response = await fetch('http://localhost:3001/api/status', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                this.cliConnected = true;
                document.getElementById('cliStatusText').textContent = 'Connected to CLI';
                this.updateNetworkStatus();
                this.showToast('Connected to CLI successfully!');
                this.logMessage('Connected to CLI');
                
                // Load initial data
                await this.loadCLIData();
            } else {
                throw new Error('CLI not responding');
            }
        } catch (error) {
            this.cliConnected = false;
            document.getElementById('cliStatusText').textContent = 'CLI not available - Using simulation mode';
            this.updateNetworkStatus();
            this.showToast('CLI not available. Using simulation mode.', 'warning');
            this.logMessage('CLI connection failed, using simulation mode', 'error');
        }
        
        this.hideLoading();
    }

    async loadCLIData() {
        try {
            // Load wallet data from CLI
            const walletResponse = await fetch('http://localhost:3001/api/wallet');
            if (walletResponse.ok) {
                const walletData = await walletResponse.json();
                this.walletData = walletData;
                await this.saveWalletData();
            }

            // Load contract data from CLI
            const contractResponse = await fetch('http://localhost:3001/api/contract');
            if (contractResponse.ok) {
                const contractData = await contractResponse.json();
                this.contractData = contractData;
                await this.saveWalletData();
            }

            this.updateUI();
        } catch (error) {
            console.error('Error loading CLI data:', error);
        }
    }

    async checkCLIConnection() {
        await this.connectToCLI();
    }

    async refreshBalance() {
        this.showLoading('Refreshing balance...');
        this.logMessage('Refreshing balance...');
        
        try {
            if (this.cliConnected) {
                const response = await fetch('http://localhost:3001/api/balance');
                if (response.ok) {
                    const data = await response.json();
                    this.walletData.balance = data.balance;
                    await this.saveWalletData();
                    this.updateUI();
                    this.showToast('Balance updated!');
                    this.logMessage(`Balance updated: ${this.formatBalance(data.balance).formatted} tUsdt`);
                } else {
                    throw new Error('Failed to fetch balance');
                }
            } else {
                // Simulation mode
                await this.simulateBalanceCheck();
            }
        } catch (error) {
            this.showToast('Failed to refresh balance', 'error');
            this.logMessage('Failed to refresh balance', 'error');
        }
        
        this.hideLoading();
    }

    async simulateBalanceCheck() {
        // Simulate balance check with random values for demo
        const randomBalance = Math.floor(Math.random() * 10000000); // Random microTusdt
        this.walletData.balance = randomBalance.toString();
        await this.saveWalletData();
        this.updateUI();
        this.showToast('Balance updated (simulated)');
        this.logMessage(`Balance updated (simulated): ${this.formatBalance(randomBalance).formatted} tUsdt`);
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
                const response = await fetch('http://localhost:3001/api/faucet', {
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
                await this.simulateTokenRequest();
            }
        } catch (error) {
            this.showToast('Failed to request tokens', 'error');
            this.logMessage('Failed to request tokens', 'error');
        }
        
        this.hideLoading();
    }

    async simulateTokenRequest() {
        // Simulate token request
        const currentBalance = Number(this.walletData.balance) || 0;
        const newBalance = currentBalance + 10000000; // Add 10 tUsdt
        this.walletData.balance = newBalance.toString();
        await this.saveWalletData();
        this.updateUI();
        this.showToast('Tokens added (simulated)!');
        this.logMessage('Tokens added (simulated): +10 tUsdt');
    }

    async checkBalance() {
        await this.refreshBalance();
    }

    async incrementCounter() {
        this.showLoading('Incrementing counter...');
        this.logMessage('Executing increment function...');
        
        try {
            if (this.cliConnected) {
                const response = await fetch('http://localhost:3001/api/contract/increment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.showToast('Counter incremented successfully!');
                    this.logMessage(`Transaction hash: ${data.txHash}`);
                    // Refresh counter after a delay
                    setTimeout(() => this.refreshCounter(), 3000);
                } else {
                    throw new Error('Increment failed');
                }
            } else {
                // Simulation mode
                await this.simulateIncrement();
            }
        } catch (error) {
            this.showToast('Failed to increment counter', 'error');
            this.logMessage('Failed to increment counter', 'error');
        }
        
        this.hideLoading();
    }

    async simulateIncrement() {
        // Simulate counter increment
        const currentValue = Number(this.contractData?.counterValue) || 0;
        this.contractData = {
            ...this.contractData,
            counterValue: currentValue + 1,
            lastUpdated: Date.now()
        };
        await this.saveWalletData();
        this.updateUI();
        this.showToast('Counter incremented (simulated)!');
        this.logMessage(`Counter incremented to: ${currentValue + 1}`);
    }

    async deployContract() {
        this.showLoading('Deploying contract...');
        this.logMessage('Deploying new contract...');
        
        try {
            if (this.cliConnected) {
                const response = await fetch('http://localhost:3001/api/contract/deploy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initialCounter: 0 })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.contractData = {
                        address: data.contractAddress,
                        counterValue: 0,
                        deployed: true,
                        lastUpdated: Date.now()
                    };
                    await this.saveWalletData();
                    this.updateUI();
                    this.showToast('Contract deployed successfully!');
                    this.logMessage(`Contract deployed at: ${data.contractAddress}`);
                } else {
                    throw new Error('Deployment failed');
                }
            } else {
                // Simulation mode
                await this.simulateDeployment();
            }
        } catch (error) {
            this.showToast('Failed to deploy contract', 'error');
            this.logMessage('Failed to deploy contract', 'error');
        }
        
        this.hideLoading();
    }

    async simulateDeployment() {
        // Simulate contract deployment
        this.contractData = {
            address: `0x${Math.random().toString(16).substr(2, 40)}`,
            counterValue: 0,
            deployed: true,
            lastUpdated: Date.now()
        };
        await this.saveWalletData();
        this.updateUI();
        this.showToast('Contract deployed (simulated)!');
        this.logMessage(`Contract deployed (simulated) at: ${this.contractData.address}`);
    }

    async refreshCounter() {
        this.showLoading('Refreshing counter...');
        this.logMessage('Refreshing counter value...');
        
        try {
            if (this.cliConnected) {
                const response = await fetch('http://localhost:3001/api/contract/counter');
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
