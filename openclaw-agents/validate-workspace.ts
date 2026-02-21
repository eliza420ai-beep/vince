#!/usr/bin/env bun
/**
 * Validate OpenClaw workspace completeness and report which pillars have run.
 *
 * Run: bun run openclaw-agents/validate-workspace.ts
 *
 * Checks that required workspace files exist and are non-empty (not just template stubs).
 * Reports which pillars appear to have been run and suggests next steps.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, "workspace");
const MIN_CONTENT_LENGTH = 80;

interface PillarCheck {
  pillar: string;
  description: string;
  check: () => boolean;
}

function fileExistsAndNonTemplate(relPath: string): boolean {
  const full = path.join(WORKSPACE_DIR, relPath);
  if (!existsSync(full)) return false;
  const content = readFileSync(full, "utf-8").trim();
  if (content.length < MIN_CONTENT_LENGTH) return false;
  const templatePath = path.join(WORKSPACE_DIR, relPath + ".template");
  if (existsSync(templatePath)) {
    const template = readFileSync(templatePath, "utf-8").trim();
    if (template && content === template) return false;
  }
  return true;
}

function dirHasMarkdown(relPath: string): boolean {
  const full = path.join(WORKSPACE_DIR, relPath);
  if (!existsSync(full)) return false;
  const entries = readdirSync(full, { withFileTypes: true });
  return entries.some((e) => e.isFile() && e.name.endsWith(".md"));
}

function hasMemoryTemplates(): boolean {
  const memoryDir = path.join(WORKSPACE_DIR, "memory");
  if (!existsSync(memoryDir)) return false;
  const entries = readdirSync(memoryDir, { withFileTypes: true });
  const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".md"));
  return mdFiles.length >= 1;
}

const CHECKS: PillarCheck[] = [
  {
    pillar: "Brain",
    description: "USER, SOUL, IDENTITY, AGENTS, TOOLS, MEMORY, HEARTBEAT",
    check: () =>
      fileExistsAndNonTemplate("USER.md") &&
      fileExistsAndNonTemplate("SOUL.md") &&
      fileExistsAndNonTemplate("AGENTS.md"),
  },
  {
    pillar: "Muscles",
    description: "TOOLS, AGENTS, MEMORY, HEARTBEAT (model/routing/cost)",
    check: () =>
      fileExistsAndNonTemplate("TOOLS.md") && fileExistsAndNonTemplate("HEARTBEAT.md"),
  },
  {
    pillar: "Bones",
    description: "workspace/skills/ + TOOLS, AGENTS, MEMORY, HEARTBEAT",
    check: () => dirHasMarkdown("skills"),
  },
  {
    pillar: "DNA",
    description: "AGENTS, MEMORY, memory/ daily log template",
    check: () =>
      fileExistsAndNonTemplate("MEMORY.md") && hasMemoryTemplates(),
  },
  {
    pillar: "Soul",
    description: "SOUL, IDENTITY (personality)",
    check: () =>
      fileExistsAndNonTemplate("SOUL.md") && fileExistsAndNonTemplate("IDENTITY.md"),
  },
  {
    pillar: "Eyes",
    description: "HEARTBEAT, BOOT, AGENTS (activation)",
    check: () => fileExistsAndNonTemplate("BOOT.md"),
  },
  {
    pillar: "Heartbeat",
    description: "HEARTBEAT, AGENTS, MEMORY, memory/ templates",
    check: () => {
      if (!hasMemoryTemplates()) return false;
      const weekly = path.join(WORKSPACE_DIR, "memory", "WEEKLY_REVIEW_TEMPLATE.md");
      const daily = path.join(WORKSPACE_DIR, "memory", "DAILY_LOG_TEMPLATE.md");
      return existsSync(weekly) || existsSync(daily);
    },
  },
  {
    pillar: "Nerves",
    description: "CONTEXT_MANAGEMENT, AGENTS, HEARTBEAT (context guardrails)",
    check: () => fileExistsAndNonTemplate("CONTEXT_MANAGEMENT.md"),
  },
];

function main(): void {
  console.log("OpenClaw workspace validation\n");
  console.log("Workspace dir:", WORKSPACE_DIR);
  if (!existsSync(WORKSPACE_DIR)) {
    console.log("\nWorkspace directory not found. Run Brain first:");
    console.log("  bun run openclaw-agents/brain/run-brain.ts");
    process.exit(1);
  }
  console.log("");

  const results: { pillar: string; ok: boolean; description: string }[] = [];
  for (const { pillar, description, check } of CHECKS) {
    const ok = check();
    results.push({ pillar, ok, description });
  }

  const run = results.filter((r) => r.ok);
  const pending = results.filter((r) => !r.ok);

  console.log("Pillar status:");
  for (const r of results) {
    console.log("  " + (r.ok ? "[x]" : "[ ]") + " " + r.pillar + " — " + r.description);
  }
  console.log("");
  console.log("Summary: " + run.length + " pillar(s) appear complete, " + pending.length + " pending.");
  if (pending.length > 0) {
    const next = pending[0];
    console.log("\nSuggested next: run " + next.pillar + " — " + next.description);
    console.log("  bun run openclaw-agents/" + next.pillar.toLowerCase() + "/run-" + next.pillar.toLowerCase() + ".ts");
  }
  if (run.length > 0 && run.length < 8) {
    console.log("\nAfter more pillars, sync to VINCE: bun run openclaw-agents/scripts/sync-workspace-to-teammate.ts");
  }
  if (run.length === 8) {
    console.log("\nAll 8 pillars complete. Sync to knowledge/teammate/ and ~/.openclaw/workspace/ as needed.");
  }
}

main();
