/**
 * VINCE Memes Action
 *
 * Human-style meme analysis that reads like a degen friend texting you.
 * Uses LLM to generate conversational narrative about hot tokens.
 *
 * Features:
 * - MOLT-tier filtering: $1M-$20M mcap, $1.5M-$5M sweet spot for AI memes
 * - Viral potential detection (mcap + vol/liq + AI narrative)
 * - DexScreener traction analysis (SOL, BASE)
 * - Lifecycle stage analysis (PVP, retracement, established)
 * - Market mood detection
 * - Nansen smart money tracking
 * - APE / WATCH / AVOID verdicts with bull/bear cases
 * - Meteora LP pool discovery
 * - GM briefing mode for quick daily summary
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VinceDexScreenerService } from "../services/dexscreener.service";
import type { VinceMeteoraService } from "../services/meteora.service";
import type { VinceWatchlistService } from "../services/watchlist.service";
import type { VinceAlertService, Alert } from "../services/alert.service";
import type { VinceTopTradersService } from "../services/topTraders.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import type { INansenService } from "../types/external-services";
import { getOrCreateNansenService } from "../services/fallbacks";
import { getFrameworkForTopic } from "../providers/trenchKnowledge.provider";
import type { MarketMood } from "../constants/memes.constants";

// Helper function
function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ==========================================
// Build data context for LLM
// ==========================================

interface TokenData {
  symbol: string;
  chain: string;
  verdict: string;
  volumeLiquidityRatio: number;
  priceChange24h: number;
  liquidity: number;
  hasMeteoraLp?: boolean;
  smartMoneyAccumulating?: boolean;
  smartMoneyBuyers?: number;
  // Market cap fields for AI meme filtering
  marketCap?: number;
  mcapTier?: string;
  hasViralPotential?: boolean;
}

interface WatchlistMatch {
  symbol: string;
  chain: string;
  priority: string;
  notes?: string;
  isOnWatchlist: boolean;
  distanceToEntry?: string; // e.g., "+15% above entry" or "AT ENTRY"
}

interface MemesDataContext {
  aiTokens: TokenData[];
  solanaTokens: TokenData[];
  baseTokens: TokenData[];
  apeCount: number;
  topApe: TokenData | null;
  smartMoneyTokens: { symbol: string; chain: string; buyers: number; netFlow: number }[];
  meteoraPools: { pair: string; apy: number; tvl: number }[];
  nansenCredits: { remaining: number; total: number } | null;
  nansenAvailable: boolean; // true if Nansen API is working (not in fallback mode)
  marketMood?: { mood: MarketMood; summary: string };
  isGmBriefing?: boolean; // true for concise GM mode
  // Early detection system
  watchlistMatches: WatchlistMatch[];
  recentAlerts: { type: string; title: string; timeAgo: string }[];
  walletSignals: { name: string; action: string; token: string }[];
  trenchFramework?: { name: string; summary: string };
  maintenanceReminder?: string;
  // Meme news from MandoMinutes
  memeNews: { title: string; sentiment: "bullish" | "bearish" | "neutral" }[];
}

function buildMemesDataContext(ctx: MemesDataContext): string {
  const lines: string[] = [];

  // DexScreener scan summary (always show what was scanned)
  const totalTokens = ctx.solanaTokens.length + ctx.baseTokens.length;
  lines.push("=== DEXSCREENER SCAN SUMMARY ===");
  lines.push(`Scanned: ${ctx.solanaTokens.length} Solana, ${ctx.baseTokens.length} Base tokens`);
  lines.push(`AI tokens found: ${ctx.aiTokens.length} (matching $1M-$20M mcap + AI keywords)`);
  lines.push(`APE signals: ${ctx.apeCount} tokens meeting APE criteria`);
  lines.push("");

  // Market mood header
  if (ctx.marketMood) {
    lines.push("=== MARKET MOOD ===");
    lines.push(ctx.marketMood.summary);
    lines.push("");
  }

  // Meme news from MandoMinutes (leftcurve category)
  if (ctx.memeNews.length > 0) {
    lines.push("=== MEME NEWS (MandoMinutes) ===");
    for (const news of ctx.memeNews) {
      const sentimentEmoji = news.sentiment === "bullish" ? "🟢" : news.sentiment === "bearish" ? "🔴" : "⚪";
      lines.push(`${sentimentEmoji} ${news.title} (${news.sentiment})`);
    }
    lines.push("");
  }

  // Recent alerts (priority)
  if (ctx.recentAlerts.length > 0) {
    lines.push("=== ACTIVE ALERTS ===");
    for (const alert of ctx.recentAlerts) {
      lines.push(`🔔 ${alert.title} (${alert.timeAgo})`);
    }
    lines.push("");
  }

  // Wallet signals (from tracked wallets)
  if (ctx.walletSignals.length > 0) {
    lines.push("=== WALLET SIGNALS ===");
    for (const signal of ctx.walletSignals) {
      lines.push(`🐋 ${signal.name} ${signal.action} ${signal.token}`);
    }
    lines.push("");
  }

  // Watchlist matches (tokens appearing on both scan and watchlist)
  if (ctx.watchlistMatches.length > 0) {
    lines.push("=== WATCHLIST HITS ===");
    for (const match of ctx.watchlistMatches) {
      const distStr = match.distanceToEntry ? ` [${match.distanceToEntry}]` : "";
      lines.push(`⭐ ${match.symbol} (${match.chain}) - ${match.priority} priority${distStr}`);
      if (match.notes) lines.push(`   Note: ${match.notes}`);
    }
    lines.push("");
  }

  // Smart money activity
  if (!ctx.nansenAvailable) {
    lines.push("=== SMART MONEY ===");
    lines.push("Nansen API unavailable - smart money data not included in this scan");
    lines.push("Analysis is based on DexScreener traction data only");
    lines.push("");
  } else if (ctx.smartMoneyTokens.length > 0) {
    lines.push("=== SMART MONEY (Nansen) ===");
    for (const token of ctx.smartMoneyTokens) {
      const flowSign = token.netFlow >= 0 ? "+" : "";
      lines.push(`${token.symbol} (${token.chain}): ${token.buyers} smart money buyers, ${flowSign}$${(token.netFlow / 1000).toFixed(0)}k net flow`);
    }
    if (ctx.nansenCredits) {
      lines.push(`Credits: ${ctx.nansenCredits.remaining}/${ctx.nansenCredits.total}`);
    }
    lines.push("");
  } else if (ctx.nansenAvailable) {
    lines.push("=== SMART MONEY (Nansen) ===");
    lines.push("No smart money activity detected on tracked tokens");
    if (ctx.nansenCredits) {
      lines.push(`Credits: ${ctx.nansenCredits.remaining}/${ctx.nansenCredits.total}`);
    }
    lines.push("");
  }

  // AI tokens (MOLT-tier plays: $1M-$20M mcap, viral potential)
  lines.push("=== AI TOKENS (MOLT-TIER) ===");
  if (ctx.aiTokens.length > 0) {
    for (const t of ctx.aiTokens) {
      const change = t.priceChange24h >= 0 ? `+${t.priceChange24h.toFixed(0)}%` : `${t.priceChange24h.toFixed(0)}%`;
      const mcapStr = t.marketCap ? `$${(t.marketCap / 1_000_000).toFixed(1)}M mcap` : "mcap unknown";
      const viralTag = t.hasViralPotential ? " [VIRAL POTENTIAL]" : "";
      lines.push(`${t.symbol} (${t.chain}): ${t.verdict} verdict${viralTag}`);
      lines.push(`  ${mcapStr} | Vol/Liq: ${t.volumeLiquidityRatio.toFixed(1)}x | 24h: ${change} | Liq: $${(t.liquidity / 1000).toFixed(0)}k`);
      if (t.hasMeteoraLp) lines.push(`  Has Meteora LP`);
      if (t.smartMoneyAccumulating) lines.push(`  Smart money accumulating (${t.smartMoneyBuyers} buyers)`);
    }
  } else {
    lines.push("No MOLT-tier AI tokens right now (need $1M-$20M mcap + traction)");
  }
  lines.push("");

  // Solana tokens (DexScreener trending)
  lines.push("=== SOLANA (DexScreener) ===");
  if (ctx.solanaTokens.length > 0) {
    for (const t of ctx.solanaTokens) {
      const change = t.priceChange24h >= 0 ? `+${t.priceChange24h.toFixed(0)}%` : `${t.priceChange24h.toFixed(0)}%`;
      const mcapStr = t.marketCap ? `$${(t.marketCap / 1_000_000).toFixed(2)}M mcap` : "";
      const liqStr = `$${(t.liquidity / 1000).toFixed(0)}k liq`;
      lines.push(`${t.symbol}: ${t.verdict} | ${mcapStr} | ${liqStr} | Vol/Liq: ${t.volumeLiquidityRatio.toFixed(1)}x | ${change}`);
    }
  } else {
    lines.push("No Solana tokens with traction on DexScreener");
  }
  lines.push("");

  // Base tokens (DexScreener trending)
  lines.push("=== BASE (DexScreener) ===");
  if (ctx.baseTokens.length > 0) {
    for (const t of ctx.baseTokens) {
      const change = t.priceChange24h >= 0 ? `+${t.priceChange24h.toFixed(0)}%` : `${t.priceChange24h.toFixed(0)}%`;
      const mcapStr = t.marketCap ? `$${(t.marketCap / 1_000_000).toFixed(2)}M mcap` : "";
      const liqStr = `$${(t.liquidity / 1000).toFixed(0)}k liq`;
      lines.push(`${t.symbol}: ${t.verdict} | ${mcapStr} | ${liqStr} | Vol/Liq: ${t.volumeLiquidityRatio.toFixed(1)}x | ${change}`);
    }
  } else {
    lines.push("No Base tokens with traction on DexScreener");
  }
  lines.push("");

  // APE signals
  if (ctx.apeCount > 0 && ctx.topApe) {
    lines.push("=== APE SIGNALS ===");
    lines.push(`${ctx.apeCount} tokens meeting APE criteria`);
    lines.push(`Top APE: ${ctx.topApe.symbol} (${ctx.topApe.chain}) - ${ctx.topApe.volumeLiquidityRatio.toFixed(1)}x vol/liq`);
    lines.push("");
  }

  // Meteora LP
  if (ctx.meteoraPools.length > 0) {
    lines.push("=== METEORA LP OPPORTUNITIES ===");
    for (const pool of ctx.meteoraPools) {
      lines.push(`${pool.pair}: ${pool.apy.toFixed(0)}% APY, $${(pool.tvl / 1000).toFixed(0)}k TVL`);
    }
    lines.push("");
  }

  // Trench framework (if relevant)
  if (ctx.trenchFramework) {
    lines.push("=== FRAMEWORK: " + ctx.trenchFramework.name.toUpperCase() + " ===");
    lines.push(ctx.trenchFramework.summary);
    lines.push("");
  }

  // Maintenance reminder
  if (ctx.maintenanceReminder) {
    lines.push("=== REMINDER ===");
    lines.push(ctx.maintenanceReminder);
    lines.push("");
  }

  return lines.join("\n");
}

// ==========================================
// Generate human briefing via LLM
// ==========================================

/**
 * Generate concise GM briefing (shorter daily format)
 */
