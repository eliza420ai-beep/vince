/**
 * VINCE Paper Trading Types
 * 
 * Type definitions for the paper trading bot system.
 * Supports simulated trading, position tracking, and trade journaling.
 */

import type { UUID } from "@elizaos/core";

// ==========================================
// Position Types
// ==========================================

export type PositionDirection = "long" | "short";
export type PositionStatus = "open" | "closed" | "liquidated";

/**
 * A paper trading position
 */
export interface Position {
  /** Unique position ID */
  id: string;
  
  /** Asset being traded (e.g., "BTC", "ETH") */
  asset: string;
  
  /** Position direction */
  direction: PositionDirection;
  
  /** Position status */
  status: PositionStatus;
  
  /** Entry price */
  entryPrice: number;
  
  /** Position size in USD */
  sizeUsd: number;
  
  /** Margin posted in USD (sizeUsd / leverage) */
  marginUsd: number;

  /** Leverage used */
  leverage: number;
  
  /** Stop loss price */
  stopLossPrice: number;
  
  /** Take profit prices (multiple targets) */
  takeProfitPrices: number[];
  
  /** Liquidation price (if leveraged) */
  liquidationPrice: number;
  
  /** Current mark price */
  markPrice: number;
  
  /** Unrealized P&L in USD */
  unrealizedPnl: number;
  
  /** Unrealized P&L as percentage */
  unrealizedPnlPct: number;
  
  /** Max unrealized profit reached */
  maxUnrealizedProfit: number;
  
  /** Max unrealized loss reached */
  maxUnrealizedLoss: number;
  
  /** Trailing stop price (dynamically updated) */
  trailingStopPrice?: number;
  
  /** Whether trailing stop is activated (after 1.5R profit) */
  trailingStopActivated?: boolean;
  
  /** ATR at entry time for trailing distance calculation */
  entryATRPct?: number;
  
  /** Partial profits taken (0, 1, 2 for TP1, TP2, etc.) */
  partialProfitsTaken?: number;
  
  /** Original size before partial exits */
  originalSizeUsd?: number;
  
  /** Strategy that opened this position */
  strategyName: string;
  
  /** Signals that triggered the trade */
  triggerSignals: string[];
  
  /** Timestamp when position was opened */
  openedAt: number;
  
  /** Timestamp when position was closed (if closed) */
  closedAt?: number;
  
  /** Realized P&L (if closed) */
  realizedPnl?: number;
  
  /** Realized P&L as percentage (if closed) */
  realizedPnlPct?: number;
  
  /** Close reason (if closed) */
  closeReason?: "stop_loss" | "take_profit" | "manual" | "signal_flip" | "liquidation" | "trailing_stop" | "partial_tp" | "max_age";
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ==========================================
// Portfolio Types
// ==========================================

/**
 * Portfolio state for paper trading
 */
export interface Portfolio {
  /** Current cash balance */
  balance: number;
  
  /** Initial starting balance */
  initialBalance: number;
  
  /** Total realized P&L */
  realizedPnl: number;
  
  /** Total unrealized P&L */
  unrealizedPnl: number;
  
  /** Total portfolio value (balance + unrealized) */
  totalValue: number;
  
  /** Return percentage */
  returnPct: number;
  
  /** Number of trades executed */
  tradeCount: number;
  
  /** Number of winning trades */
  winCount: number;
  
  /** Number of losing trades */
  lossCount: number;
  
  /** Win rate percentage */
  winRate: number;
  
  /** Maximum drawdown */
  maxDrawdown: number;
  
  /** Maximum drawdown percentage */
  maxDrawdownPct: number;
  
  /** Last update timestamp */
  lastUpdate: number;
}

// ==========================================
// Trade Journal Types
// ==========================================

/**
 * Signal details at time of trade
 */
export interface TradeSignalDetail {
  /** Signal source */
  source: string;
  
  /** Signal direction */
  direction: "long" | "short" | "neutral";
  
