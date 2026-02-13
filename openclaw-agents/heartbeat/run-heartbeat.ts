#!/usr/bin/env bun
/**
 * OpenClaw Heartbeat — conversation runner that updates HEARTBEAT.md, AGENTS.md, MEMORY.md, and workspace/memory/ templates.
 *
 * Reads heartbeat/HEARTBEAT_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response and writes:
 * - workspace/HEARTBEAT.md, workspace/AGENTS.md, workspace/MEMORY.md
 * - workspace/memory/DAILY_LOG_TEMPLATE.md, workspace/memory/WEEKLY_REVIEW_TEMPLATE.md (or memory/README.md as fallback)
 *
 * If Brain/Muscles/Bones/DNA/Soul/Eyes output exists (workspace/USER.md or knowledge/teammate/USER.md),
 * injects a short context summary so the model does not re-ask what's already known.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/heartbeat/run-heartbeat.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEARTBEAT_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(HEARTBEAT_DIR, "..", "workspace");
const MEMORY_DIR = path.join(WORKSPACE_DIR, "memory");
const PROMPT_PATH = path.join(HEARTBEAT_DIR, "HEARTBEAT_PROMPT.md");

const HEARTBEAT_WORKSPACE_FILES = ["HEARTBEAT.md", "AGENTS.md", "MEMORY.md"] as const;

const PRIOR_CONTEXT_MAX_CHARS = 2000;

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;

function getSystemPrompt(): string {
  if (!existsSync(PROMPT_PATH)) {
    throw new Error(`Heartbeat prompt not found: ${PROMPT_PATH}`);
  }
  return readFileSync(PROMPT_PATH, "utf-8").trim();
}

function getPriorContextSummary(): string | null {
  const candidates = [
    path.join(WORKSPACE_DIR, "USER.md"),
    path.resolve(HEARTBEAT_DIR, "..", "..", "knowledge", "teammate", "USER.md"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const content = readFileSync(p, "utf-8").trim();
      if (content) {
        const summary =
          content.length > PRIOR_CONTEXT_MAX_CHARS
            ? content.slice(0, PRIOR_CONTEXT_MAX_CHARS) + "\n[... truncated]"
            : content;
        return summary;
      }
    }
  }
  return null;
}

async function chat(
  apiKey: string,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  return text;
}

/**
 * Extract memory/ templates from assistant text.
 * Supports: memory/DAILY_LOG_TEMPLATE.md, memory/WEEKLY_REVIEW_TEMPLATE.md, memory/README.md (fallback).
 */
