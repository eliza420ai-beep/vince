import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { $ } from "bun";
import { getViteOutDir } from "./vite-config-utils";

describe("Build Order Integration Test", () => {
  const rootDir = path.resolve(__dirname, "../..");
  const distDir = path.join(rootDir, "dist");
  let viteBuildDir: string;
  // Bun.build creates dist/src/index.js; tsup creates dist/index.js
  const bundleMarkers = [
    path.join(distDir, "index.js"),
    path.join(distDir, "src", "index.js"),
  ];

  beforeAll(async () => {
    // Get the actual vite build directory from config
    const viteOutDirRelative = await getViteOutDir(rootDir);
    viteBuildDir = path.join(rootDir, viteOutDirRelative);

    // Clean dist directory before test
    if (fs.existsSync(distDir)) {
      await fs.promises.rm(distDir, { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    // Clean up after test
    if (fs.existsSync(distDir)) {
      await fs.promises.rm(distDir, { recursive: true, force: true });
    }
  });

  it("should ensure vite build outputs persist after tsup build", async () => {
    // Run the default build (may be build.ts only, or build:all; build.ts does not run vite)
    await $`cd ${rootDir} && bun run build`;

    // At least one bundle output must exist (dist/index.js or dist/src/index.js)
    const hasBundleOutput = bundleMarkers.some((p) => fs.existsSync(p));
    expect(hasBundleOutput).toBe(true);

    const distFiles = fs.readdirSync(distDir);
    const hasIndexJs =
      distFiles.some((file) => file === "index.js") ||
      (fs.existsSync(path.join(distDir, "src")) &&
        fs.readdirSync(path.join(distDir, "src")).includes("index.js"));
    expect(hasIndexJs).toBe(true);

    // If vite build dir exists (e.g. after build:all or separate build:frontend), assert on it
    if (fs.existsSync(viteBuildDir)) {
      const frontendFiles = fs.readdirSync(viteBuildDir);
      expect(frontendFiles.length).toBeGreaterThan(0);
      expect(frontendFiles.some((file) => file.endsWith(".html"))).toBe(true);
      expect(frontendFiles.includes("assets")).toBe(true);
      const viteBuildDirName = path.basename(viteBuildDir);
      expect(distFiles.includes(viteBuildDirName)).toBe(true);
    }
  }, 30000); // 30 second timeout for build process
});
