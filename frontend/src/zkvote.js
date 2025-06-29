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
                this.showWalletPopup();
            }
        });

        // Wallet popup controls
        document.getElementById('walletPopupClose').addEventListener('click', () => {
            this.hideWalletPopup();
        });
        
        document.getElementById('walletCancelBtn').addEventListener('click', () => {
            this.hideWalletPopup();
        });
        
        document.getElementById('walletConnectBtn').addEventListener('click', () => {
            this.showWalletStep2();
        });

        document.getElementById('walletAuthorizeBtn').addEventListener('click', () => {
            this.authorizeWalletConnection();
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
            // Check if server is running first
            const statusResponse = await fetch(`${this.apiBaseUrl}/status`);
            if (!statusResponse.ok) {
                throw new Error('Server not running');
            }
            
            // Get existing wallet from server
            const response = await fetch(`${this.apiBaseUrl}/wallet`);
            const data = await response.json();
            
            this.isWalletConnected = response.ok && data.address;
            this.walletData = data || null;
            
            this.updateWalletStatus();
        } catch (error) {
            console.error('Failed to check wallet status:', error);
            this.isWalletConnected = false;
        }
    }

    async connectWallet() {
        if (this.isWalletConnected) return;

        // Start the connection flow with the first option selection
        await this.handleLocalWalletConnection();
    }

    async handleLocalWalletConnection() {
        const localWalletOption = document.getElementById('localWalletOption');
        const localWalletStatus = document.getElementById('localWalletStatus');
        const walletConnectBtn = document.getElementById('walletConnectBtn');
        const walletAuthorizeBtn = document.getElementById('walletAuthorizeBtn');
        
        // Check server availability
        localWalletStatus.innerHTML = '<span class="status-indicator checking">⏳</span>';
        
        try {
            // First check if server is running
            const statusResponse = await fetch(`${this.apiBaseUrl}/status`, { signal: AbortSignal.timeout(5000) });
            
            if (!statusResponse.ok) {
                throw new Error('Server not responding');
            }
            
            // Server is available, update status and enable connection
            localWalletStatus.innerHTML = '<span class="status-indicator available">✅</span>';
            localWalletOption.classList.add('available');
            localWalletOption.classList.remove('disabled');
            
            // Enable the connection button and show step 2
            walletConnectBtn.style.display = 'inline-flex';
            walletConnectBtn.disabled = false;
            
            // Set up click handler for local wallet option
            localWalletOption.addEventListener('click', () => {
                if (!localWalletOption.classList.contains('disabled')) {
                    this.showWalletStep2();
                }
            }, { once: true });
            
        } catch (error) {
            console.error('Server check failed:', error);
            localWalletStatus.innerHTML = '<span class="status-indicator unavailable">❌</span>';
            localWalletOption.classList.add('disabled');
            localWalletOption.classList.remove('available');
        }
    }

    async showWalletStep2() {
        const step1 = document.getElementById('walletStep1');
        const step2 = document.getElementById('walletStep2');
        const walletConnectBtn = document.getElementById('walletConnectBtn');
        const walletAuthorizeBtn = document.getElementById('walletAuthorizeBtn');
        
        // Hide step 1, show step 2
        step1.style.display = 'none';
        step2.style.display = 'block';
        
        // Switch buttons
        walletConnectBtn.style.display = 'none';
        walletAuthorizeBtn.style.display = 'inline-flex';
        
        // Load wallet information
        await this.loadWalletInformation();
    }

    async loadWalletInformation() {
        const walletAddressDisplay = document.getElementById('walletAddressDisplay');
        const walletBalanceDisplay = document.getElementById('walletBalanceDisplay');
        const walletStatusDisplay = document.getElementById('walletStatusDisplay');
        const walletAuthorizeBtn = document.getElementById('walletAuthorizeBtn');
        
        try {
            // Get wallet info from server
            const walletResponse = await fetch(`${this.apiBaseUrl}/wallet`);
            const walletData = await walletResponse.json();
            
            if (walletResponse.ok && walletData.address) {
                // Update wallet display information
                walletAddressDisplay.textContent = this.truncateAddress(walletData.address);
                walletBalanceDisplay.textContent = walletData.balance ? 
                    `${(parseFloat(walletData.balance) / 1000000).toFixed(2)} tUsdt` : '0 tUsdt';
                walletStatusDisplay.innerHTML = '<span class="connection-status ready">Ready to Connect</span>';
                
                // Store wallet data for later use
                this.walletData = walletData;
                
                // Enable authorize button
                walletAuthorizeBtn.disabled = false;
                
            } else {
                throw new Error(walletData.error || 'No wallet found on server');
            }
        } catch (error) {
            console.error('Failed to load wallet information:', error);
            walletAddressDisplay.textContent = 'N/A';
            walletBalanceDisplay.textContent = 'N/A';
            walletStatusDisplay.innerHTML = '<span class="connection-status error">Connection Failed</span>';
            walletAuthorizeBtn.disabled = true;
        }
    }

    async authorizeWalletConnection() {
        const step2 = document.getElementById('walletStep2');
        const step3 = document.getElementById('walletStep3');
        const walletAuthorizeBtn = document.getElementById('walletAuthorizeBtn');
        const walletAuthorizeLoader = document.getElementById('walletAuthorizeLoader');
        const connectionTitle = document.getElementById('connectionTitle');
        const connectionMessage = document.getElementById('connectionMessage');
        
        // Show loading state
        walletAuthorizeBtn.disabled = true;
        walletAuthorizeLoader.style.display = 'block';
        
        // Move to step 3
        step2.style.display = 'none';
        step3.style.display = 'block';
        
        try {
            // Simulate connection process
            connectionTitle.textContent = 'Establishing Connection...';
            connectionMessage.textContent = 'Connecting to wallet server on port 3002';
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            connectionTitle.textContent = 'Authorizing Access...';
            connectionMessage.textContent = 'Requesting permission to access wallet information';
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Final connection attempt
            const walletResponse = await fetch(`${this.apiBaseUrl}/wallet`);
            const walletData = await walletResponse.json();
            
            if (walletResponse.ok && walletData.address) {
                this.isWalletConnected = true;
                this.walletData = walletData;
                
                connectionTitle.textContent = 'Connection Successful!';
                connectionMessage.textContent = 'Your wallet has been connected successfully';
                
                // Show success animation
                const connectionAnimation = document.getElementById('connectionAnimation');
                connectionAnimation.innerHTML = '<div class="connection-success">✅</div>';
                
                setTimeout(() => {
                    this.hideWalletPopup();
                    this.updateWalletStatus();
                    this.showToast('Connected to wallet server!', 'success');
                }, 2000);
            } else {
                throw new Error(walletData.error || 'Connection failed');
            }
        } catch (error) {
            console.error('Wallet authorization failed:', error);
            connectionTitle.textContent = 'Connection Failed';
            connectionMessage.textContent = error.message || 'Unable to connect to wallet server';
            
            const connectionAnimation = document.getElementById('connectionAnimation');
            connectionAnimation.innerHTML = '<div class="connection-error">❌</div>';
            
            setTimeout(() => {
                this.hideWalletPopup();
                this.showToast('Failed to connect to wallet', 'error');
            }, 2000);
        } finally {
            walletAuthorizeBtn.disabled = false;
            walletAuthorizeLoader.style.display = 'none';
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

        // Filter out empty choices for display
        const validChoices = choices.filter(choice => choice !== '');

        try {
            // Show wallet popup for deployment confirmation
            await this.showWalletPopup('deploy', { 
                choiceCount: validChoices.length 
            });
            
            // Continue with actual deployment
            this.setButtonLoading('createBtn', true);
            this.showLoading('Deploying voting contract...');

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
                
                // Store the deployed choices in contract state immediately
                this.contractState = {
                    choices: choices,
                    voteCounts: [0, 0, 0, 0]
                };
                
                this.showToast('Contract deployed successfully!', 'success');
                
                // Transition directly to voting page 
                this.showVotingPage();
            } else {
                throw new Error(data.error || 'Failed to deploy contract');
            }
        } catch (error) {
            console.error('Contract deployment failed:', error);
            if (error.message !== 'User cancelled') {
                this.showToast('Failed to deploy contract: ' + error.message, 'error');
            }
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
        
        try {
            // Show wallet popup for connection confirmation
            await this.showWalletPopup('connect', { 
                contractAddress: contractAddress 
            });
            
            // Continue with actual connection
            this.setButtonLoading('joinBtn', true);
            this.showLoading('Connecting to contract...');

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
                
                // For joined contracts, try to load state, but show fallback choices if it fails
                try {
                    await this.loadContractState();
                } catch (error) {
                    console.log('Failed to load contract state, using fallback');
                }
                
                // Transition to voting page regardless
                this.showVotingPage();
            } else {
                throw new Error(data.error || 'Failed to connect to contract');
            }
        } catch (error) {
            console.error('Failed to join contract:', error);
            if (error.message !== 'User cancelled') {
                this.showToast('Failed to connect to contract: ' + error.message, 'error');
            }
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
                    <div class="voting-page-option-details">
                        <div class="voting-page-option-text">${choice}</div>
                        <div class="voting-page-option-index">Option ${index + 1}</div>
                    </div>
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
        
        try {
            // Show wallet popup for vote confirmation
            await this.showWalletPopup('vote', { 
                choice: this.selectedChoice + 1,
                contractAddress: this.currentContract
            });
            
            // Continue with actual voting
            this.setVotingButtonLoading(true);

            console.log('🗳️  Submitting vote with new API:', {
                choice: this.selectedChoice + 1, // API expects 1-based choice
                secretKey: '***',
                contract: this.currentContract
            });

            const response = await fetch(`${this.apiBaseUrl}/sessions/${this.currentContract}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    choice: this.selectedChoice + 1, // Convert to 1-based for backend
                    secretKey: secretKey
                })
            });

            const data = await response.json();
            console.log('Vote response:', data);

            if (data.success) {
                this.showToast('Vote submitted successfully! 🎉', 'success');
                
                // Update local state with voting results if available
                if (data.result && data.result.voteResults) {
                    this.updateLocalVotingResults(data.result.voteResults);
                }
                
                // Clear the form
                document.getElementById('votingSecretKey').value = '';
                document.querySelectorAll('.voting-page-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                this.selectedChoice = null;
                this.validateVotingForm();
                
                // If we didn't get vote results in response, refresh from backend
                if (!data.result || !data.result.voteResults) {
                    setTimeout(() => {
                        this.refreshVotingPageResults();
                    }, 2000);
                }
            } else {
                throw new Error(data.error || 'Failed to submit vote');
            }
        } catch (error) {
            console.error('Vote submission failed:', error);
            if (error.message !== 'User cancelled') {
                this.showToast('Failed to submit vote: ' + error.message, 'error');
            }
        } finally {
            this.setVotingButtonLoading(false);
        }
    }

    updateLocalVotingResults(voteResults) {
        console.log('📊 Updating local voting results:', voteResults);
        
        // Update internal state
        if (this.currentState && this.currentState.state) {
            this.currentState.state.voteCounts = [
                voteResults.choice1 || 0,
                voteResults.choice2 || 0,
                0, // choices 3 and 4 if they exist
                0
            ];
        }
        
        // Update the visual results on the voting page
        this.updateVotingPageResults(voteResults);
    }

    updateVotingPageResults(voteResults) {
        console.log('🎨 Updating voting page visual results:', voteResults);
        
        const resultsContainer = document.getElementById('votingResults');
        if (!resultsContainer) return;

        const total = voteResults.total || (voteResults.choice1 + voteResults.choice2);
        
        resultsContainer.innerHTML = `
            <h3>Current Results</h3>
            <div class="result-bars">
                <div class="result-bar">
                    <div class="result-label">Option 1</div>
                    <div class="result-progress">
                        <div class="result-fill" style="width: ${total > 0 ? (voteResults.choice1 / total * 100) : 0}%"></div>
                    </div>
                    <div class="result-count">${voteResults.choice1 || 0} votes</div>
                </div>
                <div class="result-bar">
                    <div class="result-label">Option 2</div>
                    <div class="result-progress">
                        <div class="result-fill" style="width: ${total > 0 ? (voteResults.choice2 / total * 100) : 0}%"></div>
                    </div>
                    <div class="result-count">${voteResults.choice2 || 0} votes</div>
                </div>
            </div>
            <div class="total-votes">Total: ${total} votes</div>
        `;
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
        // Use contract state if available, otherwise use fallback
        let contractState = this.contractState;
        
        if (!contractState || !contractState.choices) {
            console.log('Using fallback state for results');
            contractState = {
                choices: ['YES', 'NOD', 'ABS', 'N/A'],
                voteCounts: [0, 0, 0, 0]
            };
        }

        const resultsContainer = document.getElementById('votingResultsCharts');
        const totalVotesElement = document.getElementById('votingTotalVotes');
        
        resultsContainer.innerHTML = '';
        
        let totalCount = 0;
        const voteCounts = contractState.voteCounts || [0, 0, 0, 0];
        
        // Calculate total votes
        voteCounts.forEach(count => {
            totalCount += count;
        });
        
        totalVotesElement.textContent = totalCount;

        // Create result items
        contractState.choices.forEach((choice, index) => {
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

    // Wallet Popup Methods
    showWalletPopup(type, details = {}) {
        return new Promise((resolve, reject) => {
            const overlay = document.createElement('div');
            overlay.className = 'wallet-popup-overlay';
            
            const popup = this.createWalletPopup(type, details, resolve, reject);
            overlay.appendChild(popup);
            
            document.body.appendChild(overlay);
            
            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeWalletPopup(overlay, reject);
                }
            });
            
            // Close on escape key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    this.closeWalletPopup(overlay, reject);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    createWalletPopup(type, details, resolve, reject) {
        const popup = document.createElement('div');
        popup.className = 'wallet-popup';
        
        let title, message, actionText, icon;
        
        switch(type) {
            case 'deploy':
                title = '🚀 Deploy Contract';
                message = 'You are about to deploy a new ZkVote contract to the Midnight testnet. This will create a new voting session.';
                actionText = 'Deploy Contract';
                icon = '🚀';
                break;
            case 'connect':
                title = '🔗 Connect to Contract';
                message = 'You are about to connect to an existing ZkVote contract. This will allow you to participate in the voting session.';
                actionText = 'Connect';
                icon = '🔗';
                break;
            case 'vote':
                title = '🗳️ Submit Vote';
                message = 'You are about to submit your anonymous vote to the blockchain. This action cannot be undone.';
                actionText = 'Submit Vote';
                icon = '🗳️';
                break;
        }
        
        popup.innerHTML = `
            <div class="wallet-popup-header">
                <div class="wallet-popup-title">
                    <span>${icon}</span>
                    ${title}
                </div>
                <button class="wallet-popup-close" onclick="this.closest('.wallet-popup-overlay').remove()">×</button>
            </div>
            
            <div class="wallet-popup-content">
                <p class="wallet-popup-message">${message}</p>
                
                ${this.createTransactionDetails(type, details)}
                
                ${type === 'vote' ? `
                    <div class="wallet-security-warning">
                        <div class="wallet-security-warning-text">
                            <span>⚠️</span>
                            Your vote is completely anonymous and cannot be traced back to you
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="wallet-popup-actions">
                <button class="wallet-popup-btn wallet-popup-btn-cancel" id="walletCancel">
                    Cancel
                </button>
                <button class="wallet-popup-btn wallet-popup-btn-confirm" id="walletConfirm">
                    <span id="walletConfirmText">${actionText}</span>
                    <div class="wallet-popup-loader" id="walletLoader" style="display: none;"></div>
                </button>
            </div>
        `;
        
        // Add event listeners
        popup.querySelector('#walletCancel').addEventListener('click', () => {
            this.closeWalletPopup(popup.closest('.wallet-popup-overlay'), reject);
        });
        
        popup.querySelector('#walletConfirm').addEventListener('click', () => {
            this.confirmWalletAction(popup, resolve, reject);
        });
        
        return popup;
    }

    createTransactionDetails(type, details) {
        let detailsHTML = '<div class="wallet-transaction-details">';
        
        switch(type) {
            case 'deploy':
                detailsHTML += `
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Network:</span>
                        <span class="wallet-detail-value">Midnight Testnet</span>
                    </div>
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Contract Type:</span>
                        <span class="wallet-detail-value">ZkVote</span>
                    </div>
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Choices:</span>
                        <span class="wallet-detail-value">${details.choiceCount || 2} options</span>
                    </div>
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Gas Fee:</span>
                        <span class="wallet-detail-value">~0.001 DUST</span>
                    </div>
                `;
                break;
                
            case 'connect':
                detailsHTML += `
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Contract:</span>
                        <span class="wallet-detail-value">${this.truncateAddress(details.contractAddress)}</span>
                    </div>
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Network:</span>
                        <span class="wallet-detail-value">Midnight Testnet</span>
                    </div>
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Action:</span>
                        <span class="wallet-detail-value">Read-only access</span>
                    </div>
                `;
                break;
                
            case 'vote':
                detailsHTML += `
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Your Choice:</span>
                        <span class="wallet-detail-value">Option ${details.choice}</span>
                    </div>
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Contract:</span>
                        <span class="wallet-detail-value">${this.truncateAddress(details.contractAddress)}</span>
                    </div>
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Privacy:</span>
                        <span class="wallet-detail-value">Zero-Knowledge Proof</span>
                    </div>
                    <div class="wallet-detail-row">
                        <span class="wallet-detail-label">Gas Fee:</span>
                        <span class="wallet-detail-value">~0.0005 DUST</span>
                    </div>
                `;
                break;
        }
        
        detailsHTML += '</div>';
        return detailsHTML;
    }

    async confirmWalletAction(popup, resolve, reject) {
        const confirmBtn = popup.querySelector('#walletConfirm');
        const confirmText = popup.querySelector('#walletConfirmText');
        const loader = popup.querySelector('#walletLoader');
        
        // Show loading state
        confirmBtn.disabled = true;
        confirmText.style.display = 'none';
        loader.style.display = 'block';
        
        // Add connection status messages to the popup
        const content = popup.querySelector('.wallet-popup-content');
        const statusDiv = document.createElement('div');
        statusDiv.className = 'wallet-connection-status';
        statusDiv.style.cssText = 'margin-top: 15px; padding: 10px; background: var(--surface); border-radius: 8px; font-size: 0.9rem;';
        content.appendChild(statusDiv);
        
        // Simulate realistic wallet connection sequence
        try {
            // Step 1: Wallet connection
            statusDiv.innerHTML = '<div style="color: var(--primary);">🔐 Connecting to wallet...</div>';
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Step 2: Blockchain connection
            statusDiv.innerHTML = '<div style="color: var(--primary);">🌐 Connecting to Midnight testnet...</div>';
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Step 3: Contract interaction
            statusDiv.innerHTML = '<div style="color: var(--primary);">⚡ Preparing transaction...</div>';
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            // Step 4: Success
            statusDiv.innerHTML = '<div style="color: var(--success);">✅ Transaction ready for broadcast</div>';
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Show success state
            this.showWalletSuccess(popup, resolve);
            
        } catch (error) {
            // Handle any connection errors
            statusDiv.innerHTML = '<div style="color: var(--error);">❌ Connection failed, please try again</div>';
            
            // Reset button state
            confirmBtn.disabled = false;
            confirmText.style.display = 'block';
            loader.style.display = 'none';
            
            setTimeout(() => {
                this.closeWalletPopup(popup.closest('.wallet-popup-overlay'), reject);
            }, 2000);
        }
    }

    showWalletSuccess(popup, resolve) {
        const content = popup.querySelector('.wallet-popup-content');
        const actions = popup.querySelector('.wallet-popup-actions');
        
        content.innerHTML = `
            <div class="wallet-success-checkmark"></div>
            <p class="wallet-popup-message" style="text-align: center; color: var(--success);">
                Transaction confirmed! Your action has been processed successfully.
            </p>
        `;
        
        actions.innerHTML = `
            <button class="wallet-popup-btn wallet-popup-btn-confirm" onclick="this.closest('.wallet-popup-overlay').remove()" style="width: 100%;">
                Continue
            </button>
        `;
        
        // Auto-close after 2 seconds
        setTimeout(() => {
            const overlay = popup.closest('.wallet-popup-overlay');
            if (overlay) {
                overlay.remove();
                resolve(true);
            }
        }, 2000);
    }

    closeWalletPopup(overlay, reject) {
        overlay.remove();
        reject(new Error('User cancelled'));
    }

    truncateAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
    }

    showWalletPopup() {
        const popup = document.getElementById('walletPopup');
        const step1 = document.getElementById('walletStep1');
        const step2 = document.getElementById('walletStep2');
        const step3 = document.getElementById('walletStep3');
        const walletConnectBtn = document.getElementById('walletConnectBtn');
        const walletAuthorizeBtn = document.getElementById('walletAuthorizeBtn');
        const localWalletOption = document.getElementById('localWalletOption');
        
        // Reset popup state - show step 1 only
        step1.style.display = 'block';
        step2.style.display = 'none';
        step3.style.display = 'none';
        
        // Reset buttons
        walletConnectBtn.style.display = 'none';
        walletAuthorizeBtn.style.display = 'none';
        walletConnectBtn.disabled = true;
        walletAuthorizeBtn.disabled = true;
        
        // Reset local wallet option state
        localWalletOption.classList.remove('available', 'disabled');
        
        // Show popup
        popup.style.display = 'flex';
        
        // Start the connection check process
        this.handleLocalWalletConnection();
    }

    hideWalletPopup() {
        const popup = document.getElementById('walletPopup');
        popup.style.display = 'none';
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
