/**
 * Forge Signal Cache
 *
 * Records every signal aggregation evaluation to disk so Forge can run
 * thousands of weight/threshold experiments per night WITHOUT making any
 * external API calls — pure in-memory arithmetic over the cached data.
 *
 * Architecture (from docs/RECURSIVE.md):
 *   aggregateSignals() → captures per-source votes → appends JSONL record
 *   Forge overnight: load cache → mutate weights → replay() → compare Sharpe → keep or revert
 *
 * Key insight: the recency decay values are reproducible from the stored timestamps,
 * so the only thing that changes between experiments is sourceWeights[source].
 * This makes each replay experiment O(records × sources) ≈ 100ms for 1,000 records.
 *
 * Outcome enrichment:
 *   When a paper trade closes, vincePaperTrading.service.ts calls updateForgeSignalOutcome()
 *   to back-fill outcome/pnlPct on matching records. This creates the labeled dataset
 *   Forge needs for the signal-quality metric.
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

// ============================================================
// Schema
// ============================================================

/** One source's vote at the time aggregateSignals() was called */
export interface ForgeSourceVote {
  source: string;
  direction: "long" | "short" | "neutral";
  confidence: number; // 0-100
  strength: number; // 0-100
  /** Original signal timestamp — deterministically reconstructs recency decay */
  signalTimestamp: number;
}

/**
 * One complete aggregation evaluation snapshotted to disk.
 * Written by the signal aggregator; outcomes back-filled by paper trading.
 */
export interface ForgeSignalRecord {
  /** `${asset}-${evaluatedAt}` — unique within a session */
  id: string;
  evaluatedAt: number; // ms when aggregateSignals() ran
  asset: string;
  /** Regime label extracted from aggregated factors */
  regime: string; // 'bullish' | 'bearish' | 'uncertain' | 'volatile' | 'unknown'

  // ---- Pre-aggregation: frozen per-source votes ----
  sourceVotes: ForgeSourceVote[];

  /** Snapshot of dynamicConfig.sourceWeights at eval time — baseline for experiments */
  weightsSnapshot: Record<string, number>;

  // ---- Post-aggregation multipliers (kept fixed during weight-replay experiments) ----
  /** Combined: volumeMultiplier × comboMultiplier × historyMultiplier × rsiMultiplier */
  postAggMultiplier: number;
  sessionMultiplier: number;
  openWindowBoost: number; // additive, applied to confidence

  // ---- Final aggregated output ----
  direction: "long" | "short" | "neutral";
  strength: number; // 0-100
  confidence: number; // 0-100
  confirmingCount: number;
  /** True if this evaluation passed minStrength/minConfidence/minConfirming gates */
  meetsThreshold: boolean;

  // ---- Outcome (back-filled when linked paper trade closes) ----
  tradeId?: string;
  outcome?: "win" | "loss" | "neutral";
  pnlPct?: number;
  holdMinutes?: number;
  primaryCause?: string; // from post-mortem root cause field
}

// ============================================================
// Recency decay — mirrors signalAggregator.service.ts
// IMPORTANT: keep in sync if aggregator decay logic changes.
// ============================================================

const DECAY_CONFIG = {
  cascadeHalfLifeMs: 10_000,
  standardDecayThreshold1Ms: 30_000,
  standardDecayThreshold2Ms: 60_000,
  standardDecayThreshold3Ms: 120_000,
};

export function computeRecencyDecay(
  signalTimestamp: number,
  source: string,
  /** Provide the evalTimestamp so replay uses fixed-time decay, not "now" */
  evalTimestamp: number,
): number {
  const age = evalTimestamp - signalTimestamp;
  const isCascade =
    source === "LiquidationCascade" || source === "LiquidationPressure";
  if (isCascade) {
    return Math.pow(0.5, age / DECAY_CONFIG.cascadeHalfLifeMs);
  }
  if (age >= DECAY_CONFIG.standardDecayThreshold3Ms) return 0.3;
  if (age >= DECAY_CONFIG.standardDecayThreshold2Ms) return 0.5;
  if (age >= DECAY_CONFIG.standardDecayThreshold1Ms) return 0.8;
  return 1.0;
}

// ============================================================
// Regime extraction from factor strings
// ============================================================

