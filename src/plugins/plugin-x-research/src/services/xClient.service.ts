/**
 * X Client Service
 * 
 * Core API client handling:
 * - Authentication (Bearer token)
 * - Rate limiting with exponential backoff
 * - Request queue
 * - Response caching (24h deduplication)
 * - Error handling
 */

import {
  X_API_BASE,
  ENDPOINTS,
  DEFAULT_TWEET_FIELDS,
  DEFAULT_USER_FIELDS,
  DEFAULT_EXPANSIONS,
} from '../constants/endpoints';
import {
  normalizeSearchResponse,
  normalizeCountsResponse,
  normalizeTweetResponse,
  normalizeTweetArrayResponse,
  normalizeUserResponse,
} from '../utils/normalize';
import type {
  XTweet,
  XUser,
  XSearchResponse,
  XCountsResponse,
} from '../types/tweet.types';
import type { XNewsResponse } from '../types/news.types';
import type { XTrendsResponse } from '../types/trends.types';

export interface XClientConfig {
  bearerToken: string;
  maxRequestsPerMinute?: number;
  cacheEnabled?: boolean;
  cacheTtlMs?: number;
}

export interface XClientError extends Error {
  status?: number;
  code?: string;
  rateLimitReset?: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface RateLimitState {
  remaining: number;
  reset: number;
  limit: number;
}

/**
 * X API v2 Client
 */
export class XClientService {
  private bearerToken: string;
  private maxRequestsPerMinute: number;
  private cacheEnabled: boolean;
  private cacheTtlMs: number;
  
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private rateLimits: Map<string, RateLimitState> = new Map();
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor(config: XClientConfig) {
    this.bearerToken = config.bearerToken;
    this.maxRequestsPerMinute = config.maxRequestsPerMinute ?? 60;
    this.cacheEnabled = config.cacheEnabled ?? true;
    this.cacheTtlMs = config.cacheTtlMs ?? 60 * 60 * 1000; // 1 hour default
  }

  /**
   * Search tweets. Uses full-archive when X_RESEARCH_FULL_ARCHIVE=true (Pro/Enterprise).
   */
  async searchRecent(query: string, options: SearchOptions = {}): Promise<XSearchResponse> {
    const params = new URLSearchParams({
      query,
      'tweet.fields': options.tweetFields ?? DEFAULT_TWEET_FIELDS,
      'user.fields': options.userFields ?? DEFAULT_USER_FIELDS,
      expansions: options.expansions ?? DEFAULT_EXPANSIONS,
      max_results: String(options.maxResults ?? 100),
    });

    if (options.sinceId) params.set('since_id', options.sinceId);
    if (options.untilId) params.set('until_id', options.untilId);
    if (options.startTime) params.set('start_time', options.startTime);
    if (options.endTime) params.set('end_time', options.endTime);
    if (options.nextToken) params.set('next_token', options.nextToken);
    if (options.sortOrder) params.set('sort_order', options.sortOrder);

    const useFullArchive = process.env.X_RESEARCH_FULL_ARCHIVE === 'true';
    const searchPath = useFullArchive ? ENDPOINTS.SEARCH_FULL_ARCHIVE : ENDPOINTS.SEARCH_RECENT;
    const cacheKey = useFullArchive && options.nextToken
      ? undefined
      : `search:${searchPath}:${query}:${options.maxResults}:${options.nextToken ?? ''}`;

    const raw = await this.get<Record<string, unknown>>(
      `${searchPath}?${params.toString()}`,
      { cacheKey, cacheTtlMs: options.cacheTtlMs }
    );
    return normalizeSearchResponse(raw);
  }

  /**
   * Get tweet counts by time bucket (volume analysis)
   */
  async getCounts(query: string, options: CountsOptions = {}): Promise<XCountsResponse> {
    const params = new URLSearchParams({
      query,
      granularity: options.granularity ?? 'hour',
    });

    if (options.startTime) params.set('start_time', options.startTime);
    if (options.endTime) params.set('end_time', options.endTime);

    const raw = await this.get<Record<string, unknown>>(
      `${ENDPOINTS.SEARCH_COUNTS}?${params.toString()}`,
      { cacheKey: `counts:${query}:${options.granularity}` }
    );
    return normalizeCountsResponse(raw);
  }

