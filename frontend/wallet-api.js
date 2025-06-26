#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Wallet API Server
 * Provides REST API endpoints for wallet operations
 */
class WalletAPIServer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.envPath = path.join(this.projectRoot, '.env');
    this.app = express();
    this.port = 3003;
    
    // Change working directory to project root for proper module resolution
    process.chdir(this.projectRoot);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Wallet API Server is running' });
    });

    // Get wallet balance and address
    this.app.get('/api/wallet/balance', async (req, res) => {
      try {
        const walletData = await this.getWalletBalance();
        res.json({
          success: true,
          data: walletData
        });
      } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Connect wallet endpoint
    this.app.post('/api/wallet/connect', async (req, res) => {
      try {
        const walletData = await this.getWalletBalance();
        res.json({
          success: true,
          message: 'Wallet connected successfully',
          data: walletData
        });
      } catch (error) {
        console.error('Connection Error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Request tokens endpoint (call the real faucet script)
    this.app.post('/api/wallet/request-tokens', async (req, res) => {
      try {
        const { spawn } = await import('child_process');
        
        // Run the existing request-faucet script
        const faucetScript = path.join(this.projectRoot, 'boilerplate', 'scripts', 'request-faucet.js');
        const child = spawn('node', [faucetScript], {
          cwd: this.projectRoot,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            res.json({
              success: true,
              message: 'Testnet tokens requested successfully',
              output: stdout
            });
          } else {
            res.status(500).json({
              success: false,
              error: `Faucet request failed: ${stderr}`,
              output: stdout
            });
          }
        });
        
        child.on('error', (error) => {
          res.status(500).json({
            success: false,
            error: `Failed to run faucet request: ${error.message}`
          });
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  /**
   * Load environment variables from .env file
   */
  loadEnvironment() {
    if (!fs.existsSync(this.envPath)) {
      throw new Error('.env file not found! Run "npm run generate-key" to create a wallet first');
    }

    dotenv.config({ path: this.envPath });

    const walletSeed = process.env.WALLET_SEED;
    const walletAddress = process.env.WALLET_ADDRESS;

    if (!walletSeed) {
      throw new Error('WALLET_SEED not found in .env file! Run "npm run generate-key" to set up your wallet');
    }

    return { walletSeed, walletAddress };
  }

  /**
   * Get wallet info from .env file (address) and provide placeholder for balance
   * Note: Full balance checking is currently blocked by Midnight SDK ES module compatibility issue
   */
  async getWalletBalance() {
    try {
      // Load environment
      const { walletSeed, walletAddress } = this.loadEnvironment();
      
      if (!walletAddress) {
        throw new Error('WALLET_ADDRESS not found in .env file');
      }
      
      console.log('📍 Wallet address loaded from .env:', walletAddress);
      
      // For now, return the address and a placeholder balance
      // TODO: Once Midnight SDK ES module issue is resolved, implement real balance checking
      return {
        address: walletAddress,
        balance: '0', // Placeholder - real balance checking blocked by SDK issue
        formattedBalance: '0.000000',
        note: 'Real balance checking temporarily disabled due to Midnight SDK ES module compatibility issue'
      };
    } catch (error) {
      console.error('❌ Failed to load wallet info:', error.message);
      throw new Error(`Wallet info loading failed: ${error.message}`);
    }
  }

  /**
   * Format balance for display (microTusdt to Tusdt)
   */
  formatBalance(microBalance) {
    const tusdt = Number(microBalance) / 1_000_000;
    return tusdt.toLocaleString('en-US', { 
      minimumFractionDigits: 6,
      maximumFractionDigits: 6 
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🌙 Midnight Wallet API Server running on http://localhost:${this.port}`);
      console.log(`📋 Available endpoints:`);
      console.log(`   GET  /api/health - Health check`);
      console.log(`   GET  /api/wallet/balance - Get wallet balance`);
      console.log(`   POST /api/wallet/connect - Connect wallet`);
      console.log(`   POST /api/wallet/request-tokens - Request testnet tokens`);
    });
  }
}

// Start server
const server = new WalletAPIServer();
server.start();
