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
   * Search recent tweets (last 7 days)
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

    return this.get<XSearchResponse>(
      `${ENDPOINTS.SEARCH_RECENT}?${params.toString()}`,
      { cacheKey: `search:${query}:${options.maxResults}`, cacheTtlMs: options.cacheTtlMs }
    );
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

    return this.get<XCountsResponse>(
      `${ENDPOINTS.SEARCH_COUNTS}?${params.toString()}`,
      { cacheKey: `counts:${query}:${options.granularity}` }
    );
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

    const response = await this.get<{ data?: XTweet }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `tweet:${tweetId}` }
    );

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

    const response = await this.get<{ data?: XTweet[] }>(
      `${ENDPOINTS.TWEETS}?${params.toString()}`,
      { skipCache: true } // Don't cache bulk lookups
    );

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

    const response = await this.get<{ data?: XUser }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `user:${username}` }
    );

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

    if (options.excludeReplies) params.set('exclude', 'replies');
    if (options.excludeRetweets) params.set('exclude', 'retweets');

    const response = await this.get<{ data?: XTweet[] }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `user_tweets:${userId}:${options.maxResults}` }
    );

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

    const response = await this.get<{ data?: XTweet[] }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `user_mentions:${userId}:${options.maxResults}`, cacheTtlMs: 15 * 60 * 1000 }
    );

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

    const response = await this.get<{ data?: XTweet[] }>(
      `${endpoint}?${params.toString()}`,
      { cacheKey: `list:${listId}:${options.maxResults}` }
    );

    return response.data ?? [];
  }

  /**
   * Get personalized trends (NEW!)
   */
  async getTrends(): Promise<XTrendsResponse> {
    return this.get<XTrendsResponse>(
      ENDPOINTS.PERSONALIZED_TRENDS,
      { cacheKey: 'trends' }
    );
  }

  /**
   * Search news (NEW!)
   */
  async searchNews(query: string, options: NewsSearchOptions = {}): Promise<XNewsResponse> {
    const params = new URLSearchParams({ query });
    if (options.maxResults) params.set('max_results', String(options.maxResults));

    return this.get<XNewsResponse>(
      `${ENDPOINTS.NEWS_SEARCH}?${params.toString()}`,
      { cacheKey: `news:${query}` }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: HTTP client with rate limiting and caching
  // ─────────────────────────────────────────────────────────────

  private async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { cacheKey, skipCache, cacheTtlMs } = options;

    // Check cache first
    if (cacheKey && !skipCache && this.cacheEnabled) {
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
      console.log(`[xClient] Rate limit hit, waiting ${Math.ceil(waitMs / 1000)}s`);
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

    const error = new Error(body.detail ?? body.title ?? `HTTP ${response.status}`) as XClientError;
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
}

// ─────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────

let clientInstance: XClientService | null = null;

/**
 * Get or create the X client instance
 */
export function getXClient(config?: XClientConfig): XClientService {
  if (!clientInstance && config) {
    clientInstance = new XClientService(config);
  }
  if (!clientInstance) {
    throw new Error('XClientService not initialized. Call getXClient with config first.');
  }
  return clientInstance;
}

/**
 * Initialize the X client from environment
 */
export function initXClientFromEnv(): XClientService {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error('X_BEARER_TOKEN environment variable is required');
  }
  return getXClient({ bearerToken });
}