  /**
   * Get single tweet by ID
   */
  async getTweet(tweetId: string): Promise<XTweet | null> {
    const endpoint = ENDPOINTS.TWEET.replace(':id', tweetId);
    const params = new URLSearchParams({
      'tweet.fields': DEFAULT_TWEET_FIELDS,
      'user.fields': DEFAULT_USER_FIELDS,
      expansions: DEFAULT_EXPANSIONS,
    });

    const raw = await this.get<{ data?: Record<string, unknown> }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `tweet:${tweetId}` }
    );
    const response = normalizeTweetResponse(raw);
    return response.data ?? null;
  }

  /**
   * Get multiple tweets by ID
   */
  async getTweets(tweetIds: string[]): Promise<XTweet[]> {
    if (tweetIds.length === 0) return [];
    if (tweetIds.length > 100) {
      throw new Error('Max 100 tweets per request');
    }

    const params = new URLSearchParams({
      ids: tweetIds.join(','),
      'tweet.fields': DEFAULT_TWEET_FIELDS,
      'user.fields': DEFAULT_USER_FIELDS,
      expansions: DEFAULT_EXPANSIONS,
    });

    const raw = await this.get<{ data?: Record<string, unknown>[] }>(
      `${ENDPOINTS.TWEETS}?${params.toString()}`,
      { skipCache: true } // Don't cache bulk lookups
    );
    const response = normalizeTweetArrayResponse(raw);
    return response.data ?? [];
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<XUser | null> {
    const endpoint = ENDPOINTS.USER_BY_USERNAME.replace(':username', username);
    const params = new URLSearchParams({
      'user.fields': DEFAULT_USER_FIELDS,
    });

    const raw = await this.get<{ data?: Record<string, unknown> }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `user:${username}` }
    );
    const response = normalizeUserResponse(raw);
    return response.data ?? null;
  }

  /**
   * Get user's recent tweets
   */
  async getUserTweets(userId: string, options: UserTweetsOptions = {}): Promise<XTweet[]> {
    const endpoint = ENDPOINTS.USER_TWEETS.replace(':id', userId);
    const params = new URLSearchParams({
      'tweet.fields': DEFAULT_TWEET_FIELDS,
      'user.fields': DEFAULT_USER_FIELDS,
      expansions: DEFAULT_EXPANSIONS,
      max_results: String(options.maxResults ?? 10),
    });

    const excludeParts = [
      options.excludeReplies && 'replies',
      options.excludeRetweets && 'retweets',
    ].filter(Boolean) as string[];
    if (excludeParts.length > 0) {
      params.set('exclude', excludeParts.join(','));
    }

    const raw = await this.get<{ data?: Record<string, unknown>[] }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `user_tweets:${userId}:${options.maxResults}` }
    );
    const response = normalizeTweetArrayResponse(raw);
    return response.data ?? [];
  }

  /**
   * Get recent mentions of a user (tweets that mention them)
   */
  async getUserMentions(userId: string, options: UserTweetsOptions = {}): Promise<XTweet[]> {
    const endpoint = ENDPOINTS.USER_MENTIONS.replace(':id', userId);
    const params = new URLSearchParams({
      'tweet.fields': DEFAULT_TWEET_FIELDS,
      'user.fields': DEFAULT_USER_FIELDS,
      expansions: DEFAULT_EXPANSIONS,
      max_results: String(options.maxResults ?? 50),
    });

    if (options.startTime) params.set('start_time', options.startTime);
    if (options.nextToken) params.set('pagination_token', options.nextToken);

    const raw = await this.get<{ data?: Record<string, unknown>[] }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `user_mentions:${userId}:${options.maxResults}`, cacheTtlMs: 15 * 60 * 1000 }
    );
    const response = normalizeTweetArrayResponse(raw);
    return response.data ?? [];
  }

  /**
   * Get list tweets (primary quality source!)
   */
  async getListTweets(listId: string, options: ListTweetsOptions = {}): Promise<XTweet[]> {
    const endpoint = ENDPOINTS.LIST_TWEETS.replace(':id', listId);
    const params = new URLSearchParams({
      'tweet.fields': DEFAULT_TWEET_FIELDS,
      'user.fields': DEFAULT_USER_FIELDS,
      expansions: DEFAULT_EXPANSIONS,
      max_results: String(options.maxResults ?? 100),
    });

    if (options.nextToken) params.set('pagination_token', options.nextToken);

    const raw = await this.get<{ data?: Record<string, unknown>[] }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `list:${listId}:${options.maxResults}` }
    );
    const response = normalizeTweetArrayResponse(raw);
    return response.data ?? [];
  }

  /**
   * Get personalized trends. May require OAuth 2.0 user context (not app-only Bearer).
   */
  async getTrends(): Promise<XTrendsResponse> {
    try {
      return await this.get<XTrendsResponse>(
        ENDPOINTS.PERSONALIZED_TRENDS,
        { cacheKey: 'trends' }
      );
    } catch (err) {
      const e = err as XClientError;
      if (e.status === 401 || e.status === 403) {
        throw new Error(
          'Personalized Trends may require OAuth 2.0 user context; app-only Bearer token might not be sufficient. ' +
            (e.message ?? '')
        ) as XClientError;
      }
      throw err;
    }
  }

  /**
   * Search news. Not available on all X API tiers; verify endpoint access for your project.
   */
  async searchNews(query: string, options: NewsSearchOptions = {}): Promise<XNewsResponse> {
    const params = new URLSearchParams({ query });
    if (options.maxResults) params.set('max_results', String(options.maxResults));

    try {
      return await this.get<XNewsResponse>(
        `${ENDPOINTS.NEWS_SEARCH}?${params.toString()}`,
        { cacheKey: `news:${query}` }
      );
    } catch (err) {
      const e = err as XClientError;
      if (e.status === 401 || e.status === 403 || e.status === 404) {
        throw new Error(
          'News API may not be available for this project or tier. Check your X API access. ' +
            (e.message ?? '')
        ) as XClientError;
      }
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: HTTP client with rate limiting and caching
  // ─────────────────────────────────────────────────────────────

  private async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { cacheKey, skipCache, cacheTtlMs, retried } = options;

    // Check cache first (skip on retry after 429)
    if (cacheKey && !skipCache && !retried && this.cacheEnabled) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) return cached;
    }

    // Wait for rate limit if needed
    await this.waitForRateLimit(path);

    const url = `${X_API_BASE}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Update rate limit state
    this.updateRateLimitState(path, response);

    if (!response.ok) {
      const error = await this.handleError(response);
      if (response.status === 429 && !retried && error.rateLimitReset) {
        const waitMs = Math.max(1000, error.rateLimitReset * 1000 - Date.now() + 1000);
        try {
          const { logger } = await import('@elizaos/core');
          logger?.info?.(`[xClient] Rate limited, waiting ${Math.ceil(waitMs / 1000)}s before retry`);
        } catch {
          console.log(`[xClient] Rate limited, waiting ${Math.ceil(waitMs / 1000)}s before retry`);
        }
        await new Promise((r) => setTimeout(r, waitMs));
        return this.get<T>(path, { ...options, retried: true });
      }
      throw error;
    }

    const data = await response.json() as T;

    // Cache the result (per-request TTL when provided)
    if (cacheKey && this.cacheEnabled) {
      this.setCache(cacheKey, data, cacheTtlMs);
    }

    return data;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.cacheTtlMs;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  private async waitForRateLimit(path: string): Promise<void> {
    const endpoint = this.getEndpointGroup(path);
    const state = this.rateLimits.get(endpoint);

    if (!state) return;

    if (state.remaining <= 1 && Date.now() < state.reset * 1000) {
      const waitMs = (state.reset * 1000) - Date.now() + 1000;
      try {
        const { logger } = await import('@elizaos/core');
        logger?.info?.(`[xClient] Rate limit hit, waiting ${Math.ceil(waitMs / 1000)}s`);
      } catch {
        console.log(`[xClient] Rate limit hit, waiting ${Math.ceil(waitMs / 1000)}s`);
      }
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  private updateRateLimitState(path: string, response: Response): void {
    const endpoint = this.getEndpointGroup(path);
    const remaining = response.headers.get('x-rate-limit-remaining');
    const reset = response.headers.get('x-rate-limit-reset');
    const limit = response.headers.get('x-rate-limit-limit');

    if (remaining && reset) {
      this.rateLimits.set(endpoint, {
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        limit: limit ? parseInt(limit, 10) : 100,
      });
    }
  }

  private getEndpointGroup(path: string): string {
    // Group endpoints for rate limiting
    if (path.includes('/tweets/search')) return 'search';
    if (path.includes('/tweets/counts')) return 'counts';
    if (path.includes('/users')) return 'users';
    if (path.includes('/lists')) return 'lists';
    if (path.includes('/news')) return 'news';
    return 'default';
  }

  private async handleError(response: Response): Promise<XClientError> {
    let body: { detail?: string; title?: string } = {};
    try {
      body = await response.json();
    } catch {
      // Ignore JSON parse errors
    }

    let message = body.detail ?? body.title ?? `HTTP ${response.status}`;
    if (response.status === 401) {
      message = 'X API authentication failed. Check that your Bearer token is valid and has the required permissions.';
    } else if (response.status === 403) {
      message = 'Access denied. Check your token and project access level for this endpoint.';
    }

    const error = new Error(message) as XClientError;
    error.status = response.status;

    if (response.status === 429) {
      error.code = 'RATE_LIMITED';
      const reset = response.headers.get('x-rate-limit-reset');
      if (reset) error.rateLimitReset = parseInt(reset, 10);
    }

    return error;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface SearchOptions {
  maxResults?: number;
  sinceId?: string;
  untilId?: string;
  startTime?: string;
  endTime?: string;
  nextToken?: string;
  sortOrder?: 'recency' | 'relevancy';
  tweetFields?: string;
  userFields?: string;
  expansions?: string;
  /** Override cache TTL for this request (e.g. longer for pulse, shorter for ad-hoc search). */
  cacheTtlMs?: number;
}

interface CountsOptions {
  granularity?: 'minute' | 'hour' | 'day';
  startTime?: string;
  endTime?: string;
}

interface UserTweetsOptions {
  maxResults?: number;
  excludeReplies?: boolean;
  excludeRetweets?: boolean;
  startTime?: string;
  nextToken?: string;
}

interface ListTweetsOptions {
  maxResults?: number;
  nextToken?: string;
}

interface NewsSearchOptions {
  maxResults?: number;
}

interface RequestOptions {
  cacheKey?: string;
  skipCache?: boolean;
  cacheTtlMs?: number;
  /** Internal: set when retrying after 429 to avoid infinite retry */
  retried?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Factory (per-token instances to avoid rate limits when multiple agents use different tokens)
// ─────────────────────────────────────────────────────────────

const clientsByToken = new Map<string, XClientService>();
let lastInitializedToken: string | null = null;

/**
 * Get or create an X client. Keyed by bearer token so each token gets one client instance.
 * Use initXClientFromEnv(runtime) so Eliza can use ELIZA_X_BEARER_TOKEN and others use X_BEARER_TOKEN.
 * When called without config, returns the client for the token last passed to initXClientFromEnv (so the current request uses the right agent's token).
 */
export function getXClient(config?: XClientConfig): XClientService {
  if (!config?.bearerToken) {
    if (lastInitializedToken) {
      return getXClient({ bearerToken: lastInitializedToken });
    }
    if (clientsByToken.size === 0) {
      throw new Error('XClientService not initialized. Call initXClientFromEnv(runtime) first.');
    }
    const client = clientsByToken.values().next().value;
    if (!client) throw new Error('XClientService not initialized.');
    return client;
  }
  if (!clientsByToken.has(config.bearerToken)) {
    clientsByToken.set(config.bearerToken, new XClientService(config));
  }
  return clientsByToken.get(config.bearerToken)!;
}

/**
 * Resolve bearer token from env. Per-agent tokens avoid sharing rate limits:
 * Eliza → ELIZA_X_BEARER_TOKEN when set; ECHO → ECHO_X_BEARER_TOKEN when set; else X_BEARER_TOKEN.
 */
function getBearerTokenForAgent(agentName?: string): string {
  const name = agentName?.toLowerCase();
  const isEliza = name === 'eliza';
  const isEcho = name === 'echo';
  let token: string | undefined;
  if (isEliza && process.env.ELIZA_X_BEARER_TOKEN?.trim()) {
    token = process.env.ELIZA_X_BEARER_TOKEN.trim();
  } else if (isEcho && process.env.ECHO_X_BEARER_TOKEN?.trim()) {
    token = process.env.ECHO_X_BEARER_TOKEN.trim();
  } else {
    token = process.env.X_BEARER_TOKEN?.trim();
  }
  if (!token) {
    throw new Error(
      isEliza
        ? 'X API token required. Set ELIZA_X_BEARER_TOKEN or X_BEARER_TOKEN.'
        : isEcho
          ? 'X API token required. Set ECHO_X_BEARER_TOKEN or X_BEARER_TOKEN.'
          : 'X_BEARER_TOKEN environment variable is required'
    );
  }
  return token;
}

/**
 * Initialize the X client from environment. Pass runtime so Eliza uses ELIZA_X_BEARER_TOKEN and ECHO uses ECHO_X_BEARER_TOKEN when set (avoids rate limits).
 * Sets the "current" token so getXClient() with no config returns this client for the rest of the request.
 */
export function initXClientFromEnv(runtime?: { character?: { name?: string } }): XClientService {
  const agentName = runtime?.character?.name;
  const bearerToken = getBearerTokenForAgent(agentName);
  lastInitializedToken = bearerToken;
  return getXClient({ bearerToken });
}
