import { defineConfig } from "vitest/config";

/**
 * Config for running Skills OS tests from repo root.
 * Usage: bunx vitest run --config vitest.config.skills.ts
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    include: [
      "scripts/skills/__tests__/**/*.test.ts",
      "src/plugins/plugin-inter-agent/src/__tests__/skillRouting.test.ts",
    ],
    exclude: ["node_modules", "dist"],
  },
});
