/**
 * VINCE Target Assets Configuration
 *
 * Core focus: BTC, SOL, HYPE, ETH + HIP-3 tokens
 * Self-contained HIP-3 integration with Hyperliquid API
 */

// ============================================================================
// TIER 1 - CORE MAJORS (Always prioritize)
// ============================================================================

export const CORE_ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;
export type CoreAsset = (typeof CORE_ASSETS)[number];

// ============================================================================
// TIER 2 - HIP-3 ASSETS (Hyperliquid perps on multiple DEXes)
// ============================================================================

/** HIP-3 Commodities - Available on flx and km dexes */
export const HIP3_COMMODITIES = [
  "GOLD",
  "SILVER",
  "COPPER",
  "NATGAS",
  "OIL",
  "USOIL",
] as const;
export type HIP3Commodity = (typeof HIP3_COMMODITIES)[number];

/** HIP-3 Equity Indices - Available across xyz, vntl, km dexes */
export const HIP3_INDICES = [
  "XYZ100",
  "US500",
  "SMALL2000",
  "MAG7",
  "SEMIS",
  "INFOTECH",
  "ROBOT",
] as const;
export type HIP3Index = (typeof HIP3_INDICES)[number];

/** HIP-3 Single Stocks - Available on xyz dex */
export const HIP3_STOCKS = [
  "NVDA",
  "TSLA",
  "AAPL",
  "AMZN",
  "GOOGL",
  "META",
  "MSFT",
  "PLTR",
  "COIN",
  "HOOD",
  "NFLX",
  "MSTR",
  "AMD",
  "INTC",
  "ORCL",
  "MU",
  "SNDK",
  "CRCL",
] as const;
export type HIP3Stock = (typeof HIP3_STOCKS)[number];

/** HIP-3 AI/Tech (pre-IPO style) - Available on vntl dex */
export const HIP3_AI_TECH = ["OPENAI", "ANTHROPIC", "SPACEX"] as const;
export type HIP3AITech = (typeof HIP3_AI_TECH)[number];

/** All HIP-3 */
export const HIP3_ASSETS = [
  ...HIP3_COMMODITIES,
  ...HIP3_INDICES,
  ...HIP3_STOCKS,
  ...HIP3_AI_TECH,
] as const;
export type HIP3Asset = (typeof HIP3_ASSETS)[number];

// ============================================================================
// HIP-3 DEX MAPPING (Required for Hyperliquid API calls)
// ============================================================================

/**
 * HIP-3 DEX identifiers on Hyperliquid
 * - xyz: Main HIP-3 dex for stocks (USDC settled)
 * - flx: Commodities (USDH settled)
 * - vntl: AI/tech plays and some indices
 * - km: Traditional indices and USOIL
 */
export type HIP3Dex = "xyz" | "flx" | "vntl" | "km";

/**
 * Map each HIP-3 asset to its DEX
 * Used for API symbol normalization and routing
 */
export const HIP3_DEX_MAPPING: Record<string, HIP3Dex> = {
  // xyz dex (USDC settled) - Most stocks and XYZ100 index
  GOOGL: "xyz",
  TSLA: "xyz",
  AMZN: "xyz",
  NVDA: "xyz",
  MSFT: "xyz",
  META: "xyz",
  PLTR: "xyz",
  AAPL: "xyz",
  NFLX: "xyz",
  COIN: "xyz",
  HOOD: "xyz",
  CRCL: "xyz",
  MSTR: "xyz",
  INTC: "xyz",
  ORCL: "xyz",
  MU: "xyz",
  XYZ100: "xyz",

  // flx dex (USDH settled) - Commodities
  GOLD: "flx",
  SILVER: "flx",
  OIL: "flx",
  COPPER: "flx",
  NATGAS: "flx",

  // vntl dex - AI/tech plays and some indices
  SPACEX: "vntl",
  OPENAI: "vntl",
  ANTHROPIC: "vntl",
  MAG7: "vntl",
  SEMIS: "vntl",
  ROBOT: "vntl",
  INFOTECH: "vntl",
  SNDK: "vntl",
  AMD: "vntl",

  // km dex - Traditional indices and USOIL
  US500: "km",
  SMALL2000: "km",
  USOIL: "km",
};