  /** Signal strength (0-100) */
  strength: number;
  
  /** Signal description */
  description?: string;
}

/**
 * Market context at time of trade
 */
export interface TradeMarketContext {
  /** Current price at entry/exit */
  price: number;
  
  /** Funding rate */
  funding?: number;
  
  /** Open interest */
  oi?: number;
  
  /** Long/short ratio */
  longShortRatio?: number;
  
  /** Fear/Greed index */
  fearGreed?: number;
  
  /** Volatility */
  volatility?: number;
  
  /** Market regime */
  regime?: "trending" | "ranging" | "volatile";
}

/**
 * A trade journal entry
 */
export interface TradeJournalEntry {
  /** Position ID this entry is for */
  positionId: string;
  
  /** Entry type */
  type: "entry" | "exit";
  
  /** Asset traded */
  asset: string;
  
  /** Direction */
  direction: PositionDirection;
  
  /** Price at entry/exit */
  price: number;
  
  /** Position size in USD */
  sizeUsd: number;
  
  /** Leverage used */
  leverage: number;
  
  /** Strategy that triggered */
  strategyName: string;
  
  /** Signals at time of trade */
  signalDetails: TradeSignalDetail[];
  
  /** Market context at time of trade */
  marketContext: TradeMarketContext;
  
  /** Stop loss price (for entries) */
  stopLoss?: number;
  
  /** Take profit prices (for entries) */
  takeProfits?: number[];
  
  /** Realized P&L (for exits) */
  realizedPnl?: number;
  
  /** Close reason (for exits) */
  closeReason?: string;
  
  /** Duration of trade in ms (for exits) */
  durationMs?: number;
  
  /** Timestamp */
  timestamp: number;
}

// ==========================================
// Risk Types
// ==========================================

/**
 * Risk limits configuration
 */
export interface RiskLimits {
  /** Maximum position size as % of portfolio */
  maxPositionSizePct: number;
  
  /** Maximum total exposure as % of portfolio */
  maxTotalExposurePct: number;
  
  /** Maximum leverage allowed */
  maxLeverage: number;
  
  /** Maximum daily loss before circuit breaker */
  maxDailyLossPct: number;
  
  /** Maximum drawdown before circuit breaker */
  maxDrawdownPct: number;
  
  /** Minimum signal strength to trade */
  minSignalStrength: number;
  
  /** Minimum signal confidence to trade */
  minSignalConfidence: number;
  
  /** Minimum confirming signals needed */
  minConfirmingSignals: number;
  
  /** Cooldown after loss (ms) */
  cooldownAfterLossMs: number;
}

/**
 * Current risk state
 */
export interface RiskState {
  /** Is trading currently paused */
  isPaused: boolean;
  
  /** Pause reason (if paused) */
  pauseReason?: string;
  
  /** Daily P&L so far */
  dailyPnl: number;
  
  /** Daily P&L percentage */
  dailyPnlPct: number;
  
  /** Current drawdown from peak */
  currentDrawdown: number;
  
  /** Current drawdown percentage */
  currentDrawdownPct: number;
  
  /** Is circuit breaker active */
  circuitBreakerActive: boolean;
  
  /** Cooldown expires at (timestamp) */
  cooldownExpiresAt?: number;
  
  /** Last trade timestamp */
  lastTradeAt?: number;
  
  /** Today's trade count */
  todayTradeCount: number;
  
  /** Last update timestamp */
  lastUpdate: number;
}

// ==========================================
// Bot Status Types
// ==========================================

export type BotMode = "active" | "paused" | "cooldown" | "circuit_breaker";

/**
 * Paper trading bot status
 */
export interface BotStatus {
  /** Current bot mode */
  mode: BotMode;
  
  /** Status message */
  message: string;
  
  /** Portfolio summary */
  portfolio: Portfolio;
  
  /** Open positions */
  openPositions: Position[];
  
  /** Risk state */
  riskState: RiskState;
  
