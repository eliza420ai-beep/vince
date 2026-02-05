/**
 * External Service Interfaces
 *
 * Local interface definitions for external services accessed via runtime.getService().
 * These replace direct imports from other plugins to make plugin-vince standalone.
 *
 * The interfaces only include methods actually used by plugin-vince.
 * External services are OPTIONAL - plugin-vince works without them (with reduced functionality).
 */

// ==========================================
// Deribit Service Interface (plugin-deribit)
// Used for: DVOL (volatility index), options put/call ratio
// Service key: "DERIBIT_SERVICE"
// ==========================================

export interface IDeribitVolatilityIndex {
  current: number;
  change24h?: number;
  high24h?: number;
  low24h?: number;
}

export interface IDeribitOptionsSummary {
  putCallRatio?: number;
  totalOpenInterest?: number;
  callOpenInterest?: number;
  putOpenInterest?: number;
}

export interface IDeribitComprehensiveData {
  optionsSummary?: IDeribitOptionsSummary;
  // Add other fields as needed
}

/**
 * Interface for the external Deribit service from plugin-deribit.
 * Accessed via: runtime.getService("DERIBIT_SERVICE")
 */
export interface IDeribitService {
  /**
   * Get DVOL (Deribit Volatility Index) for BTC or ETH
   * Returns null for unsupported assets
   */
  getVolatilityIndex(asset: "BTC" | "ETH"): Promise<IDeribitVolatilityIndex | null>;

  /**
   * Get comprehensive options data including put/call ratio
   */
  getComprehensiveData(currency: "BTC" | "ETH" | "SOL"): Promise<IDeribitComprehensiveData | null>;
}

// ==========================================
// Hyperliquid Service Interface (plugin-hyperliquid)
// Used for: Options pulse, cross-venue funding, crowding levels
// Service key: "HYPERLIQUID_SERVICE"
// ==========================================

export interface IHyperliquidAssetPulse {
  funding8h?: number;
  fundingAnnualized?: number;
  crowdingLevel?: "extreme_long" | "long" | "neutral" | "short" | "extreme_short";
  squeezeRisk?: "high" | "medium" | "low";
  /** HL venue open interest (contracts). Same metaAndAssetCtxs call; no extra API cost. */
  openInterest?: number;
  /** HL venue 24h notional volume (USD). Same metaAndAssetCtxs call; no extra API cost. */
  volume24h?: number;
}

export interface IHyperliquidOptionsPulse {
  overallBias?: "bullish" | "bearish" | "neutral";
  assets: {
    btc?: IHyperliquidAssetPulse;
    eth?: IHyperliquidAssetPulse;
    sol?: IHyperliquidAssetPulse;
    hype?: IHyperliquidAssetPulse;
  };
}

export interface IHyperliquidCrossVenueAsset {
  coin: string;
  hlFunding?: number;
  cexFunding?: number;
  isArbitrageOpportunity?: boolean;
  arbitrageDirection?: "long_hl" | "short_hl" | null;
}

export interface IHyperliquidCrossVenueFunding {
  arbitrageOpportunities: string[];
  assets: IHyperliquidCrossVenueAsset[];
}

/** Single asset from HL crypto perps (all main-dex assets). */
export interface IHyperliquidCryptoAsset {
  symbol: string;
  price: number;
  change24h: number;
  funding8h: number;
  fundingAnnualized: number;
  openInterest: number;
  volume24h: number;
  crowdingLevel?: IHyperliquidAssetPulse["crowdingLevel"];
}

/** Full crypto pulse: all perp assets + leaders + TLDR. */
export interface IHyperliquidCryptoPulse {
  assets: IHyperliquidCryptoAsset[];
  topMovers: { symbol: string; change24h: number; volume24h: number }[];
  volumeLeaders: { symbol: string; volume24h: number; openInterest: number; funding8h: number }[];
  overallBias: "bullish" | "bearish" | "neutral";
  hottestAvg: number;  // avg change of top 10 by volume
  coldestAvg: number;  // avg change of worst performers
}

/**
 * Interface for the external Hyperliquid service from plugin-hyperliquid.
 * Accessed via: runtime.getService("HYPERLIQUID_SERVICE")
 */
export interface IHyperliquidService {
  /**
   * Get overall options pulse with per-asset crowding and funding
   */
  getOptionsPulse(): Promise<IHyperliquidOptionsPulse | null>;

