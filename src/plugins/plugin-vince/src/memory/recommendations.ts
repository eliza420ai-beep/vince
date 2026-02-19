/**
 * Crypto intel recommendations (Phase 4).
 * File: recommendations.jsonl — one JSON object per line.
 */

import * as fs from "fs";
import * as path from "path";
import type { RecommendationEntry } from "../types/cryptoIntelMemory";

const RECOMMENDATIONS_FILE = "recommendations.jsonl";

export async function readRecommendations(
  memoryDir: string,
): Promise<RecommendationEntry[]> {
  const filepath = path.join(memoryDir, RECOMMENDATIONS_FILE);
  if (!fs.existsSync(filepath)) return [];

  const raw = fs.readFileSync(filepath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const entries: RecommendationEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as RecommendationEntry);
    } catch {
      // skip malformed
    }
  }
  return entries;
}

export async function getOpenRecommendations(
  memoryDir: string,
): Promise<RecommendationEntry[]> {
  const all = await readRecommendations(memoryDir);
  return all.filter((e) => e.status === "open");
}

export async function appendRecommendations(
  memoryDir: string,
  entries: RecommendationEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  const filepath = path.join(memoryDir, RECOMMENDATIONS_FILE);
  const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.appendFileSync(filepath, lines, "utf-8");
}

/**
 * Update a recommendation by ticker+date (or first matching open). Read full file, merge patch, rewrite.
 */
export async function updateRecommendation(
  memoryDir: string,
  ticker: string,
  patch: Partial<RecommendationEntry>,
): Promise<boolean> {
  const all = await readRecommendations(memoryDir);
  const idx = all.findIndex(
    (e) =>
      e.ticker.toUpperCase() === ticker.toUpperCase() && e.status === "open",
  );
  if (idx === -1) return false;

  const updated = { ...all[idx], ...patch };
  all[idx] = updated;

  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  const filepath = path.join(memoryDir, RECOMMENDATIONS_FILE);
  const content = all.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.writeFileSync(filepath, content, "utf-8");
  return true;
}
