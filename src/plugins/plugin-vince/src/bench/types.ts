/**
 * VinceBench — Decision-quality benchmark types.
 * Adapted from HyperliquidBench: score process (signatures) not PnL.
 */

/** A single decision-quality signature (e.g. signal.quality.high_confidence). */
export type Signature = string;

/** Domain config for weighted scoring (from domains-vince.yaml). */
export interface DomainConfig {
  weight: number;
  description?: string;
  allow: string[];
}

/** Full scoring config (domains-vince.yaml shape). */
export interface VinceBenchConfig {
  version: string;
  per_decision_window_ms: number;
  per_signature_cap: number;
  domains: Record<string, DomainConfig>;
}

/** One decision evaluated: record id, signatures, optional score and outcome. */
export interface DecisionEvaluation {
  recordId: string;
  timestamp: number;
  asset: string;
  signatures: Signature[];
  /** Per-decision score (sum of domain contributions for this decision only). */
  decisionScore?: number;
  /** Window key for composition bonus (floor(timestamp / window_ms)). */
  windowKeyMs?: number;
  /** If record has outcome, for correlation. */
  outcome?: {
    realizedPnl: number;
    realizedPnlPct: number;
    profitable: boolean;
    exitReason: string;
  };
}

/** Outcome correlation: does higher decision score correlate with better P&L? */
export interface OutcomeCorrelation {
  highScoreWinRate: number;
  lowScoreWinRate: number;
  correlation: number;
}

/** Full benchmark report. */
export interface VinceBenchReport {
  version: string;
  runId: string;
  timestamp: number;
  scenarioCount: number;
  scoring: {
    base: number;
    bonus: number;
    penalty: number;
    finalScore: number;
  };
  domainBreakdown: Record<
    string,
    {
      weight: number;
      uniqueSignatures: number;
      contribution: number;
    }
  >;
  perDecision: DecisionEvaluation[];
  signatureCounts: Record<string, number>;
  unmappedSignatures: string[];
  outcomeCorrelation?: OutcomeCorrelation;
}

/** HiaN scenario: signal extraction challenge with ground truth. */
export interface HiaNScenario {
  id: string;
  description: string;
  context: Record<string, unknown>;
  needle: string;
  ground_truth: {
    direction: "long" | "short" | "neutral";
    min_confidence?: number;
    required_signatures: string[];
  };
}

/** All known signature prefixes for validation/documentation. */
export const KNOWN_SIGNATURES = [
  "signal.quality.high_confidence",
  "signal.quality.ml_filtered",
  "signal.quality.regime_aligned",
  "signal.quality.multi_source_confirmed",
  "signal.quality.cascade_detected",
  "signal.quality.funding_extreme_used",
  "position.sizing.kelly_applied",
  "position.sizing.ml_adjusted",
  "position.sizing.streak_adjusted",
  "position.sizing.goal_aware",
  "entry.pullback_used",
  "entry.limit_order",
  "entry.session_optimal",
  "entry.open_window_boost",
  "risk.sl_atr_based",
  "risk.sl_ml_optimized",
  "risk.tp_structured",
  "risk.tp_ml_optimized",
  "risk.circuit_breaker_respected",
  "risk.max_exposure_within_limits",
  "risk.leverage_appropriate",
  "risk.cooldown_respected",
  "timing.session_favorable",
  "timing.window_open",
  "timing.cooldown_respected",
  "timing.weekend_reduced",
  "regime.detected",
  "regime.strategy_adapted",
  "regime.volatility_adjusted",
  "avoid.low_quality_rejected",
  "avoid.regime_mismatch_rejected",
  "avoid.circuit_breaker_blocked",
  "avoid.cooldown_blocked",
  "avoid.similarity_avoid",
  "avoid.book_imbalance_rejected",
  "avoid.time_filter_blocked",
] as const;
