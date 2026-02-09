/**
 * VINCE X (Twitter) Research Service
 *
 * Read-only X API v2 wrapper for search, profile, and thread.
 * Based on x-research-skill (https://github.com/rohunvora/x-research-skill).
 * Requires X_BEARER_TOKEN (X API Basic tier or higher). Rate limit: ~450 req/15min.
 */

import { Service, logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import { loadEnvOnce } from "../utils/loadEnvOnce";

const BASE = "https://api.x.com/2";
const RATE_DELAY_MS = 350;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes, match x-research-skill

const CACHE_PREFIX = "vince_x_research:";

/** Shared with VinceXSentimentService so in-chat research respects vibe-check cooldown and vice versa. */
export const X_RATE_LIMITED_UNTIL_CACHE_KEY = "vince_x:rate_limited_until_ms";

export interface XTweet {
  id: string;
  text: string;
  author_id: string;
  username: string;
  name: string;
  created_at: string;
  conversation_id: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    impressions: number;
    bookmarks: number;
  };
  urls: string[];
  mentions: string[];
  hashtags: string[];
  tweet_url: string;
}

interface RawResponse {
  data?: any[];
  includes?: { users?: any[] };
  meta?: { next_token?: string; result_count?: number };
  errors?: any[];
}

function parseTweets(raw: RawResponse): XTweet[] {
  if (!raw.data) return [];
  const users: Record<string, { username?: string; name?: string }> = {};
  for (const u of raw.includes?.users || []) {
    users[u.id] = u;
  }
  return raw.data.map((t: any) => {
    const u = users[t.author_id] || {};
    const m = t.public_metrics || {};
    return {
      id: t.id,
      text: t.text,
      author_id: t.author_id,
      username: u.username || "?",
      name: u.name || "?",
      created_at: t.created_at,
      conversation_id: t.conversation_id,
      metrics: {
        likes: m.like_count || 0,
        retweets: m.retweet_count || 0,
        replies: m.reply_count || 0,
        quotes: m.quote_count || 0,
        impressions: m.impression_count || 0,
        bookmarks: m.bookmark_count || 0,
      },
      urls: (t.entities?.urls || []).map((u: any) => u.expanded_url).filter(Boolean),
      mentions: (t.entities?.mentions || []).map((m: any) => m.username).filter(Boolean),
      hashtags: (t.entities?.hashtags || []).map((h: any) => h.tag).filter(Boolean),
      tweet_url: `https://x.com/${u.username || "?"}/status/${t.id}`,
    };
  });
}

const FIELDS =
  "tweet.fields=created_at,public_metrics,author_id,conversation_id,entities&expansions=author_id&user.fields=username,name,public_metrics";

