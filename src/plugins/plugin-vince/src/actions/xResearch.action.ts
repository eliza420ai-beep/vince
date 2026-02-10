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
import type {
  VinceXResearchService,
  XTweet,
  SpaceSummary,
  ListSummary,
} from "../services/xResearch.service";
import { buildSentimentQuery } from "../services/xSentiment.service";
import { simpleSentiment } from "../utils/xSentimentLogic";

const SEARCH_TRIGGER_PATTERNS = [
  /\b(?:x\s*research|research\s+(?:on\s+)?x\b|search\s+x\s+for|search\s+twitter\s+for|what(?:'s| are)\s+people\s+saying\s+about|what(?:'s| is)\s+twitter\s+saying|check\s+x\s+for|x\s+search)\b/i,
  /\b(?:what(?:'s| is)\s+ct\s+saying|crypto\s*twitter\s+(?:saying|on)|ct\s+sentiment\s+on)\b/i,
  /\b(?:sentiment\s+on\s+x|x\s+sentiment|sentiment\s+on\s+twitter|twitter\s+sentiment)\b/i,
  /\b(?:from:\w+|@\w+\s+recent)\b/i,
];

const PROFILE_TRIGGER_PATTERNS = [
  /\b(?:what\s+did\s+@\w+|recent\s+tweets?\s+from\s+@\w+|profile\s+@\w+|check\s+@\w+)\b/i,
  /\b(?:@\w+\s+recent|@\w+\s+post|tweets?\s+from\s+@\w+)\b/i,
  /\b(?:what\s+is\s+account\s+@?\w+|what'?s\s+@?\w+\s+thinking|what\s+is\s+@\w+\s+thinking)\b/i,
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

type Intent = "search" | "profile" | "thread" | "tweet" | "spaces" | "lists_owned" | "lists_memberships" | "mentions";

const SPACES_TRIGGER_PATTERNS = [
  /spaces\s+about\s+/i,
  /upcoming\s+spaces\s+(?:about\s+)?/i,
  /(?:find\s+)?spaces\s+(?:about|on)\s+/i,
];

const LISTS_OWNED_PATTERNS = [/what\s+lists?\s+does\s+@?(\w+)\s+(?:have|own)/i, /(?:list|lists)\s+(?:that\s+)?@?(\w+)\s+owns?/i];
const LISTS_MEMBERSHIPS_PATTERNS = [/what\s+lists?\s+(?:is|are)\s+@?(\w+)\s+in/i, /what\s+lists?\s+include\s+@?(\w+)/i, /lists?\s+@?(\w+)\s+is\s+in/i];
const MENTIONS_PATTERNS = [/what\s+(?:are\s+people\s+saying\s+to|do\s+people\s+say\s+to)\s+@?(\w+)/i, /mentions?\s+(?:for\s+)?@?(\w+)/i];

function detectIntent(text: string): Intent {
  const t = text.trim();
  if (LISTS_OWNED_PATTERNS.some((re) => re.test(t))) return "lists_owned";
  if (LISTS_MEMBERSHIPS_PATTERNS.some((re) => re.test(t))) return "lists_memberships";
  if (MENTIONS_PATTERNS.some((re) => re.test(t))) return "mentions";
  if (SPACES_TRIGGER_PATTERNS.some((re) => re.test(t))) return "spaces";
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

function extractSpacesQuery(text: string): string {
  const m = text.match(/spaces\s+about\s+["']?([^"'\n.?]+)/i);
  if (m?.[1]) return m[1].trim();
  const m2 = text.match(/upcoming\s+spaces\s+(?:about\s+)?["']?([^"'\n.?]*)/i);
  if (m2?.[1]) return m2[1].trim() || "crypto";
  const m3 = text.match(/spaces\s+(?:about|on)\s+["']?([^"'\n.?]+)/i);
  if (m3?.[1]) return m3[1].trim();
  return "crypto";
}

function extractUsernameForListsOrMentions(text: string, intent: "lists_owned" | "lists_memberships" | "mentions"): string | null {
  const t = text.trim();
  if (intent === "lists_owned") {
    for (const re of LISTS_OWNED_PATTERNS) {
      const m = t.match(re);
      if (m?.[1]) return m[1].trim();
    }
  }
  if (intent === "lists_memberships") {
    for (const re of LISTS_MEMBERSHIPS_PATTERNS) {
      const m = t.match(re);
      if (m?.[1]) return m[1].trim();
    }
  }
  if (intent === "mentions") {
    for (const re of MENTIONS_PATTERNS) {
      const m = t.match(re);
      if (m?.[1]) return m[1].trim();
    }
  }
  return extractUsername(text);
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
  const m4 = text.match(/what\s+is\s+account\s+@?(\w+)\s+thinking/i);
  if (m4?.[1]) return m4[1];
  const m5 = text.match(/what'?s\s+@?(\w+)\s+thinking/i);
  if (m5?.[1]) return m5[1];
  const m6 = text.match(/what\s+is\s+@(\w+)\s+thinking/i);
  if (m6?.[1]) return m6[1];
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

/** Crypto noise exclusions from SKILL.md: reduce giveaway/spam so the sample has more signal. */
const CRYPTO_NOISE_EXCLUSIONS = " -airdrop -giveaway -whitelist -presale";

function expandQueryForSearch(rawQuery: string): string {
  const upper = rawQuery.trim().toUpperCase();
  if (KNOWN_TICKERS.has(upper)) return buildSentimentQuery(upper);
  return rawQuery.trim();
}

/** Append noise exclusions for crypto/ticker queries so we get more real discussion and less spam. */
function appendNoiseExclusions(query: string, rawQuery: string): string {
  const upper = rawQuery.trim().toUpperCase();
  if (KNOWN_TICKERS.has(upper)) return `${query.trim()}${CRYPTO_NOISE_EXCLUSIONS}`;
  return query.trim();
}

/** Topic keywords for filtering list tweets to the query (e.g. BTC → btc, bitcoin). */
function topicKeywordsForFilter(rawQuery: string): string[] {
  const upper = rawQuery.trim().toUpperCase();
  if (upper === "BTC") return ["btc", "bitcoin"];
  if (upper === "ETH") return ["eth", "ethereum"];
  if (upper === "SOL") return ["sol", "solana"];
  if (upper === "HYPE") return ["hype"];
  if (upper === "DOGE") return ["doge", "dogecoin"];
  if (upper === "PEPE") return ["pepe"];
  return [rawQuery.trim().toLowerCase()].filter(Boolean);
}

function tweetMatchesTopic(tweet: XTweet, keywords: string[]): boolean {
  const text = (tweet.text || "").toLowerCase();
  return keywords.some((k) => text.includes(k));
}

/** Keyword-based sentiment from tweet sample (uses shared BULLISH_WORDS/BEARISH_WORDS and phrase overrides). */
function quickSentimentFromTweets(tweets: XTweet[]): {
  average: number;
  breakdown: { pos: number; neu: number; neg: number };
  summary: string;
} {
  if (tweets.length === 0) {
    return { average: 0, breakdown: { pos: 0, neu: 0, neg: 0 }, summary: "Quick sentiment: No posts." };
  }
  let pos = 0;
  let neu = 0;
  let neg = 0;
  for (const t of tweets) {
    const score = simpleSentiment(t.text);
    if (score > 0) pos++;
    else if (score < 0) neg++;
    else neu++;
  }
  const average = (pos - neg) / tweets.length;
  const summary = `Quick sentiment: Avg ${average.toFixed(2)} (${pos} bullish, ${neg} bearish, ${neu} neutral).`;
  return { average, breakdown: { pos, neu, neg }, summary };
}

/** Minimum author followers (respected accounts) and minimum likes for quality filter. X API has no min_likes operator—filter post-hoc per references/x-api.md. */
const MIN_FOLLOWERS_QUALITY = 5000;
const MIN_LIKES_QUALITY = 50;
/** Fallback bar when primary yields zero: still deliver a vibe check (SKILL: --quality is ≥10 likes). */
const MIN_FOLLOWERS_FALLBACK = 1000;
const MIN_LIKES_FALLBACK = 10;
/** Pages for ticker vibe check: larger pool so post-hoc filter finds 5K/50+ tweets (max 100 per request). */
const TICKER_VIBE_PAGES = 3;
/** Shorter cache for ticker so we get fresh engagement (likes/impressions); viral tweets can gain 1K+ likes in minutes. */
const TICKER_CACHE_TTL_MS = 3 * 60 * 1000;
/** We never show or send to the LLM tweets with zero engagement (noise). */
const MIN_LIKES_FOR_DISPLAY = 5;
/** Optional impressions floor (x-research-skill: min-impressions). Tweets with reach count as having engagement. */
const MIN_IMPRESSIONS_FOR_DISPLAY = 100;
/** Tweets with high reach count as quality (signal). */
const MIN_IMPRESSIONS_QUALITY = 5000;

/** Keep only tweets that pass the given bar (5K+ followers or >50 likes or 5K+ impressions, or fallback 1K+/10+). */
function filterQualityTweets(
  tweets: XTweet[],
  useFallbackBar = false,
): { filtered: XTweet[]; usedFallback: boolean } {
  const minFol = useFallbackBar ? MIN_FOLLOWERS_FALLBACK : MIN_FOLLOWERS_QUALITY;
  const minLikes = useFallbackBar ? MIN_LIKES_FALLBACK : MIN_LIKES_QUALITY;
  const filtered = tweets.filter(
    (t) =>
      (typeof t.author_followers === "number" && t.author_followers >= minFol) ||
      t.metrics.likes > minLikes ||
      (t.metrics.impressions ?? 0) >= MIN_IMPRESSIONS_QUALITY,
  );
  return { filtered, usedFallback: useFallbackBar };
}

/** Parse optional search options from natural language (last 24h, by likes, top 5, more pages, min likes). */
function parseSearchOptions(text: string): {
  since?: string;
  sortByLikes: boolean;
  limit: number;
  pages?: number;
  minLikes?: number;
} {
  let since: string | undefined;
  let sortByLikes = true;
  let limit = 12;
  let pages: number | undefined;
  let minLikes: number | undefined;
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
  const minLikesM = t.match(/min\s+likes\s+(\d+)/i);
  if (minLikesM?.[1]) minLikes = Math.max(1, parseInt(minLikesM[1], 10));
  if (/\bmore\s+(?:results?|pages?)\b/.test(t)) pages = 2;
  else {
    const pm = t.match(/(?:(\d+)\s+pages?|pages?\s+of\s+(\d+))/);
    const n = pm?.[1] ?? pm?.[2];
    if (n) pages = Math.min(5, Math.max(2, parseInt(n, 10)));
  }
  return { since, sortByLikes, limit, pages, minLikes };
}

function formatTweetsForBriefing(tweets: XTweet[], limit = 10, maxCharsPerTweet = 120): string {
  if (tweets.length === 0) return "_No recent tweets found._";
  const lines: string[] = [];
  for (let i = 0; i < Math.min(tweets.length, limit); i++) {
    const t = tweets[i];
    const eng = `L${t.metrics.likes} R${t.metrics.retweets}`;
    const snippet = t.text.length <= maxCharsPerTweet ? t.text : t.text.slice(0, maxCharsPerTweet) + "…";
    lines.push(`- **@${t.username}**: "${snippet}" (${eng}) [Tweet](${t.tweet_url})`);
  }
  return lines.join("\n");
}

/** Build a short sample of tweet texts for LLM conclusion (truncated to avoid token overflow). Includes (L R) engagement. Optionally marks curated handles so the LLM can weight signal. */
function tweetSampleForLLM(
  tweets: XTweet[],
  maxTweets = 20,
  maxCharsPerTweet = 200,
  curatedHandles?: Set<string>,
): string {
  const lines: string[] = [];
  for (let i = 0; i < Math.min(tweets.length, maxTweets); i++) {
    const t = tweets[i];
    const text = t.text.length > maxCharsPerTweet ? t.text.slice(0, maxCharsPerTweet) + "…" : t.text;
    const eng = `(L${t.metrics.likes} R${t.metrics.retweets})`;
    const curated =
      curatedHandles && curatedHandles.has((t.username || "").toLowerCase()) ? "[curated] " : "";
    lines.push(`${curated}@${t.username}: ${text} ${eng}`);
  }
  return lines.join("\n\n");
}

/** One-line engagement summary so the LLM knows signal vs noise without inferring from every (L R). */
function engagementSummary(tweets: XTweet[], maxSample = 20): string {
  const slice = tweets.slice(0, maxSample);
  if (slice.length === 0) return "No posts.";
  const likes = slice.map((t) => t.metrics.likes);
  const zeroLike = likes.filter((l) => l === 0).length;
  const lowLike = likes.filter((l) => l > 0 && l < 10).length;
  const highLike = likes.filter((l) => l >= 50).length;
  if (highLike > 0) return `${highLike} post(s) with 50+ likes; ${zeroLike} with 0 likes.`;
  if (zeroLike === slice.length) return "All posts have 0 likes (no engagement).";
  if (zeroLike >= slice.length * 0.7) return `Most posts (${zeroLike}/${slice.length}) have 0 likes; low engagement.`;
  return `${lowLike} low-engagement, ${zeroLike} zero-like.`;
}

/** Ask the LLM for an ALOHA-style narrative from the tweet sample. Returns null if model unavailable. */
async function getLLMConclusion(
  runtime: IAgentRuntime,
  query: string,
  tweetSample: string,
  postCount: number,
  opts: {
    hasQualityList?: boolean;
    engagementSummary?: string;
    used24h?: boolean;
    usedListFeed?: boolean;
    qualityUsedFallback?: boolean;
    usingLowEngagementSample?: boolean;
    sentimentSummary?: string;
    /** One-line tweet volume context (e.g. "Tweet volume last 24h: ~12K posts"). */
    volumeSummary?: string;
  } = {},
): Promise<string | null> {
  if (!tweetSample.trim()) return null;
  const volumeNote = opts.volumeSummary ? `Tweet volume: ${opts.volumeSummary}\n\n` : "";
  const lowEngagementNote =
    opts.usingLowEngagementSample
      ? " This sample passed the quality bar but has low engagement (few likes/impressions). Say so in one short line and give an indicative read, not \"no signal.\"\n\n"
      : "";
  const qualityNote = opts.hasQualityList
    ? " Results are reordered so tweets from a curated quality list appear first; use that to weight signal vs general noise.\n\n"
    : "";
  const engagementNote =
    opts.engagementSummary && opts.engagementSummary !== "No posts."
      ? `Engagement in this sample: ${opts.engagementSummary}\n\n`
      : "";
  const sourceNote =
    opts.used24h || opts.usedListFeed
      ? `We already used ${[opts.used24h && "last 24h", opts.usedListFeed && "curated list feed"].filter(Boolean).join(" + ")} for better signal. Mention it briefly if relevant, then give the read.\n\n`
      : "";
  const fallbackBarNote =
    opts.qualityUsedFallback
      ? " We used a lower bar (10+ likes or 1K+ followers) because no tweets met 5K followers / 50+ likes. Mention that only if it affects how much to trust the sample; otherwise give the read.\n\n"
      : "";

  const prompt = `You are VINCE. Someone asked what people are saying on X about "${query}". Your job: give a short, actionable vibe read. Lead with the take (what to do or expect), then support.

CRITICAL — OUTPUT SHAPE:
- First: Vibe/sentiment lean (bullish/mixed/bearish from sample/keywords).
- First 1–2 sentences: the read. What's the vibe and what would you do? (e.g. "Dead zone—no edge from this feed. I'd sit or wait for a clearer catalyst.")
- For BTC/crypto: Link to action (e.g. "Bullish lean—consider long if funding positive").
- If the sample is mostly spam or zero engagement: say so in one short line, then still give your best read from context (price level, regime, "quiet before a move"). Do NOT write multiple paragraphs about how bad the data is.
- If we used last 24h or curated list: you can say "Pulled from last 24h / curated list—" then the read. Still lead with the take.
- If there is real signal: 2–4 more sentences on themes, standout takes (use L R when something got traction), and one clear takeaway.
- Voice: concrete, no filler ("leverage", "notably", "it's worth noting"). Take positions.

Query: ${query}. Sample: ${postCount} posts. (L R) = likes, retweets. [curated] = from quality list.
${volumeNote}${sourceNote}${fallbackBarNote}${lowEngagementNote}${qualityNote}${engagementNote}${opts.sentimentSummary ?? ""}${opts.sentimentSummary ? "\n\n" : ""}Posts:

${tweetSample}

RULES:
- Lead with the take. Support after. When data is thin, be brief and still useful (read + one next step).
- Don't over-explain that the sample is useless. One line max, then pivot to read and suggestion.
- No headers, no "In conclusion". Flow. 80–180 words; shorter when the feed is noise.

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

/** Generate an ALOHA-style briefing: one flowing narrative about what this account is thinking. Same voice as daily market briefing. */
async function getProfileBriefing(
  runtime: IAgentRuntime,
  username: string,
  displayName: string,
  tweets: XTweet[],
  maxTweets = 12,
  maxCharsPerTweet = 280,
): Promise<string | null> {
  if (tweets.length === 0) return null;
  const sample = tweets
    .slice(0, maxTweets)
    .map((t) => {
      const text = t.text.length <= maxCharsPerTweet ? t.text : t.text.slice(0, maxCharsPerTweet) + "…";
      return text;
    })
    .join("\n\n");
  const prompt = `You are VINCE. Someone asked what @${username} (${displayName}) is thinking—or what they've been posting lately. You're answering like you're texting a friend who wants the read on this account. Be real, be specific, have opinions.

Here are their latest posts:

${sample}

Write a briefing that:
1. Leads with the gut take—what's this account's vibe right now? What are they actually thinking?
2. Walk through the themes. Don't list tweets mechanically. Connect the dots. If they're bullish on one thing and skeptical on another, say that and why it matters.
3. Call out one or two standout takes or threads if they land. Use specifics from the posts.
4. End with your read—why this account is worth watching (or not) right now.

STYLE RULES (same as ALOHA):
- Write like you're explaining to a smart friend over coffee, not presenting to a board.
- Vary your sentence length. Mix short punchy takes with longer explanations when you need to unpack something.
- Don't bullet point anything. Flow naturally between thoughts.
- Skip the formal structure. No headers, no "In conclusion", no "Overall".
- Have a personality. If the account is boring this week, say it. If something seems off or notable, say it.
- Don't be sycophantic or hedge everything. Take positions.
- Around 200–300 words. Don't pad it.

AVOID:
- "Interestingly", "notably", "it's worth noting"
- Generic observations that could apply to any account
- Starting every sentence with their name or "They..."
- Repeating the same sentence structure over and over

Write the briefing:`;
  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const briefing = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";
    return briefing?.trim() || null;
  } catch (e) {
    logger.debug({ err: String(e) }, "[VINCE_X_RESEARCH] profile briefing skipped");
    return null;
  }
}

/** ALOHA-style short narrative for Spaces results. Returns null on error. */
async function getSpacesBriefing(
  runtime: IAgentRuntime,
  query: string,
  spaces: SpaceSummary[],
): Promise<string | null> {
  const lines = spaces.slice(0, 10).map((s) => {
    const when = s.scheduled_start ?? s.started_at ?? "";
    const title = s.title?.trim() || "Untitled";
    return `${title} — ${s.state ?? "?"}${when ? ` (${when.slice(0, 16)})` : ""}`;
  });
  const data = lines.join("\n");
  const prompt = `You are VINCE. Someone asked about Spaces for "${query}". Here are the Spaces:

${data}

Write 2–4 sentences: what's on offer, what's live vs scheduled, and whether it's worth tuning in. Coffee-chat voice, no bullets, no filler. Same style as ALOHA—flow naturally, take a position.`;
  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const text = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";
    return text.trim() || null;
  } catch (e) {
    logger.debug({ err: String(e) }, "[VINCE_X_RESEARCH] getSpacesBriefing skipped");
    return null;
  }
}

/** ALOHA-style short narrative for list discovery. Returns null on error. */
async function getListDiscoveryBriefing(
  runtime: IAgentRuntime,
  username: string,
  lists: ListSummary[],
  intent: "lists_owned" | "lists_memberships",
): Promise<string | null> {
  const verb = intent === "lists_owned" ? "owns" : "is in";
  const lines = lists.slice(0, 15).map((l) => `${l.name ?? l.id} — ${l.member_count ?? 0} members`);
  const data = lines.join("\n");
  const prompt = `You are VINCE. Someone asked what lists @${username} ${verb}. Here are the lists:

${data}

Write 2–4 sentences: what these lists suggest about their interests or curation, and why it might matter for research. Coffee-chat voice, no bullets. Same style as ALOHA—flow naturally, take a position.`;
  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const text = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";
    return text.trim() || null;
  } catch (e) {
    logger.debug({ err: String(e) }, "[VINCE_X_RESEARCH] getListDiscoveryBriefing skipped");
    return null;
  }
}

/** ALOHA-style briefing for mentions timeline. Returns null on error. */
async function getMentionsBriefing(
  runtime: IAgentRuntime,
  username: string,
  mentions: XTweet[],
): Promise<string | null> {
  if (mentions.length === 0) return null;
  const maxTweets = 8;
  const maxChars = 180;
  const sample = mentions
    .slice(0, maxTweets)
    .map((t) => {
      const text = t.text.length <= maxChars ? t.text : t.text.slice(0, maxChars) + "…";
      return `@${t.username}: ${text}`;
    })
    .join("\n\n");
  const prompt = `You are VINCE. Someone asked what people are saying to @${username}. Here are recent mentions:

${sample}

Write a briefing: themes, tone (supportive, critical, questions), and one or two standout replies. Same voice as profile briefing—coffee-chat, no bullets, 150–250 words.

STYLE RULES (same as ALOHA):
- Write like you're explaining to a smart friend over coffee.
- Don't bullet point anything. Flow naturally.
- No "Interestingly", "notably", "it's worth noting". Take positions.

Write the briefing:`;
  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const text = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";
    return text.trim() || null;
  } catch (e) {
    logger.debug({ err: String(e) }, "[VINCE_X_RESEARCH] getMentionsBriefing skipped");
    return null;
  }
}

/** Profile view: longer tweet snippets (260 chars) so posts are readable, not cut off. */
function formatProfileBriefing(user: any, tweets: XTweet[], limit = 8): string {
  const name = user?.name ?? user?.username ?? "?";
  const handle = user?.username ? `@${user.username}` : "";
  const header = `**${name}** ${handle}`.trim();
  if (tweets.length === 0) return `${header}\n\n_No recent tweets (excl. replies)._`;
  return `${header}\n\n${formatTweetsForBriefing(tweets, limit, 260)}`;
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
    "Search X, get a user's recent tweets, fetch a thread, a single tweet, or X Spaces. Use when the user asks what people are saying on X, search X for something, 'what did @user post?', 'get thread for tweet X', 'get tweet 123', or 'Spaces about BTC'. Read-only; never posts.",

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
        const displayName = user?.name ?? user?.username ?? username;
        const briefing = await getProfileBriefing(runtime, username, displayName, tweets, 12, 280);
        const name = user?.name ?? user?.username ?? "?";
        const handle = user?.username ? `@${user.username}` : "";
        const header = `**${name}** ${handle}`.trim();
        if (tweets.length === 0) {
          await callback({
            text: `${header}\n\n_No recent tweets (excl. replies)._\n\n_Source: X API (read-only)._`,
            actions: ["VINCE_X_RESEARCH"],
          });
          return { success: true };
        }
        const recentPostsBlock = formatTweetsForBriefing(tweets, 5, 260);
        const replyBody = briefing
          ? `${header}\n\n${briefing}\n\n---\n\n**Recent posts**\n\n${recentPostsBlock}`
          : `${header}\n\n${recentPostsBlock}`;
        await callback({
          text: `${replyBody}\n\n_Source: X API (read-only)._`,
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
        let reply = formatSingleTweet(tweet);
        try {
          const quoted = await svc.getQuotedPosts(tweetId, { maxResults: 10 });
          if (quoted.length > 0) {
            const n = quoted.length;
            const sample = quoted.slice(0, 3);
            const lines = sample.map((q) => {
              const snippet = q.text.length > 120 ? q.text.slice(0, 120) + "…" : q.text;
              return `• **@${q.username}**: ${snippet}`;
            });
            reply += `\n\n---\n\n**Quoted by ${n}**\n${lines.join("\n")}`;
          }
        } catch {
          // ignore
        }
        await callback({
          text: reply,
          actions: ["VINCE_X_RESEARCH"],
        });
        return { success: true };
      }

      if (intent === "spaces") {
        const spacesQuery = extractSpacesQuery(text);
        await callback({
          text: `Searching Spaces for: **${spacesQuery}**…`,
          actions: ["VINCE_X_RESEARCH"],
        });
        const spaces = await svc.searchSpaces(spacesQuery, { state: "all" });
        if (spaces.length === 0) {
          await callback({
            text: `**X Spaces: ${spacesQuery}**\n\nNo Spaces found for that query. (Spaces API may require a specific X API tier.)`,
            actions: ["VINCE_X_RESEARCH"],
          });
          return { success: true };
        }
        const lines = spaces.slice(0, 5).map((s) => {
          const when = s.scheduled_start ?? s.started_at ?? "";
          const title = s.title?.trim() || "Untitled";
          return `• **${title}** — ${s.state ?? "?"}${when ? ` (${when.slice(0, 16)})` : ""}`;
        });
        const spacesNarrative = await getSpacesBriefing(runtime, spacesQuery, spaces);
        const reply =
          spacesNarrative?.trim()
            ? `**Spaces: ${spacesQuery}**\n\n${spacesNarrative}\n\n---\n\n**Spaces**\n${lines.join("\n")}\n\n_X API Spaces (read-only)._`
            : `**Upcoming / recent Spaces: ${spacesQuery}**\n\n${lines.join("\n")}\n\n_X API Spaces (read-only)._`;
        await callback({ text: reply, actions: ["VINCE_X_RESEARCH"] });
        return { success: true };
      }

      if (intent === "lists_owned" || intent === "lists_memberships") {
        const username = extractUsernameForListsOrMentions(text, intent);
        if (!username) {
          await sendError("Specify a username, e.g. “what lists does @user have” or “what lists is @user in”.");
          return { success: false };
        }
        await callback({
          text: `Looking up lists for **@${username}**…`,
          actions: ["VINCE_X_RESEARCH"],
        });
        const userId = await svc.getUserIdByUsername(username);
        if (!userId) {
          await callback({
            text: `User **@${username}** not found or not accessible.`,
            actions: ["VINCE_X_RESEARCH"],
          });
          return { success: true };
        }
        const lists =
          intent === "lists_owned"
            ? await svc.getOwnedLists(userId)
            : await svc.getListMemberships(userId);
        const label = intent === "lists_owned" ? `Lists **@${username}** owns` : `Lists **@${username}** is in`;
        if (lists.length === 0) {
          await callback({
            text: `${label}\n\nNo lists found. (Some list endpoints may require a specific X API tier.)`,
            actions: ["VINCE_X_RESEARCH"],
          });
          return { success: true };
        }
        const lines = lists.slice(0, 15).map((l) => `• **${l.name ?? l.id}** — ${l.member_count ?? 0} members`);
        const listNarrative = await getListDiscoveryBriefing(runtime, username, lists, intent);
        const reply =
          listNarrative?.trim()
            ? `**${label}**\n\n${listNarrative}\n\n---\n\n**Lists**\n${lines.join("\n")}\n\n_X API list discovery (read-only)._`
            : `${label}\n\n${lines.join("\n")}\n\n_X API list discovery (read-only)._`;
        await callback({ text: reply, actions: ["VINCE_X_RESEARCH"] });
        return { success: true };
      }

      if (intent === "mentions") {
        const username = extractUsernameForListsOrMentions(text, "mentions");
        if (!username) {
          await sendError("Specify a username, e.g. “what are people saying to @user”.");
          return { success: false };
        }
        await callback({
          text: `Fetching mentions for **@${username}**…`,
          actions: ["VINCE_X_RESEARCH"],
        });
        const userId = await svc.getUserIdByUsername(username);
        if (!userId) {
          await callback({
            text: `User **@${username}** not found or not accessible.`,
            actions: ["VINCE_X_RESEARCH"],
          });
          return { success: true };
        }
        const mentions = await svc.getMentions(userId, { maxResults: 15 });
        if (mentions.length === 0) {
          await callback({
            text: `**Mentions for @${username}**\n\nNo recent mentions found. (Mentions timeline may require OAuth or a specific X API tier.)`,
            actions: ["VINCE_X_RESEARCH"],
          });
          return { success: true };
        }
        const mentionsNarrative = await getMentionsBriefing(runtime, username, mentions);
        const sampleMentions = formatTweetsForBriefing(mentions, 5, 160);
        const reply =
          mentionsNarrative?.trim()
            ? `**What people are saying to @${username}**\n\n${mentionsNarrative}\n\n---\n\n**Sample mentions**\n${sampleMentions}\n\n_X API mentions (read-only)._`
            : `**What people are saying to @${username}**\n\n${sampleMentions}\n\n_X API mentions (read-only)._`;
        await callback({ text: reply, actions: ["VINCE_X_RESEARCH"] });
        return { success: true };
      }

      // search (default)
      let rawQuery = extractQuery(text);
      if (rawQuery.length < 3) {
        logger.warn("[VINCE_X_RESEARCH] query too short, using 'crypto'");
        rawQuery = "crypto";
      }
      const isTickerVibe = KNOWN_TICKERS.has(rawQuery.trim().toUpperCase());
      let query = appendNoiseExclusions(expandQueryForSearch(rawQuery), rawQuery);
      // x-research-skill: quick mode adds -is:reply to cut reply noise; for ticker vibe prefer original posts
      if (isTickerVibe && !query.toLowerCase().includes("-is:reply")) {
        query = `${query.trim()} -is:reply`;
      }
      const opts = parseSearchOptions(text);
      const pages = opts.pages ?? (isTickerVibe ? TICKER_VIBE_PAGES : 1);
      const useBackgroundToken = svc.getSentimentTokenCount() > 0;
      const tokenIndex = useBackgroundToken ? svc.getTokenIndexForQuery(query) : undefined;
      const bgOpts = useBackgroundToken && tokenIndex !== undefined ? { useBackgroundToken: true, tokenIndex } : {};
      await callback({
        text: `Searching X for: **${rawQuery}**…`,
        actions: ["VINCE_X_RESEARCH"],
      });
      // Ticker vibe: use sentiment-optimized path (lang, -is:reply, background token). Option B: relevancy + recency over 7d then merge.
      let tweets: XTweet[];
      if (isTickerVibe && !opts.since) {
        const recencyPages = 4;
        const [relevancyTweets, recencyTweets] = await Promise.all([
          svc.searchForSentiment(query, {
            minEngagement: 50,
            minFollowers: 1000,
            pages: TICKER_VIBE_PAGES,
            since: "7d",
            sortOrder: "relevancy",
            cacheTtlMs: TICKER_CACHE_TTL_MS,
          }),
          svc.searchForSentiment(query, {
            minEngagement: 50,
            minFollowers: 1000,
            pages: recencyPages,
            since: "7d",
            sortOrder: "recency",
            cacheTtlMs: TICKER_CACHE_TTL_MS,
          }),
        ]);
        const byId = new Map(relevancyTweets.map((t) => [t.id, t]));
        for (const t of recencyTweets) if (!byId.has(t.id)) byId.set(t.id, t);
        tweets = Array.from(byId.values());
      } else {
        tweets = await svc.search(query, {
          maxResults: 100,
          pages,
          sortOrder: opts.since ? "recency" : "relevancy",
          since: opts.since ?? "7d",
          ...(isTickerVibe && { cacheTtlMs: TICKER_CACHE_TTL_MS }),
          ...bgOpts,
        });
      }
      let sorted = svc.sortBy(tweets, "likes");
      const qualityHandles = await svc.getQualityAccountHandles();
      let ordered = qualityHandles.length > 0 ? svc.reorderTweetsWithVipFirst(sorted, qualityHandles) : sorted;
      let engSummary = engagementSummary(ordered);
      let used24h = false;
      let usedListFeed = false;

      // Low-signal fallbacks: recency, then 24h, then curated list feed (do it, don't just suggest).
      if (engSummary === "All posts have 0 likes (no engagement)." && !opts.since) {
        const recencyTweets = await svc.search(query, {
          maxResults: 100,
          pages: isTickerVibe ? 4 : (opts.pages ?? 1),
          sortOrder: "recency",
          since: "7d",
          ...(isTickerVibe && { cacheTtlMs: TICKER_CACHE_TTL_MS }),
          ...bgOpts,
        });
        const byId = new Map(ordered.map((t) => [t.id, t]));
        for (const t of recencyTweets) if (!byId.has(t.id)) byId.set(t.id, t);
        sorted = svc.sortBy(Array.from(byId.values()), "likes");
        ordered = qualityHandles.length > 0 ? svc.reorderTweetsWithVipFirst(sorted, qualityHandles) : sorted;
        engSummary = engagementSummary(ordered);
      }
      if (
        (engSummary === "All posts have 0 likes (no engagement)." ||
          (engSummary.includes("Most posts") && engSummary.includes("0 likes"))) &&
        !opts.since
      ) {
        const tweets24h = await svc.search(query, {
          maxResults: 100,
          pages: isTickerVibe ? 4 : 1,
          sortOrder: "recency",
          since: "24h",
          ...(isTickerVibe && { cacheTtlMs: TICKER_CACHE_TTL_MS }),
          ...bgOpts,
        });
        if (tweets24h.length > 0) {
          used24h = true;
          const byId = new Map(ordered.map((t) => [t.id, t]));
          for (const t of tweets24h) if (!byId.has(t.id)) byId.set(t.id, t);
          sorted = svc.sortBy(Array.from(byId.values()), "likes");
          ordered = qualityHandles.length > 0 ? svc.reorderTweetsWithVipFirst(sorted, qualityHandles) : sorted;
          engSummary = engagementSummary(ordered);
        }
      }
      const listId = "getResearchQualityListId" in svc ? (svc as { getResearchQualityListId(): string | null }).getResearchQualityListId() : null;
      if (listId && (used24h || engSummary.includes("0 likes") || engSummary.includes("No posts"))) {
        try {
          const { tweets: listTweets } = await svc.getListPosts(listId, { maxResults: 50 });
          const keywords = topicKeywordsForFilter(rawQuery);
          const onTopic = listTweets.filter((t) => tweetMatchesTopic(t, keywords));
          const toPrepend = onTopic.length > 0 ? onTopic : listTweets.slice(0, 15);
          if (toPrepend.length > 0) {
            usedListFeed = true;
            const listIds = new Set(toPrepend.map((t) => t.id));
            const rest = ordered.filter((t) => !listIds.has(t.id));
            ordered = [...toPrepend, ...rest];
            engSummary = engagementSummary(ordered);
          }
        } catch (e) {
          logger.debug({ err: String(e) }, "[VINCE_X_RESEARCH] list feed skipped");
        }
      }

      // Quality bar: 5K+ followers or >50 likes (X API has no min_likes—filter post-hoc). Fallback 1K+/10+ so we still deliver a vibe check.
      const poolBeforeQuality = ordered.length;
      let { filtered: qualityFiltered, usedFallback: qualityUsedFallback } = filterQualityTweets(ordered, false);
      if (qualityFiltered.length === 0 && ordered.length > 0) {
        const fallback = filterQualityTweets(ordered, true);
        if (fallback.filtered.length > 0) {
          qualityFiltered = fallback.filtered;
          qualityUsedFallback = true;
        }
      }
      ordered = qualityFiltered;
      const qualityFilterNoMatch = qualityFiltered.length === 0;
      if (used24h || usedListFeed || qualityUsedFallback) {
        logger.info({ used24h, usedListFeed, qualityUsedFallback }, "[VINCE_X_RESEARCH] fallbacks applied");
      }

      // Explicit dedupe after merges (x-research-skill: api.dedupe). First occurrence per id wins.
      ordered = svc.dedupeById(ordered);

      // Never show or send to LLM zero-engagement tweets (L0 R0 = noise). Keep tweets with min likes or impressions (user can say "min likes 100").
      const minLikesDisplay = opts.minLikes ?? MIN_LIKES_FOR_DISPLAY;
      const withEngagement = ordered.filter(
        (t) =>
          t.metrics.likes >= minLikesDisplay ||
          (t.metrics.impressions ?? 0) >= MIN_IMPRESSIONS_FOR_DISPLAY,
      );
      const noUsableSignal = ordered.length === 0;
      const usingLowEngagementSample = withEngagement.length === 0 && ordered.length > 0;

      if (noUsableSignal) {
        logger.info(
          { rawQuery, poolBeforeQuality, afterQuality: qualityFiltered.length, withEngagement: withEngagement.length, used24h, usedListFeed },
          "[VINCE_X_RESEARCH] no usable signal: pool sizes (diagnostic)",
        );
        const sourceParts: string[] = ["X API (read-only)"];
        if (used24h) sourceParts.push("last 24h used for better signal");
        if (usedListFeed) sourceParts.push("curated list feed included");
        sourceParts.push("no tweets met quality bar or had 5+ likes / 100+ impressions");
        try {
          const usage = await svc.getUsage();
          if (usage?.summary && usage.used != null && usage.cap != null && usage.cap > 0 && usage.used / usage.cap >= 0.75) {
            sourceParts.push(usage.summary);
          }
        } catch {
          // ignore
        }
        const sourceLine = sourceParts.join("; ") + ".";
        const tickerHint = KNOWN_TICKERS.has(rawQuery.trim().toUpperCase())
          ? " Use on-chain data, funding rates, or wait for a clear catalyst."
          : "";
        const reply = `**X research: ${rawQuery}**\n\nNo usable signal from X right now—recent posts didn’t meet the quality bar or had no engagement.${tickerHint}\n\n_${sourceLine}_`;
        await callback({ text: reply, actions: ["VINCE_X_RESEARCH"] });
        return { success: true };
      }

      ordered = withEngagement.length > 0 ? withEngagement : ordered;
      ordered = ordered.slice(0, 50);
      const curatedSet = qualityHandles.length > 0 ? new Set(qualityHandles.map((h) => h.toLowerCase())) : undefined;
      const formatted = formatTweetsForBriefing(ordered, opts.limit);
      const sampleForLLM = tweetSampleForLLM(ordered, 20, 200, curatedSet);
      const sentimentResult = isTickerVibe ? quickSentimentFromTweets(ordered) : null;
      let volumeSummary: string | undefined;
      try {
        if (isTickerVibe || KNOWN_TICKERS.has(rawQuery.trim().toUpperCase())) {
          const counts = await svc.getPostCountsRecent(rawQuery, { granularity: "day" });
          const total = counts.reduce((s, b) => s + (b.tweet_count ?? 0), 0);
          if (total > 0) volumeSummary = total >= 1000 ? `last 24h: ~${(total / 1000).toFixed(1)}K posts` : `last 24h: ${total} posts`;
        }
      } catch {
        // ignore
      }
      const conclusion = await getLLMConclusion(runtime, rawQuery, sampleForLLM, ordered.length, {
        hasQualityList: qualityHandles.length > 0,
        engagementSummary: engSummary,
        used24h,
        usedListFeed,
        qualityUsedFallback: qualityUsedFallback,
        usingLowEngagementSample: usingLowEngagementSample,
        sentimentSummary: sentimentResult?.summary,
        volumeSummary,
      });
      const samplePosts = formatTweetsForBriefing(ordered, 5);
      const sourceParts: string[] = ["X API (read-only)"];
      if (used24h) sourceParts.push("last 24h used for better signal");
      if (usedListFeed) sourceParts.push("curated list feed included");
      if (qualityFilterNoMatch) sourceParts.push("no tweets met 5K+ followers or 50+ likes");
      else if (qualityUsedFallback) sourceParts.push("10+ likes or 1K+ followers (no tweets met 5K/50+)");
      else sourceParts.push("5K+ followers or 50+ likes");
      if (usingLowEngagementSample) sourceParts.push("low engagement sample (quality bar met; treat as indicative)");
      else sourceParts.push("5+ likes or 100+ impressions for sample");
      try {
        const usage = await svc.getUsage();
        if (usage?.summary && usage.used != null && usage.cap != null && usage.cap > 0 && usage.used / usage.cap >= 0.75) {
          sourceParts.push(usage.summary);
        }
      } catch {
        // ignore
      }
      const sourceLine = sourceParts.join("; ") + ".";
      const lowSignalTip =
        !used24h && !usedListFeed && (engSummary.includes("0 likes") || engSummary.includes("No posts"))
          ? " Tip: ask for \"last 24h\" or set X_RESEARCH_QUALITY_LIST_ID for a curated feed."
          : "";
      const sentimentLine = sentimentResult?.summary ? `\n\n${sentimentResult.summary}` : "";
      const reply = conclusion
        ? `**X research: ${rawQuery}**\n\n${conclusion}${sentimentLine}\n\n---\n\n**Sample posts:**\n${samplePosts}\n\n_${sourceLine}${lowSignalTip}_`
        : `**X research: ${rawQuery}**\n\n${formatted}${sentimentLine}\n\n_${sourceLine}${lowSignalTip}_`;
      await callback({
        text: reply,
        actions: ["VINCE_X_RESEARCH"],
      });
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const hint = /rate limit|429/i.test(msg)
        ? " Add X_BEARER_TOKEN_SENTIMENT in .env for vibe check so in-chat keeps working; see docs/X-API.md. If you can't add another app, set X_SENTIMENT_ENABLED=false or X_SENTIMENT_ASSETS=BTC so in-chat has headroom (X-RESEARCH.md)."
        : "";
      const toolsHint = " You can also try the X keyword search from the CLI: see skills/x-research/README.md.";
      await sendError(`X research failed: ${msg}${hint}${toolsHint}`);
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
