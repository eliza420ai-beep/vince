/**
 * Test Utilities for Plugin-Vince Actions
 *
 * Provides mock factories and utilities for testing actions:
 * - createMockRuntime() - Mock IAgentRuntime with configurable services
 * - createMockServices() - Factory for individual service mocks
 * - createMockCallback() - HandlerCallback that captures responses
 * - createMockMessage() - Creates Memory objects for testing
 * - createMockState() - Creates State objects for testing
 */

import type { IAgentRuntime, Memory, State, HandlerCallback, Content, UUID } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// Mock Callback Factory
// ==========================================

export interface MockCallback {
  (...args: any[]): Promise<void>;
  calls: Content[];
  reset: () => void;
}

/**
 * Creates a mock HandlerCallback that captures all calls
 */
export function createMockCallback(): MockCallback {
  const calls: Content[] = [];

  const callback = async (content: Content): Promise<void> => {
    calls.push(content);
  };

  (callback as MockCallback).calls = calls;
  (callback as MockCallback).reset = () => {
    calls.length = 0;
  };

  return callback as MockCallback;
}

// ==========================================
// Mock Message Factory
// ==========================================

/**
 * Creates a mock Memory object for testing action validation and handlers
 */
export function createMockMessage(
  text: string,
  options?: {
    entityId?: UUID;
    roomId?: UUID;
    agentId?: UUID;
  }
): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: options?.entityId || (uuidv4() as UUID),
    roomId: options?.roomId || (uuidv4() as UUID),
    agentId: options?.agentId || (uuidv4() as UUID),
    content: {
      text,
      source: "test",
    },
    createdAt: Date.now(),
  };
}

// ==========================================
// Mock State Factory
// ==========================================

/**
 * Creates a mock State object for testing action handlers
 */
export function createMockState(overrides?: Partial<State>): State {
  return {
    values: {},
    data: {},
    text: "",
    ...overrides,
  };
}

// ==========================================
// Mock Services Factory
// ==========================================

/**
 * Mock data for VinceDeribitService
 */
export const mockDeribitData = {
  volatilityIndex: {
    current: 45.5,
    change24h: 2.3,
    high24h: 48.0,
    low24h: 42.0,
  },
  comprehensiveData: {
    optionsSummary: {
      putCallRatio: 0.78,
      totalOpenInterest: 15000000000,
      callOpenInterest: 8500000000,
      putOpenInterest: 6500000000,
    },
  },
};

/**
 * Mock data for VinceCoinGlassService
 */
export const mockCoinGlassData = {
  openInterest: [
    { symbol: "BTC", openInterest: 25000000000, change24h: 5.2 },
    { symbol: "ETH", openInterest: 12000000000, change24h: -2.1 },
  ],
  fundingRates: [
    { symbol: "BTC", rate: 0.0001, annualized: 3.65 },
    { symbol: "ETH", rate: -0.0002, annualized: -7.3 },
  ],
  fearGreed: { value: 45, classification: "Fear" },
};

/**
 * Mock data for VinceBinanceService
 */
export const mockBinanceData = {
  longShortRatio: { longShortRatio: 1.85, longAccount: 0.65, shortAccount: 0.35 },
  topTraderPositions: { longShortRatio: 2.1, longAccount: 0.68, shortAccount: 0.32 },
  takerBuySellRatio: { buySellRatio: 1.2, buyVol: 150000000, sellVol: 125000000 },
};

/**
 * Mock data for VinceSignalAggregatorService
 */
export const mockSignalData = {
  aggregatedSignals: {
    overall: "NEUTRAL",
    confidence: 65,
    signals: {
      funding: { signal: "BULLISH", value: 0.01 },
      oi: { signal: "NEUTRAL", value: 0 },
      volume: { signal: "BULLISH", value: 15 },
    },
  },
};

/**
 * Mock data for VinceMarketDataService
 */
