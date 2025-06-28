import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to the CLI
const CLI_PATH = path.join(__dirname, '../../boilerplate/contract-cli');

// Helper function to execute CLI operations using the new api-cli
function executeAPIOperation(operation, params = []) {
    return new Promise((resolve, reject) => {
        console.log(`Executing operation: ${operation} with params:`, params);
        
        // Execute using ts-node with better error handling and safer options
        const tsNode = spawn('node', [
            '--loader', 'ts-node/esm',
            '--no-warnings=ExperimentalWarning',
            'src/api-cli.ts',
            operation,
            ...params
        ], {
            cwd: CLI_PATH,
            env: { 
                ...process.env, 
                TS_NODE_ESM: 'true',
                NODE_OPTIONS: '--loader ts-node/esm --no-warnings=ExperimentalWarning'
            },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        tsNode.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('CLI Output:', text);
        });

        tsNode.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            console.error('CLI Error:', text);
        });

        tsNode.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(errorOutput || `Process exited with code ${code}`));
            }
        });

        // Timeout after 5 minutes (increased from 2 minutes)
        setTimeout(() => {
            tsNode.kill();
            reject(new Error('Operation timed out after 5 minutes'));
        }, 300000);
    });
}

// Generate appropriate TypeScript code for each operation
function generateAPIScript(operation, params) {
    const baseImports = `
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

import * as api from './src/simple-api.js';
import { TestnetRemoteConfig } from './src/config.js';

async function main() {
    try {
        // Initialize configuration
        const config = new TestnetRemoteConfig();
        
        // Build wallet using environment seed
        const seedPhrase = process.env.WALLET_SEED;
        if (!seedPhrase) {
            throw new Error('WALLET_SEED environment variable is required');
        }
        
        console.log('Building wallet...');
        const wallet = await api.buildWalletAndWaitForFunds(config, seedPhrase, '');
        console.log('Configuring providers...');
        const providers = await api.configureProviders(wallet, config);
        console.log('Ready for operation...');
`;

    switch (operation) {
        case 'deploy':
            return baseImports + `
        // Deploy contract
        console.log('Deploying contract with choices: ${params.choices.join(', ')}');
        const deployResult = await api.deploy(
            providers,
            { secretKey: new Uint8Array(32).fill(1) },
            "${params.choices[0]}",
            "${params.choices[1]}",
            "${params.choices[2]}",
            "${params.choices[3]}"
        );
        
        const contractAddress = deployResult.deployTxData.public.contractAddress;
        console.log('CONTRACT_ADDRESS:' + contractAddress);
        
        await wallet.close();
        
    } catch (error) {
        console.error('ERROR:' + error.message);
        process.exit(1);
    }
}

main();
`;

        case 'state':
            return baseImports + `
        // Get contract state
        console.log('Getting state for contract: ${params.contractAddress}');
        const contract = await api.joinContract(providers, "${params.contractAddress}");
        
        const ledgerState = await api.getZkvoteLedgerState(providers, "${params.contractAddress}");
        
        if (!ledgerState) {
            throw new Error('Contract not found');
        }
        
        // Output state information
        console.log('TOTAL_VOTERS:' + ledgerState.numberOfVoters);
        
        // Parse choices and vote counts
        try {
            const choicesIterator = ledgerState.choices[Symbol.iterator]();
            let result = choicesIterator.next();
            
            while (!result.done) {
                const [index, choiceBytes] = result.value;
                const choiceLabel = new TextDecoder().decode(choiceBytes);
                
                let voteCount = 0;
                if (ledgerState.voteCounts.member(index)) {
                    voteCount = Number(ledgerState.voteCounts.lookup(index).read());
                }
                
                console.log('CHOICE_' + index + ':' + choiceLabel + ':' + voteCount);
                result = choicesIterator.next();
            }
        } catch (error) {
            console.log('ERROR_PARSING_STATE:' + error.message);
        }
        
        await wallet.close();
        
    } catch (error) {
        console.error('ERROR:' + error.message);
        process.exit(1);
    }
}

main();
`;

        case 'vote':
            return baseImports + `
        // Submit vote
        console.log('Submitting vote for contract: ${params.contractAddress}');
        const contract = await api.joinContract(providers, "${params.contractAddress}");
        
        const txId = await api.voteFor(
            providers,
            contract,
            "${params.secretKey}",
            ${params.choiceIndex}
        );
        
        console.log('VOTE_SUCCESS:' + txId);
        
        await wallet.close();
        
    } catch (error) {
        console.error('ERROR:' + error.message);
        process.exit(1);
    }
}

main();
`;

        default:
            throw new Error('Unknown operation: ' + operation);
    }
}

