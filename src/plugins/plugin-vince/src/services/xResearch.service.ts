/**
 * VINCE X (Twitter) Research Service
 *
 * Read-only X API v2 wrapper for search, profile, and thread.
 * Uses the official X TypeScript XDK (@xdevplatform/xdk) when available; falls back to raw fetch.
 * Requires X_BEARER_TOKEN (X API Basic tier or higher). Rate limit: ~450 req/15min.
 *
 * Official X API v2 samples (XDK patterns): https://github.com/xdevplatform/samples/tree/main/javascript
 * - posts: search_recent, get_posts_by_ids
 * - lists: get_list_by_id, get_list_posts, get_list_members
 * - users: get_users_by_usernames; users/timeline: get_posts, get_posts_paginated
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
  includes?: { users?: any[]; tweets?: any[] };
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

/** Lazy-loaded XDK Client type (official @xdevplatform/xdk: posts.*, users.*, lists.*). */
type XDKClient = {
  posts?: {
    searchRecent?: (query: string, params?: Record<string, unknown>) => Promise<{ data?: any[]; includes?: RawResponse["includes"]; meta?: { next_token?: string } }>;
    getByIds?: (ids: string[], params?: Record<string, unknown>) => Promise<{ data?: any[]; includes?: RawResponse["includes"] }>;
  };
  users?: {
    getByUsernames?: (usernames: string[], params?: Record<string, unknown>) => Promise<{ data?: any[] }>;
    getPosts?: (userId: string, params?: Record<string, unknown>) => Promise<{ data?: any[]; includes?: RawResponse["includes"]; meta?: { next_token?: string } }>;
  };
  lists?: {
    getById?: (id: string, params?: Record<string, unknown>) => Promise<{ data?: any }>;
    getPosts?: (id: string, params?: Record<string, unknown>) => Promise<{ data?: any[]; includes?: RawResponse["includes"]; meta?: { next_token?: string } }>;
    getMembers?: (id: string, params?: Record<string, unknown>) => Promise<{ data?: any[] }>;
  };
};

async function createXDKClient(token: string): Promise<XDKClient | null> {
  try {
    const mod = await import("@xdevplatform/xdk");
    const Client = mod?.Client;
    if (typeof Client !== "function") return null;
    try {
      return new Client({ bearerToken: token }) as XDKClient;
    } catch {
      return new (Client as new (auth: string) => XDKClient)(token);
    }
  } catch {
    return null;
  }
}

export class VinceXResearchService extends Service {
  static serviceType = "VINCE_X_RESEARCH_SERVICE";
  capabilityDescription = "X (Twitter) API v2 for search, profile, and thread";

  private xdkClient: XDKClient | null = null;
  private xdkReady = false;

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

  private async getClient(): Promise<XDKClient | null> {
    if (this.xdkReady) return this.xdkClient;
    this.xdkReady = true;
    const token = this.getToken();
    if (!token) return null;
    this.xdkClient = await createXDKClient(token);
    return this.xdkClient;
  }

