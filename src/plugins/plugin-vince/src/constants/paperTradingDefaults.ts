/**
 * VINCE Paper Trading Configuration
 *
 * Default configuration for the paper trading bot.
 * These values can be overridden via runtime settings.
 */

import type { IAgentRuntime } from "@elizaos/core";
import type { RiskLimits, TradingGoal } from "../types/paperTrading";
import { CORE_ASSETS, HIP3_ASSETS, ALL_TRACKED_ASSETS } from "./targetAssets";

// ==========================================
// Trading Goal / KPI Configuration
// Core KPI: $10,000/month = ~$420/day
// ==========================================

export const DEFAULT_TRADING_GOAL: TradingGoal = {
  /** Target $420/day to hit $10K/month (assuming ~24 trading days) */
  dailyTarget: 420,

  /** Monthly profit target */
  monthlyTarget: 10_000,

  /** Risk 1.5% of capital per trade (conservative) */
  riskPerTradePct: 1.5,

  /** Stop trading if down 5% in a day */
  maxDailyDrawdownPct: 5,

  /** Target 55% win rate for Kelly calculations */
  targetWinRate: 55,

  /** Target 1.5:1 risk/reward ratio */
  targetRiskReward: 1.5,

  /** Expect 2-3 trades per day */
  expectedTradesPerDay: 2.5,
};

// ==========================================
// Kelly Criterion Configuration
// ==========================================

export const KELLY_CONFIG = {
  /** Use half-Kelly for safety (0.5 = half, 1.0 = full) */
  kellyFraction: 0.5,

  /** Minimum trades required for reliable Kelly calculation */
  minTradesForKelly: 10,

  /** Fallback win rate if insufficient data */
  fallbackWinRate: 50,

  /** Fallback win/loss ratio if insufficient data */
  fallbackWinLossRatio: 1.2,

  /** Maximum Kelly leverage (even if math says higher) */
  maxKellyLeverage: 5,

  /** Minimum leverage regardless of Kelly */
  minLeverage: 1,
} as const;

// ==========================================
// Leverage Adjustment Factors
// ==========================================

export const LEVERAGE_ADJUSTMENTS = {
  /** Drawdown thresholds and their leverage multipliers */
  drawdown: {
    /** At 5% drawdown, reduce leverage to 75% */
    threshold5Pct: 0.75,
    /** At 10% drawdown, reduce leverage to 50% */
    threshold10Pct: 0.5,
    /** At 15% drawdown, reduce leverage to 25% */
    threshold15Pct: 0.25,
  },

  /** Volatility (DVOL) adjustments */
  volatility: {
    /** DVOL > 80: Reduce leverage by 30% */
    highVolMultiplier: 0.7,
    /** DVOL > 60: Reduce leverage by 15% */
    elevatedVolMultiplier: 0.85,
    /** DVOL < 40: Allow full leverage */
    lowVolMultiplier: 1.0,
  },

  /** Session adjustments */
  session: {
    /** Off-hours: Cap at 2x regardless of Kelly */
    offHoursMaxLeverage: 2,
    /** EU/US overlap: Allow 20% boost */
    overlapBoostMultiplier: 1.2,
    /** Weekend: Reduce by 20% */
    weekendMultiplier: 0.8,
  },

  /** Daily progress adjustments */
  progress: {
    /** Behind target: Can increase 10% (within max) */
    behindTargetBoost: 1.1,
    /** Far ahead of target: Reduce to preserve gains */
    aheadTargetMultiplier: 0.8,
    /** Threshold for "far ahead" (e.g., 150% of daily target) */
    aheadThresholdPct: 150,
  },
} as const;

// ==========================================
// Portfolio Defaults
// ==========================================

/** Initial virtual capital */
export const INITIAL_BALANCE = 100_000;

/** Persistence directory (relative to .elizadb) */
export const PERSISTENCE_DIR = "vince-paper-bot";

