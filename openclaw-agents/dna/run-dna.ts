#!/usr/bin/env bun
/**
 * OpenClaw DNA — conversation runner that updates AGENTS.md, MEMORY.md, and workspace/memory/ daily log template.
 *
 * Reads dna/DNA_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response and writes:
 * - workspace/AGENTS.md, workspace/MEMORY.md
 * - workspace/memory/DAILY_LOG_TEMPLATE.md (or memory/README.md)
 *
 * If Brain/Muscles/Bones output exists (workspace/USER.md or knowledge/teammate/USER.md),
 * injects a short context summary so the model does not re-ask what's already known.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/dna/run-dna.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DNA_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(DNA_DIR, "..", "workspace");
const MEMORY_DIR = path.join(WORKSPACE_DIR, "memory");
const PROMPT_PATH = path.join(DNA_DIR, "DNA_PROMPT.md");

const DNA_WORKSPACE_FILES = ["AGENTS.md", "MEMORY.md"] as const;

const PRIOR_CONTEXT_MAX_CHARS = 2000;

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;

function getSystemPrompt(): string {
  if (!existsSync(PROMPT_PATH)) {
    throw new Error(`DNA prompt not found: ${PROMPT_PATH}`);
  }
  return readFileSync(PROMPT_PATH, "utf-8").trim();
}

function getPriorContextSummary(): string | null {
  const candidates = [
    path.join(WORKSPACE_DIR, "USER.md"),
    path.resolve(DNA_DIR, "..", "..", "knowledge", "teammate", "USER.md"),
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
 * Extract memory/ daily log template from assistant text.
 * Supports: ```memory/DAILY_LOG_TEMPLATE.md\n...\n``` and ```memory/README.md\n...\n```
 */
function extractMemoryTemplate(assistantText: string): { path: string; content: string } | null {
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

/**
 * Extract AGENTS.md and MEMORY.md from assistant text.
 */
function extractWorkspaceFiles(assistantText: string): Map<string, string> {
  const out = new Map<string, string>();
  const names = DNA_WORKSPACE_FILES.join("|");
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
  for (const name of DNA_WORKSPACE_FILES) {
    const content = extracted.get(name);
    if (content) {
      const filePath = path.join(WORKSPACE_DIR, name);
      writeFileSync(filePath, content, "utf-8");
      console.log(`  Wrote ${name}`);
    }
  }
}

function writeMemoryTemplate(entry: { path: string; content: string } | null): void {
  if (!entry) return;
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
  const filePath = path.join(WORKSPACE_DIR, entry.path);
  writeFileSync(filePath, entry.content, "utf-8");
  console.log(`  Wrote ${entry.path}`);
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
    ? `Prior step output (Brain, Muscles, or Bones) exists. Use this context and do not re-ask what's already known. Focus on behavioral protocols: decision-making, risk, security, escalation, uncertainty, autonomy, communication, learning, memory architecture.\n\n---\nContext summary (from USER):\n${priorSummary}\n\n---\nBegin with your opening.`
    : "Begin the behavioral architect conversation. Start with your opening.";

  console.log("\nOpenClaw DNA — Behavioral Architect\n");
  console.log("Commands: /done or /generate — finish and write AGENTS, MEMORY, memory/ template; /quit — exit without writing.\n");
  if (priorSummary) {
    console.log("(Prior context loaded; will not re-ask what's already documented.)\n");
  }

  messages.push({ role: "user", content: firstUserMessage });
  let assistantText = await chat(apiKey, systemPrompt, messages);
  messages.push({ role: "assistant", content: assistantText });
  console.log("\n[DNA]\n" + assistantText + "\n");

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
          "For AGENTS.md and MEMORY.md: use markdown code blocks, e.g. ```AGENTS.md\\n...\\n``` and ```MEMORY.md\\n...\\n```, or sections ## AGENTS.md and ## MEMORY.md. " +
          "For the memory/ daily log template: use a code block ```memory/DAILY_LOG_TEMPLATE.md\\n...\\n``` or ```memory/README.md\\n...\\n``` with the template content (sections that structure daily capture, format that feeds long-term memory). " +
          "If prior steps already populated these files, merge your new information into the output. " +
          "End with: Review this operating logic. What's wrong or missing? This becomes how your AI thinks and behaves.",
      });
      assistantText = await chat(apiKey, systemPrompt, messages);
      messages.push({ role: "assistant", content: assistantText });
      console.log("\n[DNA]\n" + assistantText + "\n");

      const workspaceExtracted = extractWorkspaceFiles(assistantText);
      const memoryTemplate = extractMemoryTemplate(assistantText);

      if (workspaceExtracted.size > 0 || memoryTemplate) {
        console.log("\nWriting to " + WORKSPACE_DIR + ":");
        if (workspaceExtracted.size > 0) {
          writeWorkspaceFiles(workspaceExtracted);
        }
        if (memoryTemplate) {
          writeMemoryTemplate(memoryTemplate);
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
    console.log("\n[DNA]\n" + assistantText);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
