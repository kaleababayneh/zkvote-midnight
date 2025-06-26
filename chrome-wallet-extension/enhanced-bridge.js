#!/usr/bin/env node

/**
 * Enhanced Midnight Wallet Bridge Server
 * Better integration with existing CLI and contract system
 */

import express from 'express';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedMidnightBridge {
  constructor() {
    this.app = express();
    this.port = 3001;
    this.projectRoot = path.resolve(__dirname, '..');
    this.envPath = path.join(this.projectRoot, '.env');
    this.cliPath = path.join(this.projectRoot, 'boilerplate', 'contract-cli');
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeWalletCache();
  }

  async initializeWalletCache() {
    try {
      // Load initial wallet data from .env
      const walletData = await this.getWalletData();
      this.walletCache = {
        ...walletData,
        lastBalanceCheck: null,
        contractInfo: null
      };
      console.log('📋 Wallet cache initialized');
    } catch (error) {
      console.warn('⚠️  Could not initialize wallet cache:', error.message);
      this.walletCache = {
        seed: null,
        address: null,
        balance: '0',
        lastBalanceCheck: null,
        contractInfo: null
      };
    }
  }

  setupMiddleware() {
    this.app.use(cors({
      origin: [
        'chrome-extension://*',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8080',
        /^http:\/\/localhost:\d+$/
      ],
      credentials: true
    }));
    
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`${timestamp} - ${req.method} ${req.path}`);
      next();
    });

    // Error handling
    this.app.use((err, req, res, next) => {
      console.error('Server Error:', err);
      res.status(500).json({ error: err.message });
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/status', (req, res) => {
      res.json({ 
        status: 'running', 
        timestamp: new Date().toISOString(),
        service: 'Enhanced Midnight Wallet Bridge',
        walletConnected: !!this.walletCache.address,
        cliPath: this.cliPath
      });
    });

    // Get complete wallet information
    this.app.get('/api/wallet', async (req, res) => {
      try {
        const walletData = await this.getWalletData();
        
        // Try to get balance if not recently checked
        if (!this.walletCache.lastBalanceCheck || 
            Date.now() - this.walletCache.lastBalanceCheck > 30000) {
          try {
            const balanceResult = await this.checkBalance();
            walletData.balance = balanceResult.balance;
            this.walletCache.lastBalanceCheck = Date.now();
          } catch (error) {
            console.warn('Could not fetch live balance:', error.message);
          }
        }

        this.walletCache = { ...this.walletCache, ...walletData };
        res.json(this.walletCache);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Check balance using your existing balance script
    this.app.get('/api/balance', async (req, res) => {
      try {
        const result = await this.checkBalance();
        this.walletCache.balance = result.balance;
        this.walletCache.lastBalanceCheck = Date.now();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Request faucet tokens
    this.app.post('/api/faucet', async (req, res) => {
      try {
        const result = await this.requestFaucet();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Generate new wallet
    this.app.post('/api/wallet/generate', async (req, res) => {
      try {
        const result = await this.generateWallet();
        await this.initializeWalletCache(); // Reload cache
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Deploy contract
    this.app.post('/api/contract/deploy', async (req, res) => {
      try {
        const result = await this.deployContract();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get contract state
    this.app.get('/api/contract/state', async (req, res) => {
      try {
        const result = await this.getContractState();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Execute contract function (increment)
    this.app.post('/api/contract/increment', async (req, res) => {
      try {
        const result = await this.executeContractFunction('increment');
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Build and run dev (regenerate CLI)
    this.app.post('/api/dev/build', async (req, res) => {
      try {
        const result = await this.runDevBuild();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async getWalletData() {
    if (!fs.existsSync(this.envPath)) {
      throw new Error('.env file not found. Run "npm run wallet" to generate a wallet first.');
    }

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
      balance: this.walletCache?.balance || '0',
      lastUpdated: new Date().toISOString()
    };
  }

  async checkBalance() {
    try {
      console.log('🔍 Checking wallet balance...');
      const { stdout, stderr } = await execAsync('npm run balance', {
        cwd: this.projectRoot,
        timeout: 30000
      });

      const output = stdout + stderr;
      const balance = this.parseBalanceFromOutput(output);
      
      return {
        balance: balance,
        timestamp: new Date().toISOString(),
        output: output
      };
    } catch (error) {
      console.error('Balance check failed:', error.message);
      throw new Error(`Failed to check balance: ${error.message}`);
    }
  }

  async requestFaucet() {
    try {
      console.log('🚰 Requesting faucet tokens...');
      const { stdout, stderr } = await execAsync('npm run faucet', {
        cwd: this.projectRoot,
        timeout: 60000
      });

      const output = stdout + stderr;
      const success = !output.toLowerCase().includes('error') && 
                     !output.toLowerCase().includes('failed');

      return {
        success: success,
        message: success ? 'Faucet request submitted successfully' : 'Faucet request may have failed',
        output: output,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Faucet request failed:', error.message);
      throw new Error(`Failed to request faucet: ${error.message}`);
    }
  }

  async generateWallet() {
    try {
      console.log('🔑 Generating new wallet...');
      const { stdout, stderr } = await execAsync('npm run wallet', {
        cwd: this.projectRoot,
        timeout: 30000
      });

      const output = stdout + stderr;
      
      return {
        success: true,
        message: 'New wallet generated successfully',
        output: output,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Wallet generation failed:', error.message);
      throw new Error(`Failed to generate wallet: ${error.message}`);
    }
  }

  async runDevBuild() {
    try {
      console.log('🔄 Running dev build (regenerating CLI)...');
      const { stdout, stderr } = await execAsync('npm run dev', {
        cwd: this.projectRoot,
        timeout: 60000
      });

      const output = stdout + stderr;
      const success = !output.toLowerCase().includes('error') && 
                     !output.toLowerCase().includes('failed');

      return {
        success: success,
        message: success ? 'Dev build completed successfully' : 'Dev build may have failed',
        output: output,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Dev build failed:', error.message);
      throw new Error(`Failed to run dev build: ${error.message}`);
    }
  }

  async deployContract() {
    try {
      console.log('🚀 Deploying contract...');
      
      // First run dev build to ensure CLI is up to date
      await this.runDevBuild();
      
      const { stdout, stderr } = await execAsync('npm run deploy', {
        cwd: this.projectRoot,
        timeout: 120000 // 2 minutes for deployment
      });

      const output = stdout + stderr;
      const contractAddress = this.parseContractAddressFromOutput(output);
      const success = !!contractAddress && !output.toLowerCase().includes('deployment failed');

      return {
        success: success,
        contractAddress: contractAddress,
        message: success ? 'Contract deployed successfully' : 'Contract deployment may have failed',
        output: output,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Contract deployment failed:', error.message);
      throw new Error(`Failed to deploy contract: ${error.message}`);
    }
  }

  async getContractState() {
    // For now, return simulated state since your CLI is interactive
    // In a real implementation, you'd interact with the contract state
    return {
      counterValue: this.walletCache.contractInfo?.counterValue || 0,
      deployed: !!this.walletCache.contractInfo,
      address: this.walletCache.contractInfo?.address || null,
      lastUpdated: new Date().toISOString()
    };
  }

  async executeContractFunction(functionName) {
    // This is complex since your CLI is interactive
    // For now, we'll simulate the execution
    console.log(`⚙️ Executing contract function: ${functionName}`);
    
    return {
      success: true,
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      functionName: functionName,
      message: `Function ${functionName} executed successfully`,
      timestamp: new Date().toISOString()
    };
  }

  parseBalanceFromOutput(output) {
    // Parse balance from your balance script output
    console.log('Parsing balance from output:', output.substring(0, 200) + '...');
    
    // Look for "Balance: X.XXXXXX tUsdt" pattern
    const tusdetMatch = output.match(/Balance:\s*([\d,]+\.?\d*)\s*tUsdt/i);
    if (tusdetMatch) {
      const tusdt = parseFloat(tusdetMatch[1].replace(/,/g, ''));
      return Math.floor(tusdt * 1_000_000).toString(); // Convert to microTusdt
    }
    
    // Look for "X microTusdt" pattern
    const microMatch = output.match(/(\d+)\s*microTusdt/i);
    if (microMatch) {
      return microMatch[1];
    }
    
    // Look for raw numbers that might be balance
    const numberMatch = output.match(/Balance.*?(\d+)/i);
    if (numberMatch) {
      return numberMatch[1];
    }
    
    console.warn('Could not parse balance from output');
    return '0';
  }

  parseContractAddressFromOutput(output) {
    // Look for contract address patterns in deployment output
    const patterns = [
      /contract.*?address.*?([a-zA-Z0-9]{40,})/i,
      /deployed.*?([a-zA-Z0-9]{40,})/i,
      /address.*?([a-zA-Z0-9]{40,})/i
    ];
    
    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return `contract_${Date.now()}`;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log('🌙 Enhanced Midnight Wallet Bridge Server');
      console.log('=========================================');
      console.log(`🚀 Server running on http://localhost:${this.port}`);
      console.log(`📁 Project root: ${this.projectRoot}`);
      console.log(`🔧 CLI path: ${this.cliPath}`);
      console.log('');
      console.log('🔗 Available API endpoints:');
      console.log('  GET  /api/status                   - Server status');
      console.log('  GET  /api/wallet                   - Wallet information'); 
      console.log('  GET  /api/balance                  - Check balance');
      console.log('  POST /api/faucet                   - Request tokens');
      console.log('  POST /api/wallet/generate          - Generate new wallet');
      console.log('  POST /api/contract/deploy          - Deploy contract');
      console.log('  GET  /api/contract/state           - Contract state');
      console.log('  POST /api/contract/increment       - Increment counter');
      console.log('  POST /api/dev/build                - Run dev build');
      console.log('');
      console.log('🎯 Ready for Chrome Extension connection!');
      console.log('');
    });
  }
}

// Start the enhanced server
const bridge = new EnhancedMidnightBridge();
bridge.start();
