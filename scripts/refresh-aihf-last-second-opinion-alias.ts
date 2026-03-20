#!/usr/bin/env bun
/**
 * Refresh AIHF "stable alias" file for VINCE Phase D integration.
 *
 * VINCE reads `last_second_opinion_summary.json` (by default) from the directory
 * you set as `AIHF_ARTIFACT_ROOT`.
 *
 * AIHF itself writes per-run files like:
 *   second_opinion_run_result_<run_id>.json
 *
 * This script copies/symlinks the newest run result into:
 *   last_second_opinion_summary.json
 *
 * Usage:
 *   AIHF_ARTIFACT_ROOT=/path/to/second_opinion_runs bun run scripts/refresh-aihf-last-second-opinion-alias.ts
 *
 * Modes:
 *   --mode copy|symlink   (default: copy)
 */

import fs from "node:fs";
import path from "node:path";

const DEFAULT_FILENAME = "last_second_opinion_summary.json";
const RUN_GLOB_PREFIX = "second_opinion_run_result_";
const RUN_GLOB_SUFFIX = ".json";

function getFlagValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  const v = process.argv[idx + 1];
  if (!v) return undefined;
  return v;
}

function parseMode(): "copy" | "symlink" {
  const raw = getFlagValue("--mode")?.trim();
  if (raw === "symlink") return "symlink";
  return "copy";
}

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function resolveArtifactRoot(): string {
  const fromEnv = process.env.AIHF_ARTIFACT_ROOT?.trim();
  if (!fromEnv) {
    console.error(
      "Missing AIHF_ARTIFACT_ROOT. Example: AIHF_ARTIFACT_ROOT=/abs/path bun run scripts/refresh-aihf-last-second-opinion-alias.ts",
    );
    process.exit(1);
  }
  return fromEnv;
}

function resolveAliasPath(artifactRoot: string): string {
  const explicit = process.env.AIHF_LAST_SECOND_OPINION_FILE?.trim();
  if (explicit) {
    // allow relative alias path; resolve under artifact root.
    if (path.isAbsolute(explicit)) return explicit;
    return path.join(artifactRoot, explicit);
  }
  return path.join(artifactRoot, DEFAULT_FILENAME);
}

function listNewestRunFile(dir: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const runs = entries
    .filter((e) => e.isFile() && e.name.startsWith(RUN_GLOB_PREFIX) && e.name.endsWith(RUN_GLOB_SUFFIX))
    .map((e) => {
      const p = path.join(dir, e.name);
      const st = fs.statSync(p);
      return { p, mtimeMs: st.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return runs[0]?.p ?? null;
}

function ensureFreshAlias(dir: string, aliasPath: string, newestRunPath: string, mode: "copy" | "symlink") {
  const dryRun = isDryRun();
  const action = mode === "symlink" ? "symlink" : "copy";
  if (dryRun) {
    console.log(
      `[refresh-aihf-alias] DRY_RUN would ${action}: newest=${path.basename(newestRunPath)} alias=${path.basename(aliasPath)}`,
    );
    return;
  }

  if (mode === "symlink") {
    try {
      if (fs.existsSync(aliasPath)) fs.unlinkSync(aliasPath);
    } catch {
      // ignore
    }
    fs.symlinkSync(newestRunPath, aliasPath);
    return;
  }

  // copy (default): avoids symlink/mtime ambiguity in containers.
  fs.copyFileSync(newestRunPath, aliasPath);
}

function main() {
  const artifactRoot = resolveArtifactRoot();
  const mode = parseMode();
  const aliasPath = resolveAliasPath(artifactRoot);

  if (!fs.existsSync(artifactRoot)) {
    console.error(`[refresh-aihf-alias] AIHF_ARTIFACT_ROOT not found: ${artifactRoot}`);
    process.exit(1);
  }

  const newestRunPath = listNewestRunFile(artifactRoot);
  if (!newestRunPath) {
    console.error(
      `[refresh-aihf-alias] No "${RUN_GLOB_PREFIX}*${RUN_GLOB_SUFFIX}" files found under ${artifactRoot}`,
    );
    process.exit(1);
  }

  ensureFreshAlias(artifactRoot, aliasPath, newestRunPath, mode);

  const dryRun = isDryRun();
  if (!dryRun) {
    const aliasSt = fs.statSync(aliasPath);
    console.log(
      `[refresh-aihf-alias] mode=${mode} newest=${path.basename(newestRunPath)} alias=${path.basename(aliasPath)} aliasAgeMs=${Date.now() - aliasSt.mtimeMs}`,
    );
  }
}

main();

