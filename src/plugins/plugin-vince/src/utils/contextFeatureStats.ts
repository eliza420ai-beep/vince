/**
 * Context feature stats for context_adjustment multiplier (EVClaw-style).
 * Persists win-rate per context bucket; getAdjustmentMultiplier returns 0.5–1.5 for position sizing.
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";

const FILENAME = "context_feature_stats.json";

interface BucketStats {
  wins: number;
  total: number;
}

let cache: Record<string, BucketStats> | null = null;

function getStatsPath(): string {
  const dir = path.join(process.cwd(), ".elizadb", PERSISTENCE_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, FILENAME);
}

function load(): Record<string, BucketStats> {
  if (cache) return cache;
  const p = getStatsPath();
  if (!fs.existsSync(p)) {
    cache = {};
    return cache;
  }
  try {
    const raw = fs.readFileSync(p, "utf-8");
    cache = JSON.parse(raw) as Record<string, BucketStats>;
    return cache;
  } catch (e) {
    logger.warn(`[ContextFeatureStats] Load failed: ${(e as Error).message}`);
    cache = {};
    return cache;
  }
}

function save(stats: Record<string, BucketStats>): void {
  cache = stats;
  try {
    fs.writeFileSync(getStatsPath(), JSON.stringify(stats, null, 2), "utf-8");
  } catch (e) {
    logger.warn(`[ContextFeatureStats] Save failed: ${(e as Error).message}`);
  }
}

/**
 * Record one trade outcome for a context bucket (e.g. "marketRegime:trending").
 * Call once per bucket key per closed trade.
 */
export function recordContextOutcome(
  bucketKey: string,
  profitable: boolean,
): void {
  const stats = load();
  const cur = stats[bucketKey] ?? { wins: 0, total: 0 };
  cur.total += 1;
  if (profitable) cur.wins += 1;
  stats[bucketKey] = cur;
  save(stats);
}

/**
 * Get adjustment multiplier (0.5–1.5) from win-rates for the given bucket keys.
 * Uses average win-rate across buckets when multiple keys; no data => 1.0.
 */
export function getContextAdjustmentMultiplier(
  bucketKeys: string[],
): number {
  if (bucketKeys.length === 0) return 1.0;
  const stats = load();
  let sumRate = 0;
  let count = 0;
  for (const key of bucketKeys) {
    const b = stats[key];
    if (b && b.total >= 5) {
      sumRate += b.wins / b.total;
      count += 1;
    }
  }
  if (count === 0) return 1.0;
  const winRate = sumRate / count;
  // 0.5 + winRate => 50% -> 1.0, 60% -> 1.1, 40% -> 0.9
  const mult = 0.5 + winRate;
  return Math.max(0.5, Math.min(1.5, mult));
}

/**
 * Build bucket keys from regime + session for consistent recording and lookup.
 */
export function buildContextBucketKeys(
  regime: { regime?: string; dvol?: number | null } | null,
  session?: string,
): string[] {
  const keys: string[] = [];
  if (regime?.regime) keys.push(`marketRegime:${regime.regime}`);
  if (regime?.dvol != null)
    keys.push(regime.dvol > 70 ? "vol_regime:high" : "vol_regime:mid");
  if (session) keys.push(`session:${session}`);
  return keys;
}
