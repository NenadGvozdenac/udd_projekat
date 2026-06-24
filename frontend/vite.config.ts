import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    watch: {
      usePolling: true,
      interval: 300,
    },
    hmr: {
      host: 'localhost',
      port: 3000,
    },
    proxy: {
      '/api': {
        target: 'http://backend:4000',
        changeOrigin: true,
      },
    },
  },
});
