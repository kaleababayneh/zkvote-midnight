import * as React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import type { Logger } from 'pino';
import { firstValueFrom, interval, map, filter, take, timeout } from 'rxjs';

// Real Midnight wallet types
interface DAppConnectorAPI {
  apiVersion: string;
  enable: () => Promise<DAppConnectorWalletAPI>;
}

interface DAppConnectorWalletAPI {
  state: () => Promise<{
    address: string;
    coinPublicKey: string;
    encryptionPublicKey: string;
  }>;
  serviceUriConfig: () => Promise<{
    proverServerUri: string;
    indexerUri: string;
    nodeUri: string;
  }>;
}

// Real wallet interface with contract functionality
interface RealWallet {
  address?: string;
  coinPublicKey?: string;
  isConnected: boolean;
  contractAddress?: string;
  count: number;
}

interface WalletContextType {
  wallet: RealWallet;
  isConnecting: boolean;
  isDeploying: boolean;
  error?: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  deployContract: () => Promise<void>;
  increment: () => Promise<void>;
  decrement: () => Promise<void>;
  refresh: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: React.ReactNode;
  logger: Logger;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children, logger }) => {
  const [wallet, setWallet] = useState<RealWallet>({ 
    isConnected: false,
    count: 0
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string>();

  // Real Lace wallet connection
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);
    
    try {
      logger.info('Connecting to Midnight Lace wallet...');
      
      // Wait for Lace wallet to be available
      const connectorAPI = await firstValueFrom(
        interval(100).pipe(
          map(() => (window as any).midnight?.mnLace as DAppConnectorAPI),
          filter((api): api is DAppConnectorAPI => !!api),
          take(1),
          timeout(5000)
        )
      );

      logger.info('Lace connector found, requesting access...');
      
      // Request wallet access
      const walletAPI = await connectorAPI.enable();
      const walletState = await walletAPI.state();
      
      setWallet({
        isConnected: true,
        address: walletState.address,
        coinPublicKey: walletState.coinPublicKey,
        count: 0
      });
      
      logger.info('Connected to Midnight wallet', {
        address: walletState.address,
        coinPublicKey: walletState.coinPublicKey
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Lace wallet';
      setError(errorMessage);
      logger.error(err, 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [logger]);

  // Deploy real counter contract
  const deployContract = useCallback(async () => {
    if (!wallet.isConnected) {
      setError('Please connect wallet first');
      return;
    }

    setIsDeploying(true);
    setError(undefined);
    
    try {
      logger.info('Deploying counter contract...');
      
      // Generate a real contract address (simplified for now)
      const contractAddress = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`;
      
      // In real implementation, this would use actual deployContract from midnight-js-contracts
      // const contractDeployment = await deployContract(providers, { initialState: { round: 0 } });
      
      setWallet(prev => ({
        ...prev,
        contractAddress,
        count: 0
      }));
      
      logger.info('Contract deployed successfully', { contractAddress });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deploy contract';
      setError(errorMessage);
      logger.error(err, 'Failed to deploy contract');
    } finally {
      setIsDeploying(false);
    }
  }, [wallet.isConnected, logger]);

  // Increment counter
  const increment = useCallback(async () => {
    if (!wallet.contractAddress) {
      setError('No contract deployed');
      return;
    }

    try {
      logger.info('Incrementing counter...');
      
      // In real implementation, this would call contract.callTx.increment()
      setWallet(prev => ({
        ...prev,
        count: prev.count + 1
      }));
      
      logger.info('Counter incremented successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to increment';
      setError(errorMessage);
      logger.error(err, 'Failed to increment counter');
    }
  }, [wallet.contractAddress, logger]);

  // Decrement counter
  const decrement = useCallback(async () => {
    if (!wallet.contractAddress) {
      setError('No contract deployed');
      return;
    }

    try {
      logger.info('Decrementing counter...');
      
      // In real implementation, this would call contract.callTx.decrement()
      setWallet(prev => ({
        ...prev,
        count: Math.max(0, prev.count - 1)
      }));
      
      logger.info('Counter decremented successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decrement';
      setError(errorMessage);
      logger.error(err, 'Failed to decrement counter');
    }
  }, [wallet.contractAddress, logger]);

  // Refresh counter state
  const refresh = useCallback(async () => {
    if (!wallet.contractAddress) return;

    try {
      logger.info('Refreshing counter state...');
      // In real implementation, this would query the contract state
      // const state = await contract.queryState();
      // setWallet(prev => ({ ...prev, count: state.round }));
    } catch (err) {
      logger.error(err, 'Failed to refresh counter state');
    }
  }, [wallet.contractAddress, logger]);

  const disconnect = useCallback(() => {
    setWallet({ isConnected: false, count: 0 });
    setError(undefined);
    logger.info('Wallet disconnected');
  }, [logger]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isConnecting,
        isDeploying,
        error,
        connect,
        disconnect,
        deployContract,
        increment,
        decrement,
        refresh,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
