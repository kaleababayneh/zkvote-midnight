import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the CLI API functions directly
import dotenv from 'dotenv';

// Configure dotenv to load from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Global state to hold wallet and providers (simulating a session)
let currentSession = null;

// Initialize CLI components
async function initializeSession() {
    if (currentSession) {
        return currentSession;
    }

    try {
        // Dynamic import to handle ES modules properly
        const { default: pino } = await import('pino');
        const { TestnetRemoteConfig } = await import('../../boilerplate/contract-cli/src/config.js');
        const api = await import('../../boilerplate/contract-cli/src/simple-api.js');
        
        const logger = pino({
            level: 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: false,
                    translateTime: 'HH:MM:ss.l',
                    ignore: 'pid,hostname'
                }
            }
        });

        api.setLogger(logger);
        
        const config = new TestnetRemoteConfig();
        
        // Build wallet using environment seed
        const seedPhrase = process.env.WALLET_SEED;
        if (!seedPhrase) {
            throw new Error('WALLET_SEED environment variable is required');
        }
        
        console.log('🔄 Building wallet and configuring providers...');
        const wallet = await api.buildWalletAndWaitForFunds(config, seedPhrase, '');
        const providers = await api.configureProviders(wallet, config);
        
        currentSession = {
            wallet,
            providers,
            config,
            api,
            logger
        };
        
        console.log('✅ Session initialized successfully');
        return currentSession;
        
    } catch (error) {
        console.error('❌ Failed to initialize session:', error);
        throw error;
    }
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'ZkVote API Server is running',
        timestamp: new Date().toISOString(),
        session: currentSession ? 'initialized' : 'not initialized'
    });
});

