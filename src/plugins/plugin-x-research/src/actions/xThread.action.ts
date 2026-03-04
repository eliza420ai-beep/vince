/**
 * X Thread Action
 *
 * Fetch and summarize a Twitter thread.
 * "Summarize this thread: https://x.com/..."
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
  logger,
} from "@elizaos/core";
import { getXThreadsService } from "../services/xThreads.service";
import { initXClientFromEnv } from "../services/xClient.service";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";
import { sendActionResponse } from "./helpers/actionResponse";
import { parseTweetIdOrUrl } from "./helpers/inputParsers";
import {
  formatTradingSignalBlock,
  inferTradingSignalFromTexts,
} from "./helpers/signalScoring";

export const xThreadAction: Action = {
  name: "X_THREAD",
  description:
    "Fetch and summarize a Twitter/X thread. Provide a tweet URL or ID.",

  similes: ["SUMMARIZE_THREAD", "GET_THREAD", "THREAD_SUMMARY"],

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Summarize this thread: https://x.com/crediblecrypto/status/1234567890",
        },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "🧵 **Thread Summary**\n\n**Author:** @crediblecrypto (whale)\n**Length:** 12 tweets\n**Engagement:** 2.3k likes, 450 RTs\n\n**TL;DR:**\nCredible argues we're in a supply shock setup for BTC. Key points:\n\n1. ETF inflows outpacing miner supply 3:1\n2. Exchange reserves at 5-year lows\n3. Long-term holder supply at ATH\n4. Retail hasn't arrived yet (Google Trends)\n\n**Conclusion:** \"This is the most asymmetric setup since 2020. The math doesn't lie.\"\n\n🔗 https://x.com/crediblecrypto/status/1234567890",
          action: "X_THREAD",
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text ?? "";

    // Check for thread URL or thread-related request
    const hasUrl = text.includes("x.com/") || text.includes("twitter.com/");
    const hasThreadKeyword = /thread|summarize|tldr|tl;dr/i.test(text);

    return hasUrl || (hasThreadKeyword && /\d{10,}/.test(text));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options?: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    try {
      initXClientFromEnv(runtime);

      const text = message.content?.text ?? "";
      const parsed = parseTweetIdOrUrl(text);
      const tweetId = parsed.tweetId;

      if (!tweetId) {
        await sendActionResponse(callback, "X_THREAD", {
          text: "I need a tweet URL or ID to fetch the thread (reason: no_target). Example:\n`Summarize this thread: https://x.com/user/status/123456789`",
        });
        return { success: true };
      }

      const threadsService = getXThreadsService();

      // Fetch the thread
      const tweets = await threadsService.getThread(tweetId);

      if (tweets.length === 0) {
        await sendActionResponse(callback, "X_THREAD", {
          text: "Couldn't fetch the thread (reason: no_recent_data). The tweet might be deleted, protected, or the API is rate limited.",
        });
        return { success: true };
      }

      // Get thread summary
      const summary = threadsService.summarizeThread(tweets);

      if (!summary) {
        await sendActionResponse(callback, "X_THREAD", {
          text: "Couldn't summarize the thread (reason: low_quality_filtered).",
        });
        return { success: true };
      }

      // Combine all tweet text
      const evidenceTweets = selectThreadEvidenceTweets(tweets).slice(0, 14);
      const fullText = evidenceTweets
        .map((t, i) => `${i + 1}. ${t.text}`)
        .join("\n\n");

      // Use LLM to generate a flowing narrative TL;DR (ALOHA style)
      const prompt = `You are summarizing a Twitter thread for a crypto trader. Write one short paragraph TL;DR—flowing prose, no numbered list, no bullet points. Capture the main argument, key data, and conclusion.

Thread by @${summary.author.username} (${summary.tweetCount} tweets):

${fullText}

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Write one short paragraph TL;DR:`;

      let llmSummary: string;
      try {
        const raw = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
        llmSummary =
          typeof raw === "string"
            ? raw
            : ((raw as { text?: string })?.text ?? String(raw));
      } catch {
        llmSummary =
          fullText.slice(0, 400).replace(/\n/g, " ") +
          (fullText.length > 400 ? "..." : "");
      }

      const response = `🧵 **Thread Summary**\n\n**Author:** @${summary.author.username}${summary.author.tier !== "standard" ? ` (${summary.author.tier})` : ""}\n**Length:** ${summary.tweetCount} tweets\n**Engagement:** ${formatNumber(summary.engagement.likes)} likes, ${formatNumber(summary.engagement.retweets)} RTs\n\n**TL;DR:**\n${llmSummary.trim()}\n\n🔗 ${summary.url}`;
      const signal = inferTradingSignalFromTexts(
        evidenceTweets.map((t) => t.text),
        7,
      );
      await sendActionResponse(callback, "X_THREAD", {
        text: `${response}\n\n${formatTradingSignalBlock(signal)}`,
      });

      return { success: true };
    } catch (error) {
      logger.warn({ err: error }, "[X_THREAD] Error");

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await sendActionResponse(callback, "X_THREAD", {
        text: `🧵 **Thread**\n\n❌ Error (reason: api_limited): ${errorMessage}`,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function selectThreadEvidenceTweets(tweets: Array<{ text: string }>) {
  const keywordRe =
    /\b(btc|eth|sol|hype|cpi|fomc|funding|open interest|oi|liquidation|volatility|iv|dvol|call|put|long|short|breakout|breakdown)\b/i;
  return [...tweets].sort((a, b) => {
    const aSignal = keywordRe.test(a.text) ? 1 : 0;
    const bSignal = keywordRe.test(b.text) ? 1 : 0;
    const aDigits = /\d/.test(a.text) ? 1 : 0;
    const bDigits = /\d/.test(b.text) ? 1 : 0;
    return bSignal + bDigits - (aSignal + aDigits);
  });
}

export default xThreadAction;
