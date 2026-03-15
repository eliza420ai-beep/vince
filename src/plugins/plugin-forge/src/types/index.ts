/**
 * Forge type definitions.
 */

export type ForgeRuntime = "mlx" | "python";

export interface ForgeExperimentConfig {
  /** Unique experiment ID: e.g. "exp-20240115-001" */
  id: string;
  /** Git branch name: forge/experiment-YYYYMMDD-NNN */
  branch: string;
  /** ISO timestamp when experiment started */
  startedAt: string;
  /** Which surface to mutate */
  surface: ForgeSurface;
  /** The specific mutation applied */
  mutation: ForgeMutation;
}

export type ForgeSurface =
  | "policy_threshold"
  | "prompt_vince_gate"
  | "prompt_solus_ritual"
  | "ml_hyperparams"
  | "bandit_priors"
  | "agent_style";

export interface ForgeMutation {
  /** File path mutated (relative to repo root) */
  filePath: string;
  /** YAML/JSON key path mutated (dot-separated) */
  keyPath: string;
  /** Previous value */
  before: number | string | boolean;
  /** New value */
  after: number | string | boolean;
  /** Human-readable description */
  description: string;
}

export interface ForgeReplayResult {
  /** Number of trades replayed */
  tradeCount: number;
  /** Win rate 0–1 */
  winRate: number;
  /** Sharpe ratio */
  sharpe: number;
  /** Causal uplift vs baseline (delta win rate) */
  causalUplift: number;
  /** Brier score for Solus prediction accuracy (lower = better) */
  brierScore: number;
  /** Composite metric: causal_uplift × Sharpe × (1 - brierScore) */
  composite: number;
  /** Max drawdown during replay window (%) */
  maxDrawdownPct: number;
  /** Whether safety gate passed */
  safetyGatePassed: boolean;
  /** Safety gate failure reason (if any) — first failure for backward compat */
  safetyGateReason?: string;
  /** All promotion gate failures (explicit reject reasons) */
  gateFailures?: string[];
  /** SOUL.md alignment multiplier applied (1.0 or 0.8) */
  thesisAlignment?: number;
}

export interface ForgeExperimentResult {
  config: ForgeExperimentConfig;
  result: ForgeReplayResult;
  /** Composite delta vs baseline */
  compositeDelta: number;
  /** Whether this experiment is a winner (committed) */
  winner: boolean;
  /** Duration in seconds */
  durationSeconds: number;
  /** Reject reasons when winner is false (same as result.gateFailures) */
  gateFailures?: string[];
}

export interface ForgeRunSummary {
  date: string;
  experimentsRun: number;
  winners: ForgeExperimentResult[];
  losers: ForgeExperimentResult[];
  baselineComposite: number;
  bestCompositeDelta: number;
  /** Runtime used: mlx | python */
  runtime: ForgeRuntime;
  /** Budget consumed in minutes */
  budgetConsumedMinutes: number;
  safetyGateStatus: "passed" | "failed" | "not_reached";
  /** Branch names committed (winners) */
  committedBranches: string[];
  /** Counts of reject reasons across losers (e.g. "ΔComposite": 3) */
  rejectReasonCounts?: Record<string, number>;
}

export interface ForgePolicyThresholds {
  version: string;
  sentiment_gate: {
    bearish_threshold: number;
    bullish_threshold: number;
    bearish_size_multiplier: number;
    risk_off_size_multiplier: number;
    cache_staleness_minutes: number;
  };
  position_limits: {
    max_single_trade_usd: number;
    max_open_positions: number;
    aggressive_margin_usd: number;
    aggressive_base_size_pct: number;
    max_position_size_pct: number;
    max_total_exposure_pct: number;
    max_leverage: number;
  };
  risk: {
    max_daily_loss_pct: number;
    max_drawdown_pct: number;
    cooldown_after_loss_minutes: number;
  };
  signal: {
    min_strength: number;
    min_confidence: number;
    min_confirming_signals: number;
    strong_strength: number;
    high_confidence: number;
    min_confirming_when_strong: number;
    hip3_min_strength: number;
    hip3_min_confidence: number;
  };
  ml_gate: {
    signal_quality_threshold: number;
    swarm_min_confidence: number;
  };
}