export function extractRegimeFromFactors(factors: string[]): string {
  const text = factors.join(" ").toLowerCase();
  if (
    text.includes("regime: bullish") ||
    text.includes("regime:bullish") ||
    (text.includes("grok regime") && text.includes("bullish"))
  )
    return "bullish";
  if (
    text.includes("regime: bearish") ||
    text.includes("regime:bearish") ||
    (text.includes("grok regime") && text.includes("bearish"))
  )
    return "bearish";
  if (text.includes("regime: volatile") || text.includes("regime:volatile"))
    return "volatile";
  if (text.includes("regime: uncertain") || text.includes("regime:uncertain"))
    return "uncertain";
  return "unknown";
}

// ============================================================
// Persistence
// ============================================================

function getCachePath(): string {
  const elizaDb = path.join(process.cwd(), ".elizadb");
  const forgeDir = path.join(elizaDb, "forge");
  if (!fs.existsSync(forgeDir)) {
    fs.mkdirSync(forgeDir, { recursive: true });
  }
  return path.join(forgeDir, "signal-cache.jsonl");
}

/** Append a new evaluation record. Fire-and-forget from aggregateSignals(). */
export function writeForgeSignalRecord(record: ForgeSignalRecord): void {
  try {
    fs.appendFileSync(getCachePath(), JSON.stringify(record) + "\n", "utf-8");
  } catch (e) {
    logger.debug(`[ForgeSignalCache] Write failed: ${e}`);
  }
}

/** Load all cached records into memory. */
export function loadForgeSignalCache(): ForgeSignalRecord[] {
  try {
    const p = getCachePath();
    if (!fs.existsSync(p)) return [];
    return fs
      .readFileSync(p, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as ForgeSignalRecord);
  } catch (e) {
    logger.warn(`[ForgeSignalCache] Load failed: ${e}`);
    return [];
  }
}

/**
 * Back-fill outcome on all records whose tradeId matches.
 * Called by vincePaperTrading.service.ts when a trade closes.
 */
export function updateForgeSignalOutcome(
  tradeId: string,
  outcome: "win" | "loss" | "neutral",
  pnlPct: number,
  holdMinutes: number,
  primaryCause?: string,
): void {
  try {
    const p = getCachePath();
    if (!fs.existsSync(p)) return;
    const lines = fs
      .readFileSync(p, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);
    let changed = false;
    const updated = lines.map((l) => {
      const rec = JSON.parse(l) as ForgeSignalRecord;
      if (rec.tradeId === tradeId && rec.outcome === undefined) {
        changed = true;
        return JSON.stringify({
          ...rec,
          outcome,
          pnlPct,
          holdMinutes,
          primaryCause,
        });
      }
      return l;
    });
    if (changed) {
      fs.writeFileSync(p, updated.join("\n") + "\n", "utf-8");
      logger.debug(
        `[ForgeSignalCache] Outcome back-filled for tradeId=${tradeId}: ${outcome} (${pnlPct.toFixed(2)}%)`,
      );
    }
  } catch (e) {
    logger.warn(`[ForgeSignalCache] Outcome update failed: ${e}`);
  }
}

// ============================================================
// Replay engine
// ============================================================

export interface ReplayWeightsConfig {
  sourceWeights: Record<string, number>;
  /** Weight for sources not explicitly listed (default: 1.0) */
  defaultWeight?: number;
}

export interface ReplayThresholdsConfig {
  minStrength: number;
  minConfidence: number;
  minConfirming: number;
}

export interface ReplayMetrics {
  totalEvaluated: number;
  totalTriggered: number; // would-have-triggered with these weights
  withOutcome: number; // of triggered, how many have closed trade outcomes
  wins: number;
  losses: number;
  winRate: number; // 0-1
  avgPnlPct: number;
  sharpe: number; // annualised approximation
  maxDrawdown: number; // 0-1 fraction
  regimeBreakdown: Record<
    string,
    { triggered: number; wins: number; losses: number }
  >;
}

const DEFAULT_THRESHOLDS: ReplayThresholdsConfig = {
  minStrength: 55,
  minConfidence: 55,
  minConfirming: 2,
};

