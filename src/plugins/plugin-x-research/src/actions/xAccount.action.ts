/**
 * X Account Action
 *
 * Analyze a Twitter/X account.
 * "Tell me about @crediblecrypto"
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
} from "@elizaos/core";
import { getXAccountsService } from "../services/xAccounts.service";
import { initXClientFromEnv } from "../services/xClient.service";
import { TOPIC_BY_ID } from "../constants/topics";
import { formatCostFooterCombined } from "../constants/cost";
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";
import type { AccountAnalysis } from "../types/analysis.types";

function buildAccountDataContext(
  analysis: AccountAnalysis,
  recentTakes: Array<{ text: string }>,
): string {
  const lines: string[] = [];
  lines.push(`@${analysis.username}`);
  lines.push(`Tier: ${analysis.tier}. ${analysis.tierReason}`);
  lines.push(
    `Followers: ${analysis.metrics.followers}, avg likes: ${analysis.metrics.avgLikes}, engagement: ${analysis.metrics.engagementRate}%`,
  );
  if (analysis.topicFocus.length > 0) {
    lines.push(`Focus: ${analysis.topicFocus.join(", ")}`);
  }
  lines.push(
    `Bias: ${analysis.sentimentBias}, reliability: ${analysis.reliability}/100`,
  );
  if (recentTakes.length > 0) {
    lines.push("Recent takes:");
    for (const t of recentTakes.slice(0, 5)) {
      lines.push(
        `- ${t.text.slice(0, 120).replace(/\n/g, " ")}${t.text.length > 120 ? "..." : ""}`,
      );
    }
  }
  return lines.join("\n");
}

async function generateAccountNarrative(
  runtime: IAgentRuntime,
  dataContext: string,
): Promise<string> {
  const prompt = `You are summarizing a Twitter/X account for a crypto trader. Turn the data below into 2–3 short paragraphs: who they are (tier and why), what they focus on and their bias, and what they've been saying lately. Write like you're telling a friend about this account—flowing prose, no bullet lists.

Data:
${dataContext}

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Write 2–3 short paragraphs:`;

  const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
  return String(response).trim();
}

export const xAccountAction: Action = {
  name: "X_ACCOUNT",
  description:
    "Analyze a Twitter/X account - their influence tier, recent takes, topic focus, and sentiment bias.",

  similes: ["ANALYZE_ACCOUNT", "WHO_IS", "ACCOUNT_INFO"],

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Who is @crediblecrypto?" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "👤 **@crediblecrypto**\n\n**Tier:** 🐋 Whale\n**Reason:** 285K followers, market-moving influence\n\n**Stats:**\n• Followers: 285K\n• Avg Likes: 1.2k\n• Engagement: 0.42%\n\n**Focus:** BTC, trading, macro\n**Bias:** Bullish (historically)\n**Reliability:** 80/100\n\n**Recent Takes:**\n• Supply shock thesis for BTC\n• ETF flows analysis\n• Caution on altseason timing",
          action: "X_ACCOUNT",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Tell me about @DegenSpartan on X" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: '👤 **@DegenSpartan**\n\n**Tier:** 🎯 Alpha\n**Reason:** High engagement (890 avg likes), quality insights\n\n**Stats:**\n• Followers: 142K\n• Avg Likes: 890\n• Engagement: 0.63%\n\n**Focus:** DeFi, trading, memes\n**Bias:** Neutral (balanced takes)\n**Reliability:** 75/100\n\n**Recent Takes:**\n• Points meta critique\n• DeFi yield compression\n• "Mid-curve trap" warning',
          action: "X_ACCOUNT",
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text ?? "";

    // Check for @username pattern or account-related question (including "what did @user say about X")
    const hasUsername = /@\w+/.test(text);
    const hasAccountQuery =
      /who is|tell me about|analyze|account|profile|what did|say about/i.test(
        text,
      );

    return hasUsername && hasAccountQuery;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      initXClientFromEnv(runtime);

      const messageText = message.content?.text ?? "";

      // Extract username
      const usernameMatch = messageText.match(/@(\w+)/);

      if (!usernameMatch) {
        callback({
          text: "I need a username to analyze. Example: `Who is @crediblecrypto?`",
          action: "X_ACCOUNT",
        });
        return;
      }

      const username = usernameMatch[1];
      const accountsService = getXAccountsService();

      // Analyze the account
      const analysis = await accountsService.analyzeAccount(username);

      if (!analysis) {
        callback({
          text: `Couldn't find or analyze @${username}. The account might not exist or be protected.`,
          action: "X_ACCOUNT",
        });
        return;
      }

      // Get recent takes (fetch more if we'll filter by topic)
      const aboutTopic = detectAboutTopic(messageText);
      const recentTweets = await accountsService.getRecentTakes(
        username,
        aboutTopic ? 20 : 5,
      );

      // Optionally filter to tweets about a topic ("what did @user say about BTC")
      let takesToShow = recentTweets;
      let aboutLabel = "";
      if (aboutTopic) {
        const keywords = getTopicKeywords(aboutTopic);
        takesToShow = recentTweets.filter((t) =>
          keywords.some((kw) =>
            t.text.toLowerCase().includes(kw.toLowerCase()),
          ),
        );
        aboutLabel = ` (about ${aboutTopic.toUpperCase()})`;
      }

      // Build structured response (fallback)
      const tierEmoji = getTierEmoji(analysis.tier);
      let structuredResponse = `👤 **@${analysis.username}**${aboutLabel}\n\n`;
      structuredResponse += `**Tier:** ${tierEmoji} ${capitalize(analysis.tier)}\n`;
      structuredResponse += `**Reason:** ${analysis.tierReason}\n\n`;
      structuredResponse += `**Stats:**\n`;
      structuredResponse += `• Followers: ${formatNumber(analysis.metrics.followers)}\n`;
      structuredResponse += `• Avg Likes: ${formatNumber(analysis.metrics.avgLikes)}\n`;
      structuredResponse += `• Engagement: ${analysis.metrics.engagementRate}%\n\n`;
      if (analysis.topicFocus.length > 0) {
        structuredResponse += `**Focus:** ${analysis.topicFocus.join(", ")}\n`;
      }
      structuredResponse += `**Bias:** ${capitalize(analysis.sentimentBias)}\n`;
      structuredResponse += `**Reliability:** ${analysis.reliability}/100\n`;
      if (takesToShow.length > 0) {
        structuredResponse += `\n**Recent Takes${aboutLabel}:**\n`;
        for (const tweet of takesToShow.slice(0, 5)) {
          const shortText = tweet.text.slice(0, 80).replace(/\n/g, " ");
          structuredResponse += `• ${shortText}${tweet.text.length > 80 ? "..." : ""}\n`;
        }
      } else if (aboutTopic) {
        structuredResponse += `\nNo recent tweets from @${analysis.username} about ${aboutTopic.toUpperCase()}.`;
      } else if (recentTweets.length > 0) {
        structuredResponse += `\n**Recent Takes:**\n`;
        for (const tweet of recentTweets.slice(0, 3)) {
          const shortText = tweet.text.slice(0, 60).replace(/\n/g, " ");
          structuredResponse += `• ${shortText}${tweet.text.length > 60 ? "..." : ""}\n`;
        }
      }
      const similar = await accountsService.findSimilarAccounts(username);
      if (similar.length > 0) {
        structuredResponse += `\n**Similar:** ${similar
          .slice(0, 3)
          .map((s) => `@${s}`)
          .join(", ")}`;
      }

      const costFooter =
        process.env.X_RESEARCH_SHOW_COST === "true"
          ? `\n\n${formatCostFooterCombined({ userLookups: 1, postReads: 20 + (aboutTopic ? 20 : 5) })}`
          : "";

      let text: string;
      try {
        const dataContext = buildAccountDataContext(analysis, takesToShow);
        const narrative = await generateAccountNarrative(runtime, dataContext);
        text = `👤 **@${analysis.username}**${aboutLabel}\n\n${narrative}${costFooter}`;
      } catch {
        text = structuredResponse + costFooter;
      }

      callback({
        text,
        action: "X_ACCOUNT",
      });
    } catch (error) {
      console.error("[X_ACCOUNT] Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      callback({
        text: `👤 **Account Analysis**\n\n❌ Error: ${errorMessage}`,
        action: "X_ACCOUNT",
      });
    }
  },
};

function getTierEmoji(tier: string): string {
  switch (tier) {
    case "whale":
      return "🐋";
    case "alpha":
      return "🎯";
    case "quality":
      return "✨";
    case "verified":
      return "✓";
    default:
      return "👤";
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

/** Detect "about BTC" / "about eth" etc. in message. Returns topic id or null. */
function detectAboutTopic(text: string): string | null {
  const m = text.match(/about\s+(\w+)/i);
  if (!m) return null;
  const word = m[1].toLowerCase();
  const topic = TOPIC_BY_ID[word];
  if (topic) return topic.id;
  const bySearchTerm = Object.values(TOPIC_BY_ID).find(
    (t) => t.searchTerms.some((s) => s.toLowerCase() === word) || t.id === word,
  );
  return bySearchTerm?.id ?? null;
}

/** Keywords to filter tweets by topic (search terms + cashtags). */
function getTopicKeywords(topicId: string): string[] {
  const topic = TOPIC_BY_ID[topicId];
  if (!topic) return [topicId];
  const terms = [...topic.searchTerms];
  if (topic.cashtags?.length) terms.push(...topic.cashtags);
  return [...new Set(terms)];
}

export default xAccountAction;
