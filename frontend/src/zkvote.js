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
        this.apiBaseUrl = 'http://localhost:3002/api';
        
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
        document.getElementById('contractAddress').addEventListener('input', (e) => {
            const address = e.target.value.trim();
            // Remove any non-hex characters and convert to lowercase
            e.target.value = address.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
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
            
            this.isWalletConnected = data.success && data.data && data.data.address;
            this.walletData = data.data || null;
            
            this.updateWalletStatus();
        } catch (error) {
            console.error('Failed to check wallet status:', error);
            this.isWalletConnected = false;
        }
    }

    async connectWallet() {
        if (this.isWalletConnected) return;

        this.showLoading('Generating wallet...');
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/wallet/generate`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                this.isWalletConnected = true;
                this.walletData = data.walletData;
                this.updateWalletStatus();
                this.showToast('Wallet connected successfully!', 'success');
            } else {
                throw new Error(data.error || 'Failed to generate wallet');
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
        
        // Validate that it's exactly 64 hex characters
        const isValidAddress = /^[0-9a-fA-F]{64}$/i.test(contractAddress);
        
        joinBtn.disabled = !this.isWalletConnected || !isValidAddress;
        
        // Visual feedback for address validation
        const input = document.getElementById('contractAddress');
        if (contractAddress.length > 0) {
            if (isValidAddress) {
                input.style.borderColor = 'var(--success)';
            } else {
                input.style.borderColor = 'var(--error)';
            }
        } else {
            input.style.borderColor = 'var(--border)';
        }
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

            if (data.success) {            this.currentContract = data.contractAddress;
            this.showToast('Contract deployed successfully!', 'success');
            await this.loadContractState();
            this.showVotingPage(); // Switch to dedicated voting page
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
        
        // Validate contract address format (64 hex characters)
        if (!contractAddress || !/^[0-9a-fA-F]{64}$/i.test(contractAddress)) {
            this.showToast('Please enter a valid contract address (64 hex characters)', 'error');
            return;
        }
        
        this.setButtonLoading('joinBtn', true);
        this.showLoading('Connecting to contract...');

        try {
            // Use the Chrome wallet bridge's join contract endpoint
            const response = await fetch(`${this.apiBaseUrl}/contract/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contractAddress: contractAddress
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentContract = contractAddress;
                this.showToast('Successfully connected to contract!', 'success');
                
                // Load the contract state to get voting options
                await this.loadContractState();
                
                // Transition to voting page
                this.showVotingPage();
            } else {
                throw new Error(data.error || 'Failed to connect to contract');
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
        if (!this.currentContract) {
            console.log('No current contract to load state for');
            return;
        }

        console.log('Loading contract state for:', this.currentContract);

        try {
            const response = await fetch(`${this.apiBaseUrl}/contract/state`);
            const data = await response.json();

            if (data.success) {
                this.contractState = data.state;
                console.log('Contract state loaded:', this.contractState);
                
                // Update UI components if they exist (for old interface)
                this.renderVoteOptions();
                this.renderResults();
            } else {
                console.error('Failed to get contract state:', data.error);
                this.showToast('Failed to load contract state: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Failed to load contract state:', error);
            this.showToast('Failed to load contract state: ' + error.message, 'error');
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

    showVotingPage() {
        // Hide main sections
        document.querySelector('.hero').style.display = 'none';
        document.querySelector('.cards').style.display = 'none';
        document.getElementById('votingSection').style.display = 'none';
        
        // Show voting page
        document.getElementById('votingPage').style.display = 'block';
        document.getElementById('votingPageContract').textContent = this.currentContract;
        
        this.renderVotingPageOptions();
        this.renderVotingPageResults();
        this.setupVotingPageListeners();
        
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setupVotingPageListeners() {
        // Remove existing listeners if any
        const backBtn = document.getElementById('backBtn');
        const secretInput = document.getElementById('votingSecretKey');
        const submitBtn = document.getElementById('votingSubmitBtn');
        const refreshBtn = document.getElementById('refreshResultsBtn');
        
        // Clone and replace elements to remove all event listeners
        backBtn.replaceWith(backBtn.cloneNode(true));
        secretInput.replaceWith(secretInput.cloneNode(true));
        submitBtn.replaceWith(submitBtn.cloneNode(true));
        refreshBtn.replaceWith(refreshBtn.cloneNode(true));
        
        // Get fresh references
        const newBackBtn = document.getElementById('backBtn');
        const newSecretInput = document.getElementById('votingSecretKey');
        const newSubmitBtn = document.getElementById('votingSubmitBtn');
        const newRefreshBtn = document.getElementById('refreshResultsBtn');
        
        // Back button
        newBackBtn.addEventListener('click', () => {
            this.showHomePage();
        });

        // Secret key input validation
        newSecretInput.addEventListener('input', () => {
            this.validateVotingForm();
        });

        // Submit vote button
        newSubmitBtn.addEventListener('click', () => {
            console.log('Submit button clicked!');
            this.submitVotingPageVote();
        });

        // Refresh results button
        newRefreshBtn.addEventListener('click', () => {
            this.refreshVotingPageResults();
        });
    }

    showHomePage() {
        // Show main sections
        document.querySelector('.hero').style.display = 'block';
        document.querySelector('.cards').style.display = 'flex';
        
        // Hide voting page
        document.getElementById('votingPage').style.display = 'none';
        document.getElementById('votingSection').style.display = 'none';
        
        // Reset form
        this.selectedChoice = null;
        document.getElementById('votingSecretKey').value = '';
        this.validateVotingForm();
        
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    renderVotingPageOptions() {
        // Use contract state choices if available, otherwise use fallback
        let choices = this.contractState?.choices;
        
        if (!choices || choices.length === 0) {
            // Fallback to default choices if contract state isn't loaded
            console.log('Using fallback choices - contract state not available');
            choices = ['YES', 'NOD', 'ABS', 'N/A'];
            
            // Create a fallback contract state
            this.contractState = {
                choices: choices,
                voteCounts: [0, 0, 0, 0]
            };
        }

        console.log('Rendering voting page options:', choices);

        const optionsContainer = document.getElementById('votingPageOptions');
        optionsContainer.innerHTML = '';

        choices.forEach((choice, index) => {
            const option = document.createElement('div');
            option.className = 'voting-page-option';
            option.dataset.index = index;
            
            const letters = ['A', 'B', 'C', 'D'];
            
            option.innerHTML = `
                <div class="voting-page-option-content">
                    <span class="voting-page-option-letter">${letters[index] || index}</span>
                    <div class="voting-page-option-text">${choice}</div>
                    <div class="voting-page-option-index">Option ${index + 1}</div>
                </div>
            `;
            
            option.addEventListener('click', () => {
                console.log('Option clicked:', index, choice);
                this.selectVotingPageChoice(index, option);
            });
            
            optionsContainer.appendChild(option);
        });
        
        console.log('Created', choices.length, 'voting options');
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

    selectVotingPageChoice(index, element) {
        console.log('Selecting voting page choice:', index, element);
        
        // Remove previous selection
        document.querySelectorAll('.voting-page-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selection to clicked option
        element.classList.add('selected');
        this.selectedChoice = index;
        
        console.log('Selected choice:', this.selectedChoice);
        
        this.validateVotingForm();
    }

    validateVotingForm() {
        const secretKey = document.getElementById('votingSecretKey').value.trim();
        const submitBtn = document.getElementById('votingSubmitBtn');
        
        const isValid = this.selectedChoice !== null && secretKey.length === 5;
        console.log('Validating form - selectedChoice:', this.selectedChoice, 'secretKey length:', secretKey.length, 'isValid:', isValid);
        
        submitBtn.disabled = !isValid;
    }

    async submitVote() {
        if (this.selectedChoice === null || !this.currentContract) return;

        const secretKey = document.getElementById('secretKey').value.trim();
        
        this.setButtonLoading('voteBtn', true);
        this.showLoading('Submitting your vote...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/sessions/${this.currentContract}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: `2\n${secretKey}\n${this.selectedChoice}`
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

    async submitVotingPageVote() {
        console.log('submitVotingPageVote called - selectedChoice:', this.selectedChoice, 'currentContract:', this.currentContract);
        
        if (this.selectedChoice === null || !this.currentContract) {
            console.log('Cannot submit vote - missing selection or contract');
            return;
        }

        const secretKey = document.getElementById('votingSecretKey').value.trim();
        console.log('Secret key length:', secretKey.length);
        
        this.setVotingButtonLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/sessions/${this.currentContract}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: `2\n${secretKey}\n${this.selectedChoice}`
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Vote submitted successfully! 🎉', 'success');
                
                // Clear the form
                document.getElementById('votingSecretKey').value = '';
                document.querySelectorAll('.voting-page-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.selectedChoice = null;
                this.validateVotingForm();
                
                // Refresh results after a short delay
                setTimeout(() => {
                    this.refreshVotingPageResults();
                }, 2000);
            } else {
                throw new Error(data.error || 'Failed to submit vote');
            }
        } catch (error) {
            console.error('Vote submission failed:', error);
            this.showToast('Failed to submit vote: ' + error.message, 'error');
        } finally {
            this.setVotingButtonLoading(false);
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

    async refreshVotingPageResults() {
        if (!this.currentContract) return;

        // Add rotation animation to refresh button
        const refreshBtn = document.getElementById('refreshResultsBtn');
        const icon = refreshBtn.querySelector('.refresh-icon');
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            icon.style.transform = '';
        }, 500);

        await this.loadContractState();
        this.renderVotingPageResults();
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

    renderVotingPageResults() {
        if (!this.contractState) return;

        const resultsContainer = document.getElementById('votingResultsCharts');
        const totalVotesElement = document.getElementById('votingTotalVotes');
        
        resultsContainer.innerHTML = '';
        
        let totalCount = 0;
        const voteCounts = this.contractState.voteCounts || [];
        
        // Calculate total votes
        voteCounts.forEach(count => {
            totalCount += count;
        });
        
        totalVotesElement.textContent = totalCount;

        // Create result items
        this.contractState.choices.forEach((choice, index) => {
            const votes = voteCounts[index] || 0;
            const percentage = totalCount > 0 ? Math.round((votes / totalCount) * 100) : 0;
            const letters = ['A', 'B', 'C', 'D'];
            
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            resultItem.innerHTML = `
                <div class="result-option">
                    <div class="result-option-letter">${letters[index] || index}</div>
                    <div class="result-option-text">${choice}</div>
                </div>
                <div class="result-stats">
                    <div class="result-count">${votes}</div>
                    <div class="result-percentage">${percentage}%</div>
                    <div class="result-bar">
                        <div class="result-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
            
            resultsContainer.appendChild(resultItem);
        });
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

    setVotingButtonLoading(loading) {
        const btn = document.getElementById('votingSubmitBtn');
        const text = btn.querySelector('.voting-btn-text');
        const loader = btn.querySelector('.voting-btn-loader');
        
        if (loading) {
            btn.classList.add('loading');
            btn.disabled = true;
            text.textContent = 'Submitting...';
        } else {
            btn.classList.remove('loading');
            text.textContent = 'Submit My Vote';
            this.validateVotingForm(); // Re-enable based on form validity
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
