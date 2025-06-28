import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WitnessContext } from '@midnight-ntwrk/compact-runtime';

// Get __dirname in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the only folder inside ./managed
const managedPath = path.join(__dirname, 'managed');
const [folder] = fs.readdirSync(managedPath).filter(f =>
  fs.statSync(path.join(managedPath, f)).isDirectory()
);

// Dynamically import the contract
const { Ledger } = await import(`./managed/${folder}/contract/index.cjs`);


export type ZkvotePrivateState = {
  readonly secretKey: Uint8Array; 
};

export const createZkvotePrivateState = (secretKey: Uint8Array) => ({
  secretKey,
});

export const witnesses = {
  // No witnesses needed for this zkvote contract
};