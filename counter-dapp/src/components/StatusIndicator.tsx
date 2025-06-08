import { FC } from 'react';
import {
  Box,
  Chip,
} from '@mui/material';
import { 
  CheckCircle, 
  RadioButtonUnchecked, 
  Error as ErrorIcon 
} from '@mui/icons-material';

interface StatusIndicatorProps {
  isConnected: boolean;
  isLoading?: boolean;
  error?: string;
}

export const StatusIndicator: FC<StatusIndicatorProps> = ({
  isConnected,
  isLoading = false,
  error
}) => {
  const getStatusIcon = () => {
    if (error) return <ErrorIcon />;
    if (isConnected) return <CheckCircle />;
    return <RadioButtonUnchecked />;
  };

  const getStatusColor = (): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    if (error) return "error";
    if (isConnected) return "success";
    return "default";
  };

  const getStatusText = () => {
    if (error) return "Connection Error";
    if (isLoading) return "Connecting...";
    if (isConnected) return "Connected to Midnight Network";
    return "Disconnected";
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
      <Chip
        icon={getStatusIcon()}
        label={getStatusText()}
        color={getStatusColor()}
        variant="outlined"
        sx={{ px: 1 }}
      />
    </Box>
  );
};