  /**
   * Get full crypto pulse: all perp assets with price, change, funding, OI, volume.
   * Used for HIP-3 style dashboard (TOP MOVERS, VOLUME LEADERS, TLDR).
   */
  getAllCryptoPulse?(): Promise<IHyperliquidCryptoPulse | null>;

  /**
   * Get cross-venue funding comparison (Hyperliquid vs CEX)
   */
  getCrossVenueFunding(): Promise<IHyperliquidCrossVenueFunding | null>;

  /**
   * Get mark price for an asset (BTC, ETH, SOL, HYPE). Used when HL is primary or as fallback.
   */
  getMarkPrice?(symbol: string): Promise<number | null>;

  /**
   * Get mark price and 24h change for an asset. Preferred for core assets (BTC, ETH, SOL, HYPE).
   */
  getMarkPriceAndChange?(symbol: string): Promise<{ price: number; change24h: number } | null>;

  /**
   * Check if we're in a rate-limited state (optional - for fallback compatibility)
   */
  isRateLimited?(): boolean;

  /**
   * Get detailed rate limit status (optional - for fallback compatibility)
   */
  getRateLimitStatus?(): { isLimited: boolean; backoffUntil: number; circuitOpen?: boolean };

  /**
   * Get list of perp symbols at open-interest cap (optional - fallback implements)
   */
  getPerpsAtOpenInterestCap?(): Promise<string[] | null>;

  /**
   * Get funding regime (percentile vs history) for mean-reversion signal (optional - fallback implements)
   */
  getFundingRegime?(
    coin: string,
    currentFunding8h: number,
    lookbackSamples?: number
  ): Promise<{ percentile: number; isExtremeLong: boolean; isExtremeShort: boolean } | null>;

  /**
   * Clear the cache (optional)
   */
  clearCache?(): void;

  /**
   * Test the API connection and return diagnostic info (optional)
   */
  testConnection?(): Promise<{ success: boolean; message: string; data?: unknown }>;
}

// ==========================================
// OpenSea Service Interface (plugin-nft-collections)
// Used for: NFT floor price analysis
// Service key: "opensea"
// ==========================================

export interface IOpenSeaFloorThickness {
  score: number; // 0-100 (lower = thinner = more opportunity)
  description: string; // "Very Thin", "Thin", "Medium", "Thick", "Very Thick"
  gaps: {
    to2nd: number;  // ETH gap to 2nd listing
    to3rd: number;  // ETH gap to 3rd listing
    to5th: number;  // ETH gap to 5th listing
    to10th: number; // ETH gap to 10th listing
  };
  nftsNearFloor: number; // Count within 5% of floor
}

export interface IOpenSeaVolumeMetrics {
  salesPerDay: number;
  volume24h: number;
  volume7d: number;
}

export interface IOpenSeaFloorAnalysis {
  collectionSlug: string;
  collectionName: string;
  floorPrice: number;
  floorPriceUsd: number;
  floorThickness: IOpenSeaFloorThickness;
  volumeMetrics: IOpenSeaVolumeMetrics;
}

/**
 * Interface for the external OpenSea service from plugin-nft-collections.
 * Accessed via: runtime.getService("opensea")
 */
export interface IOpenSeaService {
  /**
   * Analyze floor opportunities for a collection
   */
  analyzeFloorOpportunities(
    slug: string,
    options?: { maxListings?: number }
  ): Promise<IOpenSeaFloorAnalysis>;
}

// ==========================================
// Nansen Service Interface (plugin-vince internal)
// Used for: Smart money tracking, meme token analysis
// Service key: "VINCE_NANSEN_SERVICE"
// ==========================================

export type NansenChain = "ethereum" | "solana" | "base" | "arbitrum" | "polygon" | "optimism";

export interface INansenSmartMoneyToken {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: string;
  buyVolume: number;
  sellVolume: number;
  netFlow: number;
  smartMoneyBuyers: number;
  smartMoneySellers: number;
  priceChange24h: number;
}

export interface INansenSmartMoneyTrade {
  wallet: string;
  walletLabels: string[];
  tokenAddress: string;
  tokenSymbol: string;
  side: "BUY" | "SELL";
  volumeUsd: number;
  timestamp: number;
}

export interface INansenWhoBoughtSold {
  wallet: string;
  walletLabels: string[];
  boughtVolumeUsd: number;
  soldVolumeUsd: number;
  netVolumeUsd: number;
  txCount: number;
}

export interface INansenCreditUsage {
  used: number;
  remaining: number;
  total: number;
  warningLevel: "ok" | "low" | "critical" | "empty";
}

