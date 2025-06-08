import { Ledger } from './managed/zkvote/contract/index.cjs';
import { WitnessContext } from '@midnight-ntwrk/compact-runtime';



export type CounterPrivateState = {
  readonly privateCounter: number; 
};

export const createCounterPrivateState = (privateCounter: number) => ({
  privateCounter,
});

export const witnesses = {
  // local_secret_key: ({ privateState }: WitnessContext<Ledger, CounterPrivateState>): [CounterPrivateState, Uint8Array] => [
  //   privateState, 
  //   privateState.privateCounter, 
  // ],
};