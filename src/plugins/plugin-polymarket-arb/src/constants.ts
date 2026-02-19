/**
 * Polymarket Latency Arb Plugin – constants.
 * WebSocket URLs, default thresholds, and env key names.
 */

/** Binance spot WebSocket – BTCUSDT best bid/ask (no API key) */
export const BINANCE_SPOT_WS_URL =
  "wss://stream.binance.com:9443/ws/btcusdt@bookTicker";

/** Polymarket CLOB WebSocket – market channel (no auth) */
export const POLYMARKET_CLOB_WS_URL =
  "wss://ws-subscriptions-clob.polymarket.com/ws/market";

/** Gamma API for contract discovery */
export const DEFAULT_GAMMA_API_URL = "https://gamma-api.polymarket.com";

/** Reconnect delay (ms) after WebSocket close/error */
export const WS_RECONNECT_DELAY_MS = 5000;

/** Polymarket WS ping interval (server expects ~10s) */
export const POLYMARKET_PING_INTERVAL_MS = 10_000;

/** Rolling window for volatility (1 minute of ticks) */
export const VOLATILITY_WINDOW_MS = 60 * 1000;

/** Contract discovery refresh interval */
export const CONTRACT_DISCOVERY_INTERVAL_MS = 5 * 60 * 1000;

/** Default risk/engine parameters (overridden by env) */
export const DEFAULT_ARB_CONFIG = {
  bankrollUsd: 1300,
  minEdgePct: 8,
  kellyFraction: 0.25,
  maxPositionUsd: 200,
  maxDailyTrades: 150,
  liveExecution: false,
  minLiquidityUsd: 1000,
  maxSpreadPct: 5,
  convergenceTakeProfitPct: 2,
  stopLossPct: 15,
  staleDataThresholdMs: 5000,
  circuitBreakerConsecutiveLosses: 5,
  circuitBreakerDailyDrawdownPct: 10,
} as const;

/** Env var names */
export const ENV_KEYS = {
  BANKROLL: "POLYMARKET_ARB_BANKROLL_USD",
  MIN_EDGE_PCT: "POLYMARKET_ARB_MIN_EDGE_PCT",
  KELLY_FRACTION: "POLYMARKET_ARB_KELLY_FRACTION",
  MAX_POSITION_USD: "POLYMARKET_ARB_MAX_POSITION_USD",
  MAX_DAILY_TRADES: "POLYMARKET_ARB_MAX_DAILY_TRADES",
  LIVE: "POLYMARKET_ARB_LIVE",
  MIN_LIQUIDITY_USD: "POLYMARKET_ARB_MIN_LIQUIDITY_USD",
  MAX_SPREAD_PCT: "POLYMARKET_ARB_MAX_SPREAD_PCT",
  GAMMA_API_URL: "POLYMARKET_GAMMA_API_URL",
} as const;

/** Tag slugs for Gamma API contract discovery (BTC + time-bound) */
export const ARB_DISCOVERY_TAG_SLUGS = [
  "bitcoin",
  "daily",
  "weekly",
  "monthly",
] as const;

/** Regex to detect BTC price threshold questions */
export const BTC_THRESHOLD_QUESTION_PATTERNS = [
  /will\s+btc\s+(?:be\s+)?(?:above|reach|hit|exceed)\s+\$?([\d,]+(?:k|K)?)/i,
  /bitcoin\s+(?:above|reach|hit|exceed)\s+\$?([\d,]+(?:k|K)?)/i,
  /btc\s+price\s+(?:above|reach|over)\s+\$?([\d,]+(?:k|K)?)/i,
  /btc\s+(?:above|over)\s+\$?([\d,]+(?:k|K)?)/i,
  /(?:above|over)\s+\$?([\d,]+(?:k|K)?)\s+(?:by|before|at)/i,
] as const;
