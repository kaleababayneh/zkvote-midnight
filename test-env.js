#!/usr/bin/env node

// Test script to verify dotenv loading
import 'dotenv/config';

console.log('🔍 Environment Variable Test');
console.log('WALLET_SEED:', process.env.WALLET_SEED ? '✅ Found' : '❌ Not found');
console.log('SYNC_CACHE:', process.env.SYNC_CACHE || 'Not set');

if (process.env.WALLET_SEED) {
  console.log('✅ Environment variables are loading correctly');
  console.log('💡 Automatic deployment will work without prompts');
} else {
  console.log('❌ Environment variables not found');
  console.log('💡 Deployment will prompt for manual seed entry');
}
