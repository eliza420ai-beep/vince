/**
 * X Vibe Action
 *
 * Quick sentiment check for a single topic.
 * "What's the vibe on ETH right now?"
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
import { getXSearchService } from "../services/xSearch.service";
import { getXSentimentService } from "../services/xSentiment.service";
import { initXClientFromEnv } from "../services/xClient.service";
import { TOPIC_BY_ID, ALL_TOPICS } from "../constants/topics";
import { formatCostFooter } from "../constants/cost";
import { setLastResearch } from "../store/lastResearchStore";
import { getMandoContextForX } from "../utils/mandoContext";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";
import { getFriendlyXErrorMessage } from "../utils/xErrorMessages";

export const xVibeAction: Action = {
  name: "X_VIBE",
  description:
    "Quick sentiment check for a specific crypto topic on X/Twitter. Use when asked about sentiment for a specific coin or topic.",

  similes: ["QUICK_SENTIMENT", "TOPIC_VIBE", "CT_SENTIMENT"],

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "What's the vibe on ETH?" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "📊 **ETH Vibe Check**\n\n📉 Bearish (-28) | 65% confidence\n\n**Breakdown:**\n• Bullish: 23 tweets\n• Bearish: 47 tweets\n• Neutral: 30 tweets\n\n**Whale alignment:** +12 (whales slightly more bullish than retail)\n\nMain topics: L2 fees, gas costs, ETH/BTC ratio weakness\n\n_Based on 100 tweets from the last 24h_",
          action: "X_VIBE",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "SOL sentiment check" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "📊 **SOL Vibe Check**\n\n📈 Bullish (+52) | 72% confidence\n\n**Breakdown:**\n• Bullish: 68 tweets\n• Bearish: 18 tweets\n• Neutral: 14 tweets\n\n**Whale alignment:** +48 (whales agree)\n\nMeme season narrative still strong. Pump.fun activity high.\n\n_Based on 100 tweets from the last 24h_",
          action: "X_VIBE",
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() ?? "";

    // Check for vibe/sentiment + topic pattern
    const vibeTerms = ["vibe", "sentiment", "feeling", "mood"];
    const hasVibeTerm = vibeTerms.some((t) => text.includes(t));

    // Check for any topic mention
    const hasTopic = ALL_TOPICS.some(
      (topic) =>
        topic.searchTerms.some((term) => text.includes(term.toLowerCase())) ||
        topic.hashtags.some((tag) => text.includes(tag.toLowerCase())),
    );

    return hasVibeTerm && hasTopic;
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

      const text = message.content?.text?.toLowerCase() ?? "";

      // Detect which topic
      let detectedTopic: (typeof ALL_TOPICS)[0] | null = null;

      for (const topic of ALL_TOPICS) {
        const matches =
          topic.searchTerms.some((term) => text.includes(term.toLowerCase())) ||
          topic.hashtags.some((tag) => text.includes(tag.toLowerCase()));

        if (matches) {
          detectedTopic = topic;
          break;
        }
      }

      if (!detectedTopic) {
        callback({
          text: "I couldn't identify the topic. Try asking about BTC, ETH, SOL, or other crypto topics.",
          action: "X_VIBE",
        });
        return { success: true };
      }

      const searchService = getXSearchService();
      const sentimentService = getXSentimentService();

      const vibeCacheTtlMs = process.env.X_PULSE_CACHE_TTL_MS
        ? parseInt(process.env.X_PULSE_CACHE_TTL_MS, 10)
        : 60 * 60 * 1000; // 1h default, same as pulse

      // Search for the topic
      const tweets = await searchService.searchTopic(detectedTopic.id, {
        maxResults: 100,
        hoursBack: 24,
        cacheTtlMs: vibeCacheTtlMs,
      });

      if (tweets.length === 0) {
        callback({
          text: `📊 **${detectedTopic.name} Vibe Check**\n\nNo recent tweets found. X API might be rate limited.`,
          action: "X_VIBE",
        });
        return { success: true };
      }

      // Analyze sentiment
      const topicSentiment = sentimentService.getTopicVibe(
        tweets,
        detectedTopic.id,
      );

      if (!topicSentiment) {
        callback({
          text: `📊 **${detectedTopic.name} Vibe Check**\n\nNot enough data to determine sentiment.`,
          action: "X_VIBE",
        });
        return { success: true };
      }

      const mandoContext = await getMandoContextForX(runtime);

      const scoreStr =
        topicSentiment.weightedScore > 0
          ? `+${topicSentiment.weightedScore}`
          : String(topicSentiment.weightedScore);
      const dataContextLines = [
        `Topic: ${detectedTopic.name}`,
        `Direction: ${capitalize(topicSentiment.direction)} (${scoreStr}) | ${topicSentiment.confidence}% confidence`,
        `Breakdown: Bullish ${topicSentiment.breakdown.bullishCount}, Bearish ${topicSentiment.breakdown.bearishCount}, Neutral ${topicSentiment.breakdown.neutralCount} tweets`,
        topicSentiment.whaleAlignment !== 0
          ? `Whale alignment: ${topicSentiment.whaleAlignment > 0 ? "+" : ""}${topicSentiment.whaleAlignment}`
          : null,
        topicSentiment.isContrarian && topicSentiment.contrarianNote
          ? `Contrarian: ${topicSentiment.contrarianNote}`
          : null,
        mandoContext?.vibeCheck
          ? `Today's news: ${mandoContext.vibeCheck}`
          : null,
        `Sample size: ${tweets.length} tweets from the last 24h`,
      ].filter(Boolean) as string[];
      const dataContext = dataContextLines.join("\n");

      const narrative = await generateVibeNarrative(
        runtime,
        detectedTopic.name,
        dataContext,
      );
      let response: string;
      if (narrative) {
        response = `📊 **${detectedTopic.name} Vibe Check**\n\n`;
        if (mandoContext?.vibeCheck) {
          response += `**Today's news:** ${mandoContext.vibeCheck}\n\n`;
          response += `_(Prices: ask VINCE for current levels.)_\n\n`;
        }
        response +=
          narrative +
          `\n\n_Based on ${tweets.length} tweets from the last 24h_`;
      } else {
        const emoji =
          topicSentiment.direction === "bullish"
            ? "📈"
            : topicSentiment.direction === "bearish"
              ? "📉"
              : topicSentiment.direction === "mixed"
                ? "🔀"
                : "😐";
        response = `📊 **${detectedTopic.name} Vibe Check**\n\n`;
        if (mandoContext?.vibeCheck) {
          response += `**Today's news:** ${mandoContext.vibeCheck}\n\n`;
          response += `_(Prices: ask VINCE for current levels.)_\n\n`;
        }
        response += `${emoji} ${capitalize(topicSentiment.direction)} (${scoreStr}) | ${topicSentiment.confidence}% confidence\n\n`;
        response += `**Breakdown:**\n`;
        response += `• Bullish: ${topicSentiment.breakdown.bullishCount} tweets\n`;
        response += `• Bearish: ${topicSentiment.breakdown.bearishCount} tweets\n`;
        response += `• Neutral: ${topicSentiment.breakdown.neutralCount} tweets\n\n`;
        if (topicSentiment.whaleAlignment !== 0) {
          const whaleEmoji =
            topicSentiment.whaleAlignment > 0 ? "🐋📈" : "🐋📉";
          response += `**Whale alignment:** ${topicSentiment.whaleAlignment > 0 ? "+" : ""}${topicSentiment.whaleAlignment} ${whaleEmoji}\n\n`;
        }
        if (topicSentiment.isContrarian && topicSentiment.contrarianNote) {
          response += `${topicSentiment.contrarianNote}\n\n`;
        }
        response += `_Based on ${tweets.length} tweets from the last 24h_`;
      }

      if (process.env.X_RESEARCH_SHOW_COST === "true") {
        response += `\n\n${formatCostFooter(tweets.length)}`;
      }

      if (message.roomId) setLastResearch(message.roomId, response);
      callback({
        text: response,
        action: "X_VIBE",
      });

      return { success: true };
    } catch (error) {
      logger.warn({ err: error }, "[X_VIBE] X API error");
      const friendly = getFriendlyXErrorMessage(error);
      callback({
        text: `📊 **Vibe Check**\n\n⚠️ ${friendly}`,
        action: "X_VIBE",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

async function generateVibeNarrative(
  runtime: IAgentRuntime,
  topicName: string,
  dataContext: string,
): Promise<string | null> {
  const prompt = `You are ECHO, giving a quick vibe check on Crypto Twitter sentiment for ${topicName}. Below are the data points. Turn them into one short ALOHA-style narrative.

Here is the vibe data:

${dataContext}

Write a short narrative (~100-150 words) that: opens with the read on this topic, weaves in where whales stand and any contrarian signal, and ends with one clear take.

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Write the narrative only (no wrapper — start with the narrative itself):`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const text = String(response).trim();
    return text.length > 0 ? text : null;
  } catch (error) {
    logger.warn({ err: error }, "[X_VIBE] LLM narrative failed");
    return null;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default xVibeAction;
