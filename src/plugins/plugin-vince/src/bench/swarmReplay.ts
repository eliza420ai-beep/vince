import type { FeatureRecord } from "../services/vinceFeatureStore.service";
import type {
  AgentVote,
  SwarmDirection,
  SwarmMarketRegime,
} from "../types/swarm";

export type SwarmReplayMode = "vince" | "limited" | "full";

export interface SwarmReplayConfig {
  /** Confidence threshold (0–1) required to "green light" a trade in swarm modes. */
  consensusThreshold: number;
  /** Modes to evaluate; default: all three. */
  modes?: SwarmReplayMode[];
}

export interface SwarmReplayMetrics {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnlPct: number;
  maxDrawdownPct: number;
}

export interface SwarmReplayResult {
  baseline: SwarmReplayMetrics;
  limited: SwarmReplayMetrics;
  full: SwarmReplayMetrics;
  /**
   * Optional regime-conditional metrics so we can inspect how each mode
   * behaves in different environments (e.g. TRENDING_BULL vs CHOPPY).
   */
  byRegime?: Record<
    SwarmMarketRegime,
    {
      baseline: SwarmReplayMetrics;
      limited: SwarmReplayMetrics;
      full: SwarmReplayMetrics;
    }
  >;
}

interface SimpleConsensus {
  direction: SwarmDirection;
  confidenceLevel: number;
  dissentScore: number;
  consensusReached: boolean;
}

function toDirection(dir: string): SwarmDirection {
  if (dir === "long" || dir === "short" || dir === "neutral") return dir;
  return "neutral";
}

function toSwarmRegime(
  record: FeatureRecord,
  direction: SwarmDirection,
): SwarmMarketRegime {
  const raw = record.regime?.marketRegime;
  if (!raw) return "UNKNOWN";

  const key = String(raw).toLowerCase();

  // Map VINCE's marketRegime / MarketRegimeType into SwarmMarketRegime buckets.
  if (key === "trending" || key === "bullish") {
    return direction === "long" ? "TRENDING_BULL" : "RECOVERY";
  }

  if (key === "ranging" || key === "neutral") {
    return "CHOPPY";
  }

  if (key === "volatile") {
    return direction === "long" ? "EUPHORIA" : "CAPITULATION";
  }

  return "UNKNOWN";
}

function buildVotesFromRecord(
  record: FeatureRecord,
  mode: SwarmReplayMode,
): AgentVote[] {
  const votes: AgentVote[] = [];

  // VINCE: use signal direction/confidence directly.
  const vinceDir = toDirection(record.signal.direction);
  const vinceConf = Math.max(
    0,
    Math.min(1, (record.signal.confidence ?? 0) / 100),
  );
  votes.push({
    agentId: "vince",
    direction: vinceDir,
    confidence: vinceConf,
    supportingSignals: record.signal.sources ?? [],
    riskAssessment: 0.5,
    reasoning: "Historical VINCE signal from feature store",
  });

  if (mode === "vince") {
    return votes;
  }

  // Echo: proxy from news / sentiment features (bullish/bearish/neutral).
  const newsDir =
    record.news.assetSentimentDirection ?? record.news.sentimentDirection;
  let echoDir: SwarmDirection = "neutral";
  if (newsDir === "bullish") echoDir = "long";
  else if (newsDir === "bearish") echoDir = "short";
  const echoConf = record.news.sentimentScore
    ? Math.max(0, Math.min(1, Math.abs(record.news.sentimentScore) / 100))
    : 0.2;
  votes.push({
    agentId: "echo",
    direction: echoDir,
    confidence: echoConf,
    supportingSignals: ["news_sentiment"],
    riskAssessment: 0.6,
    reasoning: "Echo-style sentiment from historical news features",
  });

  // Oracle: proxy from macroRiskEnvironment (risk_on / risk_off / neutral).
  const env = record.news.macroRiskEnvironment;
  let oracleDir: SwarmDirection = "neutral";
  if (env === "risk_on") oracleDir = "long";
  else if (env === "risk_off") oracleDir = "short";
  const oracleConf = env ? 0.4 : 0.2;
  votes.push({
    agentId: "oracle",
    direction: oracleDir,
    confidence: oracleConf,
    supportingSignals: ["macro_risk_environment"],
    riskAssessment: 0.7,
    reasoning: "Oracle-style macro regime from historical features",
  });

  if (mode === "limited") {
    return votes;
  }

  // Full swarm: add neutral/low-confidence placeholders for the remaining agents.
  const neutralAgents = [
    "solus",
    "otaku",
    "kelly",
    "sentinel",
    "eliza",
    "clawterm",
    "naval",
  ];
  for (const agentId of neutralAgents) {
    votes.push({
      agentId,
      direction: "neutral",
      confidence: 0.1,
      supportingSignals: [],
      riskAssessment: 0.5,
      reasoning: "Placeholder neutral vote (no structured features wired yet)",
    });
  }

  return votes;
}

function computeConsensus(
  votes: AgentVote[],
  threshold: number,
): SimpleConsensus {
  const nonNeutral = votes.filter((v) => v.direction !== "neutral");
  if (nonNeutral.length === 0) {
    return {
      direction: "neutral",
      confidenceLevel: 0,
      dissentScore: 0,
      consensusReached: false,
    };
  }

  let num = 0;
  let denom = 0;
  for (const v of nonNeutral) {
    const sign = v.direction === "long" ? 1 : v.direction === "short" ? -1 : 0;
    num += sign * v.confidence;
    denom += v.confidence;
  }
  const avg = denom > 0 ? num / denom : 0;
  let direction: SwarmDirection = "neutral";
  if (avg > 0) direction = "long";
  else if (avg < 0) direction = "short";

  const confidenceLevel =
    nonNeutral.reduce((s, v) => s + v.confidence, 0) / nonNeutral.length;

  const aligned = nonNeutral.filter((v) => v.direction === direction).length;
  const dissentScore =
    direction === "neutral" ? 1 : 1 - aligned / nonNeutral.length;

  const consensusReached =
    direction !== "neutral" && confidenceLevel >= threshold;

  return { direction, confidenceLevel, dissentScore, consensusReached };
}