export const mockMarketData = {
  regime: "NEUTRAL",
  prices: {
    BTC: 85000,
    ETH: 3200,
    SOL: 145,
  },
  fearGreed: 45,
};

/**
 * Mock data for VinceNewsService
 */
export const mockNewsData = {
  sentiment: { sentiment: "neutral", confidence: 60 },
  topNews: [
    { title: "BTC breaks $85k", sentiment: "bullish", source: "CoinDesk" },
    { title: "ETH gas fees spike", sentiment: "bearish", source: "Decrypt" },
  ],
  riskEvents: [],
};

/**
 * Mock data for VinceDexScreenerService
 */
export const mockDexScreenerData = {
  pairs: [
    {
      baseToken: { symbol: "PEPE", name: "Pepe" },
      quoteToken: { symbol: "WETH" },
      priceUsd: "0.00001234",
      volume24h: 5000000,
      liquidity: 10000000,
    },
  ],
};

/**
 * Mock data for VinceNFTFloorService
 */
export const mockNFTData = {
  opportunities: [
    {
      collection: "cryptopunks",
      floorPrice: 45.5,
      floorThickness: { score: 25, description: "Thin" },
    },
  ],
};

/**
 * Mock data for VinceHIP3Service
 */
export const mockHIP3Data = {
  commodities: { gold: 2050, silver: 24.5 },
  stocks: { NVDA: 875, TSLA: 245 },
  indices: { SPX: 5200, NDX: 18500 },
};

/**
 * Mock data for VinceLifestyleService
 */
export const mockLifestyleData = {
  suggestions: {
    health: [{ suggestion: "Morning swim", reason: "Pool season" }],
    dining: [{ suggestion: "Sushi for lunch", reason: "Friday treat", daySpecific: true }],
    hotel: [{ suggestion: "Four Seasons", reason: "Pool access" }],
    activity: [{ suggestion: "Strike selection", reason: "Friday ritual" }],
  },
  isFriday: true,
  season: "pool" as const,
};

/**
 * Mock data for paper trading services
 */
export const mockPaperTradingData = {
  status: {
    isActive: true,
    isPaused: false,
    balance: 10000,
    pnl: 250,
    openPositions: 1,
  },
  positions: [
    {
      asset: "BTC",
      side: "long",
      size: 0.1,
      entryPrice: 82000,
      currentPrice: 85000,
      pnl: 300,
    },
  ],
};

/**
 * Mock daily briefing data for VinceLifestyleService
 */
export const mockDailyBriefing = {
  day: "friday",
  date: "2026-02-01",
  specialNotes: ["Strike selection ritual day"],
  suggestions: [
    { category: "health", suggestion: "Morning swim", reason: "Pool season" },
    { category: "dining", suggestion: "Sushi for lunch", reason: "Friday treat", daySpecific: true },
    { category: "hotel", suggestion: "Four Seasons", reason: "Pool access" },
    { category: "activity", suggestion: "Strike selection", reason: "Friday ritual" },
  ],
};

/**
 * Mock HIP3 pulse data
 */
export const mockHIP3Pulse = {
  commodities: {
    gold: { price: 2050, change24h: 0.5 },
    silver: { price: 24.5, change24h: -0.2 },
    oil: { price: 75.5, change24h: 1.2 },
  },
  stocks: {
    NVDA: { price: 875, change24h: 2.1 },
    TSLA: { price: 245, change24h: -1.5 },
  },
  indices: {
    SPX: { price: 5200, change24h: 0.3 },
    NDX: { price: 18500, change24h: 0.8 },
  },
  summary: "Markets mixed with tech leading.",
};

/**
 * Creates mock services with sample data
 */
