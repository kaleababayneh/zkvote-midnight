export interface AppConfig {
  nodeUrl: string;
  indexerUrl: string;
  indexerWsUrl: string;
  proofServerUrl: string;
  networkId: string;
}

export const getConfig = (): AppConfig => {
  return {
    nodeUrl: import.meta.env.VITE_NODE_URL || 'https://rpc.testnet-02.midnight.network',
    indexerUrl: import.meta.env.VITE_INDEXER_URL || 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
    indexerWsUrl: import.meta.env.VITE_INDEXER_WS_URL || 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
    proofServerUrl: import.meta.env.VITE_PROOF_SERVER_URL || 'http://127.0.0.1:6300',
    networkId: import.meta.env.VITE_NETWORK_ID || 'testnet',
  };
};
