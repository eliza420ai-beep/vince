/**
 * VINCE Session-Based Trading Filters
 * 
 * Provides utilities for:
 * 1. Session Detection - Know which global trading session is active
 * 2. Session Filtering - Avoid low-liquidity sessions, boost preferred ones
 * 3. Open Window Trend Spotting - Detect major market opens and boost aligned signals
 * 
 * Based on plugin-hyperliquid-bot patterns, adapted for VINCE.
 */

// =============================================================================
// SESSION TYPES AND CONSTANTS
// =============================================================================

/**
 * Trading session types
 */
export type TradingSession = 
  | "asia" 
  | "europe" 
  | "us" 
  | "eu_us_overlap" 
  | "off_hours";

/**
 * Session time boundaries (in UTC hours)
 */
export const SESSION_HOURS = {
  asia: { start: 0, end: 8 },          // 00:00-08:00 UTC (Tokyo, Hong Kong, Singapore)
  europe: { start: 7, end: 16 },       // 07:00-16:00 UTC (London, Frankfurt)
  us: { start: 13, end: 22 },          // 13:00-22:00 UTC (New York, Chicago)
  eu_us_overlap: { start: 13, end: 16 }, // 13:00-16:00 UTC (Peak liquidity)
} as const;

/**
 * Session characteristics
 */
export interface SessionCharacteristics {
  session: TradingSession;
  volatilityLevel: "low" | "medium" | "high";
  liquidityLevel: "low" | "medium" | "high";
  goodForTrading: boolean;
  confidenceMultiplier: number;  // Applied to signal confidence
  sizeMultiplier: number;        // Applied to position size
  description: string;
}

/**
 * Session characteristics database
 */
export const SESSION_CHARACTERISTICS: Record<TradingSession, SessionCharacteristics> = {
  asia: {
    session: "asia",
    volatilityLevel: "low",
    liquidityLevel: "low",
    goodForTrading: true,
    confidenceMultiplier: 0.9,   // 10% confidence reduction
    sizeMultiplier: 0.8,         // 20% size reduction
    description: "Asian session (Tokyo/HK) - lower volatility and liquidity",
  },
  europe: {
    session: "europe",
    volatilityLevel: "medium",
    liquidityLevel: "high",
    goodForTrading: true,
    confidenceMultiplier: 1.0,
    sizeMultiplier: 1.0,
    description: "European session (London) - good liquidity, moderate volatility",
  },
  us: {
    session: "us",
    volatilityLevel: "high",
    liquidityLevel: "high",
    goodForTrading: true,
    confidenceMultiplier: 1.0,
    sizeMultiplier: 1.0,
    description: "US session (New York) - highest volatility and liquidity",
  },
  eu_us_overlap: {
    session: "eu_us_overlap",
    volatilityLevel: "high",
    liquidityLevel: "high",
    goodForTrading: true,
    confidenceMultiplier: 1.1,   // 10% confidence boost
    sizeMultiplier: 1.1,         // 10% size boost
    description: "EU/US overlap - peak liquidity period, best for trading",
  },
  off_hours: {
    session: "off_hours",
    volatilityLevel: "low",
    liquidityLevel: "low",
    goodForTrading: false,
    confidenceMultiplier: 0.8,   // 20% confidence reduction
    sizeMultiplier: 0.7,         // 30% size reduction
    description: "Off-hours (22:00-00:00 UTC) - thin liquidity, unpredictable",
  },
};

// =============================================================================
// SESSION DETECTION
// =============================================================================

/**
 * Get current trading session
 */
export function getCurrentSession(date: Date = new Date()): TradingSession {
  const hour = date.getUTCHours();
  
  // EU/US overlap takes priority (highest liquidity)
  if (hour >= 13 && hour < 16) {
    return "eu_us_overlap";
  }
  
  // US session (after overlap)
  if (hour >= 16 && hour < 22) {
    return "us";
  }
  
  // Europe session (before overlap)
  if (hour >= 7 && hour < 13) {
    return "europe";
  }
  
  // Asia session
  if (hour >= 0 && hour < 7) {
    return "asia";
  }
  
  // Off-hours (22:00-00:00)
  return "off_hours";
}

/**
 * Get characteristics for current session
 */
export function getCurrentSessionCharacteristics(date: Date = new Date()): SessionCharacteristics {
  const session = getCurrentSession(date);
  return SESSION_CHARACTERISTICS[session];
}

