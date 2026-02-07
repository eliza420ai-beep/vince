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

import type { Plugin, IAgentRuntime, TargetInfo, Content } from "@elizaos/core";
import type { Service } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { buildPulseResponse } from "./routes/dashboardPulse";

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
import { VinceNotificationService } from "./services/notification.service";
import { VinceAlertService } from "./services/alert.service";

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
import { protocolWriteupProvider } from "./providers/protocolWriteup.provider";

// Tasks
// import { registerGrokExpertTask } from "./tasks/grokExpert.tasks";
import { registerTrainOnnxTask } from "./tasks/trainOnnx.tasks";
import { registerDailyReportTask } from "./tasks/dailyReport.tasks";
import { registerLifestyleDailyTask } from "./tasks/lifestyleDaily.tasks";
import { registerNewsDailyTask } from "./tasks/newsDaily.tasks";

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
  // DeribitServiceAlias/HyperliquidServiceAlias: register under DERIBIT_SERVICE/HYPERLIQUID_SERVICE so
  // runtime.getService() never returns null when external plugins aren't loaded. Must be in services
  // array (not init registerService) to avoid blocking initPromise → 30s timeout deadlock.
  // Cast via unknown: start() returns fallback impls (IDeribitService/IHyperliquidService), not Service subclass.
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
    vinceHlCryptoAction,
    vinceChatAction,
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
      ) => {
        const runtime =
          (req as any).runtime ??
          (req as any).agentRuntime ??
          (req as any).agent?.runtime;
        if (!runtime) {
          res.status(503).json({
            error: "Pulse requires agent context",
            hint: "Use /api/agents/:agentId/plugins/vince/pulse (ElizaOS mounts plugin routes under /plugins).",
          });
          return;
        }
        try {
          const pulse = await buildPulseResponse(runtime as IAgentRuntime);
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
  ],

  // Providers - unified context (teammate loads first so IDENTITY/USER/SOUL/TOOLS/MEMORY are always in context)
  providers: [
    teammateContextProvider,
    protocolWriteupProvider,
    vinceContextProvider,
    trenchKnowledgeProvider,
  ],

  // Evaluators - Self-Improving Architecture
  evaluators: [tradePerformanceEvaluator],

  // Plugin initialization with live market data dashboard (VINCE only — Eliza also loads this plugin)
  init: async (config: Record<string, string>, runtime: IAgentRuntime) => {
    // Guard: any runtime that does NOT have the Discord plugin must get a no-op discord send handler
    // so core never logs "Send handler not found (handlerSource=discord)". (Fixes recurring error when
    // only Eliza has Discord or both agents share the same app ID — see DISCORD.md.)
    const character = (runtime as { character?: { plugins?: unknown[] } }).character;
    const plugins: unknown[] = character ? [...(character.plugins ?? [])] : [];
    const hasDiscordPlugin = plugins.some(
      (p: unknown) =>
        p === "@elizaos/plugin-discord" || (typeof p === "object" && p !== null && (p as { name?: string }).name === "discord")
    );
    if (character && !hasDiscordPlugin && typeof runtime.sendMessageToTarget === "function" && typeof runtime.registerSendHandler === "function") {
      const noOpDiscordHandler = async (_r: IAgentRuntime, _t: TargetInfo, _c: Content) => {};
      for (const key of ["discord", "Discord", "DISCORD"]) {
        runtime.registerSendHandler(key, noOpDiscordHandler);
      }
      const original = runtime.sendMessageToTarget.bind(runtime);
      (runtime as { sendMessageToTarget: typeof runtime.sendMessageToTarget }).sendMessageToTarget = async (target: TargetInfo, content: Content) => {
        const normalized: TargetInfo = target?.source != null ? { ...target, source: String(target.source).toLowerCase() } : target;
        const src = normalized?.source ?? "";
        if (src === "discord") {
          logger.debug("[plugin-vince] Skipping sendMessageToTarget(discord) — this agent has no Discord plugin.");
          return;
        }
        return original(normalized, content);
      };
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

    logger.info("[VINCE] Plugin initialized successfully");

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
              dashboard.split("\n").forEach((line) => console.log(line));
            }
          }
        } catch {
          // Silent — HL crypto dashboard is best-effort
        }
      })();
    }

    // Register Grok Expert daily task (commented out - low value)
    // try {
    //   await registerGrokExpertTask(runtime);
    //   logger.info("[VINCE] Grok Expert daily task registered");
    // } catch (e) {
    //   logger.warn("[VINCE] Failed to register Grok Expert task:", e);
    // }

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

    // Lifestyle daily: dining, hotel, health, fitness pushed to Discord/Slack (channels with "lifestyle" in name)
    if (isVinceAgent(runtime)) {
      setImmediate(async () => {
        try {
          await registerLifestyleDailyTask(runtime);
        } catch (e) {
          logger.warn("[VINCE] Failed to register lifestyle daily task:", e);
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

    // Optional: stagger second Discord bot so both can connect in same process (see DISCORD.md).
    // When both Eliza and VINCE have Discord enabled, delaying VINCE init gives the first bot time to connect before the second starts.
    if (isVinceAgent(runtime)) {
      const elizaHasDiscord = !!(process.env.ELIZA_DISCORD_API_TOKEN?.trim() || process.env.DISCORD_API_TOKEN?.trim());
      const vinceHasDiscord =
        !!process.env.VINCE_DISCORD_API_TOKEN?.trim() &&
        !!process.env.VINCE_DISCORD_APPLICATION_ID?.trim();
      const delayMs = parseInt(process.env.DELAY_SECOND_DISCORD_MS ?? "3000", 10);
      if (elizaHasDiscord && vinceHasDiscord && !Number.isNaN(delayMs) && delayMs > 0) {
        logger.info(`[DISCORD] Staggering second bot: waiting ${delayMs}ms so both can connect (set DELAY_SECOND_DISCORD_MS=0 to disable).`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
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
export { VinceNotificationService } from "./services/notification.service";
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
export { protocolWriteupProvider } from "./providers/protocolWriteup.provider";

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
} from "./config/dynamicConfig";
export type {
  SourceWeights,
  AdjustmentRecord,
  TunedConfig,
} from "./config/dynamicConfig";
