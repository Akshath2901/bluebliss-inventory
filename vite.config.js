import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bluebliss/firebase': path.resolve(__dirname, '../../packages/firebase/src/config.js'),
      '@bluebliss/ai':       path.resolve(__dirname, '../../packages/ai/src/index.js'),
      '@bluebliss/utils':    path.resolve(__dirname, '../../packages/utils/src/index.js'),
    },
  },
  server: { port: 5175 },
});