function extractMemoryTemplates(assistantText: string): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  const seen = new Set<string>();

  const patterns: { path: string; re: RegExp }[] = [
    { path: "memory/DAILY_LOG_TEMPLATE.md", re: /```memory\/DAILY_LOG_TEMPLATE\.md\s*\n([\s\S]*?)```/gi },
    { path: "memory/WEEKLY_REVIEW_TEMPLATE.md", re: /```memory\/WEEKLY_REVIEW_TEMPLATE\.md\s*\n([\s\S]*?)```/gi },
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

/**
 * Extract HEARTBEAT.md, AGENTS.md, MEMORY.md from assistant text.
 */
function extractWorkspaceFiles(assistantText: string): Map<string, string> {
  const out = new Map<string, string>();
  const names = HEARTBEAT_WORKSPACE_FILES.join("|");
  let m: RegExpExecArray | null;

  const codeBlockRe = new RegExp(
    "```(" + names.replace(/\./g, "\\.") + ")\\s*\\n([\\s\\S]*?)```",
    "gi"
  );
  while ((m = codeBlockRe.exec(assistantText)) !== null) {
    const name = m[1];
    const content = m[2].trim();
    if (content) out.set(name, content);
  }

  const sectionRe = new RegExp(
    "##\\s*(" + names.replace(/\./g, "\\.") + ")\\s*\\n([\\s\\S]*?)(?=\\n##\\s|\\n```|$)",
    "gi"
  );
  while ((m = sectionRe.exec(assistantText)) !== null) {
    const name = m[1];
    const content = m[2].trim();
    if (content && !out.has(name)) out.set(name, content);
  }

  return out;
}

function writeWorkspaceFiles(extracted: Map<string, string>): void {
  if (!existsSync(WORKSPACE_DIR)) {
    mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
  for (const name of HEARTBEAT_WORKSPACE_FILES) {
    const content = extracted.get(name);
    if (content) {
      const filePath = path.join(WORKSPACE_DIR, name);
      writeFileSync(filePath, content, "utf-8");
      console.log(`  Wrote ${name}`);
    }
  }
}

function writeMemoryTemplates(entries: { path: string; content: string }[]): void {
  if (entries.length === 0) return;
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
  for (const entry of entries) {
    const filePath = path.join(WORKSPACE_DIR, entry.path);
    writeFileSync(filePath, entry.content, "utf-8");
    console.log(`  Wrote ${entry.path}`);
  }
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is required. Set it in .env or the environment.");
    process.exit(1);
  }

  const systemPrompt = getSystemPrompt();
  const messages: { role: "user" | "assistant"; content: string }[] = [];

  const priorSummary = getPriorContextSummary();
  const firstUserMessage = priorSummary
    ? `Prior step output (Brain, Muscles, Bones, DNA, Soul, or Eyes) exists. Use this context and do not re-ask what's already known. Focus on evolution: daily rhythm, weekly review, memory curation, self-improvement, feedback integration, file evolution, growth metrics, trust escalation.\n\n---\nContext summary (from USER):\n${priorSummary}\n\n---\nBegin with your opening.`
    : "Begin the evolution architect conversation. Start with your opening.";

  console.log("\nOpenClaw Heartbeat — Evolution Architect\n");
  console.log("Commands: /done or /generate — finish and write HEARTBEAT, AGENTS, MEMORY, memory/ templates; /quit — exit without writing.\n");
  if (priorSummary) {
    console.log("(Prior context loaded; will not re-ask what's already documented.)\n");
  }

  messages.push({ role: "user", content: firstUserMessage });
  let assistantText = await chat(apiKey, systemPrompt, messages);
  messages.push({ role: "assistant", content: assistantText });
  console.log("\n[Heartbeat]\n" + assistantText + "\n");

  for (;;) {
    const line = await ask("\n[You] ");
    if (line === "/quit" || line === "/exit") {
      console.log("Exiting without writing files.");
      process.exit(0);
    }
    if (line === "/done" || line === "/generate") {
      messages.push({
        role: "user",
        content:
          "Please generate the official OpenClaw workspace updates now. " +
          "Output each item as follows. " +
          "For HEARTBEAT.md, AGENTS.md, and MEMORY.md: use markdown code blocks, e.g. ```HEARTBEAT.md\\n...\\n```, ```AGENTS.md\\n...\\n```, ```MEMORY.md\\n...\\n```, or sections ## HEARTBEAT.md, ## AGENTS.md, ## MEMORY.md. " +
          "For the memory/ templates: use code blocks ```memory/DAILY_LOG_TEMPLATE.md\\n...\\n``` and ```memory/WEEKLY_REVIEW_TEMPLATE.md\\n...\\n``` (or ```memory/README.md\\n...\\n``` as fallback for a single combined template). " +
          "If prior steps already populated these files, merge your new information into the output. " +
          "End with: Review this evolution system. What's wrong or missing? This becomes how your AI grows over time.",
      });
      assistantText = await chat(apiKey, systemPrompt, messages);
      messages.push({ role: "assistant", content: assistantText });
      console.log("\n[Heartbeat]\n" + assistantText + "\n");

      const workspaceExtracted = extractWorkspaceFiles(assistantText);
      const memoryTemplates = extractMemoryTemplates(assistantText);

      if (workspaceExtracted.size > 0 || memoryTemplates.length > 0) {
        console.log("\nWriting to " + WORKSPACE_DIR + ":");
        if (workspaceExtracted.size > 0) {
          writeWorkspaceFiles(workspaceExtracted);
        }
        if (memoryTemplates.length > 0) {
          writeMemoryTemplates(memoryTemplates);
        }
        console.log("Done. Sync to knowledge/teammate/ or ~/.openclaw/workspace/ if needed (see ARCHITECTURE.md).");
      } else {
        console.log("\nNo workspace or memory template blocks found in the response. You can copy-paste into openclaw-agents/workspace/ and workspace/memory/ manually.");
      }
      process.exit(0);
    }
    if (!line) continue;

    messages.push({ role: "user", content: line });
    assistantText = await chat(apiKey, systemPrompt, messages);
    messages.push({ role: "assistant", content: assistantText });
    console.log("\n[Heartbeat]\n" + assistantText);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