/**
 * Check if it's a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

// =============================================================================
// SESSION FILTERING
// =============================================================================

/**
 * Session filter configuration
 */
export interface SessionFilterConfig {
  /** Sessions to completely avoid (don't trade) */
  avoidSessions?: TradingSession[];
  /** Sessions to reduce size instead of avoiding */
  reduceSessions?: TradingSession[];
  /** Size reduction factor for reduced sessions (default: 0.5) */
  reductionFactor?: number;
  /** Whether to apply weekend penalty (default: true) */
  applyWeekendPenalty?: boolean;
  /** Weekend confidence multiplier (default: 0.8) */
  weekendMultiplier?: number;
}

/**
 * Default session filter configuration
 */
export const DEFAULT_SESSION_FILTER_CONFIG: SessionFilterConfig = {
  avoidSessions: [],
  reduceSessions: ["off_hours"],
  reductionFactor: 0.5,
  applyWeekendPenalty: true,
  weekendMultiplier: 0.9, // Reduced from 0.8 to allow more weekend trades
};

/**
 * Session filter result
 */
export interface SessionFilterResult {
  shouldTrade: boolean;
  adjustedConfidence: number;
  adjustedSizePct: number;
  session: TradingSession;
  sessionInfo: string;
  factors: string[];
}

/**
 * Apply session filter to trading decision
 */
export function applySessionFilter(
  originalConfidence: number,
  originalSizePct: number,
  config: SessionFilterConfig = DEFAULT_SESSION_FILTER_CONFIG,
  date: Date = new Date()
): SessionFilterResult {
  const session = getCurrentSession(date);
  const chars = SESSION_CHARACTERISTICS[session];
  const factors: string[] = [];
  
  let adjustedConfidence = originalConfidence;
  let adjustedSizePct = originalSizePct;
  
  // Check if we should avoid this session
  if (config.avoidSessions?.includes(session)) {
    return {
      shouldTrade: false,
      adjustedConfidence: 0,
      adjustedSizePct: 0,
      session,
      sessionInfo: `${session} session avoided`,
      factors: [`Avoiding ${session} session: ${chars.description}`],
    };
  }
  
  // Apply session characteristics multipliers
  adjustedConfidence *= chars.confidenceMultiplier;
  adjustedSizePct *= chars.sizeMultiplier;
  
  if (chars.confidenceMultiplier !== 1.0) {
    factors.push(`${session}: ${chars.confidenceMultiplier > 1 ? '+' : ''}${((chars.confidenceMultiplier - 1) * 100).toFixed(0)}% confidence`);
  }
  if (chars.sizeMultiplier !== 1.0) {
    factors.push(`${session}: ${chars.sizeMultiplier > 1 ? '+' : ''}${((chars.sizeMultiplier - 1) * 100).toFixed(0)}% size`);
  }
  
  // Check if this is a reduced session
  if (config.reduceSessions?.includes(session)) {
    const reduction = config.reductionFactor ?? 0.5;
    adjustedSizePct *= reduction;
    factors.push(`${session}: ${((1 - reduction) * 100).toFixed(0)}% size reduction`);
  }
  
  // Apply weekend penalty
  if (config.applyWeekendPenalty && isWeekend(date)) {
    const weekendMult = config.weekendMultiplier ?? 0.8;
    adjustedConfidence *= weekendMult;
    factors.push(`Weekend: ${((1 - weekendMult) * 100).toFixed(0)}% confidence reduction`);
  }
  
  return {
    shouldTrade: true,
    adjustedConfidence: Math.round(adjustedConfidence),
    adjustedSizePct: Math.round(adjustedSizePct * 100) / 100,
    session,
    sessionInfo: chars.description,
    factors,
  };
}

// =============================================================================
// OPEN WINDOW TREND SPOTTING
// =============================================================================

/**
 * Major market open types
 */
export type MarketOpen = "tokyo" | "london" | "new_york";

/**
 * Market open times (in UTC)
 * These are when major markets open and often set the daily trend
 */
export const MARKET_OPENS: Record<MarketOpen, { hour: number; minute: number; name: string }> = {
  tokyo: { hour: 0, minute: 0, name: "Tokyo" },       // 00:00 UTC = 09:00 JST
  london: { hour: 8, minute: 0, name: "London" },     // 08:00 UTC = 08:00 GMT
  new_york: { hour: 13, minute: 30, name: "New York" }, // 13:30 UTC = 09:30 EST
};