export function createMockServices() {
  return {
    VINCE_DERIBIT_SERVICE: {
      getVolatilityIndex: async () => mockDeribitData.volatilityIndex,
      getComprehensiveData: async () => mockDeribitData.comprehensiveData,
      refreshData: async () => {},
    },
    VINCE_COINGLASS_SERVICE: {
      getOpenInterest: async () => mockCoinGlassData.openInterest,
      getFundingRates: async () => mockCoinGlassData.fundingRates,
      getFearGreed: async () => mockCoinGlassData.fearGreed,
      refreshData: async () => {},
    },
    VINCE_BINANCE_SERVICE: {
      getLongShortRatio: async () => mockBinanceData.longShortRatio,
      getTopTraderPositions: async () => mockBinanceData.topTraderPositions,
      getTakerBuySellRatio: async () => mockBinanceData.takerBuySellRatio,
      refreshData: async () => {},
    },
    VINCE_BINANCE_LIQUIDATION_SERVICE: {
      getRecentLiquidations: async () => [],
      getLiquidationStats: async () => ({ totalLong: 0, totalShort: 0 }),
      refreshData: async () => {},
    },
    VINCE_SIGNAL_AGGREGATOR_SERVICE: {
      getAggregatedSignals: async () => mockSignalData.aggregatedSignals,
      getSignalHistory: async () => [],
      refreshData: async () => {},
    },
    VINCE_MARKET_DATA_SERVICE: {
      getMarketRegime: async () => mockMarketData.regime,
      getPrices: async () => mockMarketData.prices,
      getFearGreed: async () => mockMarketData.fearGreed,
      refreshData: async () => {},
    },
    VINCE_MARKET_REGIME_SERVICE: {
      getCurrentRegime: async () => ({ regime: "NEUTRAL", confidence: 70 }),
      refreshData: async () => {},
    },
    VINCE_NEWS_SENTIMENT_SERVICE: {
      getSentiment: async () => mockNewsData.sentiment,
      getTopNews: async () => mockNewsData.topNews,
      getRiskEvents: async () => mockNewsData.riskEvents,
      refreshData: async () => {},
      getNewsSummary: () => ({
        sentiment: mockNewsData.sentiment,
        topNews: mockNewsData.topNews,
        riskEvents: mockNewsData.riskEvents,
      }),
    },
    VINCE_DEXSCREENER_SERVICE: {
      searchTokens: async () => mockDexScreenerData.pairs,
      getTokenByAddress: async () => mockDexScreenerData.pairs[0],
      refreshData: async () => {},
      getHotPairs: () => mockDexScreenerData.pairs,
      getSortedPairs: () => mockDexScreenerData.pairs,
    },
    VINCE_METEORA_SERVICE: {
      getDLMMPools: async () => [],
      refreshData: async () => {},
    },
    VINCE_NANSEN_SERVICE: {
      getSmartMoney: async () => [],
      refreshData: async () => {},
    },
    VINCE_NFT_FLOOR_SERVICE: {
      getFloorOpportunities: async () => mockNFTData.opportunities,
      analyzeCollection: async () => mockNFTData.opportunities[0],
      refreshData: async () => {},
      getOpportunities: () => mockNFTData.opportunities,
    },
    VINCE_HIP3_SERVICE: {
      getCommodities: async () => mockHIP3Data.commodities,
      getStocks: async () => mockHIP3Data.stocks,
      getIndices: async () => mockHIP3Data.indices,
      getAllData: async () => mockHIP3Data,
      getHIP3Pulse: async () => mockHIP3Pulse,
      refreshData: async () => {},
    },
    VINCE_LIFESTYLE_SERVICE: {
      getDailySuggestions: async () => mockLifestyleData.suggestions,
      isFriday: () => mockLifestyleData.isFriday,
      getSeason: () => mockLifestyleData.season,
      getDailyBriefing: () => mockDailyBriefing,
      getCurrentSeason: () => mockLifestyleData.season,
      refreshData: async () => {},
    },
    VINCE_TOP_TRADERS_SERVICE: {
      getTopTraders: async () => [],
      getTraderStats: async () => ({}),
    },
    VINCE_PAPER_TRADING_SERVICE: {
      getStatus: async () => mockPaperTradingData.status,
      isActive: () => mockPaperTradingData.status.isActive,
      isPaused: () => mockPaperTradingData.status.isPaused,
      pause: async () => {},
      resume: async () => {},
    },
    VINCE_POSITION_MANAGER_SERVICE: {
      getPositions: async () => mockPaperTradingData.positions,
      getOpenPositions: async () => mockPaperTradingData.positions,
    },
    VINCE_TRADE_JOURNAL_SERVICE: {
      getTrades: async () => [],
      getStats: async () => ({ totalTrades: 10, winRate: 0.6 }),
    },
    VINCE_RISK_MANAGER_SERVICE: {
      getRiskState: async () => ({ riskLevel: "LOW", exposure: 0.1 }),
    },
    VINCE_GOAL_TRACKER_SERVICE: {
      getGoals: async () => [],
      getProgress: async () => ({ weeklyTarget: 500, current: 250 }),
    },
    VINCE_SANBASE_SERVICE: {
      getSocialVolume: async () => [],
    },
  };
}