/**
 * Normalize API symbol by stripping DEX prefix
 * e.g., "xyz:NVDA" -> "NVDA", "vntl:OPENAI" -> "OPENAI"
 */
export function normalizeHIP3Symbol(apiSymbol: string): string {
  if (!apiSymbol) return "";

  // Check for dex prefix pattern (xyz:, flx:, vntl:, km:)
  const colonIndex = apiSymbol.indexOf(":");
  if (colonIndex !== -1) {
    return apiSymbol.substring(colonIndex + 1);
  }

  return apiSymbol;
}

/**
 * Convert normalized symbol to API format with DEX prefix
 * e.g., "NVDA" -> "xyz:NVDA", "OPENAI" -> "vntl:OPENAI"
 */
export function toHIP3ApiSymbol(symbol: string): string {
  if (!symbol) return "";

  const upper = symbol.toUpperCase();
  const dex = HIP3_DEX_MAPPING[upper];

  if (dex) {
    return `${dex}:${upper}`;
  }

  // Not a HIP-3 asset, return as-is (for crypto assets on main dex)
  return upper;
}

/**
 * Check if an API symbol has a HIP-3 DEX prefix
 */
export function isHIP3ApiSymbol(apiSymbol: string): boolean {
  if (!apiSymbol) return false;

  const prefixes = ["xyz:", "flx:", "vntl:", "km:"];
  return prefixes.some((prefix) => apiSymbol.toLowerCase().startsWith(prefix));
}

/**
 * Get the DEX for a HIP-3 asset
 */
export function getHIP3Dex(symbol: string): HIP3Dex | null {
  return HIP3_DEX_MAPPING[symbol.toUpperCase()] ?? null;
}

/**
 * Get the category for a HIP-3 asset
 */
export function getHIP3Category(
  symbol: string,
): "commodity" | "index" | "stock" | "ai_tech" | null {
  const upper = symbol.toUpperCase();

  if ((HIP3_COMMODITIES as readonly string[]).includes(upper))
    return "commodity";
  if ((HIP3_INDICES as readonly string[]).includes(upper)) return "index";
  if ((HIP3_STOCKS as readonly string[]).includes(upper)) return "stock";
  if ((HIP3_AI_TECH as readonly string[]).includes(upper)) return "ai_tech";

  return null;
}

// ============================================================================
// TIER 3 - SECTOR LEADERS
// ============================================================================

/** Privacy Coins */
export const PRIVACY_ASSETS = ["XMR", "ZEC"] as const;

/** RWA/Institutional */
export const RWA_ASSETS = ["ONDO", "ENA"] as const;

/** DeFi Kings */
export const DEFI_ASSETS = [
  "AAVE",
  "UNI",
  "MORPHO",
  "PENDLE",
  "SYRUP",
  "LINK",
] as const;

/** AI Infrastructure */
export const AI_INFRA_ASSETS = ["FIL", "TAO"] as const;

/** AI Memes */
export const AI_MEME_ASSETS = ["AIXBT", "ZEREBRO", "FARTCOIN"] as const;

/** Solana Ecosystem */
export const SOLANA_ASSETS = ["JUP"] as const;

/** Base Ecosystem */
export const BASE_ASSETS = ["AVNT", "ZORA"] as const;

/** L1 Competitors */
export const L1_ASSETS = ["SUI"] as const;

// ============================================================================
// COMBINED LISTS
// ============================================================================

/** Priority assets for all services */
export const PRIORITY_ASSETS = [
  ...CORE_ASSETS,
  ...PRIVACY_ASSETS,
  ...RWA_ASSETS,
  ...DEFI_ASSETS,
  ...AI_INFRA_ASSETS,
  ...AI_MEME_ASSETS,
  ...SOLANA_ASSETS,
  ...BASE_ASSETS,
  ...L1_ASSETS,
] as const;
export type PriorityAsset = (typeof PRIORITY_ASSETS)[number];