/**
 * Open window information
 */
export interface OpenWindowInfo {
  /** Whether we're in an open window */
  isOpenWindow: boolean;
  /** Which market opened (null if not in window) */
  market: MarketOpen | null;
  /** Human-readable market name */
  marketName: string | null;
  /** Minutes since market opened */
  minutesSinceOpen: number;
  /** Trend bias based on price vs daily open */
  trendBias: "bullish" | "bearish" | "neutral";
  /** Whether volume confirms the trend */
  volumeConfirmed: boolean;
  /** Volume ratio vs average */
  volumeRatio: number;
}

/**
 * Open window configuration
 */
export interface OpenWindowConfig {
  /** Enable open window detection */
  enabled: boolean;
  /** Window duration after open (minutes) */
  windowMinutes: number;
  /** Confidence boost when trend aligns with signal */
  boostPercent: number;
  /** Markets to detect */
  detectMarkets: MarketOpen[];
  /** Require volume confirmation for boost */
  requireVolumeConfirmation: boolean;
  /** Volume threshold (e.g., 1.5 = 150% of average) */
  volumeThreshold: number;
  /** Price deviation threshold for trend determination (%) */
  priceDeviationThreshold: number;
}

/**
 * Default open window configuration
 */
export const DEFAULT_OPEN_WINDOW_CONFIG: OpenWindowConfig = {
  enabled: true,
  windowMinutes: 60,         // 60 minutes after open
  boostPercent: 15,          // +15% confidence boost
  detectMarkets: ["london", "new_york"], // Focus on high-liquidity opens
  requireVolumeConfirmation: true,
  volumeThreshold: 1.5,      // 1.5x average volume
  priceDeviationThreshold: 0.3, // 0.3% move from open for trend determination
};

/**
 * Detect if we're in a market open window
 */
export function detectOpenWindow(
  config: OpenWindowConfig = DEFAULT_OPEN_WINDOW_CONFIG,
  date: Date = new Date()
): { isOpen: boolean; market: MarketOpen | null; minutesSince: number } {
  if (!config.enabled) {
    return { isOpen: false, market: null, minutesSince: 0 };
  }
  
  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();
  const totalMinutesNow = utcHour * 60 + utcMinute;
  
  for (const market of config.detectMarkets) {
    const openTime = MARKET_OPENS[market];
    const openTotalMinutes = openTime.hour * 60 + openTime.minute;
    
    let minutesSince = totalMinutesNow - openTotalMinutes;
    
    // Handle day wrap
    if (minutesSince < 0) {
      minutesSince += 24 * 60;
    }
    
    // Check if we're within the window
    if (minutesSince >= 0 && minutesSince < config.windowMinutes) {
      return {
        isOpen: true,
        market,
        minutesSince,
      };
    }
  }
  
  return { isOpen: false, market: null, minutesSince: 0 };
}

/**
 * Calculate trend bias based on current price vs daily open
 */
export function calculateTrendBias(
  currentPrice: number | null,
  dailyOpenPrice: number | null,
  thresholdPct: number = 0.3
): "bullish" | "bearish" | "neutral" {
  if (!currentPrice || !dailyOpenPrice || dailyOpenPrice === 0) {
    return "neutral";
  }
  
  const percentChange = ((currentPrice - dailyOpenPrice) / dailyOpenPrice) * 100;
  
  if (percentChange > thresholdPct) {
    return "bullish";
  } else if (percentChange < -thresholdPct) {
    return "bearish";
  }
  
  return "neutral";
}

/**
 * Build OpenWindowInfo with market data
 */
export function buildOpenWindowInfo(
  currentPrice: number | null,
  dailyOpenPrice: number | null,
  volumeRatio: number,
  config: OpenWindowConfig = DEFAULT_OPEN_WINDOW_CONFIG,
  date: Date = new Date()
): OpenWindowInfo {
  const detection = detectOpenWindow(config, date);
  const trendBias = calculateTrendBias(currentPrice, dailyOpenPrice, config.priceDeviationThreshold);
  const volumeConfirmed = volumeRatio >= config.volumeThreshold;
  
  return {
    isOpenWindow: detection.isOpen,
    market: detection.market,
    marketName: detection.market ? MARKET_OPENS[detection.market].name : null,
    minutesSinceOpen: detection.minutesSince,
    trendBias,
    volumeConfirmed,
    volumeRatio,
  };
}

