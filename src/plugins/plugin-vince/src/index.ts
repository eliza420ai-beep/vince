/**
 * VINCE Plugin - Unified Data Intelligence
 * 
 * Consolidates all working data sources into a single coherent system:
 * 
 * TRADING DATA:
 * - CoinGlassService - Hobbyist API: L/S ratio, funding, OI, fear/greed
 * - CoinGeckoService - FREE: Exchange health, liquidity
 * - MarketDataService - Enriched context (RSI, volatility, regime)
 * - SignalAggregatorService - Aggregates signals from all sources
 * - TopTradersService - Whale wallet tracking via Hyperliquid
 * - NewsSentimentService - News impact and Mandominutes
 * 
 * MEMETICS DATA:
 * - DexScreenerService - Hot memes on SOLANA + BASE
 * - MeteoraService - LP pool discovery for DCA strategy
 * 
 * LIFESTYLE + ART:
 * - LifestyleService - Daily suggestions based on day of week
 * - NFTFloorService - Floor tracking for ~12 curated collections
 * 
 * @module @elizaos/plugin-vince
 */

import type { Plugin, IAgentRuntime } from "@elizaos/core";
import type { Service } from "@elizaos/core";
import { logger } from "@elizaos/core";

// Services - Data Sources
import { VinceCoinGlassService } from "./services/coinglass.service";
import { VinceCoinGeckoService } from "./services/coingecko.service";
import { VinceMarketDataService } from "./services/marketData.service";
import { VinceSignalAggregatorService } from "./services/signalAggregator.service";
import { VinceTopTradersService } from "./services/topTraders.service";
import { VinceNewsSentimentService } from "./services/newsSentiment.service";
import { VinceDexScreenerService } from "./services/dexscreener.service";
import { VinceMeteoraService } from "./services/meteora.service";
import { VinceNFTFloorService } from "./services/nftFloor.service";
import { VinceLifestyleService } from "./services/lifestyle.service";
import { VinceDeribitService } from "./services/deribit.service";
import { VinceNansenService } from "./services/nansen.service";
import { VinceSanbaseService } from "./services/sanbase.service";
import { VinceBinanceService } from "./services/binance.service";
import { VinceBinanceLiquidationService } from "./services/binanceLiquidation.service";
import { VinceHIP3Service } from "./services/hip3.service";
import { VinceWatchlistService } from "./services/watchlist.service";
import { VinceAlertService } from "./services/alert.service";

// Fallback services factory (for external service source tracking)
import { initializeFallbackServices, getServiceSources, clearServiceSources, getOrCreateHyperliquidService } from "./services/fallbacks";
import { startBox, endBox, logLine, logEmpty, sep } from "./utils/boxLogger";

// Services - Paper Trading Bot
import { VincePaperTradingService } from "./services/vincePaperTrading.service";
import { VincePositionManagerService } from "./services/vincePositionManager.service";
import { VinceRiskManagerService } from "./services/vinceRiskManager.service";
import { VinceTradeJournalService } from "./services/vinceTradeJournal.service";
import { VinceMarketRegimeService } from "./services/marketRegime.service";
import { VinceGoalTrackerService } from "./services/goalTracker.service";

// Services - Self-Improving Architecture
import { VinceParameterTunerService } from "./services/parameterTuner.service";
import { VinceImprovementJournalService } from "./services/improvementJournal.service";

// Services - ML Enhancement (V4)
import { VinceFeatureStoreService } from "./services/vinceFeatureStore.service";
import { VinceWeightBanditService } from "./services/weightBandit.service";
import { VinceSignalSimilarityService } from "./services/signalSimilarity.service";
import { VinceMLInferenceService } from "./services/mlInference.service";

// Actions
import { vinceGmAction } from "./actions/gm.action";
import { vinceAlohaAction } from "./actions/aloha.action";
import { vinceOptionsAction } from "./actions/options.action";
import { vincePerpsAction } from "./actions/perps.action";
import { vinceMemesAction } from "./actions/memes.action";
import { vinceAirdropsAction } from "./actions/airdrops.action";
import { vinceLifestyleAction } from "./actions/lifestyle.action";
import { vinceNftFloorAction } from "./actions/nftFloor.action";
import { vinceIntelAction } from "./actions/intel.action";
import { vinceNewsAction } from "./actions/news.action";
import { vinceHIP3Action } from "./actions/hip3.action";