export interface INansenAccumulationResult {
  accumulating: boolean;
  netFlow: number;
  topBuyers: INansenWhoBoughtSold[];
  confidence: "high" | "medium" | "low";
}

/**
 * Interface for the Nansen service (smart money tracking).
 * Accessed via: runtime.getService("VINCE_NANSEN_SERVICE")
 * 
 * This service is optional - MEMES action works without it (DexScreener only).
 */
export interface INansenService {
  /**
   * Get smart money tokens across chains
   */
  getSmartMoneyTokens(
    chains?: NansenChain[],
    timeframe?: string
  ): Promise<INansenSmartMoneyToken[]>;

  /**
   * Get smart money DEX trades for a token
   */
  getSmartMoneyTrades(
    chain: NansenChain,
    tokenAddress: string
  ): Promise<INansenSmartMoneyTrade[]>;

  /**
   * Get who bought/sold a token
   */
  getWhoBoughtSold(
    chain: NansenChain,
    tokenAddress: string,
    side?: "BUY" | "SELL"
  ): Promise<INansenWhoBoughtSold[]>;

  /**
   * Check if smart money is accumulating a token
   */
  isSmartMoneyAccumulating(
    chain: NansenChain,
    tokenAddress: string
  ): Promise<INansenAccumulationResult>;

  /**
   * Get hot meme tokens with smart money activity
   */
  getHotMemeTokens(): Promise<INansenSmartMoneyToken[]>;

  /**
   * Get credit usage stats
   */
  getCreditUsage(): INansenCreditUsage;

  /**
   * Check if this is a fallback service (no real API connection)
   */
  isFallback?(): boolean;
}

// ==========================================
// Browser Service Interface (plugin-web-search / bootstrap)
// Used for: Web page fetching for news
// Service key: "BROWSER_AUTOMATION" or "browser"
// ==========================================

/**
 * Interface for browser automation service.
 * Accessed via: runtime.getService("BROWSER_AUTOMATION") or runtime.getService("browser")
 */
export interface IBrowserService {
  /**
   * Fetch a web page and return its content
   */
  fetchPage?(url: string): Promise<string | null>;

  /**
   * Browse to a URL and get content
   */
  browse?(url: string): Promise<{ content?: string; text?: string } | null>;
}

// ==========================================
// Knowledge File Service Interface (plugin-knowledge-ingestion)
// Used for: Knowledge file generation and ingestion
// Service key: N/A (direct instantiation currently)
// ==========================================

export type KnowledgeCategory =
  // Trading & Markets
  | "perps-trading"
  | "options"
  | "defi-metrics"
  | "grinding-the-trenches"
  // Assets
  | "bitcoin-maxi"
  | "altcoins"
  | "solana"
  | "stocks"
  | "commodities"
  | "stablecoins"
  // Macro & Investment
  | "macro-economy"
  | "venture-capital"
  // Technical & Tools
  | "setup-guides"
  | "internal-docs"
  | "prompt-templates"
  | "privacy"
  | "security"
  | "regulation"
  | "rwa"
  // Content
  | "substack-essays"
  | "the-good-life"
  | "art-collections"
  // Default
  | "uncategorized";

export type SourceType = "tweet" | "youtube" | "article" | "markdown" | "unknown";

export interface IKnowledgeFileRequest {
  sourceType: SourceType;
  sourceUrl: string;
  sourceId: string;
  suggestedCategory?: KnowledgeCategory;
  suggestedFilename?: string;
  additionalContext?: string;
  tags?: string[];
  preserveOriginal?: boolean;
}

export interface IGeneratedKnowledgeFile {
  category: KnowledgeCategory;
  filename: string;
  filepath: string;
  content: string;
  metadata: {
    source: string;
    sourceUrl: string;
    processedAt: string;
    wordCount: number;
    tags: string[];
  };
}

export interface IKnowledgeGenerationResult {
  success: boolean;
  file?: IGeneratedKnowledgeFile;
  files?: IGeneratedKnowledgeFile[];
  error?: string;
}

/**
 * Interface for the knowledge file service from plugin-knowledge-ingestion.
 * This service is used for generating and categorizing knowledge files.
 */
export interface IKnowledgeFileService {
  initialize(runtime: unknown): Promise<void>;
  categorizeContent(content: string, sourceType: SourceType): Promise<KnowledgeCategory>;
  generateKnowledgeFile(request: IKnowledgeFileRequest): Promise<IKnowledgeGenerationResult>;
}