async function generateGmBriefing(
  runtime: IAgentRuntime,
  dataContext: string
): Promise<string> {
  const prompt = `You are VINCE giving a quick GM briefing on the meme trenches.

Here's the data:

${dataContext}

Write a CONCISE daily summary (80-120 words max):

1. Lead with market mood in one sentence
2. If there's ONE standout AI meme, highlight it with mcap and verdict
3. Quick chain status: which chain is hottest (SOL/BASE)
4. One sentence on the play for today (or "no clear plays")

STYLE:
- Casual, quick read
- One standout > many mediocre
- Be decisive: APE, WATCH, or skip today
- Numbers matter: "$2M mcap doing 8x vol/liq"

Keep it to 80-120 words. This is a quick GM, not a full analysis.`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_MEMES] Failed to generate GM briefing: ${error}`);
    return "GM. Trenches are quiet, no standout plays.";
  }
}

async function generateMemesHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string
): Promise<string> {
  const prompt = `You are VINCE, analyzing AI memes with viral potential - looking for the next MOLT.

FOCUS: AI tokens in the $1M-$20M market cap range across Solana and Base. This is the MOLT zone - viral AI memes that can 5-10x.
- Sweet spot entry: $1.5M-$5M mcap with strong traction (3x+ vol/liq ratio)
- These are RARE. If nothing qualifies, be honest: "no MOLT-tier plays right now"
- MOLT hit $15M+ from ~$2M. That's the template we're hunting.
- Focus on Solana and Base for meme opportunities

