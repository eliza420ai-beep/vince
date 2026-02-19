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
} from "@elizaos/core";
import { getXThreadsService } from "../services/xThreads.service";
import { initXClientFromEnv } from "../services/xClient.service";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";

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
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    try {
      initXClientFromEnv(runtime);

      const text = message.content?.text ?? "";

      // Extract URL or tweet ID
      const urlMatch = text.match(
        /(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/,
      );
      const idMatch = text.match(/\b(\d{10,})\b/);

      const tweetId = urlMatch?.[1] ?? idMatch?.[1];

      if (!tweetId) {
        callback({
          text: "I need a tweet URL or ID to fetch the thread. Example:\n`Summarize this thread: https://x.com/user/status/123456789`",
          action: "X_THREAD",
        });
        return { success: true };
      }

      const threadsService = getXThreadsService();

      // Fetch the thread
      const tweets = await threadsService.getThread(tweetId);

      if (tweets.length === 0) {
        callback({
          text: "Couldn't fetch the thread. The tweet might be deleted, protected, or the API is rate limited.",
          action: "X_THREAD",
        });
        return { success: true };
      }

      // Get thread summary
      const summary = threadsService.summarizeThread(tweets);

      if (!summary) {
        callback({
          text: "Couldn't summarize the thread.",
          action: "X_THREAD",
        });
        return { success: true };
      }

      // Combine all tweet text
      const fullText = tweets.map((t, i) => `${i + 1}. ${t.text}`).join("\n\n");

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

      callback({
        text: response,
        action: "X_THREAD",
      });

      return { success: true };
    } catch (error) {
      console.error("[X_THREAD] Error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      callback({
        text: `🧵 **Thread**\n\n❌ Error: ${errorMessage}`,
        action: "X_THREAD",
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

export default xThreadAction;
