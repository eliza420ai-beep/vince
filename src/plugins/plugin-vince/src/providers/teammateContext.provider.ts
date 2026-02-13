/**
 * Teammate Context Provider (ElizaOS-aligned)
 *
 * Injects USER, SOUL, TOOLS (and optional MEMORY) into state every time state
 * is composed. Identity (who VINCE is) lives in the Character in ElizaOS;
 * this provider only loads user/soul/tools/memory so there is no duplication.
 *
 * Files read from knowledge/teammate/:
 * - USER.md — Who the human is (timezone, preferences, how they work)
 * - SOUL.md — Tone and boundaries for responses
 * - TOOLS.md — External tools and workflows
 * - AGENTS.md — Optional; operating rules, autonomy, boundaries (OpenClaw parity)
 * - HEARTBEAT.md — Optional; goals, review rhythm, active projects (OpenClaw parity)
 * - MEMORY/*.md — Optional daily logs (most recent first)
 *
 * IDENTITY.md is not loaded here; agent identity is defined by Character
 * (src/agents/vince.ts). Teammate dir is not in character.knowledge so
 * context is provider-only (no RAG duplication).
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

const TEAMMATE_DIR = "teammate";
/** USER, SOUL, TOOLS, and optional AGENTS/HEARTBEAT. Identity = Character in ElizaOS. */
const TEAMMATE_FILES = [
  "USER.md",
  "SOUL.md",
  "TOOLS.md",
  "AGENTS.md",
  "HEARTBEAT.md",
] as const;
const MEMORY_DIR = "MEMORY";
const LONG_TERM_FILENAME = "LONG-TERM.md";
const MAX_DAILY_MEMORY_FILES = 2;

function getTeammateBasePath(): string {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "knowledge", TEAMMATE_DIR),
    path.join(cwd, "..", "knowledge", TEAMMATE_DIR),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return path.join(cwd, "knowledge", TEAMMATE_DIR);
}

function readFileSafe(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf-8").trim();
  } catch {
    return null;
  }
}

/** Returns [longTermPath?] and paths of up to MAX_DAILY_MEMORY_FILES most recent daily logs (excluding LONG-TERM and README). */
function getMemoryFiles(memoryDir: string): {
  longTerm: string | null;
  dailyLogs: string[];
} {
  try {
    if (!fs.existsSync(memoryDir)) return { longTerm: null, dailyLogs: [] };
    const longTermPath = path.join(memoryDir, LONG_TERM_FILENAME);
    const longTerm = fs.existsSync(longTermPath) ? longTermPath : null;
    const entries = fs.readdirSync(memoryDir, { withFileTypes: true });
    const mdFiles = entries
      .filter(
        (e) =>
          e.isFile() &&
          e.name.endsWith(".md") &&
          e.name !== ".gitkeep" &&
          e.name.toLowerCase() !== "readme.md" &&
          e.name !== LONG_TERM_FILENAME,
      )
      .map((e) => path.join(memoryDir, e.name));
    const stats = mdFiles.map((f) => ({
      path: f,
      mtime: fs.statSync(f).mtime.getTime(),
    }));
    stats.sort((a, b) => b.mtime - a.mtime);
    const dailyLogs = stats.slice(0, MAX_DAILY_MEMORY_FILES).map((s) => s.path);
    return { longTerm, dailyLogs };
  } catch {
    return { longTerm: null, dailyLogs: [] };
  }
}

export const teammateContextProvider: Provider = {
  name: "TEAMMATE_CONTEXT",
  description:
    "User, soul, tools and optional memory — loaded every session (identity = Character)",
  position: -20, // Run early so teammate context is always present

  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const basePath = getTeammateBasePath();
    const parts: string[] = [];
    const values: Record<string, unknown> = {};
    const data: Record<string, unknown> = {};

    if (!fs.existsSync(basePath)) {
      logger.debug("[TeammateContext] knowledge/teammate/ not found; skipping");
      return { text: "", values: {}, data: {} };
    }

    // Preamble: frames context so the agent treats this as teammate mode, not generic chat
    parts.push(
      "---",
      "## TEAMMATE CONTEXT (loaded every session)",
      "USER/SOUL/TOOLS/AGENTS/HEARTBEAT/MEMORY below — use this to behave like a teammate who knows the user, not a generic chatbot.",
      "---",
      "",
    );

    for (const filename of TEAMMATE_FILES) {
      const content = readFileSafe(path.join(basePath, filename));
      if (content) {
        const label = filename.replace(".md", "").toUpperCase();
        parts.push(`## ${label}`);
        parts.push(content);
        parts.push("");
        values[`teammate_${label.toLowerCase()}`] = true;
      }
    }

    const memoryDir = path.join(basePath, MEMORY_DIR);
    const { longTerm: longTermPath, dailyLogs: dailyLogPaths } =
      getMemoryFiles(memoryDir);
    const allMemoryPaths: string[] = [];
    if (longTermPath) {
      const content = readFileSafe(longTermPath);
      if (content) {
        parts.push("## LONG-TERM MEMORY (curated persistent context)");
        parts.push(content);
        parts.push("");
        allMemoryPaths.push(longTermPath);
      }
    }
    if (dailyLogPaths.length > 0) {
      parts.push("## RECENT MEMORY (daily logs)");
      for (const filePath of dailyLogPaths) {
        const content = readFileSafe(filePath);
        if (content) {
          const name = path.basename(filePath, ".md");
          parts.push(`### ${name}`);
          parts.push(content);
          parts.push("");
          allMemoryPaths.push(filePath);
        }
      }
    }
    if (allMemoryPaths.length > 0) {
      values.teammate_memory_count = allMemoryPaths.length;
      data.teammate_memory_files = allMemoryPaths.map((p) => path.basename(p));
    }

    const text = parts.length > 0 ? parts.join("\n") : "";
    if (text) {
      data.teammate_loaded = true;
      data.teammate_files = TEAMMATE_FILES.filter((f) =>
        readFileSafe(path.join(basePath, f)),
      );
    }

    return {
      text,
      values,
      data,
    };
  },
};

export default teammateContextProvider;
