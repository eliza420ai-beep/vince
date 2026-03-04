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
 * ART:
 * - NFTFloorService - Floor tracking for ~12 curated collections
 *
 * @module @elizaos/plugin-vince
 */

import type { Plugin, IAgentRuntime, TargetInfo, Content } from "@elizaos/core";
import type { Service } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { buildPulseResponse } from "./routes/dashboardPulse";
import {
  buildLeaderboardsResponse,
  buildDebugXSentimentResponse,
} from "./routes/dashboardLeaderboards";
import { buildPaperResponse } from "./routes/dashboardPaper";
import { buildUsageResponse } from "./routes/dashboardUsage";
import { buildKnowledgeResponse } from "./routes/dashboardKnowledge";
import { buildBankrResponse } from "./routes/dashboardBankr";

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
import { VinceDeribitService } from "./services/deribit.service";
import { VinceNansenService } from "./services/nansen.service";
import { VinceSanbaseService } from "./services/sanbase.service";
import { VinceBinanceService } from "./services/binance.service";
import { VinceBinanceLiquidationService } from "./services/binanceLiquidation.service";
import { VinceAlliumService } from "./services/allium.service";
import { VinceHIP3Service } from "./services/hip3.service";
import { VinceHLCryptoSnapshotService } from "./services/hlCryptoSnapshot.service";
import { VinceWatchlistService } from "./services/watchlist.service";
import { VinceNotificationService } from "./services/notification.service";
import { VinceAlertService } from "./services/alert.service";
import { VinceXResearchService } from "./services/xResearch.service";
import { VinceXSentimentService } from "./services/xSentiment.service";
import { VincePolymarketSentimentService } from "./services/polymarketSentiment.service";

// Fallback services factory (for external service source tracking)
import {
  initializeFallbackServices,
  getServiceSources,
  clearServiceSources,
  getOrCreateHyperliquidService,
} from "./services/fallbacks";
import {
  DeribitServiceAlias,
  HyperliquidServiceAlias,
} from "./services/fallbacks/aliasServices";
import { startBox, endBox, logLine, logEmpty, sep } from "./utils/boxLogger";
import { isVinceAgent, getStartupSummaryLine } from "./utils/dashboard";

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
import { SwarmCoordinationService } from "./services/swarmCoordination.service";

// Services - Phase 5: The Genome (V4.2.0)
import { VinceRegimeProfilesService } from "./services/vinceRegimeProfiles.service";
import { VinceCounterfactualService } from "./services/vinceCounterfactual.service";
import { VinceGenomeService } from "./services/vinceGenome.service";
import { VincePortfolioConstructionService } from "./services/vincePortfolioConstruction.service";
import { GrokSignalExtractorService } from "./services/grokSignalExtractor.service";
import { VincePreMortemService } from "./services/vincePreMortem.service";
import { VinceWarRoomService } from "./services/vinceWarRoom.service";
import { PredictionTrackerService } from "./services/predictionTracker.service";
import { VinceDevilsAdvocateService } from "./services/vinceDevilsAdvocate.service";
import { VinceNarrativeRadarService } from "./services/vinceNarrativeRadar.service";
import { VinceTemporalCoherenceService } from "./services/vinceTemporalCoherence.service";
import { VinceImmuneSystemService } from "./services/vinceImmuneSystem.service";
import { VinceSwarmInsightsService } from "./services/vinceSwarmInsights.service";
import { VinceSwarmOrchestratorService } from "./services/vinceSwarmOrchestrator.service";
import { VinceUpliftEvaluatorService } from "./services/vinceUpliftEvaluator.service";
import { VinceDataSufficiencyService } from "./services/vinceDataSufficiency.service";
import { VinceSourceQualityService } from "./services/vinceSourceQuality.service";
import { VinceProofCapitalAllocatorService } from "./services/vinceProofCapitalAllocator.service";
import { VincePostMortemPolicyLoopService } from "./services/vincePostMortemPolicyLoop.service";

// Actions
import { vinceGmAction } from "./actions/gm.action";
import { vinceAlohaAction } from "./actions/aloha.action";
import { vinceFundingPulseAction } from "./actions/fundingPulse.action";
import { vinceRegimeAction } from "./actions/regime.action";
import { vinceBotVerdictAction } from "./actions/botVerdict.action";
import { vinceOptionsAction } from "./actions/options.action";
import { vincePerpsAction } from "./actions/perps.action";
import { vinceMemesAction } from "./actions/memes.action";
import { vinceAirdropsAction } from "./actions/airdrops.action";
import { vinceNftFloorAction } from "./actions/nftFloor.action";
import { vinceIntelAction } from "./actions/intel.action";
import { vinceNewsAction } from "./actions/news.action";
import { vinceReportAction } from "./actions/report.action";
import { vinceDailyStandupAction } from "./actions/dailyStandup.action";
import { vinceHIP3Action } from "./actions/hip3.action";
import {
  vinceHlCryptoAction,
  printHlCryptoDashboard,
} from "./actions/hlCrypto.action";
import { vinceChatAction } from "./actions/chat.action";

// Actions - Paper Trading Bot
import { vinceBotStatusAction } from "./actions/vinceBotStatus.action";
import { vinceBotPauseAction } from "./actions/vinceBotPause.action";
import { vinceWhyTradeAction } from "./actions/vinceWhyTrade.action";
import { vinceBotAction } from "./actions/bot.action";
import { vincePostMortemAction } from "./actions/vincePostMortem.action";
import { vinceSentimentCheckAction } from "./actions/vinceSentimentCheck.action";
import { vincePredictionCalibrationAction } from "./actions/predictionCalibration.action";

