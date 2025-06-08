import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/compact-runtime']
  },
  build: {
    target: 'esnext'
  }
});
