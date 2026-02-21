#!/usr/bin/env bun
/**
 * OpenClaw Eyes — conversation runner that updates HEARTBEAT.md, BOOT.md, and AGENTS.md in workspace/.
 *
 * Reads eyes/EYES_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response and writes HEARTBEAT.md, BOOT.md, AGENTS.md.
 *
 * If Brain/.../Soul output exists (workspace/USER.md or knowledge/teammate/USER.md),
 * injects a short context summary so the model does not re-ask what's already known.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/eyes/run-eyes.ts
 */

import path from "path";
import { fileURLToPath } from "url";
import { runPillar } from "../lib/pillar-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EYES_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(EYES_DIR, "..", "workspace");
const AGENTS_ROOT = path.resolve(EYES_DIR, "..", "..");

const EYES_WORKSPACE_FILES = ["HEARTBEAT.md", "BOOT.md", "AGENTS.md"] as const;

async function main(): Promise<void> {
  console.log("\nOpenClaw Eyes — Activation Architect\n");
  console.log("Commands: /done or /generate — finish and write HEARTBEAT, BOOT, AGENTS; /quit — exit without writing.\n");

  await runPillar({
    pillarName: "Eyes",
    promptPath: path.join(EYES_DIR, "EYES_PROMPT.md"),
    workspaceDir: WORKSPACE_DIR,
    agentsRoot: AGENTS_ROOT,
    firstUserMessage: (contextSummary) =>
      contextSummary
        ? `Prior step output (Brain, Muscles, Bones, DNA, or Soul) exists. Use this context and do not re-ask what's already known. Focus on activation: proactive monitoring, triggers/alerts, autonomous actions, cron jobs, heartbeat checklist, active hours, alert thresholds, boot sequence, quiet hours, channel routing, DM policy.\n\n---\nContext summary (from USER):\n${contextSummary}\n\n---\nBegin with your opening.`
        : "Begin the activation architect conversation. Start with your opening.",
    donePrompt:
      "Please generate the official OpenClaw workspace updates now. " +
      "For HEARTBEAT.md, BOOT.md, and AGENTS.md: use markdown code blocks, e.g. ```HEARTBEAT.md\\n...\\n```, ```BOOT.md\\n...\\n```, ```AGENTS.md\\n...\\n```, or sections ## HEARTBEAT.md, ## BOOT.md, ## AGENTS.md. " +
      "If prior steps already populated these files, merge your new information into the output. " +
      "End with: Review this activation system. What's wrong or missing? This becomes what your AI watches and acts on.",
    outputFileNames: EYES_WORKSPACE_FILES,
    doneDescription: "finish and write HEARTBEAT, BOOT, AGENTS",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
