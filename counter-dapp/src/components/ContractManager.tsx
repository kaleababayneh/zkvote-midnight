import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  AlertTitle,
  Divider,
} from '@mui/material';
import { Add, Launch, ContentCopy } from '@mui/icons-material';
import { useWallet } from '../hooks/useWallet';

export const ContractManager = () => {
  const { wallet, deployContract } = useWallet();
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeployNew = async () => {
    setIsDeploying(true);
    try {
      await deployContract();
    } catch (error) {
      console.error('Failed to deploy contract:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!wallet.isConnected) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Alert severity="info">
            <AlertTitle>Contract Management</AlertTitle>
            Connect your wallet to deploy a counter contract.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Launch sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Contract Management</Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />

        {wallet.contractAddress ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Contract Deployed</AlertTitle>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Your counter contract is deployed and ready to use.
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.300',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace',
                    fontSize: '0.9em',
                    wordBreak: 'break-all',
                    mr: 1
                  }}
                >
                  {wallet.contractAddress}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={() => copyToClipboard(wallet.contractAddress!)}
                >
                  Copy
                </Button>
              </Box>
            </Box>
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <AlertTitle>No Contract</AlertTitle>
            Deploy a new contract to start interacting with the counter.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleDeployNew}
            disabled={!!wallet.contractAddress || isDeploying}
          >
            {isDeploying ? 'Deploying...' : 'Deploy New Contract'}
          </Button>
        </Box>

        {wallet.contractAddress && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Contract Status
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label="Deployed" color="success" size="small" />
              <Chip label="Ready" color="primary" size="small" />
              <Chip label={`Count: ${wallet.count}`} color="info" size="small" />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};