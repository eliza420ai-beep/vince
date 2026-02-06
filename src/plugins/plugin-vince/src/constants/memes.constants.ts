/**
 * MEMES Action Constants - MOLT-tier AI Meme Analysis
 *
 * Thresholds and helper functions for AI meme token analysis.
 * Based on proven patterns from plugin-dexscreener.
 */

// ============================================
// Lifecycle Stage Types
// ============================================

export type LifecycleStage = "pvp" | "retracement" | "established" | "unknown";
export type TractionLevel =
  | "early"
  | "growing"
  | "hot"
  | "viral"
  | "established";
export type RiskLevel = "degen" | "moderate" | "safe";
export type MarketMood = "pumping" | "choppy" | "dumping" | "quiet";
export type EntryAction =
  | "gmgn_tight_sl"
  | "gmgn_normal"
  | "wait_for_dip"
  | "lp_viable"
  | "avoid";

// ============================================
// Cache TTLs (milliseconds)
// ============================================

export const CACHE_TTLS = {
  search: 10 * 1000, // 10s - search results
  trending: 15 * 1000, // 15s - trending changes fast
  tokenPairs: 15 * 1000, // 15s - pair data
  newPairs: 30 * 1000, // 30s - new launches
  profiles: 60 * 1000, // 1m - token profiles
  trenchesPulse: 30 * 1000, // 30s - main pulse
  deepDive: 60 * 1000, // 1m - deep dive cache
} as const;

// ============================================
// Service Configuration
// ============================================

export const SERVICE_CONFIG = {
  // Circuit breaker settings
  CIRCUIT_THRESHOLD: 5, // Open circuit after 5 consecutive errors
  CIRCUIT_RESET_MS: 60_000, // Try again after 1 minute

  // Retry settings
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10_000,

  // Request settings
  DEFAULT_TIMEOUT: 15_000,
  DEFAULT_RATE_LIMIT_DELAY: 100,

  // Cache
  DEFAULT_CACHE_TTL: 30_000,
  MAX_CACHE_SIZE: 100,
} as const;

// ============================================
// Traction Thresholds (Memecoin Analysis)
// ============================================

export const TRACTION_THRESHOLDS = {
  // Volume thresholds (24h USD)
  VOLUME_EARLY_SIGNAL: 100_000, // $100K - early signal
  VOLUME_GAINING_TRACTION: 500_000, // $500K - gaining traction
  VOLUME_HOT: 1_000_000, // $1M - hot
  VOLUME_EXPLOSIVE: 10_000_000, // $10M+ - explosive (viral)

  // Liquidity thresholds (USD)
  LIQ_MINIMUM: 10_000, // $10K - minimum to consider
  LIQ_DECENT: 50_000, // $50K - decent liquidity
  LIQ_GOOD: 200_000, // $200K - good
  LIQ_STRONG: 500_000, // $500K+ - strong (safe to trade size)

  // Volume/Liquidity ratio (higher = more action)
  VOL_LIQ_RATIO_HOT: 5, // 5x = hot
  VOL_LIQ_RATIO_EXPLOSIVE: 20, // 20x = explosive action (PVP territory)

  // Market cap tiers (USD)
  MCAP_MICRO: 100_000, // <$100K - ultra early
  MCAP_SMALL: 1_000_000, // $100K-$1M - small cap
  MCAP_MID: 10_000_000, // $1M-$10M - mid cap (sweet spot)
  MCAP_LARGE: 100_000_000, // $10M-$100M - large cap memecoin

  // Holder thresholds
  HOLDERS_EARLY: 100, // <100 - very early
  HOLDERS_GROWING: 1_000, // 1K - growing
  HOLDERS_ESTABLISHED: 10_000, // 10K - established
  HOLDERS_VIRAL: 40_000, // 40K+ - viral

  // Transaction thresholds (24h)
  TXNS_ACTIVE: 1_000, // 1K txns - active
  TXNS_HOT: 10_000, // 10K txns - hot
  TXNS_VIRAL: 100_000, // 100K+ txns - viral

  // Price change thresholds (%)
  CHANGE_PUMP: 50, // +50% - pumping
  CHANGE_MOON: 200, // +200% - mooning
  CHANGE_VERTICAL: 500, // +500%+ - vertical

  // PVP/Lifecycle thresholds
  PVP_MAX_HOURS: 48, // Token < 48h old = PVP territory
  PVP_VOL_LIQ_THRESHOLD: 15, // Vol/liq > 15x = active PVP
  RETRACEMENT_THRESHOLD: -40, // Down 40%+ from ATH = retracement zone
  DEEP_RETRACEMENT: -60, // Down 60%+ = smart money entry
} as const;

// ============================================
// AI Meme Criteria (MOLT-tier plays)
// ============================================

