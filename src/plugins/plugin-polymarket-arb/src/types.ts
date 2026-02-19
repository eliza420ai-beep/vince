/**
 * Polymarket Latency Arb Plugin – type definitions.
 * Arb trades, contract metadata, price state, and engine state.
 */

/** BTC price state from Binance spot WebSocket */
export interface BtcPriceState {
  bestBid: number;
  bestAsk: number;
  lastPrice: number;
  lastUpdateMs: number;
  /** Rolling buffer of (timestamp, price) for volatility estimation */
  priceHistory: Array<{ t: number; p: number }>;
}

/** Per-token orderbook state from Polymarket CLOB WebSocket */
export interface ContractBookState {
  tokenId: string;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  lastUpdateMs: number;
  /** Top-of-book size (USD) for liquidity check */
  bidSizeUsd?: number;
  askSizeUsd?: number;
}

/** Discovered BTC threshold contract metadata */
export interface ContractMeta {
  conditionId: string;
  question: string;
  /** YES outcome token ID */
  yesTokenId: string;
  /** NO outcome token ID */
  noTokenId: string;
  /** Strike price in USD (e.g. 110000) */
  strikeUsd: number;
  /** Expiry timestamp (ms) */
  expiryMs: number;
  /** Human-readable end date */
  endDateIso?: string;
}

/** Trade side for arb execution */
export type ArbSide = "BUY_YES" | "BUY_NO" | "SELL_YES" | "SELL_NO";

/** Trade status */
export type ArbTradeStatus =
  | "paper"
  | "pending"
  | "filled"
  | "closed"
  | "rejected";

/** Exit reason for closed position */
export type ExitReason =
  | "convergence"
  | "resolution"
  | "stop_loss"
  | "manual"
  | "timeout";

/** Single arb trade (matches DB row + runtime) */
export interface ArbTrade {
  id: string;
  createdAt: number;
  conditionId: string;
  tokenId: string;
  side: ArbSide;
  btcSpotPrice: number;
  contractPrice: number;
  impliedProb: number;
  edgePct: number;
  sizeUsd: number;
  fillPrice: number | null;
  pnlUsd: number | null;
  status: ArbTradeStatus;
  clobOrderId: string | null;
  exitPrice: number | null;
  exitReason: ExitReason | null;
  latencyMs: number | null;
}

/** Daily session aggregate */
export interface ArbSession {
  id: string;
  date: string;
  tradesCount: number;
  winCount: number;
  totalPnlUsd: number;
  avgEdgePct: number;
  avgLatencyMs: number;
  bankrollStart: number;
  bankrollEnd: number;
}

/** Engine runtime config (from env) */
export interface ArbEngineConfig {
  bankrollUsd: number;
  minEdgePct: number;
  kellyFraction: number;
  maxPositionUsd: number;
  maxDailyTrades: number;
  liveExecution: boolean;
  minLiquidityUsd: number;
  maxSpreadPct: number;
  convergenceTakeProfitPct: number;
  stopLossPct: number;
  staleDataThresholdMs: number;
  circuitBreakerConsecutiveLosses: number;
  circuitBreakerDailyDrawdownPct: number;
}

/** Signal emitted when edge exceeds threshold (before sizing) */
export interface ArbSignal {
  conditionId: string;
  tokenId: string;
  side: ArbSide;
  impliedProb: number;
  contractPrice: number;
  edgePct: number;
  btcSpotPrice: number;
  strikeUsd: number;
  expiryMs: number;
  question: string;
  timestamp: number;
}
