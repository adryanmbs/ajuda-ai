import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Em desenvolvimento, /api vai para o Express.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