  /** Last signal check */
  lastSignalCheck?: {
    asset: string;
    direction: "long" | "short" | "neutral";
    strength: number;
    confidence: number;
    wouldTrade: boolean;
    reason: string;
  };
  
  /** Last update timestamp */
  lastUpdate: number;
}

// ==========================================
// Order Types
// ==========================================

export type OrderType = "market" | "limit";
export type OrderSide = "buy" | "sell";

/**
 * A simulated order
 */
export interface SimulatedOrder {
  /** Order ID */
  id: string;
  
  /** Asset */
  asset: string;
  
  /** Order type */
  type: OrderType;
  
  /** Order side */
  side: OrderSide;
  
  /** Order size in USD */
  sizeUsd: number;
  
  /** Limit price (for limit orders) */
  limitPrice?: number;
  
  /** Executed price */
  executedPrice?: number;
  
  /** Slippage applied */
  slippage?: number;
  
  /** Fees charged */
  fees?: number;
  
  /** Order status */
  status: "pending" | "filled" | "cancelled" | "rejected";
  
  /** Reject reason (if rejected) */
  rejectReason?: string;
  
  /** Created timestamp */
  createdAt: number;
  
  /** Executed timestamp (if filled) */
  executedAt?: number;
}

// ==========================================
// Aggregated Signal Types (for trade decisions)
// ==========================================

/**
 * Aggregated signal for trade decision
 */
export interface AggregatedTradeSignal {
  /** Asset */
  asset: string;
  
  /** Aggregated direction */
  direction: "long" | "short" | "neutral";
  
  /** Signal strength (0-100) */
  strength: number;
  
  /** Signal confidence (0-100) */
  confidence: number;
  
  /** Number of confirming signals */
  confirmingCount: number;
  
  /** Number of conflicting signals */
  conflictingCount: number;
  
  /** Individual signals */
  signals: TradeSignalDetail[];
  
  /** Reasons for the signal */
  reasons: string[];
  
  /** Source breakdown */
  sourceBreakdown: {
    top_traders?: { count: number; avgStrength: number };
    market_data?: { count: number; avgStrength: number };
    technical?: { count: number; avgStrength: number };
    sentiment?: { count: number; avgStrength: number };
    news?: { count: number; avgStrength: number };
    on_chain?: { count: number; avgStrength: number };
  };

  /** Timestamp */
  timestamp: number;

  /** Trading session at signal time (e.g. eu_us_overlap, asia) */
  session?: string;

  /** ML signal quality score 0–1 (when available); shown in WHY THIS TRADE banner */
  mlQualityScore?: number;
  /** Open-window boost % (when trend aligned at session open); shown in WHY THIS TRADE banner */
  openWindowBoost?: number;
}

// ==========================================
// Persistence Types
// ==========================================

/**
 * State to persist to disk
 */
export interface PaperBotPersistence {
  /** Portfolio state */
  portfolio: Portfolio;
  
  /** Open positions */
  positions: Position[];
  
  /** Risk state */
  riskState: RiskState;
  
  /** Trade journal entries */
  journal: TradeJournalEntry[];
  
  /** Last save timestamp */
  savedAt: number;
  
  /** Version for migrations */
  version: number;
}

// ==========================================
// Goal-Aware Trading Types (KPI System)
// ==========================================

/**
 * Trading goal configuration
 * Core KPI: $10K/month = ~$420/day
 */
export interface TradingGoal {
  /** Daily profit target in USD (default: $420) */
  dailyTarget: number;
  
  /** Monthly profit target in USD (default: $10,000) */
  monthlyTarget: number;
  
  /** Risk per trade as % of capital (default: 1-2%) */
  riskPerTradePct: number;
  
  /** Maximum daily drawdown before reducing risk (default: 5%) */
  maxDailyDrawdownPct: number;
  
  /** Target win rate for calculations (default: 55%) */
  targetWinRate: number;
  
