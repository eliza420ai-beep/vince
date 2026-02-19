/**
 * VINCE FUNDING PULSE Action
 *
 * One-shot "Who's paying" brief: funding rates, L/S ratio, liquidation heat.
 * Data from CoinGlass (and Binance), Binance liquidations. One narrative + optional tweet.
 * ALOHA-style: rich data, one LLM pass, shareable.
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
import type { VinceBinanceService } from "../services/binance.service";
import type { VinceBinanceLiquidationService } from "../services/binanceLiquidation.service";
import { CORE_ASSETS } from "../constants/targetAssets";

// ==========================================
// Build data context for LLM
// ==========================================

function buildDataContext(
  fundingLines: string[],
  lsLines: string[],
  liquidationLines: string[],
): string {
  const lines: string[] = [];
  lines.push("=== FUNDING RATES (8h, per asset) ===");
  lines.push(
    fundingLines.length > 0
      ? fundingLines.join("\n")
      : "Funding data unavailable.",
  );
  lines.push("");
  lines.push("=== LONG/SHORT RATIO (retail) ===");
  lines.push(
    lsLines.length > 0 ? lsLines.join("\n") : "L/S ratio data unavailable.",
  );
  lines.push("");
  lines.push("=== LIQUIDATION HEAT (Binance, recent) ===");
  lines.push(
    liquidationLines.length > 0
      ? liquidationLines.join("\n")
      : "No recent liquidation data.",
  );
  return lines.join("\n");
}

async function generateHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE. Based on funding and liquidation data for ${date}, write one short paragraph: "Who's paying and where it's extreme."

${dataContext}

RULES:
- One paragraph only. No bullet points, no headers.
- Say who's paying (longs vs shorts), where funding is extreme, and one line on liquidation risk (cascades, heat).
- Human voice: like telling a friend. No jargon, no fluff. Specific numbers when you have them.
- If data is missing, say so briefly and still give a take where possible.

Write the paragraph:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_FUNDING_PULSE] Failed to generate briefing: ${error}`);
    return "Funding pulse is unclear right now — data didn't load or the narrative couldn't be generated. Try again in a moment.";
  }
}

async function generateTweet(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE. Based on today's funding and liquidation data, write a single tweet.

${dataContext}

RULES:
- Max 280 characters. NO emojis, NO hashtags.
- One clear take: who's paying, where it's extreme, or liquidation risk. Direct, punchy.
- NO crypto slang (WAGMI, NFA, LFG, etc).

Write the tweet:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    let tweet = String(response).trim();
    if (
      (tweet.startsWith('"') && tweet.endsWith('"')) ||
      (tweet.startsWith("'") && tweet.endsWith("'"))
    ) {
      tweet = tweet.slice(1, -1);
    }
    if (tweet.length > 280) tweet = tweet.substring(0, 277) + "...";
    return tweet;
  } catch (error) {
    logger.error(`[VINCE_FUNDING_PULSE] Failed to generate tweet: ${error}`);
    return "Funding pulse: check back for who's paying.";
  }
}

// ==========================================
// FUNDING PULSE Action
// ==========================================

export const vinceFundingPulseAction: Action = {
  name: "VINCE_FUNDING_PULSE",
  similes: [
    "FUNDING_PULSE",
    "FUNDING",
    "WHO_PAYING",
    "FUNDING_BRIEF",
    "LS_RATIO",
  ],
  description:
    "Who's paying: funding rates, long/short ratio, liquidation heat — one narrative plus optional tweet",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("funding") ||
      text.includes("funding pulse") ||
      text.includes("who's paying") ||
      text.includes("whos paying") ||
      text.includes("who is paying") ||
      text.includes("l/s ratio") ||
      text.includes("long short ratio")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      const now = new Date();
      const date = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });

      const fundingLines: string[] = [];
      const lsLines: string[] = [];

      const coinglass = runtime.getService(
        "VINCE_COINGLASS_SERVICE",
      ) as VinceCoinGlassService | null;
      if (coinglass) {
        for (const asset of CORE_ASSETS) {
          const f = coinglass.getFunding(asset);
          if (f)
            fundingLines.push(`${asset}: ${(f.rate * 100).toFixed(4)}% (8h)`);
          const ls = coinglass.getLongShortRatio(asset);
          if (ls)
            lsLines.push(
              `${asset}: ${ls.ratio.toFixed(2)} (long ${ls.longPercent.toFixed(0)}% / short ${ls.shortPercent.toFixed(0)}%)`,
            );
        }
      }

      const binance = runtime.getService(
        "VINCE_BINANCE_SERVICE",
      ) as VinceBinanceService | null;
      if (binance && fundingLines.length === 0) {
        try {
          const btcTrend = await binance.getFundingTrend("BTCUSDT", 30);
          if (btcTrend)
            fundingLines.push(
              `BTC (Binance): ${(btcTrend.current * 100).toFixed(4)}% (8h), extreme=${btcTrend.isExtreme} (${btcTrend.extremeDirection})`,
            );
        } catch {
          // skip
        }
      }

      const liquidationLines: string[] = [];
      const binanceLiq = runtime.getService(
        "VINCE_BINANCE_LIQUIDATION_SERVICE",
      ) as VinceBinanceLiquidationService | null;
      if (binanceLiq) {
        const pressure = binanceLiq.getLiquidationPressure();
        if (
          pressure.longLiqsCount > 0 ||
          pressure.shortLiqsCount > 0 ||
          pressure.intensity > 0
        ) {
          liquidationLines.push(
            `Direction: ${pressure.direction}, intensity: ${pressure.intensity}%`,
          );
          liquidationLines.push(
            `Long liqs: ${pressure.longLiqsCount} ($${(pressure.longLiqsValue / 1000).toFixed(0)}k), short liqs: ${pressure.shortLiqsCount} ($${(pressure.shortLiqsValue / 1000).toFixed(0)}k)`,
          );
        }
        const cascade = binanceLiq.getCascade();
        if (cascade?.detected && cascade.direction) {
          liquidationLines.push(
            `CASCADE: ${cascade.direction.toUpperCase()} — $${(cascade.totalValue / 1e6).toFixed(2)}M, ${cascade.count} orders`,
          );
        }
        if (liquidationLines.length === 0)
          liquidationLines.push("No significant liquidations in last 5 min.");
      }

      const dataContext = buildDataContext(
        fundingLines,
        lsLines,
        liquidationLines,
      );
      const briefing = await generateHumanBriefing(runtime, dataContext, date);
      const tweet = await generateTweet(runtime, dataContext, date);

      const sections: string[] = [];
      sections.push(`**Funding Pulse** _${date}_`);
      sections.push("");
      sections.push(briefing);
      sections.push("");
      sections.push("---");
      sections.push("");
      sections.push("**Tweet of the day**");
      sections.push("");
      sections.push(`> ${tweet}`);
      sections.push("");
      sections.push(`_${tweet.length}/280 chars_`);

      await callback({
        text: sections.join("\n"),
        actions: ["VINCE_FUNDING_PULSE"],
      });

      logger.info("[VINCE_FUNDING_PULSE] Funding pulse complete");
    } catch (error) {
      logger.error(`[VINCE_FUNDING_PULSE] Error: ${error}`);
      await callback({
        text: "Funding pulse failed — data unavailable. Try again later or use ALOHA for full market brief.",
        actions: ["VINCE_FUNDING_PULSE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "funding" } },
      {
        name: "VINCE",
        content: {
          text: "**Funding Pulse** _Monday, Feb 3_\n\nLongs are paying across the board — BTC and ETH funding positive, L/S ratio above 1.5. SOL and HYPE a bit less stretched. No cascade in the last 5 minutes; liquidation heat is low. If you're short, you're getting paid; if you're long, watch for a flush.\n\n---\n\n**Tweet of the day**\n\n> Longs paying on BTC/ETH, L/S crowded. No liq cascade yet. Shorts getting paid.\n\n_72/280 chars_",
          actions: ["VINCE_FUNDING_PULSE"],
        },
      },
    ],
  ],
};
