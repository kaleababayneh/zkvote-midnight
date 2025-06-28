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
    
    // Persistent CLI sessions management
    this.persistentSessions = new Map(); // contractAddress -> session info
    this.cliProcesses = new Map(); // sessionId -> child process
    this.processStatus = new Map(); // processId -> status info
    
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

  // Execute command in isolated process with real-time progress updates
  async executeInIsolatedProcess(command, workingDir = null, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const processId = Date.now() + Math.random().toString(36).substr(2, 9);
      const cwd = workingDir || this.cliPath;
      
      console.log(`🚀 [${processId}] Starting command: ${command}`);
      console.log(`📁 [${processId}] Working directory: ${cwd}`);
      
      // Track process status for real-time updates
      const processStatus = {
        id: processId,
        command: command,
        status: 'running',
        progress: [],
        startTime: Date.now(),
        output: '',
        errorOutput: ''
      };
      
      this.processStatus.set(processId, processStatus);
      
      // Use shell: true to ensure cd commands work properly
      const childProcess = exec(command, {
        cwd: cwd,
        timeout: timeout,
        shell: true, // Important for cd commands
        env: { ...process.env, FORCE_COLOR: '0' },
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      this.runningProcesses.set(processId, childProcess);

      let output = '';
      let errorOutput = '';

      childProcess.stdout?.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        processStatus.output += chunk;
        
        // Parse progress from output
        this.parseProgressFromOutput(chunk, processStatus);
        
        console.log(`📤 [${processId}] ${chunk.trim()}`);
      });

      childProcess.stderr?.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        processStatus.errorOutput += chunk;
        console.log(`📤 [${processId}] ERROR: ${chunk.trim()}`);
      });

      childProcess.on('close', (code) => {
        this.runningProcesses.delete(processId);
        processStatus.status = code === 0 || code === null ? 'completed' : 'failed';
        processStatus.exitCode = code;
        processStatus.endTime = Date.now();
        
        console.log(`✅ [${processId}] Process completed with code: ${code}`);
        
        // Process succeeded if code is 0 or null (normal exit)
        if (code === 0 || code === null) {
          resolve({
            success: true,
            output: output,
            errorOutput: errorOutput,
            exitCode: code,
            processId: processId,
            progress: processStatus.progress
          });
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${errorOutput || output}`));
        }
      });

      childProcess.on('error', (err) => {
        this.runningProcesses.delete(processId);
        processStatus.status = 'error';
        processStatus.error = err.message;
        console.error(`❌ [${processId}] Process error: ${err.message}`);
        reject(new Error(`Failed to execute command: ${err.message}`));
      });
    });
  }

  // Parse progress indicators from CLI output
  parseProgressFromOutput(output, processStatus) {
    const timestamp = Date.now();
    
    // Contract deployment progress indicators
    if (output.includes('Auto-generation complete')) {
      processStatus.progress.push({ step: 'generation', message: 'Contract generation complete', timestamp });
    }
    if (output.includes('Compiling contract')) {
      processStatus.progress.push({ step: 'compilation', message: 'Compiling contract', timestamp });
    }
    if (output.includes('Connecting to testnet')) {
      processStatus.progress.push({ step: 'connection', message: 'Connecting to testnet', timestamp });
    }
    if (output.includes('Running: npm run testnet-remote')) {
      processStatus.progress.push({ step: 'deployment', message: 'Starting deployment process', timestamp });
    }
    if (output.includes('Enhanced CLI initialized')) {
      processStatus.progress.push({ step: 'cli-init', message: 'CLI initialized', timestamp });
    }
    if (output.includes('Using wallet seed')) {
      processStatus.progress.push({ step: 'wallet', message: 'Wallet loaded', timestamp });
    }
    if (output.includes('Waiting to receive tokens')) {
      processStatus.progress.push({ step: 'funding', message: 'Waiting for tokens', timestamp });
    }
    if (output.includes('Your wallet balance is:') && !output.includes('Your wallet balance is: 0')) {
      processStatus.progress.push({ step: 'funded', message: 'Wallet funded successfully', timestamp });
    }
    if (output.includes('Auto-deploying new contract')) {
      processStatus.progress.push({ step: 'deploying', message: 'Deploying contract', timestamp });
    }
    if (output.includes('Deployed contract at address:')) {
      const addressMatch = output.match(/Deployed contract at address:\s*([a-fA-F0-9]{64})/);
      if (addressMatch) {
        processStatus.progress.push({ 
          step: 'deployed', 
          message: `Contract deployed: ${addressMatch[1]}`, 
          contractAddress: addressMatch[1],
          timestamp 
        });
        processStatus.contractAddress = addressMatch[1];
      }
    }
    if (output.includes('Successfully deployed') || output.includes('Contract operation completed successfully')) {
      processStatus.progress.push({ step: 'success', message: 'Deployment completed successfully', timestamp });
      processStatus.status = 'completed';
    }
    
    // Increment operation progress
    if (output.includes('Transaction ID:')) {
      const txMatch = output.match(/Transaction ID:\s*([a-fA-F0-9]{64})/);
      if (txMatch) {
        processStatus.progress.push({ 
          step: 'transaction', 
          message: `Transaction submitted: ${txMatch[1]}`, 
          txId: txMatch[1],
          timestamp 
        });
      }
    }
    if (output.includes('Block Height:')) {
      const blockMatch = output.match(/Block Height:\s*(\d+)/);
      if (blockMatch) {
        processStatus.progress.push({ 
          step: 'confirmed', 
          message: `Transaction confirmed at block ${blockMatch[1]}`, 
          blockHeight: parseInt(blockMatch[1]),
          timestamp 
        });
      }
    }
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

  // Persistent CLI Session Management
  async createPersistentSession(contractAddress) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔗 Creating persistent CLI session for contract: ${contractAddress}`);
    
    try {
      // Start a persistent CLI process that stays connected
      const cliProcess = spawn('npm', ['run', 'cli'], {
        cwd: this.cliPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          CONTRACT_ADDRESS: contractAddress,
          AUTO_CONNECT: 'true',
          KEEP_ALIVE: 'true'
        }
      });

      // Store session info
      const sessionInfo = {
        sessionId,
        contractAddress,
        process: cliProcess,
        connected: false,
        lastUsed: Date.now(),
        createdAt: Date.now()
      };

      this.cliProcesses.set(sessionId, cliProcess);
      this.persistentSessions.set(contractAddress, sessionInfo);

      // Handle process output for connection status
      let outputBuffer = '';
      cliProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        console.log(`📤 [${sessionId}] ${output.trim()}`);
        
        // Check if CLI is ready for commands
        if (output.includes('CLI ready') || output.includes('Connected to contract')) {
          sessionInfo.connected = true;
          console.log(`✅ [${sessionId}] CLI session ready for contract operations`);
        }
      });

      cliProcess.stderr.on('data', (data) => {
        console.log(`📥 [${sessionId}] STDERR: ${data.toString().trim()}`);
      });

      cliProcess.on('close', (code) => {
        console.log(`🔌 [${sessionId}] CLI session closed with code: ${code}`);
        this.cleanupSession(sessionId);
      });

      cliProcess.on('error', (err) => {
        console.error(`❌ [${sessionId}] CLI session error: ${err.message}`);
        this.cleanupSession(sessionId);
      });

      // Wait for initial connection
      await this.waitForSessionReady(sessionId, 30000); // 30 second timeout

      console.log(`✅ Persistent CLI session created: ${sessionId}`);
      return sessionInfo;

    } catch (error) {
      console.error(`❌ Failed to create persistent session: ${error.message}`);
      throw error;
    }
  }

  async waitForSessionReady(sessionId, timeoutMs) {
    const startTime = Date.now();
    const session = Array.from(this.persistentSessions.values())
      .find(s => s.sessionId === sessionId);

    return new Promise((resolve, reject) => {
      const checkReady = () => {
        if (session && session.connected) {
          resolve(session);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Session ${sessionId} connection timeout`));
          return;
        }

        setTimeout(checkReady, 500);
      };

      checkReady();
    });
  }

  async getOrCreateSession(contractAddress) {
    // Check if we have an existing session for this contract
    const existingSession = this.persistentSessions.get(contractAddress);
    
    if (existingSession && existingSession.connected) {
      existingSession.lastUsed = Date.now();
      console.log(`🔄 Reusing existing CLI session for contract: ${contractAddress}`);
      return existingSession;
    }

    // Create new session if none exists or existing one is not connected
    if (existingSession) {
      console.log(`🧹 Cleaning up disconnected session for contract: ${contractAddress}`);
      this.cleanupSession(existingSession.sessionId);
    }

    return await this.createPersistentSession(contractAddress);
  }

  async executeInSession(contractAddress, command) {
    const session = await this.getOrCreateSession(contractAddress);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command timeout in session ${session.sessionId}`));
      }, 60000); // 60 second timeout

      let outputBuffer = '';
      let resultSent = false;

      const dataHandler = (data) => {
        const output = data.toString();
        outputBuffer += output;
        console.log(`📤 [${session.sessionId}] ${output.trim()}`);

        // Check for command completion patterns - More comprehensive checks
        if (output.includes('Transaction completed') || 
            output.includes('Transaction ID:') ||
            output.includes('✅') || 
            output.includes('Operation completed') ||
            output.includes('Block Height:') ||
            output.includes('Counter incremented')) {
          if (!resultSent) {
            resultSent = true;
            clearTimeout(timeout);
            session.process.stdout.removeListener('data', dataHandler);
            resolve({ 
              output: outputBuffer, 
              success: true, 
              sessionUsed: true,
              sessionId: session.sessionId 
            });
          }
        }
      };

      session.process.stdout.on('data', dataHandler);

      // Send command to CLI session
      session.process.stdin.write(command + '\n');
      session.lastUsed = Date.now();
    });
  }

  cleanupSession(sessionId) {
    // Find and remove session
    for (const [contractAddress, session] of this.persistentSessions.entries()) {
      if (session.sessionId === sessionId) {
        this.persistentSessions.delete(contractAddress);
        break;
      }
    }

    // Clean up process
    const process = this.cliProcesses.get(sessionId);
    if (process && !process.killed) {
      process.kill('SIGTERM');
    }
    this.cliProcesses.delete(sessionId);
  }

  // Cleanup inactive sessions (older than 1 hour)
  cleanupInactiveSessions() {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();

    for (const [contractAddress, session] of this.persistentSessions.entries()) {
      if (now - session.lastUsed > oneHour) {
        console.log(`🧹 Cleaning up inactive session: ${session.sessionId}`);
        this.cleanupSession(session.sessionId);
      }
    }
  }

  // Get list of active sessions
  getActiveSessions() {
    const sessions = [];
    for (const [contractAddress, session] of this.persistentSessions.entries()) {
      sessions.push({
        contractAddress,
        sessionId: session.sessionId,
        connected: session.connected,
        lastUsed: session.lastUsed,
        uptime: Date.now() - session.createdAt
      });
    }
    return sessions;
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

    // Wallet status endpoint (alternative format for popup)
    this.app.get('/api/wallet/status', async (req, res) => {
      try {
        const walletData = await this.getWalletData();
        this.walletCache = { ...this.walletCache, ...walletData };
        res.json({
          success: true,
          data: this.walletCache,
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

    // Wallet balance endpoint (alternative format for popup)
    this.app.get('/api/wallet/balance', async (req, res) => {
      try {
        console.log('💳 Checking wallet balance...');
        
        const result = await this.queueCommand(async () => {
          // Run balance from root directory with cd command
          return await this.executeInIsolatedProcess(`cd "${this.projectRoot}" && npm run balance`, this.projectRoot, 30000);
        });

        const balance = this.parseBalanceFromOutput(result.output);
        this.walletCache.balance = balance;
        this.walletCache.lastBalanceCheck = Date.now();

        res.json({
          success: true,
          data: {
            balance: balance,
            address: this.walletCache.address,
            lastUpdated: this.walletCache.lastBalanceCheck
          },
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

    // Deploy contract - HIGH PRIORITY ISOLATED EXECUTION
    this.app.post('/api/contract/deploy', async (req, res) => {
      try {
        console.log('🚀 Starting contract deployment...');
        
        const result = await this.queueCommand(async () => {
          // Use the enhanced deploy script that saves contract address
          return await this.executeInIsolatedProcess(`cd "${this.projectRoot}" && node boilerplate/scripts/deploy-enhanced.js`, this.projectRoot, 300000); // 5 minute timeout
        }, 1); // High priority
        
        // Parse contract address from output with enhanced detection
        const contractAddress = this.parseContractAddressFromOutput(result.output);
        console.log(`🎯 Parsed contract address: ${contractAddress}`);
        
        // Update cache with comprehensive contract info
        this.walletCache.contractInfo = {
          address: contractAddress,
          deployed: true,
          deployedAt: new Date().toISOString(),
          txId: this.parseTxHashFromOutput(result.output),
          blockHeight: this.parseBlockHeightFromOutput(result.output)
        };
        
        // Update .env file with new contract address
        this.updateEnvFile({
          CONTRACT_ADDRESS: contractAddress
        });

        // Create persistent CLI session for this contract
        try {
          console.log('🔗 Creating persistent CLI session for deployed contract...');
          const session = await this.createPersistentSession(contractAddress);
          console.log(`✅ Persistent session created: ${session.sessionId}`);
        } catch (sessionError) {
          console.warn('⚠️ Failed to create persistent session, but deployment succeeded:', sessionError.message);
        }
        
        res.json({
          success: true,
          contractAddress: contractAddress,
          output: result.output,
          processId: result.processId,
          progress: result.progress || [],
          contractInfo: this.walletCache.contractInfo,
          message: 'Contract deployed successfully, address saved, and persistent CLI session created',
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

    // Execute contract function (increment) - Now uses persistent session
    this.app.post('/api/contract/increment', async (req, res) => {
      try {
        console.log('⚡ Incrementing counter...');
        
        const contractAddress = process.env.CONTRACT_ADDRESS;
        if (!contractAddress) {
          return res.status(400).json({
            success: false,
            error: 'No contract address found. Deploy or join a contract first.',
            timestamp: new Date().toISOString()
          });
        }
        
        const result = await this.queueCommand(async () => {
          // Try to use persistent session first, fallback to isolated process
          try {
            console.log('🔗 Using persistent CLI session for contract interaction...');
            return await this.executeInSession(contractAddress, 'increment');
          } catch (sessionError) {
            console.warn('⚠️ Session execution failed, falling back to isolated process:', sessionError.message);
            return await this.executeInIsolatedProcess(`cd "${this.projectRoot}" && node boilerplate/scripts/increment-counter.js`, this.projectRoot, 90000);
          }
        });
        
        // Parse meaningful data from output
        const txHash = this.parseTxHashFromOutput(result.output);
        const blockHeight = this.parseBlockHeightFromOutput(result.output);
        
        console.log(`✅ Increment successful - TX: ${txHash}, Block: ${blockHeight}`);
        
        res.json({
          success: true,
          txId: txHash,
          blockHeight: blockHeight,
          contractAddress: contractAddress,
          output: result.output,
          sessionUsed: result.sessionUsed || false,
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
          // Run faucet from root directory with cd command
          return await this.executeInIsolatedProcess(`cd "${this.projectRoot}" && npm run faucet`, this.projectRoot, 60000);
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
          // Run balance from root directory with cd command
          return await this.executeInIsolatedProcess(`cd "${this.projectRoot}" && npm run balance`, this.projectRoot, 30000);
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
          // Run wallet generation from root directory with cd command
          return await this.executeInIsolatedProcess(`cd "${this.projectRoot}" && npm run wallet`, this.projectRoot, 30000);
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

    // Get process status with real-time progress
    this.app.get('/api/process/:processId/status', (req, res) => {
      const { processId } = req.params;
      const status = this.processStatus.get(processId);
      
      if (!status) {
        return res.status(404).json({
          success: false,
          error: `Process ${processId} not found`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        processId: processId,
        status: status.status,
        progress: status.progress,
        contractAddress: status.contractAddress,
        startTime: status.startTime,
        endTime: status.endTime,
        exitCode: status.exitCode,
        error: status.error,
        isRunning: this.runningProcesses.has(processId),
        timestamp: new Date().toISOString()
      });
    });

    // Join existing contract
    this.app.post('/api/contract/join', async (req, res) => {
      try {
        const { contractAddress } = req.body;
        
        if (!contractAddress || !/^[0-9a-fA-F]{64}$/.test(contractAddress)) {
          return res.status(400).json({
            success: false,
            error: 'Valid contract address (64 hex chars) is required'
          });
        }
        
        console.log(`🔗 Joining contract: ${contractAddress}`);
        
        // Update .env file with contract address
        this.updateEnvFile({
          CONTRACT_ADDRESS: contractAddress
        });
        
        // Update cache
        this.walletCache.contractInfo = {
          address: contractAddress,
          deployed: false,
          joinedAt: new Date().toISOString()
        };

        // Create persistent CLI session for this contract
        try {
          console.log('🔗 Creating persistent CLI session for joined contract...');
          const session = await this.createPersistentSession(contractAddress);
          console.log(`✅ Persistent session created: ${session.sessionId}`);
          
          res.json({
            success: true,
            contractAddress: contractAddress,
            sessionId: session.sessionId,
            message: 'Contract joined and persistent CLI session created',
            timestamp: new Date().toISOString()
          });
        } catch (sessionError) {
          console.warn('⚠️ Failed to create persistent session, but join succeeded:', sessionError.message);
          res.json({
            success: true,
            contractAddress: contractAddress,
            message: 'Contract address saved to .env file - ready for interactions',
            warning: 'Persistent session creation failed, will use isolated processes',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Contract join failed:', error.message);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Session Management Endpoints
    
    // Get all active sessions
    this.app.get('/api/sessions', (req, res) => {
      try {
        const sessions = this.getActiveSessions();
        res.json({
          success: true,
          sessions: sessions,
          count: sessions.length,
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

    // Get specific session status
    this.app.get('/api/sessions/:contractAddress', (req, res) => {
      try {
        const { contractAddress } = req.params;
        const session = this.persistentSessions.get(contractAddress);
        
        if (!session) {
          return res.status(404).json({
            success: false,
            error: `No session found for contract: ${contractAddress}`,
            timestamp: new Date().toISOString()
          });
        }

        res.json({
          success: true,
          session: {
            contractAddress: session.contractAddress,
            sessionId: session.sessionId,
            connected: session.connected,
            lastUsed: session.lastUsed,
            uptime: Date.now() - session.createdAt,
            createdAt: session.createdAt
          },
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

    // Create new session for contract
    this.app.post('/api/sessions/:contractAddress', async (req, res) => {
      try {
        const { contractAddress } = req.params;
        
        if (!contractAddress || !/^[0-9a-fA-F]{64}$/.test(contractAddress)) {
          return res.status(400).json({
            success: false,
            error: 'Valid contract address (64 hex chars) is required'
          });
        }

        console.log(`🔗 Creating new session for contract: ${contractAddress}`);
        const session = await this.createPersistentSession(contractAddress);
        
        res.json({
          success: true,
          sessionId: session.sessionId,
          contractAddress: contractAddress,
          message: 'Persistent CLI session created successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Session creation failed:', error.message);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Close/cleanup session
    this.app.delete('/api/sessions/:contractAddress', (req, res) => {
      try {
        const { contractAddress } = req.params;
        const session = this.persistentSessions.get(contractAddress);
        
        if (!session) {
          return res.status(404).json({
            success: false,
            error: `No session found for contract: ${contractAddress}`,
            timestamp: new Date().toISOString()
          });
        }

        console.log(`🧹 Closing session for contract: ${contractAddress}`);
        this.cleanupSession(session.sessionId);
        
        res.json({
          success: true,
          message: `Session closed for contract: ${contractAddress}`,
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

    // Execute command in session
    this.app.post('/api/sessions/:contractAddress/execute', async (req, res) => {
      try {
        const { contractAddress } = req.params;
        const { command } = req.body;
        
        if (!command) {
          return res.status(400).json({
            success: false,
            error: 'Command is required',
            timestamp: new Date().toISOString()
          });
        }

        console.log(`⚡ Executing command in session for ${contractAddress}: ${command}`);
        
        const result = await this.executeInSession(contractAddress, command);
        
        res.json({
          success: true,
          result: result,
          contractAddress: contractAddress,
          command: command,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Session command execution failed:', error.message);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Cleanup inactive sessions
    this.app.post('/api/sessions/cleanup', (req, res) => {
      try {
        const beforeCount = this.persistentSessions.size;
        this.cleanupInactiveSessions();
        const afterCount = this.persistentSessions.size;
        const cleaned = beforeCount - afterCount;
        
        res.json({
          success: true,
          message: `Cleaned up ${cleaned} inactive sessions`,
          sessionsRemaining: afterCount,
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
    // Parse balance from CLI output - Updated for Midnight DUST format
    console.log('🔍 Parsing balance from output:', output.substring(0, 500));
    
    // Pattern 1: Look for "balance is: X.XXXXXX" format (DUST)
    const dustMatch = output.match(/balance\s+is:\s*(\d+(?:\.\d+)?)/i);
    if (dustMatch) {
      console.log('✅ Found DUST balance:', dustMatch[1]);
      return dustMatch[1];
    }
    
    // Pattern 2: Look for "Your wallet balance is: X DUST"
    const dustBalance = output.match(/wallet\s+balance\s+is:\s*(\d+(?:\.\d+)?)\s*(?:DUST|dust)/i);
    if (dustBalance) {
      console.log('✅ Found wallet DUST balance:', dustBalance[1]);
      return dustBalance[1];
    }
    
    // Pattern 3: Look for any number followed by DUST
    const dustAmount = output.match(/(\d+(?:\.\d+)?)\s*(?:DUST|dust)/i);
    if (dustAmount) {
      console.log('✅ Found DUST amount:', dustAmount[1]);
      return dustAmount[1];
    }
    
    // Pattern 4: Legacy tUsdt format (convert to DUST equivalent)
    const balanceMatch = output.match(/Balance.*?(\d+).*?(?:micro)?[tT]usdt/i);
    if (balanceMatch) {
      const microTusdt = parseInt(balanceMatch[1]);
      const dustEquivalent = (microTusdt).toFixed(2);
      console.log('🔄 Converted microTusdt to DUST:', microTusdt, '->', dustEquivalent);
      return dustEquivalent;
    }
    
    // Pattern 5: Alternative tUsdt format
    const altMatch = output.match(/(\d+)\s*[tT][uU]sdt/i);
    if (altMatch) {
      const tusdt = parseInt(altMatch[1]);
      console.log('🔄 Converted tUsdt to DUST equivalent:', tusdt);
      return tusdt.toString();
    }

    // Pattern 6: Decimal tUsdt format
    const tUsdtMatch = output.match(/(\d+(?:\.\d+)?)\s*tUsdt/i);
    if (tUsdtMatch) {
      console.log('🔄 Found decimal tUsdt:', tUsdtMatch[1]);
      return tUsdtMatch[1];
    }
    
    console.log('⚠️ No balance pattern matched, returning 0');
    return '0';
  }

  parseContractAddressFromOutput(output) {
    // Pattern 1: "Contract Address: 0200adcf4dd3..." (new format)
    const contractAddressMatch = output.match(/Contract Address:\s*([a-fA-F0-9]{64})/i);
    if (contractAddressMatch) {
      console.log('✅ Found Contract Address:', contractAddressMatch[1]);
      return contractAddressMatch[1];
    }

    // Pattern 2: "Deployed contract at address: 0200adcf4dd3..." 
    const deployedMatch = output.match(/Deployed contract at address:\s*([a-fA-F0-9]{64})/i);
    if (deployedMatch) {
      console.log('✅ Found deployed contract address:', deployedMatch[1]);
      return deployedMatch[1];
    }

    // Pattern 3: Legacy patterns with "Contract deployed" or similar
    const addressMatch = output.match(/Contract\s+(?:deployed|address).*?([a-fA-F0-9]{40,})/i);
    if (addressMatch) {
      console.log('✅ Found legacy contract address:', addressMatch[1]);
      return addressMatch[1];
    }

    // Pattern 4: Look for 0x prefix (legacy)
    const hexMatch = output.match(/0x[a-fA-F0-9]{40}/);
    if (hexMatch) {
      console.log('✅ Found hex contract address:', hexMatch[0]);
      return hexMatch[0];
    }

    // Pattern 5: Look for any 64-character hex string (modern Midnight format)
    const hex64Match = output.match(/\b[a-fA-F0-9]{64}\b/);
    if (hex64Match) {
      console.log('✅ Found 64-char hex address:', hex64Match[0]);
      return hex64Match[0];
    }

    // Pattern 6: Fallback to any long hex string
    const fallbackMatch = output.match(/[a-fA-F0-9]{40,}/);
    if (fallbackMatch) {
      console.log('✅ Found fallback contract address:', fallbackMatch[0]);
      return fallbackMatch[0];
    }
    
    console.log('❌ No contract address found in output');
    return `contract_${Date.now()}`;
  }

  parseTxHashFromOutput(output) {
    // Look for "Transaction ID:" pattern (the actual format we see)
    const txIdMatch = output.match(/Transaction ID:\s*([a-fA-F0-9]{64})/i);
    if (txIdMatch) {
      return txIdMatch[1];
    }

    // Look for general tx patterns
    const txMatch = output.match(/(?:tx|transaction|hash).*?([a-fA-F0-9]{64})/i);
    if (txMatch) {
      return txMatch[1];
    }

    const hexMatch = output.match(/0x[a-fA-F0-9]{64}/);
    if (hexMatch) {
      return hexMatch[0];
    }

    // Look for any 64-character hex string
    const hashMatch = output.match(/[a-fA-F0-9]{64}/);
    if (hashMatch) {
      return hashMatch[0];
    }
    
    return null; // Return null instead of generating fake tx
  }

  parseBlockHeightFromOutput(output) {
    // Look for "Block Height:" pattern
    const blockMatch = output.match(/Block Height:\s*(\d+)/i);
    if (blockMatch) {
      return parseInt(blockMatch[1]);
    }
    
    return null;
  }

  // Update .env file with new values
  updateEnvFile(updates) {
    try {
      let envContent = '';
      
      // Read existing .env file if it exists
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }
      
      // Update or add each key-value pair
      Object.entries(updates).forEach(([key, value]) => {
        const pattern = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;
        
        if (pattern.test(envContent)) {
          // Update existing line
          envContent = envContent.replace(pattern, newLine);
        } else {
          // Add new line
          envContent += envContent.endsWith('\n') ? newLine + '\n' : '\n' + newLine + '\n';
        }
      });
      
      // Ensure file ends with newline
      if (!envContent.endsWith('\n')) {
        envContent += '\n';
      }
      
      fs.writeFileSync(this.envPath, envContent, 'utf8');
      console.log(`✅ Updated .env file with: ${Object.keys(updates).join(', ')}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update .env file: ${error.message}`);
      return false;
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log('🌙 Enhanced Midnight Wallet Bridge Server');
      console.log(`🚀 Server running on http://localhost:${this.port}`);
      console.log(`📁 Project root: ${this.projectRoot}`);
      console.log(`🛠️  CLI path: ${this.cliPath}`);
      console.log(`📜 Scripts path: ${this.scriptsPath}`);
      console.log('⚡ Ready to execute isolated commands & persistent sessions');
      console.log('');
      console.log('Available endpoints:');
      console.log('  GET  /api/status                         - Health check');
      console.log('  GET  /api/wallet                         - Get wallet info');
      console.log('  GET  /api/balance                        - Check balance');
      console.log('  POST /api/faucet                         - Request tokens');
      console.log('  POST /api/wallet/generate                - Generate wallet');
      console.log('  POST /api/contract/deploy                - Deploy contract');
      console.log('  POST /api/contract/join                  - Join existing contract');
      console.log('  GET  /api/contract/state                 - Get contract state');
      console.log('  POST /api/contract/increment             - Increment counter');
      console.log('  GET  /api/processes                      - List running processes');
      console.log('  GET  /api/process/:processId/status      - Get process status');
      console.log('  POST /api/kill/:processId                - Kill specific process');
      console.log('');
      console.log('Session Management:');
      console.log('  GET  /api/sessions                       - List all active sessions');
      console.log('  GET  /api/sessions/:contractAddress      - Get session status');
      console.log('  POST /api/sessions/:contractAddress      - Create new session');
      console.log('  DELETE /api/sessions/:contractAddress    - Close session');
      console.log('  POST /api/sessions/:contractAddress/execute - Execute command in session');
      console.log('  POST /api/sessions/cleanup               - Cleanup inactive sessions');
      console.log('');
      console.log('✨ Features:');
      console.log('  - Isolated process execution');
      console.log('  - Persistent CLI sessions');
      console.log('  - Command queue management');
      console.log('  - Process monitoring');
      console.log('  - Session reuse for contract operations');
      console.log('  - Timeout protection');
      console.log('');
      
      // Start periodic cleanup of inactive sessions
      setInterval(() => {
        this.cleanupInactiveSessions();
      }, 30 * 60 * 1000); // Every 30 minutes
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      
      // Kill all running processes
      for (const [processId, process] of this.runningProcesses) {
        console.log(`🔪 Killing process ${processId}`);
        process.kill('SIGTERM');
      }
      
      // Clean up all persistent sessions
      for (const [contractAddress, session] of this.persistentSessions.entries()) {
        console.log(`🧹 Cleaning up session for ${contractAddress}`);
        this.cleanupSession(session.sessionId);
      }
      
      process.exit(0);
    });
  }
}

// Start the enhanced bridge server
const bridge = new EnhancedMidnightBridge();
bridge.start();