// Actions - Paper Trading Bot
import { vinceBotStatusAction } from "./actions/vinceBotStatus.action";
import { vinceBotPauseAction } from "./actions/vinceBotPause.action";
import { vinceWhyTradeAction } from "./actions/vinceWhyTrade.action";
import { vinceBotAction } from "./actions/bot.action";

// Actions - Knowledge
import { vinceUploadAction } from "./actions/upload.action";

// Actions - Grok Expert (commented out - low value)
// import { vinceGrokExpertAction } from "./actions/grokExpert.action";

// Actions - Meme Deep Dive
import { vinceMemeDeepDiveAction } from "./actions/memeDeepDive.action";

// Actions - Early Detection System
import { vinceWatchlistAction } from "./actions/watchlist.action";
import { vinceAlertsAction } from "./actions/alerts.action";

// Providers
import { vinceContextProvider } from "./providers/vinceContext.provider";
import { trenchKnowledgeProvider } from "./providers/trenchKnowledge.provider";
import { teammateContextProvider } from "./providers/teammateContext.provider";

// Tasks
// import { registerGrokExpertTask } from "./tasks/grokExpert.tasks";
import { registerTrainOnnxTask } from "./tasks/trainOnnx.tasks";

// Evaluators - Self-Improving Architecture
import { tradePerformanceEvaluator } from "./evaluators/tradePerformance.evaluator";

// Schema for PGLite/Postgres paper trades table (runtime migrations)
import { paperTradesSchema } from "./schema/paperTrades";

// ==========================================
// Plugin Definition
// ==========================================