export const AI_MEME_CRITERIA = {
  MIN_MCAP: 1_000_000, // $1M minimum market cap
  MAX_MCAP: 20_000_000, // $20M max (still has room to grow)
  SWEET_SPOT_MIN: 1_500_000, // $1.5M-$5M is ideal entry zone
  SWEET_SPOT_MAX: 5_000_000,
  MIN_LIQUIDITY: 50_000, // $50K min liquidity for safe exits
  MIN_VOL_LIQ_RATIO: 3, // 3x volume/liquidity = traction signal
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get traction level from metrics
 */
export function getTractionLevel(
  volume24h: number,
  holders?: number,
  txns24h?: number,
): TractionLevel {
  if (
    volume24h >= TRACTION_THRESHOLDS.VOLUME_EXPLOSIVE ||
    (holders && holders >= TRACTION_THRESHOLDS.HOLDERS_VIRAL)
  ) {
    return "viral";
  }

  if (
    volume24h >= TRACTION_THRESHOLDS.VOLUME_HOT ||
    (txns24h && txns24h >= TRACTION_THRESHOLDS.TXNS_HOT)
  ) {
    return "hot";
  }

  if (
    volume24h >= TRACTION_THRESHOLDS.VOLUME_GAINING_TRACTION ||
    (holders && holders >= TRACTION_THRESHOLDS.HOLDERS_GROWING)
  ) {
    return "growing";
  }

  if (volume24h >= TRACTION_THRESHOLDS.VOLUME_EARLY_SIGNAL) {
    return "early";
  }

  return "early";
}

/**
 * Get risk level from liquidity
 */
export function getRiskLevel(liquidityUsd: number): RiskLevel {
  if (liquidityUsd >= TRACTION_THRESHOLDS.LIQ_STRONG) return "safe";
  if (liquidityUsd >= TRACTION_THRESHOLDS.LIQ_DECENT) return "moderate";
  return "degen";
}

/**
 * Get momentum signal from price change
 */
export function getMomentumSignal(change24h: number): string {
  if (change24h >= TRACTION_THRESHOLDS.CHANGE_VERTICAL) return "🚀 VERTICAL";
  if (change24h >= TRACTION_THRESHOLDS.CHANGE_MOON) return "🌙 MOONING";
  if (change24h >= TRACTION_THRESHOLDS.CHANGE_PUMP) return "📈 PUMPING";
  if (change24h >= 10) return "↗️ Up";
  if (change24h <= -30) return "💀 DUMPING";
  if (change24h <= -10) return "↘️ Down";
  return "➡️ Flat";
}

/**
 * Format volume/USD value for display
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000)
    return `$${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}K`;
  return `$${volume.toFixed(0)}`;
}

/**
 * Get market cap tier string
 */
export function getMcapTierString(mcap: number): string {
  if (mcap >= TRACTION_THRESHOLDS.MCAP_LARGE) return "Large Cap";
  if (mcap >= TRACTION_THRESHOLDS.MCAP_MID) return "Mid Cap";
  if (mcap >= TRACTION_THRESHOLDS.MCAP_SMALL) return "Small Cap";
  return "Micro Cap";
}

/**
 * Determine market mood from aggregate metrics
 */
export function determineMarketMood(
  avgChange24h: number,
  hotCount: number,
): MarketMood {
  if (avgChange24h > 30 && hotCount >= 5) return "pumping";
  if (avgChange24h < -20) return "dumping";
  if (hotCount >= 3) return "choppy";
  return "quiet";
}

// ============================================
// URL Builders
// ============================================

/**
 * Build GMGN buy link for a Solana token
 * GMGN supports stop-loss and take-profit orders
 */
export function buildGmgnUrl(tokenAddress: string): string {
  return `https://gmgn.ai/sol/token/${tokenAddress}`;
}

/**
 * Build DexScreener link for a token
 */
export function buildDexScreenerUrl(
  tokenAddress: string,
  chain: string = "solana",
): string {
  return `https://dexscreener.com/${chain}/${tokenAddress}`;
}

/**
 * Build Birdeye link for a token
 */
export function buildBirdeyeUrl(tokenAddress: string): string {
  return `https://birdeye.so/token/${tokenAddress}?chain=solana`;
}

/**
 * Build Hyperliquid spot link
 */
export function buildHyperliquidUrl(tokenSymbol: string): string {
  return `https://app.hyperliquid.xyz/trade/${tokenSymbol}`;
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if a value is a valid Solana token address (base58 format)
 */
export function isSolanaAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

/**
 * Check if a value is a valid EVM token address (0x format)
 */
export function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Detect chain from address format
 */
export function detectChainFromAddress(
  address: string,
): "solana" | "evm" | "unknown" {
  if (isSolanaAddress(address)) return "solana";
  if (isEvmAddress(address)) return "evm";
  return "unknown";
}
