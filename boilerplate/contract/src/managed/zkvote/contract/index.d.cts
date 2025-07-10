import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<T> = {
}

export type ImpureCircuits<T> = {
  increment(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  vote_for(context: __compactRuntime.CircuitContext<T>,
           secret_key_0: Uint8Array,
           instance_0: Uint8Array,
           index_0: bigint): __compactRuntime.CircuitResults<T, []>;
  get_vote_count(context: __compactRuntime.CircuitContext<T>, index_0: bigint): __compactRuntime.CircuitResults<T, bigint>;
}

export type PureCircuits = {
}

export type Circuits<T> = {
  increment(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  vote_for(context: __compactRuntime.CircuitContext<T>,
           secret_key_0: Uint8Array,
           instance_0: Uint8Array,
           index_0: bigint): __compactRuntime.CircuitResults<T, []>;
  get_vote_count(context: __compactRuntime.CircuitContext<T>, index_0: bigint): __compactRuntime.CircuitResults<T, bigint>;
}

export type Ledger = {
  readonly numberOfVoters: bigint;
  choices: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
  voteCounts: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): { read(): bigint }
  };
  items: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>,
               choiceA_0: Uint8Array,
               choiceB_0: Uint8Array,
               choiceC_0: Uint8Array,
               choiceD_0: Uint8Array): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;