function emptyMetrics(): SwarmReplayMetrics {
  return {
    trades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    avgPnlPct: 0,
    maxDrawdownPct: 0,
  };
}

function accumulate(metrics: SwarmReplayMetrics, pnlPct: number): void {
  metrics.trades += 1;
  if (pnlPct > 0) metrics.wins += 1;
  else if (pnlPct < 0) metrics.losses += 1;

  // Online update of average PnL%
  metrics.avgPnlPct += (pnlPct - metrics.avgPnlPct) / metrics.trades;
}

function finalize(metrics: SwarmReplayMetrics): void {
  metrics.winRate = metrics.trades > 0 ? metrics.wins / metrics.trades : 0;
}

/**
 * Run an offline replay over historical FeatureRecord data to compare:
 * - VINCE-only (no swarm gating)
 * - Limited swarm (VINCE + Echo + Oracle)
 * - Full swarm (all ten agents, with neutral placeholders where data is missing)
 */
export function runSwarmReplay(
  records: FeatureRecord[],
  config: SwarmReplayConfig,
): SwarmReplayResult {
  const threshold = config.consensusThreshold;
  const modes: SwarmReplayMode[] = config.modes ?? ["vince", "limited", "full"];

  const baseline = emptyMetrics();
  const limited = emptyMetrics();
  const full = emptyMetrics();

  const regimeKeys: SwarmMarketRegime[] = [
    "TRENDING_BULL",
    "CHOPPY",
    "CAPITULATION",
    "EUPHORIA",
    "RECOVERY",
    "UNKNOWN",
  ];

  const byRegime: Record<
    SwarmMarketRegime,
    {
      baseline: SwarmReplayMetrics;
      limited: SwarmReplayMetrics;
      full: SwarmReplayMetrics;
    }
  > = regimeKeys.reduce(
    (acc, regime) => {
      acc[regime] = {
        baseline: emptyMetrics(),
        limited: emptyMetrics(),
        full: emptyMetrics(),
      };
      return acc;
    },
    {} as Record<
      SwarmMarketRegime,
      {
        baseline: SwarmReplayMetrics;
        limited: SwarmReplayMetrics;
        full: SwarmReplayMetrics;
      }
    >,
  );

  // Simple equity curves to approximate drawdown
  let eqBaseline = 0;
  let eqLimited = 0;
  let eqFull = 0;
  let maxEqBaseline = 0;
  let maxEqLimited = 0;
  let maxEqFull = 0;

  for (const r of records) {
    if (!r.outcome) continue;
    const pnlPct = r.outcome.realizedPnlPct ?? 0;
    const direction = toDirection(r.signal.direction);
    const regimeKey = toSwarmRegime(r, direction);
    const regimeBuckets = byRegime[regimeKey];

    // Baseline: no gating, all trades "on"
    accumulate(baseline, pnlPct);
    accumulate(regimeBuckets.baseline, pnlPct);
    eqBaseline += pnlPct;
    if (eqBaseline > maxEqBaseline) maxEqBaseline = eqBaseline;
    const ddBase = maxEqBaseline - eqBaseline;
    if (ddBase > baseline.maxDrawdownPct) baseline.maxDrawdownPct = ddBase;
    if (ddBase > regimeBuckets.baseline.maxDrawdownPct) {
      regimeBuckets.baseline.maxDrawdownPct = ddBase;
    }

    // Limited swarm
    if (modes.includes("limited")) {
      const votes = buildVotesFromRecord(r, "limited");
      const consensus = computeConsensus(votes, threshold);
      if (consensus.consensusReached) {
        accumulate(limited, pnlPct);
        accumulate(regimeBuckets.limited, pnlPct);
        eqLimited += pnlPct;
      } else {
        // Trade would have been avoided under limited swarm gating.
        // Count for regime-conditional analysis but do not affect PnL.
        regimeBuckets.limited.trades += 0;
      }
      if (eqLimited > maxEqLimited) maxEqLimited = eqLimited;
      const ddLim = maxEqLimited - eqLimited;
      if (ddLim > limited.maxDrawdownPct) limited.maxDrawdownPct = ddLim;
      if (ddLim > regimeBuckets.limited.maxDrawdownPct) {
        regimeBuckets.limited.maxDrawdownPct = ddLim;
      }
    }

    // Full swarm
    if (modes.includes("full")) {
      const votes = buildVotesFromRecord(r, "full");
      const consensus = computeConsensus(votes, threshold);
      if (consensus.consensusReached) {
        accumulate(full, pnlPct);
        accumulate(regimeBuckets.full, pnlPct);
        eqFull += pnlPct;
      } else {
        // Trade would have been avoided under full swarm gating.
        regimeBuckets.full.trades += 0;
      }
      if (eqFull > maxEqFull) maxEqFull = eqFull;
      const ddFull = maxEqFull - eqFull;
      if (ddFull > full.maxDrawdownPct) full.maxDrawdownPct = ddFull;
      if (ddFull > regimeBuckets.full.maxDrawdownPct) {
        regimeBuckets.full.maxDrawdownPct = ddFull;
      }
    }
  }

  finalize(baseline);
  finalize(limited);
  finalize(full);

  for (const key of regimeKeys) {
    finalize(byRegime[key].baseline);
    finalize(byRegime[key].limited);
    finalize(byRegime[key].full);
  }

  return { baseline, limited, full, byRegime };
}