/** The core replay function — no API calls, pure arithmetic. */
export function replayWithWeights(
  records: ForgeSignalRecord[],
  weightsConfig: ReplayWeightsConfig,
  thresholdsConfig: ReplayThresholdsConfig = DEFAULT_THRESHOLDS,
): ReplayMetrics {
  const { sourceWeights, defaultWeight = 1.0 } = weightsConfig;
  const triggeredPnls: number[] = [];
  const regimeBreakdown: Record<
    string,
    { triggered: number; wins: number; losses: number }
  > = {};

  // Scale threshold with weight variability (mirrors aggregator line 2421)
  const VOTE_DIFF_BASE = 20;

  for (const record of records) {
    // Re-run weighted vote aggregation with the candidate weights
    let longVotes = 0;
    let shortVotes = 0;
    let weightedStrength = 0;
    let weightedConfidence = 0;
    let totalWeight = 0;
    let longCount = 0;
    let shortCount = 0;

    for (const vote of record.sourceVotes) {
      const newSourceWeight = sourceWeights[vote.source] ?? defaultWeight;
      const decay = computeRecencyDecay(
        vote.signalTimestamp,
        vote.source,
        record.evaluatedAt,
      );
      const w = newSourceWeight * decay;

      if (vote.direction === "long") {
        longVotes += vote.confidence * w;
        longCount++;
      } else if (vote.direction === "short") {
        shortVotes += vote.confidence * w;
        shortCount++;
      }
      weightedStrength += vote.strength * w;
      weightedConfidence += vote.confidence * w;
      totalWeight += w;
    }

    if (totalWeight === 0) continue;

    // Apply post-agg multipliers (frozen from original evaluation)
    const avgStrength =
      (weightedStrength / totalWeight) * record.postAggMultiplier;
    const avgConfidence = Math.min(
      100,
      (weightedConfidence / totalWeight) * record.sessionMultiplier +
        record.openWindowBoost,
    );

    // Determine direction (mirrors aggregator lines 2417-2428)
    const voteDiff =
      VOTE_DIFF_BASE * (totalWeight / (record.sourceVotes.length || 1));
    let replayDir: "long" | "short" | "neutral" = "neutral";
    let confirmingCount = 0;

    if (longVotes > shortVotes + voteDiff) {
      replayDir = "long";
      confirmingCount = longCount;
    } else if (shortVotes > longVotes + voteDiff) {
      replayDir = "short";
      confirmingCount = shortCount;
    }

    if (replayDir === "neutral") continue;

    // Threshold gate
    if (
      avgStrength < thresholdsConfig.minStrength ||
      avgConfidence < thresholdsConfig.minConfidence ||
      confirmingCount < thresholdsConfig.minConfirming
    )
      continue;

    // This evaluation would have triggered
    const regime = record.regime ?? "unknown";
    if (!regimeBreakdown[regime]) {
      regimeBreakdown[regime] = { triggered: 0, wins: 0, losses: 0 };
    }
    regimeBreakdown[regime].triggered++;

    if (record.outcome !== undefined && record.pnlPct !== undefined) {
      triggeredPnls.push(record.pnlPct);
      if (record.outcome === "win") regimeBreakdown[regime].wins++;
      else if (record.outcome === "loss") regimeBreakdown[regime].losses++;
    }
  }

  // Aggregate metrics
  const withOutcome = triggeredPnls.length;
  const wins = triggeredPnls.filter((p) => p > 0).length;
  const losses = triggeredPnls.filter((p) => p <= 0).length;
  const winRate = withOutcome > 0 ? wins / withOutcome : 0;
  const avgPnlPct =
    withOutcome > 0
      ? triggeredPnls.reduce((a, b) => a + b, 0) / withOutcome
      : 0;

  // Sharpe (annualised — assume 24 trade opportunities per day for intraday)
  let sharpe = 0;
  if (withOutcome >= 3) {
    const mean = avgPnlPct;
    const variance =
      triggeredPnls.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
      withOutcome;
    const std = Math.sqrt(variance);
    if (std > 0) sharpe = (mean / std) * Math.sqrt(252 * 24);
  }

  // Max drawdown over the triggered trade sequence (as received)
  let peak = 0;
  let cumPnl = 0;
  let maxDrawdown = 0;
  for (const p of triggeredPnls) {
    cumPnl += p;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak > 0 ? (peak - cumPnl) / peak : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const totalTriggered = Object.values(regimeBreakdown).reduce(
    (sum, r) => sum + r.triggered,
    0,
  );

  return {
    totalEvaluated: records.length,
    totalTriggered,
    withOutcome,
    wins,
    losses,
    winRate,
    avgPnlPct,
    sharpe,
    maxDrawdown,
    regimeBreakdown,
  };
}

// ============================================================
// Trade linking
// ============================================================

/**
 * When a trade is opened, link its ID to the closest forge record for
 * that asset within `windowMs` of the trade entry time.
 *
 * Call this from vincePaperTrading.service.ts right after position is opened.
 * Enables `updateForgeSignalOutcome` to back-fill outcomes at close.
 */
export function linkForgeRecordToTrade(
  asset: string,
  tradeId: string,
  tradeOpenedAtMs: number,
  windowMs = 60_000,
): boolean {
  try {
    const p = getCachePath();
    if (!fs.existsSync(p)) return false;
    const lines = fs
      .readFileSync(p, "utf-8")
      .trim()
      .split("\n")
      .filter(Boolean);

    // Find the most recent record for this asset within the window, not yet linked
    let bestIdx = -1;
    let bestDelta = Infinity;
    for (let i = 0; i < lines.length; i++) {
      const rec = JSON.parse(lines[i]) as ForgeSignalRecord;
      if (rec.asset !== asset || rec.tradeId) continue;
      const delta = Math.abs(tradeOpenedAtMs - rec.evaluatedAt);
      if (delta <= windowMs && delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) return false;

    const rec = JSON.parse(lines[bestIdx]) as ForgeSignalRecord;
    lines[bestIdx] = JSON.stringify({ ...rec, tradeId });
    fs.writeFileSync(p, lines.join("\n") + "\n", "utf-8");

    logger.debug(
      `[ForgeSignalCache] Linked tradeId=${tradeId} → forge record ${rec.id} (Δ${bestDelta}ms)`,
    );
    return true;
  } catch (e) {
    logger.debug(`[ForgeSignalCache] Link failed: ${e}`);
    return false;
  }
}

// ============================================================
// Holdout split (for Forge train / eval separation)
// ============================================================

/**
 * Chronological holdout split — the most recent `holdoutFraction`
 * of records become the evaluation set. Forge trains on earlier data
 * and evaluates on the holdout to prevent overfitting to recent regime.
 */
export function splitHoldout(
  records: ForgeSignalRecord[],
  holdoutFraction = 0.2,
): { train: ForgeSignalRecord[]; holdout: ForgeSignalRecord[] } {
  const sorted = [...records].sort((a, b) => a.evaluatedAt - b.evaluatedAt);
  const cutoff = Math.floor(sorted.length * (1 - holdoutFraction));
  return {
    train: sorted.slice(0, cutoff),
    holdout: sorted.slice(cutoff),
  };
}

// ============================================================
// Regime-filtered replay (the deep unlock from RECURSIVE.md)
// ============================================================

/**
 * Run replay on a specific regime subset only.
 * Finds the optimal weights for "uncertain" market conditions independently
 * from "bullish" conditions — the two optima diverge significantly.
 */
export function replayForRegime(
  records: ForgeSignalRecord[],
  regime: string,
  weightsConfig: ReplayWeightsConfig,
  thresholdsConfig?: ReplayThresholdsConfig,
): ReplayMetrics {
  const filtered = records.filter((r) => r.regime === regime);
  return replayWithWeights(filtered, weightsConfig, thresholdsConfig);
}

// ============================================================
// Baseline comparison helper
// ============================================================

export interface ExperimentResult {
  label: string;
  metrics: ReplayMetrics;
  delta?: {
    sharpe: number;
    winRate: number;
    avgPnlPct: number;
    maxDrawdown: number;
  };
}

/** Compare a candidate experiment against the current baseline weights. */
export function compareToBaseline(
  records: ForgeSignalRecord[],
  baselineWeights: ReplayWeightsConfig,
  candidateWeights: ReplayWeightsConfig,
  candidateLabel: string,
  thresholdsConfig?: ReplayThresholdsConfig,
): { baseline: ExperimentResult; candidate: ExperimentResult } {
  const baseMetrics = replayWithWeights(
    records,
    baselineWeights,
    thresholdsConfig,
  );
  const candidateMetrics = replayWithWeights(
    records,
    candidateWeights,
    thresholdsConfig,
  );

  return {
    baseline: { label: "baseline", metrics: baseMetrics },
    candidate: {
      label: candidateLabel,
      metrics: candidateMetrics,
      delta: {
        sharpe: candidateMetrics.sharpe - baseMetrics.sharpe,
        winRate: candidateMetrics.winRate - baseMetrics.winRate,
        avgPnlPct: candidateMetrics.avgPnlPct - baseMetrics.avgPnlPct,
        maxDrawdown: candidateMetrics.maxDrawdown - baseMetrics.maxDrawdown,
      },
    },
  };
}
