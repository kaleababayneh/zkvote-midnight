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


export type CounterPrivateState = {
  readonly privateCounter: number; 
};

export const createUnounterPrivateState = (privateCounter: number) => ({
  privateCounter,
});

export const witnesses = {
  uncounter_secret_key: ({ privateState }: WitnessContext<typeof Ledger, CounterPrivateState>): [CounterPrivateState, Uint8Array] => [
    privateState,
    // TODO: Replace with actual Uint8Array logic for your use case
    new Uint8Array([privateState.privateCounter])
  ],
};