// Initialize session endpoint
app.post('/api/initialize', async (req, res) => {
    try {
        await initializeSession();
        res.json({
            success: true,
            message: 'Session initialized successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Wallet status
app.get('/api/wallet/status', async (req, res) => {
    try {
        const session = await initializeSession();
        
        res.json({
            success: true,
            connected: true,
            wallet: {
                address: 'wallet-connected',
                balance: '1000.00' // In a real app, get actual balance
            }
        });
    } catch (error) {
        res.json({
            success: false,
            connected: false,
            error: error.message
        });
    }
});

// Connect wallet (already handled in initialization)
app.post('/api/wallet/connect', async (req, res) => {
    try {
        await initializeSession();
        res.json({
            success: true,
            wallet: {
                address: 'wallet-connected',
                balance: '1000.00'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Deploy contract
app.post('/api/contract/deploy', async (req, res) => {
    try {
        const { choices } = req.body;
        
        if (!choices || choices.length !== 4) {
            return res.json({
                success: false,
                error: 'Please provide exactly 4 choices'
            });
        }

        // Validate choices
        for (const choice of choices) {
            if (!choice || choice.length !== 3) {
                return res.json({
                    success: false,
                    error: 'Each choice must be exactly 3 characters'
                });
            }
        }

        console.log('🚀 Deploying contract with choices:', choices);
        
        const session = await initializeSession();
        
        // Deploy the contract using the API
        const deployResult = await session.api.deploy(
            session.providers,
            { secretKey: new Uint8Array(32).fill(1) }, // Mock private state
            choices[0],
            choices[1],
            choices[2],
            choices[3]
        );
        
        const contractAddress = deployResult.deployTxData.public.contractAddress;
        
        console.log('✅ Contract deployed successfully:', contractAddress);
        
        res.json({
            success: true,
            contractAddress: contractAddress,
            choices: choices
        });

    } catch (error) {
        console.error('❌ Deploy error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get contract state
app.get('/api/contract/state/:address', async (req, res) => {
    try {
        const { address } = req.params;
        console.log('📊 Getting state for contract:', address);

        const session = await initializeSession();
        
        // Join the contract first
        const contract = await session.api.joinContract(session.providers, address);
        
        // Get the ledger state
        const ledgerState = await session.api.getZkvoteLedgerState(session.providers, address);
        
        if (!ledgerState) {
            throw new Error('Contract not found or no state available');
        }
        
        // Parse the state into a format the frontend expects
        const state = {
            choices: [],
            voteCounts: [],
            totalVoters: Number(ledgerState.numberOfVoters)
        };
        
        // Extract choices using the iterator
        try {
            const choicesIterator = ledgerState.choices[Symbol.iterator]();
            let result = choicesIterator.next();
            
            while (!result.done) {
                const [index, choiceBytes] = result.value;
                const choiceLabel = new TextDecoder().decode(choiceBytes);
                
                state.choices[Number(index)] = choiceLabel;
                
                // Get vote count for this choice
                let voteCount = 0;
                if (ledgerState.voteCounts.member(index)) {
                    voteCount = Number(ledgerState.voteCounts.lookup(index).read());
                }
                state.voteCounts[Number(index)] = voteCount;
                
                result = choicesIterator.next();
            }
        } catch (error) {
            console.error('Error parsing contract state:', error);
            // Fallback to empty state
        }

        console.log('✅ Contract state retrieved:', state);

        res.json({
            success: true,
            state: state
        });

    } catch (error) {
        console.error('❌ State retrieval error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Submit vote
app.post('/api/contract/vote', async (req, res) => {
    try {
        const { contractAddress, choiceIndex, secretKey } = req.body;

        if (!contractAddress || choiceIndex === undefined || !secretKey) {
            return res.json({
                success: false,
                error: 'Missing required parameters'
            });
        }

        if (secretKey.length !== 5) {
            return res.json({
                success: false,
                error: 'Secret key must be exactly 5 characters'
            });
        }

        console.log(`🗳️ Submitting vote: contract=${contractAddress}, choice=${choiceIndex}`);

        const session = await initializeSession();
        
        // Join the contract first
        const contract = await session.api.joinContract(session.providers, contractAddress);
        
        // Submit the vote
        const txId = await session.api.voteFor(
            session.providers,
            contract,
            secretKey,
            parseInt(choiceIndex)
        );

        console.log('✅ Vote submitted successfully:', txId);

        res.json({
            success: true,
            txId: txId,
            message: 'Vote submitted successfully'
        });

    } catch (error) {
        console.error('❌ Vote error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get vote count for a specific choice
app.get('/api/contract/:address/vote-count/:choice', async (req, res) => {
    try {
        const { address, choice } = req.params;
        const choiceIndex = parseInt(choice);
        
        if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
            return res.json({
                success: false,
                error: 'Choice must be between 0 and 3'
            });
        }

        console.log(`📊 Getting vote count for choice ${choiceIndex} in contract ${address}`);

        const session = await initializeSession();
        
        // Join the contract first
        const contract = await session.api.joinContract(session.providers, address);
        
        // Get the vote count
        const voteCount = await session.api.getVoteCount(
            session.providers,
            contract,
            choiceIndex
        );

        res.json({
            success: true,
            choiceIndex: choiceIndex,
            voteCount: Number(voteCount)
        });

    } catch (error) {
        console.error('❌ Vote count error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 ZkVote API Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  /api/health                      - Health check');
    console.log('  POST /api/initialize                  - Initialize session');
    console.log('  GET  /api/wallet/status               - Check wallet status');
    console.log('  POST /api/wallet/connect              - Connect wallet');
    console.log('  POST /api/contract/deploy             - Deploy new voting contract');
    console.log('  GET  /api/contract/state/:address     - Get contract state');
    console.log('  POST /api/contract/vote               - Submit a vote');
    console.log('  GET  /api/contract/:address/vote-count/:choice - Get vote count');
    console.log('');
    
    // Initialize session on startup
    try {
        console.log('🔄 Initializing session...');
        await initializeSession();
        console.log('✅ API Server ready for requests');
    } catch (error) {
        console.error('❌ Failed to initialize session on startup:', error);
        console.log('⚠️  API Server started but session not initialized');
        console.log('💡 You can initialize manually via POST /api/initialize');
    }
});

export default app;
