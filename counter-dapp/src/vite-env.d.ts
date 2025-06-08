/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NODE_URL: string
  readonly VITE_INDEXER_URL: string
  readonly VITE_INDEXER_WS_URL: string
  readonly VITE_PROOF_SERVER_URL: string
  readonly VITE_NETWORK_ID: string
  readonly VITE_CONTRACT_ADDRESS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
