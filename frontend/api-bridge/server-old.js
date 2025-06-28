import express from 'express';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
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

// Utility function to execute CLI commands using the simple API directly
async function executeAPICall(operation, params = {}) {
    return new Promise((resolve, reject) => {
        // Create a temporary script that calls the API functions directly
        const script = `
import * as api from './src/simple-api.js';
import { createProviders } from './src/config.js';

async function run() {
    try {
        const providers = await createProviders();
        
        switch ('${operation}') {
            case 'deploy': {
                const result = await api.deploy(providers, null, '${params.choiceA}', '${params.choiceB}', '${params.choiceC}', '${params.choiceD}');
                console.log('SUCCESS:' + JSON.stringify({
                    contractAddress: result.deployTxData.public.contractAddress,
                    choices: ['${params.choiceA}', '${params.choiceB}', '${params.choiceC}', '${params.choiceD}']
                }));
                break;
            }
            
            case 'display': {
                const joined = await api.joinContract(providers, '${params.contractAddress}');
                await api.displayZkvoteState(providers, joined);
                break;
            }
            
            case 'vote': {
                const joined = await api.joinContract(providers, '${params.contractAddress}');
                const txId = await api.voteFor(providers, joined, '${params.secretKey}', ${params.choiceIndex});
                console.log('SUCCESS:' + JSON.stringify({ txId }));
                break;
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('ERROR:' + error.message);
        process.exit(1);
    }
}

run();
        `;
        
        // Write the script to a temporary file and execute it
        const tmpFile = path.join(CLI_PATH, 'tmp_api_call.mjs');
        fs.writeFileSync(tmpFile, script);
        
        const fullCommand = `cd "${CLI_PATH}" && node --experimental-specifier-resolution=node --loader ts-node/esm tmp_api_call.mjs`;
        
        exec(fullCommand, { 
            maxBuffer: 1024 * 1024,
            timeout: 120000 // 2 minutes timeout
        }, (error, stdout, stderr) => {
            // Clean up temp file
            try {
                fs.unlinkSync(tmpFile);
            } catch (e) {
                // Ignore cleanup errors
            }
            
            if (error) {
                console.error('CLI Error:', error);
                console.error('CLI Stderr:', stderr);
                console.error('CLI Stdout:', stdout);
                reject(new Error(stderr || error.message));
                return;
            }
            
            const output = stdout.toString();
            console.log('CLI Output:', output);
            resolve(output);
        });
    });
}

// Parse CLI output for contract deployment
function parseDeploymentOutput(output) {
    const lines = output.split('\n');
    
    // Look for various deployment success patterns
    for (const line of lines) {
        if (line.includes('Contract deployed at address:')) {
            const match = line.match(/Contract deployed at address:\s*(\w+)/);
            if (match) return match[1];
        }
        
        if (line.includes('Deployed to address:')) {
            const match = line.match(/Deployed to address:\s*(\w+)/);
            if (match) return match[1];
        }
        
        if (line.includes('Contract address:')) {
            const match = line.match(/Contract address:\s*(\w+)/);
            if (match) return match[1];
        }
        
        // Look for any address-like string in deployment context
        if (line.includes('Deploy') && line.match(/\b[A-Za-z0-9]{40,}\b/)) {
            const match = line.match(/\b([A-Za-z0-9]{40,})\b/);
            if (match) return match[1];
        }
    }
    
    // Fallback: look for any long alphanumeric string that could be an address
    const addressMatch = output.match(/\b[A-Za-z0-9]{40,}\b/);
    return addressMatch ? addressMatch[0] : null;
}

// Parse CLI output for contract state
function parseContractState(output) {
    const lines = output.split('\n');
    const state = {
        choices: [],
        voteCounts: [],
        totalVoters: 0
    };
    
    // Extract choices and vote counts
    let inVotingResults = false;
    for (const line of lines) {
        if (line.includes('=== Voting Results ===')) {
            inVotingResults = true;
            continue;
        }
        
        if (inVotingResults && line.includes(':')) {
            const match = line.match(/(\d+):\s*"([^"]+)"\s*-\s*(\d+)\s*votes/);
            if (match) {
                const [, index, choice, count] = match;
                state.choices[parseInt(index)] = choice;
                state.voteCounts[parseInt(index)] = parseInt(count);
            }
        }
        
        if (line.includes('Total Voters:')) {
            const match = line.match(/Total Voters:\s*(\d+)/);
            if (match) {
                state.totalVoters = parseInt(match[1]);
            }
        }
    }
    
    return state;
}

// API Routes

// Wallet status check
app.get('/api/wallet/status', async (req, res) => {
    try {
        // For now, we'll assume wallet is always connected if CLI is available
        // In a real implementation, this would check actual wallet status
        res.json({
            success: true,
            connected: true,
            wallet: {
                address: 'wallet-address-placeholder',
                balance: '1000.00'
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

// Connect wallet
app.post('/api/wallet/connect', async (req, res) => {
    try {
        // Simulate wallet connection
        res.json({
            success: true,
            wallet: {
                address: 'wallet-address-placeholder',
                balance: '1000.00'
            }
        });
    } catch (error) {
        res.json({
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
        
        // Validate choices are 3 characters each
        for (const choice of choices) {
            if (!choice || choice.length !== 3) {
                return res.json({
                    success: false,
                    error: 'Each choice must be exactly 3 characters'
                });
            }
        }
        
        console.log('Deploying contract with choices:', choices);
        
        const output = await executeAPICall('deploy', {
            choiceA: choices[0],
            choiceB: choices[1], 
            choiceC: choices[2],
            choiceD: choices[3]
        });
        
        // Parse SUCCESS response
        const successMatch = output.match(/SUCCESS:(.+)/);
        if (successMatch) {
            const result = JSON.parse(successMatch[1]);
            res.json({
                success: true,
                contractAddress: result.contractAddress,
                choices: result.choices
            });
        } else {
            throw new Error('Failed to parse deployment response');
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
        
        const output = await executeAPICall('display', { contractAddress: address });
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
        
        const output = await executeAPICall('vote', { 
            contractAddress, 
            secretKey, 
            choiceIndex 
        });
        
        // Parse SUCCESS response
        const successMatch = output.match(/SUCCESS:(.+)/);
        if (successMatch) {
            const result = JSON.parse(successMatch[1]);
            res.json({
                success: true,
                txId: result.txId,
                message: 'Vote submitted successfully'
            });
        } else if (output.includes('Vote submitted!') || output.includes('Transaction')) {
            res.json({
                success: true,
                message: 'Vote submitted successfully'
            });
        } else {
            throw new Error('Vote submission failed - no success confirmation in output');
        }
        
    } catch (error) {
        console.error('Vote error:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'ZkVote API Bridge is running',
        timestamp: new Date().toISOString()
    });
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
