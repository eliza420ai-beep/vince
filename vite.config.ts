import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/',
  root: 'src/frontend',
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/frontend/index.html'),
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@elizaos/core': path.resolve(__dirname, '../../core/src'),
      // Use local built api-client (file: copy in node_modules has no dist)
      '@elizaos/api-client': path.resolve(__dirname, 'packages/api-client/dist/index.js'),
      // Stub CDP when not using Coinbase Developer Platform (build works without installing @coinbase/*)
      '@coinbase/cdp-react': path.resolve(__dirname, 'src/frontend/stubs/cdp-react.tsx'),
      '@coinbase/cdp-hooks': path.resolve(__dirname, 'src/frontend/stubs/cdp-hooks.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: false, // if 5173 in use, use next free port (e.g. 5174)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
