#!/usr/bin/env bun
/**
 * OpenClaw Soul — conversation runner that updates SOUL.md and IDENTITY.md in workspace/.
 *
 * Reads soul/SOUL_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response and writes workspace/SOUL.md, workspace/IDENTITY.md.
 *
 * If Brain/Muscles/Bones/DNA output exists (workspace/USER.md or knowledge/teammate/USER.md),
 * injects a short context summary so the model does not re-ask what's already known.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/soul/run-soul.ts
 */

import path from "path";
import { fileURLToPath } from "url";
import { runPillar } from "../lib/pillar-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOUL_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(SOUL_DIR, "..", "workspace");
const AGENTS_ROOT = path.resolve(SOUL_DIR, "..", "..");

const SOUL_WORKSPACE_FILES = ["SOUL.md", "IDENTITY.md"] as const;

async function main(): Promise<void> {
  console.log("\nOpenClaw Soul — Personality Architect\n");
  console.log("Commands: /done or /generate — finish and write SOUL, IDENTITY; /quit — exit without writing.\n");

  await runPillar({
    pillarName: "Soul",
    promptPath: path.join(SOUL_DIR, "SOUL_PROMPT.md"),
    workspaceDir: WORKSPACE_DIR,
    agentsRoot: AGENTS_ROOT,
    firstUserMessage: (contextSummary) =>
      contextSummary
        ? `Prior step output (Brain, Muscles, Bones, or DNA) exists. Use this context and do not re-ask what's already known. Focus on personality: character archetype, tone spectrum, emotional texture, voice, humor, context modes, anti-patterns, identity (name, vibe, emoji, self-reference, introductions).\n\n---\nContext summary (from USER):\n${contextSummary}\n\n---\nBegin with your opening.`
        : "Begin the personality architect conversation. Start with your opening.",
    donePrompt:
      "Please generate the official OpenClaw workspace updates now. " +
      "For SOUL.md and IDENTITY.md: use markdown code blocks, e.g. ```SOUL.md\\n...\\n``` and ```IDENTITY.md\\n...\\n```, or sections ## SOUL.md and ## IDENTITY.md. " +
      "If prior steps already populated these files, refine and merge your new information into the output. " +
      "End with: Review this personality. What's wrong or missing? This becomes how your AI feels to interact with.",
    outputFileNames: SOUL_WORKSPACE_FILES,
    doneDescription: "finish and write SOUL, IDENTITY",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
