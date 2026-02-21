#!/usr/bin/env bun
/**
 * OpenClaw Bones — conversation runner that produces skills/ and updates TOOLS, AGENTS, MEMORY, HEARTBEAT.
 *
 * Reads bones/BONES_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response and writes workspace/skills/ + TOOLS, AGENTS, MEMORY, HEARTBEAT.
 *
 * If Brain or Muscles output exists (workspace/USER.md or knowledge/teammate/USER.md),
 * injects a short context summary so the model does not re-ask what's already known.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/bones/run-bones.ts
 */

import path from "path";
import { fileURLToPath } from "url";
import { runPillar, extractWorkspaceFiles } from "../lib/pillar-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BONES_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(BONES_DIR, "..", "workspace");
const AGENTS_ROOT = path.resolve(BONES_DIR, "..", "..");

const BONES_WORKSPACE_FILES = ["TOOLS.md", "AGENTS.md", "MEMORY.md", "HEARTBEAT.md"] as const;

function extractSkillsFiles(assistantText: string): Map<string, string> {
  const out = new Map<string, string>();
  let m: RegExpExecArray | null;

  const codebasesRe = /```skills\/codebases\/SKILL\.md\s*\n([\s\S]*?)```/gi;
  while ((m = codebasesRe.exec(assistantText)) !== null) {
    const content = m[1].trim();
    if (content) out.set("skills/codebases/SKILL.md", content);
  }

  const perRepoRe = /```skills\/([a-zA-Z0-9_-]+)\/SKILL\.md\s*\n([\s\S]*?)```/gi;
  while ((m = perRepoRe.exec(assistantText)) !== null) {
    const repoName = m[1];
    const content = m[2].trim();
    if (content) out.set(`skills/${repoName}/SKILL.md`, content);
  }
  return out;
}

async function main(): Promise<void> {
  console.log("\nOpenClaw Bones — Codebase Intelligence Engine\n");
  console.log("Commands: /done or /generate — finish and write skills/ + TOOLS, AGENTS, MEMORY, HEARTBEAT; /quit — exit without writing.\n");

  await runPillar({
    pillarName: "Bones",
    promptPath: path.join(BONES_DIR, "BONES_PROMPT.md"),
    workspaceDir: WORKSPACE_DIR,
    agentsRoot: AGENTS_ROOT,
    firstUserMessage: (contextSummary) =>
      contextSummary
        ? `Brain or Muscles output exists. Use this context and do not re-ask what's already known. Focus on codebase inventory, architecture, conventions, and skills.\n\n---\nContext summary (from USER):\n${contextSummary}\n\n---\nBegin with your opening.`
        : "Begin the codebase intelligence conversation. Start with your opening.",
    donePrompt:
      "Please generate the official OpenClaw workspace updates now. " +
      "For skills: use markdown code blocks, e.g. ```skills/codebases/SKILL.md\\n...\\n``` for the master index and ```skills/[repo-name]/SKILL.md\\n...\\n``` for each repo (one block per repo). " +
      "For workspace files: use ```TOOLS.md\\n...\\n``` or ## TOOLS.md and same for AGENTS.md, MEMORY.md, HEARTBEAT.md. " +
      "If Brain or Muscles already populated these files, merge your new information into the output. " +
      "End with: Review this codebase map. What's wrong or missing? This becomes the skeleton your AI builds on.",
    doneDescription: "finish and write skills/ + TOOLS, AGENTS, MEMORY, HEARTBEAT",
    onDone: (assistantText) => {
      const skillsExtracted = extractSkillsFiles(assistantText);
      const workspaceExtracted = extractWorkspaceFiles(
        assistantText,
        BONES_WORKSPACE_FILES
      );
      return {
        workspaceFiles: workspaceExtracted.size > 0 ? workspaceExtracted : undefined,
        relativePaths: skillsExtracted.size > 0 ? skillsExtracted : undefined,
      };
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