function parseSince(since: string): string | null {
  const match = since.match(/^(\d+)(m|h|d)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    const unit = match[2];
    const ms =
      unit === "m"
        ? num * 60_000
        : unit === "h"
          ? num * 3_600_000
          : num * 86_400_000;
    return new Date(Date.now() - ms).toISOString();
  }
  if (since.includes("T") || since.includes("-")) {
    try {
      return new Date(since).toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class VinceXResearchService extends Service {
  static serviceType = "VINCE_X_RESEARCH_SERVICE";
  capabilityDescription = "X (Twitter) API v2 for search, profile, and thread";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  /** Token from env or character secrets (X_BEARER_TOKEN). Lazy-loads .env once if missing. */
  private getToken(): string | null {
    loadEnvOnce();
    const fromEnv = process.env.X_BEARER_TOKEN?.trim();
    const fromRuntime = this.runtime.getSetting?.("X_BEARER_TOKEN");
    const s = typeof fromRuntime === "string" ? fromRuntime.trim() : "";
    if (fromEnv) return fromEnv;
    return s || null;
  }

  static async start(runtime: IAgentRuntime): Promise<VinceXResearchService> {
    const service = new VinceXResearchService(runtime);
    const token = service.getToken();
    if (!token) {
      logger.info(
        "[VinceXResearchService] X_BEARER_TOKEN not set — X research disabled. Set in .env or agent secrets.",
      );
    } else {
      logger.info("[VinceXResearchService] Started (X API read-only)");
    }
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceXResearchService] Stopped");
  }

  isConfigured(): boolean {
    return !!this.getToken();
  }

  /**
   * Check shared rate-limit cooldown (set by vibe check or a previous 429).
   * Throws if still in cooldown so we don't burn the same token.
   */
  private async ensureNotRateLimited(): Promise<void> {
    const until = await this.runtime.getCache<number>(X_RATE_LIMITED_UNTIL_CACHE_KEY);
    if (!until) return;
    const now = Date.now();
    if (now < until) {
      const waitSec = Math.ceil((until - now) / 1000);
      throw new Error(`X API rate limited. Resets in ${waitSec}s`);
    }
  }

  private async apiGet(url: string): Promise<RawResponse> {
    const token = this.getToken();
    if (!token) throw new Error("X_BEARER_TOKEN not set");
    await this.ensureNotRateLimited();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 429) {
      const reset = res.headers.get("x-rate-limit-reset");
      const waitSec = reset
        ? Math.max(parseInt(reset, 10) - Math.floor(Date.now() / 1000), 1)
        : 60;
      const untilMs = Date.now() + waitSec * 1000;
      await this.runtime.setCache(X_RATE_LIMITED_UNTIL_CACHE_KEY, untilMs);
      throw new Error(`X API rate limited. Resets in ${waitSec}s`);
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`X API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  private cacheKey(prefix: string, parts: string): string {
    return `${CACHE_PREFIX}${prefix}:${parts}`;
  }

  /**
   * Search recent tweets (last 7 days). Auto-adds -is:retweet if not in query.
   * Results are cached 15 minutes (match x-research-skill).
   */
  async search(
    query: string,
    opts: {
      maxResults?: number;
      pages?: number;
      sortOrder?: "relevancy" | "recency";
      since?: string;
    } = {},
  ): Promise<XTweet[]> {
    const parts = `${query}|${opts.sortOrder ?? "relevancy"}|${opts.since ?? ""}|${opts.pages ?? 1}`;
    const key = this.cacheKey("search", parts);
    const cached = await this.runtime.getCache<{ tweets: XTweet[]; ts: number }>(key);
    if (cached?.tweets && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.tweets;
    }

    let q = query.trim();
    if (!q.toLowerCase().includes("-is:retweet")) {
      q = `${q} -is:retweet`;
    }
    const maxResults = Math.max(Math.min(opts.maxResults || 100, 100), 10);
    const pages = opts.pages || 1;
    const sort = opts.sortOrder || "relevancy";
    const encoded = encodeURIComponent(q);
    let timeFilter = "";
    if (opts.since) {
      const startTime = parseSince(opts.since);
      if (startTime) timeFilter = `&start_time=${startTime}`;
    }
    const all: XTweet[] = [];
    let nextToken: string | undefined;
    for (let page = 0; page < pages; page++) {
      const pagination = nextToken ? `&pagination_token=${nextToken}` : "";
      const url = `${BASE}/tweets/search/recent?query=${encoded}&max_results=${maxResults}&${FIELDS}&sort_order=${sort}${timeFilter}${pagination}`;
      const raw = await this.apiGet(url);
      const tweets = parseTweets(raw);
      all.push(...tweets);
      nextToken = raw.meta?.next_token;
      if (!nextToken) break;
      if (page < pages - 1) await sleep(RATE_DELAY_MS);
    }
    await this.runtime.setCache(key, { tweets: all, ts: Date.now() });
    return all;
  }

  /**
   * Get recent tweets from a user (excludes replies by default).
   */
  async profile(
    username: string,
    opts: { count?: number; includeReplies?: boolean } = {},
  ): Promise<{ user: any; tweets: XTweet[] }> {
    const userUrl = `${BASE}/users/by/username/${username}?user.fields=public_metrics,description,created_at`;
    const userData = await this.apiGet(userUrl);
    if (!(userData as any).data) {
      throw new Error(`User @${username} not found`);
    }
    const user = (userData as any).data;
    await sleep(RATE_DELAY_MS);
    const replyFilter = opts.includeReplies ? "" : " -is:reply";
    const query = `from:${username} -is:retweet${replyFilter}`;
    const tweets = await this.search(query, {
      maxResults: Math.min(opts.count || 20, 100),
      sortOrder: "recency",
    });
    return { user, tweets };
  }

  /**
   * Fetch a full conversation thread by root tweet ID (or conversation_id).
   * Matches skill lib/api.ts: conversation_id search + root tweet fetch.
   */
  async thread(
    tweetIdOrConversationId: string,
    opts: { pages?: number } = {},
  ): Promise<XTweet[]> {
    const id = tweetIdOrConversationId.trim();
    const query = `conversation_id:${id}`;
    const tweets = await this.search(query, {
      sortOrder: "recency",
      pages: opts.pages ?? 2,
    });
    const seen = new Set<string>(tweets.map((t) => t.id));
    try {
      const root = await this.getTweet(id);
      if (root && !seen.has(root.id)) {
        seen.add(root.id);
        tweets.unshift(root);
      }
    } catch {
      // Root tweet might be deleted
    }
    return tweets;
  }

  /**
   * Fetch a single tweet by ID.
   */
  async getTweet(tweetId: string): Promise<XTweet | null> {
    const url = `${BASE}/tweets/${tweetId}?${FIELDS}`;
    const raw = await this.apiGet(url);
    if ((raw as any).data && !Array.isArray((raw as any).data)) {
      const parsed = parseTweets({
        ...raw,
        data: [(raw as any).data],
      });
      return parsed[0] || null;
    }
    return null;
  }

  /** Sort tweets by engagement. */
  sortBy(
    tweets: XTweet[],
    metric: "likes" | "impressions" | "retweets" | "replies" = "likes",
  ): XTweet[] {
    return [...tweets].sort((a, b) => b.metrics[metric] - a.metrics[metric]);
  }
}
