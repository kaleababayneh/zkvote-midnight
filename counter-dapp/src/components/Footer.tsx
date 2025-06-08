import * as React from 'react';
import { Box, Typography, Link } from '@mui/material';

export const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        textAlign: 'center',
        py: 3,
        px: 2,
        borderTop: '1px solid',
        borderColor: 'primary.main',
        backgroundColor: 'background.paper',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} Counter DApp - Built on{' '}
        <Link 
          href="https://midnight.network" 
          target="_blank" 
          rel="noopener noreferrer"
          sx={{ color: 'primary.main', textDecoration: 'none' }}
        >
          Midnight Network
        </Link>
      </Typography>
    </Box>
  );
};
