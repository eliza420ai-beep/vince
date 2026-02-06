/**
 * VINCE GM Action
 *
 * Human-style morning briefing that reads like a friend texting you.
 * Uses LLM to generate conversational narrative across all focus areas.
 *
 * Features:
 * - OPTIONS context (Deribit + CoinGlass)
 * - PERPS signals
 * - MEMETICS hot tokens (DexScreener + Nansen)
 * - NEWS summary
 * - LIFESTYLE suggestions
 * - ART/NFT floors
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceMarketDataService } from "../services/marketData.service";
import type { VinceDexScreenerService } from "../services/dexscreener.service";
import type { VinceLifestyleService } from "../services/lifestyle.service";
import type { VinceNFTFloorService } from "../services/nftFloor.service";
import type { VinceDeribitService } from "../services/deribit.service";
import type { VinceNansenService } from "../services/nansen.service";
import type { VinceSanbaseService } from "../services/sanbase.service";
import type { VinceBinanceService } from "../services/binance.service";
import type { VinceBinanceLiquidationService } from "../services/binanceLiquidation.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";

// ==========================================
// Build comprehensive data context for LLM
// ==========================================

interface GmDataContext {
  day: string;
  date: string;
  isFriday: boolean;
  options: string[];
  perps: string[];
  news: string[];
  memes: string[];
  lifestyle: string[];
  nft: string[];
  binanceIntel: string[];
  onChain: string[];
}

function buildGmDataContext(ctx: GmDataContext): string {
  const lines: string[] = [];

  lines.push(`=== ${ctx.day.toUpperCase()}, ${ctx.date} ===`);
  if (ctx.isFriday) {
    lines.push("FRIDAY - Strike selection ritual day");
  }
  lines.push("");

  if (ctx.options.length > 0) {
    lines.push("=== OPTIONS ===");
    lines.push(...ctx.options);
    lines.push("");
  }

  if (ctx.perps.length > 0) {
    lines.push("=== PERPS ===");
    lines.push(...ctx.perps);
    lines.push("");
  }

  if (ctx.binanceIntel.length > 0) {
    lines.push("=== BINANCE INTEL ===");
    lines.push(...ctx.binanceIntel);
    lines.push("");
  }

  if (ctx.news.length > 0) {
    lines.push("=== NEWS ===");
    lines.push(...ctx.news);
    lines.push("");
  }

  if (ctx.onChain.length > 0) {
    lines.push("=== ON-CHAIN ===");
    lines.push(...ctx.onChain);
    lines.push("");
  }

  if (ctx.memes.length > 0) {
    lines.push("=== MEMES ===");
    lines.push(...ctx.memes);
    lines.push("");
  }

  if (ctx.lifestyle.length > 0) {
    lines.push("=== LIFESTYLE ===");
    lines.push(...ctx.lifestyle);
    lines.push("");
  }

  if (ctx.nft.length > 0) {
    lines.push("=== NFT FLOORS ===");
    lines.push(...ctx.nft);
  }

  return lines.join("\n");
}

// ==========================================
// Generate human briefing via LLM
// ==========================================

async function generateGmHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
  isFriday: boolean,
): Promise<string> {
  const fridayNote = isFriday
    ? "It's FRIDAY - strike selection day. Make sure to mention this prominently."
    : "";

  const prompt = `You are VINCE, giving a morning briefing to your friend. This is a comprehensive GM that covers markets, trading, lifestyle - everything they need to know to start the day. ${fridayNote}

Here's the data:

${dataContext}

Write a morning briefing that:
1. Opens with the overall vibe - what kind of day is it? Markets scared, greedy, choppy?
2. Hit the most actionable stuff first - if there's a trade setup or something urgent, lead with that
3. Flow through the areas naturally - don't treat each section separately, connect them when relevant
4. If it's Friday, make the options strike selection prominent
5. Lifestyle suggestions should feel natural, not bolted on - "After you set those strikes, hit the pool"
6. NFT thin floors only matter if there's an actual opportunity
7. End with a take - what's the priority for the day?

STYLE RULES:
- Write like a friend giving you the morning download
- Mix short punchy takes with explanations
- Use specific numbers naturally - "BTC at 82k" not "BTC: $82,000"
- No headers, no bullet points - flowing prose
- Have personality and opinions
- Connect dots between areas - if fear index is high and puts are paying well, mention both together
- Around 250-400 words. Comprehensive but not bloated.

AVOID:
- "Interestingly", "notably"
- Section headers like "OPTIONS:" or "PERPS:"
- Starting multiple sentences with the same word
- Generic observations
- Being overly cautious or hedging everything

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_GM] Failed to generate briefing: ${error}`);
    return "Morning. Having trouble pulling everything together right now. Try asking about specific areas: OPTIONS, PERPS, MEMES, or LIFESTYLE.";
  }
}

export const vinceGmAction: Action = {
  name: "VINCE_GM",
  similes: [
    "GM",
    "GOOD_MORNING",
    "MORNING_BRIEFING",
    "VINCE_BRIEFING",
    "DAILY_BRIEFING",
  ],
  description:
    "Human-style morning briefing across all focus areas - OPTIONS, PERPS, MEMES, LIFESTYLE, and ART",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("gm") ||
      text.includes("good morning") ||
      text.includes("morning") ||
      text.includes("briefing") ||
      text.includes("what's up") ||
      text.includes("status")
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
      const now = new Date();
      const day = now.toLocaleDateString("en-US", { weekday: "long" });
      const date = now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const isFriday = day === "Friday";

      logger.info("[VINCE_GM] Building morning briefing...");

      const ctx: GmDataContext = {
        day,
        date,
        isFriday,
        options: [],
        perps: [],
        news: [],
        memes: [],
        lifestyle: [],
        nft: [],
        binanceIntel: [],
        onChain: [],
      };

      // OPTIONS
      const deribitService = runtime.getService(
        "VINCE_DERIBIT_SERVICE",
      ) as VinceDeribitService | null;
      const coinglassService = runtime.getService(
        "VINCE_COINGLASS_SERVICE",
      ) as VinceCoinGlassService | null;

      if (deribitService) {
        const btcCtx = await deribitService.getOptionsContext("BTC");
        if (btcCtx.spotPrice) {
          ctx.options.push(`BTC: $${btcCtx.spotPrice.toLocaleString()}`);
          if (btcCtx.dvol) ctx.options.push(`DVOL: ${btcCtx.dvol.toFixed(1)}%`);
          if (btcCtx.ivSurface) {
            ctx.options.push(
              `Skew: ${btcCtx.ivSurface.skewInterpretation} (${btcCtx.ivSurface.skew.toFixed(1)}%)`,
            );
          }
          if (btcCtx.bestCoveredCalls.length > 0) {
            const topCC = btcCtx.bestCoveredCalls[0];
            ctx.options.push(
              `Top covered call: $${topCC.strike.toLocaleString()} @ ${topCC.yield7Day.toFixed(2)}%/week`,
            );
          }
          if (btcCtx.bestCashSecuredPuts.length > 0) {
            const topPut = btcCtx.bestCashSecuredPuts[0];
            ctx.options.push(
              `Top put: $${topPut.strike.toLocaleString()} @ ${topPut.yield7Day.toFixed(2)}%/week`,
            );
          }
        }
      }

      if (coinglassService) {
        await coinglassService.refreshData();
        const fg = coinglassService.getFearGreed();
        if (fg) {
          ctx.options.push(`Fear/Greed: ${fg.value} (${fg.classification})`);
        }
      }

      // PERPS
      if (coinglassService) {
        const btcSignal = coinglassService.generateSignal("BTC");
        const ethSignal = coinglassService.generateSignal("ETH");
        const btcFunding = coinglassService.getFunding("BTC");
        const btcLS = coinglassService.getLongShortRatio("BTC");

        if (btcSignal)
          ctx.perps.push(
            `BTC signal: ${btcSignal.direction.toUpperCase()} (${btcSignal.strength}% strength)`,
          );
        if (ethSignal)
          ctx.perps.push(
            `ETH signal: ${ethSignal.direction.toUpperCase()} (${ethSignal.strength}% strength)`,
          );
        if (btcFunding)
          ctx.perps.push(`BTC Funding: ${(btcFunding.rate * 100).toFixed(4)}%`);
        if (btcLS)
          ctx.perps.push(
            `BTC L/S: ${btcLS.ratio.toFixed(2)} (${btcLS.longPercent.toFixed(0)}% long)`,
          );
      }

      // NEWS
      const newsService = runtime.getService(
        "VINCE_NEWS_SENTIMENT_SERVICE",
      ) as VinceNewsSentimentService | null;
      if (newsService) {
        await newsService.refreshData();
        if (newsService.hasData()) {
          const briefing = newsService.formatHumanBriefing();
          if (briefing.riskAlert) ctx.news.push(`RISK: ${briefing.riskAlert}`);
          ctx.news.push(briefing.summary);
          ctx.news.push(`Mood: ${briefing.conclusion}`);
        }
      }

      // BINANCE INTEL
      const binanceService = runtime.getService(
        "VINCE_BINANCE_SERVICE",
      ) as VinceBinanceService | null;
      if (binanceService) {
        const intel = await binanceService.getIntelligence("BTC");
        const intelLines = binanceService.formatIntelligence(intel);
        ctx.binanceIntel.push(...intelLines);
      }

      // ON-CHAIN
      const sanbaseService = runtime.getService(
        "VINCE_SANBASE_SERVICE",
      ) as VinceSanbaseService | null;
      if (sanbaseService && sanbaseService.isConfigured()) {
        const btcOnChain = await sanbaseService.getOnChainContext("BTC");
        if (btcOnChain.networkActivity)
          ctx.onChain.push(`Network: ${btcOnChain.networkActivity.trend}`);
        if (btcOnChain.exchangeFlows)
          ctx.onChain.push(
            `Exchange Flows: ${btcOnChain.exchangeFlows.sentiment}`,
          );
        if (btcOnChain.whaleActivity)
          ctx.onChain.push(`Whales: ${btcOnChain.whaleActivity.sentiment}`);
      }

      // MEMES
      const dexService = runtime.getService(
        "VINCE_DEXSCREENER_SERVICE",
      ) as VinceDexScreenerService | null;
      const nansenService = runtime.getService(
        "VINCE_NANSEN_SERVICE",
      ) as VinceNansenService | null;

      if (dexService) {
        await dexService.refreshData();
        const aiTokens = dexService.getAiTokens();
        const apeTokens = dexService.getApeTokens();

        if (aiTokens.length > 0) {
          const top = aiTokens[0];
          ctx.memes.push(
            `Top AI token: ${top.symbol} - ${top.verdict} (${top.volumeLiquidityRatio.toFixed(1)}x vol/liq)`,
          );
        }
        if (apeTokens.length > 0) {
          ctx.memes.push(
            `APE signals: ${apeTokens.length} tokens with high traction`,
          );
        }
      }

      if (nansenService) {
        const creditUsage = nansenService.getCreditUsage();
        if (creditUsage.remaining > 0) {
          const hotMemes = await nansenService.getHotMemeTokens();
          if (hotMemes.length > 0) {
            const top = hotMemes[0];
            ctx.memes.push(
              `Smart money accumulating: ${top.tokenSymbol} (${top.smartMoneyBuyers} buyers)`,
            );
          }
        }
      }

      // LIFESTYLE
      const lifestyleService = runtime.getService(
        "VINCE_LIFESTYLE_SERVICE",
      ) as VinceLifestyleService | null;
      if (lifestyleService) {
        const briefing = lifestyleService.getDailyBriefing();
        const topSuggestions = lifestyleService.getTopSuggestions(2);
        for (const s of topSuggestions) {
          ctx.lifestyle.push(s.suggestion);
        }
        if (briefing.specialNotes.length > 0) {
          ctx.lifestyle.push(...briefing.specialNotes);
        }
      }

      // NFT FLOORS
      const nftService = runtime.getService(
        "VINCE_NFT_FLOOR_SERVICE",
      ) as VinceNFTFloorService | null;
      if (nftService) {
        const allFloors = nftService.getAllFloors();
        const opportunities = allFloors.filter((c) => {
          const gapPct =
            c.floorPrice > 0 ? (c.gaps.to2nd / c.floorPrice) * 100 : 0;
          const hasRealData = c.nftsNearFloor > 0 || c.gaps.to2nd > 0;
          return c.floorThicknessScore < 40 && hasRealData && gapPct >= 5;
        });

        if (opportunities.length > 0) {
          ctx.nft.push(`${opportunities.length} thin floor opportunities`);
          for (const c of opportunities.slice(0, 2)) {
            const gapPct = ((c.gaps.to2nd / c.floorPrice) * 100).toFixed(0);
            ctx.nft.push(
              `${c.name}: ${c.floorPrice.toFixed(2)} ETH (${gapPct}% gap to 2nd)`,
            );
          }
        } else {
          ctx.nft.push("No thin floors - all collections have thick floors");
        }
      }

      // Generate LLM briefing
      const dataContext = buildGmDataContext(ctx);
      logger.info("[VINCE_GM] Generating briefing...");
      const briefing = await generateGmHumanBriefing(
        runtime,
        dataContext,
        isFriday,
      );

      // Build source attribution (exclude Lifestyle, NFT)
      const sources: string[] = [];
      if (deribitService) sources.push("Deribit");
      if (coinglassService) sources.push("CoinGlass");
      if (binanceService) sources.push("Binance");
      if (sanbaseService && sanbaseService.isConfigured())
        sources.push("Sanbase");
      if (dexService) sources.push("DexScreener");
      if (nansenService) sources.push("Nansen");
      if (newsService) sources.push("News Sentiment");

      const output = [
        `**GM!** _${day}, ${date}_`,
        "",
        briefing,
        "",
        sources.length > 0 ? `*Source: ${sources.join(", ")}*` : "",
        "",
        "---",
        "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
      ]
        .filter((line) => line !== "")
        .join("\n");

      await callback({
        text: output,
        actions: ["VINCE_GM"],
      });

      logger.info("[VINCE_GM] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_GM] Error: ${error}`);
      await callback({
        text: "Morning. Having trouble pulling everything together. Try asking about specific areas: OPTIONS, PERPS, MEMES, or LIFESTYLE.",
        actions: ["VINCE_GM"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "GM" } },
      {
        name: "VINCE",
        content: {
          text: "**GM!** _Friday, Jan 31_\n\nMorning. It's Friday so you know the drill - strike selection day.\n\nMarkets are in fear mode at 28 but not panic. BTC grinding at 82k, DVOL sitting at 47 which is actually decent for premium selling. The skew is elevated on puts right now - 25-delta puts running 52% IV while calls are at 44%. That 8-point spread tells you the market is paying up for downside protection, which is exactly when you want to be selling it.\n\nTop covered call is the 89k strike paying 1.4% for the week. That's 73% annualized if you keep rolling. BTC needs to rally 8.5% to hit you there. Given the fear reading, I don't see a face-ripper coming. The 76k puts are paying 1.7% which is juicier - fear premium at work.\n\nPerps are quiet. BTC signal is SHORT but weak at 52% strength. Funding is negative so shorts are paying, L/S at 2.4 meaning longs still crowded. Not trading this setup.\n\nMeme trenches have some heat. MOLT on Solana showing smart money accumulation with 4 buyers and 12x vol/liq. That's the APE signal if you're going to degen today.\n\nNo thin NFT floors worth sweeping. Pudgies and Penguins both have thick floors.\n\nAfter you set those strikes, hit the pool. It's warm out there.\n\nPriority today: Write BTC puts at 76k. The skew is paying you a fear premium that looks overdone.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_GM"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Good morning, what's up?" } },
      {
        name: "VINCE",
        content: {
          text: "**GM!** _Tuesday, Feb 4_\n\nMorning. Market vibes are neutral today - fear/greed at 48, nobody positioned for anything which is why vol is crushed.\n\nBTC at 85k with DVOL crashed to 38. That's low - like suspiciously low. Realized vol is actually running hotter at 43 so options are trading cheap. Not a great environment for premium selling but when IV gets this compressed it tends to mean-revert up on any shock.\n\nPerps showing mild bullish signal at 58% strength. Funding flipped positive overnight, L/S at 1.6 which is more balanced than last week. ETH is following at 62% bullish. Could be setting up for a move but signal isn't strong enough to trade.\n\nTrenches are mid. No AI tokens hitting APE criteria. CLAUDE on Solana is the most interesting at 5x vol/liq but liquidity is thin at $85k. Smart money isn't touching it. Skip.\n\nNews is quiet. No risk events flagged. The ETF flows story continues - another $180M came in yesterday which keeps the bid under price.\n\nOn-chain shows whales still accumulating according to Sanbase but that data has 30-day lag so take it with salt.\n\nGym day - pool season starts in April. Then focus on that project you've been putting off.\n\nHonest take: Sit on hands today. Vol is crushed, signals are weak, nothing in the trenches worth aping. Sometimes the best trade is no trade.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_GM"],
        },
      },
    ],
  ],
};