export const vincePlugin: Plugin = {
  name: "plugin-vince",
  description: 
    "Unified data intelligence for VINCE agent. " +
    "Consolidates: Deribit, Nansen, Sanbase, CoinGlass, CoinGecko, DexScreener, Meteora, NFT floors, Lifestyle. " +
    "Core assets: BTC, ETH, SOL, HYPE + HIP-3 tokens. Focus: OPTIONS, PERPS, MEMETICS, AIRDROPS, LIFESTYLE, ART.",

  /** Drizzle schema for plugin_vince.paper_bot_features (PGLite/Postgres). */
  schema: paperTradesSchema,

  // Services - all data sources
  services: [
    VinceCoinGlassService,
    VinceCoinGeckoService,
    VinceMarketDataService,
    VinceSignalAggregatorService,
    VinceTopTradersService,
    VinceNewsSentimentService,
    VinceDexScreenerService,
    VinceMeteoraService,
    VinceNFTFloorService,
    VinceLifestyleService,
    VinceDeribitService,
    VinceNansenService,
    VinceSanbaseService,
    VinceBinanceService,
    VinceBinanceLiquidationService,
    VinceMarketRegimeService,
    VinceHIP3Service,
    // Early Detection System
    VinceWatchlistService,
    VinceAlertService,
    // Paper Trading Bot (order matters - dependencies first)
    VinceRiskManagerService,
    VinceTradeJournalService,
    VinceGoalTrackerService,   // Goal-aware trading KPI system
    VincePositionManagerService,
    VincePaperTradingService,
    // Self-Improving Architecture
    VinceParameterTunerService,
    VinceImprovementJournalService,
    // ML Enhancement (V4) — FeatureStore uses storeConfig; cast so Plugin services array accepts it
    VinceFeatureStoreService as typeof Service,
    VinceWeightBanditService,
    VinceSignalSimilarityService,
    VinceMLInferenceService,
  ],
  
  // Actions - focus areas + paper trading bot controls
  actions: [
    vinceGmAction,
    vinceAlohaAction,
    vinceOptionsAction,
    vincePerpsAction,
    vinceMemesAction,
    vinceAirdropsAction,
    vinceLifestyleAction,
    vinceNftFloorAction,
    vinceIntelAction,
    vinceNewsAction,
    vinceHIP3Action,
    // Paper Trading Bot
    vinceBotStatusAction,
    vinceBotPauseAction,
    vinceWhyTradeAction,
    vinceBotAction,
    // Knowledge Upload
    vinceUploadAction,
    // Grok Expert (commented out - low value)
    // vinceGrokExpertAction,
    // Meme Deep Dive
    vinceMemeDeepDiveAction,
    // Early Detection System
    vinceWatchlistAction,
    vinceAlertsAction,
  ],
  
  // Providers - unified context (teammate loads first so IDENTITY/USER/SOUL/TOOLS/MEMORY are always in context)
  providers: [
    teammateContextProvider,
    vinceContextProvider,
    trenchKnowledgeProvider,
  ],
  
  // Evaluators - Self-Improving Architecture
  evaluators: [
    tradePerformanceEvaluator,
  ],
  
  // Plugin initialization with live market data dashboard
  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    // Fetch live prices for dashboard
    let prices: { btc?: number; eth?: number; sol?: number; hype?: number } = {};
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,hyperliquid&vs_currencies=usd&include_24hr_change=true",
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        prices = {
          btc: data.bitcoin?.usd,
          eth: data.ethereum?.usd,
          sol: data.solana?.usd,
          hype: data.hyperliquid?.usd,
        };
      }
    } catch {
      // Silent fallback - prices will show as "..."
    }

    const formatPrice = (p: number | undefined) => {
      if (!p) return "...";
      if (p >= 1000) return `$${(p / 1000).toFixed(1)}K`;
      return `$${p.toFixed(2)}`;
    };

    const btcStr = formatPrice(prices.btc);
    const ethStr = formatPrice(prices.eth);
    const solStr = formatPrice(prices.sol);
    const hypeStr = formatPrice(prices.hype);

    // Banner (same box style as paper trade-opened and dashboards)
    startBox();
    logLine("   ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗");
    logLine("   ██║   ██║██║████╗  ██║██╔════╝██╔════╝");
    logLine("   ██║   ██║██║██╔██╗ ██║██║     █████╗");
    logLine("   ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝");
    logLine("    ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗");
    logLine("     ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝");
    logEmpty();
    logLine("   UNIFIED DATA INTELLIGENCE");
    logEmpty();
    sep();
    logEmpty();
    logLine("   MARKET PULSE");
    logLine(`   ├─ BTC: ${btcStr}  ETH: ${ethStr}  SOL: ${solStr}`);
    logLine(`   └─ HYPE: ${hypeStr}`);
    logEmpty();
    sep();
    logEmpty();
    logLine("   FOCUS AREAS");
    logLine("   ├─ OPTIONS    Covered calls / secured puts (Hypersurface)");
    logLine("   ├─ PERPS      LLM narrative + paper bot (Hyperliquid)");
    logLine("   ├─ HIP-3      Stocks, commodities, indices (34 assets)");
    logLine("   ├─ PAPER BOT  Signal-following with risk management");
    logLine("   ├─ NEWS       MandoMinutes sentiment analysis");
    logLine("   ├─ MEMETICS   Hot memes BASE + SOL (DexScreener)");
    logLine("   ├─ AIRDROPS   treadfi focus");
    logLine("   ├─ DEFI       PENDLE, AAVE, UNI knowledge");
    logLine("   ├─ LIFESTYLE  Daily suggestions");
    logLine("   ├─ ART        NFT floors (CryptoPunks, Meridian)");
    logEmpty();
    sep();
    logEmpty();
    logLine("   DATA SOURCES");
    logLine("   ├─ MandoMins   News sentiment, risk events");
    logLine("   ├─ Deribit     Options IV, Greeks, strikes");
    logLine("   ├─ Hyperliquid Perps, top traders");
    logLine("   ├─ CoinGlass   Funding, OI, L/S ratio");
    logLine("   ├─ CoinGecko   Prices, exchange health");
    logLine("   ├─ Binance     Top traders, taker flow, liqs (FREE!)");
    logLine("   ├─ DexScreener Meme scanner, traction");
    logLine("   ├─ Meteora     LP pools, DCA strategy");
    logLine("   ├─ Nansen      Smart money (100 credits)");
    logLine("   └─ Sanbase     On-chain analytics (1K/mo)");
    endBox();
    
    logger.info("[VINCE] Plugin initialized successfully");

    // Initialize fallback services and log which are external vs built-in
    clearServiceSources(); // Clear any previous state
    initializeFallbackServices(runtime);
    const serviceSources = getServiceSources();
    
    const externalServices = serviceSources
      .filter((s) => s.source === "external")
      .map((s) => {
        switch (s.name) {
          case "deribit": return "Deribit (DVOL, P/C ratio)";
          case "hyperliquid": return "Hyperliquid (funding, crowding)";
          case "opensea": return "OpenSea (NFT floors)";
          // case "xai": return "XAI (Grok)";
          case "browser": return "Browser (news)";
          default: return s.name;
        }
      });
    const fallbackServices = serviceSources
      .filter((s) => s.source === "fallback")
      .map((s) => {
        switch (s.name) {
          case "deribit": return "Deribit";
          case "hyperliquid": return "Hyperliquid";
          case "opensea": return "OpenSea";
          // case "xai": return "XAI";
          case "browser": return "Browser";
          default: return s.name;
        }
      });
    
    // Check if XAI is configured (Grok Expert commented out)
    // const xaiConfigured = serviceSources.find((s) => s.name === "xai") !== undefined;

    if (externalServices.length > 0) {
      console.log(`  [VINCE] ✅ Using external plugins: ${externalServices.join(", ")}`);
    }
    if (fallbackServices.length > 0) {
      console.log(`  [VINCE] 🔄 Using built-in API fallbacks: ${fallbackServices.join(", ")}`);
    }
    // Signal sources available for aggregator (see SIGNAL_SOURCES.md)
    const signalSourceChecks: [string, string][] = [
      ["VINCE_COINGLASS_SERVICE", "CoinGlass"],
      ["VINCE_TOP_TRADERS_SERVICE", "TopTraders"],
      ["VINCE_BINANCE_SERVICE", "Binance"],
      ["VINCE_BINANCE_LIQUIDATION_SERVICE", "BinanceLiquidations"],
      ["VINCE_NEWS_SENTIMENT_SERVICE", "NewsSentiment"],
      ["VINCE_DERIBIT_SERVICE", "Deribit"],
      ["VINCE_MARKET_DATA_SERVICE", "MarketRegime"],
      ["VINCE_SANBASE_SERVICE", "Sanbase"],
    ];
    const availableSources = signalSourceChecks
      .filter(([type]) => !!runtime.getService(type))
      .map(([, label]) => label);
    console.log(`  [VINCE] 📡 Signal sources available: ${availableSources.length}/${signalSourceChecks.length} (${availableSources.join(", ")})`);
    console.log(`  [VINCE]    Confirm contributing sources in logs: [VinceSignalAggregator] ASSET: N source(s) → M factors | Sources: ...`);
    // if (!xaiConfigured) {
    //   console.log(`  [VINCE] ⚠️  XAI not configured (add XAI_API_KEY for Grok Expert)`);
    // }
    console.log("");

    // Verify Hyperliquid API connection (async, non-blocking)
    (async () => {
      try {
        const hlService = getOrCreateHyperliquidService(runtime);
        if (hlService && typeof (hlService as any).testConnection === "function") {
          const testResult = await (hlService as any).testConnection();
          if (testResult.success) {
            console.log(`  [VINCE] 🔗 Hyperliquid API: ${testResult.message}`);
            if (testResult.data) {
              const { btcFunding8h, ethFunding8h } = testResult.data;
              console.log(`  [VINCE]    BTC funding: ${btcFunding8h !== null ? (btcFunding8h * 100).toFixed(4) + "%" : "N/A"} | ETH: ${ethFunding8h !== null ? (ethFunding8h * 100).toFixed(4) + "%" : "N/A"}`);
            }
          } else {
            console.log(`  [VINCE] ⚠️  Hyperliquid API: ${testResult.message}`);
          }
        }
      } catch (e) {
        console.log(`  [VINCE] ⚠️  Hyperliquid API test failed: ${e}`);
      }
    })();

    // Register Grok Expert daily task (commented out - low value)
    // try {
    //   await registerGrokExpertTask(runtime);
    //   logger.info("[VINCE] Grok Expert daily task registered");
    // } catch (e) {
    //   logger.warn("[VINCE] Failed to register Grok Expert task:", e);
    // }

    // ONNX training: when feature store has 90+ complete trades, train models (runs on schedule, max once per 24h)
    try {
      await registerTrainOnnxTask(runtime);
    } catch (e) {
      logger.warn("[VINCE] Failed to register ONNX training task:", e);
    }
  },
};

