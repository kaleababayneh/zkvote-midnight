#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Configure dotenv to load from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

import * as api from './simple-api.js';
import { createProviders } from './config.js';
import logger from './logger.js';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    if (!command) {
        console.log(`
Usage: node zkvote-api-cli.js <command> [args...]

Commands:
  deploy <choiceA> <choiceB> <choiceC> <choiceD>  Deploy a new voting contract
  display <contractAddress>                       Display contract state
  vote <contractAddress> <secretKey> <choiceIndex> Submit a vote
  
Examples:
  node zkvote-api-cli.js deploy YES NO ABS N/A
  node zkvote-api-cli.js display B5gq1mUG6dAd7LqvhwKdCU3Wo33LXkBCLhFLJTM4d3jG
  node zkvote-api-cli.js vote B5gq1mUG6dAd7LqvhwKdCU3Wo33LXkBCLhFLJTM4d3jG qwert 1
        `);
        process.exit(1);
    }
    
    try {
        const providers = await createProviders();
        
        switch (command) {
            case 'deploy': {
                const [choiceA, choiceB, choiceC, choiceD] = args.slice(1);
                if (!choiceA || !choiceB || !choiceC || !choiceD) {
                    throw new Error('Deploy requires 4 choices as arguments');
                }
                
                if ([choiceA, choiceB, choiceC, choiceD].some(choice => choice.length !== 3)) {
                    throw new Error('Each choice must be exactly 3 characters');
                }
                
                console.log(`Deploying contract with choices: ${choiceA}, ${choiceB}, ${choiceC}, ${choiceD}`);
                
                const result = await api.deploy(providers, null, choiceA, choiceB, choiceC, choiceD);
                console.log(`SUCCESS: Contract deployed at address: ${result.deployTxData.public.contractAddress}`);
                break;
            }
            
            case 'display': {
                const contractAddress = args[1];
                if (!contractAddress) {
                    throw new Error('Display requires contract address as argument');
                }
                
                console.log(`Getting state for contract: ${contractAddress}`);
                
                const joinedContract = await api.joinContract(providers, contractAddress);
                await api.displayZkvoteState(providers, joinedContract);
                break;
            }
            
            case 'vote': {
                const [contractAddress, secretKey, choiceIndexStr] = args.slice(1);
                if (!contractAddress || !secretKey || !choiceIndexStr) {
                    throw new Error('Vote requires contractAddress, secretKey, and choiceIndex as arguments');
                }
                
                const choiceIndex = parseInt(choiceIndexStr);
                if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
                    throw new Error('Choice index must be a number between 0 and 3');
                }
                
                if (secretKey.length !== 5) {
                    throw new Error('Secret key must be exactly 5 characters');
                }
                
                console.log(`Voting for choice ${choiceIndex} with secret key...`);
                
                const joinedContract = await api.joinContract(providers, contractAddress);
                const txId = await api.voteFor(providers, joinedContract, secretKey, choiceIndex);
                console.log(`SUCCESS: Vote submitted! Transaction ID: ${txId}`);
                break;
            }
            
            default:
                throw new Error(`Unknown command: ${command}`);
        }
        
    } catch (error) {
        console.error(`ERROR: ${error.message}`);
        process.exit(1);
    }
}

main().catch(error => {
    console.error(`FATAL ERROR: ${error.message}`);
    process.exit(1);
});
