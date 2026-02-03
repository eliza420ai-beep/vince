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
/** USER, SOUL, TOOLS only. Identity = Character in ElizaOS. */
const TEAMMATE_FILES = ["USER.md", "SOUL.md", "TOOLS.md"] as const;
const MEMORY_DIR = "MEMORY";
const MAX_MEMORY_FILES = 3;

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

function getRecentMemoryFiles(memoryDir: string): string[] {
  try {
    if (!fs.existsSync(memoryDir)) return [];
    const entries = fs.readdirSync(memoryDir, { withFileTypes: true });
    const mdFiles = entries
      .filter(
        (e) =>
          e.isFile() &&
          e.name.endsWith(".md") &&
          e.name !== ".gitkeep" &&
          e.name.toLowerCase() !== "readme.md"
      )
      .map((e) => path.join(memoryDir, e.name));
    const stats = mdFiles.map((f) => ({ path: f, mtime: fs.statSync(f).mtime.getTime() }));
    stats.sort((a, b) => b.mtime - a.mtime);
    return stats.slice(0, MAX_MEMORY_FILES).map((s) => s.path);
  } catch {
    return [];
  }
}

export const teammateContextProvider: Provider = {
  name: "TEAMMATE_CONTEXT",
  description: "User, soul, tools and optional memory — loaded every session (identity = Character)",
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
      "USER/SOUL/TOOLS/MEMORY below — use this to behave like a teammate who knows the user, not a generic chatbot.",
      "---",
      ""
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
    const recentMemoryPaths = getRecentMemoryFiles(memoryDir);
    if (recentMemoryPaths.length > 0) {
      parts.push("## RECENT MEMORY (daily logs)");
      for (const filePath of recentMemoryPaths) {
        const content = readFileSafe(filePath);
        if (content) {
          const name = path.basename(filePath, ".md");
          parts.push(`### ${name}`);
          parts.push(content);
          parts.push("");
        }
      }
      values.teammate_memory_count = recentMemoryPaths.length;
      data.teammate_memory_files = recentMemoryPaths.map((p) => path.basename(p));
    }

    const text = parts.length > 0 ? parts.join("\n") : "";
    if (text) {
      data.teammate_loaded = true;
      data.teammate_files = TEAMMATE_FILES.filter((f) =>
        readFileSafe(path.join(basePath, f))
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
