import { defineConfig } from "vitest/config";

/**
 * Config for running OpenClaw/Clawterm plugin tests from repo root.
 * Usage: bun run test:clawterm
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    include: ["src/plugins/plugin-openclaw/src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
