/**
 * VINCE X Research Action
 *
 * Read-only X/Twitter research: search, sourced briefings.
 * Uses VinceXResearchService (X API v2 Bearer). Triggered by "search x for",
 * "what are people saying about", "x research", etc.
 *
 * @see https://github.com/rohunvora/x-research-skill
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VinceXResearchService } from "../services/xResearch.service";
import type { XTweet } from "../services/xResearch.service";

const TRIGGER_PATTERNS = [
  /\b(?:x\s*research|search\s+x\s+for|search\s+twitter\s+for|what(?:'s| are)\s+people\s+saying\s+about|what(?:'s| is)\s+twitter\s+saying|check\s+x\s+for|x\s+search)\b/i,
  /\b(?:from:\w+|@\w+\s+recent)\b/i,
];

function extractQuery(text: string): string {
  const patterns: [RegExp, string][] = [
    [/search\s+x\s+for\s+["']?([^"'\n]+)["']?/i, "$1"],
    [/search\s+twitter\s+for\s+["']?([^"'\n]+)["']?/i, "$1"],
    [/what(?:'s| are)\s+people\s+saying\s+about\s+["']?([^"'\n.?]+)/i, "$1"],
    [/what(?:'s| is)\s+twitter\s+saying\s+about\s+["']?([^"'\n.?]+)/i, "$1"],
    [/check\s+x\s+for\s+["']?([^"'\n]+)["']?/i, "$1"],
    [/x\s+research\s+["']?([^"'\n]+)["']?/i, "$1"],
    [/x\s+search\s+["']?([^"'\n]+)["']?/i, "$1"],
  ];
  for (const [re, group] of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  // Fallback: use full message minus trigger words
  const withoutTrigger = text
    .replace(/\b(?:x\s*research|search\s+x\s+for|search\s+twitter\s+for|what(?:'s| are)\s+people\s+saying\s+about|check\s+x\s+for|x\s+search)\s*/gi, "")
    .trim();
  if (withoutTrigger.length > 2) return withoutTrigger;
  return text.trim() || "crypto";
}

function formatTweetsForBriefing(tweets: XTweet[], limit = 10): string {
  if (tweets.length === 0) return "_No recent tweets found._";
  const lines: string[] = [];
  for (let i = 0; i < Math.min(tweets.length, limit); i++) {
    const t = tweets[i];
    const eng = `L${t.metrics.likes} R${t.metrics.retweets}`;
    lines.push(`- **@${t.username}**: "${t.text.slice(0, 120)}${t.text.length > 120 ? "…" : ""}" (${eng}) [Tweet](${t.tweet_url})`);
  }
  return lines.join("\n");
}

export const vinceXResearchAction: Action = {
  name: "VINCE_X_RESEARCH",
  similes: [
    "X_RESEARCH",
    "X_SEARCH",
    "SEARCH_X",
    "TWITTER_RESEARCH",
    "WHAT_PEOPLE_SAYING",
  ],
  description:
    "Searches X (Twitter) for recent tweets about a topic and returns a sourced briefing. Use when the user asks what people are saying on X, search X for something, or wants X/twitter research. Read-only; never posts.",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const svc = runtime.getService("VINCE_X_RESEARCH_SERVICE") as VinceXResearchService | null;
    if (!svc?.isConfigured()) return false;
    const text = message.content?.text?.trim() || "";
    return TRIGGER_PATTERNS.some((re) => re.test(text));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<{ success: boolean }> => {
    const svc = runtime.getService("VINCE_X_RESEARCH_SERVICE") as VinceXResearchService | null;
    if (!svc?.isConfigured()) {
      await callback({
        text: "X research isn’t configured (set X_BEARER_TOKEN for X API). I can’t search Twitter right now.",
        actions: ["VINCE_X_RESEARCH"],
      });
      return { success: false };
    }

    const text = message.content?.text?.trim() || "";
    const query = extractQuery(text);

    try {
      await callback({
        text: `Searching X for: **${query}**…`,
        actions: ["VINCE_X_RESEARCH"],
      });

      const tweets = await svc.search(query, {
        maxResults: 50,
        pages: 1,
        sortOrder: "relevancy",
        since: "7d",
      });
      const sorted = svc.sortBy(tweets, "likes");
      const formatted = formatTweetsForBriefing(sorted, 12);

      const reply = `**X research: ${query}**\n\n${formatted}\n\n_Source: X API (read-only, last 7 days)._`;
      await callback({
        text: reply,
        actions: ["VINCE_X_RESEARCH"],
      });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[VINCE_X_RESEARCH] ${msg}`);
      await callback({
        text: `X search failed: ${msg}. (Rate limit? Check X_BEARER_TOKEN and X API tier.)`,
        actions: ["VINCE_X_RESEARCH"],
      });
      return { success: false };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What are people saying about BNKR?" } },
      {
        name: "VINCE",
        content: {
          text: "**X research: BNKR**\n\n- **@user**: \"…\" (L42 R3) [Tweet](https://x.com/…)\n\n_Source: X API (read-only)._",
          actions: ["VINCE_X_RESEARCH"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Search X for Opus 4.6 trading" } },
      {
        name: "VINCE",
        content: {
          text: "**X research: Opus 4.6 trading**\n\n- **@dev**: \"…\" (L12 R1) [Tweet](https://x.com/…)\n\n_Source: X API (read-only)._",
          actions: ["VINCE_X_RESEARCH"],
        },
      },
    ],
  ],
};
