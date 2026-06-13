import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Local dev: forward API calls to `wrangler dev` so there is no CORS
      // friction and asset URLs (/api/assets/...) resolve naturally.
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
  build: { sourcemap: false, target: 'es2020' },
});
