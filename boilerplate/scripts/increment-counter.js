#!/usr/bin/env node

/**
 * Non-interactive increment script
 * Uses the CLI with AUTO_FUNCTION mode to call increment
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run CLI with auto-function to increment counter
 */
async function incrementCounter() {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const cliDir = path.join(projectRoot, 'boilerplate', 'contract-cli');
  const envPath = path.join(projectRoot, '.env');
  
  try {
    console.log('🔢 Starting non-interactive increment...');
    
    // Check if CONTRACT_ADDRESS exists in .env
    if (!fs.existsSync(envPath)) {
      throw new Error('.env file not found. Deploy a contract first.');
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const contractAddressMatch = envContent.match(/^CONTRACT_ADDRESS=(.+)$/m);
    
    if (!contractAddressMatch) {
      throw new Error('CONTRACT_ADDRESS not found in .env file. Deploy a contract first.');
    }
    
    const contractAddress = contractAddressMatch[1].trim();
    console.log(`📍 Using contract address: ${contractAddress}`);
    
    // Run the CLI with auto-function mode
    const result = await runCLICommand(
      'npm', 
      ['run', 'testnet-remote'], 
      cliDir,
      {
        AUTO_DEPLOY: 'true',
        DEPLOY_MODE: 'join',
        AUTO_FUNCTION: 'increment',
        AUTO_EXIT: 'true',
        CONTRACT_ADDRESS: contractAddress
      }
    );
    
    console.log('✅ Increment completed successfully!');
    return {
      success: true,
      output: result.output,
      contractAddress: contractAddress
    };
    
  } catch (error) {
    console.error(`❌ Increment failed: ${error.message}`);
    throw error;
  }
}

/**
 * Run a CLI command and capture output
 */
function runCLICommand(command, args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`� Running: ${command} ${args.join(' ')}`);
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
      process.stdout.write(chunk); // Show real-time output
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      process.stderr.write(chunk); // Show real-time errors
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ output, errorOutput, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn command: ${err.message}`));
    });
  });
}

// If called directly, run the increment
if (import.meta.url === `file://${process.argv[1]}`) {
  incrementCounter()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
      process.exit(1);
    });
}

export { incrementCounter };
