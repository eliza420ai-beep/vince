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
 * Or: cd openclaw-agents/brain && bun run run-brain.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRAIN_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(BRAIN_DIR, "..", "workspace");
const PROMPT_PATH = path.join(BRAIN_DIR, "BRAIN_PROMPT.md");

const WORKSPACE_FILES = [
  "USER.md",
  "SOUL.md",
  "IDENTITY.md",
  "AGENTS.md",
  "TOOLS.md",
  "MEMORY.md",
  "HEARTBEAT.md",
] as const;

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;

function getSystemPrompt(): string {
  if (!existsSync(PROMPT_PATH)) {
    throw new Error(`Brain prompt not found: ${PROMPT_PATH}`);
  }
  return readFileSync(PROMPT_PATH, "utf-8").trim();
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
 * Extract workspace file contents from the last assistant message.
 * Supports:
 * - ```USER.md\n...\n```
 * - ## USER.md\n... (until next ## or ``` or end)
 */
function extractWorkspaceFiles(assistantText: string): Map<string, string> {
  const out = new Map<string, string>();

  // Code blocks: ```USER.md\n...\n```
  const codeBlockRe = /```(USER\.md|SOUL\.md|IDENTITY\.md|AGENTS\.md|TOOLS\.md|MEMORY\.md|HEARTBEAT\.md)\s*\n([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = codeBlockRe.exec(assistantText)) !== null) {
    const name = m[1];
    const content = m[2].trim();
    if (content) out.set(name, content);
  }

  // Sections: ## USER.md\n... (until next ## or ```)
  const sectionRe = /##\s*(USER\.md|SOUL\.md|IDENTITY\.md|AGENTS\.md|TOOLS\.md|MEMORY\.md|HEARTBEAT\.md)\s*\n([\s\S]*?)(?=\n##\s|\n```|$)/gi;
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
  for (const name of WORKSPACE_FILES) {
    const content = extracted.get(name);
    if (content) {
      const filePath = path.join(WORKSPACE_DIR, name);
      writeFileSync(filePath, content, "utf-8");
      console.log(`  Wrote ${name}`);
    }
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

  console.log("\nOpenClaw Brain — Jarvis Initialization Sequence\n");
  console.log("Commands: /done or /generate — finish and write workspace files; /quit — exit without writing.\n");

  // First turn: trigger the opening
  messages.push({
    role: "user",
    content: "Begin the initialization. Start with your opening.",
  });
  let assistantText = await chat(apiKey, systemPrompt, messages);
  messages.push({ role: "assistant", content: assistantText });
  console.log("\n[Brain]\n" + assistantText + "\n");

  // Conversation loop
  for (;;) {
    const line = await ask("\n[You] ");
    if (line === "/quit" || line === "/exit") {
      console.log("Exiting without writing files.");
      process.exit(0);
    }
    if (line === "/done" || line === "/generate") {
      // Request file generation
      messages.push({
        role: "user",
        content:
          "Please generate the official OpenClaw workspace files now. " +
          "Output each file as a markdown code block, e.g. ```USER.md\\n...\\n``` or as a section ## USER.md followed by the content. " +
          "Include: USER.md, SOUL.md, IDENTITY.md, AGENTS.md, TOOLS.md, MEMORY.md, HEARTBEAT.md. " +
          "End with: Review these files. What's wrong or missing? This becomes the foundation for everything.",
      });
      assistantText = await chat(apiKey, systemPrompt, messages);
      messages.push({ role: "assistant", content: assistantText });
      console.log("\n[Brain]\n" + assistantText + "\n");

      const extracted = extractWorkspaceFiles(assistantText);
      if (extracted.size > 0) {
        console.log("\nWriting workspace files to " + WORKSPACE_DIR + ":");
        writeWorkspaceFiles(extracted);
        console.log("Done. Sync to knowledge/teammate/ or ~/.openclaw/workspace/ if needed (see ARCHITECTURE.md).");
      } else {
        console.log("\nNo workspace file blocks found in the response. You can copy-paste into openclaw-agents/workspace/ manually.");
      }
      process.exit(0);
    }
    if (!line) continue;

    messages.push({ role: "user", content: line });
    assistantText = await chat(apiKey, systemPrompt, messages);
    messages.push({ role: "assistant", content: assistantText });
    console.log("\n[Brain]\n" + assistantText);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