  /** Target risk/reward ratio (default: 1.5) */
  targetRiskReward: number;
  
  /** Expected trades per day (default: 2-3) */
  expectedTradesPerDay: number;
}

/**
 * Capital requirements analysis
 */
export interface CapitalRequirements {
  /** Minimum capital needed at max leverage */
  minimumCapital: number;
  
  /** Conservative capital at half-Kelly leverage */
  conservativeCapital: number;
  
  /** Optimal capital at Kelly leverage */
  optimalCapital: number;
  
  /** Current available capital */
  currentCapital: number;
  
  /** Gap from optimal (positive = need more, negative = buffer) */
  capitalGap: number;
  
  /** Capital utilization percentage */
  utilizationPct: number;
  
  /** Capital status description */
  status: "under-capitalized" | "optimal" | "over-capitalized";
  
  /** Recommendation message */
  recommendation: string;
}

/**
 * Leverage recommendation based on Kelly Criterion
 */
export interface LeverageRecommendation {
  /** Pure Kelly optimal leverage */
  kellyOptimal: number;
  
  /** Half-Kelly (safer, recommended) */
  kellySafe: number;
  
  /** Final recommended leverage after all adjustments */
  recommended: number;
  
  /** Current leverage setting */
  current: number;
  
  /** Maximum allowed leverage */
  maximum: number;
  
  /** All adjustment factors applied */
  adjustments: LeverageAdjustment[];
  
  /** Primary reason for recommendation */
  reason: string;
}

/**
 * Individual leverage adjustment factor
 */
export interface LeverageAdjustment {
  /** Factor name */
  factor: string;
  
  /** Multiplier applied (e.g., 0.7 = 30% reduction) */
  multiplier: number;
  
  /** Reason for this adjustment */
  reason: string;
}

/**
 * KPI progress tracking
 */
export interface KPIProgress {
  // Daily progress
  daily: {
    target: number;
    current: number;
    pct: number;
    remaining: number;
    trades: number;
    winRate: number;
    pace: "ahead" | "on-track" | "behind";
    paceAmount: number; // +/- vs expected at this time
  };
  
  // Monthly progress
  monthly: {
    target: number;
    current: number;
    pct: number;
    remaining: number;
    tradingDays: number;
    tradingDaysRemaining: number;
    dailyTargetToHitGoal: number; // If behind, what daily target needed
    status: "ahead" | "on-track" | "behind";
  };
  
  // All-time stats
  allTime: {
    totalPnl: number;
    totalTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    sharpeRatio: number;
  };
}

/**
 * Position sizing recommendation
 */
export interface PositionSizingRecommendation {
  /** Recommended position size in USD */
  sizeUsd: number;
  
  /** Size as percentage of capital */
  sizePct: number;
  
  /** Recommended leverage */
  leverage: number;
  
  /** Dollar risk on this trade */
  riskUsd: number;
  
  /** Risk as percentage of capital */
  riskPct: number;
  
  /** Expected profit if win */
  expectedWinUsd: number;
  
  /** Expected loss if stop hit */
  expectedLossUsd: number;
  
  /** Factors that influenced sizing */
  factors: string[];
  
  /** Whether this trade helps hit daily target */
  helpsHitTarget: boolean;
  
  /** Estimated contribution to daily goal */
  expectedContribution: number;
}

/**
 * Goal tracker state for persistence
 */
export interface GoalTrackerState {
  /** Current trading goal */
  goal: TradingGoal;
  
  /** Daily P&L history (last 30 days) */
  dailyPnlHistory: Array<{
    date: string; // YYYY-MM-DD
    pnl: number;
    trades: number;
    hitTarget: boolean;
  }>;
  
  /** Monthly P&L history (last 12 months) */
  monthlyPnlHistory: Array<{
    month: string; // YYYY-MM
    pnl: number;
    trades: number;
    hitTarget: boolean;
  }>;
  
  /** Last update timestamp */
  lastUpdate: number;
}
