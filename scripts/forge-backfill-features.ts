/**
 * forge-backfill-features.ts
 *
 * One-shot backfill: converts the 226 closed trades in the feature store
 * into ForgeSignalRecords so Forge can run its first autoresearch experiment
 * immediately rather than waiting for the new live cache to accumulate.
 *
 * Approximations made (documented so Forge weights these records appropriately):
 *   - sourceVotes: each source that contributed gets the AGGREGATED direction /
 *     confidence / strength (we don't have per-source breakdowns in old records).
 *     This means weight experiments work at the source-inclusion level rather
 *     than fine-grained confidence level — still useful for finding which sources
 *     correlate with wins vs losses.
 *   - weightsSnapshot: DEFAULT_SOURCE_WEIGHTS (actual weights at trade time unknown).
 *   - postAggMultiplier / sessionMultiplier: 1.0 (unknown from feature store).
 *   - signalTimestamp: set equal to evaluatedAt (recency decay = 1.0 for all).
 *
 * Run once:
 *   bun scripts/forge-backfill-features.ts
 *
 * Safe to re-run — deduplicates by id before writing.
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

// ── paths ──────────────────────────────────────────────────────────────────
const FEATURES_DIR =
  process.env.FEATURES_DIR ||
  path.join(process.cwd(), ".elizadb/vince-paper-bot/features");

const FORGE_CACHE_PATH =
  process.env.FORGE_CACHE_PATH ||
  path.join(process.cwd(), ".elizadb/forge/signal-cache.jsonl");

// ── DEFAULT_SOURCE_WEIGHTS (mirrors dynamicConfig.ts) ─────────────────────
const DEFAULT_WEIGHTS: Record<string, number> = {
  LiquidationCascade: 2.0,
  LiquidationPressure: 1.6,
  BinanceFundingExtreme: 1.5,
  DeribitPutCallRatio: 1.4,
  HyperliquidCrowding: 1.4,
  HyperliquidFundingExtreme: 1.35,
  HyperliquidOICap: 1.2,
  TopTraders: 0.0,
  BinanceTopTraders: 1.0,
  SanbaseWhales: 0.0,
  HIP3Funding: 1.3,
  HIP3Momentum: 1.0,
  HIP3OIBuild: 0.8,
  HIP3PriceAction: 1.0,
  WTT: 1.5,
  SanbaseExchangeFlows: 1.2,
  CrossVenueFunding: 1.2,
  CoinGlass: 1.0,
  BinanceTakerFlow: 1.0,
  BinanceLongShort: 0.9,
  BinanceOIFlush: 0.7,
  DeribitIVSkew: 1.0,
  HyperliquidBias: 1.0,
  MarketRegime: 1.0,
  NewsSentiment: 0.8,
  X_Sentiment: 0.7,
  PolymarketSentiment: 0.9,
  AltcoinSeason: 0.6,
  HIP3Funding_ETH: 1.3,
  HIP3Momentum_ETH: 1.0,
  HIP3OIBuild_ETH: 0.8,
  HIP3PriceAction_ETH: 1.0,
};

// ── types (local — mirrors forgeSignalCache.ts) ────────────────────────────
interface ForgeSourceVote {
  source: string;
  direction: "long" | "short" | "neutral";
  confidence: number;
  strength: number;
  signalTimestamp: number;
}

interface ForgeSignalRecord {
  id: string;
  evaluatedAt: number;
  asset: string;
  regime: string;
  sourceVotes: ForgeSourceVote[];
  weightsSnapshot: Record<string, number>;
  postAggMultiplier: number;
  sessionMultiplier: number;
  openWindowBoost: number;
  direction: "long" | "short" | "neutral";
  strength: number;
  confidence: number;
  confirmingCount: number;
  meetsThreshold: boolean;
  tradeId?: string;
  outcome?: "win" | "loss" | "neutral";
  pnlPct?: number;
  holdMinutes?: number;
  /** Marks records converted from feature store (approximated sourceVotes) */
  _backfilled?: true;
}

// ── helpers ────────────────────────────────────────────────────────────────

function mapRegime(r: Record<string, unknown>): string {
  const mr = (r?.marketRegime as string) || "";
  if (mr === "bullish") return "bullish";
  if (mr === "bearish") return "bearish";
  if (mr === "sideways" || mr === "ranging") return "uncertain";
  if (mr === "volatile") return "volatile";
  return "unknown";
}

function normalizeDirection(d: string): "long" | "short" | "neutral" {
  if (d === "long" || d === "short") return d;
  return "neutral";
}

