/**
 * VINCE BOT VERDICT / PAPER EDGE Action
 *
 * One-shot "Why the bot today" brief: signal aggregator (core assets), paper positions, why-trade factors.
 * Output: one paragraph "The bot is long/short/flat because …" with 2–3 factors + optional tweet.
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
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { VincePositionManagerService } from "../services/vincePositionManager.service";
import { CORE_ASSETS } from "../constants/targetAssets";
import { getGrokMarketReadSection } from "../utils/grokPulseParser";

// ==========================================
// Build data context for LLM
// ==========================================

function buildDataContext(
  positionLines: string[],
  signalLines: string[],
): string {
  const lines: string[] = [];
  lines.push("=== PAPER BOT OPEN POSITIONS ===");
  lines.push(
    positionLines.length > 0 ? positionLines.join("\n") : "No open positions.",
  );
  lines.push("");
  lines.push("=== CURRENT SIGNALS (aggregated) ===");
  lines.push(
    signalLines.length > 0
      ? signalLines.join("\n")
      : "Signal data unavailable.",
  );
  return lines.join("\n");
}

async function generateHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE. Based on the paper bot's positions and current signals for ${date}, write one short paragraph: "The bot is long/short/flat because …" with 2–3 concrete factors (e.g. X sentiment, funding, regime, signal strength).

${dataContext}

RULES:
- One paragraph only. No bullet points, no headers.
- Say clearly: bot is long, short, or flat. Then give 2–3 reasons (factors from the data). Human voice.
- If no positions, explain what's missing or what would trigger a trade. If there are positions, tie them to the signals/factors.
- No jargon, no fluff. Specific.

Write the paragraph:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_BOT_VERDICT] Failed to generate briefing: ${error}`);
    return "Bot verdict is unclear right now — position or signal data didn't load. Try again in a moment.";
  }
}

async function generateTweet(
  runtime: IAgentRuntime,
  dataContext: string,
  date: string,
): Promise<string> {
  const prompt = `You are VINCE. Based on the paper bot's positions and signals, write a single tweet: why the bot is positioned this way today.

${dataContext}

RULES:
- Max 280 characters. NO emojis, NO hashtags.
- One clear take: long/short/flat and one main reason. Direct, punchy.
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
    logger.error(`[VINCE_BOT_VERDICT] Failed to generate tweet: ${error}`);
    return "Paper bot verdict: check back for the take.";
  }
}

// ==========================================
// BOT VERDICT Action
// ==========================================

export const vinceBotVerdictAction: Action = {
  name: "VINCE_BOT_VERDICT",
  similes: [
    "BOT_VERDICT",
    "PAPER_EDGE",
    "WHY_BOT_TODAY",
    "PAPER_BOT_VERDICT",
    "BOT_TAKE",
  ],
  description:
    "Why the paper bot is long/short/flat today — one paragraph with 2–3 factors plus optional tweet",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("bot verdict") ||
      text.includes("paper edge") ||
      text.includes("why the bot today") ||
      text.includes("paper bot verdict") ||
      text.includes("bot take")
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

      const positionLines: string[] = [];
      const positionManager = runtime.getService(
        "VINCE_POSITION_MANAGER_SERVICE",
      ) as VincePositionManagerService | null;
      if (positionManager) {
        const positions = positionManager.getOpenPositions();
        for (const pos of positions) {
          const pnl =
            pos.unrealizedPnlPct != null
              ? ` (${pos.unrealizedPnlPct >= 0 ? "+" : ""}${pos.unrealizedPnlPct.toFixed(2)}%)`
              : "";
          positionLines.push(
            `${pos.direction.toUpperCase()} ${pos.asset} @ $${pos.entryPrice.toLocaleString()}, $${pos.sizeUsd.toLocaleString()} ${pos.leverage}x${pnl}. Signals: ${(pos.triggerSignals || []).slice(0, 3).join(", ") || "—"}`,
          );
        }
      }

      const signalLines: string[] = [];
      const signalAggregator = runtime.getService(
        "VINCE_SIGNAL_AGGREGATOR_SERVICE",
      ) as VinceSignalAggregatorService | null;
      if (signalAggregator) {
        for (const asset of CORE_ASSETS) {
          try {
            const sig = await signalAggregator.getSignal(asset);
            const factors = (sig.factors || []).slice(0, 3).join("; ") || "—";
            signalLines.push(
              `${asset}: ${sig.direction} (strength ${sig.strength}, conf ${sig.confidence}). Factors: ${factors}`,
            );
          } catch {
            // skip asset
          }
        }
      }

      let dataContext = buildDataContext(positionLines, signalLines);
      dataContext += getGrokMarketReadSection();
      const briefing = await generateHumanBriefing(runtime, dataContext, date);
      const tweet = await generateTweet(runtime, dataContext, date);

      const sections: string[] = [];
      sections.push(`**Bot Verdict** _${date}_`);
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
        actions: ["VINCE_BOT_VERDICT"],
      });

      logger.info("[VINCE_BOT_VERDICT] Bot verdict complete");
    } catch (error) {
      logger.error(`[VINCE_BOT_VERDICT] Error: ${error}`);
      await callback({
        text: "Bot verdict failed — position or signal services unavailable. Try WHY TRADE for full reasoning or ALOHA for market brief.",
        actions: ["VINCE_BOT_VERDICT"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "bot verdict" } },
      {
        name: "VINCE",
        content: {
          text: "**Bot Verdict** _Monday, Feb 3_\n\nThe bot is long BTC and flat everything else. Main reasons: signal aggregator has BTC at 72 strength with funding negative and X sentiment bullish; ETH and SOL are neutral so no size there. One open position, no new entries until we see a clearer setup on the alts.\n\n---\n\n**Tweet of the day**\n\n> Paper bot long BTC only. Aggregator 72 strength, funding negative, CT bullish. Rest flat until setup clears.\n\n_89/280 chars_",
          actions: ["VINCE_BOT_VERDICT"],
        },
      },
    ],
  ],
};
