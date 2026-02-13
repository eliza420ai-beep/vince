#!/usr/bin/env bun
/**
 * OpenClaw Nerves — conversation runner that produces CONTEXT_MANAGEMENT.md and merges context-management into AGENTS.md and HEARTBEAT.md.
 *
 * Reads nerves/NERVES_PROMPT.md, injects a workspace token audit (file list + bytes + est. tokens) at start,
 * runs a multi-turn conversation with Claude, then parses the final response and writes:
 * - workspace/CONTEXT_MANAGEMENT.md, workspace/AGENTS.md, workspace/HEARTBEAT.md
 *
 * Requires: ANTHROPIC_API_KEY
 * Run: bun run openclaw-agents/nerves/run-nerves.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NERVES_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(NERVES_DIR, "..", "workspace");
const PROMPT_PATH = path.join(NERVES_DIR, "NERVES_PROMPT.md");

const NERVES_WORKSPACE_FILES = ["CONTEXT_MANAGEMENT.md", "AGENTS.md", "HEARTBEAT.md"] as const;

const PRIOR_CONTEXT_MAX_CHARS = 1500;
const EST_TOKENS_PER_BYTE = 0.25; // ~4 bytes per token

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;

function getSystemPrompt(): string {
  if (!existsSync(PROMPT_PATH)) {
    throw new Error(`Nerves prompt not found: ${PROMPT_PATH}`);
  }
  return readFileSync(PROMPT_PATH, "utf-8").trim();
}

interface AuditRow {
  file: string;
  bytes: number;
  estTokens: number;
}

/**
 * Scan workspace for .md files and return audit table (path, bytes, est. tokens), sorted by bytes descending.
 */
function buildWorkspaceTokenAudit(): string {
  const rows: AuditRow[] = [];

  if (!existsSync(WORKSPACE_DIR)) {
    return "Workspace directory not found. No files to audit.\n";
  }

  function scanDir(dir: string, prefix: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        scanDir(full, rel);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        try {
          const content = readFileSync(full, "utf-8");
          const bytes = Buffer.byteLength(content, "utf-8");
          const estTokens = Math.ceil(bytes * EST_TOKENS_PER_BYTE);
          rows.push({ file: rel, bytes, estTokens });
        } catch {
          try {
            const st = statSync(full);
            const bytes = st.size;
            const estTokens = Math.ceil(bytes * EST_TOKENS_PER_BYTE);
            rows.push({ file: rel, bytes, estTokens });
          } catch {
            // skip
          }
        }
      }
    }
  }

  scanDir(WORKSPACE_DIR, "");

  rows.sort((a, b) => b.bytes - a.bytes);

  const lines = ["| File | Bytes | Est. Tokens |", "|------|-------|-------------|"];
  for (const r of rows) {
    lines.push(`| ${r.file} | ${r.bytes} | ${r.estTokens} |`);
  }
  const totalBytes = rows.reduce((s, r) => s + r.bytes, 0);
  const totalTokens = rows.reduce((s, r) => s + r.estTokens, 0);
  lines.push(`| **Total** | **${totalBytes}** | **${totalTokens}** |`);
  return lines.join("\n");
}

function getPriorContextSummary(): string | null {
  const candidates = [
    path.join(WORKSPACE_DIR, "USER.md"),
    path.resolve(NERVES_DIR, "..", "..", "knowledge", "teammate", "USER.md"),
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
 * Extract CONTEXT_MANAGEMENT.md, AGENTS.md, HEARTBEAT.md from assistant text.
 */
function extractWorkspaceFiles(assistantText: string): Map<string, string> {
  const out = new Map<string, string>();
  const namePattern = NERVES_WORKSPACE_FILES.map((n) => n.replace(/\./g, "\\.")).join("|");
  let m: RegExpExecArray | null;

  const codeRe = new RegExp(
    "```(" + namePattern + ")\\s*\\n([\\s\\S]*?)```",
    "gi"
  );
  while ((m = codeRe.exec(assistantText)) !== null) {
    const name = m[1];
    const content = m[2].trim();
    if (content) out.set(name, content);
  }

  const sectionRe = new RegExp(
    "##\\s*(" + namePattern + ")\\s*\\n([\\s\\S]*?)(?=\\n##\\s|\\n```|$)",
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
  for (const name of NERVES_WORKSPACE_FILES) {
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

  const auditTable = buildWorkspaceTokenAudit();
  const priorSummary = getPriorContextSummary();
  let firstUserMessage =
    "Workspace file audit (use this for your token audit):\n\n" +
    auditTable +
    "\n\nBegin with your opening. Use this audit to show where the bloat lives, then we'll build the fix together.";
  if (priorSummary) {
    firstUserMessage +=
      "\n\n---\nOperator context (from USER):\n" + priorSummary + "\n\n---\nDo not re-ask what's already known.";
  }

  console.log("\nOpenClaw Nerves — Context Efficiency Architect\n");
  console.log("(Workspace token audit injected. Model will analyze and propose guardrails.)\n");
  console.log("Commands: /done or /generate — finish and write CONTEXT_MANAGEMENT, AGENTS, HEARTBEAT; /quit — exit without writing.\n");

  messages.push({ role: "user", content: firstUserMessage });
  let assistantText = await chat(apiKey, systemPrompt, messages);
  messages.push({ role: "assistant", content: assistantText });
  console.log("\n[Nerves]\n" + assistantText + "\n");

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
          "For CONTEXT_MANAGEMENT.md, AGENTS.md, and HEARTBEAT.md: use markdown code blocks, e.g. ```CONTEXT_MANAGEMENT.md\\n...\\n```, ```AGENTS.md\\n...\\n```, ```HEARTBEAT.md\\n...\\n```, or sections ## CONTEXT_MANAGEMENT.md, ## AGENTS.md, ## HEARTBEAT.md. " +
          "Merge into existing structure; do not replace. AGENTS.md must include a new '## Context Management' section. HEARTBEAT.md must include context monitoring in the checklist. " +
          "End with: Review this context architecture. What's wrong or missing? This becomes how your AI manages its own cognitive load.",
      });
      assistantText = await chat(apiKey, systemPrompt, messages);
      messages.push({ role: "assistant", content: assistantText });
      console.log("\n[Nerves]\n" + assistantText + "\n");

      const extracted = extractWorkspaceFiles(assistantText);

      if (extracted.size > 0) {
        console.log("\nWriting to " + WORKSPACE_DIR + ":");
        writeWorkspaceFiles(extracted);
        console.log("Done. Sync to knowledge/teammate/ or ~/.openclaw/workspace/ if needed (see ARCHITECTURE.md).");
      } else {
        console.log("\nNo CONTEXT_MANAGEMENT.md, AGENTS.md, or HEARTBEAT.md blocks found in the response. You can copy-paste into openclaw-agents/workspace/ manually.");
      }
      process.exit(0);
    }
    if (!line) continue;

    messages.push({ role: "user", content: line });
    assistantText = await chat(apiKey, systemPrompt, messages);
    messages.push({ role: "assistant", content: assistantText });
    console.log("\n[Nerves]\n" + assistantText);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
