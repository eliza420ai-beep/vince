/**
 * VINCE Plugin Type Definitions
 *
 * Unified types for all data sources and services.
 */

import type { UUID } from "@elizaos/core";

// Re-export analysis types
export * from "./analysis";

// Re-export paper trading types
export * from "./paperTrading";

// Re-export external service interfaces (for type-safe runtime.getService() calls)
export * from "./external-services";

// ==========================================
// Common Types
// ==========================================

export interface ServiceStatus {
  available: boolean;
  lastUpdate: number;
  error?: string;
}

export interface DataSourceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  timestamp: number;
}

// ==========================================
// Trading Data Types (CoinGlass, CoinGecko)
// ==========================================

export interface MarketSignal {
  asset: string;
  direction: "long" | "short" | "neutral";
  strength: number; // 0-100
  confidence: number; // 0-100
  source: string;
  factors: string[];
  timestamp: number;
}

export interface FundingData {
  asset: string;
  rate: number;
  predictedRate?: number;
  timestamp: number;
}

export interface OpenInterestData {
  asset: string;
  value: number;
  change24h: number | null; // null when data unavailable, 0 is valid (no change)
  timestamp: number;
}

export interface LongShortRatio {
  asset: string;
  ratio: number;
  longPercent: number;
  shortPercent: number;
  timestamp: number;
}

export interface FearGreedData {
  value: number;
  classification:
    | "extreme_fear"
    | "fear"
    | "neutral"
    | "greed"
    | "extreme_greed";
  timestamp: number;
}

export interface ExchangeHealth {
  exchange: string;
  trustScore: number;
  volume24h: number;
  timestamp: number;
}

// ==========================================
// Memetics Types (DexScreener, Meteora)
// ==========================================

export type TractionVerdict = "APE" | "WATCH" | "AVOID";

export type McapTier = "micro" | "small" | "mid" | "large";

export interface MemeToken {
  address: string;
  symbol: string;
  name: string;
  chain: "solana" | "base" | "ethereum" | "hyperliquid";
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  volumeLiquidityRatio: number;
  verdict: TractionVerdict;
  isAiRelated: boolean;
  timestamp: number;
  // Market cap fields for AI meme filtering
  marketCap?: number;
  fdv?: number;
  mcapTier?: McapTier;
  hasViralPotential: boolean;
}

export interface MeteoraPool {
  address: string;
  tokenA: string;
  tokenB: string;
  binWidth: number;
  tvl: number;
  apy: number;
  volume24h: number;
  hasLp: boolean;
  timestamp: number;
}

// ==========================================
// NFT Types
// ==========================================

export interface NFTCollection {
  slug: string;
  name: string;
  floorPrice: number;
  floorPriceUsd?: number;
  floorPriceChange24h: number;
  totalVolume: number;
  volume24h?: number;
  salesPerDay?: number;
  numOwners: number;
  totalSupply: number;
  category?: "blue_chip" | "art" | "pfp" | "generative" | "photography";
  // Enhanced floor thickness (from actual listing gaps)
  floorThickness: "thin" | "medium" | "thick";
  floorThicknessScore: number; // 0-100 (lower = thinner = more opportunity)
  gaps: {
    to2nd: number; // ETH gap to 2nd listing
    to3rd: number; // ETH gap to 3rd listing
    to4th: number; // ETH gap to 4th listing
    to5th: number; // ETH gap to 5th listing
    to6th: number; // ETH gap to 6th listing
    to10th: number; // ETH gap to 10th listing
  };
  nftsNearFloor: number; // Count within 5% of floor
  timestamp: number;
}

export interface CuratedCollection {
  slug: string;
  name: string;
  category: "blue_chip" | "art" | "pfp" | "generative" | "photography";
  priority: number;
}

// ==========================================
// Lifestyle Types
// ==========================================

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface LifestyleSuggestion {
  category: "health" | "dining" | "hotel" | "activity";
  suggestion: string;
  reason: string;
  priority: number;
  daySpecific: boolean;
}

export interface DailyBriefing {
  day: DayOfWeek;
  date: string;
  suggestions: LifestyleSuggestion[];
  specialNotes: string[];
}

// ==========================================
// Options Types
// ==========================================

export interface OptionsContext {
  asset: string;
  currentPrice: number;
  funding: FundingData;
  longShortRatio: LongShortRatio;
  ivContext: "low" | "moderate" | "elevated" | "high";
  suggestedStrike: number;
  strikeType: "covered_call" | "secured_put";
  otmPercent: number;
  rationale: string;
}

// ==========================================
// Airdrops Types
// ==========================================

