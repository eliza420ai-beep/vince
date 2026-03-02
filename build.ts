#!/usr/bin/env bun
/**
 * Self-contained build script for ElizaOS projects
 *
 * Kept intentionally close to upstream template to stay compatible with `elizaos start`.
 */

import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { $ } from "bun";

async function cleanBuild(outdir = "dist") {
  if (existsSync(outdir)) {
    await rm(outdir, { recursive: true, force: true });
    console.log(`✓ Cleaned ${outdir} directory`);
  }
}

async function build() {
  const start = performance.now();
  console.log("🚀 Building project...");

  try {
    // Clean previous build
    await cleanBuild("dist");

    // Run JavaScript build and TypeScript declarations in parallel
    console.log("Starting build tasks...");

    const [buildResult] = await Promise.all([
      // Task 1: Build with Bun
      (async () => {
        console.log("📦 Bundling with Bun...");
        const result = await Bun.build({
          entrypoints: ["./src/index.ts"],
          outdir: "./dist",
          target: "node",
          format: "esm",
          sourcemap: true,
          minify: false,
          external: [
            "dotenv",
            "fs",
            "path",
            "https",
            "crypto",
            "http",
            "url",
            "buffer",
            "js-sha256",
            "node:*",
            "@elizaos/core",
            "@elizaos/plugin-bootstrap",
            "@elizaos/plugin-browser",
            "@elizaos/plugin-personality",
            "@elizaos/plugin-sql",
            "@elizaos/cli",
            "zod",
            "@elizaos/plugin-discovery",
          ],
          naming: {
            entry: "[dir]/[name].[ext]",
          },
        });

        if (!result.success) {
          console.error("✗ Build failed:", result.logs);
          return { success: false, outputs: [] };
        }

        const totalSize = result.outputs.reduce((sum, output) => sum + output.size, 0);
        const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
        console.log(`✓ Built ${result.outputs.length} file(s) - ${sizeMB}MB`);

        return result;
      })(),

      // Task 2: Generate TypeScript declarations (best‑effort, non‑blocking)
      (async () => {
        console.log("📝 Generating TypeScript declarations...");
        const result = await $`tsc --emitDeclarationOnly --incremental --project ./tsconfig.build.json`
          .nothrow()
          .quiet();

        if (result.exitCode === 0) {
          console.log("✓ TypeScript declarations generated");
          return { success: true };
        }

        // Keep build output clean: declaration generation is optional and
        // failures here shouldn't spam the main build logs. Run the tsc
        // command above directly if you want full type diagnostics.
        return { success: false };
      })(),
    ]);

    if (!buildResult.success) {
      return false;
    }

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`✅ Build complete! (${elapsed}s)`);
    return true;
  } catch (error) {
    console.error("Build error:", error);
    return false;
  }
}

// Execute the build
build()
  .then((success) => {
    if (!success) process.exit(1);
  })
  .catch((error) => {
    console.error("Build script error:", error);
    process.exit(1);
  });
