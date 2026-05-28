import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_BASE || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  base: '/lumious-carbon-atlas/',
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
});
