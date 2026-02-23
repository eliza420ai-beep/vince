import { defineConfig } from "vitest/config";

/**
 * Config for running Sentinel plugin tests from repo root.
 * Usage: bun run test:sentinel
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    include: ["src/plugins/plugin-sentinel/src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
