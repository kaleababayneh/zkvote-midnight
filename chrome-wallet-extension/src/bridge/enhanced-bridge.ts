#!/usr/bin/env node

/**
 * Enhanced Midnight Wallet Bridge Server - TypeScript Version
 * Robust CLI execution with isolated processes
 */

import express from 'express';
import cors from 'cors';
import { spawn, exec, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { ProcessInfo, ProcessStatus, APIResponse, WalletData } from '../types';
import { Logger, generateProcessId } from '../shared/utils';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WalletCache {
  seed: string | null;
  address: string | null;
  balance: string;
  lastBalanceCheck: number | null;
  contractInfo: any;
}

interface QueuedCommand {
  id: string;
  command: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class EnhancedMidnightBridge {
  private app: express.Application;
  private port: number = 3001;
  private projectRoot: string;
  private envPath: string;
  private cliPath: string;
  private scriptsPath: string;
  private commandQueue: QueuedCommand[] = [];
  private isProcessingQueue: boolean = false;
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private processStatus: Map<string, ProcessStatus> = new Map();
  private walletCache: WalletCache;
  private logger = Logger;

  constructor() {
    this.app = express();
    this.projectRoot = path.resolve(__dirname, '../..'); // scaffold-midnight root
    this.envPath = path.join(this.projectRoot, '.env');
    this.cliPath = path.join(this.projectRoot, 'boilerplate', 'contract-cli');
    this.scriptsPath = path.join(this.projectRoot, 'boilerplate', 'scripts');
    
    this.logger.log('📁 Project root:', this.projectRoot);
    this.logger.log('📁 CLI path:', this.cliPath);
    this.logger.log('📁 Scripts path:', this.scriptsPath);
    
    this.walletCache = {
      seed: null,
      address: null,
      balance: '0',
      lastBalanceCheck: null,
      contractInfo: null
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeWalletCache();
  }

  private async initializeWalletCache(): Promise<void> {
    try {
      const walletData = await this.getWalletData();
      this.walletCache = {
        ...walletData,
        lastBalanceCheck: null,
        contractInfo: null
      };
      this.logger.log('📋 Wallet cache initialized');
    } catch (error) {
      this.logger.warn('⚠️  Could not initialize wallet cache:', error);
      this.walletCache = {
        seed: null,
        address: null,
        balance: '0',
        lastBalanceCheck: null,
        contractInfo: null
      };
    }
  }

  private setupMiddleware(): void {
    this.app.use(cors({
      origin: [
        'chrome-extension://*',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'http://localhost:8080',
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/
      ],
      credentials: true
    }));
    
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      this.logger.log(`${timestamp} - ${req.method} ${req.path}`);
      next();
    });

    // Error handling
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Server Error:', err);
      res.status(500).json({ error: err.message });
    });
  }

  private async executeCommand(command: string, args: string[], cwd: string, env?: Record<string, string>): Promise<{ processId: string; process: ChildProcess }> {
    const processId = generateProcessId();
    
    this.logger.log(`🚀 [${processId}] Executing: ${command} ${args.join(' ')}`);
    this.logger.log(`📂 [${processId}] Working directory: ${cwd}`);
    
    // Initialize process status
    this.updateProcessStatus(processId, 'pending', 'Starting process...', 0);
    
    const childProcess = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.runningProcesses.set(processId, childProcess);
    
    // Handle process output
    childProcess.stdout?.on('data', (chunk) => {
      const output = chunk.toString();
      this.logger.log(`📤 [${processId}] ${output.trim()}`);
      this.parseAndUpdateStatus(processId, output);
    });

    childProcess.stderr?.on('data', (chunk) => {
      const output = chunk.toString();
      this.logger.error(`❌ [${processId}] ${output.trim()}`);
      this.parseAndUpdateStatus(processId, output);
    });

    // Handle process completion
    childProcess.on('close', (code) => {
      this.logger.log(`✅ [${processId}] Process completed with code: ${code}`);
      this.runningProcesses.delete(processId);
      
      if (code === 0) {
        this.updateProcessStatus(processId, 'completed', 'Process completed successfully!', 100);
      } else {
        this.updateProcessStatus(processId, 'error', `Process failed with code ${code}`, 100);
      }
    });

    return { processId, process: childProcess };
  }

  private updateProcessStatus(processId: string, status: ProcessStatus['status'], message: string, progress: number, txId?: string, error?: string, contractAddress?: string): void {
    const statusData: ProcessStatus = {
      status,
      message,
      progress,
      txId,
      error,
      contractAddress,
      timestamp: Date.now()
    };
    
    this.processStatus.set(processId, statusData);
    this.logger.log(`📊 [${processId}] ${status}: ${message}${progress ? ` (${progress}%)` : ''}${contractAddress ? ` Contract: ${contractAddress}` : ''}`);
  }

  private parseAndUpdateStatus(processId: string, output: string): void {
    // Deployment phases
    if (output.includes('Compiling contract') || output.includes('🔨 Compiling contract')) {
      this.updateProcessStatus(processId, 'running', 'Compiling smart contract...', 15);
    } else if (output.includes('Using cached build') || output.includes('⚡ Using cached build')) {
      this.updateProcessStatus(processId, 'running', 'Using cached build - skipping compilation!', 35);
    } else if (output.includes('CLI files generated') || output.includes('Build cache updated')) {
      this.updateProcessStatus(processId, 'running', 'CLI generation complete', 35);
    } else if (output.includes('Connecting to testnet') || output.includes('🌐 Deploying to testnet')) {
      this.updateProcessStatus(processId, 'running', 'Connecting to Midnight testnet...', 45);
    } else if (output.includes('Deployed contract at address:')) {
      const contractAddress = this.parseContractAddressFromOutput(output);
      this.updateProcessStatus(processId, 'running', 'Contract deployed successfully!', 90, undefined, undefined, contractAddress);
    } else if (output.includes('✅ Auto-exit enabled. Contract operation completed successfully.') ||
               output.includes('📍 Contract Address:')) {
      const contractAddress = this.parseContractAddressFromOutput(output);
      this.updateProcessStatus(processId, 'completed', 'Deployment completed successfully!', 100, undefined, undefined, contractAddress);
      this.logger.log(`🎯 [${processId}] IMMEDIATE COMPLETION DETECTED - marking as completed`);
      
      // Update .env file
      if (contractAddress) {
        this.updateEnvFile('CONTRACT_ADDRESS', contractAddress);
      }
    }
    
    // Increment phases
    else if (output.includes('Auto-executing function: increment') || output.includes('⚡ Executing increment')) {
      this.updateProcessStatus(processId, 'running', 'Executing increment transaction...', 70);
    } else if (output.includes('✅ Counter successfully incremented!')) {
      const txId = this.parseTxHashFromOutput(output);
      this.updateProcessStatus(processId, 'completed', 'Increment completed successfully!', 100, txId);
    }
  }

  private parseContractAddressFromOutput(output: string): string | undefined {
    const addressMatch = output.match(/([0-9a-f]{64})/);
    return addressMatch ? addressMatch[0] : undefined;
  }

  private parseTxHashFromOutput(output: string): string | undefined {
    const txMatch = output.match(/Transaction ID:\s*([0-9a-f]+)/i);
    return txMatch ? txMatch[1] : undefined;
  }

  private updateEnvFile(key: string, value: string): void {
    try {
      let envContent = '';
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }

      const lines = envContent.split('\n');
      let found = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${key}=`)) {
          lines[i] = `${key}=${value}`;
          found = true;
          break;
        }
      }

      if (!found) {
        lines.push(`${key}=${value}`);
      }

      fs.writeFileSync(this.envPath, lines.join('\n'));
      this.logger.log(`✅ Updated .env file with: ${key}`);
    } catch (error) {
      this.logger.error('Error updating .env file:', error);
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/api/status', (req, res) => {
      res.json({
        success: true,
        message: 'Enhanced Midnight Bridge Server is running',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        walletConnected: Boolean(this.walletCache.address),
        contractDeployed: Boolean(this.walletCache.contractInfo?.address)
      });
    });

    // Deploy contract
    this.app.post('/api/contract/deploy', async (req, res) => {
      try {
        const { processId } = await this.executeCommand(
          'node',
          ['deploy-optimized.js'],
          this.scriptsPath
        );

        res.json({
          success: true,
          processId,
          message: 'Deployment started',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Deploy error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Increment counter
    this.app.post('/api/contract/increment', async (req, res) => {
      try {
        const { processId } = await this.executeCommand(
          'node',
          ['increment-optimized.js'],
          this.scriptsPath
        );

        res.json({
          success: true,
          processId,
          message: 'Increment started',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Increment error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Request faucet tokens
    this.app.post('/api/faucet', async (req, res) => {
      try {
        const { processId } = await this.executeCommand(
          'npm',
          ['run', 'faucet'],
          this.projectRoot
        );

        res.json({
          success: true,
          processId,
          message: 'Faucet request started',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Faucet error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Generate wallet
    this.app.post('/api/wallet/generate', async (req, res) => {
      try {
        const { processId } = await this.executeCommand(
          'npm',
          ['run', 'generate-key'],
          this.projectRoot
        );

        res.json({
          success: true,
          processId,
          message: 'Wallet generation started',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Wallet generation error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get wallet balance
    this.app.get('/api/wallet/balance', async (req, res) => {
      try {
        const walletData = await this.getWalletData();
        res.json({
          success: true,
          data: {
            balance: walletData.balance,
            address: walletData.address
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Balance error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get wallet status
    this.app.get('/api/wallet/status', async (req, res) => {
      try {
        const walletData = await this.getWalletData();
        res.json({
          success: true,
          data: walletData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Wallet status error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Join existing contract
    this.app.post('/api/contract/join', async (req, res) => {
      try {
        const { contractAddress } = req.body;
        if (!contractAddress) {
          return res.status(400).json({
            success: false,
            error: 'Contract address is required',
            timestamp: new Date().toISOString()
          });
        }

        // Update .env with the contract address
        this.updateEnvFile('CONTRACT_ADDRESS', contractAddress);

        res.json({
          success: true,
          message: 'Successfully joined contract',
          contractAddress,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        this.logger.error('Join contract error:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get process status
    this.app.get('/api/process/:processId/status', (req, res) => {
      const { processId } = req.params;
      const status = this.processStatus.get(processId);
      
      if (status) {
        res.json({
          success: true,
          ...status
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Process not found',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get all running processes
    this.app.get('/api/processes', (req, res) => {
      const runningProcesses = Array.from(this.runningProcesses.keys()).map(id => ({
        id,
        status: this.processStatus.get(id)
      }));

      res.json({
        success: true,
        runningProcesses,
        count: runningProcesses.length,
        queueLength: this.commandQueue.length,
        timestamp: new Date().toISOString()
      });
    });
  }

  private async getWalletData(): Promise<WalletData> {
    if (!fs.existsSync(this.envPath)) {
      throw new Error('.env file not found. Generate a wallet first.');
    }

    const envContent = fs.readFileSync(this.envPath, 'utf8');
    const lines = envContent.split('\n');
    
    let seed: string | null = null;
    let address: string | null = null;
    let contractAddress: string | null = null;
    
    for (const line of lines) {
      if (line.startsWith('WALLET_SEED=')) {
        seed = line.split('=')[1]?.replace(/"/g, '') || null;
      }
      if (line.startsWith('WALLET_ADDRESS=')) {
        address = line.split('=')[1]?.replace(/"/g, '') || null;
      }
      if (line.startsWith('CONTRACT_ADDRESS=')) {
        contractAddress = line.split('=')[1]?.replace(/"/g, '') || null;
      }
    }

    return {
      seed,
      address,
      balance: '0', // Would need to be fetched from network
      lastUpdated: Date.now()
    };
  }

  public start(): void {
    this.app.listen(this.port, () => {
      this.logger.log(`🚀 Enhanced Midnight Bridge Server running on port ${this.port}`);
      this.logger.log('📋 Available endpoints:');
      this.logger.log('  GET  /api/status - Health check');
      this.logger.log('  POST /api/contract/deploy - Deploy contract');
      this.logger.log('  POST /api/contract/increment - Increment counter');
      this.logger.log('  POST /api/faucet - Request tokens');
      this.logger.log('  POST /api/wallet/generate - Generate wallet');
      this.logger.log('  GET  /api/wallet/balance - Get balance');
      this.logger.log('  GET  /api/wallet/status - Get wallet status');
      this.logger.log('  POST /api/contract/join - Join existing contract');
      this.logger.log('  GET  /api/process/:id/status - Get process status');
      this.logger.log('  GET  /api/processes - List running processes');
    });
  }
}

// Start the server
const bridge = new EnhancedMidnightBridge();
bridge.start();
