#!/usr/bin/env bun
/**
 * OpenClaw Muscles — conversation runner that updates TOOLS, AGENTS, MEMORY, HEARTBEAT.
 *
 * Reads muscles/MUSCLES_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response and writes TOOLS.md, AGENTS.md, MEMORY.md,
 * HEARTBEAT.md to openclaw-agents/workspace/.
 *
 * If Brain output exists (workspace/USER.md or knowledge/teammate/USER.md),
 * injects a short context summary so the model does not re-ask operator context.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/muscles/run-muscles.ts
 */

import path from "path";
import { fileURLToPath } from "url";
import { runPillar } from "../lib/pillar-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MUSCLES_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(MUSCLES_DIR, "..", "workspace");
const AGENTS_ROOT = path.resolve(MUSCLES_DIR, "..", "..");

const MUSCLES_OUTPUT_FILES = ["TOOLS.md", "AGENTS.md", "MEMORY.md", "HEARTBEAT.md"] as const;

async function main(): Promise<void> {
  console.log("\nOpenClaw Muscles — AI System Architect\n");
  console.log("Commands: /done or /generate — finish and write TOOLS, AGENTS, MEMORY, HEARTBEAT; /quit — exit without writing.\n");

  await runPillar({
    pillarName: "Muscles",
    promptPath: path.join(MUSCLES_DIR, "MUSCLES_PROMPT.md"),
    workspaceDir: WORKSPACE_DIR,
    agentsRoot: AGENTS_ROOT,
    firstUserMessage: (contextSummary) =>
      contextSummary
        ? `Brain output exists. Use this context and do not re-ask what's already known. Focus on models, tools, cost, routing, and architecture.\n\n---\nContext summary (from USER):\n${contextSummary}\n\n---\nBegin with your opening.`
        : "Begin the system architect conversation. Start with your opening.",
    donePrompt:
      "Please generate the official OpenClaw workspace file updates now. " +
      "Output each file as a markdown code block, e.g. ```TOOLS.md\\n...\\n``` or as a section ## TOOLS.md followed by the content. " +
      "Include: TOOLS.md, AGENTS.md, MEMORY.md, HEARTBEAT.md. " +
      "If Brain already populated these files, merge your new information into the output. " +
      "End with: Review this architecture. What's wrong or missing? This becomes how your AI system operates.",
    outputFileNames: MUSCLES_OUTPUT_FILES,
    doneDescription: "finish and write TOOLS, AGENTS, MEMORY, HEARTBEAT",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