function convertFeatureRecord(r: Record<string, unknown>): ForgeSignalRecord | null {
  const outcome = r.outcome as Record<string, unknown> | undefined;
  if (!outcome?.exitPrice) return null; // not fully closed

  const sig = r.signal as Record<string, unknown>;
  const labels = r.labels as Record<string, unknown>;
  const exec = r.execution as Record<string, unknown>;
  const regime = r.regime as Record<string, unknown>;

  const evaluatedAt = (r.timestamp as number) || Date.now();
  const asset = (r.asset as string) || "unknown";
  const direction = normalizeDirection((sig?.direction as string) || "neutral");
  const confidence = (sig?.confidence as number) || 50;
  const strength = (sig?.strength as number) || 50;
  const sources = (sig?.sources as string[]) || [];
  const sourceCount = (sig?.sourceCount as number) || sources.length;

  // Build approximate sourceVotes — all contributing sources vote in the
  // aggregated direction with the aggregated confidence/strength.
  const sourceVotes: ForgeSourceVote[] = sources.map((source) => ({
    source,
    direction,
    confidence,
    strength,
    signalTimestamp: evaluatedAt, // no decay (conservative)
  }));

  const profitable = labels?.profitable as boolean | undefined;
  const pnlPct = outcome.realizedPnlPct as number | undefined;
  const tradeOutcome: "win" | "loss" | "neutral" =
    profitable === true ? "win" : profitable === false ? "loss" : "neutral";

  return {
    id: (r.id as string) || `backfill-${asset}-${evaluatedAt}`,
    evaluatedAt,
    asset,
    regime: mapRegime(regime),
    sourceVotes,
    weightsSnapshot: { ...DEFAULT_WEIGHTS },
    postAggMultiplier: 1.0,
    sessionMultiplier: 1.0,
    openWindowBoost: (sig?.openWindowBoost as number) || 0,
    direction,
    strength,
    confidence,
    confirmingCount: sourceCount,
    meetsThreshold: (exec?.executed as boolean) ?? true,
    tradeId: r.id as string,
    outcome: tradeOutcome,
    pnlPct: pnlPct ?? 0,
    holdMinutes: (outcome.holdingPeriodMinutes as number) || 0,
    _backfilled: true,
  };
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   FORGE Backfill — Feature Store → Signal Cache  ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Load existing cache ids to deduplicate
  const existingIds = new Set<string>();
  if (fs.existsSync(FORGE_CACHE_PATH)) {
    const lines = fs.readFileSync(FORGE_CACHE_PATH, "utf-8").split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (r.id) existingIds.add(r.id);
      } catch {}
    }
    console.log(`  Existing cache records: ${existingIds.size}`);
  } else {
    fs.mkdirSync(path.dirname(FORGE_CACHE_PATH), { recursive: true });
    console.log("  Creating new signal-cache.jsonl...");
  }

  // Discover feature files
  const featureFiles = await glob(`${FEATURES_DIR}/*.jsonl`);
  const nonBak = featureFiles.filter((f) => !f.endsWith(".bak"));
  console.log(`  Feature files found: ${nonBak.length}`);

  let converted = 0;
  let skipped = 0;
  let deduped = 0;
  const regimeCounts: Record<string, number> = {};
  const outcomeCounts: Record<string, number> = {};

  const writeStream = fs.createWriteStream(FORGE_CACHE_PATH, { flags: "a" });

  for (const file of nonBak) {
    const content = fs.readFileSync(file, "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(line);
      } catch {
        continue;
      }

      const record = convertFeatureRecord(raw);
      if (!record) {
        skipped++;
        continue;
      }
      if (existingIds.has(record.id)) {
        deduped++;
        continue;
      }

      existingIds.add(record.id);
      writeStream.write(JSON.stringify(record) + "\n");
      converted++;
      regimeCounts[record.regime] = (regimeCounts[record.regime] || 0) + 1;
      outcomeCounts[record.outcome || "none"] =
        (outcomeCounts[record.outcome || "none"] || 0) + 1;
    }
  }

  await new Promise((resolve) => writeStream.end(resolve));

  console.log("\n  ✅ Backfill complete");
  console.log(`     Converted : ${converted}`);
  console.log(`     Skipped   : ${skipped} (no exit price — open/incomplete)`);
  console.log(`     Deduped   : ${deduped} (already in cache)`);
  console.log("\n  Regime breakdown:");
  for (const [k, v] of Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${k.padEnd(12)} ${v}`);
  }
  console.log("\n  Outcome breakdown:");
  for (const [k, v] of Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${k.padEnd(12)} ${v}`);
  }

  const total = existingIds.size;
  const withOutcome = Object.values(outcomeCounts).reduce((a, b) => a + b, 0);
  console.log(`\n  Total cache records: ${total}`);
  console.log(`  Labeled (with outcome): ${withOutcome}`);

  if (withOutcome >= 30) {
    console.log("\n  🚀 Ready for first Forge run:");
    console.log("     bun run forge:dry");
    console.log("     bun run forge:uncertain");
  } else {
    console.log(`\n  ⏸  Need ${30 - withOutcome} more labeled records.`);
  }
}

main().catch(console.error);
