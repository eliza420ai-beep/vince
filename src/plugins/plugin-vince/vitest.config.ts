import { defineConfig } from "vitest/config";
import path from "path";
import { existsSync } from "fs";

// Only alias @elizaos/core to local core when present (e.g. in eliza monorepo); else use node_modules
const localCore = path.resolve(__dirname, "../../core/src");
const resolveAlias = existsSync(localCore)
  ? { "@elizaos/core": localCore }
  : {};

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 120000, // 2 minutes for E2E tests
    hookTimeout: 60000,
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
  resolve: {
    alias: resolveAlias,
  },
});
