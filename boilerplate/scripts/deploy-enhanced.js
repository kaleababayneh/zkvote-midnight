#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced deploy script that captures contract address and saves it to .env
 */
class EnhancedMidnightDeployer {
  constructor(deployMode = 'new') {
    this.projectRoot = path.resolve(__dirname, '..', '..');
    this.cliDir = path.join(this.projectRoot, 'boilerplate', 'contract-cli');
    this.envPath = path.join(this.projectRoot, '.env');
    this.deployMode = deployMode;
  }

  /**
   * Run a command and capture output
   */
  runCommandWithOutput(command, args, cwd, description, env = {}) {
    return new Promise((resolve, reject) => {
      console.log(`\n🔄 ${description}...`);
      console.log(`📍 Running: ${command} ${args.join(' ')}`);
      console.log(`📁 Working directory: ${cwd}`);
      
      const child = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, ...env }
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        process.stdout.write(chunk); // Also display in real-time
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        process.stderr.write(chunk); // Also display in real-time
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${description} completed successfully`);
          resolve({ output, errorOutput, code });
        } else {
          console.error(`❌ ${description} failed with code ${code}`);
          reject(new Error(`${description} failed: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        console.error(`❌ ${description} error:`, error);
        reject(error);
      });
    });
  }

  /**
   * Extract contract address from deployment output
   */
  extractContractAddress(output) {
    // Look for the deployed contract address pattern
    const addressMatch = output.match(/Deployed contract at address:\s*([a-fA-F0-9]+)/i);
    if (addressMatch) {
      return addressMatch[1];
    }

    // Alternative pattern
    const altMatch = output.match(/contract.*address.*?([a-fA-F0-9]{60,})/i);
    if (altMatch) {
      return altMatch[1];
    }

    return null;
  }

  /**
   * Update .env file with contract address
   */
  updateEnvFile(contractAddress) {
    if (!contractAddress) {
      console.warn('⚠️  No contract address found to save');
      return;
    }

    try {
      let envContent = '';
      
      // Read existing .env file if it exists
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }

      // Check if CONTRACT_ADDRESS already exists
      const contractAddressRegex = /^CONTRACT_ADDRESS=.*$/m;
      
      if (contractAddressRegex.test(envContent)) {
        // Update existing CONTRACT_ADDRESS
        envContent = envContent.replace(contractAddressRegex, `CONTRACT_ADDRESS=${contractAddress}`);
        console.log('📝 Updated CONTRACT_ADDRESS in .env file');
      } else {
        // Add new CONTRACT_ADDRESS
        if (!envContent.endsWith('\n') && envContent.length > 0) {
          envContent += '\n';
        }
        envContent += `CONTRACT_ADDRESS=${contractAddress}\n`;
        console.log('📝 Added CONTRACT_ADDRESS to .env file');
      }

      // Write back to .env file
      fs.writeFileSync(this.envPath, envContent);
      console.log(`✅ Contract address saved: ${contractAddress}`);
      
    } catch (error) {
      console.error('❌ Failed to update .env file:', error.message);
    }
  }

  /**
   * Main deployment process
   */
  async deploy() {
    try {
      const modeText = this.deployMode === 'join' ? 'Joining Existing Contract' : 'Deploying New Contract';
      console.log(`🚀 Starting Enhanced Midnight Contract ${modeText} on testnet...\n`);
      
      console.log('📋 Enhanced Deployment Steps:');
      console.log('   1. 🔨 Compile contract and generate CLI');
      console.log('   2. 🌐 Connect to testnet');
      if (this.deployMode === 'join') {
        console.log('   3. 🔗 Join existing contract on testnet');
      } else {
        console.log('   3. 📦 Deploy new contract to testnet');
        console.log('   4. 💾 Save contract address to .env');
      }
      console.log('   5. ✅ Complete non-interactive deployment\n');

      // Step 1: Run npm run dev (compile and generate)
      await this.runCommandWithOutput(
        'npm', 
        ['run', 'dev'], 
        this.projectRoot,
        'Compiling contract and generating CLI'
      );

      // Step 2 & 3: Run testnet-remote with auto-deploy and auto-exit
      const deployResult = await this.runCommandWithOutput(
        'npm', 
        ['run', 'testnet-remote'], 
        this.cliDir,
        'Connecting to testnet and deploying contract',
        { 
          AUTO_DEPLOY: 'true',
          DEPLOY_MODE: this.deployMode || 'new',
          AUTO_EXIT: 'true'  // Add this to prevent interactive mode
        }
      );

      // Step 4: Extract and save contract address (for new deployments)
      if (this.deployMode !== 'join') {
        const contractAddress = this.extractContractAddress(deployResult.output);
        if (contractAddress) {
          this.updateEnvFile(contractAddress);
        }
      }

      console.log(`\n🎉 Enhanced ${modeText} completed successfully!`);
      console.log('✅ Contract is ready for frontend interaction');
      if (this.deployMode === 'join') {
        console.log('   You can now call increment from the frontend.');
      } else {
        console.log('   Contract address has been saved to .env file');
        console.log('   You can now call increment from the frontend.');
      }

    } catch (error) {
      console.error('\n❌ Enhanced deployment failed:', error.message);
      console.error('\n🔧 Troubleshooting:');
      console.error('   - Check your testnet connection');
      console.error('   - Verify your wallet has sufficient testnet balance');
      console.error('   - Ensure all dependencies are installed');
      process.exit(1);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const deployMode = args.includes('--join') ? 'join' : 'new';

// Run the enhanced deployer
const deployer = new EnhancedMidnightDeployer(deployMode);
deployer.deploy();
