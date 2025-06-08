import * as React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import { Add, Remove, Refresh, AccountBalanceWallet } from '@mui/icons-material';
import { useWallet } from '../hooks/useWallet';

export const Counter: React.FC = () => {
  const { 
    wallet,
    isConnecting,
    isDeploying,
    error,
    connect,
    deployContract,
    increment,
    decrement,
    refresh
  } = useWallet();

  if (!wallet.isConnected) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Card sx={{ maxWidth: 400, mx: 'auto' }}>
          <CardContent sx={{ py: 4 }}>
            <AccountBalanceWallet sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Connect Your Lace Wallet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Connect your Midnight Lace wallet to interact with the counter contract.
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <Button
              variant="contained"
              size="large"
              onClick={connect}
              disabled={isConnecting}
              startIcon={isConnecting ? <CircularProgress size={20} /> : <AccountBalanceWallet />}
            >
              {isConnecting ? 'Connecting...' : 'Connect Lace Wallet'}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // If connected but no contract deployed, show deploy option
  if (!wallet.contractAddress) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Card sx={{ maxWidth: 400, mx: 'auto' }}>
          <CardContent sx={{ py: 4 }}>
            <Typography variant="h5" gutterBottom>
              Deploy Counter Contract
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Wallet connected: {wallet.address?.slice(0, 10)}...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Deploy a new counter contract to get started.
            </Typography>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <Button
              variant="contained"
              size="large"
              color="success"
              onClick={deployContract}
              disabled={isDeploying}
            >
              {isDeploying ? <CircularProgress size={24} /> : 'Deploy Counter Contract'}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
              Counter Contract
            </Typography>
            <Typography variant="body1" color="text.secondary">
              A simple counter built on Midnight Network
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Counter Display */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h2" sx={{ mb: 2, fontWeight: 'bold' }}>
              {wallet.count}
            </Typography>
            <Chip 
              label={`Current Value: ${wallet.count}`}
              color="primary"
              variant="outlined"
              sx={{ fontSize: '1rem', py: 1 }}
            />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              onClick={decrement}
              variant="outlined"
              size="large"
              startIcon={isDeploying ? <CircularProgress size={16} /> : <Remove />}
              disabled={isDeploying}
              sx={{ minWidth: 120 }}
            >
              Decrement
            </Button>
            
            <Button
              onClick={refresh}
              variant="outlined"
              size="large"
              startIcon={isDeploying ? <CircularProgress size={16} /> : <Refresh />}
              disabled={isDeploying}
              sx={{ minWidth: 120 }}
            >
              Refresh
            </Button>
            
            <Button
              onClick={increment}
              variant="contained"
              size="large"
              startIcon={isDeploying ? <CircularProgress size={16} /> : <Add />}
              disabled={isDeploying}
              sx={{ minWidth: 120 }}
            >
              Increment
            </Button>
          </Box>

          {/* Status */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              {isDeploying ? 'Processing transaction...' : 'Ready for next action'}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </CardContent>
      </Card>

      {/* Additional Info Card */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            About This DApp
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            This is a simple counter decentralized application built on the Midnight Network. 
            It demonstrates basic smart contract interactions including increment and decrement operations.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connected Wallet: {wallet.address}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
