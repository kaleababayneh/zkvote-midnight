#!/usr/bin/env node

/**
 * Enhanced Midnight Wallet Bridge Server
 * Robust CLI execution with isolated processes
 */

import express from 'express';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedMidnightBridge {
  constructor() {
    this.app = express();
    this.port = 3001;
    this.projectRoot = path.resolve(__dirname, '..'); // scaffold-midnight root
    this.envPath = path.join(this.projectRoot, '.env');
    this.cliPath = path.join(this.projectRoot, 'boilerplate', 'contract-cli');
    this.scriptsPath = path.join(this.projectRoot, 'boilerplate', 'scripts');
    
    // Log paths for debugging
    console.log('📁 Project root (where npm run deploy works):', this.projectRoot);
    console.log('📁 CLI path (for testnet commands):', this.cliPath);
    console.log('📁 Scripts path:', this.scriptsPath);
    
    // Command queue to handle sequential execution
    this.commandQueue = [];
    this.isProcessingQueue = false;
    this.runningProcesses = new Map();
    
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

  // Execute command in isolated process
  async executeInIsolatedProcess(command, workingDir = null, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const processId = Date.now() + Math.random().toString(36).substr(2, 9);
      const cwd = workingDir || this.cliPath;
      
      console.log(`🚀 [${processId}] Starting command: ${command}`);
      console.log(`📁 [${processId}] Working directory: ${cwd}`);

      const childProcess = exec(command, {
        cwd: cwd,
        timeout: timeout,
        env: { ...process.env, FORCE_COLOR: '0' },
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      this.runningProcesses.set(processId, childProcess);

      let output = '';
      let errorOutput = '';

      childProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log(`📤 [${processId}] ${chunk.trim()}`);
      });

      childProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.log(`📤 [${processId}] ERROR: ${chunk.trim()}`);
      });

      childProcess.on('close', (code) => {
        this.runningProcesses.delete(processId);
        console.log(`✅ [${processId}] Process completed with code: ${code}`);
        
        if (code === 0) {
          resolve({
            success: true,
            output: output,
            errorOutput: errorOutput,
            exitCode: code,
            processId: processId
          });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${errorOutput || output}`));
        }
      });

      childProcess.on('error', (err) => {
        this.runningProcesses.delete(processId);
        console.error(`❌ [${processId}] Process error: ${err.message}`);
        reject(new Error(`Failed to execute command: ${err.message}`));
      });
    });
  }

  // Queue system for sequential command execution
  async queueCommand(commandFunction, priority = 0) {
    return new Promise((resolve, reject) => {
      this.commandQueue.push({
        execute: commandFunction,
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      });

      // Sort queue by priority (higher first) then by timestamp
      this.commandQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });

      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.commandQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.commandQueue.length > 0) {
      const { execute, resolve, reject } = this.commandQueue.shift();
      
      try {
        const result = await execute();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/status', (req, res) => {
      res.json({ 
        status: 'running', 
        timestamp: new Date().toISOString(),
        service: 'Enhanced Midnight Wallet Bridge',
        walletConnected: !!this.walletCache.address,
        cliPath: this.cliPath,
        runningProcesses: Array.from(this.runningProcesses.keys()),
        queueLength: this.commandQueue.length
      });
    });

    // Get complete wallet information
    this.app.get('/api/wallet', async (req, res) => {
      try {
        const walletData = await this.getWalletData();
        this.walletCache = { ...this.walletCache, ...walletData };
        res.json(this.walletCache);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Deploy contract - HIGH PRIORITY ISOLATED EXECUTION
    this.app.post('/api/contract/deploy', async (req, res) => {
      try {
        console.log('🚀 Starting contract deployment...');
        
        const result = await this.queueCommand(async () => {
          // Run deploy from the root scaffold-midnight directory, not CLI subdirectory
          return await this.executeInIsolatedProcess('npm run deploy', this.projectRoot, 120000); // 2 minute timeout
        }, 1); // High priority
        
        // Parse contract address from output
        const contractAddress = this.parseContractAddressFromOutput(result.output);
        
        // Update cache
        this.walletCache.contractInfo = {
          address: contractAddress,
          deployed: true,
          deployedAt: new Date().toISOString()
        };
        
        res.json({
          success: true,
          contractAddress: contractAddress,
          output: result.output,
          processId: result.processId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Contract deployment failed:', error.message);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Execute contract function (increment)
    this.app.post('/api/contract/increment', async (req, res) => {
      try {
        console.log('⚡ Incrementing counter...');
        
        const result = await this.queueCommand(async () => {
          // Use CLI path for testnet-remote command
          return await this.executeInIsolatedProcess('npm run testnet-remote', this.cliPath, 90000);
        });
        
        const txHash = this.parseTxHashFromOutput(result.output);
        
        res.json({
          success: true,
          txHash: txHash,
          output: result.output,
          processId: result.processId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Contract increment failed:', error.message);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Request faucet tokens
    this.app.post('/api/faucet', async (req, res) => {
      try {
        console.log('💰 Requesting faucet tokens...');
        
        const result = await this.queueCommand(async () => {
          // Run faucet from root directory
          return await this.executeInIsolatedProcess('npm run faucet', this.projectRoot, 60000);
        });
        
        res.json({
          success: true,
          message: 'Faucet request completed',
          output: result.output,
          processId: result.processId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Faucet request failed:', error.message);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Check balance
    this.app.get('/api/balance', async (req, res) => {
      try {
        console.log('💳 Checking balance...');
        
        const result = await this.queueCommand(async () => {
          // Run balance from root directory
          return await this.executeInIsolatedProcess('npm run balance', this.projectRoot, 30000);
        });
        
        const balance = this.parseBalanceFromOutput(result.output);
        this.walletCache.balance = balance;
        this.walletCache.lastBalanceCheck = Date.now();
        
        res.json({
          success: true,
          balance: balance,
          output: result.output,
          processId: result.processId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Balance check failed:', error.message);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Generate new wallet
    this.app.post('/api/wallet/generate', async (req, res) => {
      try {
        console.log('🔑 Generating new wallet...');
        
        const result = await this.queueCommand(async () => {
          // Run wallet generation from root directory
          return await this.executeInIsolatedProcess('npm run wallet', this.projectRoot, 30000);
        }, 1); // High priority
        
        // Reload wallet cache after generation
        await this.initializeWalletCache();
        
        res.json({
          success: true,
          message: 'Wallet generated successfully',
          output: result.output,
          processId: result.processId,
          walletData: this.walletCache,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Wallet generation failed:', error.message);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get contract state
    this.app.get('/api/contract/state', async (req, res) => {
      try {
        res.json({
          success: true,
          state: this.walletCache.contractInfo || { deployed: false },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Kill running process (emergency stop)
    this.app.post('/api/kill/:processId', (req, res) => {
      const { processId } = req.params;
      
      if (this.runningProcesses.has(processId)) {
        const process = this.runningProcesses.get(processId);
        process.kill('SIGTERM');
        this.runningProcesses.delete(processId);
        
        res.json({
          success: true,
          message: `Process ${processId} terminated`,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: `Process ${processId} not found`,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get running processes
    this.app.get('/api/processes', (req, res) => {
      const processes = Array.from(this.runningProcesses.keys());
      res.json({
        success: true,
        runningProcesses: processes,
        count: processes.length,
        queueLength: this.commandQueue.length,
        timestamp: new Date().toISOString()
      });
    });
  }

  async getWalletData() {
    if (!fs.existsSync(this.envPath)) {
      throw new Error('.env file not found. Generate a wallet first.');
    }

    const envContent = fs.readFileSync(this.envPath, 'utf8');
    const lines = envContent.split('\n');
    
    let seed = null;
    let address = null;
    
    for (const line of lines) {
      if (line.startsWith('WALLET_SEED=')) {
        seed = line.split('=')[1]?.replace(/"/g, '');
      }
      if (line.startsWith('WALLET_ADDRESS=')) {
        address = line.split('=')[1]?.replace(/"/g, '');
      }
    }
    
    return {
      seed: seed,
      address: address,
      balance: this.walletCache?.balance || '0',
      lastUpdated: new Date().toISOString()
    };
  }

  parseBalanceFromOutput(output) {
    // Parse balance from CLI output
    const balanceMatch = output.match(/Balance.*?(\d+).*?(?:micro)?[tT]usdt/i);
    if (balanceMatch) {
      return balanceMatch[1];
    }
    
    const altMatch = output.match(/(\d+)\s*[tT][uU]sdt/i);
    if (altMatch) {
      return (parseInt(altMatch[1]) * 1_000_000).toString();
    }

    const tUsdtMatch = output.match(/(\d+(?:\.\d+)?)\s*tUsdt/i);
    if (tUsdtMatch) {
      return (parseFloat(tUsdtMatch[1]) * 1_000_000).toString();
    }
    
    return '0';
  }

  parseContractAddressFromOutput(output) {
    const addressMatch = output.match(/Contract\s+(?:deployed|address).*?([a-fA-F0-9]{40,})/i);
    if (addressMatch) {
      return addressMatch[1];
    }

    const hexMatch = output.match(/0x[a-fA-F0-9]{40}/);
    if (hexMatch) {
      return hexMatch[0];
    }

    const fallbackMatch = output.match(/[a-fA-F0-9]{40,}/);
    if (fallbackMatch) {
      return fallbackMatch[0];
    }
    
    return `contract_${Date.now()}`;
  }

  parseTxHashFromOutput(output) {
    const txMatch = output.match(/(?:tx|transaction|hash).*?([a-fA-F0-9]{64})/i);
    if (txMatch) {
      return txMatch[1];
    }

    const hexMatch = output.match(/0x[a-fA-F0-9]{64}/);
    if (hexMatch) {
      return hexMatch[0];
    }

    const hashMatch = output.match(/[a-fA-F0-9]{64}/);
    if (hashMatch) {
      return hashMatch[0];
    }
    
    return `tx_${Date.now()}`;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log('🌙 Enhanced Midnight Wallet Bridge Server');
      console.log(`🚀 Server running on http://localhost:${this.port}`);
      console.log(`📁 Project root: ${this.projectRoot}`);
      console.log(`🛠️  CLI path: ${this.cliPath}`);
      console.log(`📜 Scripts path: ${this.scriptsPath}`);
      console.log('⚡ Ready to execute isolated commands');
      console.log('');
      console.log('Available endpoints:');
      console.log('  GET  /api/status                  - Health check');
      console.log('  GET  /api/wallet                  - Get wallet info');
      console.log('  GET  /api/balance                 - Check balance');
      console.log('  POST /api/faucet                  - Request tokens');
      console.log('  POST /api/wallet/generate         - Generate wallet');
      console.log('  POST /api/contract/deploy         - Deploy contract');
      console.log('  GET  /api/contract/state          - Get contract state');
      console.log('  POST /api/contract/increment      - Increment counter');
      console.log('  GET  /api/processes               - List running processes');
      console.log('  POST /api/kill/:processId         - Kill specific process');
      console.log('');
      console.log('✨ Features:');
      console.log('  - Isolated process execution');
      console.log('  - Command queue management');
      console.log('  - Process monitoring');
      console.log('  - Timeout protection');
      console.log('');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      
      // Kill all running processes
      for (const [processId, process] of this.runningProcesses) {
        console.log(`🔪 Killing process ${processId}`);
        process.kill('SIGTERM');
      }
      
      process.exit(0);
    });
  }
}

// Start the enhanced bridge server
const bridge = new EnhancedMidnightBridge();
bridge.start();