/** State file names */
export const STATE_FILES = {
  PORTFOLIO: "portfolio.json",
  POSITIONS: "positions.json",
  JOURNAL: "journal.json",
  RISK_STATE: "risk-state.json",
  GOAL_TRACKER: "goal-tracker.json",
} as const;

// ==========================================
// Risk Limits
// ==========================================

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  /** Maximum 10% of portfolio per position */
  maxPositionSizePct: 10,

  /** Maximum 30% total exposure */
  maxTotalExposurePct: 30,

  /** Maximum 5x leverage */
  maxLeverage: 5,

  /** Circuit breaker at 5% daily loss */
  maxDailyLossPct: 5,

  /** Circuit breaker at 15% drawdown */
  maxDrawdownPct: 15,

  /** Minimum signal strength to trade (Learning Mode - aggressive) */
  minSignalStrength: 40,

  /** Minimum signal confidence to trade (Learning Mode - aggressive) */
  minSignalConfidence: 35,

  /** Need at least 3 confirming signals (keep conservative for direction) */
  minConfirmingSignals: 3,

  /** 30 minute cooldown after loss */
  cooldownAfterLossMs: 30 * 60 * 1000,
};

// ==========================================
// Trade Defaults
// ==========================================

/** Default stop loss percentage */
export const DEFAULT_STOP_LOSS_PCT = 2;

/** Default take profit targets (R:R ratios) */
export const DEFAULT_TAKE_PROFIT_TARGETS = [1.5, 3, 5];

/** Default leverage */
export const DEFAULT_LEVERAGE = 3;

/**
 * Optional dollar take-profit: close position when unrealized P&L reaches this (e.g. $210 = half of $420/day).
 * Default null = only price-based TPs. When aggressive preset is on, position manager uses TAKE_PROFIT_USD_AGGRESSIVE.
 */
export const TAKE_PROFIT_USD: number | null = null;
/** Aggressive TP per trade ($280 → fewer trades for daily target; with 2:1 R:R risk = $140). */
export const TAKE_PROFIT_USD_AGGRESSIVE = 280;

/**
 * Aggressive R:R: SL is chosen so max loss = TP / TARGET_RR (e.g. 2 → risk $140 for $280 TP = 2:1).
 * Improves trade quality vs earlier “ATR-only” SL which often gave 0.4:1–0.5:1.
 */
export const TARGET_RR_AGGRESSIVE = 2.5;
/** Min SL % in aggressive mode; 0.28 allows full 2.5:1 at $40K notional ($280 TP → $112 risk). */
export const MIN_SL_PCT_AGGRESSIVE = 0.28;
/** Max SL % in aggressive mode (cap risk when notional is small so R:R doesn’t go too wide). */
export const MAX_SL_PCT_AGGRESSIVE = 0.65;
/** In aggressive mode, SL is never below this multiple of ATR (avoids stops inside normal chop). */
export const MIN_SL_ATR_MULTIPLIER_AGGRESSIVE = 0.5;

/**
 * Aggressive preset (Hyperliquid-style): 40x, tight SL, high R:R, many trades for ML.
 * Use with runtime setting vince_paper_aggressive = true.
 * Math: $1K margin × 40x = $40K notional → TP $280 ≈ 0.7% move; SL for 2.5:1 → risk $112 ≈ 0.28% (min).
 * SL capped at 0.65% max for high R:R; no cooldown after loss so we generate more trade data.
 */
export const AGGRESSIVE_LEVERAGE = 40;
/** Fixed margin per trade in aggressive mode (notional = margin × leverage = $40K). */
export const AGGRESSIVE_MARGIN_USD = 1000;
/** Fallback: base size as % of portfolio when not using fixed margin (e.g. if margin would exceed portfolio). */
export const AGGRESSIVE_BASE_SIZE_PCT = 12;
export const AGGRESSIVE_RISK_LIMITS: RiskLimits = {
  ...DEFAULT_RISK_LIMITS,
  maxLeverage: 40,
  maxPositionSizePct: 50,
  maxTotalExposurePct: 60,
  /** No cooldown in aggressive (learning) mode so we can generate more trades for ML. */
  cooldownAfterLossMs: 0,
};

