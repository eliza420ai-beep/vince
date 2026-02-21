#!/usr/bin/env bun
/**
 * Sync openclaw-agents/workspace/ to knowledge/teammate/ so VINCE agents
 * pick up USER.md, SOUL.md, AGENTS.md, etc. via the teammate provider.
 *
 * Run after Brain (or any pillar) to update VINCE context:
 *   bun run openclaw-agents/scripts/sync-workspace-to-teammate.ts
 *
 * From repo root:
 *   bun run openclaw-agents/scripts/sync-workspace-to-teammate.ts
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, "..", "workspace");
const TEAMMATE_DIR = path.resolve(__dirname, "..", "..", "knowledge", "teammate");

function syncDir(srcDir: string, destDir: string, relativePrefix: string): number {
  if (!existsSync(srcDir)) return 0;
  let count = 0;
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(srcDir, e.name);
    const destPath = path.join(destDir, e.name);
    const rel = relativePrefix ? `${relativePrefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
      count += syncDir(srcPath, destPath, rel);
    } else if (e.isFile() && (e.name.endsWith(".md") || e.name.endsWith(".md.template"))) {
      copyFileSync(srcPath, destPath);
      console.log("  " + rel + " -> knowledge/teammate/" + rel);
      count++;
    }
  }
  return count;
}

function main(): void {
  if (!existsSync(WORKSPACE_DIR)) {
    console.log("Workspace directory not found:", WORKSPACE_DIR);
    console.log("Run Brain first: bun run openclaw-agents/brain/run-brain.ts");
    process.exit(1);
  }
  if (!existsSync(TEAMMATE_DIR)) {
    mkdirSync(TEAMMATE_DIR, { recursive: true });
  }
  console.log("Syncing openclaw-agents/workspace/ -> knowledge/teammate/\n");
  const n = syncDir(WORKSPACE_DIR, TEAMMATE_DIR, "");
  if (n === 0) {
    console.log("No .md files found in workspace. Run Brain (or another pillar) first.");
  } else {
    console.log("\nDone. " + n + " file(s) synced. VINCE agents will use these via the teammate provider.");
  }
}

main();
