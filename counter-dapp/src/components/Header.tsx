import * as React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Chip,
} from '@mui/material';
import { AccountBalanceWallet } from '@mui/icons-material';
import { useWallet } from '../hooks/useWallet';

export const Header: React.FC = () => {
  const { wallet, connect, isConnecting } = useWallet();

  return (
    <AppBar position="static" sx={{ backgroundColor: 'background.paper' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Counter DApp
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {wallet.isConnected ? (
            <Chip 
              icon={<AccountBalanceWallet />}
              label={`${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`}
              color="primary"
              variant="outlined"
            />
          ) : (
            <Button 
              variant="outlined" 
              onClick={connect}
              disabled={isConnecting}
              startIcon={<AccountBalanceWallet />}
              size="small"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};
