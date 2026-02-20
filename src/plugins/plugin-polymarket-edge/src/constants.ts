/**
 * Polymarket Edge Plugin – constants and env keys.
 */

/** Binance spot WebSocket – BTCUSDT best bid/ask */
export const BINANCE_SPOT_WS_URL =
  "wss://stream.binance.com:9443/ws/btcusdt@bookTicker";

/** Polymarket CLOB WebSocket – market channel */
export const POLYMARKET_CLOB_WS_URL =
  "wss://ws-subscriptions-clob.polymarket.com/ws/market";

/** Gamma API for contract discovery */
export const DEFAULT_GAMMA_API_URL = "https://gamma-api.polymarket.com";

export const WS_RECONNECT_DELAY_MS = 5000;
export const POLYMARKET_PING_INTERVAL_MS = 10_000;
export const VOLATILITY_WINDOW_MS = 60 * 1000;

/** Contract discovery refresh interval */
export const CONTRACT_DISCOVERY_INTERVAL_MS = 5 * 60 * 1000;

/** Service type names (used by EdgeEngineService to resolve dependencies) */
export const EDGE_SERVICE_TYPES = {
  BINANCE_WS: "POLYMARKET_EDGE_BINANCE_SPOT_WS",
  CLOB_WS: "POLYMARKET_EDGE_CLOB_WS",
  EDGE_ENGINE: "POLYMARKET_EDGE_ENGINE_SERVICE",
} as const;

/** Comma-separated list of strategies to enable (default: all) */
export const ENV_EDGE_STRATEGIES_ENABLED = "EDGE_STRATEGIES_ENABLED";

/** Discovery */
export const ENV_DISCOVERY_TAGS = "EDGE_DISCOVERY_TAGS";
export const ENV_DISCOVERY_ANY_BINARY = "EDGE_DISCOVERY_ANY_BINARY";
export const DEFAULT_DISCOVERY_TAGS =
  "bitcoin,ethereum,solana,daily,weekly,monthly";

/** Overreaction strategy */
export const ENV_OVERREACTION_VELOCITY_PCT = "EDGE_OVERREACTION_VELOCITY_PCT";
export const ENV_OVERREACTION_WINDOW_MS = "EDGE_OVERREACTION_WINDOW_MS";
export const ENV_OVERREACTION_MAX_UNDERDOG_PRICE =
  "EDGE_OVERREACTION_MAX_UNDERDOG_PRICE";
export const ENV_OVERREACTION_COOLDOWN_MS = "EDGE_OVERREACTION_COOLDOWN_MS";
export const DEFAULT_OVERREACTION_VELOCITY_PCT = 5;
export const DEFAULT_OVERREACTION_WINDOW_MS = 300_000; // 5 min
export const DEFAULT_OVERREACTION_MAX_UNDERDOG_PRICE = 0.15;
export const DEFAULT_OVERREACTION_COOLDOWN_MS = 900_000; // 15 min

/** Model fair value strategy */
export const ENV_MODEL_MIN_EDGE_PCT = "EDGE_MODEL_MIN_EDGE_PCT";
export const ENV_MODEL_TICK_INTERVAL_MS = "EDGE_MODEL_TICK_INTERVAL_MS";
export const ENV_MODEL_MIN_FORECAST_PROB = "EDGE_MODEL_MIN_FORECAST_PROB";
export const ENV_MODEL_MAX_FORECAST_PROB = "EDGE_MODEL_MAX_FORECAST_PROB";
export const ENV_MODEL_COOLDOWN_MS = "EDGE_MODEL_COOLDOWN_MS";
export const DEFAULT_MODEL_MIN_EDGE_PCT = 15;
export const DEFAULT_MODEL_TICK_INTERVAL_MS = 5000;
/** Only signal when model forecast is in this range (avoids "100% / 0%" flood from deep ITM/OTM) */
export const DEFAULT_MODEL_MIN_FORECAST_PROB = 0.05;
export const DEFAULT_MODEL_MAX_FORECAST_PROB = 0.95;
export const DEFAULT_MODEL_COOLDOWN_MS = 600_000; // 10 min per market

/** Synth forecast strategy */
export const ENV_SYNTH_POLL_INTERVAL_MS = "EDGE_SYNTH_POLL_INTERVAL_MS";
export const DEFAULT_SYNTH_POLL_INTERVAL_MS = 900_000; // 15 min
export const DEFAULT_SYNTH_EDGE_BPS = 200;

export const ENV_GAMMA_API_URL = "POLYMARKET_GAMMA_API_URL";

/** Tag slugs for Gamma API (when not overridden by EDGE_DISCOVERY_TAGS) */
export const DEFAULT_DISCOVERY_TAG_SLUGS = [
  "bitcoin",
  "ethereum",
  "solana",
  "crypto",
  "daily",
  "weekly",
  "monthly",
] as const;

/** Regex to detect BTC price threshold questions (discovery) */
export const BTC_THRESHOLD_QUESTION_PATTERNS = [
  /will\s+btc\s+(?:be\s+)?(?:above|reach|hit|exceed)\s+\$?([\d,]+(?:k|K)?)/i,
  /bitcoin\s+(?:above|reach|hit|exceed)\s+\$?([\d,]+(?:k|K)?)/i,
  /btc\s+price\s+(?:above|reach|over)\s+\$?([\d,]+(?:k|K)?)/i,
  /btc\s+(?:above|over)\s+\$?([\d,]+(?:k|K)?)/i,
  /(?:above|over)\s+\$?([\d,]+(?:k|K)?)\s+(?:by|before|at)/i,
] as const;
