import { createTheme } from '@mui/material/styles';

const primaryColor = '#4DB378';

export const theme = createTheme({
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    allVariants: {
      color: '#fefefe',
    },
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 300,
    },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: primaryColor,
      light: '#6bc496',
      dark: '#2d6e4e',
    },
    secondary: {
      main: '#0f2730',
      light: '#1a3c4a',
      dark: '#0a1c25',
    },
    background: {
      default: '#0F2830',
      paper: '#1a3c4a',
    },
    text: {
      primary: '#fefefe',
      secondary: 'rgba(254, 254, 254, 0.7)',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
          padding: '8px 24px',
        },
        outlined: {
          borderColor: primaryColor,
          color: primaryColor,
          '&:hover': {
            borderColor: '#6bc496',
            backgroundColor: 'rgba(75, 179, 120, 0.08)',
          },
        },
        contained: {
          backgroundColor: primaryColor,
          '&:hover': {
            backgroundColor: '#2d6e4e',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a3c4a',
          borderRadius: '12px',
          border: '1px solid rgba(75, 179, 120, 0.2)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: '#1a3c4a',
          color: '#fefefe',
        },
      },
    },
  },
});