// Actions - Knowledge (ingestion moved to plugin-eliza: UPLOAD, ADD_MICHELIN)
import { vinceCodeTaskAction } from "./actions/codeTask.action";

// Actions - Grok Expert (X vibe check in context; requires XAI_API_KEY)
import { closeRecommendationAction } from "./actions/closeRecommendation.action";
import { vinceGrokExpertAction } from "./actions/grokExpert.action";

// Actions - Meme Deep Dive
import { vinceMemeDeepDiveAction } from "./actions/memeDeepDive.action";

// Actions - Early Detection System
import { vinceWatchlistAction } from "./actions/watchlist.action";
import { vinceAlertsAction } from "./actions/alerts.action";

// Providers
import { vinceContextProvider } from "./providers/vinceContext.provider";
import { trenchKnowledgeProvider } from "./providers/trenchKnowledge.provider";
import { teammateContextProvider } from "./providers/teammateContext.provider";
import { protocolWriteupProvider } from "./providers/protocolWriteup.provider";
import { echoSentimentProvider } from "./providers/echoSentiment.provider";
import { oracleRegimeProvider } from "./providers/oracleRegime.provider";
import { bankrOrdersProvider } from "./providers/bankrOrders.provider";

// Tasks
import { registerGrokExpertTask } from "./tasks/grokExpert.tasks";
import { registerTrainOnnxTask } from "./tasks/trainOnnx.tasks";
import { registerDailyReportTask } from "./tasks/dailyReport.tasks";
import { registerNewsDailyTask } from "./tasks/newsDaily.tasks";
import { registerPaperOpsTask } from "./tasks/paperOps.tasks";
import { registerHIP3DiscoveryTask } from "./tasks/hip3Discovery.tasks";