// ==========================================
// Mock Runtime Factory
// ==========================================

export interface MockRuntimeOptions {
  services?: Record<string, any>;
  settings?: Record<string, any>;
  useModel?: (type: string, params: any) => Promise<string>;
}

/**
 * Creates a mock IAgentRuntime for testing
 */
export function createMockRuntime(options?: MockRuntimeOptions): IAgentRuntime {
  const services = options?.services || createMockServices();
  const settings = options?.settings || {};

  // Default useModel returns a simple response
  const defaultUseModel = async (_type: string, _params: any): Promise<string> => {
    return JSON.stringify({
      response: "This is a mock LLM response for testing purposes.",
    });
  };

  const runtime = {
    agentId: uuidv4() as UUID,
    
    getSetting: (key: string) => {
      if (key in settings) return settings[key];
      // Default API keys for testing
      if (key === "XAI_API_KEY") return null;
      if (key === "OPENSEA_API_KEY") return null;
      return null;
    },

    getService: (name: string) => {
      return services[name] || null;
    },

    useModel: options?.useModel || defaultUseModel,

    getCache: async () => undefined,
    setCache: async () => true,
    deleteCache: async () => true,

    // Memory operations (minimal mocks)
    getMemories: async () => [],
    createMemory: async () => uuidv4() as UUID,
    searchMemories: async () => [],

    // Entity operations
    getEntityById: async () => null,

    // Room operations
    getRoom: async () => null,

    // Logging
    log: async () => {},

    // Character
    character: {
      name: "VINCE",
      bio: "Test character",
    },
  } as unknown as IAgentRuntime;

  return runtime;
}

// ==========================================
// Test Helpers
// ==========================================

/**
 * Helper to check if a validation function matches expected keywords
 */
export async function testValidationKeywords(
  action: { validate: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean> },
  keywords: string[],
  shouldMatch: boolean = true
): Promise<{ keyword: string; result: boolean; expected: boolean }[]> {
  const runtime = createMockRuntime();
  const results: { keyword: string; result: boolean; expected: boolean }[] = [];

  for (const keyword of keywords) {
    const message = createMockMessage(keyword);
    const result = await action.validate(runtime, message);
    results.push({ keyword, result, expected: shouldMatch });
  }

  return results;
}

/**
 * Helper to test handler execution without errors
 */
export async function testHandlerExecution(
  action: { handler: Function },
  runtime?: IAgentRuntime,
  message?: Memory
): Promise<{ success: boolean; error?: Error; responses: Content[] }> {
  const rt = runtime || createMockRuntime();
  const msg = message || createMockMessage("test");
  const state = createMockState();
  const callback = createMockCallback();

  try {
    await action.handler(rt, msg, state, {}, callback);
    return { success: true, responses: callback.calls };
  } catch (error) {
    return { success: false, error: error as Error, responses: callback.calls };
  }
}