/**
 * Primary signal sources: at least one must contribute to allow a trade.
 * Secondary sources only raise conviction; they cannot open a trade alone.
 * Aligns with EVClaw-style signal hierarchy.
 */
export const PRIMARY_SIGNAL_SOURCES = new Set([
  "BinanceTopTraders",
  "LiquidationCascade",
  "LiquidationPressure",
  "BinanceFundingExtreme",
  "HyperliquidFundingExtreme",
  "HyperliquidCrowding",
  "DeribitPutCallRatio",
  "HIP3Funding",
  "CoinGlass",
  "BinanceTakerFlow",
  "BinanceLongShort",
  "MarketRegime",
]);

/** Slippage settings */
export const SLIPPAGE = {
  /** Base slippage in basis points */
  BASE_BPS: 2,

  /** Additional slippage per $10k order size */
  SIZE_IMPACT_BPS_PER_10K: 2,

  /** Maximum slippage */
  MAX_BPS: 20,
} as const;

/** Fee settings (Hyperliquid-like). PnL is reported net of fees. */
export const FEES = {
  /** Taker fee in basis points (per side) */
  TAKER_BPS: 2.5,
  /** Maker fee in basis points */
  MAKER_BPS: 0,
  /** Round-trip fee (open + close, both taker) in bps — used for fee-aware PnL */
  ROUND_TRIP_BPS: 5,
} as const;

// ==========================================
// Signal Thresholds
// ==========================================

export const SIGNAL_THRESHOLDS = {
  /** Minimum strength to consider trading (Learning Mode - aggressive) */
  MIN_STRENGTH: 40,

  /** Minimum confidence to consider trading (Learning Mode - aggressive) */
  MIN_CONFIDENCE: 35,

  /** Minimum confirming signals (keep conservative for direction confirmation) */
  MIN_CONFIRMING: 3,

  /** Strong signal threshold (used for strong-signal confirming override; ≥ this + HIGH_CONFIDENCE → need only 2 confirming) */
  STRONG_STRENGTH: 55,

  /** High confidence threshold (used for strong-signal confirming override) */
  HIGH_CONFIDENCE: 55,

  /**
   * When strength >= STRONG_STRENGTH and confidence >= HIGH_CONFIDENCE, allow this many
   * confirming sources instead of MIN_CONFIRMING. Lower = more trades = more training data.
   */
  MIN_CONFIRMING_WHEN_STRONG: 2,
} as const;

// ==========================================
// Timing
// ==========================================

export const TIMING = {
  /** Mark price update interval (ms) */
  MARK_PRICE_UPDATE_MS: 30_000,

  /** Signal check interval (ms) */
  SIGNAL_CHECK_MS: 60_000,

  /** State persistence interval (ms) */
  PERSISTENCE_INTERVAL_MS: 5 * 60_000,

  /** Maximum state age before considering stale (24 hours) */
  MAX_STATE_AGE_MS: 24 * 60 * 60 * 1000,

  /** Cooldown after loss (ms) */
  COOLDOWN_AFTER_LOSS_MS: 30 * 60 * 1000,
} as const;

// ==========================================
// Assets
// ==========================================

/**
 * Asset-specific max leverage.
 * BTC: 40x (primary, most liquid). SOL, ETH, HYPE: 10x (higher volatility/risk).
 */
export const ASSET_MAX_LEVERAGE: Record<string, number> = {
  BTC: 40,
  ETH: 10,
  SOL: 10,
  HYPE: 10,
};

/** Get max leverage for an asset (defaults to AGGRESSIVE_LEVERAGE for unknown) */
export function getAssetMaxLeverage(
  asset: string,
  aggressiveDefault: number = 40,
): number {
  return ASSET_MAX_LEVERAGE[asset.toUpperCase()] ?? aggressiveDefault;
}

