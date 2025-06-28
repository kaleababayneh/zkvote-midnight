import express from 'express';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to the CLI
const CLI_PATH = path.join(__dirname, '../../boilerplate/contract-cli');

// Mock wallet status for now
let walletConnected = true;

// Store for contract deployments (in a real app, this would be in a database)
const contractStore = new Map();

// Utility function to run CLI commands with input
function runCLIWithInput(inputs) {
    return new Promise((resolve, reject) => {
        const process = spawn('node', [
            '--experimental-specifier-resolution=node', 
            '--loader', 'ts-node/esm', 
            'src/zkvote-cli.ts'
        ], {
            cwd: CLI_PATH,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';
        let currentInputIndex = 0;

        process.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('CLI Output:', text);

            // Auto-respond to CLI prompts
            if (currentInputIndex < inputs.length) {
                const currentInput = inputs[currentInputIndex];
                
                if (text.includes(currentInput.prompt)) {
                    setTimeout(() => {
                        console.log('Sending input:', currentInput.response);
                        process.stdin.write(currentInput.response + '\n');
                        currentInputIndex++;
                    }, 100);
                }
            }
        });

        process.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('CLI Error:', data.toString());
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(errorOutput || `Process exited with code ${code}`));
            }
        });

        // Handle timeout
        setTimeout(() => {
            process.kill();
            reject(new Error('CLI operation timed out'));
        }, 60000); // 60 second timeout
    });
}

// Parse deployment output for contract address
function extractContractAddress(output) {
    // Look for various patterns that might contain the contract address
    const patterns = [
        /Contract deployed at address:\s*([A-Za-z0-9]+)/,
        /Deployed to address:\s*([A-Za-z0-9]+)/,
        /Contract address:\s*([A-Za-z0-9]+)/,
        /Address:\s*([A-Za-z0-9]{40,})/,
        /\b([A-Za-z0-9]{40,})\b/
    ];

    for (const pattern of patterns) {
        const match = output.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

// Parse contract state from display output
function parseContractState(output) {
    const lines = output.split('\n');
    const state = {
        choices: [],
        voteCounts: [],
        totalVoters: 0
    };

    let inVotingResults = false;
    
    for (const line of lines) {
        // Look for total voters
        if (line.includes('Total voters:') || line.includes('Total Voters:')) {
            const match = line.match(/Total [Vv]oters:\s*(\d+)/);
            if (match) {
                state.totalVoters = parseInt(match[1]);
            }
        }

        // Look for voting results section
        if (line.includes('=== Voting Results ===') || line.includes('Voting Results')) {
            inVotingResults = true;
            continue;
        }

        // Parse individual choice results
        if (inVotingResults && line.includes(':') && line.includes('votes')) {
            const match = line.match(/(\d+):\s*"([^"]+)"\s*-\s*(\d+)\s*votes?/);
            if (match) {
                const [, index, choice, count] = match;
                const idx = parseInt(index);
                state.choices[idx] = choice;
                state.voteCounts[idx] = parseInt(count);
            }
        }
    }

    return state;
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'ZkVote API Bridge is running',
        timestamp: new Date().toISOString()
    });
});

// Wallet status
app.get('/api/wallet/status', async (req, res) => {
    res.json({
        success: true,
        connected: walletConnected,
        wallet: walletConnected ? {
            address: 'mock-wallet-address',
            balance: '1000.00'
        } : null
    });
});

// Connect wallet
app.post('/api/wallet/connect', async (req, res) => {
    walletConnected = true;
    res.json({
        success: true,
        wallet: {
            address: 'mock-wallet-address',
            balance: '1000.00'
        }
    });
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

        console.log('Deploying contract with choices:', choices);

        // Prepare CLI inputs for deployment
        const inputs = [
            { prompt: 'Which would you like to do?', response: '1' }, // Deploy new contract
            { prompt: 'Enter choice A (3 chars):', response: choices[0] },
            { prompt: 'Enter choice B (3 chars):', response: choices[1] },
            { prompt: 'Enter choice C (3 chars):', response: choices[2] },
            { prompt: 'Enter choice D (3 chars):', response: choices[3] },
            { prompt: 'Which would you like to do?', response: '5' }  // Exit
        ];

        const output = await runCLIWithInput(inputs);
        const contractAddress = extractContractAddress(output);

        if (contractAddress) {
            // Store contract info
            contractStore.set(contractAddress, {
                choices: choices,
                deployedAt: new Date().toISOString()
            });

            res.json({
                success: true,
                contractAddress: contractAddress,
                choices: choices
            });
        } else {
            throw new Error('Failed to extract contract address from CLI output');
        }

    } catch (error) {
        console.error('Deploy error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Get contract state
app.get('/api/contract/state/:address', async (req, res) => {
    try {
        const { address } = req.params;
        console.log('Getting state for contract:', address);

        // Prepare CLI inputs for state display
        const inputs = [
            { prompt: 'Which would you like to do?', response: '2' }, // Join existing contract
            { prompt: 'What is the contract address', response: address },
            { prompt: 'Which would you like to do?', response: '4' }, // Display state
            { prompt: 'Which would you like to do?', response: '5' }  // Exit
        ];

        const output = await runCLIWithInput(inputs);
        const state = parseContractState(output);

        res.json({
            success: true,
            state: state
        });

    } catch (error) {
        console.error('State retrieval error:', error);
        res.json({
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

        console.log(`Submitting vote: contract=${contractAddress}, choice=${choiceIndex}, secret=${secretKey}`);

        // Prepare CLI inputs for voting
        const inputs = [
            { prompt: 'Which would you like to do?', response: '2' }, // Join existing contract
            { prompt: 'What is the contract address', response: contractAddress },
            { prompt: 'Which would you like to do?', response: '2' }, // Cast a vote
            { prompt: 'Enter your secret voting key (5 chars):', response: secretKey },
            { prompt: 'Enter choice index (0-3):', response: choiceIndex.toString() },
            { prompt: 'Which would you like to do?', response: '5' }  // Exit
        ];

        const output = await runCLIWithInput(inputs);

        // Check for success indicators
        if (output.includes('Vote submitted!') || output.includes('Transaction') || output.includes('added in block')) {
            res.json({
                success: true,
                message: 'Vote submitted successfully'
            });
        } else {
            throw new Error('Vote submission may have failed - no clear success confirmation');
        }

    } catch (error) {
        console.error('Vote error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ZkVote API Bridge running on http://localhost:${PORT}`);
    console.log(`📁 CLI Path: ${CLI_PATH}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  /api/health              - Health check');
    console.log('  GET  /api/wallet/status       - Check wallet status');
    console.log('  POST /api/wallet/connect      - Connect wallet');
    console.log('  POST /api/contract/deploy     - Deploy new voting contract');
    console.log('  GET  /api/contract/state/:id  - Get contract state');
    console.log('  POST /api/contract/vote       - Submit a vote');
});

export default app;
