/**
 * VINCE Paper Trading Configuration
 *
 * Default configuration for the paper trading bot.
 * These values can be overridden via runtime settings.
 */

import type { IAgentRuntime } from "@elizaos/core";
import type { RiskLimits, TradingGoal } from "../types/paperTrading";

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
    threshold10Pct: 0.50,
    /** At 15% drawdown, reduce leverage to 25% */
    threshold15Pct: 0.25,
  },
  
  /** Volatility (DVOL) adjustments */
  volatility: {
    /** DVOL > 80: Reduce leverage by 30% */
    highVolMultiplier: 0.70,
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
/** Used when vince_paper_aggressive is true: take profit at $210 (half daily target). */
export const TAKE_PROFIT_USD_AGGRESSIVE = 210;

/**
 * Aggressive preset (Hyperliquid-style): fixed margin, high leverage, $210 TP.
 * Use with runtime setting vince_paper_aggressive = true.
 * 40x + $1K margin = $40K notional → $210 at ~0.53% move. Liquidation ~2.25% away.
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
};

/** Slippage settings */
export const SLIPPAGE = {
  /** Base slippage in basis points */
  BASE_BPS: 2,
  
  /** Additional slippage per $10k order size */
  SIZE_IMPACT_BPS_PER_10K: 2,
  
  /** Maximum slippage */
  MAX_BPS: 20,
} as const;

/** Fee settings (Hyperliquid-like) */
export const FEES = {
  /** Taker fee in basis points */
  TAKER_BPS: 2.5,
  
  /** Maker fee in basis points */
  MAKER_BPS: 0,
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

  /** Strong signal threshold (used for strong-signal confirming override) */
  STRONG_STRENGTH: 60,

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

/** Assets available for paper trading */
export const TRADEABLE_ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;
export type TradeableAsset = (typeof TRADEABLE_ASSETS)[number];

/**
 * Resolve which assets the paper bot trades from runtime setting.
 * Set vince_paper_assets to "BTC" to focus only on BTC; "BTC,ETH,SOL,HYPE" or unset = all.
 * Env: VINCE_PAPER_ASSETS (e.g. VINCE_PAPER_ASSETS=BTC).
 */
export function getPaperTradeAssets(runtime: IAgentRuntime): readonly TradeableAsset[] {
  const raw = runtime.getSetting?.("vince_paper_assets");
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return TRADEABLE_ASSETS;
  }
  const list = String(raw)
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const valid = list.filter((a): a is TradeableAsset =>
    (TRADEABLE_ASSETS as readonly string[]).includes(a)
  );
  return valid.length > 0 ? valid : TRADEABLE_ASSETS;
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
  "funding_negative": "Negative funding means shorts are paying longs - shorts are crowded and potential squeeze setup",
  "funding_positive": "Positive funding means longs are paying shorts - longs are crowded and vulnerable to flush",
  "funding_extreme": "Extreme funding indicates one side is heavily crowded - mean reversion likely",
  
  // Long/Short ratio
  "ls_ratio_high": "High L/S ratio shows longs are crowded - contrarian short signal",
  "ls_ratio_low": "Low L/S ratio shows shorts are crowded - contrarian long signal",
  "ls_ratio_unwinding": "L/S ratio unwinding suggests the crowded side is capitulating",
  
  // Whale activity
  "whale_long": "Whale opened long position - smart money positioning bullish",
  "whale_short": "Whale opened short position - smart money positioning bearish",
  "whale_increase": "Whale increased position - adding to conviction",
  "whale_decrease": "Whale reduced position - taking profits or cutting loss",
  
  // Fear/Greed
  "extreme_fear": "Extreme fear reading - contrarian buy signal (be greedy when others fearful)",
  "extreme_greed": "Extreme greed reading - contrarian sell signal (be fearful when others greedy)",
  
  // Technical
  "price_above_sma": "Price above moving average - bullish trend confirmation",
  "price_below_sma": "Price below moving average - bearish trend confirmation",
  "oversold_rsi": "RSI oversold - potential bounce setup",
  "overbought_rsi": "RSI overbought - potential pullback setup",
  
  // Order book
  "bid_pressure": "Heavy bid pressure in order book - real buying demand",
  "ask_pressure": "Heavy ask pressure in order book - real selling pressure",
  
  // Liquidations
  "long_liquidations": "Long liquidation cascade - forced selling accelerating downside",
  "short_liquidations": "Short liquidation cascade - forced buying accelerating upside",
};
