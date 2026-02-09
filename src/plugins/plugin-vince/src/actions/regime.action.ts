/**
 * VINCE REGIME Action
 *
 * One-shot "Where we are" brief: market regime (trending/ranging/volatile), fear/greed, vol (DVOL).
 * Data from MarketRegimeService, CoinGlass fear/greed, Deribit DVOL. One narrative + optional tweet.
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
import type { VinceMarketRegimeService } from "../services/marketRegime.service";
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceMarketDataService } from "../services/marketData.service";
import { CORE_ASSETS } from "../constants/targetAssets";

// ==========================================
// Build data context for LLM
// ==========================================

function buildDataContext(
  regimeLines: string[],
  fearGreedLine: string | null,
  dvolLines: string[],
): string {
  const lines: string[] = [];
  lines.push("=== MARKET REGIME (per asset) ===");
  lines.push(
    regimeLines.length > 0
      ? regimeLines.join("\n")
      : "Regime data unavailable.",
  );
  if (fearGreedLine) {
    lines.push("");
    lines.push("=== FEAR & GREED ===");
    lines.push(fearGreedLine);
  }
  if (dvolLines.length > 0) {
    lines.push("");
    lines.push("=== IMPLIED VOLATILITY (DVOL) ===");
    lines.push(dvolLines.join("\n"));
  }
  return lines.join("\n");
}

async function generateHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE. Based on regime, fear/greed, and vol data for ${date}, write one short paragraph: "Where we are" — bullish/bearish/volatile, fear/greed, vol regime.

${dataContext}

RULES:
- One paragraph only. No bullet points, no headers.
- Summarize market regime (trending vs ranging vs volatile), fear/greed reading, and what vol (DVOL) is saying. One clear take.
- Human voice: like telling a friend. No jargon, no fluff.
- If data is missing, say so briefly and still give a take.

Write the paragraph:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_REGIME] Failed to generate briefing: ${error}`);
    return "Regime brief is unclear right now — data didn't load or the narrative couldn't be generated. Try again in a moment.";
  }
}

async function generateTweet(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE. Based on today's regime, fear/greed, and vol data, write a single tweet.

${dataContext}

RULES:
- Max 280 characters. NO emojis, NO hashtags.
- One clear take: where the market is (regime + fear/greed + vol). Direct, punchy.
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
    logger.error(`[VINCE_REGIME] Failed to generate tweet: ${error}`);
    return "Regime: check back for where we are.";
  }
}

// ==========================================
// REGIME Action
// ==========================================

export const vinceRegimeAction: Action = {
  name: "VINCE_REGIME",
  similes: [
    "REGIME",
    "MACRO_PULSE",
    "MARKET_REGIME",
    "WHERE_WE_ARE",
    "VOL_REGIME",
  ],
  description:
    "Market regime, fear/greed, and vol (DVOL) — one 'where we are' narrative plus optional tweet",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("regime") ||
      text.includes("macro pulse") ||
      text.includes("market regime") ||
      text.includes("where we are") ||
      text.includes("vol regime")
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

      const regimeLines: string[] = [];
      const regimeService = runtime.getService(
        "VINCE_MARKET_REGIME_SERVICE",
      ) as VinceMarketRegimeService | null;
      if (regimeService) {
        for (const asset of CORE_ASSETS) {
          try {
            const r = await regimeService.getRegime(asset);
            regimeLines.push(
              `${asset}: ${r.regime.toUpperCase()} (ADX ${r.adx?.toFixed(1) ?? "N/A"}, size ${r.positionSizeMultiplier}x, ${r.preferMomentum ? "momentum" : r.preferContrarian ? "contrarian" : "neutral"})`,
            );
          } catch {
            // skip asset
          }
        }
      }

      let fearGreedLine: string | null = null;
      const coinglass = runtime.getService(
        "VINCE_COINGLASS_SERVICE",
      ) as VinceCoinGlassService | null;
      if (coinglass) {
        const fg = coinglass.getFearGreed();
        if (fg)
          fearGreedLine = `Value: ${fg.value}, ${fg.classification}`;
      }

      const dvolLines: string[] = [];
      const marketData = runtime.getService(
        "VINCE_MARKET_DATA_SERVICE",
      ) as VinceMarketDataService | null;
      if (marketData) {
        for (const asset of ["BTC", "ETH"] as const) {
          try {
            const dvol = await marketData.getDVOL(asset);
            if (dvol != null)
              dvolLines.push(`${asset} DVOL: ${dvol.toFixed(1)}`);
          } catch {
            // skip
          }
        }
      }

      const dataContext = buildDataContext(
        regimeLines,
        fearGreedLine,
        dvolLines,
      );
      const briefing = await generateHumanBriefing(
        runtime,
        dataContext,
        date,
      );
      const tweet = await generateTweet(runtime, dataContext, date);

      const sections: string[] = [];
      sections.push(`**Regime** _${date}_`);
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
        actions: ["VINCE_REGIME"],
      });

      logger.info("[VINCE_REGIME] Regime brief complete");
    } catch (error) {
      logger.error(`[VINCE_REGIME] Error: ${error}`);
      await callback({
        text: "Regime brief failed — data unavailable. Try again later or use ALOHA for full market brief.",
        actions: ["VINCE_REGIME"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "regime" } },
      {
        name: "VINCE",
        content: {
          text: "**Regime** _Monday, Feb 3_\n\nWe're in a neutral-to-trending regime with fear still in the mix — fear/greed in the 30s. DVOL is subdued, so options are cheap and the market isn't pricing a big move yet. Size down if you're swinging; vol could expand if we break out.\n\n---\n\n**Tweet of the day**\n\n> Regime: neutral-trending, fear in the 30s, DVOL low. Options cheap. Size down until we get a clear direction.\n\n_98/280 chars_",
          actions: ["VINCE_REGIME"],
        },
      },
    ],
  ],
};