export interface AirdropProtocol {
  name: string;
  category: "mm" | "dn" | "defi" | "bridge" | "gaming";
  status: "active" | "confirmed" | "speculated" | "ended";
  priority: number;
  notes: string;
}

// ==========================================
// Binance FREE API Types
// ==========================================

/**
 * Top Trader Position data from Binance (by POSITION SIZE)
 * What the top 20% of traders are actually holding
 */
export interface BinanceTopTraderPositions {
  symbol: string;
  longPosition: number; // % of positions that are long
  shortPosition: number; // % of positions that are short
  longShortRatio: number; // ratio (>1 = more longs)
  timestamp: number;
}

/**
 * Taker Buy/Sell Volume data
 * Shows who's aggressive (market orders) - the real order flow
 */
export interface BinanceTakerVolume {
  symbol: string;
  buyVol: number; // Buy volume ratio
  sellVol: number; // Sell volume ratio
  buySellRatio: number; // > 1 = more buying pressure
  timestamp: number;
}

/**
 * Open Interest Trend from Binance history
 * Use for OI divergence detection
 */
export interface BinanceOITrend {
  symbol: string;
  current: number; // Current OI value in USD
  previous: number; // Oldest OI value in window
  change: number; // Absolute change
  changePercent: number; // % change
  trend: "rising" | "falling" | "stable";
}

/**
 * Long/Short Ratio from Binance
 * Tracks account positioning
 */
export interface BinanceLongShortRatio {
  symbol: string;
  longShortRatio: number; // > 1 means more longs
  longAccount: number; // % of accounts long
  shortAccount: number; // % of accounts short
  timestamp: number;
}

/**
 * Funding Rate Trend data
 * Use for extreme funding detection (mean reversion signals)
 */
export interface BinanceFundingTrend {
  symbol: string;
  current: number; // Current funding rate
  average: number; // Average over history
  max: number; // Max in history
  min: number; // Min in history
  isExtreme: boolean; // > 0.1% or < -0.1%
  extremeDirection: "long_paying" | "short_paying" | "neutral";
}

/**
 * Cross-Exchange Funding Comparison
 * Find arb opportunities
 */
export interface CrossExchangeFunding {
  symbol: string;
  binance: number | null;
  bybit: number | null;
  hyperliquid: number | null;
  spread: number; // Diff between highest and lowest
  bestLong: string; // Exchange to go long (lowest funding)
  bestShort: string; // Exchange to go short (highest funding)
  annualizedSpread: number; // % annualized
  timestamp: number;
}

/**
 * Fear & Greed Index from Alternative.me (FREE)
 */
export interface AlternativeFearGreed {
  value: number; // 0-100
  classification: string; // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
  timestamp: number;
}

/**
 * Liquidation Pressure analysis from WebSocket stream
 */
export interface LiquidationPressure {
  direction: "long_liquidations" | "short_liquidations" | "neutral";
  intensity: number; // 0-100
  longLiqsCount: number;
  shortLiqsCount: number;
  longLiqsValue: number; // USD
  shortLiqsValue: number; // USD
  netPressure: number; // positive = more long liqs
  timestamp: number;
}

/**
 * Liquidation Cascade detection
 */
export interface LiquidationCascade {
  detected: boolean;
  direction: "long" | "short" | null;
  intensity: number; // 0-100
  totalValue: number; // USD
  count: number;
  startTime: number;
  lastTime: number;
}

/**
 * Aggregated Binance Intelligence
 */
export interface BinanceIntelligence {
  topTraderPositions: BinanceTopTraderPositions | null;
  takerVolume: BinanceTakerVolume | null;
  oiTrend: BinanceOITrend | null;
  fundingTrend: BinanceFundingTrend | null;
  longShortRatio: BinanceLongShortRatio | null;
  crossExchangeFunding: CrossExchangeFunding | null;
  fearGreed: AlternativeFearGreed | null;
  timestamp: number;
}

// ==========================================
// Unified Context
// ==========================================

export interface VinceContext {
  timestamp: number;
  dayOfWeek: DayOfWeek;

  // Trading
  marketSignals: MarketSignal[];
  funding: FundingData[];
  longShortRatios: LongShortRatio[];
  fearGreed?: FearGreedData;

  // Memetics
  hotMemes: MemeToken[];
  meteoraPools: MeteoraPool[];

  // NFT
  nftFloors: NFTCollection[];

  // Lifestyle
  dailySuggestions: LifestyleSuggestion[];

  // Options
  optionsContext: OptionsContext[];

  // Service status
  serviceStatus: Record<string, ServiceStatus>;
}
