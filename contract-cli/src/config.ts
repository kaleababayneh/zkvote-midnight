// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import path from 'node:path';
import fs from 'node:fs';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
export const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

/**
 * Auto-detect the contract directory from the managed directory
 */
function detectContractPath(): string {
  const managedDir = path.resolve(currentDir, '..', '..', 'contract', 'src', 'managed');
  
  if (!fs.existsSync(managedDir)) {
    throw new Error(`Managed directory not found: ${managedDir}`);
  }

  // Look for any contract directory in the managed folder
  const dirs = fs.readdirSync(managedDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  if (dirs.length === 0) {
    throw new Error(`No contract directories found in ${managedDir}`);
  }
  
  // Prefer directories that have both contract/index.d.cts AND keys directory
  for (const dir of dirs) {
    const contractTypesPath = path.join(managedDir, dir, 'contract', 'index.d.cts');
    const keysPath = path.join(managedDir, dir, 'keys');
    if (fs.existsSync(contractTypesPath) && fs.existsSync(keysPath)) {
      console.log(`🔍 Config: Auto-detected contract path: ${dir} (with keys)`);
      return path.join(managedDir, dir);
    }
  }
  
  // Fall back to directories that have just contract types
  for (const dir of dirs) {
    const contractTypesPath = path.join(managedDir, dir, 'contract', 'index.d.cts');
    if (fs.existsSync(contractTypesPath)) {
      console.log(`🔍 Config: Auto-detected contract path: ${dir} (without keys)`);
      return path.join(managedDir, dir);
    }
  }
  
  // If no valid contract found, use the first directory and let it fail gracefully
  const fallbackPath = path.join(managedDir, dirs[0]);
  console.log(`⚠️  Config: No valid contract types found, using: ${dirs[0]}`);
  return fallbackPath;
}

export const contractConfig = {
  privateStateStoreName: 'counter-private-state',
  zkConfigPath: detectContractPath(),
};

export interface Config {
  readonly logDir: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
}

export class TestnetLocalConfig implements Config {
  logDir = path.resolve(currentDir, '..', 'logs', 'testnet-local', `${new Date().toISOString()}.log`);
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}

export class StandaloneConfig implements Config {
  logDir = path.resolve(currentDir, '..', 'logs', 'standalone', `${new Date().toISOString()}.log`);
  indexer = 'http://127.0.0.1:8088/api/v1/graphql';
  indexerWS = 'ws://127.0.0.1:8088/api/v1/graphql/ws';
  node = 'http://127.0.0.1:9944';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId(NetworkId.Undeployed);
  }
}

export class TestnetRemoteConfig implements Config {
  logDir = path.resolve(currentDir, '..', 'logs', 'testnet-remote', `${new Date().toISOString()}.log`);
  indexer = 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
  indexerWS = 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
  node = 'https://rpc.testnet-02.midnight.network';
  proofServer = 'http://127.0.0.1:6300';
  constructor() {
    setNetworkId(NetworkId.TestNet);
  }
}