/** All tracked assets */
export const ALL_TRACKED_ASSETS = [...PRIORITY_ASSETS, ...HIP3_ASSETS] as const;
export type TrackedAsset = (typeof ALL_TRACKED_ASSETS)[number];

// ============================================================================
// ASSET MAPPINGS
// ============================================================================

/** CoinGecko ID mapping */
export const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  HYPE: "hyperliquid",
  XMR: "monero",
  ZEC: "zcash",
  ONDO: "ondo-finance",
  ENA: "ethena",
  AAVE: "aave",
  UNI: "uniswap",
  MORPHO: "morpho",
  PENDLE: "pendle",
  SYRUP: "maple",
  LINK: "chainlink",
  FIL: "filecoin",
  TAO: "bittensor",
  AIXBT: "aixbt",
  ZEREBRO: "zerebro",
  FARTCOIN: "fartcoin",
  JUP: "jupiter-exchange-solana",
  AVNT: "avant",
  ZORA: "zora",
  SUI: "sui",
};

/** Santiment slug mapping */
export const SANTIMENT_SLUGS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  HYPE: "hyperliquid",
  XMR: "monero",
  ZEC: "zcash",
  AAVE: "aave",
  UNI: "uniswap",
  LINK: "chainlink",
  FIL: "filecoin",
  SUI: "sui",
};

// ============================================================================
// DERIBIT OPTIONS ASSETS (BTC, ETH, SOL only)
// ============================================================================

export const DERIBIT_ASSETS = ["BTC", "ETH", "SOL"] as const;
export type DeribitAsset = (typeof DERIBIT_ASSETS)[number];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Check if asset is a core asset */
export function isCoreAsset(asset: string): boolean {
  return (CORE_ASSETS as readonly string[]).includes(asset.toUpperCase());
}

/** Check if asset is a priority asset */
export function isPriorityAsset(asset: string): boolean {
  return (PRIORITY_ASSETS as readonly string[]).includes(asset.toUpperCase());
}

/** Check if asset is HIP-3 */
export function isHIP3Asset(asset: string): boolean {
  return (HIP3_ASSETS as readonly string[]).includes(asset.toUpperCase());
}

/** Check if asset has Deribit options */
export function hasDeribitOptions(asset: string): boolean {
  return (DERIBIT_ASSETS as readonly string[]).includes(asset.toUpperCase());
}

/** Get CoinGecko ID for asset */
export function getCoinGeckoId(asset: string): string | null {
  return COINGECKO_IDS[asset.toUpperCase()] || null;
}

/** Get Santiment slug for asset */
export function getSantimentSlug(asset: string): string | null {
  return SANTIMENT_SLUGS[asset.toUpperCase()] || null;
}

// ============================================================================
// WTT UNIVERSE (HIP-3 + core perps — used by daily task prompt constraints)
// ============================================================================

/** All assets expressible onchain via Hyperliquid perps (core + HIP-3). */
export const WTT_UNIVERSE_TICKERS = [...CORE_ASSETS, ...HIP3_ASSETS] as const;
export type WttUniverseAsset = (typeof WTT_UNIVERSE_TICKERS)[number];

/** Comma-separated label for prompt injection (e.g. "BTC, ETH, SOL, HYPE, GOLD, ..."). */
export const WTT_UNIVERSE_LABEL = (
  WTT_UNIVERSE_TICKERS as readonly string[]
).join(", ");

/** WTT ticker aliases -> paper bot asset (e.g. GOOG -> GOOGL) */
const WTT_TICKER_ALIASES: Record<string, string> = {
  GOOG: "GOOGL",
  GOOGLE: "GOOGL",
};

/**
 * Map a WTT pick ticker to a paper-bot tradeable asset (core perp or HIP-3).
 * Returns the asset symbol if it is in ALL_TRACKED_ASSETS, or null if not tradeable as perp/HIP-3.
 */
export function normalizeWttTicker(ticker: string): string | null {
  const upper = ticker.trim().toUpperCase();
  if (!upper) return null;
  const resolved = WTT_TICKER_ALIASES[upper] ?? upper;
  return (ALL_TRACKED_ASSETS as readonly string[]).includes(resolved)
    ? resolved
    : null;
}
