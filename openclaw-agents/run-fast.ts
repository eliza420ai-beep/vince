#!/usr/bin/env bun
/**
 * OpenClaw Fast — one-session onboarding (Brain + DNA + Soul collapsed).
 *
 * Runs a single multi-turn conversation that maps the operator, defines
 * decision protocols and personality, and produces USER.md, SOUL.md, IDENTITY.md,
 * AGENTS.md, TOOLS.md, MEMORY.md, HEARTBEAT.md. Use for quick setup (~15 min).
 * Run the full 8 pillars later for Bones, Eyes, Heartbeat, Nerves.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/run-fast.ts
 */

import path from "path";
import { fileURLToPath } from "url";
import { runPillar } from "./lib/pillar-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.resolve(__dirname, "workspace");
const AGENTS_ROOT = path.resolve(__dirname, "..");

const FAST_OUTPUT_FILES = [
  "USER.md",
  "SOUL.md",
  "IDENTITY.md",
  "AGENTS.md",
  "TOOLS.md",
  "MEMORY.md",
  "HEARTBEAT.md",
] as const;

async function main(): Promise<void> {
  console.log("\nOpenClaw Fast — One-Session Onboarding (Brain + DNA + Soul)\n");
  console.log("Commands: /done or /generate — finish and write workspace files; /quit — exit without writing.\n");

  await runPillar({
    pillarName: "Fast",
    promptPath: path.join(__dirname, "fast", "FAST_PROMPT.md"),
    workspaceDir: WORKSPACE_DIR,
    agentsRoot: AGENTS_ROOT,
    firstUserMessage: "Begin the fast onboarding. Start with your opening.",
    donePrompt:
      "Please generate the official OpenClaw workspace files now. " +
      "Output each file as a markdown code block, e.g. ```USER.md\\n...\\n``` or as a section ## USER.md followed by the content. " +
      "Include: USER.md, SOUL.md, IDENTITY.md, AGENTS.md, TOOLS.md, MEMORY.md, HEARTBEAT.md. " +
      "End with: Review these files. What's wrong or missing? This becomes the foundation. Run the full 8 pillars later for Bones, Eyes, Heartbeat, Nerves.",
    outputFileNames: FAST_OUTPUT_FILES,
    doneDescription: "finish and write workspace files",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
