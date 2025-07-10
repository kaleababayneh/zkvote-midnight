'use strict';
const __compactRuntime = require('@midnight-ntwrk/compact-runtime');
const expectedRuntimeVersionString = '0.8.1';
const expectedRuntimeVersion = expectedRuntimeVersionString.split('-')[0].split('.').map(Number);
const actualRuntimeVersion = __compactRuntime.versionString.split('-')[0].split('.').map(Number);
if (expectedRuntimeVersion[0] != actualRuntimeVersion[0]
     || (actualRuntimeVersion[0] == 0 && expectedRuntimeVersion[1] != actualRuntimeVersion[1])
     || expectedRuntimeVersion[1] > actualRuntimeVersion[1]
     || (expectedRuntimeVersion[1] == actualRuntimeVersion[1] && expectedRuntimeVersion[2] > actualRuntimeVersion[2]))
   throw new __compactRuntime.CompactError(`Version mismatch: compiled code expects ${expectedRuntimeVersionString}, runtime is ${__compactRuntime.versionString}`);
{ const MAX_FIELD = 52435875175126190479447740508185965837690552500527637822603658699938581184512n;
  if (__compactRuntime.MAX_FIELD !== MAX_FIELD)
     throw new __compactRuntime.CompactError(`compiler thinks maximum field value is ${MAX_FIELD}; run time thinks it is ${__compactRuntime.MAX_FIELD}`)
}

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(5);

const _descriptor_1 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_2 = new __compactRuntime.CompactTypeBoolean();

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_4 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_6 = new __compactRuntime.CompactTypeVector(3, _descriptor_0);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_1.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.bytes);
  }
}

const _descriptor_7 = new _ContractAddress_0();

const _descriptor_8 = new __compactRuntime.CompactTypeBytes(3);