  static async start(runtime: IAgentRuntime): Promise<VinceXResearchService> {
    const service = new VinceXResearchService(runtime);
    const token = service.getToken();
    if (!token) {
      logger.info(
        "[VinceXResearchService] X_BEARER_TOKEN not set — X research disabled. Set in .env or agent secrets.",
      );
    } else {
      const client = await service.getClient();
      logger.info(
        client
          ? "[VinceXResearchService] Started (X API read-only, using XDK)"
          : "[VinceXResearchService] Started (X API read-only, using fetch)",
      );
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

  private handle429(err: unknown): never {
    const msg = err instanceof Error ? err.message : String(err);
    const resetMatch = msg.match(/reset[:\s]+(\d+)/i);
    const waitSec = resetMatch
      ? Math.max(parseInt(resetMatch[1], 10) - Math.floor(Date.now() / 1000), 1)
      : 60;
    const untilMs = Date.now() + waitSec * 1000;
    this.runtime.setCache(X_RATE_LIMITED_UNTIL_CACHE_KEY, untilMs).catch(() => {});
    throw new Error(`X API rate limited. Resets in ${waitSec}s`);
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

    const client = await this.getClient();
    const searchRecent = client?.posts?.searchRecent;

    if (searchRecent) {
      try {
        await this.ensureNotRateLimited();
        // XDK search_recent pattern: https://github.com/xdevplatform/samples/blob/main/javascript/posts/search_recent.js
        const all: XTweet[] = [];
        let nextToken: string | undefined;
        const baseParams: Record<string, unknown> = {
          maxResults,
          tweetFields: ["created_at", "public_metrics", "author_id", "conversation_id", "entities"],
          expansions: ["author_id"],
          userFields: ["username", "name", "public_metrics"],
          sortOrder: sort,
        };
        if (opts.since) {
          const startTime = parseSince(opts.since);
          if (startTime) baseParams.startTime = startTime;
        }
        for (let page = 0; page < pages; page++) {
          const params = { ...baseParams, ...(nextToken && { nextToken }) };
          const raw = await searchRecent.call(client.posts, q, params);
          const asRaw: RawResponse = {
            data: raw?.data,
            includes: raw?.includes,
            meta: raw?.meta,
          };
          const tweets = parseTweets(asRaw);
          all.push(...tweets);
          nextToken = raw?.meta?.next_token ?? (raw?.meta as any)?.nextToken;
          if (!nextToken) break;
          if (page < pages - 1) await sleep(RATE_DELAY_MS);
        }
        await this.runtime.setCache(key, { tweets: all, ts: Date.now() });
        return all;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) this.handle429(err);
        throw err;
      }
    }

    // Fallback: raw fetch
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
   * Results cached 15 min (same TTL as search).
   */
  async profile(
    username: string,
    opts: { count?: number; includeReplies?: boolean } = {},
  ): Promise<{ user: any; tweets: XTweet[]; pinnedTweet?: XTweet }> {
    const normalizedUsername = username.trim().replace(/^@/, "").toLowerCase() || username.trim();
    const count = Math.min(opts.count || 20, 100);
    const cacheKey = this.cacheKey("profile", `${normalizedUsername}|${opts.includeReplies ?? false}|${count}`);
    const cached = await this.runtime.getCache<{ user: any; tweets: XTweet[]; pinnedTweet?: XTweet; ts: number }>(cacheKey);
    if (cached?.user && cached.tweets && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { user: cached.user, tweets: cached.tweets, pinnedTweet: cached.pinnedTweet };
    }

    const client = await this.getClient();
    const getByUsernames = client?.users?.getByUsernames;

    if (getByUsernames) {
      try {
        await this.ensureNotRateLimited();
        // Align with samples: https://github.com/xdevplatform/samples/blob/main/javascript/users/get_users_by_usernames.js
        const userResponse = await getByUsernames.call(client!.users!, [username], {
          userFields: ["public_metrics", "description", "created_at"],
          expansions: ["pinned_tweet_id"],
        });
        const users = userResponse?.data;
        const user = Array.isArray(users) ? users[0] : userResponse?.data;
        if (!user) throw new Error(`User @${username} not found`);
        await sleep(RATE_DELAY_MS);

        const getPosts = client!.users?.getPosts;
        let tweets: XTweet[];
        if (getPosts) {
          // Use timeline API when available: https://github.com/xdevplatform/samples/tree/main/javascript/users/timeline
          // X API exclude: https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-tweets
          const res = await getPosts.call(client!.users!, user.id, {
            maxResults: count,
            tweetFields: ["created_at", "public_metrics", "author_id", "conversation_id", "entities"],
            expansions: ["author_id"],
            userFields: ["username", "name", "public_metrics"],
            ...(opts.includeReplies ? {} : { exclude: "replies" }),
          });
          const raw: RawResponse = { data: res?.data, includes: res?.includes };
          tweets = parseTweets(raw);
        } else {
          const replyFilter = opts.includeReplies ? "" : " -is:reply";
          const query = `from:${username} -is:retweet${replyFilter}`;
          tweets = await this.search(query, { maxResults: count, sortOrder: "recency" });
        }
        let pinnedTweet: XTweet | undefined;
        const pinnedId = user?.pinned_tweet_id;
        const includedTweets = (userResponse as any)?.includes?.tweets;
        if (pinnedId && Array.isArray(includedTweets)) {
          const pinnedRaw = includedTweets.find((t: any) => t.id === pinnedId);
          if (pinnedRaw) {
            const parsed = parseTweets({
              data: [pinnedRaw],
              includes: { users: [user] },
            });
            pinnedTweet = parsed[0];
          }
        }
        const result = { user, tweets, pinnedTweet };
        await this.runtime.setCache(cacheKey, { ...result, ts: Date.now() });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) this.handle429(err);
        throw err;
      }
    }

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
      maxResults: count,
      sortOrder: "recency",
    });
    const result = { user, tweets };
    await this.runtime.setCache(cacheKey, { ...result, ts: Date.now() });
    return result;
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
    const client = await this.getClient();
    const getByIds = client?.posts?.getByIds;

