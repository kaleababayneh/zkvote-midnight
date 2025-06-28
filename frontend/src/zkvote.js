// Import CSS (Vite will handle this)
// import './zkvote.css';

// ZkVote - Advanced Frontend Application
class ZkVoteApp {
    constructor() {
        this.isWalletConnected = false;
        this.walletData = null;
        this.selectedChoice = null;
        this.currentContract = null;
        this.contractState = null;
        this.apiBaseUrl = 'http://localhost:3001/api';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkWalletConnection();
        this.updateUI();
    }

    setupEventListeners() {
        // Wallet connection
        document.getElementById('walletStatus').addEventListener('click', () => {
            if (!this.isWalletConnected) {
                this.connectWallet();
            }
        });

        // Choice inputs
        const choiceInputs = ['choiceA', 'choiceB', 'choiceC', 'choiceD'];
        choiceInputs.forEach(id => {
            const input = document.getElementById(id);
            input.addEventListener('input', () => this.validateChoices());
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        });

        // Contract address input
        document.getElementById('contractAddress').addEventListener('input', () => {
            this.validateJoinForm();
        });

        // Secret key input
        document.getElementById('secretKey').addEventListener('input', () => {
            this.validateVoteForm();
        });

        // Action buttons
        document.getElementById('createBtn').addEventListener('click', () => {
            this.deployContract();
        });

        document.getElementById('joinBtn').addEventListener('click', () => {
            this.joinContract();
        });

        document.getElementById('voteBtn').addEventListener('click', () => {
            this.submitVote();
        });

        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshResults();
        });

        // Auto-refresh results every 30 seconds when viewing contract
        setInterval(() => {
            if (this.currentContract && document.getElementById('votingSection').style.display !== 'none') {
                this.refreshResults(true); // Silent refresh
            }
        }, 30000);
    }

    async checkWalletConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/wallet/status`);
            const data = await response.json();
            
            this.isWalletConnected = data.success && data.connected;
            this.walletData = data.wallet || null;
            
            this.updateWalletStatus();
        } catch (error) {
            console.error('Failed to check wallet status:', error);
            this.isWalletConnected = false;
        }
    }

    async connectWallet() {
        if (this.isWalletConnected) return;

        this.showLoading('Connecting wallet...');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/wallet/connect`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                this.isWalletConnected = true;
                this.walletData = data.wallet;
                this.updateWalletStatus();
                this.showToast('Wallet connected successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to connect wallet');
            }
        } catch (error) {
            console.error('Wallet connection failed:', error);
            this.showToast('Failed to connect wallet. Make sure the extension is running.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateWalletStatus() {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        if (this.isWalletConnected) {
            statusIndicator.classList.add('connected');
            statusText.textContent = 'Wallet Connected';
        } else {
            statusIndicator.classList.remove('connected');
            statusText.textContent = 'Connect Wallet';
        }
        
        this.updateUI();
    }

    validateChoices() {
        const choiceInputs = ['choiceA', 'choiceB', 'choiceC', 'choiceD'];
        const values = choiceInputs.map(id => document.getElementById(id).value.trim());
        const allFilled = values.every(value => value.length === 3);
        const allUnique = new Set(values.filter(v => v)).size === values.filter(v => v).length;
        
        const createBtn = document.getElementById('createBtn');
        createBtn.disabled = !this.isWalletConnected || !allFilled || !allUnique;
        
        // Visual feedback for validation
        choiceInputs.forEach((id, index) => {
            const input = document.getElementById(id);
            const value = values[index];
            
            if (value && value.length === 3) {
                input.style.borderColor = 'var(--success)';
            } else if (value) {
                input.style.borderColor = 'var(--warning)';
            } else {
                input.style.borderColor = 'var(--border)';
            }
        });
    }

    validateJoinForm() {
        const contractAddress = document.getElementById('contractAddress').value.trim();
        const joinBtn = document.getElementById('joinBtn');
        
        joinBtn.disabled = !this.isWalletConnected || !contractAddress || contractAddress.length < 40;
    }

    validateVoteForm() {
        const secretKey = document.getElementById('secretKey').value.trim();
        const voteBtn = document.getElementById('voteBtn');
        
        voteBtn.disabled = this.selectedChoice === null || !secretKey || secretKey.length !== 5;
    }

    async deployContract() {
        if (!this.isWalletConnected) {
            this.showToast('Please connect your wallet first', 'warning');
            return;
        }

        const choices = [
            document.getElementById('choiceA').value.trim(),
            document.getElementById('choiceB').value.trim(),
            document.getElementById('choiceC').value.trim(),
            document.getElementById('choiceD').value.trim()
        ];

        this.setButtonLoading('createBtn', true);
        this.showLoading('Deploying voting contract...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/contract/deploy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ choices })
            });

            const data = await response.json();

            if (data.success) {
                this.currentContract = data.contractAddress;
                this.showToast('Contract deployed successfully!', 'success');
                await this.loadContractState();
                this.showVotingInterface();
            } else {
                throw new Error(data.error || 'Failed to deploy contract');
            }
        } catch (error) {
            console.error('Contract deployment failed:', error);
            this.showToast('Failed to deploy contract: ' + error.message, 'error');
        } finally {
            this.setButtonLoading('createBtn', false);
            this.hideLoading();
        }
    }

    async joinContract() {
        if (!this.isWalletConnected) {
            this.showToast('Please connect your wallet first', 'warning');
            return;
        }

        const contractAddress = document.getElementById('contractAddress').value.trim();
        
        this.setButtonLoading('joinBtn', true);
        this.showLoading('Connecting to contract...');

        try {
            // First, verify the contract exists and get its state
            const response = await fetch(`${this.apiBaseUrl}/contract/state/${contractAddress}`);
            const data = await response.json();

            if (data.success) {
                this.currentContract = contractAddress;
                this.contractState = data.state;
                this.showToast('Connected to voting contract!', 'success');
                await this.loadContractState();
                this.showVotingInterface();
            } else {
                throw new Error(data.error || 'Contract not found or invalid');
            }
        } catch (error) {
            console.error('Failed to join contract:', error);
            this.showToast('Failed to connect to contract: ' + error.message, 'error');
        } finally {
            this.setButtonLoading('joinBtn', false);
            this.hideLoading();
        }
    }

    async loadContractState() {
        if (!this.currentContract) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/contract/state/${this.currentContract}`);
            const data = await response.json();

            if (data.success) {
                this.contractState = data.state;
                this.renderVoteOptions();
                this.renderResults();
            }
        } catch (error) {
            console.error('Failed to load contract state:', error);
        }
    }

    showVotingInterface() {
        document.getElementById('votingSection').style.display = 'block';
        document.getElementById('connectedContract').textContent = this.currentContract;
        
        // Smooth scroll to voting section
        document.getElementById('votingSection').scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    renderVoteOptions() {
        if (!this.contractState?.choices) return;

        const voteOptions = document.getElementById('voteOptions');
        voteOptions.innerHTML = '';

        this.contractState.choices.forEach((choice, index) => {
            const option = document.createElement('div');
            option.className = 'vote-option';
            option.dataset.index = index;
            
            option.innerHTML = `
                <div class="vote-option-index">Option ${index}</div>
                <div class="vote-option-text">${choice}</div>
            `;
            
            option.addEventListener('click', () => {
                this.selectChoice(index, option);
            });
            
            voteOptions.appendChild(option);
        });
    }

    selectChoice(index, element) {
        // Remove previous selection
        document.querySelectorAll('.vote-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Select new option
        element.classList.add('selected');
        this.selectedChoice = index;
        
        this.validateVoteForm();
    }

    async submitVote() {
        if (this.selectedChoice === null || !this.currentContract) return;

        const secretKey = document.getElementById('secretKey').value.trim();
        
        this.setButtonLoading('voteBtn', true);
        this.showLoading('Submitting your vote...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/contract/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contractAddress: this.currentContract,
                    choiceIndex: this.selectedChoice,
                    secretKey: secretKey
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Vote submitted successfully!', 'success');
                
                // Clear the form
                document.getElementById('secretKey').value = '';
                document.querySelectorAll('.vote-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.selectedChoice = null;
                
                // Refresh results after a short delay
                setTimeout(() => {
                    this.refreshResults();
                }, 2000);
            } else {
                throw new Error(data.error || 'Failed to submit vote');
            }
        } catch (error) {
            console.error('Vote submission failed:', error);
            this.showToast('Failed to submit vote: ' + error.message, 'error');
        } finally {
            this.setButtonLoading('voteBtn', false);
            this.hideLoading();
        }
    }

    async refreshResults(silent = false) {
        if (!this.currentContract) return;

        if (!silent) {
            // Add visual feedback for manual refresh
            document.getElementById('refreshBtn').style.transform = 'rotate(360deg)';
            setTimeout(() => {
                document.getElementById('refreshBtn').style.transform = '';
            }, 500);
        }

        await this.loadContractState();
    }

    renderResults() {
        if (!this.contractState) return;

        const resultsGrid = document.getElementById('resultsGrid');
        const totalVotes = document.getElementById('totalVotes');
        
        resultsGrid.innerHTML = '';
        
        let totalCount = 0;
        const voteCounts = this.contractState.voteCounts || [];
        
        this.contractState.choices.forEach((choice, index) => {
            const count = voteCounts[index] || 0;
            totalCount += count;
        });

        this.contractState.choices.forEach((choice, index) => {
            const count = voteCounts[index] || 0;
            const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            resultItem.innerHTML = `
                <div class="result-label">${choice}</div>
                <div class="result-bar">
                    <div class="result-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="result-count">${count}</div>
            `;
            
            resultsGrid.appendChild(resultItem);
        });

        totalVotes.textContent = totalCount;
    }

    updateUI() {
        // Update button states based on wallet connection
        this.validateChoices();
        this.validateJoinForm();
        this.validateVoteForm();
    }

    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            // Re-validate to set proper disabled state
            if (buttonId === 'createBtn') this.validateChoices();
            if (buttonId === 'joinBtn') this.validateJoinForm();
            if (buttonId === 'voteBtn') this.validateVoteForm();
        }
    }

    showLoading(text) {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        loadingText.textContent = text;
        overlay.style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ZkVoteApp();
});

// Export for potential testing
window.ZkVoteApp = ZkVoteApp;
