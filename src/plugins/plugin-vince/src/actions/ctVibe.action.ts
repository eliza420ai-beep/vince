/**
 * VINCE CT VIBE / X VIBE Action
 *
 * One-shot "What's CT saying today" brief from cached X sentiment (BTC, ETH, SOL, HYPE).
 * Optional one X search for a standout quote. Output: one short paragraph + optional tweet.
 * Pure sentiment/vibe, no price. ALOHA-style: rich data, one LLM pass, shareable.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VinceXSentimentService } from "../services/xSentiment.service";
import type { VinceXResearchService } from "../services/xResearch.service";
import { CORE_ASSETS } from "../constants/targetAssets";

// ==========================================
// Build data context for LLM
// ==========================================

function buildDataContext(
  sentimentLines: string[],
  standoutQuote: string | null,
): string {
  const lines: string[] = [];
  lines.push("=== X (CT) SENTIMENT BY ASSET ===");
  lines.push(sentimentLines.length > 0 ? sentimentLines.join("\n") : "No cached sentiment yet.");
  if (standoutQuote) {
    lines.push("");
    lines.push("=== STANDOUT FROM X (one recent theme/quote) ===");
    lines.push(standoutQuote);
  }
  return lines.join("\n");
}

async function generateHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE. Based on Crypto Twitter (CT) sentiment data for ${date}, write one short paragraph: "What's CT saying today."

${dataContext}

RULES:
- One paragraph only. No bullet points, no headers.
- Cover bullish/bearish/neutral per asset (BTC, ETH, SOL, HYPE). Note any risk flag if present.
- Pure sentiment and vibe only — do NOT mention prices or numbers except if from a quote.
- Human voice: like you're telling a friend what CT is feeling. No jargon, no fluff.
- If data is missing or thin, say so briefly and still give a vibe take.

Write the paragraph:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_CT_VIBE] Failed to generate briefing: ${error}`);
    return "CT vibe is unclear right now — sentiment data didn't load or the narrative couldn't be generated. Try again in a moment.";
  }
}

async function generateTweet(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE. Based on today's CT (Crypto Twitter) sentiment data, write a single tweet.

${dataContext}

RULES:
- Max 280 characters. NO emojis, NO hashtags.
- NO crypto slang (WAGMI, NFA, LFG, etc).
- One clear take on what CT is saying. Vibe only, no price.
- Direct, punchy, shareable.

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
    logger.error(`[VINCE_CT_VIBE] Failed to generate tweet: ${error}`);
    return "CT vibe check coming soon.";
  }
}

// ==========================================
// CT VIBE Action
// ==========================================

export const vinceCtVibeAction: Action = {
  name: "VINCE_CT_VIBE",
  similes: [
    "CT_VIBE",
    "X_VIBE",
    "VIBE",
    "WHAT_CT_SAYING",
    "CT_SENTIMENT",
    "X_SENTIMENT",
  ],
  description:
    "What's Crypto Twitter saying today — one short sentiment brief (BTC, ETH, SOL, HYPE) plus optional tweet of the day",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("vibe") ||
      text.includes("ct vibe") ||
      text.includes("what's ct saying") ||
      text.includes("whats ct saying") ||
      text.includes("x vibe") ||
      text.includes("ct sentiment")
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

      const xSentimentService = runtime.getService(
        "VINCE_X_SENTIMENT_SERVICE",
      ) as VinceXSentimentService | null;

      const sentimentLines: string[] = [];
      if (xSentimentService) {
        for (const asset of CORE_ASSETS) {
          const s = xSentimentService.getTradingSentiment(asset);
          if (s.confidence > 0) {
            const risk = s.hasHighRiskEvent ? " [risk flag]" : "";
            sentimentLines.push(`${asset}: ${s.sentiment} (${s.confidence}%)${risk}`);
          }
        }
        try {
          const listS = await xSentimentService.getListSentiment();
          if (listS.confidence > 0) {
            const risk = listS.hasHighRiskEvent ? " [risk flag]" : "";
            sentimentLines.push(`List (curated): ${listS.sentiment} (${listS.confidence}%)${risk}`);
          }
        } catch {
          // optional: skip list sentiment
        }
      }

      let standoutQuote: string | null = null;
      const xResearchService = runtime.getService(
        "VINCE_X_RESEARCH_SERVICE",
      ) as VinceXResearchService | null;
      if (xResearchService?.isConfigured?.()) {
        try {
          const tweets = await xResearchService.search("crypto OR Bitcoin", {
            maxResults: 5,
            sortOrder: "recency",
          });
          if (tweets?.length) {
            const t = tweets[0];
            const text = (t.text || "").trim();
            if (text.length > 0 && text.length <= 200) standoutQuote = text;
            else if (text.length > 200) standoutQuote = text.slice(0, 197) + "...";
          }
        } catch {
          // optional: skip standout quote
        }
      }

      const dataContext = buildDataContext(sentimentLines, standoutQuote);
      const briefing = await generateHumanBriefing(runtime, dataContext, date);
      const tweet = await generateTweet(runtime, dataContext, date);

      const sections: string[] = [];
      sections.push(`**CT Vibe** _${date}_`);
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
        actions: ["VINCE_CT_VIBE"],
      });

      logger.info("[VINCE_CT_VIBE] CT vibe brief complete");
    } catch (error) {
      logger.error(`[VINCE_CT_VIBE] Error: ${error}`);
      await callback({
        text: "CT vibe check failed — sentiment or X data unavailable. Try again later or use ALOHA for full market brief.",
        actions: ["VINCE_CT_VIBE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "vibe" } },
      {
        name: "VINCE",
        content: {
          text: "**CT Vibe** _Monday, Feb 3_\n\nCrypto Twitter is split: BTC and ETH lean bullish with decent conviction, SOL is neutral, and HYPE is barely on the radar. No major risk flags. Overall vibe is cautiously optimistic — people are watching for a breakout but not overlevered.\n\n---\n\n**Tweet of the day**\n\n> CT: bulls in charge on BTC/ETH, SOL flat, HYPE quiet. Cautious optimism, no panic.\n\n_89/280 chars_",
          actions: ["VINCE_CT_VIBE"],
        },
      },
    ],
  ],
};
