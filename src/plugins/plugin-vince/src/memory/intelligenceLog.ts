/**
 * Crypto intel intelligence log (Phase 3).
 * File: intelligence_log.jsonl — one JSON object per line.
 */

import type { IAgentRuntime } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import type { IntelligenceLogEntry } from "../types/cryptoIntelMemory";

const CRYPTO_INTEL_DIR = "crypto-intel";
const INTELLIGENCE_LOG_FILE = "intelligence_log.jsonl";

const ENV_OVERRIDE = "VINCE_CRYPTO_INTEL_MEMORY_DIR";

/**
 * Resolve the crypto-intel memory directory. Uses runtime.getSetting(ENV_OVERRIDE)
 * or process.env, else .elizadb/{PERSISTENCE_DIR}/crypto-intel.
 */
export function getMemoryDir(runtime?: IAgentRuntime): string {
  const override =
    (runtime?.getSetting?.(ENV_OVERRIDE) as string) ||
    process.env[ENV_OVERRIDE];
  if (typeof override === "string" && override.trim()) {
    return path.isAbsolute(override)
      ? override
      : path.join(process.cwd(), override);
  }
  return path.join(
    process.cwd(),
    ".elizadb",
    PERSISTENCE_DIR,
    CRYPTO_INTEL_DIR,
  );
}

/**
 * Read all entries from intelligence_log.jsonl. Returns [] if file missing or empty.
 */
export async function readIntelligenceLog(
  memoryDir: string,
): Promise<IntelligenceLogEntry[]> {
  const filepath = path.join(memoryDir, INTELLIGENCE_LOG_FILE);
  if (!fs.existsSync(filepath)) return [];

  const raw = fs.readFileSync(filepath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const entries: IntelligenceLogEntry[] = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as IntelligenceLogEntry;
      entries.push(obj);
    } catch {
      // Skip malformed lines
    }
  }
  return entries;
}

/**
 * Append entries to intelligence_log.jsonl (one JSON line per entry). Creates dir and file if missing.
 */
export async function appendIntelligenceLog(
  memoryDir: string,
  entries: IntelligenceLogEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  const filepath = path.join(memoryDir, INTELLIGENCE_LOG_FILE);
  const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.appendFileSync(filepath, lines, "utf-8");
}
