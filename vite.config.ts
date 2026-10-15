import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

import os from 'node:os';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  cacheDir: path.resolve(os.tmpdir(), 'phantom-detector-vite'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
  },
});
