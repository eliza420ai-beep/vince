import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  tsconfig: './tsconfig.build.json',
  sourcemap: true,
  clean: true,
  format: ['esm'],
  external: [
    '@elizaos/core',
    '@elizaos/plugin-attract',
    '@elizaos/plugin-commerce',
  ],
  dts: false, // Disabled due to monorepo rootDir constraints
});

