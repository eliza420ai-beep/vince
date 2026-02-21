#!/usr/bin/env bun
/**
 * OpenClaw DNA — conversation runner that updates AGENTS.md, MEMORY.md, and workspace/memory/ daily log template.
 *
 * Reads dna/DNA_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response and writes AGENTS.md, MEMORY.md, and memory/DAILY_LOG_TEMPLATE.md (or memory/README.md).
 *
 * If Brain/Muscles/Bones output exists (workspace/USER.md or knowledge/teammate/USER.md),
 * injects a short context summary so the model does not re-ask what's already known.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/dna/run-dna.ts
 */

import path from "path";
import { fileURLToPath } from "url";
import { runPillar, extractWorkspaceFiles } from "../lib/pillar-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DNA_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(DNA_DIR, "..", "workspace");
const AGENTS_ROOT = path.resolve(DNA_DIR, "..", "..");

const DNA_WORKSPACE_FILES = ["AGENTS.md", "MEMORY.md"] as const;

function extractMemoryTemplate(
  assistantText: string
): { path: string; content: string } | null {
  let m: RegExpExecArray | null;
  const dailyLogRe = /```memory\/DAILY_LOG_TEMPLATE\.md\s*\n([\s\S]*?)```/gi;
  m = dailyLogRe.exec(assistantText);
  if (m && m[1].trim()) {
    return { path: "memory/DAILY_LOG_TEMPLATE.md", content: m[1].trim() };
  }
  const readmeRe = /```memory\/README\.md\s*\n([\s\S]*?)```/gi;
  m = readmeRe.exec(assistantText);
  if (m && m[1].trim()) {
    return { path: "memory/README.md", content: m[1].trim() };
  }
  return null;
}

async function main(): Promise<void> {
  console.log("\nOpenClaw DNA — Behavioral Architect\n");
  console.log("Commands: /done or /generate — finish and write AGENTS, MEMORY, memory/ template; /quit — exit without writing.\n");

  await runPillar({
    pillarName: "DNA",
    promptPath: path.join(DNA_DIR, "DNA_PROMPT.md"),
    workspaceDir: WORKSPACE_DIR,
    agentsRoot: AGENTS_ROOT,
    firstUserMessage: (contextSummary) =>
      contextSummary
        ? `Prior step output (Brain, Muscles, or Bones) exists. Use this context and do not re-ask what's already known. Focus on behavioral protocols: decision-making, risk, security, escalation, uncertainty, autonomy, communication, learning, memory architecture.\n\n---\nContext summary (from USER):\n${contextSummary}\n\n---\nBegin with your opening.`
        : "Begin the behavioral architect conversation. Start with your opening.",
    donePrompt:
      "Please generate the official OpenClaw workspace updates now. " +
      "For AGENTS.md and MEMORY.md: use markdown code blocks, e.g. ```AGENTS.md\\n...\\n``` and ```MEMORY.md\\n...\\n```, or sections ## AGENTS.md and ## MEMORY.md. " +
      "For the memory/ daily log template: use a code block ```memory/DAILY_LOG_TEMPLATE.md\\n...\\n``` or ```memory/README.md\\n...\\n``` with the template content (sections that structure daily capture, format that feeds long-term memory). " +
      "If prior steps already populated these files, merge your new information into the output. " +
      "End with: Review this operating logic. What's wrong or missing? This becomes how your AI thinks and behaves.",
    doneDescription: "finish and write AGENTS, MEMORY, memory/ template",
    onDone: (assistantText) => {
      const workspaceExtracted = extractWorkspaceFiles(
        assistantText,
        DNA_WORKSPACE_FILES
      );
      const memoryTemplate = extractMemoryTemplate(assistantText);
      const relativePaths =
        memoryTemplate ?
          new Map<string, string>([[memoryTemplate.path, memoryTemplate.content]])
        : undefined;
      return {
        workspaceFiles: workspaceExtracted.size > 0 ? workspaceExtracted : undefined,
        relativePaths,
      };
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
