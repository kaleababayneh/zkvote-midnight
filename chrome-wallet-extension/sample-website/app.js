// Midnight DApp Interface - Website JavaScript
class MidnightDApp {
    constructor() {
        // Your extension ID (will be different when you load it)
        this.extensionId = null; // Will be auto-detected
        this.isExtensionAvailable = false;
        this.walletData = null;
        
        this.init();
    }

    async init() {
        this.log('Initializing DApp interface...');
        await this.checkExtension();
        await this.refreshStatus();
        
        // Auto-refresh status every 30 seconds
        setInterval(() => this.refreshStatus(), 30000);
    }

    async checkExtension() {
        try {
            // Try to detect the extension by attempting communication
            const response = await this.sendToExtension('getWalletInfo');
            
            if (response && response.success !== false) {
                this.isExtensionAvailable = true;
                document.getElementById('extensionStatus').textContent = 'Connected';
                document.getElementById('extensionStatus').style.color = 'var(--success-color)';
                this.log('Extension detected and connected', 'success');
            } else {
                throw new Error('Extension not responding');
            }
        } catch (error) {
            this.isExtensionAvailable = false;
            document.getElementById('extensionStatus').textContent = 'Not Available';
            document.getElementById('extensionStatus').style.color = 'var(--error-color)';
            document.getElementById('extensionCheck').classList.add('show');
            this.log('Extension not available: ' + error.message, 'error');
        }
    }

