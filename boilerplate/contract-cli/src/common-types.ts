import { contracts } from '@midnight-ntwrk/contract';
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

// Define the private state type for zkvote contract
export type ZkvotePrivateState = {
  readonly secretKey: Uint8Array; 
};

// Get the dynamic contract module
const getContractModule = () => {
  const contractNames = Object.keys(contracts);
  if (contractNames.length === 0) {
    throw new Error('No contract found in contracts object');
  }
  return contracts[contractNames[0]];
};

const contractModule = getContractModule();

export type ZkvoteCircuits = ImpureCircuitId<typeof contractModule.Contract>;

export const ZkvotePrivateStateId = 'zkvotePrivateState';

export type ZkvoteProviders = MidnightProviders<ZkvoteCircuits, typeof ZkvotePrivateStateId, ZkvotePrivateState>;

export type ZkvoteContract = typeof contractModule.Contract;

export type DeployedZkvoteContract = DeployedContract<ZkvoteContract> | FoundContract<ZkvoteContract>;
