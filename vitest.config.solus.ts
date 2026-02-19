import { defineConfig } from "vitest/config";

/**
 * Config for running Solus plugin API tests (FMP, Finnhub) from repo root.
 * Usage: bun run test:solus-apis
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    include: ["src/plugins/plugin-solus/src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
