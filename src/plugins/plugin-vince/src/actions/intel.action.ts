/**
 * VINCE INTEL Action
 *
 * Human-style market intelligence that reads like a trader friend texting you.
 * Uses LLM to generate conversational narrative from Binance data.
 *
 * Features:
 * - Top Trader Positions (by SIZE)
 * - Taker Buy/Sell Volume (order flow)
 * - OI Divergence Detection
 * - Funding Rate Analysis
 * - Cross-Exchange Arbitrage
 * - Liquidation Pressure
 * - Fear & Greed Index
 *
 * All FREE APIs - no paid subscriptions required!
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VinceBinanceService } from "../services/binance.service";
import type { VinceBinanceLiquidationService } from "../services/binanceLiquidation.service";

// ==========================================
// Build data context for LLM
// ==========================================

interface IntelDataContext {
  asset: string;
  topTraders: string[];
  orderFlow: string[];
  oiTrend: string[];
  funding: string[];
  crossExchange: string[];
  liquidations: string[];
  fearGreed: string[];
}

function buildIntelDataContext(ctx: IntelDataContext): string {
  const lines: string[] = [];

  lines.push(`=== ${ctx.asset} MARKET INTELLIGENCE ===`);
  lines.push("");

  if (ctx.topTraders.length > 0) {
    lines.push("TOP TRADERS (by position size):");
    lines.push(...ctx.topTraders);
    lines.push("");
  }

  if (ctx.orderFlow.length > 0) {
    lines.push("ORDER FLOW (taker buy/sell):");
    lines.push(...ctx.orderFlow);
    lines.push("");
  }

  if (ctx.oiTrend.length > 0) {
    lines.push("OPEN INTEREST:");
    lines.push(...ctx.oiTrend);
    lines.push("");
  }

  if (ctx.funding.length > 0) {
    lines.push("FUNDING RATES:");
    lines.push(...ctx.funding);
    lines.push("");
  }

  if (ctx.crossExchange.length > 0) {
    lines.push("CROSS-EXCHANGE FUNDING:");
    lines.push(...ctx.crossExchange);
    lines.push("");
  }

  if (ctx.liquidations.length > 0) {
    lines.push("LIQUIDATION PRESSURE:");
    lines.push(...ctx.liquidations);
    lines.push("");
  }

  if (ctx.fearGreed.length > 0) {
    lines.push("FEAR & GREED:");
    lines.push(...ctx.fearGreed);
  }

  return lines.join("\n");
}

// ==========================================
// Generate human briefing via LLM
// ==========================================

async function generateIntelHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
  asset: string
): Promise<string> {
  const prompt = `You are VINCE, giving a market intelligence briefing on ${asset}. You're texting this to a trader friend - be real about what the data tells you.

Here's the data:

${dataContext}

Write a market intel briefing that:
1. Lead with the most important signal - what's the main takeaway?
2. Connect the dots between signals. If whales are long AND OI is rising AND funding is normal, that's bullish conviction. If whales are long but OI is falling, weak hands are exiting.
3. Explain what the data MEANS, not just what it is. "62% long is crowded" tells me something. "62% long" alone doesn't.
4. Call out extremes - if funding is extreme, if positioning is crowded, if there's a cascade happening
5. If there's an arb opportunity, mention it practically
6. End with the trade implication - what would you do with this info?

INTERPRETATION GUIDE:
- Top traders >55% long = crowded longs, fade risk. <45% long = shorts crowded
- Buy/sell ratio >1.1 = buying pressure, <0.9 = selling pressure
- OI rising + price rising = conviction. OI falling = positions closing, weak hands exiting
- Extreme funding = mean reversion coming. Longs paying too much = short squeeze candidate when they capitulate
- Liquidations = pain. Long liqs at bottom = potential reversal. Short liqs at top = potential reversal

STYLE RULES:
- Write like explaining to a smart trader friend
- Short punchy insights mixed with explanations
- Use specific numbers naturally
- No bullet points or headers - flow naturally
- Have opinions. If the setup looks like a fade, say it.
- Around 150-250 words. Dense insight, no padding.

AVOID:
- "Interestingly", "notably"
- Just restating numbers without interpretation
- Being overly cautious about everything

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_INTEL] Failed to generate briefing: ${error}`);
    return "Intel is glitching. Binance APIs might be rate limiting. Try again in a minute.";
  }
}

export const vinceIntelAction: Action = {
  name: "VINCE_INTEL",
  similes: ["INTEL", "BINANCE_INTEL", "MARKET_INTEL", "WHALES", "WHAT_ARE_WHALES_DOING", "SHOW_INTEL"],
  description: "Human-style Binance market intelligence - top trader positions, order flow, liquidations interpreted conversationally",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("intel") ||
      text.includes("whales") ||
      text.includes("what are traders") ||
      text.includes("top traders") ||
      text.includes("liquidations") ||
      text.includes("order flow") ||
      text.includes("taker") ||
      text.includes("market intelligence")
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
      const text = message.content.text?.toLowerCase() || "";

      // Determine asset
      let asset = "BTC";
      if (text.includes("eth") || text.includes("ethereum")) {
        asset = "ETH";
      } else if (text.includes("sol") || text.includes("solana")) {
        asset = "SOL";
      }

      const binanceService = runtime.getService("VINCE_BINANCE_SERVICE") as VinceBinanceService | null;
      const liqService = runtime.getService("VINCE_BINANCE_LIQUIDATION_SERVICE") as VinceBinanceLiquidationService | null;

      if (!binanceService) {
        await callback({
          text: "Binance Intel is down. Can't get you the whale data right now. Try again in a bit.",
          actions: ["VINCE_INTEL"],
        });
        return;
      }

      logger.info(`[VINCE_INTEL] Gathering ${asset} intelligence...`);

      const symbol = `${asset}USDT`;
      const ctx: IntelDataContext = {
        asset,
        topTraders: [],
        orderFlow: [],
        oiTrend: [],
        funding: [],
        crossExchange: [],
        liquidations: [],
        fearGreed: [],
      };

      // Top Traders
      const topTraders = await binanceService.getTopTraderPositions(symbol);
      if (topTraders) {
        ctx.topTraders.push(`${topTraders.longPosition.toFixed(1)}% long / ${topTraders.shortPosition.toFixed(1)}% short`);
        ctx.topTraders.push(`L/S Ratio: ${topTraders.longShortRatio.toFixed(2)}`);
      }

      // Order Flow
      const takerVol = await binanceService.getTakerVolume(symbol);
      if (takerVol) {
        ctx.orderFlow.push(`Buy/Sell Ratio: ${takerVol.buySellRatio.toFixed(3)}`);
        ctx.orderFlow.push(`Buy: ${(takerVol.buyVol * 100).toFixed(1)}% | Sell: ${(takerVol.sellVol * 100).toFixed(1)}%`);
      }

      // OI Trend
      const oiTrend = await binanceService.getOITrend(symbol);
      if (oiTrend) {
        const sign = oiTrend.changePercent >= 0 ? "+" : "";
        ctx.oiTrend.push(`Trend: ${oiTrend.trend} (${sign}${oiTrend.changePercent.toFixed(2)}%)`);
        ctx.oiTrend.push(`Current OI: $${(oiTrend.current / 1e9).toFixed(2)}B`);
      }

      // Funding
      const fundingTrend = await binanceService.getFundingTrend(symbol);
      if (fundingTrend) {
        ctx.funding.push(`Current: ${(fundingTrend.current * 100).toFixed(4)}%`);
        ctx.funding.push(`Average: ${(fundingTrend.average * 100).toFixed(4)}%`);
        if (fundingTrend.isExtreme) {
          const direction = fundingTrend.extremeDirection === "long_paying" ? "longs paying shorts" : "shorts paying longs";
          ctx.funding.push(`EXTREME: ${direction}`);
        }
        ctx.funding.push(`Range: ${(fundingTrend.min * 100).toFixed(4)}% to ${(fundingTrend.max * 100).toFixed(4)}%`);
      }

      // Cross Exchange
      const crossFunding = await binanceService.getCrossExchangeFunding(asset);
      if (crossFunding) {
        const formatRate = (rate: number | null) => rate !== null ? `${(rate * 100).toFixed(4)}%` : "N/A";
        ctx.crossExchange.push(`Binance: ${formatRate(crossFunding.binance)} | Bybit: ${formatRate(crossFunding.bybit)}`);
        if (crossFunding.spread > 0.0001) {
          ctx.crossExchange.push(`Arb opportunity: Long ${crossFunding.bestLong}, Short ${crossFunding.bestShort}`);
          ctx.crossExchange.push(`Spread: ${(crossFunding.spread * 100).toFixed(4)}% (~${crossFunding.annualizedSpread.toFixed(0)}% APR)`);
        }
      }

      // Liquidations
      if (liqService) {
        const pressure = liqService.getLiquidationPressure(symbol);
        const status = liqService.getStatus();
        
        if (status.connected) {
          const total = pressure.longLiqsCount + pressure.shortLiqsCount;
          if (total > 0) {
            ctx.liquidations.push(`Longs: ${pressure.longLiqsCount} liqs ($${(pressure.longLiqsValue / 1000).toFixed(0)}K)`);
            ctx.liquidations.push(`Shorts: ${pressure.shortLiqsCount} liqs ($${(pressure.shortLiqsValue / 1000).toFixed(0)}K)`);
            ctx.liquidations.push(`Direction: ${pressure.direction}`);
          } else {
            ctx.liquidations.push("No significant liquidations");
          }
          
          const cascade = liqService.getCascade();
          if (cascade && cascade.detected) {
            ctx.liquidations.push(`CASCADE DETECTED: ${cascade.direction} - ${cascade.count} liqs, $${(cascade.totalValue / 1e6).toFixed(1)}M`);
          }
        }
      }

      // Fear & Greed
      const fearGreed = await binanceService.getFearGreed();
      if (fearGreed) {
        ctx.fearGreed.push(`Value: ${fearGreed.value}/100 (${fearGreed.classification})`);
      }

      // Generate briefing
      const dataContext = buildIntelDataContext(ctx);
      logger.info("[VINCE_INTEL] Generating briefing...");
      const briefing = await generateIntelHumanBriefing(runtime, dataContext, asset);

      // Build source attribution
      const sources: string[] = [];
      if (topTraders) sources.push("Binance (top traders)");
      if (takerVol) sources.push("Binance (order flow)");
      if (oiTrend) sources.push("Binance (OI)");
      if (fundingTrend) sources.push("Binance (funding)");
      if (liqService) sources.push("Binance Liquidations");
      if (fearGreed) sources.push("Fear & Greed Index");

      // Format timestamp for header
      const now = new Date();
      const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

      const output = [
        `**${asset} Intel** _${time}_`,
        "",
        briefing,
        "",
        sources.length > 0 ? `*Source: ${sources.join(", ")}*` : "",
        "",
        "---",
        "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
      ].filter(line => line !== "").join("\n");

      await callback({
        text: output,
        actions: ["VINCE_INTEL"],
      });

      logger.info("[VINCE_INTEL] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_INTEL] Error: ${error}`);
      await callback({
        text: "Intel scan failed. Binance APIs might be rate limiting. Give it a minute and try again.",
        actions: ["VINCE_INTEL"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Show me the intel" } },
      {
        name: "VINCE",
        content: {
          text: "**BTC Intel** _3:42 PM_\n\nWhales are crowded long at 62% which is fade territory. Usually when top traders get this tilted, you see a flush coming. But here's the thing - OI is still rising at +3.2% and order flow is buy-biased at 1.15 ratio. So there's conviction behind the longs, not just positioning.\n\nFunding is normal at 0.01% - longs aren't paying excessive premium which means no squeeze pressure building yet. When funding spikes to 0.05%+ and longs are crowded, that's when you fade hard.\n\nNo liquidation cascades happening. Clean market right now.\n\nCross-exchange arb is thin. Bybit slightly cheaper but spread is only 0.008% - not worth the execution risk.\n\nFear/Greed at 48 which is neutral. No extreme to fade here.\n\nThe read: Longs are crowded but funded normally with rising OI. This isn't a fade setup yet. I'd wait for funding to spike or OI to roll over before getting bearish. Right now the conviction looks real.\n\n*Source: Binance (top traders), Binance (order flow), Binance (OI), Binance (funding), Fear & Greed Index*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_INTEL"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "What are whales doing?" } },
      {
        name: "VINCE",
        content: {
          text: "**BTC Intel** _10:15 AM_\n\nWhales are actually balanced for once - 52% long / 48% short. That's neutral positioning which is rare. Usually you see them tilted one way or another.\n\nOrder flow is telling a clearer story. Buy/sell at 0.92 means sellers are in control right now. Not aggressive selling but consistent. OI is flat so nobody's adding to positions - classic chop environment.\n\nFunding is interesting though. Longs are paying 0.035% which is elevated. Not extreme but above average. Combined with neutral whale positioning and seller pressure, feels like longs might be trapped.\n\nNo liqs happening which confirms the chop. Everyone's in the comfort zone.\n\nFear at 38 - slight fear but not capitulation.\n\nHonest take: This looks like a short setup forming. Whales neutral, order flow bearish, funding elevated. I'd look for a bounce to sell rather than buying here. Wait for fear to spike into the 20s for a better long entry.\n\n*Source: Binance (top traders), Binance (order flow), Binance (OI), Binance (funding), Fear & Greed Index*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_INTEL"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Intel on ETH" } },
      {
        name: "VINCE",
        content: {
          text: "**ETH Intel** _2:28 PM_\n\nETH is showing divergence from BTC right now which is worth watching.\n\nTop traders are 58% long on ETH vs 52% on BTC. More bullish positioning. But OI is falling at -2.1% which means the weak longs are exiting. That's actually healthy - clears out leverage before the next move.\n\nOrder flow is mildly buy-biased at 1.08. Not strong but consistent with the long positioning.\n\nHere's the interesting part - funding is negative at -0.003%. Shorts are paying longs. Combined with falling OI and long positioning, this smells like shorts trying to fade the recovery and getting slowly squeezed. Classic setup.\n\nBybit funding is also negative at -0.008% so this isn't Binance-specific. It's market-wide.\n\nNo cascade but 3 short liqs in the past 5 mins totaling $80k. Small but confirms the squeeze thesis.\n\nFear at 38 same as broader market.\n\nMy read: ETH looks better than BTC here. Negative funding + long positioning + falling OI clearing leverage = potential for upside. I'd lean long ETH over BTC if trading perps right now.\n\n*Source: Binance (top traders), Binance (order flow), Binance (OI), Binance (funding), Binance Liquidations, Fear & Greed Index*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_INTEL"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Any liquidations happening?" } },
      {
        name: "VINCE",
        content: {
          text: "**BTC Intel** _6:54 PM_\n\nCascade in progress. This is live.\n\n12 long liquidations in the past 5 minutes totaling $2.4M. That's not normal market noise - that's a flush. Direction is clear: long liquidations which usually marks a bottom when they exhaust.\n\nTop traders were 62% long going into this. The crowded longs I mentioned earlier are getting cleaned out now. OI dropped -1.8% in the past hour confirming the deleverage.\n\nFunding just normalized from 0.04% to 0.015%. The long premium is getting squeezed out.\n\nFear spiked to 32 - getting into accumulation territory.\n\nNo arb opportunities - everyone's selling everywhere.\n\nThe play: Don't catch knives mid-cascade but watch for the liqs to stop. When you see 2-3 quiet minutes after a cascade, that's usually the local bottom. I'd scale into longs once liqs dry up and funding is neutral. Could be a solid dip buy forming here.\n\nI'll ping you when the cascade ends if you want.\n\n*Source: Binance (top traders), Binance (OI), Binance (funding), Binance Liquidations, Fear & Greed Index*\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_INTEL"],
        },
      },
    ],
  ],
};