export default vincePlugin;

// ==========================================
// Type Exports
// ==========================================

export * from "./types/index";

// ==========================================
// Service Exports
// ==========================================

export { VinceCoinGlassService } from "./services/coinglass.service";
export { VinceCoinGeckoService } from "./services/coingecko.service";
export { VinceMarketDataService } from "./services/marketData.service";
export { VinceSignalAggregatorService } from "./services/signalAggregator.service";
export { VinceTopTradersService } from "./services/topTraders.service";
export { VinceNewsSentimentService } from "./services/newsSentiment.service";
export { VinceDexScreenerService } from "./services/dexscreener.service";
export { VinceMeteoraService } from "./services/meteora.service";
export { VinceNFTFloorService } from "./services/nftFloor.service";
export { VinceLifestyleService } from "./services/lifestyle.service";
export { VinceDeribitService } from "./services/deribit.service";
export { VinceNansenService } from "./services/nansen.service";
export { VinceSanbaseService } from "./services/sanbase.service";
export { VinceBinanceService } from "./services/binance.service";
export { VinceBinanceLiquidationService } from "./services/binanceLiquidation.service";
export { VincePaperTradingService } from "./services/vincePaperTrading.service";
export { VincePositionManagerService } from "./services/vincePositionManager.service";
export { VinceRiskManagerService } from "./services/vinceRiskManager.service";
export { VinceTradeJournalService } from "./services/vinceTradeJournal.service";
export { VinceGoalTrackerService } from "./services/goalTracker.service";
export { VinceHIP3Service } from "./services/hip3.service";
export { VinceWatchlistService } from "./services/watchlist.service";
export { VinceAlertService } from "./services/alert.service";
export { VinceParameterTunerService } from "./services/parameterTuner.service";
export { VinceImprovementJournalService } from "./services/improvementJournal.service";

