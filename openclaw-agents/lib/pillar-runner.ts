/**
 * Shared OpenClaw pillar runner: Anthropic chat, file extraction, workspace writer, USER context loader.
 * Used by all 8 pillar run-*.ts scripts.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { createInterface } from "readline";
import path from "path";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8192;
const DEFAULT_CONTEXT_MAX_CHARS = 2000;

export type Message = { role: "user" | "assistant"; content: string };

export async function chat(
  apiKey: string,
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
 * Extract workspace file contents from assistant text.
 * Supports code blocks ```FILENAME.md\n...\n``` and sections ## FILENAME.md\n...
 */
export function extractWorkspaceFiles(
  assistantText: string,
  fileNames: readonly string[]
): Map<string, string> {
  const out = new Map<string, string>();
  const names = fileNames.join("|").replace(/\./g, "\\.");
  let m: RegExpExecArray | null;

  const codeBlockRe = new RegExp(
    "```(" + names + ")\\s*\\n([\\s\\S]*?)```",
    "gi"
  );
  while ((m = codeBlockRe.exec(assistantText)) !== null) {
    const name = m[1];
    const content = m[2].trim();
    if (content) out.set(name, content);
  }

  const sectionRe = new RegExp(
    "##\\s*(" + names + ")\\s*\\n([\\s\\S]*?)(?=\\n##\\s|\\n```|$)",
    "gi"
  );
  while ((m = sectionRe.exec(assistantText)) !== null) {
    const name = m[1];
    const content = m[2].trim();
    if (content && !out.has(name)) out.set(name, content);
  }

  return out;
}

export function writeWorkspaceFiles(
  workspaceDir: string,
  extracted: Map<string, string>
): void {
  if (!existsSync(workspaceDir)) {
    mkdirSync(workspaceDir, { recursive: true });
  }
  for (const [name, content] of extracted) {
    const filePath = path.join(workspaceDir, name);
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, content, "utf-8");
    console.log(`  Wrote ${name}`);
  }
}

/**
 * Load USER.md from workspace or knowledge/teammate, return truncated summary for context injection.
 */
export function getUserContextSummary(
  workspaceDir: string,
  agentsRoot: string,
  maxChars: number = DEFAULT_CONTEXT_MAX_CHARS
): string | null {
  const knowledgeTeammate = path.join(agentsRoot, "knowledge", "teammate", "USER.md");
  const candidates = [
    path.join(workspaceDir, "USER.md"),
    knowledgeTeammate,
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const content = readFileSync(p, "utf-8").trim();
      if (content) {
        const summary =
          content.length > maxChars
            ? content.slice(0, maxChars) + "\n[... truncated]"
            : content;
        return summary;
      }
    }
  }
  return null;
}

export function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export interface PillarConfig {
  pillarName: string;
  promptPath: string;
  workspaceDir: string;
  agentsRoot: string;
  /** First user message. If function, receives USER context summary or null. */
  firstUserMessage: string | ((contextSummary: string | null) => string);
  /** Prompt sent when user types /done or /generate */
  donePrompt: string;
  /** For default extraction/write: list of workspace filenames (e.g. USER.md, TOOLS.md) */
  outputFileNames?: readonly string[];
  /** Optional: custom extract and write. If provided, used instead of outputFileNames. */
  onDone?: (
    assistantText: string
  ) => { workspaceFiles?: Map<string, string>; relativePaths?: Map<string, string> };
  contextMaxChars?: number;
  /** Short description for /done output (e.g. "finish and write SOUL, IDENTITY") */
  doneDescription: string;
}

export async function runPillar(config: PillarConfig): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is required. Set it in .env or the environment.");
    process.exit(1);
  }

  if (!existsSync(config.promptPath)) {
    throw new Error(`Prompt not found: ${config.promptPath}`);
  }
  const systemPrompt = readFileSync(config.promptPath, "utf-8").trim();

  const contextSummary = getUserContextSummary(
    config.workspaceDir,
    config.agentsRoot,
    config.contextMaxChars ?? DEFAULT_CONTEXT_MAX_CHARS
  );
  const firstUserMessage =
    typeof config.firstUserMessage === "function"
      ? config.firstUserMessage(contextSummary)
      : config.firstUserMessage;

  const messages: Message[] = [];
  messages.push({ role: "user", content: firstUserMessage });
  let assistantText = await chat(apiKey, systemPrompt, messages);
  messages.push({ role: "assistant", content: assistantText });
  console.log("\n[" + config.pillarName + "]\n" + assistantText + "\n");

  for (;;) {
    const line = await ask("\n[You] ");
    if (line === "/quit" || line === "/exit") {
      console.log("Exiting without writing files.");
      process.exit(0);
    }
    if (line === "/done" || line === "/generate") {
      messages.push({ role: "user", content: config.donePrompt });
      assistantText = await chat(apiKey, systemPrompt, messages);
      messages.push({ role: "assistant", content: assistantText });
      console.log("\n[" + config.pillarName + "]\n" + assistantText + "\n");

      if (config.onDone) {
        const result = config.onDone(assistantText);
        if (result.workspaceFiles && result.workspaceFiles.size > 0) {
          console.log("\nWriting workspace files to " + config.workspaceDir + ":");
          writeWorkspaceFiles(config.workspaceDir, result.workspaceFiles);
        }
        if (result.relativePaths && result.relativePaths.size > 0) {
          for (const [relPath, content] of result.relativePaths) {
            const filePath = path.join(config.workspaceDir, relPath);
            const dir = path.dirname(filePath);
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
            writeFileSync(filePath, content, "utf-8");
            console.log(`  Wrote ${relPath}`);
          }
        }
      } else if (config.outputFileNames && config.outputFileNames.length > 0) {
        const extracted = extractWorkspaceFiles(assistantText, config.outputFileNames);
        if (extracted.size > 0) {
          console.log("\nWriting workspace files to " + config.workspaceDir + ":");
          writeWorkspaceFiles(config.workspaceDir, extracted);
        }
      }

      if (config.onDone || (config.outputFileNames && config.outputFileNames.length > 0)) {
        console.log("Done. Sync to knowledge/teammate/ or ~/.openclaw/workspace/ if needed (see ARCHITECTURE.md).");
      } else {
        console.log("\nNo workspace file blocks found in the response. You can copy-paste manually.");
      }
      process.exit(0);
    }
    if (!line) continue;

    messages.push({ role: "user", content: line });
    assistantText = await chat(apiKey, systemPrompt, messages);
    messages.push({ role: "assistant", content: assistantText });
    console.log("\n[" + config.pillarName + "]\n" + assistantText);
  }
}