Here's the data:

${dataContext}

Write a meme analysis that covers:
1. Start with whether there are any MOLT-tier AI plays today. Be direct - if nothing qualifies, say so.
2. If smart money is moving on AI tokens, lead with that - it's the most actionable signal
3. For qualifying AI tokens, explain market cap + upside potential. "AGENT at $2.1M mcap doing 8x vol/liq has room to run to $15-20M if the narrative holds"
4. ALWAYS mention the top trending tokens from each chain (Solana, Base) with their vol/liq ratios and price changes - this is DexScreener data, use it
5. If there's MEME NEWS from MandoMinutes, weave the relevant headlines into your narrative - these are current events in the meme space
6. Non-AI memes matter too - if there are strong APE signals, mention them with specific metrics
7. APE signals for tokens with viral potential - explain the bull case and target mcap
8. End with the take - what's the play today?

STYLE RULES:
- Write like a degen explaining MOLT-tier plays to another degen
- Market cap matters - always mention it for AI tokens: "$2M mcap", "$4.5M mcap"
- Volume/liquidity ratio signals traction - weave it naturally: "doing 8x volume"
- Have strong opinions on upside potential: "could 5x from here" or "already ran, late entry"
- APE = strong conviction, WATCH = interesting but wait for dip, AVOID = skip
- Around 150-250 words. Dense insight focused on AI memes.
- NO MARKDOWN FORMATTING. No **bold**, no *italic*, no headers. Plain text only. Use caps sparingly for emphasis.

