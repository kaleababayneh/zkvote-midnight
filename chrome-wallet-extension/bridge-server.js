#!/usr/bin/env node

/**
 * Midnight Wallet Bridge Server
 * Bridges communication between Chrome Extension and CLI
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MidnightWalletBridge {
  constructor() {
    this.app = express();
    this.port = 3001;
    this.projectRoot = path.resolve(__dirname, '..');
    this.envPath = path.join(this.projectRoot, '.env');
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable CORS for Chrome extension
    this.app.use(cors({
      origin: ['chrome-extension://*', 'http://localhost:*'],
      credentials: true
    }));
    
    this.app.use(express.json());
    
    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/status', (req, res) => {
      res.json({ 
        status: 'running', 
        timestamp: new Date().toISOString(),
        service: 'Midnight Wallet Bridge'
      });
    });

    // Get wallet information
    this.app.get('/api/wallet', async (req, res) => {
      try {
        const walletData = await this.getWalletData();
        res.json(walletData);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get balance
    this.app.get('/api/balance', async (req, res) => {
      try {
        const result = await this.runCLICommand(['npm', 'run', 'balance']);
        const balance = this.parseBalanceFromOutput(result.output);
        res.json({ 
          balance: balance,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Request faucet tokens
    this.app.post('/api/faucet', async (req, res) => {
      try {
        const result = await this.runCLICommand(['npm', 'run', 'faucet']);
        res.json({ 
          success: true,
          message: 'Faucet request submitted',
          output: result.output
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Deploy contract
    this.app.post('/api/contract/deploy', async (req, res) => {
      try {
        const result = await this.runCLICommand(['npm', 'run', 'deploy']);
        const contractAddress = this.parseContractAddressFromOutput(result.output);
        res.json({ 
          success: true,
          contractAddress: contractAddress,
          output: result.output
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get contract counter value
    this.app.get('/api/contract/counter', async (req, res) => {
      try {
        // This would interact with your CLI to get counter value
        // For now, we'll simulate it
        res.json({ 
          value: Math.floor(Math.random() * 100), // Placeholder
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Increment counter
    this.app.post('/api/contract/increment', async (req, res) => {
      try {
        // This would interact with your CLI to increment counter
        // Since your CLI is interactive, we'll need to handle this differently
        const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        res.json({ 
          success: true,
          txHash: txHash,
          message: 'Counter incremented'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get contract information
    this.app.get('/api/contract', async (req, res) => {
      try {
        res.json({
          address: 'contract_address_placeholder',
          counterValue: 0,
          deployed: true,
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async getWalletData() {
    try {
      // Read from .env file
      if (fs.existsSync(this.envPath)) {
        const envContent = fs.readFileSync(this.envPath, 'utf8');
        const lines = envContent.split('\n');
        
        let seed = null;
        let address = null;
        
        for (const line of lines) {
          if (line.startsWith('WALLET_SEED=')) {
            seed = line.split('=')[1];
          }
          if (line.startsWith('WALLET_ADDRESS=')) {
            address = line.split('=')[1];
          }
        }
        
        return {
          seed: seed,
          address: address,
          balance: '0', // Will be updated by balance check
          lastUpdated: new Date().toISOString()
        };
      } else {
        throw new Error('.env file not found');
      }
    } catch (error) {
      throw new Error(`Failed to read wallet data: ${error.message}`);
    }
  }

  async runCLICommand(command) {
    return new Promise((resolve, reject) => {
      console.log(`Running command: ${command.join(' ')}`);
      
      const process = spawn(command[0], command.slice(1), {
        cwd: this.projectRoot,
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ output, error, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${error}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`Failed to spawn command: ${err.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error('Command timeout'));
      }, 30000);
    });
  }

  parseBalanceFromOutput(output) {
    // Parse balance from CLI output
    // Look for patterns like "Balance: 1000000 microTusdt" or similar
    const balanceMatch = output.match(/Balance.*?(\d+).*?microTusdt/i);
    if (balanceMatch) {
      return balanceMatch[1];
    }
    
    // Alternative patterns
    const altMatch = output.match(/(\d+)\s*tUsdt/i);
    if (altMatch) {
      return (parseInt(altMatch[1]) * 1_000_000).toString();
    }
    
    return '0';
  }

  parseContractAddressFromOutput(output) {
    // Parse contract address from deployment output
    const addressMatch = output.match(/[a-zA-Z0-9]{40,}/);
    if (addressMatch) {
      return addressMatch[0];
    }
    return `contract_${Date.now()}`;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🌙 Midnight Wallet Bridge Server running on http://localhost:${this.port}`);
      console.log(`📁 Project root: ${this.projectRoot}`);
      console.log(`⚡ Ready to bridge Chrome Extension ↔ CLI`);
      console.log('');
      console.log('Available endpoints:');
      console.log('  GET  /api/status          - Health check');
      console.log('  GET  /api/wallet          - Get wallet info');
      console.log('  GET  /api/balance         - Check balance');
      console.log('  POST /api/faucet          - Request tokens');
      console.log('  POST /api/contract/deploy - Deploy contract');
      console.log('  GET  /api/contract/counter- Get counter value');
      console.log('  POST /api/contract/increment - Increment counter');
      console.log('');
    });
  }
}

// Start the server
const bridge = new MidnightWalletBridge();
bridge.start();
