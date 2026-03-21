import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiPort =
    (env.VITE_API_PORT || env.SERVER_PORT || process.env.SERVER_PORT || '3000').trim() ||
    '3000';
  const apiTarget = `http://127.0.0.1:${apiPort}`;

  return {
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
      // Must match scripts/dev-with-vite.js / start-with-custom-ui (SERVER_PORT); hardcoding 3000 breaks paste.trade etc. when API is not on 3000
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiTarget,
          ws: true,
        },
      },
    },
  };
});
