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
import { logger, ModelType } from "@elizaos/core";
import type { VinceXResearchService } from "../services/xResearch.service";
import type { XTweet } from "../services/xResearch.service";
import { buildSentimentQuery } from "../services/xSentiment.service";

const SEARCH_TRIGGER_PATTERNS = [
  /\b(?:x\s*research|research\s+(?:on\s+)?x\b|search\s+x\s+for|search\s+twitter\s+for|what(?:'s| are)\s+people\s+saying\s+about|what(?:'s| is)\s+twitter\s+saying|check\s+x\s+for|x\s+search)\b/i,
  /\b(?:what(?:'s| is)\s+ct\s+saying|crypto\s*twitter\s+(?:saying|on)|ct\s+sentiment\s+on)\b/i,
  /\b(?:sentiment\s+on\s+x|x\s+sentiment|sentiment\s+on\s+twitter|twitter\s+sentiment)\b/i,
  /\b(?:from:\w+|@\w+\s+recent)\b/i,
];

const PROFILE_TRIGGER_PATTERNS = [
  /\b(?:what\s+did\s+@\w+|recent\s+tweets?\s+from\s+@\w+|profile\s+@\w+|check\s+@\w+)\b/i,
  /\b(?:@\w+\s+recent|@\w+\s+post|tweets?\s+from\s+@\w+)\b/i,
  /^from:(\w+)$/i,
];

const THREAD_TRIGGER_PATTERNS = [
  /\b(?:thread\s+for\s+tweet|get\s+thread|conversation\s+(\d+)|thread\s+(\d+))\b/i,
  /x\.com\/\w+\/status\/(\d+)/i,
  /twitter\.com\/\w+\/status\/(\d+)/i,
];

const TWEET_TRIGGER_PATTERNS = [
  /\b(?:get\s+tweet\s+(\d+)|tweet\s+(\d+)|show\s+tweet\s+(\d+))\b/i,
  /^\d{15,}$/, // bare tweet ID
];

type Intent = "search" | "profile" | "thread" | "tweet";

function detectIntent(text: string): Intent {
  const t = text.trim();
  // Thread: URL or "thread for tweet X" / "get thread X"
  if (THREAD_TRIGGER_PATTERNS.some((re) => re.test(t))) return "thread";
  // Tweet: "get tweet 123" or bare long numeric
  if (TWEET_TRIGGER_PATTERNS.some((re) => re.test(t))) return "tweet";
  // Profile: @user, "recent tweets from @user", "profile @user"
  if (PROFILE_TRIGGER_PATTERNS.some((re) => re.test(t))) return "profile";
  // Search: existing patterns
  if (SEARCH_TRIGGER_PATTERNS.some((re) => re.test(t))) return "search";
  return "search";
}

function extractTweetId(text: string): string | null {
  const m = text.match(/x\.com\/\w+\/status\/(\d+)/i) ?? text.match(/twitter\.com\/\w+\/status\/(\d+)/i);
  if (m?.[1]) return m[1];
  const m2 = text.match(/\b(?:thread\s+for\s+tweet|get\s+thread|conversation|thread)\s+(\d+)\b/i);
  if (m2?.[1]) return m2[1];
  const m3 = text.match(/\b(?:get\s+tweet|tweet|show\s+tweet)\s+(\d+)\b/i);
  if (m3?.[1]) return m3[1];
  if (/^\d{15,}$/.test(text.trim())) return text.trim();
  return null;
}

function extractUsername(text: string): string | null {
  const m = text.match(/@(\w+)/);
  if (m?.[1]) return m[1];
  const m2 = text.match(/from:(\w+)/i);
  if (m2?.[1]) return m2[1];
  const m3 = text.match(/(?:recent\s+tweets?\s+from|profile|check)\s+@?(\w+)/i);
  if (m3?.[1]) return m3[1];
  return null;
}

function extractQuery(text: string): string {
  const patterns: [RegExp, string][] = [
    [/search\s+x\s+for\s+["']?([^"'\n]+)["']?/i, "$1"],
    [/search\s+twitter\s+for\s+["']?([^"'\n]+)["']?/i, "$1"],
    [/what(?:'s| are)\s+people\s+saying\s+about\s+["']?([^"'\n.?]+)/i, "$1"],
    [/what(?:'s| is)\s+twitter\s+saying\s+about\s+["']?([^"'\n.?]+)/i, "$1"],
    [/what(?:'s| is)\s+ct\s+saying\s+about\s+["']?([^"'\n.?]+)/i, "$1"],
    [/crypto\s*twitter\s+(?:saying\s+about|on)\s+["']?([^"'\n.?]+)/i, "$1"],
    [/ct\s+sentiment\s+on\s+["']?([^"'\n.?]+)/i, "$1"],
    [/check\s+x\s+for\s+["']?([^"'\n]+)["']?/i, "$1"],
    [/x\s+research\s+["']?([^"'\n]+)["']?/i, "$1"],
    [/x\s+search\s+["']?([^"'\n]+)["']?/i, "$1"],
  ];
  for (const [re, group] of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  const withoutTrigger = text
    .replace(/\b(?:x\s*research|search\s+x\s+for|search\s+twitter\s+for|what(?:'s| are)\s+people\s+saying\s+about|check\s+x\s+for|x\s+search)\s*/gi, "")
    .trim();
  if (withoutTrigger.length > 2) return withoutTrigger;
  return text.trim() || "crypto";
}

/** Known tickers we expand to X search query (e.g. BTC → $BTC OR Bitcoin) so results are about the asset, not random tweets that mention the ticker. */
const KNOWN_TICKERS = new Set(["BTC", "ETH", "SOL", "HYPE", "DOGE", "PEPE"]);

function expandQueryForSearch(rawQuery: string): string {
  const upper = rawQuery.trim().toUpperCase();
  if (KNOWN_TICKERS.has(upper)) return buildSentimentQuery(upper);
  return rawQuery.trim();
}

/** Parse optional search options from natural language (last 24h, by likes, top 5, more pages). */
function parseSearchOptions(text: string): {
  since?: string;
  sortByLikes: boolean;
  limit: number;
  pages?: number;
} {
  let since: string | undefined;
  let sortByLikes = true;
  let limit = 12;
  let pages: number | undefined;
  const t = text.toLowerCase();
  const hm = t.match(/\b(?:last|past)\s+(\d+)\s*(?:h|hr|hours?)\b/);
  if (hm?.[1]) since = `${hm[1]}h`;
  else {
    const dm = t.match(/\b(?:last|past)\s+(\d+)\s*d(?:ays?)?\b/);
    if (dm?.[1]) since = `${dm[1]}d`;
  }
  if (/\b(?:most\s+recent|recent\s+first)\b/.test(t)) sortByLikes = false;
  const lm = t.match(/\b(?:top|first)\s+(\d{1,2})\b/);
  if (lm?.[1]) limit = Math.min(20, Math.max(5, parseInt(lm[1], 10)));
  if (/\bmore\s+(?:results?|pages?)\b/.test(t)) pages = 2;
  else {
    const pm = t.match(/(?:(\d+)\s+pages?|pages?\s+of\s+(\d+))/);
    const n = pm?.[1] ?? pm?.[2];
    if (n) pages = Math.min(5, Math.max(2, parseInt(n, 10)));
  }
  return { since, sortByLikes, limit, pages };
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

/** Build a short sample of tweet texts for LLM conclusion (truncated to avoid token overflow). Includes (L R) engagement. */
function tweetSampleForLLM(tweets: XTweet[], maxTweets = 20, maxCharsPerTweet = 200): string {
  const lines: string[] = [];
  for (let i = 0; i < Math.min(tweets.length, maxTweets); i++) {
    const t = tweets[i];
    const text = t.text.length > maxCharsPerTweet ? t.text.slice(0, maxCharsPerTweet) + "…" : t.text;
    const eng = `(L${t.metrics.likes} R${t.metrics.retweets})`;
    lines.push(`@${t.username}: ${text} ${eng}`);
  }
  return lines.join("\n\n");
}

/** Ask the LLM for an ALOHA-style narrative from the tweet sample. Returns null if model unavailable. */
async function getLLMConclusion(
  runtime: IAgentRuntime,
  query: string,
  tweetSample: string,
  postCount: number,
): Promise<string | null> {
  if (!tweetSample.trim()) return null;
  const prompt = `You are VINCE. Someone asked what people are saying on X about "${query}". You've got a batch of recent posts below. Write your take like you're texting a friend who cares about the space.

Query: ${query}. Sample: ${postCount} posts (last 7 days). Numbers in parentheses are likes and retweets (L R).

Posts:

${tweetSample}

Write a briefing that covers:
1. The overall vibe — what's the mood? Start with your gut take.
2. Main themes — connect the dots; don't list mechanically. If everyone's saying the same thing, say that. If there's a contrarian take, highlight it.
3. Standout or viral takes if any — use the (L R) numbers when something got real traction.
4. One clear takeaway or opinion — what would you do with this?

STYLE RULES:
- Write like you're explaining this to a smart friend over coffee, not presenting to a board.
- Vary your sentence length. Mix short punchy takes with longer explanations when you need to unpack something.
- Weave in specifics (e.g. "the post that blew up was…").
- Don't bullet point anything. Flow naturally between thoughts.
- Skip the formal structure. No headers, no "In conclusion", no "Overall".
- Have a personality. If the feed is boring, say it. If something seems off, say it.
- Don't be sycophantic or hedge everything. Take positions.
- Around 150–250 words. Don't pad it.

AVOID:
- "Interestingly", "notably", "it's worth noting"
- Generic observations that could apply to any topic
- Repeating the same sentence structure over and over

Write the briefing:`;
  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const conclusion = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";
    return conclusion?.trim() || null;
  } catch (e) {
    logger.debug({ err: String(e) }, "[VINCE_X_RESEARCH] LLM conclusion skipped");
    return null;
  }
}

function formatProfileBriefing(user: any, tweets: XTweet[], limit = 8): string {
  const name = user?.name ?? user?.username ?? "?";
  const handle = user?.username ? `@${user.username}` : "";
  const header = `**${name}** ${handle}`.trim();
  if (tweets.length === 0) return `${header}\n\n_No recent tweets (excl. replies)._`;
  return `${header}\n\n${formatTweetsForBriefing(tweets, limit)}`;
}

function formatSingleTweet(t: XTweet): string {
  const eng = `L${t.metrics.likes} R${t.metrics.retweets}`;
  return `**@${t.username}**: ${t.text}\n\n(${eng}) [Tweet](${t.tweet_url})`;
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
    "Search X, get a user's recent tweets, fetch a thread, or a single tweet. Use when the user asks what people are saying on X, search X for something, 'what did @user post?', 'get thread for tweet X', or 'get tweet 123'. Read-only; never posts.",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const svc = runtime.getService("VINCE_X_RESEARCH_SERVICE") as VinceXResearchService | null;
    if (!svc?.isConfigured()) return false;
    const text = message.content?.text?.trim() || "";
    return (
      SEARCH_TRIGGER_PATTERNS.some((re) => re.test(text)) ||
      PROFILE_TRIGGER_PATTERNS.some((re) => re.test(text)) ||
      THREAD_TRIGGER_PATTERNS.some((re) => re.test(text)) ||
      TWEET_TRIGGER_PATTERNS.some((re) => re.test(text))
    );
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
    const intent = detectIntent(text);

    const sendError = async (msg: string) => {
      logger.error(`[VINCE_X_RESEARCH] ${msg}`);
      await callback({
        text: `${msg} (Rate limit? Check X_BEARER_TOKEN and X API tier.)`,
        actions: ["VINCE_X_RESEARCH"],
      });
    };

    try {
      if (intent === "profile") {
        const username = extractUsername(text);
        if (!username) {
          await sendError("Couldn’t find a username. Try: what did @user post? or profile @user");
          return { success: false };
        }
        await callback({
          text: `Fetching recent tweets from **@${username}**…`,
          actions: ["VINCE_X_RESEARCH"],
        });
        const { user, tweets } = await svc.profile(username, { count: 20 });
        const formatted = formatProfileBriefing(user, tweets, 8);
        await callback({
          text: `${formatted}\n\n_Source: X API (read-only)._`,
          actions: ["VINCE_X_RESEARCH"],
        });
        return { success: true };
      }

      if (intent === "thread") {
        const tweetId = extractTweetId(text);
        if (!tweetId) {
          await sendError("Couldn’t find a tweet ID or URL. Try: get thread for tweet 123 or paste an x.com/…/status/ID link.");
          return { success: false };
        }
        await callback({
          text: `Fetching thread for tweet **${tweetId}**…`,
          actions: ["VINCE_X_RESEARCH"],
        });
        const tweets = await svc.thread(tweetId, { pages: 2 });
        const formatted = formatTweetsForBriefing(tweets, 15);
        await callback({
          text: `**Thread** (${tweets.length} tweets)\n\n${formatted}\n\n_Source: X API (read-only)._`,
          actions: ["VINCE_X_RESEARCH"],
        });
        return { success: true };
      }

      if (intent === "tweet") {
        const tweetId = extractTweetId(text);
        if (!tweetId) {
          await sendError("Couldn’t find a tweet ID. Try: get tweet 1234567890123456789");
          return { success: false };
        }
        await callback({
          text: `Fetching tweet **${tweetId}**…`,
          actions: ["VINCE_X_RESEARCH"],
        });
        const tweet = await svc.getTweet(tweetId);
        if (!tweet) {
          await callback({
            text: "Tweet not found (deleted or invalid ID).",
            actions: ["VINCE_X_RESEARCH"],
          });
          return { success: false };
        }
        await callback({
          text: formatSingleTweet(tweet),
          actions: ["VINCE_X_RESEARCH"],
        });
        return { success: true };
      }

      // search (default)
      const rawQuery = extractQuery(text);
      const query = expandQueryForSearch(rawQuery);
      const opts = parseSearchOptions(text);
      await callback({
        text: `Searching X for: **${rawQuery}**…`,
        actions: ["VINCE_X_RESEARCH"],
      });
      const tweets = await svc.search(query, {
        maxResults: Math.min(100, Math.max(opts.limit, 20)),
        pages: opts.pages ?? 1,
        sortOrder: opts.since ? "recency" : "relevancy",
        since: opts.since ?? "7d",
      });
      const sorted = opts.sortByLikes ? svc.sortBy(tweets, "likes") : tweets;
      const qualityHandles = await svc.getQualityAccountHandles();
      const ordered = qualityHandles.length > 0 ? svc.reorderTweetsWithVipFirst(sorted, qualityHandles) : sorted;
      const formatted = formatTweetsForBriefing(ordered, opts.limit);
      const sampleForLLM = tweetSampleForLLM(ordered, 20, 200);
      const conclusion = await getLLMConclusion(runtime, rawQuery, sampleForLLM, ordered.length);
      const samplePosts = formatTweetsForBriefing(ordered, 5);
      const reply = conclusion
        ? `**X research: ${rawQuery}**\n\n${conclusion}\n\n---\n\n**Sample posts:**\n${samplePosts}\n\n_Source: X API (read-only, last 7 days)._`
        : `**X research: ${rawQuery}**\n\n${formatted}\n\n_Source: X API (read-only, last 7 days)._`;
      await callback({
        text: reply,
        actions: ["VINCE_X_RESEARCH"],
      });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const hint =
        /rate limit|429/i.test(msg) &&
        " Add X_BEARER_TOKEN_SENTIMENT in .env for vibe check so in-chat keeps working; see docs/X-API.md. If you can't add another app, set X_SENTIMENT_ENABLED=false or X_SENTIMENT_ASSETS=BTC so in-chat has headroom (X-RESEARCH.md).";
      await sendError(`X research failed: ${msg}${hint ?? ""}`);
      return { success: false };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What are people saying about BNKR?" } },
      {
        name: "VINCE",
        content: {
          text: "**X research: BNKR**\n\nSentiment is mixed. Key themes are … The post that got the most traction was … One clear take: …\n\n---\n\n**Sample posts:**\n- **@user**: \"…\" (L42 R3) [Tweet](https://x.com/…)\n\n_Source: X API (read-only, last 7 days)._",
          actions: ["VINCE_X_RESEARCH"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Search X for Opus 4.6 trading" } },
      {
        name: "VINCE",
        content: {
          text: "**X research: Opus 4.6 trading**\n\nDiscussion focuses on … Connect the dots. Standout take … My read: …\n\n---\n\n**Sample posts:**\n- **@dev**: \"…\" (L12 R1) [Tweet](https://x.com/…)\n\n_Source: X API (read-only, last 7 days)._",
          actions: ["VINCE_X_RESEARCH"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "What did @frankdegods post recently?" } },
      {
        name: "VINCE",
        content: {
          text: "**frankdegods** @frankdegods\n\n- **@frankdegods**: \"…\" (L10 R2) [Tweet](https://x.com/…)\n\n_Source: X API (read-only)._",
          actions: ["VINCE_X_RESEARCH"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Get thread for tweet 1234567890123456789" } },
      {
        name: "VINCE",
        content: {
          text: "**Thread** (5 tweets)\n\n- **@user**: \"…\" (L42 R3) [Tweet](https://x.com/…)\n\n_Source: X API (read-only)._",
          actions: ["VINCE_X_RESEARCH"],
        },
      },
    ],
  ],
};