/** Assets available for paper trading (V3.0: full HIP-3 universe) */
export const TRADEABLE_ASSETS = [...CORE_ASSETS, ...HIP3_ASSETS] as const;
export type TradeableAsset = (typeof TRADEABLE_ASSETS)[number];

/** Whether to include HIP-3 in the regular signal loop. Default ON (V3.0). Env: VINCE_PAPER_HIP3_ENABLED */
export function isHip3Enabled(runtime: IAgentRuntime): boolean {
  const v = runtime.getSetting?.("vince_paper_hip3_enabled");
  if (v === false || v === "false") return false;
  return true; // default on
}

/**
 * Resolve which assets the paper bot trades from runtime setting.
 * Set vince_paper_assets to "BTC" to focus only on BTC.
 * Set VINCE_PAPER_HIP3_ENABLED=false to restrict to core 4 only.
 * Unset / empty = full universe (core + HIP-3).
 * Env: VINCE_PAPER_ASSETS (e.g. VINCE_PAPER_ASSETS=BTC,NVDA,GOLD).
 */
export function getPaperTradeAssets(
  runtime: IAgentRuntime,
): readonly string[] {
  const raw = runtime.getSetting?.("vince_paper_assets");
  if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
    const list = String(raw)
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const valid = list.filter((a) =>
      (ALL_TRACKED_ASSETS as readonly string[]).includes(a),
    );
    return valid.length > 0 ? valid : [...CORE_ASSETS];
  }
  // Default: core + HIP-3 (unless HIP-3 explicitly disabled)
  return isHip3Enabled(runtime) ? TRADEABLE_ASSETS : [...CORE_ASSETS];
}

// ==========================================
// Signal Source Weights
// ==========================================

/** Weights for signal aggregation (sum to 100) */
export const SIGNAL_SOURCE_WEIGHTS = {
  /** Top traders / whale activity (primary) */
  top_traders: 40,

  /** Market data (funding, OI, L/S) */
  market_data: 20,

  /** Technical indicators */
  technical: 15,

  /** Sentiment (fear/greed) */
  sentiment: 10,

  /** News sentiment */
  news: 10,

  /** On-chain data */
  on_chain: 5,
} as const;

// ==========================================
// Educational Explanations
// ==========================================

/** Signal type explanations for trade reasoning */
export const SIGNAL_EXPLANATIONS: Record<string, string> = {
  // Funding rate
  funding_negative:
    "Negative funding means shorts are paying longs - shorts are crowded and potential squeeze setup",
  funding_positive:
    "Positive funding means longs are paying shorts - longs are crowded and vulnerable to flush",
  funding_extreme:
    "Extreme funding indicates one side is heavily crowded - mean reversion likely",

  // Long/Short ratio
  ls_ratio_high:
    "High L/S ratio shows longs are crowded - contrarian short signal",
  ls_ratio_low:
    "Low L/S ratio shows shorts are crowded - contrarian long signal",
  ls_ratio_unwinding:
    "L/S ratio unwinding suggests the crowded side is capitulating",

  // Whale activity
  whale_long: "Whale opened long position - smart money positioning bullish",
  whale_short: "Whale opened short position - smart money positioning bearish",
  whale_increase: "Whale increased position - adding to conviction",
  whale_decrease: "Whale reduced position - taking profits or cutting loss",

  // Fear/Greed
  extreme_fear:
    "Extreme fear reading - contrarian buy signal (be greedy when others fearful)",
  extreme_greed:
    "Extreme greed reading - contrarian sell signal (be fearful when others greedy)",

  // Technical
  price_above_sma: "Price above moving average - bullish trend confirmation",
  price_below_sma: "Price below moving average - bearish trend confirmation",
  oversold_rsi: "RSI oversold - potential bounce setup",
  overbought_rsi: "RSI overbought - potential pullback setup",

  // Order book
  bid_pressure: "Heavy bid pressure in order book - real buying demand",
  ask_pressure: "Heavy ask pressure in order book - real selling pressure",

  // Liquidations
  long_liquidations:
    "Long liquidation cascade - forced selling accelerating downside",
  short_liquidations:
    "Short liquidation cascade - forced buying accelerating upside",
};

