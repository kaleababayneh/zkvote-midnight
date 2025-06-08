import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './config/theme';
import { WalletProvider } from './hooks/useWallet';
import { Header, Counter, Footer, ContractInfo } from './components';
import * as pino from 'pino';

const logger = pino.pino({
  level: 'info',
  browser: {
    serialize: true,
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WalletProvider logger={logger}>
        <Box
          sx={{
            minHeight: '100vh',
            backgroundColor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Header />
          
          <Box
            component="main"
            sx={{
              flex: 1,
              px: 2,
              py: 4,
            }}
          >
            <Counter />
            <ContractInfo />
          </Box>
          
          <Footer />
        </Box>
      </WalletProvider>
    </ThemeProvider>
  );
};

export default App;