    if (getByIds) {
      try {
        await this.ensureNotRateLimited();
        const res = await getByIds.call(client.posts, [tweetId], {
          tweetFields: ["created_at", "public_metrics", "author_id", "conversation_id", "entities"],
          expansions: ["author_id"],
          userFields: ["username", "name", "public_metrics"],
        });
        const data = res?.data;
        const first = Array.isArray(data) ? data[0] : data;
        if (first) {
          const raw: RawResponse = {
            data: [first],
            includes: res?.includes,
          };
          const parsed = parseTweets(raw);
          return parsed[0] || null;
        }
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) this.handle429(err);
        throw err;
      }
    }

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

  /** Default list ID from env (X_LIST_ID). Optional; used by getListById/getListPosts/getListMembers. */
  getListId(): string | null {
    loadEnvOnce();
    const v = process.env.X_LIST_ID?.trim();
    return v || null;
  }

  /**
   * Get list metadata by ID. Uses XDK when available; requires X_LIST_ID or explicit id.
   */
  async getListById(listId?: string): Promise<{ id: string; name?: string; description?: string; member_count?: number; follower_count?: number } | null> {
    const id = listId?.trim() || this.getListId();
    if (!id) return null;
    const client = await this.getClient();
    const getById = client?.lists?.getById;
    if (getById) {
      try {
        await this.ensureNotRateLimited();
        const res = await getById.call(client.lists, id, {
          listFields: ["created_at", "follower_count", "member_count", "owner_id", "description", "name"],
        });
        const data = res?.data as any;
        if (data) return { id: data.id ?? id, name: data.name, description: data.description, member_count: data.member_count, follower_count: data.follower_count };
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) this.handle429(err);
        throw err;
      }
    }
    const url = `${BASE}/lists/${id}?list.fields=created_at,follower_count,member_count,owner_id,description,name`;
    const raw = await this.apiGet(url);
    const d = (raw as any).data;
    return d ? { id: d.id ?? id, name: d.name, description: d.description, member_count: d.member_count, follower_count: d.follower_count } : null;
  }

  /**
   * Get recent posts from a list. Returns XTweet[]; cached 15 min. Uses XDK when available.
   */
  async getListPosts(
    listId?: string,
    opts: { maxResults?: number; nextToken?: string } = {},
  ): Promise<{ tweets: XTweet[]; nextToken?: string }> {
    const id = listId?.trim() || this.getListId();
    if (!id) return { tweets: [] };
    const cacheKey = this.cacheKey("list_posts", `${id}|${opts.nextToken ?? ""}`);
    const cached = await this.runtime.getCache<{ tweets: XTweet[]; nextToken?: string; ts: number }>(cacheKey);
    if (cached?.tweets && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { tweets: cached.tweets, nextToken: cached.nextToken };
    }
    const client = await this.getClient();
    const getPosts = client?.lists?.getPosts;
    if (getPosts) {
      try {
        await this.ensureNotRateLimited();
        const res = await getPosts.call(client.lists, id, {
          tweetFields: ["created_at", "public_metrics", "author_id", "conversation_id", "entities"],
          expansions: ["author_id"],
          userFields: ["username", "name", "public_metrics"],
          maxResults: Math.min(opts.maxResults ?? 100, 100),
          ...(opts.nextToken && { paginationToken: opts.nextToken }),
        });
        const asRaw: RawResponse = { data: res?.data, includes: res?.includes, meta: res?.meta };
        const tweets = parseTweets(asRaw);
        const nextToken = res?.meta?.next_token ?? (res?.meta as any)?.nextToken;
        await this.runtime.setCache(cacheKey, { tweets, nextToken, ts: Date.now() });
        return { tweets, nextToken };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) this.handle429(err);
        throw err;
      }
    }
    const maxResults = Math.min(opts.maxResults ?? 100, 100);
    const pagination = opts.nextToken ? `&pagination_token=${encodeURIComponent(opts.nextToken)}` : "";
    const url = `${BASE}/lists/${id}/tweets?max_results=${maxResults}&${FIELDS}${pagination}`;
    const raw = await this.apiGet(url);
    const tweets = parseTweets(raw);
    const nextToken = raw.meta?.next_token;
    await this.runtime.setCache(cacheKey, { tweets, nextToken, ts: Date.now() });
    return { tweets, nextToken };
  }

  /**
   * Get list members (who's on the list). Optional; uses XDK when available.
   */
  async getListMembers(listId?: string, opts: { maxResults?: number; nextToken?: string } = {}): Promise<{ users: any[]; nextToken?: string }> {
    const id = listId?.trim() || this.getListId();
    if (!id) return { users: [] };
    const client = await this.getClient();
    const getMembers = client?.lists?.getMembers;
    if (getMembers) {
      try {
        await this.ensureNotRateLimited();
        const res = await getMembers.call(client.lists, id, {
          userFields: ["created_at", "description", "public_metrics", "username", "name"],
          maxResults: Math.min(opts.maxResults ?? 100, 100),
          ...(opts.nextToken && { paginationToken: opts.nextToken }),
        });
        const users = res?.data ?? [];
        const nextToken = res?.meta?.next_token ?? (res?.meta as any)?.nextToken;
        return { users: Array.isArray(users) ? users : [users], nextToken };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) this.handle429(err);
        throw err;
      }
    }
    const maxResults = Math.min(opts.maxResults ?? 100, 100);
    const pagination = opts.nextToken ? `&pagination_token=${encodeURIComponent(opts.nextToken)}` : "";
    const url = `${BASE}/lists/${id}/members?max_results=${maxResults}&user.fields=created_at,description,public_metrics,username,name${pagination}`;
    const raw = await this.apiGet(url);
    const data = (raw as any).data ?? [];
    return { users: Array.isArray(data) ? data : [data], nextToken: raw.meta?.next_token };
  }

  /** Sort tweets by engagement. */
  sortBy(
    tweets: XTweet[],
    metric: "likes" | "impressions" | "retweets" | "replies" = "likes",
  ): XTweet[] {
    return [...tweets].sort((a, b) => b.metrics[metric] - a.metrics[metric]);
  }
}
