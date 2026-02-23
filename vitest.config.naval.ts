import { defineConfig } from "vitest/config";

/**
 * Config for running Naval plugin tests from repo root.
 * Usage: bun run test:naval
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    include: ["src/plugins/plugin-naval/src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
