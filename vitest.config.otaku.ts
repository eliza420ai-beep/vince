import { defineConfig } from "vitest/config";

/**
 * Config for running Otaku plugin tests from repo root.
 * Usage: bun run test:otaku
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    include: ["src/plugins/plugin-otaku/src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
