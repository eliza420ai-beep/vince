import { defineConfig } from "vitest/config";

/**
 * Config for running plugin-x-research (ECHO) tests from repo root.
 * Usage: bun run test:x-research
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    include: ["src/plugins/plugin-x-research/src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