class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1)
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object')
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    this.witnesses = witnesses_0;
    this.circuits = {
      increment: (...args_1) => {
        if (args_1.length !== 1)
          throw new __compactRuntime.CompactError(`increment: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined))
          __compactRuntime.type_error('increment',
                                      'argument 1 (as invoked from Typescript)',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 24, char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this.#_increment_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData };
      },
      vote_for: (...args_1) => {
        if (args_1.length !== 4)
          throw new __compactRuntime.CompactError(`vote_for: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        const contextOrig_0 = args_1[0];
        const secret_key_0 = args_1[1];
        const instance_0 = args_1[2];
        const index_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined))
          __compactRuntime.type_error('vote_for',
                                      'argument 1 (as invoked from Typescript)',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 28, char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        if (!(secret_key_0.buffer instanceof ArrayBuffer && secret_key_0.BYTES_PER_ELEMENT === 1 && secret_key_0.length === 5))
          __compactRuntime.type_error('vote_for',
                                      'argument 1 (argument 2 as invoked from Typescript)',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 28, char 1',
                                      'Bytes<5>',
                                      secret_key_0)
        if (!(instance_0.buffer instanceof ArrayBuffer && instance_0.BYTES_PER_ELEMENT === 1 && instance_0.length === 5))
          __compactRuntime.type_error('vote_for',
                                      'argument 2 (argument 3 as invoked from Typescript)',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 28, char 1',
                                      'Bytes<5>',
                                      instance_0)
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= 255n))
          __compactRuntime.type_error('vote_for',
                                      'argument 3 (argument 4 as invoked from Typescript)',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 28, char 1',
                                      'Uint<0..255>',
                                      index_0)
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(secret_key_0).concat(_descriptor_0.toValue(instance_0).concat(_descriptor_3.toValue(index_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this.#_vote_for_0(context,
                                           partialProofData,
                                           secret_key_0,
                                           instance_0,
                                           index_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData };
      },
      get_vote_count: (...args_1) => {
        if (args_1.length !== 2)
          throw new __compactRuntime.CompactError(`get_vote_count: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        const contextOrig_0 = args_1[0];
        const index_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined))
          __compactRuntime.type_error('get_vote_count',
                                      'argument 1 (as invoked from Typescript)',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 42, char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        if (!(typeof(index_0) === 'bigint' && index_0 >= 0 && index_0 <= 255n))
          __compactRuntime.type_error('get_vote_count',
                                      'argument 1 (argument 2 as invoked from Typescript)',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 42, char 1',
                                      'Uint<0..255>',
                                      index_0)
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: {
            value: _descriptor_3.toValue(index_0),
            alignment: _descriptor_3.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this.#_get_vote_count_0(context,
                                                 partialProofData,
                                                 index_0);
        partialProofData.output = { value: _descriptor_5.toValue(result_0), alignment: _descriptor_5.alignment() };
        return { result: result_0, context: context, proofData: partialProofData };
      }
    };
    this.impureCircuits = {
      increment: this.circuits.increment,
      vote_for: this.circuits.vote_for,
      get_vote_count: this.circuits.get_vote_count
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 5)
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 5 arguments (as invoked from Typescript), received ${args_0.length}`);
    const constructorContext_0 = args_0[0];
    const choiceA_0 = args_0[1];
    const choiceB_0 = args_0[2];
    const choiceC_0 = args_0[3];
    const choiceD_0 = args_0[4];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(choiceA_0.buffer instanceof ArrayBuffer && choiceA_0.BYTES_PER_ELEMENT === 1 && choiceA_0.length === 3))
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 1 (argument 2 as invoked from Typescript)',
                                  '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 11, char 1',
                                  'Bytes<3>',
                                  choiceA_0)
    if (!(choiceB_0.buffer instanceof ArrayBuffer && choiceB_0.BYTES_PER_ELEMENT === 1 && choiceB_0.length === 3))
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 2 (argument 3 as invoked from Typescript)',
                                  '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 11, char 1',
                                  'Bytes<3>',
                                  choiceB_0)
    if (!(choiceC_0.buffer instanceof ArrayBuffer && choiceC_0.BYTES_PER_ELEMENT === 1 && choiceC_0.length === 3))
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 3 (argument 4 as invoked from Typescript)',
                                  '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 11, char 1',
                                  'Bytes<3>',
                                  choiceC_0)
    if (!(choiceD_0.buffer instanceof ArrayBuffer && choiceD_0.BYTES_PER_ELEMENT === 1 && choiceD_0.length === 3))
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 4 (argument 5 as invoked from Typescript)',
                                  '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 11, char 1',
                                  'Bytes<3>',
                                  choiceD_0)
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = stateValue_0;
    state_0.setOperation('increment', new __compactRuntime.ContractOperation());
    state_0.setOperation('vote_for', new __compactRuntime.ContractOperation());
    state_0.setOperation('get_vote_count', new __compactRuntime.ContractOperation());
    const context = {
      originalState: state_0,
      currentPrivateState: constructorContext_0.initialPrivateState,
      currentZswapLocalState: constructorContext_0.initialZswapLocalState,
      transactionContext: new __compactRuntime.QueryContext(state_0.data, __compactRuntime.dummyContractAddress())
    };
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(0n),
                                                                            alignment: _descriptor_3.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                            alignment: _descriptor_5.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(1n),
                                                                            alignment: _descriptor_3.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newMap(
                                        new __compactRuntime.StateMap()
                                      ).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(2n),
                                                                            alignment: _descriptor_3.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newMap(
                                        new __compactRuntime.StateMap()
                                      ).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(3n),
                                                                            alignment: _descriptor_3.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newMap(
                                        new __compactRuntime.StateMap()
                                      ).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    const tmp_0 = 0n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_3.toValue(1n),
                                                alignment: _descriptor_3.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_0),
                                                                            alignment: _descriptor_3.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(choiceD_0),
                                                                            alignment: _descriptor_8.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_1 = 1n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_3.toValue(1n),
                                                alignment: _descriptor_3.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_1),
                                                                            alignment: _descriptor_3.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(choiceC_0),
                                                                            alignment: _descriptor_8.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_2 = 2n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_3.toValue(1n),
                                                alignment: _descriptor_3.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_2),
                                                                            alignment: _descriptor_3.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(choiceB_0),
                                                                            alignment: _descriptor_8.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_3 = 3n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_3.toValue(1n),
                                                alignment: _descriptor_3.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_3),
                                                                            alignment: _descriptor_3.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_8.toValue(choiceA_0),
                                                                            alignment: _descriptor_8.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    this.#_folder_0(context,
                    partialProofData,
                    ((context, partialProofData, t_0, i_0) =>
                     {
                       const tmp_4 = i_0;
                       Contract._query(context,
                                       partialProofData,
                                       [
                                        { idx: { cached: false,
                                                 pushPath: true,
                                                 path: [
                                                        { tag: 'value',
                                                          value: { value: _descriptor_3.toValue(2n),
                                                                   alignment: _descriptor_3.alignment() } }] } },
                                        { push: { storage: false,
                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(tmp_4),
                                                                                               alignment: _descriptor_3.alignment() }).encode() } },
                                        { push: { storage: true,
                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                               alignment: _descriptor_5.alignment() }).encode() } },
                                        { ins: { cached: false, n: 1 } },
                                        { ins: { cached: true, n: 1 } }]);
                       return t_0;
                     }),
                    [],
                    [0n, 1n, 2n, 3n]);
    state_0.data = context.transactionContext.state;
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  #_persistent_hash_0(context, partialProofData, value_0) {
    const result_0 = __compactRuntime.persistentHash(_descriptor_6, value_0);
    return result_0;
  }
  #_increment_0(context, partialProofData) {
    const tmp_0 = 1n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_3.toValue(0n),
                                                alignment: _descriptor_3.alignment() } }] } },
                     { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                            { value: _descriptor_4.toValue(tmp_0),
                                              alignment: _descriptor_4.alignment() }
                                              .value
                                          )) } },
                     { ins: { cached: true, n: 1 } }]);
    return [];
  }
  #_vote_for_0(context, partialProofData, secret_key_0, instance_0, index_0) {
    const instance_1 = new Uint8Array([122, 107, 118, 111, 116]);
    let tmp_0;
    __compactRuntime.assert(!(tmp_0 = this.#_public_key_vote_0(context,
                                                               partialProofData,
                                                               secret_key_0,
                                                               instance_1),
                              _descriptor_2.fromValue(Contract._query(context,
                                                                      partialProofData,
                                                                      [
                                                                       { dup: { n: 0 } },
                                                                       { idx: { cached: false,
                                                                                pushPath: false,
                                                                                path: [
                                                                                       { tag: 'value',
                                                                                         value: { value: _descriptor_3.toValue(3n),
                                                                                                  alignment: _descriptor_3.alignment() } }] } },
                                                                       { push: { storage: false,
                                                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                                                       'member',
                                                                       { popeq: { cached: true,
                                                                                  result: undefined } }]).value)),
                            'Already voted');
    this.#_increment_0(context, partialProofData);
    const tmp_1 = this.#_public_key_vote_0(context,
                                           partialProofData,
                                           secret_key_0,
                                           instance_1);
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_3.toValue(3n),
                                                alignment: _descriptor_3.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_1),
                                                                            alignment: _descriptor_1.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newNull().encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    __compactRuntime.assert(index_0 < 4n, 'Invalid choice index');
    const tmp_2 = 1n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_3.toValue(2n),
                                                alignment: _descriptor_3.alignment() } },
                                     { tag: 'value',
                                       value: { value: _descriptor_3.toValue(index_0),
                                                alignment: _descriptor_3.alignment() } }] } },
                     { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                            { value: _descriptor_4.toValue(tmp_2),
                                              alignment: _descriptor_4.alignment() }
                                              .value
                                          )) } },
                     { ins: { cached: true, n: 2 } }]);
    return [];
  }
  #_get_vote_count_0(context, partialProofData, index_0) {
    if (index_0 < 4n) {
      return _descriptor_5.fromValue(Contract._query(context,
                                                     partialProofData,
                                                     [
                                                      { dup: { n: 0 } },
                                                      { idx: { cached: false,
                                                               pushPath: false,
                                                               path: [
                                                                      { tag: 'value',
                                                                        value: { value: _descriptor_3.toValue(2n),
                                                                                 alignment: _descriptor_3.alignment() } },
                                                                      { tag: 'value',
                                                                        value: { value: _descriptor_3.toValue(index_0),
                                                                                 alignment: _descriptor_3.alignment() } }] } },
                                                      { popeq: { cached: true,
                                                                 result: undefined } }]).value);
    } else {
      return 0n;
    }
  }
  #_public_key_vote_0(context, partialProofData, sk_0, instance_0) {
    return this.#_persistent_hash_0(context,
                                    partialProofData,
                                    [new Uint8Array([112, 107, 58, 0, 0]),
                                     instance_0,
                                     sk_0]);
  }
  #_folder_0(context, partialProofData, f, x, a0)
  {
    for (let i = 0; i < 4; i++) x = f(context, partialProofData, x, a0[i]);
    return x;
  }
  static _query(context, partialProofData, prog) {
    var res;
    try {
      res = context.transactionContext.query(prog, __compactRuntime.CostModel.dummyCostModel());
    } catch (err) {
      throw new __compactRuntime.CompactError(err.toString());
    }
    context.transactionContext = res.context;
    var reads = res.events.filter((e) => e.tag === 'read');
    var i = 0;
    partialProofData.publicTranscript = partialProofData.publicTranscript.concat(prog.map((op) => {
      if(typeof(op) === 'object' && 'popeq' in op) {
        return { popeq: {
          ...op.popeq,
          result: reads[i++].content,
        } };
      } else {
        return op;
      }
    }));
    if(res.events.length == 1 && res.events[0].tag === 'read') {
      return res.events[0].content;
    } else {
      return res.events;
    }
  }
}
function ledger(state) {
  const context = {
    originalState: state,
    transactionContext: new __compactRuntime.QueryContext(state, __compactRuntime.dummyContractAddress())
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get numberOfVoters() {
      return _descriptor_5.fromValue(Contract._query(context,
                                                     partialProofData,
                                                     [
                                                      { dup: { n: 0 } },
                                                      { idx: { cached: false,
                                                               pushPath: false,
                                                               path: [
                                                                      { tag: 'value',
                                                                        value: { value: _descriptor_3.toValue(0n),
                                                                                 alignment: _descriptor_3.alignment() } }] } },
                                                      { popeq: { cached: true,
                                                                 result: undefined } }]).value);
    },
    choices: {
      isEmpty(...args_0) {
        if (args_0.length !== 0)
          throw new __compactRuntime.CompactError(`is_empty: expected 0 arguments, received ${args_0.length}`);
        return _descriptor_2.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(1n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        'size',
                                                        { push: { storage: false,
                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                               alignment: _descriptor_5.alignment() }).encode() } },
                                                        'eq',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0)
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        return _descriptor_5.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(1n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        'size',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1)
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0 && key_0 <= 255n))
          __compactRuntime.type_error('member',
                                      'argument 1',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 6, char 1',
                                      'Uint<0..255>',
                                      key_0)
        return _descriptor_2.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(1n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        { push: { storage: false,
                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(key_0),
                                                                                                               alignment: _descriptor_3.alignment() }).encode() } },
                                                        'member',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1)
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0 && key_0 <= 255n))
          __compactRuntime.type_error('lookup',
                                      'argument 1',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 6, char 1',
                                      'Uint<0..255>',
                                      key_0)
        return _descriptor_8.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(1n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(key_0),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        { popeq: { cached: false,
                                                                   result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0)
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        const self_0 = state.asArray()[1];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_3.fromValue(key.value),      _descriptor_8.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    },
    voteCounts: {
      isEmpty(...args_0) {
        if (args_0.length !== 0)
          throw new __compactRuntime.CompactError(`is_empty: expected 0 arguments, received ${args_0.length}`);
        return _descriptor_2.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(2n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        'size',
                                                        { push: { storage: false,
                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                               alignment: _descriptor_5.alignment() }).encode() } },
                                                        'eq',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0)
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        return _descriptor_5.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(2n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        'size',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1)
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0 && key_0 <= 255n))
          __compactRuntime.type_error('member',
                                      'argument 1',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 7, char 1',
                                      'Uint<0..255>',
                                      key_0)
        return _descriptor_2.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(2n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        { push: { storage: false,
                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_3.toValue(key_0),
                                                                                                               alignment: _descriptor_3.alignment() }).encode() } },
                                                        'member',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1)
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0 && key_0 <= 255n))
          __compactRuntime.type_error('lookup',
                                      'argument 1',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 7, char 1',
                                      'Uint<0..255>',
                                      key_0)
        if (state.asArray()[2].asMap().get({ value: _descriptor_3.toValue(key_0),
                                             alignment: _descriptor_3.alignment() }) === undefined)
          throw new __compactRuntime.CompactError(`Map value undefined for ${key_0}`);
        return {
          read(...args_1) {
            if (args_1.length !== 0)
              throw new __compactRuntime.CompactError(`read: expected 0 arguments, received ${args_1.length}`);
            return _descriptor_5.fromValue(Contract._query(context,
                                                           partialProofData,
                                                           [
                                                            { dup: { n: 0 } },
                                                            { idx: { cached: false,
                                                                     pushPath: false,
                                                                     path: [
                                                                            { tag: 'value',
                                                                              value: { value: _descriptor_3.toValue(2n),
                                                                                       alignment: _descriptor_3.alignment() } },
                                                                            { tag: 'value',
                                                                              value: { value: _descriptor_3.toValue(key_0),
                                                                                       alignment: _descriptor_3.alignment() } }] } },
                                                            { popeq: { cached: true,
                                                                       result: undefined } }]).value);
          }
        }
      }
    },
    items: {
      isEmpty(...args_0) {
        if (args_0.length !== 0)
          throw new __compactRuntime.CompactError(`is_empty: expected 0 arguments, received ${args_0.length}`);
        return _descriptor_2.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(3n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        'size',
                                                        { push: { storage: false,
                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                               alignment: _descriptor_5.alignment() }).encode() } },
                                                        'eq',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0)
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        return _descriptor_5.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(3n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        'size',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1)
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        const elem_0 = args_0[0];
        if (!(elem_0.buffer instanceof ArrayBuffer && elem_0.BYTES_PER_ELEMENT === 1 && elem_0.length === 32))
          __compactRuntime.type_error('member',
                                      'argument 1',
                                      '/Users/kaleab/Documents/KLace/scaffold-midnight/boilerplate/contract/src/zkvote.compact line 8, char 1',
                                      'Bytes<32>',
                                      elem_0)
        return _descriptor_2.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_3.toValue(3n),
                                                                                   alignment: _descriptor_3.alignment() } }] } },
                                                        { push: { storage: false,
                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(elem_0),
                                                                                                               alignment: _descriptor_1.alignment() }).encode() } },
                                                        'member',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0)
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        const self_0 = state.asArray()[3];
        return self_0.asMap().keys().map((elem) => _descriptor_1.fromValue(elem.value))[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  originalState: new __compactRuntime.ContractState(),
  transactionContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ });
const pureCircuits = { };
const contractReferenceLocations = { tag: 'publicLedgerArray', indices: { } };
exports.Contract = Contract;
exports.ledger = ledger;
exports.pureCircuits = pureCircuits;
exports.contractReferenceLocations = contractReferenceLocations;
//# sourceMappingURL=index.cjs.map
