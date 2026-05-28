import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/luminous-carbon-atlas/',
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_BASE || 'http://localhost:8000',
    },
  },
});
