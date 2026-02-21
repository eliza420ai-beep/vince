#!/usr/bin/env bun
/**
 * OpenClaw Heartbeat — conversation runner that updates HEARTBEAT.md, AGENTS.md, MEMORY.md, and workspace/memory/ templates.
 *
 * Reads heartbeat/HEARTBEAT_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response and writes HEARTBEAT.md, AGENTS.md, MEMORY.md, and memory/ templates.
 *
 * If Brain/.../Eyes output exists (workspace/USER.md or knowledge/teammate/USER.md),
 * injects a short context summary so the model does not re-ask what's already known.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/heartbeat/run-heartbeat.ts
 */

import path from "path";
import { fileURLToPath } from "url";
import { runPillar, extractWorkspaceFiles } from "../lib/pillar-runner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEARTBEAT_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(HEARTBEAT_DIR, "..", "workspace");
const AGENTS_ROOT = path.resolve(HEARTBEAT_DIR, "..", "..");

const HEARTBEAT_WORKSPACE_FILES = ["HEARTBEAT.md", "AGENTS.md", "MEMORY.md"] as const;

function extractMemoryTemplates(
  assistantText: string
): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  const seen = new Set<string>();
  const patterns: { path: string; re: RegExp }[] = [
    {
      path: "memory/DAILY_LOG_TEMPLATE.md",
      re: /```memory\/DAILY_LOG_TEMPLATE\.md\s*\n([\s\S]*?)```/gi,
    },
    {
      path: "memory/WEEKLY_REVIEW_TEMPLATE.md",
      re: /```memory\/WEEKLY_REVIEW_TEMPLATE\.md\s*\n([\s\S]*?)```/gi,
    },
    { path: "memory/README.md", re: /```memory\/README\.md\s*\n([\s\S]*?)```/gi },
  ];
  for (const { path: filePath, re } of patterns) {
    const m = re.exec(assistantText);
    if (m && m[1].trim() && !seen.has(filePath)) {
      seen.add(filePath);
      out.push({ path: filePath, content: m[1].trim() });
    }
  }
  return out;
}

async function main(): Promise<void> {
  console.log("\nOpenClaw Heartbeat — Evolution Architect\n");
  console.log("Commands: /done or /generate — finish and write HEARTBEAT, AGENTS, MEMORY, memory/ templates; /quit — exit without writing.\n");

  await runPillar({
    pillarName: "Heartbeat",
    promptPath: path.join(HEARTBEAT_DIR, "HEARTBEAT_PROMPT.md"),
    workspaceDir: WORKSPACE_DIR,
    agentsRoot: AGENTS_ROOT,
    firstUserMessage: (contextSummary) =>
      contextSummary
        ? `Prior step output (Brain, Muscles, Bones, DNA, Soul, or Eyes) exists. Use this context and do not re-ask what's already known. Focus on evolution: daily rhythm, weekly review, memory curation, self-improvement, feedback integration, file evolution, growth metrics, trust escalation.\n\n---\nContext summary (from USER):\n${contextSummary}\n\n---\nBegin with your opening.`
        : "Begin the evolution architect conversation. Start with your opening.",
    donePrompt:
      "Please generate the official OpenClaw workspace updates now. " +
      "For HEARTBEAT.md, AGENTS.md, and MEMORY.md: use markdown code blocks, e.g. ```HEARTBEAT.md\\n...\\n```, ```AGENTS.md\\n...\\n```, ```MEMORY.md\\n...\\n```, or sections ## HEARTBEAT.md, ## AGENTS.md, ## MEMORY.md. " +
      "For the memory/ templates: use code blocks ```memory/DAILY_LOG_TEMPLATE.md\\n...\\n``` and ```memory/WEEKLY_REVIEW_TEMPLATE.md\\n...\\n``` (or ```memory/README.md\\n...\\n``` as fallback for a single combined template). " +
      "If prior steps already populated these files, merge your new information into the output. " +
      "End with: Review this evolution system. What's wrong or missing? This becomes how your AI grows over time.",
    doneDescription: "finish and write HEARTBEAT, AGENTS, MEMORY, memory/ templates",
    onDone: (assistantText) => {
      const workspaceExtracted = extractWorkspaceFiles(
        assistantText,
        HEARTBEAT_WORKSPACE_FILES
      );
      const memoryTemplates = extractMemoryTemplates(assistantText);
      const relativePaths =
        memoryTemplates.length > 0
          ? new Map(memoryTemplates.map((e) => [e.path, e.content]))
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