// ==========================================
// Target Assets Exports
// ==========================================

export * from "./constants/targetAssets";

// ==========================================
// Action Exports
// ==========================================

export { vinceGmAction } from "./actions/gm.action";
export { vinceAlohaAction } from "./actions/aloha.action";
export { vinceOptionsAction } from "./actions/options.action";
export { vincePerpsAction } from "./actions/perps.action";
export { vinceMemesAction } from "./actions/memes.action";
export { vinceAirdropsAction } from "./actions/airdrops.action";
export { vinceLifestyleAction } from "./actions/lifestyle.action";
export { vinceNftFloorAction } from "./actions/nftFloor.action";
export { vinceIntelAction } from "./actions/intel.action";
export { vinceNewsAction } from "./actions/news.action";
export { vinceHIP3Action } from "./actions/hip3.action";
export { vinceBotStatusAction } from "./actions/vinceBotStatus.action";
export { vinceBotPauseAction } from "./actions/vinceBotPause.action";
export { vinceWhyTradeAction } from "./actions/vinceWhyTrade.action";
export { vinceBotAction } from "./actions/bot.action";
export { vinceUploadAction } from "./actions/upload.action";
// export { vinceGrokExpertAction } from "./actions/grokExpert.action";
export { vinceMemeDeepDiveAction } from "./actions/memeDeepDive.action";
export { vinceWatchlistAction } from "./actions/watchlist.action";
export { vinceAlertsAction } from "./actions/alerts.action";

// ==========================================
// Provider Exports
// ==========================================

export { vinceContextProvider } from "./providers/vinceContext.provider";
export { trenchKnowledgeProvider } from "./providers/trenchKnowledge.provider";
export { teammateContextProvider } from "./providers/teammateContext.provider";

// ==========================================
// Analysis Exports
// ==========================================

export { BullBearAnalyzer, getBullBearAnalyzer } from "./analysis/bullBearAnalyzer";

// ==========================================
// Evaluator Exports
// ==========================================

export { tradePerformanceEvaluator } from "./evaluators/tradePerformance.evaluator";

// ==========================================
// Config Exports (Self-Improving Architecture)
// ==========================================
// Explicit exports to avoid re-exporting SignalThresholds (already from types/analysis)
export {
  dynamicConfig,
  initializeDynamicConfig,
  getThresholds,
  getSourceWeight,
  meetsThresholds,
} from "./config/dynamicConfig";
export type { SourceWeights, AdjustmentRecord, TunedConfig } from "./config/dynamicConfig";