AVOID:
- Wasting words on non-AI memes unless exceptional
- Being vague about market cap - always give specific numbers
- "Interestingly", "notably"
- Generic takes that could apply to any day
- Being overly cautious - we're hunting viral AI plays

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_MEMES] Failed to generate briefing: ${error}`);
    return "Trenches are glitching right now. DexScreener data's loading but can't get the take together. Give it another shot.";
  }
}

export const vinceMemesAction: Action = {
  name: "VINCE_MEMES",
  similes: ["MEMES", "MEMETICS", "MEMECOINS", "TRENCHES", "HOT_TOKENS", "AI_TOKENS", "MOLT", "SMART_MONEY"],
  description: "Human-style meme analysis with traction data, smart money tracking, and LP discovery",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("meme") ||
      text.includes("trenches") ||
      text.includes("hot token") ||
      text.includes("ai token") ||
      text.includes("molt") ||
      text.includes("pump") ||
      text.includes("ape") ||
      text.includes("smart money") ||
      text.includes("dexscreener") ||
      text.includes("nansen") ||
      (text.includes("base") && text.includes("solana")) ||
      // GM briefing triggers
      text === "gm" ||
      text.startsWith("gm ") ||
      text.includes("good morning") ||
      text.includes("daily briefing") ||
      text.includes("meme briefing")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ): Promise<void> => {
    try {
      const dexService = runtime.getService("VINCE_DEXSCREENER_SERVICE") as VinceDexScreenerService | null;
      const meteoraService = runtime.getService("VINCE_METEORA_SERVICE") as VinceMeteoraService | null;
      const watchlistService = runtime.getService("VINCE_WATCHLIST_SERVICE") as VinceWatchlistService | null;
      const alertService = runtime.getService("VINCE_ALERT_SERVICE") as VinceAlertService | null;
      const topTradersService = runtime.getService("VINCE_TOP_TRADERS_SERVICE") as VinceTopTradersService | null;
      const newsService = runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as VinceNewsSentimentService | null;
      
      // Use fallback factory for Nansen - gracefully degrades if API unavailable
      const nansenService = getOrCreateNansenService(runtime);
      const nansenAvailable = nansenService && !nansenService.isFallback?.();

      // Detect GM briefing mode
      const text = message.content.text?.toLowerCase() || "";
      const isGmBriefing = text === "gm" || text.startsWith("gm ") || 
                           text.includes("good morning") || text.includes("daily briefing");

      if (!dexService) {
        await callback({
          text: "DexScreener's down right now. Can't scan the trenches without it. Try again in a bit.",
          actions: ["VINCE_MEMES"],
        });
        return;
      }

      logger.info(`[VINCE_MEMES] ${isGmBriefing ? "GM briefing" : "Scanning trenches"}...`);
      if (!nansenAvailable) {
        logger.warn("[VINCE_MEMES] Nansen unavailable - proceeding with DexScreener data only");
      }
      await dexService.refreshData();

      // Run alert detection
      if (alertService) {
        await alertService.checkForAlerts(watchlistService, topTradersService, dexService);
      }

      // Get market mood
      const marketMood = dexService.getMarketMood();

      // Build context
      const ctx: MemesDataContext = {
        aiTokens: [],
        solanaTokens: [],
        baseTokens: [],
        apeCount: 0,
        topApe: null,
        smartMoneyTokens: [],
        meteoraPools: [],
        nansenCredits: null,
        nansenAvailable: nansenAvailable,
        marketMood,
        isGmBriefing,
        watchlistMatches: [],
        recentAlerts: [],
        walletSignals: [],
        memeNews: [],
      };

      // Get recent alerts (high priority)
      if (alertService) {
        const highPriorityAlerts = alertService.getHighPriorityAlerts().slice(0, 3);
        ctx.recentAlerts = highPriorityAlerts.map(a => ({
          type: a.type,
          title: a.title,
          timeAgo: getTimeAgo(a.timestamp),
        }));
      }

      // Get wallet signals
      if (topTradersService) {
        await topTradersService.refreshData();
        const recentSignals = topTradersService.getHighPrioritySignals(5);
        ctx.walletSignals = recentSignals.map(s => ({
          name: s.traderName || s.address.slice(0, 8),
          action: s.action,
          token: s.asset,
        }));
      }

      // Get watchlist maintenance reminder
      if (watchlistService) {
        ctx.maintenanceReminder = watchlistService.getMaintenanceReminder() || undefined;
      }

      // Get relevant trench framework (for LP opportunities)
      try {
        if (text.includes("lp") || text.includes("liquidity") || text.includes("meteora")) {
          const framework = await getFrameworkForTopic("lp liquidity meteora");
          if (framework) {
            ctx.trenchFramework = {
              name: framework.name,
              summary: framework.keyPoints.slice(0, 2).join(". ") + ".",
            };
          }
        }
      } catch (error) {
        logger.debug(`[VINCE_MEMES] Failed to get trench framework: ${error}`);
      }

      // Get meme news from MandoMinutes (leftcurve category)
      if (newsService) {
        try {
          const leftcurveNews = newsService.getNewsByCategory("leftcurve");
          ctx.memeNews = leftcurveNews.slice(0, 5).map(n => ({
            title: n.title,
            sentiment: n.sentiment,
          }));
          logger.debug(`[VINCE_MEMES] Got ${ctx.memeNews.length} leftcurve news items`);
        } catch (error) {
          logger.debug(`[VINCE_MEMES] Failed to get meme news: ${error}`);
        }
      }

      // Smart money (only if Nansen is available and not in fallback mode)
      if (nansenAvailable && nansenService) {
        ctx.nansenCredits = nansenService.getCreditUsage();
        if (ctx.nansenCredits.remaining > 0) {
          const hotMemes = await nansenService.getHotMemeTokens();
          ctx.smartMoneyTokens = hotMemes.slice(0, 3).map(t => ({
            symbol: t.tokenSymbol,
            chain: t.chain,
            buyers: t.smartMoneyBuyers,
            netFlow: t.netFlow,
          }));
        }
      }

      // AI tokens (MOLT-tier: $1M-$20M mcap with viral potential)
      // First try hot AI memes with viral potential, then fall back to all qualified AI memes
      let aiTokens = dexService.getHotAiMemes();
      if (aiTokens.length === 0) {
        aiTokens = dexService.getAllQualifiedAiMemes();
      }
      
      for (const token of aiTokens.slice(0, 5)) { // Show top 5 instead of 3
        const tokenData: TokenData = {
          symbol: token.symbol,
          chain: token.chain,
          verdict: token.verdict,
          volumeLiquidityRatio: token.volumeLiquidityRatio,
          priceChange24h: token.priceChange24h,
          liquidity: token.liquidity,
          marketCap: token.marketCap,
          mcapTier: token.mcapTier,
          hasViralPotential: token.hasViralPotential,
        };

        if (meteoraService && token.chain === "solana") {
          tokenData.hasMeteoraLp = await meteoraService.hasLpPool(token.address);
        }
        // Only check smart money if Nansen is available (not in fallback mode)
        if (nansenAvailable && nansenService && token.chain === "solana") {
          const accum = await nansenService.isSmartMoneyAccumulating("solana", token.address);
          tokenData.smartMoneyAccumulating = accum.accumulating;
          tokenData.smartMoneyBuyers = accum.topBuyers?.length || 0;
        }
        ctx.aiTokens.push(tokenData);

        // Check if token is on watchlist
        if (watchlistService && watchlistService.isWatched(token.symbol)) {
          const watchedToken = watchlistService.getWatchedToken(token.symbol);
          if (watchedToken) {
            let distanceToEntry: string | undefined;
            if (watchedToken.entryTarget && token.marketCap) {
              const diff = ((token.marketCap - watchedToken.entryTarget) / watchedToken.entryTarget) * 100;
              if (diff <= 5 && diff >= -5) {
                distanceToEntry = "AT ENTRY TARGET";
              } else if (diff > 0) {
                distanceToEntry = `+${diff.toFixed(0)}% above entry`;
              } else {
                distanceToEntry = `${diff.toFixed(0)}% below entry`;
              }
            }
            ctx.watchlistMatches.push({
              symbol: token.symbol,
              chain: token.chain,
              priority: watchedToken.priority,
              notes: watchedToken.notes,
              isOnWatchlist: true,
              distanceToEntry,
            });
          }
        }
      }

      // Solana tokens (show top 5 for better DexScreener coverage)
      ctx.solanaTokens = dexService.getTokensByChain("solana").slice(0, 5).map(t => ({
        symbol: t.symbol,
        chain: t.chain,
        verdict: t.verdict,
        volumeLiquidityRatio: t.volumeLiquidityRatio,
        priceChange24h: t.priceChange24h,
        liquidity: t.liquidity,
        marketCap: t.marketCap,
      }));

      // Base tokens (show top 5 for better DexScreener coverage)
      ctx.baseTokens = dexService.getTokensByChain("base").slice(0, 5).map(t => ({
        symbol: t.symbol,
        chain: t.chain,
        verdict: t.verdict,
        volumeLiquidityRatio: t.volumeLiquidityRatio,
        priceChange24h: t.priceChange24h,
        liquidity: t.liquidity,
        marketCap: t.marketCap,
      }));

      // APE signals
      const apeTokens = dexService.getApeTokens();
      ctx.apeCount = apeTokens.length;
      if (apeTokens.length > 0) {
        ctx.topApe = {
          symbol: apeTokens[0].symbol,
          chain: apeTokens[0].chain,
          verdict: apeTokens[0].verdict,
          volumeLiquidityRatio: apeTokens[0].volumeLiquidityRatio,
          priceChange24h: apeTokens[0].priceChange24h,
          liquidity: apeTokens[0].liquidity,
        };
      }

      // Meteora LP
      if (meteoraService) {
        await meteoraService.refreshData();
        const memeOpps = meteoraService.getMemePoolOpportunities();
        ctx.meteoraPools = memeOpps.slice(0, 2).map(p => ({
          pair: `${p.tokenA}/${p.tokenB}`,
          apy: p.apy,
          tvl: p.tvl,
        }));
      }

      // Generate briefing
      const dataContext = buildMemesDataContext(ctx);
      logger.info(`[VINCE_MEMES] Generating ${isGmBriefing ? "GM" : "full"} briefing...`);
      
      // Use appropriate briefing generator
      const briefing = isGmBriefing 
        ? await generateGmBriefing(runtime, dataContext)
        : await generateMemesHumanBriefing(runtime, dataContext);

      // Build source attribution with clear status
      const sources: string[] = [];
      if (dexService) sources.push("DexScreener");
      if (nansenAvailable && ctx.nansenCredits && ctx.nansenCredits.remaining > 0) {
        sources.push("Nansen Smart Money");
      }
      if (meteoraService) sources.push("Meteora");

      // Add note if Nansen was unavailable
      const nansenNote = !nansenAvailable 
        ? "\n*DexScreener data - no qualifying AI tokens in target range*" 
        : "";

      // Different output format for GM vs full report
      const title = isGmBriefing ? "GM Meme Brief" : "Trenches Report";
      const commands = isGmBriefing 
        ? "*Say 'memes' for full analysis. DD [token] for deep dive.*"
        : "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, DD [token]*";

      const output = [
        title,
        "",
        briefing,
        nansenNote,
        sources.length > 0 ? `*Source: ${sources.join(", ")}*` : "",
        "",
        "---",
        commands,
      ].filter(line => line !== "").join("\n");

      await callback({
        text: output,
        actions: ["VINCE_MEMES"],
      });

      logger.info("[VINCE_MEMES] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_MEMES] Error: ${error}`);
      await callback({
        text: "Trenches scan failed. DexScreener or Nansen might be rate limiting. Give it a minute.",
        actions: ["VINCE_MEMES"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What's hot in memes?" } },
      {
        name: "VINCE",
        content: {
          text: "Trenches Report\n\nTrenches are cooking today. Smart money just started piling into MOLT on Solana - 4 wallets accumulated over the past 6 hours with $180k net inflow. That's the lead.\n\nAI tokens sector is where the action is. MOLT's doing 12x volume-to-liquidity which is aggressive for a $240k pool. Up 45% on the day and it's got a Meteora LP so you can actually exit if needed. That's an APE from me. AIMEME on Base is showing similar patterns at 8x vol/liq but no smart money confirmation yet - WATCH for now.\n\nSolana is hotter than Base right now. Besides MOLT, there's DEGEN doing 6x with solid liquidity at $400k. Base is quiet - BRETT is the only thing moving and it's just 3x vol/liq, barely worth looking at.\n\nTwo APE signals total. MOLT is the obvious play if you're going to degen. The smart money entry plus the vol/liq ratio is the setup I look for.\n\nMeteora's got a MOLT/SOL pool at 180% APY if you want to LP instead of hold. Not bad for a meme.\n\nMy take: MOLT is the play today. Smart money leading, volume confirming. Size appropriately - memes can rug fast.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_MEMES"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Any AI tokens with traction?" } },
      {
        name: "VINCE",
        content: {
          text: "Trenches Report\n\nAI sector is mid today, not gonna lie. Nothing screaming APE but a couple worth watching.\n\nCLAUDE on Solana is the most interesting - 5x vol/liq and up 22% but liquidity is thin at $85k. That's a problem if you want to get out fast. Smart money isn't touching it yet which tells me the move might already be done. WATCH but don't ape.\n\nAIMEME on Base has better liquidity at $320k but the volume ratio is weak at 2.5x. That's barely above the noise floor. People are watching it but not buying aggressively. Skip for now.\n\nNo AI tokens hitting APE criteria today. The setup I want is 8x+ vol/liq, smart money accumulating, and ideally a Meteora LP for exit liquidity. Nothing checks all three boxes right now.\n\nSolana in general is outperforming Base on memes today. If you're going to degen, at least stick to the chain with better action.\n\nHonest take: Wait for a better setup. Forcing trades in the AI sector when the signals are weak is how you get rugged. Let me know when smart money starts moving and we'll revisit.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_MEMES"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Where is smart money accumulating?" } },
      {
        name: "VINCE",
        content: {
          text: "Trenches Report\n\nSmart money is active today. Three tokens showing accumulation on Nansen.\n\nMOLT on Solana is the standout - 4 smart wallets bought in over the past 8 hours with +$180k net flow. That's real conviction, not just one whale. The token is also doing 12x vol/liq so retail is following. This is the smart money + volume confluence I look for.\n\nWIF seeing 2 buyers with +$45k flow but that's smaller. Could be early or could be nothing. The vol/liq is only 3x which isn't exciting. WATCH territory.\n\nPEPE on Base has one smart wallet with +$90k but single wallet entries are less reliable. Could be an insider, could be someone who's about to dump. Base in general is quieter than Solana today.\n\nNansen credits at 67/100 so we've got runway to keep tracking.\n\nThe pattern: When smart money enters AND volume follows, that's the setup. MOLT has both. WIF and PEPE have smart money but volume isn't confirming yet.\n\nMy read: MOLT is the only one where smart money and retail are aligned. That's where I'd put attention if I'm going to trade memes today.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_MEMES"],
        },
      },
    ],
  ],
};