// Tasks - Phase 5: The Genome (V4.2.0)
import { registerCounterfactualWeeklyTask } from "./tasks/counterfactualWeekly.tasks";
import { registerGenomeEvolutionTask } from "./tasks/genomeEvolution.tasks";
import { registerPredictionValidationTask } from "./tasks/predictionValidation.tasks";

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
    "Consolidates: Deribit, Nansen, Sanbase, CoinGlass, CoinGecko, DexScreener, Meteora, NFT floors. " +
    "Core assets: BTC, ETH, SOL, HYPE + HIP-3 tokens. Focus: OPTIONS, PERPS, MEMETICS, AIRDROPS, ART. Lifestyle: ask Kelly.",

  /** Drizzle schema for plugin_vince.paper_bot_features (PGLite/Postgres). */
  schema: paperTradesSchema,

  // Services - all data sources
  // DeribitServiceAlias/HyperliquidServiceAlias: register under DERIBIT_SERVICE/HYPERLIQUID_SERVICE so
  // runtime.getService() never returns null when external plugins aren't loaded. Must be in services
  // array (not init registerService) to avoid blocking initPromise → 30s timeout deadlock.
  // Cast via unknown: start() returns fallback impls (IDeribitService/IHyperliquidService), not Service subclass.
  // Plugin.services expects ServiceClass[]; Service is abstract so we cast the array.
  services: [
    DeribitServiceAlias as unknown as typeof Service,
    HyperliquidServiceAlias as unknown as typeof Service,
    VinceCoinGlassService,
    VinceCoinGeckoService,
    VinceMarketDataService,
    VinceSignalAggregatorService,
    VinceTopTradersService,
    VinceNewsSentimentService,
    VinceDexScreenerService,
    VinceMeteoraService,
    VinceNFTFloorService,
    VinceDeribitService,
    VinceNansenService,
    VinceSanbaseService,
    VinceBinanceService,
    VinceBinanceLiquidationService,
    VinceMarketRegimeService,
    VinceHIP3Service,
    VinceHLCryptoSnapshotService,
    // X services are data-only (paper bot sentiment, aggregator, leaderboard). In-chat X/CT research is Echo (plugin-x-research).
    VinceXResearchService,
    VinceXSentimentService, // X sentiment for paper algo (staggered: one asset per hour by default, cache 24h)
    VincePolymarketSentimentService, // Prediction-market sentiment from Polymarket (BTC/ETH/SOL/macro/stocks); cache 15–30 min
    // Early Detection System
    VinceWatchlistService,
    VinceNotificationService,
    VinceAlertService,
    // Paper Trading Bot (order matters - dependencies first)
    VinceRiskManagerService,
    VinceTradeJournalService,
    VinceGoalTrackerService, // Goal-aware trading KPI system
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
    SwarmCoordinationService,
    // On-chain data (Allium API — DEX prices, Hyperliquid without rate limits, chain metrics)
    VinceAlliumService,
    // Phase 5: The Genome (V4.2.0)
    VinceRegimeProfilesService,
    VinceCounterfactualService,
    VinceGenomeService,
    VincePortfolioConstructionService,
    GrokSignalExtractorService,
    VincePreMortemService,
    VinceWarRoomService,
    VinceDevilsAdvocateService,
    VinceNarrativeRadarService,
    VinceTemporalCoherenceService,
    VinceImmuneSystemService,
    PredictionTrackerService,
    VinceSwarmInsightsService,
    VinceSwarmOrchestratorService,
    VinceUpliftEvaluatorService,
    VinceDataSufficiencyService,
    VinceSourceQualityService,
    VinceProofCapitalAllocatorService,
    VincePostMortemPolicyLoopService,
  ] as unknown as NonNullable<import("@elizaos/core").Plugin["services"]>,

  // Actions - focus areas + paper trading bot controls
  actions: [
    vinceGmAction,
    vinceAlohaAction,
    vinceFundingPulseAction,
    vinceRegimeAction,
    vinceBotVerdictAction,
    vinceOptionsAction,
    vincePerpsAction,
    vinceMemesAction,
    vinceAirdropsAction,
    vinceNftFloorAction,
    vinceIntelAction,
    vinceNewsAction,
    vinceReportAction,
    vinceDailyStandupAction,
    vinceHIP3Action,
    vinceHlCryptoAction,
    vinceChatAction,
    // Paper Trading Bot
    vinceBotStatusAction,
    vinceBotPauseAction,
    vinceWhyTradeAction,
    vincePostMortemAction,
    vinceSentimentCheckAction,
    vincePredictionCalibrationAction,
    vinceBotAction,
    vinceCodeTaskAction,
    vinceGrokExpertAction,
    closeRecommendationAction,
    // Meme Deep Dive
    vinceMemeDeepDiveAction,
    // Early Detection System
    vinceWatchlistAction,
    vinceAlertsAction,
  ],

  // API route: dashboard pulse (snapshot + LLM insight) for frontend
  routes: [
    {
      name: "vince-pulse",
      path: "/vince/pulse",
      type: "GET",
      handler: async (
        req: { params?: Record<string, string>; [k: string]: unknown },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
        runtime?: IAgentRuntime,
      ) => {
        const agentRuntime =
          runtime ??
          (req as any).runtime ??
          (req as any).agentRuntime ??
          (req as any).agent?.runtime;
        if (!agentRuntime) {
          res.status(503).json({
            error: "Pulse requires agent context",
            hint: "Use /api/agents/:agentId/plugins/vince/pulse (ElizaOS mounts plugin routes under /plugins).",
          });
          return;
        }
        try {
          const pulse = await buildPulseResponse(agentRuntime);
          res.json(pulse);
        } catch (err) {
          logger.warn(`[VINCE] Pulse route error: ${err}`);
          res.status(500).json({
            error: "Failed to build pulse",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
    {
      name: "vince-leaderboards",
      path: "/vince/leaderboards",
      type: "GET",
      handler: async (
        req: {
          params?: Record<string, string>;
          query?: Record<string, string>;
          [k: string]: unknown;
        },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
        runtime?: IAgentRuntime,
      ) => {
        const agentRuntime =
          runtime ??
          (req as any).runtime ??
          (req as any).agentRuntime ??
          (req as any).agent?.runtime;
        if (!agentRuntime) {
          res.status(503).json({
            error: "Leaderboards require agent context",
            hint: "Use /api/agents/:agentId/plugins/plugin-vince/vince/leaderboards",
          });
          return;
        }
        try {
          // Optional: allow callers (frontend News tab) to force a fresh
          // MandoMinutes refresh before building the leaderboards payload.
          const refreshNews = ((req.query ?? {})["refreshNews"] ?? "") === "1";
          if (refreshNews) {
            const newsSvc = agentRuntime.getService(
              "VINCE_NEWS_SENTIMENT_SERVICE",
            ) as VinceNewsSentimentService | null;
            if (newsSvc?.refreshData) {
              try {
                // Use hybrid cache-first refresh. Direct browser fetch remains
                // a fallback when no valid cache payload is available.
                await newsSvc.refreshData(false);
              } catch (e) {
                logger.debug(
                  `[VINCE] Leaderboards refreshNews failed: ${e instanceof Error ? e.message : String(e)}`,
                );
              }
            }
          }

          const data = await buildLeaderboardsResponse(agentRuntime);
          res.json(data);
        } catch (err) {
          logger.warn(`[VINCE] Leaderboards route error: ${err}`);
          res.status(500).json({
            error: "Failed to build leaderboards",
            message: err instanceof Error ? err.message : String(err),
          });
          return;
        }
      },
    },
    {
      name: "vince-hip3-snapshot",
      path: "/vince/hip3-snapshot",
      type: "GET",
      handler: async (
        _req: { params?: Record<string, string>; [k: string]: unknown },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
        runtime?: IAgentRuntime,
      ) => {
        const agentRuntime =
          runtime ??
          (_req as any).runtime ??
          (_req as any).agentRuntime ??
          (_req as any).agent?.runtime;
        if (!agentRuntime) {
          res.status(503).json({
            error: "HIP-3 snapshot requires agent context",
            hint: "Use /api/agents/:agentId/plugins/plugin-vince/vince/hip3-snapshot",
          });
          return;
        }
        try {
          const hip3 = agentRuntime.getService(
            "VINCE_HIP3_SERVICE",
          ) as VinceHIP3Service | null;
          const pulse = hip3?.getCachedPulse?.() ?? null;
          const status = hip3?.getStatus?.();
          res.json({
            updatedAt: status?.lastUpdate ?? null,
            available: !!pulse,
            status,
            pulse,
          });
        } catch (err) {
          logger.warn(`[VINCE] HIP-3 snapshot route error: ${err}`);
          res.status(500).json({
            error: "Failed to build HIP-3 snapshot",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
    {
      name: "vince-debug-x-sentiment",
      path: "/vince/debug/x-sentiment",
      type: "GET",
      handler: async (
        req: { params?: Record<string, string>; [k: string]: unknown },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
        runtime?: IAgentRuntime,
      ) => {
        const agentRuntime =
          runtime ??
          (req as any).runtime ??
          (req as any).agentRuntime ??
          (req as any).agent?.runtime;
        if (!agentRuntime) {
          res.status(503).json({
            error: "Debug X sentiment requires agent context",
            hint: "Use /api/agents/:agentId/plugins/plugin-vince/vince/debug/x-sentiment",
          });
          return;
        }
        try {
          const data = await buildDebugXSentimentResponse(agentRuntime);
          res.json(data);
        } catch (err) {
          logger.warn(`[VINCE] Debug X sentiment route error: ${err}`);
          res.status(500).json({
            error: "Failed to build debug X sentiment",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
    {
      name: "vince-prediction-calibration",
      path: "/vince/prediction-calibration",
      type: "GET",
      handler: async (
        req: {
          params?: Record<string, string>;
          query?: Record<string, string>;
          [k: string]: unknown;
        },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
        runtime?: IAgentRuntime,
      ) => {
        const agentRuntime =
          runtime ??
          (req as any).runtime ??
          (req as any).agentRuntime ??
          (req as any).agent?.runtime;
        if (!agentRuntime) {
          res.status(503).json({
            error: "Prediction calibration requires agent context",
            hint: "Use /api/agents/:agentId/plugins/plugin-vince/vince/prediction-calibration",
          });
          return;
        }
        try {
          const tracker = agentRuntime.getService(
            "VINCE_PREDICTION_TRACKER_SERVICE",
          ) as PredictionTrackerService | null;
          if (!tracker) {
            res.status(503).json({
              error: "Prediction tracker service unavailable",
            });
            return;
          }
          const windowRaw = (req.query ?? {})["windowDays"] ?? "30";
          const windowDays = Math.max(
            1,
            Math.min(180, Number.parseInt(String(windowRaw), 10) || 30),
          );
          const snapshot = tracker.getCalibrationSnapshot(windowDays);
          res.json(snapshot);
        } catch (err) {
          logger.warn(`[VINCE] Prediction calibration route error: ${err}`);
          res.status(500).json({
            error: "Failed to build prediction calibration snapshot",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
    {
      name: "vince-paper",
      path: "/vince/paper",
      type: "GET",
      handler: async (
        req: { params?: Record<string, string>; [k: string]: unknown },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
        runtime?: IAgentRuntime,
      ) => {
        const agentRuntime =
          runtime ??
          (req as any).runtime ??
          (req as any).agentRuntime ??
          (req as any).agent?.runtime;
        if (!agentRuntime) {
          res.status(503).json({
            error: "Paper trading data requires agent context",
            hint: "Use /api/agents/:agentId/plugins/plugin-vince/vince/paper",
          });
          return;
        }
        try {
          const data = await buildPaperResponse(agentRuntime);
          res.json(data);
        } catch (err) {
          logger.warn(`[VINCE] Paper route error: ${err}`);
          res.status(500).json({
            error: "Failed to build paper trading data",
            message: err instanceof Error ? err.message : String(err),
          });
          return;
        }
      },
    },
    {
      name: "vince-usage",
      path: "/vince/usage",
      type: "GET",
      handler: async (
        req: {
          params?: Record<string, string>;
          query?: Record<string, string>;
          [k: string]: unknown;
        },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
        runtime?: IAgentRuntime,
      ) => {
        const agentRuntime =
          runtime ??
          (req as any).runtime ??
          (req as any).agentRuntime ??
          (req as any).agent?.runtime;
        if (!agentRuntime) {
          res.status(503).json({
            error: "Usage data requires agent context",
            hint: "Use /api/agents/:agentId/plugins/plugin-vince/vince/usage",
          });
          return;
        }
        try {
          const query = (req.query ?? {}) as Record<string, string>;
          const data = await buildUsageResponse(
            agentRuntime,
            query.from,
            query.to,
            query.groupBy,
          );
          res.json(data);
        } catch (err) {
          logger.warn(`[VINCE] Usage route error: ${err}`);
          res.status(500).json({
            error: "Failed to build usage data",
            message: err instanceof Error ? err.message : String(err),
          });
          return;
        }
      },
    },
    {
      name: "vince-knowledge",
      path: "/vince/knowledge",
      type: "GET",
      handler: async (
        _req: { params?: Record<string, string>; [k: string]: unknown },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
      ) => {
        try {
          const data = buildKnowledgeResponse(process.cwd());
          res.json(data);
        } catch (err) {
          logger.warn(`[VINCE] Knowledge route error: ${err}`);
          res.status(500).json({
            error: "Failed to build knowledge overview",
            message: err instanceof Error ? err.message : String(err),
          });
          return;
        }
      },
    },
    {
      name: "vince-knowledge-quality-checklist",
      path: "/vince/knowledge-quality-checklist",
      type: "GET",
      handler: async (
        req: {
          params?: Record<string, string>;
          query?: Record<string, string>;
          [k: string]: unknown;
        },
        res: {
          status: (n: number) => {
            json: (o: object) => void;
            setHeader: (k: string, v: string) => unknown;
            send: (s: string) => void;
          };
          json: (o: object) => void;
        },
      ) => {
        try {
          const fs = await import("fs");
          const pathMod = await import("path");
          const outPath = pathMod.join(
            process.cwd(),
            "knowledge",
            "internal-docs",
            "KNOWLEDGE-QUALITY-CHECKLIST.md",
          );
          if (!fs.existsSync(outPath)) {
            res
              .status(404)
              .json({ error: "KNOWLEDGE-QUALITY-CHECKLIST.md not found" });
            return;
          }
          const content = fs.readFileSync(outPath, "utf8");
          const raw = (req.query as Record<string, string>)?.["raw"] === "1";
          if (raw) {
            const r = res as {
              setHeader?: (k: string, v: string) => void;
              send?: (s: string) => void;
            };
            r.setHeader?.("Content-Type", "text/markdown; charset=utf-8");
            r.send?.(content);
            return;
          }
          res.json({
            content,
            path: "knowledge/internal-docs/KNOWLEDGE-QUALITY-CHECKLIST.md",
          });
        } catch (err) {
          logger.warn(
            `[VINCE] Knowledge quality checklist route error: ${err}`,
          );
          res
            .status(500)
            .json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    },
    {
      name: "vince-knowledge-quality-results",
      path: "/vince/knowledge-quality-results",
      type: "GET",
      handler: async (
        _req: { params?: Record<string, string>; [k: string]: unknown },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
      ) => {
        try {
          const fs = await import("fs");
          const path = await import("path");
          const outPath = path.join(
            process.cwd(),
            "data",
            "knowledge-quality-results.json",
          );
          if (!fs.existsSync(outPath)) {
            res.status(404).json({
              error: "No knowledge quality results yet",
              hint: "Run: RUN_NETWORK_TESTS=1 bun test src/plugins/plugin-vince/src/__tests__/knowledgeQuality.e2e.test.ts",
            });
            return;
          }
          const raw = fs.readFileSync(outPath, "utf8");
          const data = JSON.parse(raw);
          const historyPath = path.join(
            process.cwd(),
            "data",
            "knowledge-quality-history.json",
          );
          if (fs.existsSync(historyPath)) {
            try {
              const historyRaw = fs.readFileSync(historyPath, "utf8");
              data.history = JSON.parse(historyRaw).slice(0, 3);
            } catch {
              data.history = [];
            }
          } else {
            data.history = [];
          }
          res.json(data);
        } catch (err) {
          logger.warn(`[VINCE] Knowledge quality results route error: ${err}`);
          res.status(500).json({
            error: "Failed to read knowledge quality results",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
    {
      name: "vince-bankr",
      path: "/vince/bankr",
      type: "GET",
      handler: async (
        req: { params?: Record<string, string>; [k: string]: unknown },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
        runtime?: IAgentRuntime,
      ) => {
        const agentRuntime =
          runtime ??
          (req as any).runtime ??
          (req as any).agentRuntime ??
          (req as any).agent?.runtime;
        if (!agentRuntime) {
          res.status(503).json({
            error: "BANKR data requires agent context",
            hint: "Use /api/agents/:agentId/plugins/plugin-vince/vince/bankr",
          });
          return;
        }
        try {
          const data = await buildBankrResponse(agentRuntime);
          res.json(data);
        } catch (err) {
          logger.warn(`[VINCE] BANKR route error: ${err}`);
          res.status(500).json({
            error: "Failed to build BANKR data",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
  ],

  // Providers - unified context (teammate loads first so IDENTITY/USER/SOUL/TOOLS/MEMORY are always in context)
  providers: [
    teammateContextProvider,
    protocolWriteupProvider,
    vinceContextProvider,
    trenchKnowledgeProvider,
    bankrOrdersProvider, // Cross-agent: active BANKR orders from Otaku
    echoSentimentProvider, // Cross-agent: Echo CT sentiment (dynamic)
    oracleRegimeProvider, // Cross-agent: Oracle Polymarket regime (dynamic)
  ],

  // Evaluators - Self-Improving Architecture
  evaluators: [tradePerformanceEvaluator],

  // Plugin initialization with live market data dashboard (VINCE only — Eliza also loads this plugin)
  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    // Register a no-op for "discord" so core doesn't log "Send handler not found".
    // NOTE: ElizaOS 1.x has a framework bug where the real Discord handler is never registered.
    // Do NOT replace with a deferred handler — it causes VinceNotificationService to blast all rooms.
    // The standup push calls the Discord service directly instead (see pushStandupSummaryToChannels).
    if (typeof runtime.registerSendHandler === "function") {
      const noOpDiscordHandler = async (
        _r: IAgentRuntime,
        _t: TargetInfo,
        _c: Content,
      ) => {};
      for (const key of ["discord", "Discord", "DISCORD"]) {
        runtime.registerSendHandler(key, noOpDiscordHandler);
      }
    }

    // Banner + MARKET PULSE: only for VINCE (Eliza also loads this plugin → would print twice)
    if (isVinceAgent(runtime)) {
      // Fetch live prices and 24h change from CoinGecko
      let prices: { btc?: number; eth?: number; sol?: number; hype?: number } =
        {};
      let changes: { btc?: number; eth?: number; sol?: number; hype?: number } =
        {};
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,hyperliquid&vs_currencies=usd&include_24hr_change=true",
          { signal: AbortSignal.timeout(5000) },
        );
        if (res.ok) {
          const data = await res.json();
          prices = {
            btc: data.bitcoin?.usd,
            eth: data.ethereum?.usd,
            sol: data.solana?.usd,
            hype: data.hyperliquid?.usd,
          };
          changes = {
            btc: data.bitcoin?.usd_24h_change,
            eth: data.ethereum?.usd_24h_change,
            sol: data.solana?.usd_24h_change,
            hype: data.hyperliquid?.usd_24h_change,
          };
        }
      } catch {
        // Silent fallback - prices will show as "..."
      }

      // Fetch Hyperliquid options pulse (funding, crowding, OI, vol) — HIP-3 style overview
      let optionsPulse: Awaited<
        ReturnType<
          NonNullable<
            ReturnType<typeof getOrCreateHyperliquidService>
          >["getOptionsPulse"]
        >
      > = null;
      try {
        const hlService = getOrCreateHyperliquidService(runtime);
        if (hlService && typeof hlService.getOptionsPulse === "function") {
          optionsPulse = await Promise.race([
            hlService.getOptionsPulse(),
            new Promise<null>((r) => setTimeout(() => r(null), 5000)),
          ]);
        }
      } catch {
        // Silent fallback
      }

      const formatPrice = (p: number | undefined) => {
        if (!p) return "...";
        if (p >= 1000) return `$${(p / 1000).toFixed(1)}K`;
        return `$${p.toFixed(2)}`;
      };
      const formatChange = (c: number | undefined) => {
        if (c == null || Number.isNaN(c)) return "";
        const s = c >= 0 ? `+${c.toFixed(2)}` : c.toFixed(2);
        return ` (${s}%)`;
      };
      const formatFunding = (f: number | undefined) =>
        f != null ? `${f >= 0 ? "+" : ""}${f.toFixed(2)}%` : "-";
      const formatOI = (v: number | undefined) => {
        if (v == null || v <= 0) return "";
        if (v >= 1e6) return ` OI ${(v / 1e6).toFixed(2)}M`;
        if (v >= 1e3) return ` OI ${(v / 1e3).toFixed(1)}k`;
        return "";
      };

      const assets = [
        {
          key: "btc" as const,
          symbol: "BTC",
          price: prices.btc,
          change: changes.btc,
        },
        {
          key: "eth" as const,
          symbol: "ETH",
          price: prices.eth,
          change: changes.eth,
        },
        {
          key: "sol" as const,
          symbol: "SOL",
          price: prices.sol,
          change: changes.sol,
        },
        {
          key: "hype" as const,
          symbol: "HYPE",
          price: prices.hype,
          change: changes.hype,
        },
      ];
      const assetLines: string[] = [];
      for (const a of assets) {
        const pulse = optionsPulse?.assets?.[a.key];
        const fund =
          pulse?.fundingAnnualized != null
            ? formatFunding(pulse.fundingAnnualized)
            : "";
        const crowd =
          pulse?.crowdingLevel && pulse.crowdingLevel !== "neutral"
            ? ` ${pulse.crowdingLevel.replace("extreme_", "ext ")}`
            : "";
        const oi =
          pulse?.openInterest != null ? formatOI(pulse.openInterest) : "";
        const parts = [
          `${a.symbol}: ${formatPrice(a.price)}${formatChange(a.change)}`,
        ];
        if (fund || crowd || oi) parts.push(` | fund ${fund}${crowd}${oi}`);
        assetLines.push("   ├─ " + parts.join(""));
      }
      const bias = optionsPulse?.overallBias?.toUpperCase() ?? "—";
      const crowded: string[] = [];
      for (const a of assets) {
        const c = optionsPulse?.assets?.[a.key]?.crowdingLevel;
        if (c === "extreme_long" || c === "long")
          crowded.push(`${a.symbol} longs`);
        if (c === "extreme_short" || c === "short")
          crowded.push(`${a.symbol} shorts`);
      }
      const leader = assets.reduce<{ sym: string; ch: number } | null>(
        (best, a) => {
          const ch = a.change ?? 0;
          if (best == null || ch > best.ch) return { sym: a.symbol, ch };
          return best;
        },
        null,
      );
      const tldrParts: string[] = [`Bias: ${bias}`];
      if (crowded.length)
        tldrParts.push(`Crowded: ${crowded.slice(0, 2).join(", ")}`);
      if (leader && Math.abs(leader.ch) > 0.1)
        tldrParts.push(
          `${leader.ch >= 0 ? "Leading" : "Dragging"}: ${leader.sym}`,
        );

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
      logLine("   MARKET PULSE (HL perps: BTC, ETH, SOL, HYPE)");
      for (const ln of assetLines) logLine(ln);
      logLine("   └─ TLDR: " + tldrParts.join(" | "));
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

      // Single aggregated startup summary (one line) after services have started
      setImmediate(() => {
        setTimeout(() => {
          const summary = getStartupSummaryLine(runtime);
          startBox();
          logLine("   VINCE startup: " + summary);
          endBox();
        }, 3500);
      });
    }

    logger.debug("[VINCE] Plugin initialized successfully");

    // DeribitServiceAlias / HyperliquidServiceAlias are in services array (not registered here) to
    // avoid blocking initPromise and causing 30s registration timeouts.

    // Initialize fallback services and log which are external vs built-in
    clearServiceSources(); // Clear any previous state
    initializeFallbackServices(runtime);
    const serviceSources = getServiceSources();

    const externalServices = serviceSources
      .filter((s) => s.source === "external")
      .map((s) => {
        switch (s.name) {
          case "deribit":
            return "Deribit (DVOL, P/C ratio)";
          case "hyperliquid":
            return "Hyperliquid (funding, crowding)";
          case "opensea":
            return "OpenSea (NFT floors)";
          // case "xai": return "XAI (Grok)";
          case "browser":
            return "Browser (news)";
          default:
            return s.name;
        }
      });
    const fallbackServices = serviceSources
      .filter((s) => s.source === "fallback")
      .map((s) => {
        switch (s.name) {
          case "deribit":
            return "Deribit";
          case "hyperliquid":
            return "Hyperliquid";
          case "opensea":
            return "OpenSea";
          // case "xai": return "XAI";
          case "browser":
            return "Browser";
          default:
            return s.name;
        }
      });

    // Check if XAI is configured (Grok Expert commented out)
    // const xaiConfigured = serviceSources.find((s) => s.name === "xai") !== undefined;

    if (externalServices.length > 0) {
      logger.debug(
        `  [VINCE] ✅ Using external plugins: ${externalServices.join(", ")}`,
      );
    }
    if (fallbackServices.length > 0) {
      logger.debug(
        `  [VINCE] 🔄 Using built-in API fallbacks: ${fallbackServices.join(", ")}`,
      );
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
    logger.debug(
      `  [VINCE] 📡 Signal sources available: ${availableSources.length}/${signalSourceChecks.length} (${availableSources.join(", ")})`,
    );

    // Improvement report → aggregator weights (THINGS TO DO #3): log top features, optionally align weights
    const { logAndApplyImprovementReportWeights } =
      await import("./utils/improvementReportWeights");
    const applyWeights =
      runtime.getSetting?.("VINCE_APPLY_IMPROVEMENT_WEIGHTS") === true ||
      runtime.getSetting?.("VINCE_APPLY_IMPROVEMENT_WEIGHTS") === "true";
    logAndApplyImprovementReportWeights(applyWeights).catch((e) =>
      logger.debug(`[VINCE] Improvement report weights: ${e}`),
    );
    logger.debug(
      `  [VINCE]    Confirm contributing sources in logs: [VinceSignalAggregator] ASSET: N source(s) → M factors | Sources: ...`,
    );

    // Verify Hyperliquid API + HL Crypto dashboard: VINCE only (Eliza shares plugin, skip duplicate output)
    if (isVinceAgent(runtime)) {
      (async () => {
        try {
          const hlService = getOrCreateHyperliquidService(runtime);
          if (
            hlService &&
            typeof (hlService as any).testConnection === "function"
          ) {
            const testResult = await (hlService as any).testConnection();
            if (testResult.success) {
              logger.debug(
                `  [VINCE] 🔗 Hyperliquid API: ${testResult.message}`,
              );
              if (testResult.data) {
                const { btcFunding8h, ethFunding8h } = testResult.data;
                logger.debug(
                  `  [VINCE]    BTC funding: ${btcFunding8h !== null ? (btcFunding8h * 100).toFixed(4) + "%" : "N/A"} | ETH: ${ethFunding8h !== null ? (ethFunding8h * 100).toFixed(4) + "%" : "N/A"}`,
                );
              }
            } else {
              logger.warn(
                `  [VINCE] ⚠️  Hyperliquid API: ${testResult.message}`,
              );
            }
          }
        } catch (e) {
          logger.warn(`  [VINCE] ⚠️  Hyperliquid API test failed: ${e}`);
        }
      })();

      // HL Crypto dashboard (HIP-3 style for all HL crypto perps) — async, non-blocking
      (async () => {
        try {
          const hlService = getOrCreateHyperliquidService(runtime);
          if (
            hlService &&
            typeof (hlService as any).getAllCryptoPulse === "function"
          ) {
            const pulse = await Promise.race([
              (hlService as any).getAllCryptoPulse(),
              new Promise<null>((r) => setTimeout(() => r(null), 8000)),
            ]);
            if (pulse?.assets?.length) {
              const dashboard = printHlCryptoDashboard(pulse);
              dashboard.split("\n").forEach((line) => logger.debug(line));
            }
          }
        } catch {
          // Silent — HL crypto dashboard is best-effort
        }
      })();
    }

    // Grok daily pulse: only VINCE registers this to avoid duplicate runs (e.g. Solus also loads plugin-vince)
    if (isVinceAgent(runtime)) {
      try {
        await registerGrokExpertTask(runtime);
        logger.debug("[VINCE] Grok Expert daily task registered");
      } catch (e) {
        logger.warn("[VINCE] Failed to register Grok Expert task:", e);
      }
    }

    // ONNX training: when feature store has 90+ complete trades, train models (runs on schedule, max once per 24h)
    // Only for VINCE; defer so db adapter is ready (SQL plugin may not have set it yet during parallel agent init)
    if (isVinceAgent(runtime)) {
      const tryRegister = async (attempt = 0) => {
        try {
          await registerTrainOnnxTask(runtime);
        } catch (e) {
          const msg = String((e as Error)?.message ?? e);
          const adapterMissing = /adapter|undefined is not an object/i.test(
            msg,
          );
          if (adapterMissing && attempt < 3) {
            setTimeout(() => tryRegister(attempt + 1), 500 * (attempt + 1));
          } else {
            logger.warn("[VINCE] Failed to register ONNX training task:", e);
          }
        }
      };
      setImmediate(() => tryRegister());
    }

    // Daily report: ALOHA + OPTIONS + PERPS + HIP-3 pushed to Discord/Slack (channels with "daily" in name)
    if (isVinceAgent(runtime)) {
      setImmediate(async () => {
        try {
          await registerDailyReportTask(runtime);
        } catch (e) {
          logger.warn("[VINCE] Failed to register daily report task:", e);
        }
      });
    }

    // News daily: MandoMinutes briefing pushed to Discord/Slack - only when Mando has updated (channels with "news" in name)
    if (isVinceAgent(runtime)) {
      setImmediate(async () => {
        try {
          await registerNewsDailyTask(runtime);
        } catch (e) {
          logger.warn("[VINCE] Failed to register news daily task:", e);
        }
      });
    }

    // Paper ops: deterministic 15m consistency + ops_summary.txt (optional push to #ops / #sentinel)
    if (isVinceAgent(runtime)) {
      setImmediate(async () => {
        try {
          await registerPaperOpsTask(runtime);
        } catch (e) {
          logger.warn("[VINCE] Failed to register paper ops task:", e);
        }
        try {
          await registerHIP3DiscoveryTask(runtime);
        } catch (e) {
          logger.warn("[VINCE] Failed to register HIP-3 discovery task:", e);
        }
      });
    }

    // Phase 5: Counterfactual Engine + Genome Evolution weekly tasks
    if (isVinceAgent(runtime)) {
      setImmediate(async () => {
        try {
          await registerCounterfactualWeeklyTask(runtime);
        } catch (e) {
          logger.warn("[VINCE] Failed to register counterfactual task:", e);
        }
        try {
          await registerGenomeEvolutionTask(runtime);
        } catch (e) {
          logger.warn("[VINCE] Failed to register genome evolution task:", e);
        }
        try {
          await registerPredictionValidationTask(runtime);
        } catch (e) {
          logger.warn(
            "[VINCE] Failed to register prediction validation task:",
            e,
          );
        }
      });
    }

    // Optional: stagger second Discord bot so both can connect in same process (see DISCORD.md).
    // When both Eliza and VINCE have Discord enabled, delaying VINCE init gives the first bot time to connect before the second starts.
    if (isVinceAgent(runtime)) {
      const elizaHasDiscord = !!(
        process.env.ELIZA_DISCORD_API_TOKEN?.trim() ||
        process.env.DISCORD_API_TOKEN?.trim()
      );
      const vinceHasDiscord =
        !!process.env.VINCE_DISCORD_API_TOKEN?.trim() &&
        !!process.env.VINCE_DISCORD_APPLICATION_ID?.trim();
      const delayMs = parseInt(
        process.env.DELAY_SECOND_DISCORD_MS ?? "3000",
        10,
      );
      if (
        elizaHasDiscord &&
        vinceHasDiscord &&
        !Number.isNaN(delayMs) &&
        delayMs > 0
      ) {
        logger.info(
          `[DISCORD] Staggering second bot: waiting ${delayMs}ms so both can connect (set DELAY_SECOND_DISCORD_MS=0 to disable).`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  },
};

/** Plugin variant without X API or real-time WebSockets — use for Solus so only VINCE uses X_BEARER_TOKEN (avoids rate-limit conflict) and only one Binance liquidation WebSocket runs. */
export const vincePluginNoX: Plugin = {
  ...vincePlugin,
  name: "plugin-vince-no-x",
  description:
    vincePlugin.description +
    " No X API or Binance WS (Solus). For X/CT research use Echo; VINCE uses X only as sentiment data for the paper bot when enabled.",
  services: (vincePlugin.services as unknown as (typeof Service)[]).filter(
    (s) =>
      s !== VinceXResearchService &&
      s !== VinceXSentimentService &&
      s !== VinceBinanceLiquidationService,
  ) as unknown as NonNullable<import("@elizaos/core").Plugin["services"]>,
  actions: vincePlugin.actions!.filter((a) => a.name !== "VINCE_X_RESEARCH"),
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
export { VinceNotificationService } from "./services/notification.service";
export { VinceAlertService } from "./services/alert.service";
export { VinceParameterTunerService } from "./services/parameterTuner.service";
export { VinceImprovementJournalService } from "./services/improvementJournal.service";
export { VincePostMortemPolicyLoopService } from "./services/vincePostMortemPolicyLoop.service";

// ==========================================
// Target Assets Exports
// ==========================================

export * from "./constants/targetAssets";

// ==========================================
// Action Exports
// ==========================================

export { vinceGmAction } from "./actions/gm.action";
export { vinceAlohaAction } from "./actions/aloha.action";
export { vinceFundingPulseAction } from "./actions/fundingPulse.action";
export { vinceRegimeAction } from "./actions/regime.action";
export { vinceBotVerdictAction } from "./actions/botVerdict.action";
export { vinceOptionsAction } from "./actions/options.action";
export { vincePerpsAction } from "./actions/perps.action";
export { vinceMemesAction } from "./actions/memes.action";
export { vinceAirdropsAction } from "./actions/airdrops.action";
export { vinceNftFloorAction } from "./actions/nftFloor.action";
export { vinceIntelAction } from "./actions/intel.action";
export { vinceNewsAction } from "./actions/news.action";
export { vinceHIP3Action } from "./actions/hip3.action";
export { vinceBotStatusAction } from "./actions/vinceBotStatus.action";
export { vinceBotPauseAction } from "./actions/vinceBotPause.action";
export { vinceWhyTradeAction } from "./actions/vinceWhyTrade.action";
export { vinceBotAction } from "./actions/bot.action";
export { vinceCodeTaskAction } from "./actions/codeTask.action";
export { vinceGrokExpertAction } from "./actions/grokExpert.action";
export { closeRecommendationAction } from "./actions/closeRecommendation.action";
export { vinceMemeDeepDiveAction } from "./actions/memeDeepDive.action";
export { vinceWatchlistAction } from "./actions/watchlist.action";
export { vinceAlertsAction } from "./actions/alerts.action";

// ==========================================
// Provider Exports
// ==========================================

export { vinceContextProvider } from "./providers/vinceContext.provider";
export { trenchKnowledgeProvider } from "./providers/trenchKnowledge.provider";
export { teammateContextProvider } from "./providers/teammateContext.provider";
export { protocolWriteupProvider } from "./providers/protocolWriteup.provider";
export { bankrOrdersProvider } from "./providers/bankrOrders.provider";

// ==========================================
// Analysis Exports
// ==========================================

export {
  BullBearAnalyzer,
  getBullBearAnalyzer,
} from "./analysis/bullBearAnalyzer";

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
  getTradingMode,
  getEffectiveThresholds,
  getModeRiskMultiplier,
} from "./config/dynamicConfig";
export type {
  SourceWeights,
  AdjustmentRecord,
  TunedConfig,
  TradingMode,
} from "./config/dynamicConfig";

// ==========================================
// VinceBench (decision-quality benchmark)
// ==========================================
export { runReplay } from "./bench/runner";
export { toMarkdown, writeReports } from "./bench/reporter";
export { loadConfig } from "./bench/configLoader";
export { loadScenarios, recordsToEvaluations } from "./bench/scenarioLoader";
export { normalize } from "./bench/normalizer";
export { evaluate, scoreSingleDecision } from "./bench/evaluator";
export { generateImprovementSuggestions } from "./bench/improvementLoop";
export type {
  VinceBenchReport,
  VinceBenchConfig,
  DecisionEvaluation,
  Signature,
  HiaNScenario,
} from "./bench/types";
export type {
  ImprovementSuggestion,
  CurrentParams,
} from "./bench/improvementLoop";