    async sendToExtension(action, params = {}) {
        return new Promise((resolve) => {
            if (!chrome.runtime) {
                resolve({ success: false, error: 'Chrome runtime not available' });
                return;
            }

            // Try to send to extension - we'll need to find the extension ID
            // For now, we'll try a general approach
            try {
                chrome.runtime.sendMessage(
                    this.extensionId || chrome.runtime.id, 
                    { action, params },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('Extension communication error:', chrome.runtime.lastError);
                            resolve({ success: false, error: chrome.runtime.lastError.message });
                        } else {
                            resolve(response);
                        }
                    }
                );
            } catch (error) {
                console.error('Failed to communicate with extension:', error);
                resolve({ success: false, error: error.message });
            }
        });
    }

    // Alternative method using window.postMessage (more reliable for cross-extension communication)
    async sendToExtensionViaContentScript(action, params = {}) {
        return new Promise((resolve) => {
            const messageId = Date.now() + Math.random();
            
            // Listen for response
            const responseHandler = (event) => {
                if (event.data && event.data.messageId === messageId) {
                    window.removeEventListener('message', responseHandler);
                    resolve(event.data.response);
                }
            };
            
            window.addEventListener('message', responseHandler);
            
            // Send message
            window.postMessage({
                type: 'MIDNIGHT_EXTENSION_REQUEST',
                messageId: messageId,
                action: action,
                params: params
            }, '*');
            
            // Timeout after 10 seconds
            setTimeout(() => {
                window.removeEventListener('message', responseHandler);
                resolve({ success: false, error: 'Timeout' });
            }, 10000);
        });
    }

    async refreshStatus() {
        this.log('Refreshing status...');
        
        try {
            if (!this.isExtensionAvailable) {
                await this.checkExtension();
                if (!this.isExtensionAvailable) return;
            }

            // Get wallet info
            const walletResponse = await this.sendToExtension('getWalletInfo');
            if (walletResponse && walletResponse.success !== false) {
                this.walletData = walletResponse.data || walletResponse;
                this.updateWalletDisplay();
            }

        } catch (error) {
            this.log('Failed to refresh status: ' + error.message, 'error');
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

    // Button action handlers
    async deployContract() {
        if (!this.isExtensionAvailable) {
            this.log('Extension not available', 'error');
            return;
        }

        this.log('Deploying contract...');
        this.setButtonLoading('deploy', true);
        
        try {
            const response = await this.sendToExtension('deployContract', {});
            
            if (response && response.success) {
                this.log(`Contract deployed successfully! Address: ${response.contractAddress}`, 'success');
                document.getElementById('lastAction').textContent = 'Deploy Contract';
            } else {
                this.log(`Deploy failed: ${response.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.log(`Deploy error: ${error.message}`, 'error');
        }
        
        this.setButtonLoading('deploy', false);
    }

    async incrementCounter() {
        if (!this.isExtensionAvailable) {
            this.log('Extension not available', 'error');
            return;
        }

        this.log('Incrementing counter...');
        this.setButtonLoading('increment', true);
        
        try {
            const response = await this.sendToExtension('incrementCounter', {});
            
            if (response && response.success) {
                this.log(`Counter incremented! TX: ${response.txHash}`, 'success');
                document.getElementById('lastAction').textContent = 'Increment Counter';
            } else {
                this.log(`Increment failed: ${response.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.log(`Increment error: ${error.message}`, 'error');
        }
        
        this.setButtonLoading('increment', false);
    }

    async getContractState() {
        if (!this.isExtensionAvailable) {
            this.log('Extension not available', 'error');
            return;
        }

        this.log('Getting contract state...');
        
        try {
            const response = await this.sendToExtension('getContractState', {});
            
            if (response && response.success) {
                this.log(`Contract state: ${JSON.stringify(response.state, null, 2)}`, 'success');
                document.getElementById('lastAction').textContent = 'Get Contract State';
            } else {
                this.log(`Get state failed: ${response.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.log(`Get state error: ${error.message}`, 'error');
        }
    }

    async requestTokens() {
        if (!this.isExtensionAvailable) {
            this.log('Extension not available', 'error');
            return;
        }

        this.log('Requesting testnet tokens...');
        this.setButtonLoading('tokens', true);
        
        try {
            const response = await this.sendToExtension('requestTokens', {});
            
            if (response && response.success) {
                this.log('Tokens requested successfully!', 'success');
                document.getElementById('lastAction').textContent = 'Request Tokens';
                
                // Refresh status after a delay
                setTimeout(() => this.refreshStatus(), 5000);
            } else {
                this.log(`Token request failed: ${response.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.log(`Token request error: ${error.message}`, 'error');
        }
        
        this.setButtonLoading('tokens', false);
    }

    async getWalletInfo() {
        await this.refreshStatus();
        this.log('Wallet info refreshed');
    }

    setButtonLoading(action, loading) {
        // This would set button loading state - simplified for demo
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            if (loading) {
                btn.disabled = true;
                btn.classList.add('loading');
            } else {
                btn.disabled = false;
                btn.classList.remove('loading');
            }
        });
    }

    log(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const timestamp = new Date().toLocaleTimeString();
        const className = type === 'error' ? 'log-error' : type === 'success' ? 'log-success' : '';
        
        entry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span> 
            <span class="${className}">${message}</span>
        `;
        
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // Keep only last 50 entries
        while (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.firstChild);
        }
        
        console.log(`[${timestamp}] ${message}`);
    }
}

// Global functions for button clicks
let dapp;

window.addEventListener('DOMContentLoaded', () => {
    dapp = new MidnightDApp();
});

// Global button handlers
function refreshStatus() {
    dapp?.refreshStatus();
}

function deployContract() {
    dapp?.deployContract();
}

function incrementCounter() {
    dapp?.incrementCounter();
}

function getContractState() {
    dapp?.getContractState();
}

function requestTokens() {
    dapp?.requestTokens();
}

function getWalletInfo() {
    dapp?.getWalletInfo();
}

// Listen for messages from extension (if using content script approach)
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'MIDNIGHT_EXTENSION_RESPONSE') {
        // Handle extension responses if needed
        console.log('Extension response:', event.data);
    }
});

// Simple HTTP server instructions
console.log(`
🌙 Midnight DApp Interface Loaded!

To test this website:
1. Make sure your Midnight Wallet Extension is loaded in Chrome
2. Start a simple HTTP server in this directory:
   
   Python: python3 -m http.server 8080
   Node: npx serve . -p 8080
   
3. Open http://localhost:8080 in Chrome
4. The website will detect and communicate with your extension

Note: The extension must be loaded in Chrome for communication to work.
`);
