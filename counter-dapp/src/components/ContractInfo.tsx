import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Divider,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Info, Code, Security, AccountCircle, Key } from '@mui/icons-material';
import { useWallet } from '../hooks/useWallet';

export const ContractInfo = () => {
  const { wallet } = useWallet();

  // Helper function to format addresses for display
  const formatAddress = (address: string): string => {
    if (!address) return 'Not available';
    if (address.length > 32) {
      return `${address.substring(0, 16)}...${address.substring(address.length - 16)}`;
    }
    return address;
  };

  // Helper function to format public key for display
  const formatPublicKey = (publicKey: string): string => {
    if (!publicKey) return 'Not available';
    if (publicKey.length > 32) {
      return `${publicKey.substring(0, 16)}...${publicKey.substring(publicKey.length - 16)}`;
    }
    return publicKey;
  };

  return (
    <Box sx={{ mt: 4, maxWidth: 800, mx: 'auto' }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Info sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Contract Information</Typography>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          {/* Wallet Connection Status */}
          {wallet.isConnected && wallet.coinPublicKey ? (
            <Alert severity="success" sx={{ mb: 3 }}>
              <AlertTitle>Wallet Connected</AlertTitle>
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Coin Public Key:</strong>{' '}
                  <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                    {formatPublicKey(wallet.coinPublicKey)}
                  </Box>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Public key used for transaction signing and verification
                </Typography>
              </Box>
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Wallet Not Connected</AlertTitle>
              Connect your Lace wallet to view wallet information and interact with the contract.
            </Alert>
          )}
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Contract Language
                </Typography>
                <Chip
                  icon={<Code />}
                  label="Compact"
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Network
                </Typography>
                <Chip
                  icon={<Security />}
                  label="Midnight Testnet"
                  color="secondary"
                  variant="outlined"
                />
              </Box>

              {wallet.isConnected && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Wallet Status
                  </Typography>
                  <Chip
                    icon={<AccountCircle />}
                    label="Connected"
                    color="success"
                    variant="outlined"
                  />
                </Box>
              )}

              {wallet.contractAddress && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Contract Status
                  </Typography>
                  <Chip
                    icon={<Code />}
                    label="Deployed"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Available Functions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip label="increment()" variant="outlined" size="small" />
                <Chip label="decrement()" variant="outlined" size="small" />
                <Chip label="getCurrentValue()" variant="outlined" size="small" />
              </Box>

              {wallet.isConnected && wallet.coinPublicKey && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Wallet Public Key
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Key sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        Coin Public Key
                      </Typography>
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.8em',
                        wordBreak: 'break-all',
                        color: 'text.primary'
                      }}
                    >
                      {wallet.coinPublicKey}
                    </Typography>
                  </Box>
                </Box>
              )}

              {wallet.contractAddress && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Contract Address
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.8em',
                        wordBreak: 'break-all',
                        color: 'text.primary'
                      }}
                    >
                      {formatAddress(wallet.contractAddress)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {wallet.contractAddress && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Current Count
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'primary.50', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'primary.200'
                  }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontFamily: 'monospace',
                        textAlign: 'center',
                        color: 'primary.main'
                      }}
                    >
                      {wallet.count}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="body2" color="text.secondary">
            This smart contract demonstrates basic state management on the Midnight Network 
            using zero-knowledge proofs for privacy-preserving computation.
            {wallet.isConnected && ' Your wallet is connected and ready for transactions.'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
