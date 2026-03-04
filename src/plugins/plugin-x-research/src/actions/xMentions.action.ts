/**
 * X Mentions Action
 *
 * "What are people saying to @user?" — Fetch recent mentions and summarize
 * vibe, themes, and sentiment (supportive / questioning / critical).
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
import { getXClient } from "../services/xClient.service";
import { initXClientFromEnv } from "../services/xClient.service";
import { TOPIC_BY_ID } from "../constants/topics";
import { sendActionResponse } from "./helpers/actionResponse";
import {
  parseTopicFromPrompt,
  parseUsernameFromMessage,
} from "./helpers/inputParsers";
import {
  dedupeByText,
  formatTradingSignalBlock,
  inferTradingSignalFromTexts,
  rankTweetsByTopicRelevance,
} from "./helpers/signalScoring";

const MENTIONS_MAX = 50;
const START_TIME_DAYS_AGO = 7;

// Simple keyword-based classification for mention sentiment (engagement tone, not market)
const SUPPORTIVE_TERMS = [
  "agree",
  "great",
  "love",
  "bull",
  "respect",
  "thanks",
  "thank you",
  "based",
  "facts",
  "this",
  "exactly",
  "yes",
  "correct",
  "spot on",
  "legend",
  "king",
  "bullish",
];
const QUESTIONING_TERMS = [
  "why",
  "how",
  "when",
  "doubt",
  "question",
  "curious",
  "?",
  "unsure",
  "think so",
  "source",
  "proof",
  "explain",
  "what about",
  "really",
  "skeptical",
];
const CRITICAL_TERMS = [
  "wrong",
  "bad",
  "bear",
  "hate",
  "disagree",
  "no",
  "overrated",
  "copium",
  "delusional",
  "lol",
  "lmao",
  "ngmi",
  "reckt",
  "trash",
  "worst",
  "terrible",
];

function classifyMentionSentiment(
  text: string,
): "supportive" | "questioning" | "critical" | "neutral" {
  const lower = text.toLowerCase();
  let s = 0,
    q = 0,
    c = 0;
  for (const t of SUPPORTIVE_TERMS) if (lower.includes(t)) s++;
  for (const t of QUESTIONING_TERMS) if (lower.includes(t)) q++;
  for (const t of CRITICAL_TERMS) if (lower.includes(t)) c++;
  if (s > c && s > q) return "supportive";
  if (c > s && c > q) return "critical";
  if (q > s && q > c) return "questioning";
  return "neutral";
}

export const xMentionsAction: Action = {
  name: "X_MENTIONS",
  description:
    'Check what people are saying to a specific @user on X (recent mentions). Use when asked "what are people saying to @user?", "mentions of @user", "vibe around @user", etc.',
  similes: ["MENTIONS_CHECK", "WHAT_PEOPLE_SAYING_TO", "MENTIONS_OF"],

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "What are people saying to @RaoulGMI?" },
      },
      {
        name: "{{agentName}}",
        content: {
          text: "**@RaoulGMI Mentions Check**\n\n**Recent vibe:** Mixed but respectful engagement.\n\n**Common themes:**\n• Macro takes and recession calls\n• Crypto cycle / altseason timing\n• Real Vision content feedback\n\n**Sentiment breakdown:**\n✅ Supportive: ~60%\n🤔 Questioning: ~30%\n❌ Critical: ~10%\n\n**Notable:** High-quality replies; whale accounts still engaging positively.",
          action: "X_MENTIONS",
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text ?? "";
    const hasHandle = /@\w+/.test(text);
    const mentionsIntent =
      /saying to @|mentions of @|what are people saying|people saying to|vibe around @|engagement on @/i.test(
        text,
      );
    return hasHandle && mentionsIntent;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    try {
      initXClientFromEnv(runtime);
      const text = message.content?.text ?? "";
      const username = parseUsernameFromMessage(text);
      if (!username) {
        await sendActionResponse(callback, "X_MENTIONS", {
          text: 'I need a username to check mentions (reason: no_target). Example: "What are people saying to @username?"',
        });
        return { success: true };
      }
      const client = getXClient();

      const user = await client.getUserByUsername(username);
      if (!user) {
        await sendActionResponse(callback, "X_MENTIONS", {
          text: `Couldn't find @${username} (reason: no_target). The account may not exist or be protected.`,
        });
        return { success: true };
      }

      const startTime = new Date(
        Date.now() - START_TIME_DAYS_AGO * 24 * 60 * 60 * 1000,
      ).toISOString();
      const rawMentions = await client.getUserMentions(user.id, {
        maxResults: MENTIONS_MAX,
        startTime,
      });
      const requestedTopic = parseTopicFromPrompt(text);
      const keywords = requestedTopic ? getTopicKeywords(requestedTopic) : [];
      const mentions = dedupeByText(
        keywords.length > 0
          ? rankTweetsByTopicRelevance(rawMentions, keywords)
          : [...rawMentions].sort(
              (a, b) =>
                (b.metrics?.likeCount ?? 0) - (a.metrics?.likeCount ?? 0),
            ),
      );

      if (mentions.length === 0) {
        await sendActionResponse(callback, "X_MENTIONS", {
          text: `**@${username} Mentions Check**\n\nNo recent mentions in the last ${START_TIME_DAYS_AGO} days (reason: no_recent_data). They may have low visibility or the API window has no data.`,
        });
        return { success: true };
      }

      const bySentiment = {
        supportive: 0,
        questioning: 0,
        critical: 0,
        neutral: 0,
      };
      for (const t of mentions) {
        const kind = classifyMentionSentiment(t.text);
        bySentiment[kind]++;
      }
      const total = mentions.length;
      const pct = (n: number) => Math.round((n / total) * 100);

      let response = `**@${username} Mentions Check**\n\n`;
      response += `_Based on ${total} recent mentions._\n\n`;

      const supportPct = pct(bySentiment.supportive);
      const questionPct = pct(bySentiment.questioning);
      const criticalPct = pct(bySentiment.critical);
      const neutralPct = pct(bySentiment.neutral);

      let recentVibe = "Mixed engagement.";
      if (supportPct >= 50 && criticalPct < 15)
        recentVibe = "Mostly supportive and respectful.";
      else if (criticalPct >= 30)
        recentVibe = "Notable pushback and criticism.";
      else if (questionPct >= 35)
        recentVibe = "Lots of questions and skepticism.";
      response += `**Recent vibe:** ${recentVibe}\n\n`;

      const texts = mentions
        .slice(0, 25)
        .map((t) => t.text.replace(/\n/g, " ").slice(0, 200));
      const themePrompt = `List 3-5 short common themes (one phrase each) from these tweet replies. Only output the list, one theme per line, no numbering or bullets:\n\n${texts.join("\n\n")}`;
      let themesBlock = "";
      try {
        const raw = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt: themePrompt,
        });
        const themeText =
          typeof raw === "string"
            ? raw
            : ((raw as { text?: string })?.text ?? String(raw));
        const lines = themeText
          .split("\n")
          .map((l) => l.replace(/^[\d\-•*.]+\s*/, "").trim())
          .filter((l) => l.length > 0)
          .slice(0, 5);
        if (lines.length > 0) {
          themesBlock =
            "**Common themes:**\n" +
            lines.map((l) => `• ${l}`).join("\n") +
            "\n\n";
        }
      } catch {
        // Skip themes on LLM failure
      }
      if (themesBlock) response += themesBlock;

      response += `**Sentiment breakdown:**\n`;
      response += `✅ Supportive: ~${supportPct}%\n`;
      response += `🤔 Questioning: ~${questionPct}%\n`;
      response += `❌ Critical: ~${criticalPct}%\n`;
      if (neutralPct > 0) response += `😐 Neutral: ~${neutralPct}%\n`;
      response += `\n`;

      const notable: string[] = [];
      if (mentions.some((t) => (t.metrics?.likeCount ?? 0) > 50)) {
        notable.push("Some high-engagement replies in the sample.");
      }
      const hasVerified = mentions.some((t) => t.author?.verified);
      if (hasVerified) notable.push("Verified accounts are engaging.");
      if (notable.length > 0) {
        response += `**Notable:** ${notable.join(" ")}\n`;
      }
      const signal = inferTradingSignalFromTexts(
        mentions.slice(0, 15).map((m) => m.text),
        START_TIME_DAYS_AGO,
      );
      response += `\n\n${formatTradingSignalBlock(signal)}`;
      response += `\n\nWant me to dive deeper into any specific thread or topic around their mentions?`;

      await sendActionResponse(callback, "X_MENTIONS", {
        text: response,
      });
      return { success: true };
    } catch (error) {
      logger.warn({ err: error }, "[X_MENTIONS] Error");
      const err = error instanceof Error ? error.message : String(error);
      await sendActionResponse(callback, "X_MENTIONS", {
        text: `**Mentions Check**\n\n❌ Error (reason: api_limited): ${err}`,
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

function getTopicKeywords(topicId: string): string[] {
  const topic = TOPIC_BY_ID[topicId];
  if (!topic) return [topicId];
  const terms = [...topic.searchTerms];
  if (topic.cashtags?.length) terms.push(...topic.cashtags.map((c) => `$${c}`));
  return [...new Set(terms)];
}

export default xMentionsAction;
