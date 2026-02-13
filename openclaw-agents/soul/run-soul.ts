#!/usr/bin/env bun
/**
 * OpenClaw Soul — conversation runner that updates SOUL.md and IDENTITY.md in workspace/.
 *
 * Reads soul/SOUL_PROMPT.md, runs a multi-turn conversation with Claude,
 * then parses the final response and writes:
 * - workspace/SOUL.md, workspace/IDENTITY.md
 *
 * If Brain/Muscles/Bones/DNA output exists (workspace/USER.md or knowledge/teammate/USER.md),
 * injects a short context summary so the model does not re-ask what's already known.
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/soul/run-soul.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOUL_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(SOUL_DIR, "..", "workspace");
const PROMPT_PATH = path.join(SOUL_DIR, "SOUL_PROMPT.md");

const SOUL_WORKSPACE_FILES = ["SOUL.md", "IDENTITY.md"] as const;

const PRIOR_CONTEXT_MAX_CHARS = 2000;

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;

function getSystemPrompt(): string {
  if (!existsSync(PROMPT_PATH)) {
    throw new Error(`Soul prompt not found: ${PROMPT_PATH}`);
  }
  return readFileSync(PROMPT_PATH, "utf-8").trim();
}

function getPriorContextSummary(): string | null {
  const candidates = [
    path.join(WORKSPACE_DIR, "USER.md"),
    path.resolve(SOUL_DIR, "..", "..", "knowledge", "teammate", "USER.md"),
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
 * Extract SOUL.md and IDENTITY.md from assistant text.
 */
function extractWorkspaceFiles(assistantText: string): Map<string, string> {
  const out = new Map<string, string>();
  const names = SOUL_WORKSPACE_FILES.join("|");
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
  for (const name of SOUL_WORKSPACE_FILES) {
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

  const priorSummary = getPriorContextSummary();
  const firstUserMessage = priorSummary
    ? `Prior step output (Brain, Muscles, Bones, or DNA) exists. Use this context and do not re-ask what's already known. Focus on personality: character archetype, tone spectrum, emotional texture, voice, humor, context modes, anti-patterns, identity (name, vibe, emoji, self-reference, introductions).\n\n---\nContext summary (from USER):\n${priorSummary}\n\n---\nBegin with your opening.`
    : "Begin the personality architect conversation. Start with your opening.";

  console.log("\nOpenClaw Soul — Personality Architect\n");
  console.log("Commands: /done or /generate — finish and write SOUL, IDENTITY; /quit — exit without writing.\n");
  if (priorSummary) {
    console.log("(Prior context loaded; will not re-ask what's already documented.)\n");
  }

  messages.push({ role: "user", content: firstUserMessage });
  let assistantText = await chat(apiKey, systemPrompt, messages);
  messages.push({ role: "assistant", content: assistantText });
  console.log("\n[Soul]\n" + assistantText + "\n");

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
          "For SOUL.md and IDENTITY.md: use markdown code blocks, e.g. ```SOUL.md\\n...\\n``` and ```IDENTITY.md\\n...\\n```, or sections ## SOUL.md and ## IDENTITY.md. " +
          "If prior steps already populated these files, refine and merge your new information into the output. " +
          "End with: Review this personality. What's wrong or missing? This becomes how your AI feels to interact with.",
      });
      assistantText = await chat(apiKey, systemPrompt, messages);
      messages.push({ role: "assistant", content: assistantText });
      console.log("\n[Soul]\n" + assistantText + "\n");

      const extracted = extractWorkspaceFiles(assistantText);

      if (extracted.size > 0) {
        console.log("\nWriting to " + WORKSPACE_DIR + ":");
        writeWorkspaceFiles(extracted);
        console.log("Done. Sync to knowledge/teammate/ or ~/.openclaw/workspace/ if needed (see ARCHITECTURE.md).");
      } else {
        console.log("\nNo SOUL.md or IDENTITY.md blocks found in the response. You can copy-paste into openclaw-agents/workspace/ manually.");
      }
      process.exit(0);
    }
    if (!line) continue;

    messages.push({ role: "user", content: line });
    assistantText = await chat(apiKey, systemPrompt, messages);
    messages.push({ role: "assistant", content: assistantText });
    console.log("\n[Soul]\n" + assistantText);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
