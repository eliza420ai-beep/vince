/**
 * VINCE Bull/Bear Analysis Types
 *
 * Type definitions for the daily market analysis system.
 * Supports building bull and bear cases from multiple data sources
 * and generating a final conclusion with conviction score.
 */

// ==========================================
// Data Source Indicators
// ==========================================

export type DataSource =
  | "coinglass"
  | "deribit"
  | "sanbase"
  | "nansen"
  | "top_traders"
  | "news_sentiment"
  | "coingecko"
  | "dexscreener"
  | "meteora";

export type IndicatorType =
  // CoinGlass indicators
  | "funding_rate"
  | "long_short_ratio"
  | "fear_greed"
  | "open_interest"
  // Deribit indicators
  | "iv_skew"
  | "dvol"
  | "options_premium"
  // Sanbase indicators
  | "exchange_flows"
  | "network_activity"
  | "whale_activity"
  | "dev_activity"
  // Nansen indicators
  | "smart_money_flow"
  | "accumulation"
  // TopTraders indicators
  | "whale_positioning"
  // News indicators
  | "sentiment"
  | "risk_events"
  // Price indicators
  | "price_momentum";

// ==========================================
// Case Factor
// ==========================================

/**
 * A single factor contributing to a bull or bear case
 */
export interface CaseFactor {
  /** Source of this data point */
  source: DataSource;

  /** Type of indicator */
  indicator: IndicatorType;

  /** Human-readable value (e.g., "-0.015%", "Extreme Fear") */
  value: string;

  /** Raw numeric value for calculations */
  rawValue: number;

  /** Weight of this factor (0-100) */
  weight: number;

  /** Explanation of why this is bullish/bearish */
  explanation: string;

  /** Confidence in this signal (0-100) */
  confidence: number;

  /** When this data was collected */
  timestamp: number;
}

// ==========================================
// Market Case
// ==========================================

/**
 * A complete bull or bear case built from multiple factors
 */
export interface MarketCase {
  /** Type of case */
  type: "bull" | "bear";

  /** Overall strength of the case (0-100) */
  strength: number;

  /** Number of supporting factors */
  factorCount: number;

  /** All factors supporting this case */
  factors: CaseFactor[];

  /** Top 3 most important factors */
  keyFactors: CaseFactor[];

  /** Generated narrative explaining the case */
  narrative: string;

  /** When this case was generated */
  timestamp: number;
}

// ==========================================
// Daily Conclusion
// ==========================================

export type MarketDirection = "bullish" | "bearish" | "neutral";

export type RecommendedAction =
  | "accumulate"
  | "hold"
  | "reduce"
  | "hedge"
  | "wait_for_clarity";

/**
 * The final daily conclusion combining bull and bear cases
 */
export interface DailyConclusion {
  /** Date of analysis (YYYY-MM-DD) */
  date: string;

  /** Asset being analyzed */
  asset: string;

  /** The bull case */
  bullCase: MarketCase;

  /** The bear case */
  bearCase: MarketCase;

  /** Net direction based on case comparison */
  direction: MarketDirection;

  /** Conviction level (0-100) */
  conviction: number;

  /** Key factors driving the conclusion */
  keyFactors: string[];

  /** Recommended action */
  recommendation: RecommendedAction;

  /** Human-readable recommendation text */
  recommendationText: string;

  /** Full narrative summary */
  summary: string;

  /** Generation timestamp */
  timestamp: number;
}

// ==========================================
// Service Data Snapshots
// ==========================================

/**
 * Snapshot of all service data used for analysis
 */
export interface MarketDataSnapshot {
  asset: string;
  timestamp: number;

  // CoinGlass
  fundingRate: number | null;
  longShortRatio: number | null;
  fearGreedValue: number | null;
  fearGreedLabel: string | null;
  openInterestChange: number | null;

  // Deribit
  spotPrice: number | null;
  dvol: number | null;
  ivSkew: number | null;
  skewInterpretation: "fearful" | "neutral" | "bullish" | null;

  // Sanbase
  exchangeNetFlow: number | null;
  exchangeSentiment: "accumulation" | "neutral" | "distribution" | null;
  networkTrend: "increasing" | "stable" | "decreasing" | null;
  whaleSentiment: "bullish" | "neutral" | "bearish" | null;

  // Nansen
  smartMoneyNetFlow: number | null;
  isSmartMoneyAccumulating: boolean | null;
  smartMoneyConfidence: "high" | "medium" | "low" | null;

  // TopTraders
  whaleDirection: "long" | "short" | "neutral" | null;
  whaleStrength: number | null;

  // News
  newsSentiment: "bullish" | "neutral" | "bearish" | null;
  newsConfidence: number | null;
  hasRiskEvents: boolean;

  // Price
  priceChange24h: number | null;
}

// ==========================================
// Analysis Configuration
// ==========================================

/**
 * Weights for each data source in the analysis
 */
export interface AnalysisWeights {
  coinglass: number;
  deribit: number;
  sanbase: number;
  nansen: number;
  topTraders: number;
  newsSentiment: number;
  priceAction: number;
}

/**
 * Default weights (sum to 100)
 */
export const DEFAULT_ANALYSIS_WEIGHTS: AnalysisWeights = {
  coinglass: 20, // Funding, L/S, sentiment
  deribit: 15, // Options, IV
  sanbase: 15, // On-chain flows
  nansen: 15, // Smart money
  topTraders: 15, // Whale positioning
  newsSentiment: 10, // News
  priceAction: 10, // Price momentum
};

/**
 * Thresholds for bullish/bearish signals
 */
export interface SignalThresholds {
  // CoinGlass
  fundingBullish: number; // Below this = bullish (shorts paying)
  fundingBearish: number; // Above this = bearish (longs paying)
  longShortBullish: number; // Below this = bullish (shorts crowded)
  longShortBearish: number; // Above this = bearish (longs crowded)
  fearGreedBullish: number; // Below this = bullish (extreme fear)
  fearGreedBearish: number; // Above this = bearish (extreme greed)

  // Deribit
  skewBullish: number; // Below this = bullish (call demand)
  skewBearish: number; // Above this = bearish (put demand)

  // Sanbase
  exchangeFlowBullish: number; // Below this = bullish (outflows)
  exchangeFlowBearish: number; // Above this = bearish (inflows)

  // Price
  momentumBullish: number; // Above this = bullish momentum
  momentumBearish: number; // Below this = bearish momentum
}

export const DEFAULT_THRESHOLDS: SignalThresholds = {
  fundingBullish: -0.01,
  fundingBearish: 0.02,
  longShortBullish: 0.8,
  longShortBearish: 1.3,
  fearGreedBullish: 25,
  fearGreedBearish: 75,
  skewBullish: -10,
  skewBearish: 10,
  exchangeFlowBullish: -5000,
  exchangeFlowBearish: 5000,
  momentumBullish: 3,
  momentumBearish: -3,
};

// ==========================================
// Analysis Result
// ==========================================

/**
 * Complete analysis result including all intermediate data
 */
export interface AnalysisResult {
  /** The data snapshot used */
  snapshot: MarketDataSnapshot;

  /** The generated conclusion */
  conclusion: DailyConclusion;

  /** Services that were available */
  availableServices: DataSource[];

  /** Services that failed */
  failedServices: DataSource[];

  /** Total data quality score (0-100) */
  dataQualityScore: number;

  /** Generation time in ms */
  generationTimeMs: number;
}
