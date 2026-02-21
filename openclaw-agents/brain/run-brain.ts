#!/usr/bin/env bun
/**
 * OpenClaw Brain — conversation runner that produces workspace files.
 *
 * Reads brain/BRAIN_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response for USER.md, SOUL.md, etc. and writes to
 * openclaw-agents/workspace/.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/brain/run-brain.ts
 */

import path from "path";
import { fileURLToPath } from "url";
import { runPillar } from "../lib/pillar-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAIN_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(BRAIN_DIR, "..", "workspace");
const AGENTS_ROOT = path.resolve(BRAIN_DIR, "..", "..");

const WORKSPACE_FILES = [
  "USER.md",
  "SOUL.md",
  "IDENTITY.md",
  "AGENTS.md",
  "TOOLS.md",
  "MEMORY.md",
  "HEARTBEAT.md",
] as const;

async function main(): Promise<void> {
  console.log("\nOpenClaw Brain — Jarvis Initialization Sequence\n");
  console.log("Commands: /done or /generate — finish and write workspace files; /quit — exit without writing.\n");

  await runPillar({
    pillarName: "Brain",
    promptPath: path.join(BRAIN_DIR, "BRAIN_PROMPT.md"),
    workspaceDir: WORKSPACE_DIR,
    agentsRoot: AGENTS_ROOT,
    firstUserMessage: "Begin the initialization. Start with your opening.",
    donePrompt:
      "Please generate the official OpenClaw workspace files now. " +
      "Output each file as a markdown code block, e.g. ```USER.md\\n...\\n``` or as a section ## USER.md followed by the content. " +
      "Include: USER.md, SOUL.md, IDENTITY.md, AGENTS.md, TOOLS.md, MEMORY.md, HEARTBEAT.md. " +
      "End with: Review these files. What's wrong or missing? This becomes the foundation for everything.",
    outputFileNames: WORKSPACE_FILES,
    doneDescription: "finish and write workspace files",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
