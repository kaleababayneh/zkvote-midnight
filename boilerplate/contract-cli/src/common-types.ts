import { contracts } from '@midnight-ntwrk/contract';
import type { ContractPrivate } from '@midnight-ntwrk/contract';
import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

// Get the dynamic contract module
const getContractModule = () => {
  const contractNames = Object.keys(contracts);
  if (contractNames.length === 0) {
    throw new Error('No contract found in contracts object');
  }
  return contracts[contractNames[0]];
};

const contractModule = getContractModule();

export type { ContractPrivate };
export type ContractCircuits = ImpureCircuitId<typeof contractModule.Contract>;

export const ContractPrivateStateId = 'contractPrivateState';

export type ContractProviders = MidnightProviders<ContractCircuits, typeof ContractPrivateStateId, ContractPrivate>;

export type ContractContract = typeof contractModule.Contract;

export type DeployedContractContract = DeployedContract<ContractContract> | FoundContract<ContractContract>;
