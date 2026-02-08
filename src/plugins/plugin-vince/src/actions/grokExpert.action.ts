/**
 * VINCE GROK EXPERT Action
 *
 * DISABLED: This action is not registered in the plugin (commented out in index.ts).
 *
 * Grok-powered daily pulse that aggregates all data sources, suggests a "Prompt of the Day"
 * for knowledge improvement, and recommends research topics across 9 categories.
 *
 * Features:
 * - Prompt of the Day (from 36+ battle-tested templates)
 * - Market Summary (synthesized from all services)
 * - Research Suggestions (9 categories)
 * - Knowledge Gap Analysis
 * - Auto-save to knowledge folder
 *
 * Triggers:
 * - "grok pulse", "grok expert", "grok summary"
 * - "prompt of the day", "potd", "daily prompt"
 * - "research suggestions", "what should I research"
 * - "daily digest", "morning briefing"
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

// Service types
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceMarketDataService } from "../services/marketData.service";
import type { VinceTopTradersService } from "../services/topTraders.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import type { VinceHIP3Service } from "../services/hip3.service";
import type { VinceNFTFloorService } from "../services/nftFloor.service";
import type { VinceLifestyleService } from "../services/lifestyle.service";
import type { VinceDexScreenerService } from "../services/dexscreener.service";
import type { VinceBinanceService } from "../services/binance.service";
import type { VinceDeribitService } from "../services/deribit.service";
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { VinceMarketRegimeService } from "../services/marketRegime.service";
import type { VinceXSentimentService } from "../services/xSentiment.service";
import { CORE_ASSETS } from "../constants/targetAssets";
import { getOrCreateXAIService, type IXAIService } from "../services/fallbacks";
import { getMemoryDir } from "../memory/intelligenceLog";
import { runCryptoIntelPostReport } from "../memory/cryptoIntelPrePost";
import { runSubAgentOrchestration } from "../tasks/runSubAgentOrchestration";

// ==========================================
// Data Context Builder
// ==========================================

interface GrokDataContext {
  timestamp: string;
  date: string;
  day: string;

  // Market Overview
  regime: string;
  fearGreed: number | null;
  btcPrice: number | null;
  ethPrice: number | null;

  // Trading Data
  coinglassData: string[];
  binanceData: string[];
  topTradersData: string[];
  optionsData: string[];
  signalsData: string[];

  // HIP-3
  hip3Data: string[];

  // Lifestyle & Art
  lifestyleData: string[];
  nftData: string[];

  // Memetics
  memesData: string[];

  // News
  newsData: string[];

  // X (Twitter) vibe check (cached sentiment for BTC, ETH, SOL, HYPE)
  xSentimentData: string[];

  // Available Prompt Templates
  promptTemplates: string[];
}

async function buildGrokDataContext(
  runtime: IAgentRuntime,
): Promise<GrokDataContext> {
  const now = new Date();
  const ctx: GrokDataContext = {
    timestamp: now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    date: now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }),
    day: now.toLocaleDateString("en-US", { weekday: "long" }),
    regime: "unknown",
    fearGreed: null,
    btcPrice: null,
    ethPrice: null,
    coinglassData: [],
    binanceData: [],
    topTradersData: [],
    optionsData: [],
    signalsData: [],
    hip3Data: [],
    lifestyleData: [],
    nftData: [],
    memesData: [],
    newsData: [],
    xSentimentData: [],
    promptTemplates: [],
  };

  // Get services
  const coinglassService = runtime.getService(
    "VINCE_COINGLASS_SERVICE",
  ) as VinceCoinGlassService | null;
  const marketDataService = runtime.getService(
    "VINCE_MARKET_DATA_SERVICE",
  ) as VinceMarketDataService | null;
  const topTradersService = runtime.getService(
    "VINCE_TOP_TRADERS_SERVICE",
  ) as VinceTopTradersService | null;
  const newsService = runtime.getService(
    "VINCE_NEWS_SENTIMENT_SERVICE",
  ) as VinceNewsSentimentService | null;
  const hip3Service = runtime.getService(
    "VINCE_HIP3_SERVICE",
  ) as VinceHIP3Service | null;
  const nftService = runtime.getService(
    "VINCE_NFT_FLOOR_SERVICE",
  ) as VinceNFTFloorService | null;
  const lifestyleService = runtime.getService(
    "VINCE_LIFESTYLE_SERVICE",
  ) as VinceLifestyleService | null;
  const dexscreenerService = runtime.getService(
    "VINCE_DEXSCREENER_SERVICE",
  ) as VinceDexScreenerService | null;
  const binanceService = runtime.getService(
    "VINCE_BINANCE_SERVICE",
  ) as VinceBinanceService | null;
  const deribitService = runtime.getService(
    "VINCE_DERIBIT_SERVICE",
  ) as VinceDeribitService | null;
  const signalService = runtime.getService(
    "VINCE_SIGNAL_AGGREGATOR_SERVICE",
  ) as VinceSignalAggregatorService | null;
  const regimeService = runtime.getService(
    "VINCE_MARKET_REGIME_SERVICE",
  ) as VinceMarketRegimeService | null;

  // Market Regime
  if (regimeService) {
    try {
      const regime = await regimeService.getRegime?.("BTC");
      if (regime) {
        ctx.regime = regime.regime || "unknown";
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] Failed to get market regime");
    }
  }

  // CoinGlass Data
  if (coinglassService) {
    try {
      const fearGreed = coinglassService.getFearGreed?.();
      if (fearGreed) {
        ctx.fearGreed = fearGreed.value;
        ctx.coinglassData.push(
          `Fear & Greed: ${fearGreed.value}/100 (${fearGreed.classification})`,
        );
      }

      const funding = coinglassService.getFunding?.("BTC");
      if (funding) {
        ctx.coinglassData.push(
          `BTC Funding: ${(funding.rate * 100).toFixed(4)}%`,
        );
      }

      const oi = coinglassService.getOpenInterest?.("BTC");
      if (oi) {
        ctx.coinglassData.push(`BTC OI: $${(oi.value / 1e9).toFixed(2)}B`);
      }

      const lsRatio = coinglassService.getLongShortRatio?.("BTC");
      if (lsRatio) {
        ctx.coinglassData.push(`BTC L/S Ratio: ${lsRatio.ratio.toFixed(2)}`);
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] CoinGlass data fetch error");
    }
  }

  // Binance Data
  if (binanceService) {
    try {
      const topTraders =
        await binanceService.getTopTraderPositions?.("BTCUSDT");
      if (topTraders) {
        ctx.binanceData.push(
          `Binance Top Traders: ${topTraders.longPosition.toFixed(1)}% long`,
        );
      }

      const takerVol = await binanceService.getTakerVolume?.("BTCUSDT");
      if (takerVol) {
        ctx.binanceData.push(
          `Taker Buy/Sell Ratio: ${takerVol.buySellRatio.toFixed(3)}`,
        );
      }

      const oiTrend = await binanceService.getOITrend?.("BTCUSDT");
      if (oiTrend) {
        ctx.binanceData.push(
          `OI Trend: ${oiTrend.trend} (${oiTrend.changePercent >= 0 ? "+" : ""}${oiTrend.changePercent.toFixed(2)}%)`,
        );
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] Binance data fetch error");
    }
  }

  // Top Traders (Hyperliquid)
  if (topTradersService) {
    try {
      const positions = topTradersService.getTraderPositions?.();
      if (positions && positions.length > 0) {
        const btcTraders = positions.filter(
          (p: any) => p.lastPosition?.asset === "BTC",
        );
        if (btcTraders.length > 0) {
          const longCount = btcTraders.filter(
            (t: any) => t.lastPosition?.side === "long",
          ).length;
          const shortCount = btcTraders.filter(
            (t: any) => t.lastPosition?.side === "short",
          ).length;
          ctx.topTradersData.push(
            `Hyperliquid Whales BTC: ${longCount} long, ${shortCount} short`,
          );
        }
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] Top Traders data fetch error");
    }
  }

  // Options Data (Deribit)
  if (deribitService) {
    try {
      const optionsCtx = await deribitService.getOptionsContext?.("BTC");
      if (optionsCtx) {
        if (optionsCtx.dvol !== null) {
          ctx.optionsData.push(`BTC DVOL: ${optionsCtx.dvol.toFixed(1)}%`);
        }
        if (optionsCtx.ivSurface?.atmIV) {
          ctx.optionsData.push(
            `BTC ATM IV: ${(optionsCtx.ivSurface.atmIV * 100).toFixed(1)}%`,
          );
        }
        if (optionsCtx.spotPrice) {
          ctx.optionsData.push(
            `BTC Spot: $${optionsCtx.spotPrice.toLocaleString()}`,
          );
        }
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] Options data fetch error");
    }
  }

  // Signal Aggregator
  if (signalService) {
    try {
      const btcSignal = await signalService.getSignal?.("BTC");
      if (btcSignal) {
        ctx.signalsData.push(
          `BTC Signal: ${btcSignal.direction} (${btcSignal.strength})`,
        );
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] Signal aggregator fetch error");
    }
  }

  // HIP-3 Data
  if (hip3Service) {
    try {
      const pulse = await hip3Service.getHIP3Pulse?.();
      if (pulse) {
        // Combine all assets and sort by absolute change
        const allAssets = [
          ...pulse.commodities,
          ...pulse.indices,
          ...pulse.stocks,
          ...pulse.aiPlays,
        ];
        const sorted = allAssets
          .filter((a: any) => a.change24h !== undefined)
          .sort(
            (a: any, b: any) => Math.abs(b.change24h) - Math.abs(a.change24h),
          );
        const top3 = sorted.slice(0, 3);
        for (const mover of top3) {
          ctx.hip3Data.push(
            `${mover.symbol}: ${mover.change24h >= 0 ? "+" : ""}${mover.change24h.toFixed(2)}%`,
          );
        }
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] HIP-3 data fetch error");
    }
  }

  // Lifestyle Data
  if (lifestyleService) {
    try {
      const briefing = lifestyleService.getDailyBriefing?.();
      if (briefing) {
        ctx.lifestyleData.push(`Day: ${briefing.day}`);
        ctx.lifestyleData.push(
          `Season: ${lifestyleService.getCurrentSeason?.() || "unknown"}`,
        );
        if (briefing.specialNotes?.length > 0) {
          ctx.lifestyleData.push(`Notes: ${briefing.specialNotes.join(", ")}`);
        }
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] Lifestyle data fetch error");
    }
  }

  // NFT Data
  if (nftService) {
    try {
      const floors = nftService.getAllFloors?.();
      if (floors && floors.length > 0) {
        const top3 = floors.slice(0, 3);
        for (const floor of top3) {
          ctx.nftData.push(`${floor.name}: ${floor.floorPrice.toFixed(2)} ETH`);
        }
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] NFT data fetch error");
    }
  }

  // Memes Data
  if (dexscreenerService) {
    try {
      const hotMemes = dexscreenerService.getHotAiMemes?.();
      if (hotMemes && hotMemes.length > 0) {
        const top3 = hotMemes.slice(0, 3);
        for (const meme of top3) {
          ctx.memesData.push(
            `${meme.symbol}: $${meme.price?.toFixed(6) || "?"} (${meme.chain})`,
          );
        }
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] Memes data fetch error");
    }
  }

  // News Data
  if (newsService) {
    try {
      const sentiment = newsService.getOverallSentiment?.();
      if (sentiment) {
        ctx.newsData.push(
          `Sentiment: ${sentiment.sentiment} (${sentiment.confidence?.toFixed(0) || "N/A"}% confidence)`,
        );
      }

      const headlines = newsService.getTopHeadlines?.(3);
      if (headlines && headlines.length > 0) {
        for (const h of headlines) {
          ctx.newsData.push(`• ${h.title?.substring(0, 60) || "Unknown"}...`);
        }
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] News data fetch error");
    }
  }

  // X (Twitter) vibe check (cached sentiment for core assets)
  const xSentimentService = runtime.getService(
    "VINCE_X_SENTIMENT_SERVICE",
  ) as VinceXSentimentService | null;
  if (xSentimentService?.isConfigured?.()) {
    try {
      const parts: string[] = [];
      const riskAssets: string[] = [];
      for (const asset of CORE_ASSETS) {
        const s = xSentimentService.getTradingSentiment(asset);
        if (s.confidence > 0) {
          parts.push(`${asset} ${s.sentiment} ${s.confidence}%`);
          if (s.hasHighRiskEvent) riskAssets.push(asset);
        }
      }
      if (parts.length > 0) {
        ctx.xSentimentData.push(`X vibe (cached): ${parts.join(", ")}.`);
        if (riskAssets.length > 0) {
          ctx.xSentimentData.push(`Risk flags: ${riskAssets.join(", ")}.`);
        }
      }
    } catch (e) {
      logger.warn("[GROK_EXPERT] X sentiment fetch error");
    }
  }

  // Load Prompt Templates
  try {
    const templatesDir = path.join(
      process.cwd(),
      "knowledge",
      "prompt-templates",
    );
    if (fs.existsSync(templatesDir)) {
      const files = fs
        .readdirSync(templatesDir)
        .filter(
          (f) =>
            f.endsWith(".md") && !f.includes("README") && !f.includes("STATUS"),
        );
      ctx.promptTemplates = files.slice(0, 10).map((f) => f.replace(".md", ""));
    }
  } catch (e) {
    logger.warn("[GROK_EXPERT] Failed to load prompt templates");
  }

  return ctx;
}

// ==========================================
// Format Data Context for Grok
// ==========================================

function formatDataContextForGrok(ctx: GrokDataContext): string {
  const lines: string[] = [];

  lines.push(`=== GROK EXPERT DAILY PULSE ===`);
  lines.push(`Date: ${ctx.date} | Time: ${ctx.timestamp}`);
  lines.push(`Market Regime: ${ctx.regime.toUpperCase()}`);
  lines.push("");

  if (ctx.coinglassData.length > 0) {
    lines.push("COINGLASS DATA:");
    lines.push(...ctx.coinglassData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.binanceData.length > 0) {
    lines.push("BINANCE INTELLIGENCE:");
    lines.push(...ctx.binanceData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.topTradersData.length > 0) {
    lines.push("HYPERLIQUID WHALES:");
    lines.push(...ctx.topTradersData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.optionsData.length > 0) {
    lines.push("OPTIONS (DERIBIT):");
    lines.push(...ctx.optionsData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.signalsData.length > 0) {
    lines.push("SIGNALS:");
    lines.push(...ctx.signalsData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.hip3Data.length > 0) {
    lines.push("HIP-3 MOVERS:");
    lines.push(...ctx.hip3Data.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.newsData.length > 0) {
    lines.push("NEWS:");
    lines.push(...ctx.newsData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.xSentimentData.length > 0) {
    lines.push("X (TWITTER) VIBE CHECK:");
    lines.push(...ctx.xSentimentData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.memesData.length > 0) {
    lines.push("HOT MEMES:");
    lines.push(...ctx.memesData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.nftData.length > 0) {
    lines.push("NFT FLOORS:");
    lines.push(...ctx.nftData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.lifestyleData.length > 0) {
    lines.push("LIFESTYLE:");
    lines.push(...ctx.lifestyleData.map((d) => `  ${d}`));
    lines.push("");
  }

  if (ctx.promptTemplates.length > 0) {
    lines.push("AVAILABLE PROMPT TEMPLATES:");
    lines.push(...ctx.promptTemplates.map((t) => `  - ${t}`));
    lines.push("");
  }

  return lines.join("\n");
}

// ==========================================
// Build Grok Mega-Prompt
// ==========================================

function buildGrokMegaPrompt(dataContext: string): string {
  return `You are VINCE's Grok Expert - an AI assistant specialized in generating actionable research suggestions and improving knowledge systems.

You have access to the following real-time market data:

${dataContext}

Your task is to generate a comprehensive "Daily Pulse" that includes:

## SECTION A: PROMPT OF THE DAY
Based on the current market conditions, select OR create the most relevant prompt template for today. Consider:
- What's the market regime? (Risk-on/off, volatility, trends)
- What specific opportunities or risks exist?
- What analytical approach would be most valuable today?

Create a copy-paste ready prompt that can be used with Grok Expert on X/Twitter. The prompt should:
- Be specific to today's conditions
- Focus on actionable research
- Include relevant data points to investigate
- Be 2-4 sentences max

## SECTION B: MARKET SUMMARY
Write a 100-150 word synthesis of ALL the data above. Connect the dots between:
- Derivatives positioning and sentiment
- Options flow and IV
- Whale activity
- News sentiment
- Technical regime

Have opinions. If signals are conflicting, say so. If there's a clear setup, call it.

## SECTION C: RESEARCH SUGGESTIONS
Provide ONE specific, actionable research suggestion for each of these 9 categories:

1. **Options**: What strike, expiry, or IV trade to investigate on Hypersurface/Deribit?
2. **Perps**: What Hyperliquid perp setup or funding arb to look at?
3. **HIP-3**: Which stock token, commodity, or index on Hyperliquid to research?
4. **Lifestyle**: What activity aligns with today's market mood and day of week?
5. **NFTs**: Which collection or artist to research based on floor movements?
6. **News**: What story or narrative deserves a deep dive?
7. **Trading Bots**: What Hyperliquid automation strategy to explore?
8. **Airdrops**: What protocol or opportunity to check on?
9. **AI Memes**: What trending AI/crypto meme topic to create content about?

Be SPECIFIC. Not "look at BTC options" but "BTC $110K calls expiring Feb 14 have elevated IV vs historical, potential vol crush play".

## SECTION D: KNOWLEDGE GAP
What topic is NOT well-covered in the knowledge base that would be valuable to add? Suggest:
- A specific topic to research
- Why it matters for the trading strategy
- What format the knowledge should take (methodology doc, case study, data template)

STYLE RULES:
- Be direct and opinionated
- Use specific numbers and tickers
- No hedging or "it depends" - pick a direction
- Write like a smart trader friend, not a financial advisor
- Keep total response under 800 words

Now generate the Daily Pulse:`;
}

// ==========================================
// Save to Knowledge Folder
// ==========================================

async function saveToKnowledge(
  content: string,
  date: string,
): Promise<string | null> {
  try {
    const knowledgeDir = path.join(process.cwd(), "knowledge", "internal-docs");

    // Ensure directory exists
    if (!fs.existsSync(knowledgeDir)) {
      fs.mkdirSync(knowledgeDir, { recursive: true });
    }

    const dateStr = date.replace(/,/g, "").replace(/\s+/g, "-").toLowerCase();
    const filename = `grok-daily-${dateStr}.md`;
    const filepath = path.join(knowledgeDir, filename);

    const fileContent = `# Grok Expert Daily Pulse

**Generated**: ${new Date().toISOString()}
**Category**: internal-docs
**Tags**: #grok-expert #daily-pulse #research-suggestions

---

${content}

---

> **Note**: This is an auto-generated daily pulse from the Grok Expert action.
> Use the research suggestions as starting points for deeper investigation.
`;

    fs.writeFileSync(filepath, fileContent, "utf-8");
    logger.info(`[GROK_EXPERT] Saved daily pulse to ${filepath}`);
    return filename;
  } catch (e) {
    logger.error(`[GROK_EXPERT] Failed to save to knowledge: ${e}`);
    return null;
  }
}

// ==========================================
// Action Definition
// ==========================================

export const vinceGrokExpertAction: Action = {
  name: "VINCE_GROK_EXPERT",
  similes: [
    "GROK_PULSE",
    "GROK_EXPERT",
    "PROMPT_OF_THE_DAY",
    "POTD",
    "RESEARCH_SUGGESTIONS",
    "DAILY_DIGEST",
    "GROK_SUMMARY",
    "MORNING_BRIEFING",
  ],
  description:
    "Grok-powered daily pulse: aggregates all data sources, suggests prompt of the day, " +
    "and recommends research topics across options, perps, HIP-3, lifestyle, NFTs, news, bots, airdrops, and AI memes",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("grok pulse") ||
      text.includes("grok expert") ||
      text.includes("grok summary") ||
      text.includes("prompt of the day") ||
      text.includes("potd") ||
      text.includes("daily prompt") ||
      text.includes("research suggestion") ||
      text.includes("what should i research") ||
      text.includes("daily digest") ||
      text.includes("morning briefing") ||
      text.includes("daily pulse") ||
      (text.includes("grok") && text.includes("research"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      logger.info("[GROK_EXPERT] Starting daily pulse generation...");

      // Get XAI service (external or fallback)
      const xaiService = getOrCreateXAIService(runtime);

      if (!xaiService) {
        logger.warn(
          "[GROK_EXPERT] XAI service not available - no API key configured",
        );
        await callback({
          text: "Grok Expert requires an XAI API key. Add XAI_API_KEY to your .env file to enable Grok Expert.",
          actions: ["VINCE_GROK_EXPERT"],
        });
        return;
      }

      // Build data context from all services
      logger.info("[GROK_EXPERT] Aggregating data from all services...");
      const dataContext = await buildGrokDataContext(runtime);
      const formattedContext = formatDataContextForGrok(dataContext);

      const subAgentsEnabled =
        runtime.getSetting("GROK_SUB_AGENTS_ENABLED") === true ||
        runtime.getSetting("GROK_SUB_AGENTS_ENABLED") === "true" ||
        process.env.GROK_SUB_AGENTS_ENABLED === "true";

      let grokResponse: string;
      let tokenUsage: string | number = "N/A";

      if (subAgentsEnabled) {
        logger.info("[GROK_EXPERT] Running sub-agent orchestration...");
        const memoryDir = getMemoryDir(runtime);
        const xVibeSummary =
          dataContext.xSentimentData.length > 0
            ? dataContext.xSentimentData.join(" ")
            : "No cached X sentiment.";
        grokResponse = await runSubAgentOrchestration(
          runtime,
          formattedContext,
          xVibeSummary,
          { date: dataContext.date, runWebSearch: true, memoryDir },
        );
        logger.info("[GROK_EXPERT] Sub-agent report generated");
        try {
          await runCryptoIntelPostReport(runtime, memoryDir, grokResponse);
        } catch (e) {
          logger.warn({ err: e }, "[GROK_EXPERT] Post-report memory update failed");
        }
      } else {
        // Single mega-prompt flow
        const grokPrompt = buildGrokMegaPrompt(formattedContext);
        logger.info("[GROK_EXPERT] Calling Grok API...");
        const result = await xaiService.generateText({
          prompt: grokPrompt,
          model: "grok-4-1-fast-reasoning",
          temperature: 0.7,
          maxTokens: 4000,
          system:
            "You are VINCE's Grok Expert assistant. Be direct, opinionated, and actionable. No financial advice disclaimers needed - this is for personal research.",
        });

        if (!result.success || !result.text) {
          logger.error(`[GROK_EXPERT] Grok API failed: ${result.error}`);
          await callback({
            text: `Grok API call failed: ${result.error || "Unknown error"}. Try again in a minute.`,
            actions: ["VINCE_GROK_EXPERT"],
          });
          return;
        }
        grokResponse = result.text.trim();
        if (result.usage?.total_tokens != null) tokenUsage = result.usage.total_tokens;
        logger.info("[GROK_EXPERT] Grok response received");
      }

      // Save to knowledge folder
      const savedFilename = await saveToKnowledge(
        grokResponse,
        dataContext.date,
      );

      // Build output
      const output = [
        `**Grok Expert Daily Pulse** _${dataContext.date}_`,
        "",
        grokResponse,
        "",
        "---",
        savedFilename
          ? `*Saved to: knowledge/internal-docs/${savedFilename}*`
          : "*Failed to save to knowledge folder*",
        "",
        `*Tokens used: ${tokenUsage}*`,
        "",
        "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, HIP3, GROK*",
      ].join("\n");

      await callback({
        text: output,
        actions: ["VINCE_GROK_EXPERT"],
      });

      logger.info("[GROK_EXPERT] Daily pulse complete");
    } catch (error) {
      logger.error(`[GROK_EXPERT] Error: ${error}`);
      await callback({
        text: "Grok Expert failed. Check the logs for details.",
        actions: ["VINCE_GROK_EXPERT"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "grok pulse" } },
      {
        name: "VINCE",
        content: {
          text: `**Grok Expert Daily Pulse** _Saturday, Feb 1_

## SECTION A: PROMPT OF THE DAY

"Analyze BTC's current positioning: with top traders at 58% long, funding at 0.012%, and OI rising +2.3%, what's the historical resolution of this setup? Check Coinglass and Deribit for confirmation signals. Focus on 7-day timeframe for covered call strike selection."

This prompt is relevant because we're seeing conviction longs building without extreme funding - a setup that historically precedes continuation rather than reversal.

## SECTION B: MARKET SUMMARY

The regime is cautiously risk-on. BTC top traders are positioned 58% long on Binance, which is elevated but not crowded. The key detail: OI is rising alongside price, indicating new money entering rather than shorts closing. Funding remains healthy at 0.012% - longs aren't paying excessive premium.

Hyperliquid whales are net long $12M in BTC, confirming the directional bias. Options flow shows ATM IV at 48%, slightly elevated but not extreme. Max pain sits at $98K, suggesting downside is limited near-term.

News sentiment is neutral-positive. The HIP-3 movers show GOOGL and NVDA leading, indicating tech risk-on sentiment bleeding into crypto.

The read: Cautiously long BTC, sell premium via covered calls at elevated strikes.

## SECTION C: RESEARCH SUGGESTIONS

1. **Options**: BTC $105K calls expiring Feb 7 - IV is 52% vs 45% historical for this delta. Potential vol crush after weekend.

2. **Perps**: ETH/BTC ratio on Hyperliquid - ETH underperforming with negative funding. Potential mean reversion long.

3. **HIP-3**: NVDA stock token - earnings run-up usually starts 2 weeks before. Check positioning on Hyperliquid.

4. **Lifestyle**: Saturday = pool day if weather permits. Markets are quiet, good day for long lunch and position review.

5. **NFTs**: Pudgy Penguins floor dropped 8% this week. Potential accumulation zone if fundamentals hold.

6. **News**: BlackRock ETF inflow data - Monday will show weekly totals. Prepare narrative based on outcome.

7. **Trading Bots**: Funding rate arbitrage bot between Binance and Hyperliquid - 0.008% spread currently.

8. **Airdrops**: Movement Labs mainnet approaching - check eligibility and staking requirements.

9. **AI Memes**: "Grok vs Claude" comparison content - high engagement topic with new Grok 4 release.

## SECTION D: KNOWLEDGE GAP

The knowledge base lacks a comprehensive "Funding Rate Arbitrage Playbook" for Hyperliquid. This should include:
- Historical spread data between exchanges
- Execution mechanics and costs
- Risk management for basis trades
- Bot implementation patterns

Format: Methodology doc with worked examples and code snippets for the paper trading bot.

---
*Saved to: knowledge/internal-docs/grok-daily-saturday-feb-1.md*

*Tokens used: 1,247*

*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, HIP3, GROK*`,
          actions: ["VINCE_GROK_EXPERT"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "What should I research today?" } },
      {
        name: "VINCE",
        content: {
          text: `**Grok Expert Daily Pulse** _Monday, Feb 3_

## SECTION A: PROMPT OF THE DAY

"With Fear & Greed at 38 and funding turning negative, analyze the historical setups where shorts pay longs during consolidation. What's the typical resolution timeline and magnitude? Cross-reference with whale positioning on Hyperliquid."

This prompt targets the current divergence between price action and derivatives positioning.

## SECTION B: MARKET SUMMARY

We're in a consolidation regime with bearish derivatives undertone. Fear & Greed dropped to 38 - fear territory but not capitulation. The interesting signal: funding just flipped negative at -0.003%, meaning shorts are paying longs. This is rare and historically bullish.

Binance top traders are balanced at 51/49, suggesting smart money is waiting. OI is flat which confirms the chop. No one's adding size.

ETH is showing relative strength with whales accumulating on Hyperliquid. The HIP-3 sector is mixed - tech names up, commodities down.

The setup: Wait for funding to normalize or Fear to spike below 25 for long entry. Current risk/reward isn't compelling for new positions.

## SECTION C: RESEARCH SUGGESTIONS

1. **Options**: BTC straddles at $100K - IV is cheap at 44%. Any directional break will pay.

2. **Perps**: SOL on Hyperliquid - funding -0.008% means shorts paying heavily. Squeeze candidate.

3. **HIP-3**: Oil (WTI token) - geopolitical risk rising, crude historically leads risk-off.

4. **Lifestyle**: Monday = focused work. Clear the admin, set up the week's watchlist.

5. **NFTs**: Art Blocks collections - secondary market thinning, generative art thesis intact for long-term.

6. **News**: Fed speakers this week - check the calendar and prepare scenarios.

7. **Trading Bots**: Grid bot on ETH during consolidation - capture the chop with tight ranges.

8. **Airdrops**: Monad testnet activity - one of the few L1s with real hype and no token yet.

9. **AI Memes**: "AI agents trading" narrative - showcase the paper trading bot results.

## SECTION D: KNOWLEDGE GAP

Missing: "Grid Bot Strategy Guide" for Hyperliquid. Cover range selection, sizing, and when grids outperform directional. Include backtests from similar consolidation periods.

---
*Saved to: knowledge/internal-docs/grok-daily-monday-feb-3.md*

*Tokens used: 1,089*

*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, HIP3, GROK*`,
          actions: ["VINCE_GROK_EXPERT"],
        },
      },
    ],
  ],
};