/**
 * Calculate open window boost for signal confidence
 * Only applies boost if trend aligns with signal direction
 */
export function calculateOpenWindowBoost(
  signalDirection: "long" | "short",
  openInfo: OpenWindowInfo,
  config: OpenWindowConfig = DEFAULT_OPEN_WINDOW_CONFIG
): { boost: number; reason: string } {
  // Not in window
  if (!openInfo.isOpenWindow || !openInfo.market) {
    return { boost: 0, reason: "" };
  }
  
  // Volume not confirmed (if required)
  if (config.requireVolumeConfirmation && !openInfo.volumeConfirmed) {
    return { 
      boost: 0, 
      reason: `${openInfo.marketName} open (low volume: ${openInfo.volumeRatio.toFixed(1)}x)` 
    };
  }
  
  // No clear trend
  if (openInfo.trendBias === "neutral") {
    return { 
      boost: 0, 
      reason: `${openInfo.marketName} open (no clear trend)` 
    };
  }
  
  // Check if trend aligns with signal
  const trendMatchesSignal = 
    (openInfo.trendBias === "bullish" && signalDirection === "long") ||
    (openInfo.trendBias === "bearish" && signalDirection === "short");
  
  if (!trendMatchesSignal) {
    return { 
      boost: 0, 
      reason: `${openInfo.marketName} trend ${openInfo.trendBias} (opposes ${signalDirection} signal)` 
    };
  }
  
  // Apply boost!
  return {
    boost: config.boostPercent,
    reason: `${openInfo.marketName} open +${openInfo.minutesSinceOpen}min (${openInfo.trendBias} trend, vol ${openInfo.volumeRatio.toFixed(1)}x) +${config.boostPercent}%`,
  };
}

// =============================================================================
// COMBINED SESSION + OPEN WINDOW UTILITY
// =============================================================================

/**
 * Combined trading conditions result
 */
export interface TradingConditionsResult {
  // Session info
  session: TradingSession;
  sessionCharacteristics: SessionCharacteristics;
  
  // Open window info
  openWindow: OpenWindowInfo | null;
  
  // Adjustments
  shouldTrade: boolean;
  confidenceMultiplier: number;
  sizeMultiplier: number;
  
  // All factors for logging
  factors: string[];
}

/**
 * Evaluate all trading conditions (session + open window)
 */
export function evaluateTradingConditions(
  signalDirection: "long" | "short" | "neutral",
  currentPrice: number | null,
  dailyOpenPrice: number | null,
  volumeRatio: number,
  sessionConfig: SessionFilterConfig = DEFAULT_SESSION_FILTER_CONFIG,
  openWindowConfig: OpenWindowConfig = DEFAULT_OPEN_WINDOW_CONFIG,
  date: Date = new Date()
): TradingConditionsResult {
  const factors: string[] = [];
  
  // Get session info
  const session = getCurrentSession(date);
  const sessionChars = SESSION_CHARACTERISTICS[session];
  
  // Apply session filter
  const sessionResult = applySessionFilter(100, 100, sessionConfig, date);
  factors.push(...sessionResult.factors);
  
  if (!sessionResult.shouldTrade) {
    return {
      session,
      sessionCharacteristics: sessionChars,
      openWindow: null,
      shouldTrade: false,
      confidenceMultiplier: 0,
      sizeMultiplier: 0,
      factors,
    };
  }
  
  // Build open window info
  const openWindowInfo = buildOpenWindowInfo(
    currentPrice, 
    dailyOpenPrice, 
    volumeRatio, 
    openWindowConfig, 
    date
  );
  
  // Calculate open window boost (only for directional signals)
  let openWindowBoost = 0;
  if (signalDirection !== "neutral") {
    const boostResult = calculateOpenWindowBoost(signalDirection, openWindowInfo, openWindowConfig);
    openWindowBoost = boostResult.boost;
    if (boostResult.reason) {
      factors.push(boostResult.reason);
    }
  }
  
  // Calculate final multipliers
  const confidenceMultiplier = (sessionResult.adjustedConfidence / 100) * (1 + openWindowBoost / 100);
  const sizeMultiplier = sessionResult.adjustedSizePct / 100;
  
  return {
    session,
    sessionCharacteristics: sessionChars,
    openWindow: openWindowInfo,
    shouldTrade: true,
    confidenceMultiplier,
    sizeMultiplier,
    factors,
  };
}
