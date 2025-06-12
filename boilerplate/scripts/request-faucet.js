#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Midnight SDK imports
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { getZswapNetworkId, setNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { nativeToken } from '@midnight-ntwrk/zswap';
import { firstValueFrom } from 'rxjs';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const envPath = path.join(projectRoot, '.env');

dotenv.config({ path: envPath });

// Constants
const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000001';
const TRANSFER_AMOUNT = 1_000_000_000n; // 1000 tUsdt = 1,000,000,000 microTusdt

// Testnet configuration
const TESTNET_CONFIG = {
  indexer: 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
  indexerWS: 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
  node: 'https://rpc.testnet-02.midnight.network',
  proofServer: 'http://127.0.0.1:6300'
};

// Validation
const targetAddress = process.env.WALLET_ADDRESS;
if (!targetAddress) {
  console.error('❌ WALLET_ADDRESS not found in .env file. Run "npm run generate-key" first.');
  process.exit(1);
}

console.log('🌙 Midnight Custom Faucet');
console.log('💰 Transferring tokens from genesis wallet to your wallet');
console.log(`📥 Target: ${targetAddress}`);

(async () => {
  try {
    console.log('🔧 Building genesis wallet...');
    
    // Set network to testnet
    setNetworkId(NetworkId.TestNet);
    
    // Build genesis wallet
    const sourceWallet = await WalletBuilder.build(
      TESTNET_CONFIG.indexer,
      TESTNET_CONFIG.indexerWS,
      TESTNET_CONFIG.proofServer,
      TESTNET_CONFIG.node,
      GENESIS_SEED,
      getZswapNetworkId(),
      'info'
    );
    
    sourceWallet.start();

    
    // Wait for wallet to sync
    console.log('⏳ Syncing genesis wallet...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const sourceState = await firstValueFrom(sourceWallet.state());
    const sourceBalance = sourceState.balances[nativeToken()] || 0n;
    
    console.log(`💰 Genesis wallet balance: ${sourceBalance} microTUsdt`);
    
    if (sourceBalance === 0n) {
      console.error('❌ Genesis wallet has no funds!');
      await sourceWallet.close();
      return;
    }
    
    console.log(`💸 Sending ${TRANSFER_AMOUNT} microTusdt (1000 tUsdt) to your wallet...`);
    
    // Create a proper transfer transaction using Midnight SDK
    console.log('🔧 Creating transfer transaction...');
    
    const transferRecipe = await sourceWallet.transferTransaction([
      {
        amount: TRANSFER_AMOUNT,
        type: nativeToken(),
        receiverAddress: targetAddress
      }
    ]);

    console.log('🔒 Proving transaction...');
    const provenTx = await sourceWallet.proveTransaction(transferRecipe);
    
    console.log('📤 Submitting transaction...');
    const txId = await sourceWallet.submitTransaction(provenTx);
    
    console.log(`✅ Transfer submitted! Transaction ID: ${txId}`);
    console.log('⏳ Waiting for confirmation...');
    
    // Wait for transaction to be confirmed
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await sourceWallet.close();
    
    console.log('🎉 Transfer completed successfully!');
    console.log('💰 Your wallet should now have testnet tokens');
    console.log('🚀 Run "npm run deploy" to deploy your contract');
    
  } catch (error) {
    console.error('❌ Transfer failed:', error.message);
    
    // Check if it's a version mismatch error (common issue)
    if (error.message.includes('Unsupported version') || error.message.includes('version')) {
      console.log('\n🔧 Version mismatch - use manual faucet:');
      console.log('🌐 https://midnight.network/testnet-faucet');
      console.log(`📍 ${targetAddress}`);
    } else {
      console.log('\n🔧 Manual faucet: https://midnight.network/testnet-faucet');
      console.log(`📍 ${targetAddress}`);
    }
    
    console.log('\n🚀 Next: npm run deploy');
  }
})();