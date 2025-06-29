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
        
        // Execute using ts-node with newer syntax
        const tsNode = spawn('node', [
            '--import', 'data:text/javascript,import { register } from "node:module"; import { pathToFileURL } from "node:url"; register("ts-node/esm", pathToFileURL("./"));',
            'src/api-cli.ts',
            operation,
            ...params
        ], {
            cwd: CLI_PATH,
            env: { ...process.env },
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

        // Timeout after 5 minutes
        setTimeout(() => {
            tsNode.kill();
            reject(new Error('Operation timed out after 5 minutes'));
        }, 300000);
    });
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
app.get('/api/status', (req, res) => {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Deploy a new contract
app.post('/api/deploy', async (req, res) => {
    try {
        const { choices = ['A', 'B', 'C', 'D'] } = req.body;
        
        if (!Array.isArray(choices) || choices.length !== 4) {
            return res.status(400).json({ error: 'Choices must be an array of 4 strings' });
        }
        
        console.log('Deploying contract with choices:', choices);
        
        // Execute deploy operation
        const output = await executeAPIOperation('deploy', choices);
        const result = parseAPIOutput('deploy', output);
        
        res.json({
            success: true,
            contractAddress: result.contractAddress,
            choices
        });
        
    } catch (error) {
        console.error('Deploy error:', error);
        res.status(500).json({ 
            error: 'Failed to deploy contract', 
            details: error.message 
        });
    }
});

// Get contract state
app.get('/api/contract/:address/state', async (req, res) => {
    try {
        const { address } = req.params;
        
        if (!address) {
            return res.status(400).json({ error: 'Contract address is required' });
        }
        
        console.log('Getting state for contract:', address);
        
        // Execute state operation
        const output = await executeAPIOperation('state', [address]);
        const result = parseAPIOutput('state', output);
        
        res.json({
            success: true,
            contractAddress: address,
            totalVoters: result.totalVoters,
            choices: result.choices,
            voteCounts: result.voteCounts
        });
        
    } catch (error) {
        console.error('State error:', error);
        res.status(500).json({ 
            error: 'Failed to get contract state', 
            details: error.message 
        });
    }
});

// Vote on a contract
app.post('/api/contract/:address/vote', async (req, res) => {
    try {
        const { address } = req.params;
        const { choice } = req.body;
        
        if (!address) {
            return res.status(400).json({ error: 'Contract address is required' });
        }
        
        if (choice === undefined || choice < 0 || choice > 3) {
            return res.status(400).json({ error: 'Choice must be a number between 0 and 3' });
        }
        
        
        // Execute vote operation
        const output = await executeAPIOperation('vote', [address, choice.toString()]);
        const result = parseAPIOutput('vote', output);
        
        res.json({
            success: true,
            contractAddress: address,
            choice,
            txId: result.txId
        });
        
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ 
            error: 'Failed to vote', 
            details: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ZkVote API Server running on http://localhost:${PORT}`);
    console.log(`📡 Available endpoints:`);
    console.log(`   GET  /api/status`);
    console.log(`   POST /api/deploy`);
    console.log(`   GET  /api/contract/:address/state`);
    console.log(`   POST /api/contract/:address/vote`);
});