// ==========================================
// WTT (What's the Trade) → Paper Bot
// ==========================================

/** Rubric strings from WTT pick (alignment, edge, payoff, timing). */
export type WttRubricStrings = {
  alignment: "direct" | "pure_play" | "exposed" | "partial" | "tangential";
  edge: "undiscovered" | "emerging" | "consensus" | "crowded";
  payoffShape: "max_asymmetry" | "high" | "moderate" | "linear" | "capped";
  timingForgiveness: "very_forgiving" | "forgiving" | "punishing" | "very_punishing";
};

const WTT_ALIGNMENT_ORD: Record<string, number> = {
  tangential: 1,
  partial: 2,
  exposed: 3,
  pure_play: 4,
  direct: 5,
};
const WTT_EDGE_ORD: Record<string, number> = {
  crowded: 1,
  consensus: 2,
  emerging: 3,
  undiscovered: 4,
};
const WTT_PAYOFF_ORD: Record<string, number> = {
  capped: 1,
  linear: 2,
  moderate: 3,
  high: 4,
  max_asymmetry: 5,
};
const WTT_TIMING_ORD: Record<string, number> = {
  very_punishing: 1,
  punishing: 2,
  forgiving: 3,
  very_forgiving: 4,
};

/** Whether the paper bot is allowed to trade the daily WTT pick. Default ON (V3.0 HIP-3 universe). Env: VINCE_PAPER_WTT_ENABLED */
export function isWttEnabled(runtime: IAgentRuntime): boolean {
  const v = runtime.getSetting?.("vince_paper_wtt_enabled");
  if (v === false || v === "false") return false;
  return true; // default on — WTT is the primary HIP-3 entry path
}

/** Map WTT rubric to signal strength/confidence for the paper bot (0–100). */
export function wttRubricToSignal(rubric: WttRubricStrings): {
  strength: number;
  confidence: number;
} {
  const a = WTT_ALIGNMENT_ORD[rubric.alignment] ?? 2;
  const e = WTT_EDGE_ORD[rubric.edge] ?? 2;
  const p = WTT_PAYOFF_ORD[rubric.payoffShape] ?? 2;
  const t = WTT_TIMING_ORD[rubric.timingForgiveness] ?? 2;
  const strength = Math.min(100, Math.max(0, 50 + (a + e) * 10 + p * 2));
  const confidence = Math.min(100, Math.max(0, 50 + (a + e) * 8 + t * 3));
  return { strength: Math.round(strength), confidence: Math.round(confidence) };
}

/** WTT block for feature store (ordinals for ML). */
export interface WttFeatureBlock {
  primary: boolean;
  ticker: string;
  thesis: string;
  alignment: number;
  edge: number;
  payoffShape: number;
  timingForgiveness: number;
  invalidateCondition?: string;
  evThresholdPct?: number;
}

/** Build feature-store wtt block from WTT pick (rubric → ordinals). */
export function wttPickToWttBlock(params: {
  primary: boolean;
  ticker: string;
  thesis: string;
  rubric: WttRubricStrings;
  invalidateCondition?: string;
  evThresholdPct?: number;
}): WttFeatureBlock {
  return {
    primary: params.primary,
    ticker: params.ticker,
    thesis: params.thesis,
    alignment: WTT_ALIGNMENT_ORD[params.rubric.alignment] ?? 2,
    edge: WTT_EDGE_ORD[params.rubric.edge] ?? 2,
    payoffShape: WTT_PAYOFF_ORD[params.rubric.payoffShape] ?? 2,
    timingForgiveness: WTT_TIMING_ORD[params.rubric.timingForgiveness] ?? 2,
    invalidateCondition: params.invalidateCondition,
    evThresholdPct: params.evThresholdPct,
  };
}
