#!/usr/bin/env bun
/**
 * OpenClaw Nerves — conversation runner that produces CONTEXT_MANAGEMENT.md and merges into AGENTS.md and HEARTBEAT.md.
 *
 * Reads nerves/NERVES_PROMPT.md, injects a workspace token audit at start,
 * runs a multi-turn conversation with Claude, then parses the final response and writes
 * CONTEXT_MANAGEMENT.md, AGENTS.md, HEARTBEAT.md.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/nerves/run-nerves.ts
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  runPillar,
  getUserContextSummary,
} from "../lib/pillar-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NERVES_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(NERVES_DIR, "..", "workspace");
const AGENTS_ROOT = path.resolve(NERVES_DIR, "..", "..");

const NERVES_WORKSPACE_FILES = ["CONTEXT_MANAGEMENT.md", "AGENTS.md", "HEARTBEAT.md"] as const;
const PRIOR_CONTEXT_MAX_CHARS = 1500;
const EST_TOKENS_PER_BYTE = 0.25;

interface AuditRow {
  file: string;
  bytes: number;
  estTokens: number;
}

function buildWorkspaceTokenAudit(): string {
  const rows: AuditRow[] = [];
  if (!existsSync(WORKSPACE_DIR)) {
    return "Workspace directory not found. No files to audit.\n";
  }
  function scanDir(dir: string, prefix: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        scanDir(full, rel);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        try {
          const content = readFileSync(full, "utf-8");
          const bytes = Buffer.byteLength(content, "utf-8");
          rows.push({ file: rel, bytes, estTokens: Math.ceil(bytes * EST_TOKENS_PER_BYTE) });
        } catch {
          try {
            const st = statSync(full);
            rows.push({
              file: rel,
              bytes: st.size,
              estTokens: Math.ceil(st.size * EST_TOKENS_PER_BYTE),
            });
          } catch {
            // skip
          }
        }
      }
    }
  }
  scanDir(WORKSPACE_DIR, "");
  rows.sort((a, b) => b.bytes - a.bytes);
  const lines = ["| File | Bytes | Est. Tokens |", "|------|-------|-------------|"];
  for (const r of rows) {
    lines.push(`| ${r.file} | ${r.bytes} | ${r.estTokens} |`);
  }
  const totalBytes = rows.reduce((s, r) => s + r.bytes, 0);
  const totalTokens = rows.reduce((s, r) => s + r.estTokens, 0);
  lines.push(`| **Total** | **${totalBytes}** | **${totalTokens}** |`);
  return lines.join("\n");
}

async function main(): Promise<void> {
  console.log("\nOpenClaw Nerves — Context Efficiency Architect\n");
  console.log("(Workspace token audit injected. Model will analyze and propose guardrails.)\n");
  console.log("Commands: /done or /generate — finish and write CONTEXT_MANAGEMENT, AGENTS, HEARTBEAT; /quit — exit without writing.\n");

  const auditTable = buildWorkspaceTokenAudit();
  const contextSummary = getUserContextSummary(
    WORKSPACE_DIR,
    AGENTS_ROOT,
    PRIOR_CONTEXT_MAX_CHARS
  );
  let firstUserMessage =
    "Workspace file audit (use this for your token audit):\n\n" +
    auditTable +
    "\n\nBegin with your opening. Use this audit to show where the bloat lives, then we'll build the fix together.";
  if (contextSummary) {
    firstUserMessage +=
      "\n\n---\nOperator context (from USER):\n" +
      contextSummary +
      "\n\n---\nDo not re-ask what's already known.";
  }

  await runPillar({
    pillarName: "Nerves",
    promptPath: path.join(NERVES_DIR, "NERVES_PROMPT.md"),
    workspaceDir: WORKSPACE_DIR,
    agentsRoot: AGENTS_ROOT,
    firstUserMessage,
    donePrompt:
      "Please generate the official OpenClaw workspace updates now. " +
      "For CONTEXT_MANAGEMENT.md, AGENTS.md, and HEARTBEAT.md: use markdown code blocks, e.g. ```CONTEXT_MANAGEMENT.md\\n...\\n```, ```AGENTS.md\\n...\\n```, ```HEARTBEAT.md\\n...\\n```, or sections ## CONTEXT_MANAGEMENT.md, ## AGENTS.md, ## HEARTBEAT.md. " +
      "Merge into existing structure; do not replace. AGENTS.md must include a new '## Context Management' section. HEARTBEAT.md must include context monitoring in the checklist. " +
      "End with: Review this context architecture. What's wrong or missing? This becomes how your AI manages its own cognitive load.",
    outputFileNames: NERVES_WORKSPACE_FILES,
    doneDescription: "finish and write CONTEXT_MANAGEMENT, AGENTS, HEARTBEAT",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
