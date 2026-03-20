#!/usr/bin/env bun
/**
 * Verify a regime_bundle_v1.json payload locally (no Dexter required).
 *
 * Usage:
 *   bun run scripts/verify-regime-bundle-v1.ts /path/to/regime_bundle_v1.json
 *
 * Optional env:
 *   VINCE_REGIME_BUNDLE_EXPECT_DIR - if set, we warn when file isn't under it.
 */

import fs from "node:fs";
import path from "node:path";
import { ingestRegimeBundleV1File } from "../src/plugins/plugin-vince/src/utils/regimeBundleV1IngestShim";
import { resolveRegimeBundleOutPath } from "../src/plugins/plugin-vince/src/tasks/regimeBundleV1.tasks";

function getArgPath(): string {
  const arg = process.argv.slice(2).join(" ").trim();
  // CLI args take precedence; otherwise fall back to the configured default outPath.
  if (arg) return arg;
  return resolveRegimeBundleOutPath();
}

function main() {
  const filePath = getArgPath();
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(abs)) {
    console.error(
      `[verify-regime-bundle-v1] File not found: ${abs}\n` +
        `Provide an explicit path arg, or ensure DEXTER artifacts exist and REGIME_BUNDLE_OUT_PATH resolves to a valid file.`,
    );
    process.exit(1);
  }

  const expectedDir = process.env.VINCE_REGIME_BUNDLE_EXPECT_DIR?.trim();
  if (expectedDir) {
    const absDir = path.isAbsolute(expectedDir)
      ? expectedDir
      : path.resolve(process.cwd(), expectedDir);
    if (!abs.startsWith(absDir)) {
      console.warn(
        `[verify-regime-bundle-v1] Warning: file isn't under expected dir: ${absDir}`,
      );
    }
  }

  const result = ingestRegimeBundleV1File(abs);
  if (!result.ok) {
    console.error(`[verify-regime-bundle-v1] FAIL: ${abs}`);
    for (const e of result.errors) console.error(`- ${e}`);
    process.exit(1);
  }

  const sum = result.summary;
  console.log(`[verify-regime-bundle-v1] OK: ${abs}`);
  if (sum) {
    console.log(
      `- overall_direction=${sum.overall_direction} alerts=${sum.alerts_count} assets=${sum.assets_count} sleeves=${sum.sleeves_count}`,
    );
  }
}

main();