// Parse CLI output
function parseAPIOutput(operation, output) {
    const lines = output.split('\n');
    
    switch (operation) {
        case 'deploy':
            for (const line of lines) {
                if (line.startsWith('CONTRACT_ADDRESS:')) {
                    return { contractAddress: line.substring('CONTRACT_ADDRESS:'.length) };
                }
            }
            throw new Error('Contract address not found in output');
            
        case 'state':
            const state = { choices: [], voteCounts: [], totalVoters: 0 };
            
            for (const line of lines) {
                if (line.startsWith('TOTAL_VOTERS:')) {
                    state.totalVoters = parseInt(line.substring('TOTAL_VOTERS:'.length));
                } else if (line.startsWith('CHOICE_')) {
                    const match = line.match(/CHOICE_(\d+):([^:]+):(\d+)/);
                    if (match) {
                        const [, index, choice, count] = match;
                        state.choices[parseInt(index)] = choice;
                        state.voteCounts[parseInt(index)] = parseInt(count);
                    }
                }
            }
            
            return state;
            
        case 'vote':
            for (const line of lines) {
                if (line.startsWith('VOTE_SUCCESS:')) {
                    return { txId: line.substring('VOTE_SUCCESS:'.length) };
                }
            }
            throw new Error('Vote success confirmation not found in output');
    }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'ZkVote Simple API Server is running',
        timestamp: new Date().toISOString()
    });
});

// Wallet status
app.get('/api/wallet/status', (req, res) => {
    res.json({
        success: true,
        connected: true,
        wallet: {
            address: 'wallet-connected',
            balance: '1000.00'
        }
    });
});

// Connect wallet
app.post('/api/wallet/connect', (req, res) => {
    res.json({
        success: true,
        wallet: {
            address: 'wallet-connected',
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

        for (const choice of choices) {
            if (!choice || choice.length !== 3) {
                return res.json({
                    success: false,
                    error: 'Each choice must be exactly 3 characters'
                });
            }
        }

        console.log('🚀 Deploying contract with choices:', choices);
        
        const output = await executeAPIOperation('deploy', choices);
        const result = parseAPIOutput('deploy', output);
        
        res.json({
            success: true,
            contractAddress: result.contractAddress,
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

        const output = await executeAPIOperation('state', [address]);
        const state = parseAPIOutput('state', output);
        
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

        const output = await executeAPIOperation('vote', [
            contractAddress,
            choiceIndex.toString()
        ]);
        
        const result = parseAPIOutput('vote', output);
        
        res.json({
            success: true,
            txId: result.txId,
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
    console.log(`🚀 ZkVote Simple API Server running on http://localhost:${PORT}`);
    console.log('📁 CLI Path:', CLI_PATH);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  /api/health                    - Health check');
    console.log('  GET  /api/wallet/status             - Check wallet status');
    console.log('  POST /api/wallet/connect            - Connect wallet');
    console.log('  POST /api/contract/deploy           - Deploy new voting contract');
    console.log('  GET  /api/contract/state/:address   - Get contract state');
    console.log('  POST /api/contract/vote             - Submit a vote');
    console.log('');
    console.log('✅ Ready to handle requests');
});

export default app;
