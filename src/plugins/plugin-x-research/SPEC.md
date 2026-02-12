# Plugin X Research — Full Specification

**Version:** 1.0.0  
**Status:** Specification Complete  
**Author:** VINCE Dream Team  
**Purpose:** Dedicated X/Twitter research and sentiment plugin for VINCE

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [X API v2 Reference](#x-api-v2-reference)
4. [Services](#services)
5. [Actions](#actions)
6. [Providers](#providers)
7. [Analysis Modules](#analysis-modules)
8. [Types](#types)
9. [Configuration](#configuration)
10. [Caching Strategy](#caching-strategy)
11. [Rate Limiting](#rate-limiting)
12. [Testing](#testing)
13. [Migration from plugin-vince](#migration-from-plugin-vince)
14. [Examples](#examples)

---

## Overview

### Why a Dedicated Plugin?

The X API v2 is extensive (50+ endpoints) and X/Twitter is the primary source of crypto alpha. Current implementation is fragmented:

| Current Location | What |
|------------------|------|
| `plugin-vince/services/xResearch.service.ts` | Search, profile, thread |
| `plugin-vince/services/xSentiment.service.ts` | Trading sentiment |
| `plugin-vince/actions/xResearch.action.ts` | In-chat research |
| `plugin-vince/utils/xSentimentLogic.ts` | Keyword scoring |
| `skills/x-research/` | OpenClaw CLI tool |

**Problems:**
- Logic spread across 5 locations
- Hard to test sentiment without trading code
- Can't reuse in other agents (Eliza, Sentinel)
- Missing advanced features (volume, velocity, threads)

**Solution:** `plugin-x-research` — single source of truth for all X research.

### Goals

1. **Complete X API v2 coverage** — all read endpoints
2. **Trading-grade sentiment** — weighted, tiered, velocity-aware
3. **Alpha discovery** — threads, emerging accounts, narratives
4. **ALOHA-style output** — human, opinionated briefings
5. **Reusable** — provider pattern for other plugins
6. **Cost-efficient** — smart caching, deduplication, staggered refresh

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         plugin-x-research                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ACTIONS                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ X_SEARCH │ │ X_VIBE   │ │ X_THREAD │ │ X_ALPHA  │ │ X_PULSE  │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │            │             │
├───────┼────────────┼────────────┼────────────┼────────────┼─────────────┤
│  SERVICES                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      xClient.service.ts                          │    │
│  │  (Auth, Rate Limits, Request Queue, Error Handling)              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│       │                                                                  │
│  ┌────┴────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ xSearch │ │xSentiment│ │xAccounts │ │ xLists   │ │ xThreads │       │
│  └─────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  ANALYSIS                                                                │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │ velocity  │ │ topics    │ │ contrarian│ │ reputation│ │ threads   │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  PROVIDERS (for other plugins)                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ xSentimentProvider — getTradingSentiment(asset) → Signal        │    │
│  │ xVibeProvider — getMarketVibe() → VibeCheck                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/plugins/plugin-x-research/
├── src/
│   ├── index.ts                      # Plugin export
│   │
│   ├── services/
│   │   ├── xClient.service.ts        # Core API client
│   │   ├── xSearch.service.ts        # Search, counts, trending
│   │   ├── xSentiment.service.ts     # Sentiment analysis
│   │   ├── xAccounts.service.ts      # User profiles, followers
│   │   ├── xLists.service.ts         # Curated lists
│   │   ├── xThreads.service.ts       # Thread detection + fetch
│   │   └── xSpaces.service.ts        # Audio spaces (future)
│   │
│   ├── actions/
│   │   ├── xSearch.action.ts         # "search X for..."
│   │   ├── xVibe.action.ts           # CT vibe check
│   │   ├── xAccount.action.ts        # "what's @user thinking"
│   │   ├── xThread.action.ts         # "get thread..."
│   │   ├── xAlpha.action.ts          # "find alpha on X"
│   │   ├── xPulse.action.ts          # Daily briefing
│   │   └── xMentions.action.ts       # "who's mentioning @user"
│   │
│   ├── providers/
│   │   ├── xSentiment.provider.ts    # For signal aggregator
│   │   └── xVibe.provider.ts         # For ALOHA action
│   │
│   ├── analysis/
│   │   ├── velocityScorer.ts         # Engagement velocity
│   │   ├── topicCluster.ts           # Narrative detection
│   │   ├── contrarianDetector.ts     # Extreme sentiment warnings
│   │   ├── accountReputation.ts      # Tier scoring
│   │   ├── threadDetector.ts         # Thread identification
│   │   └── volumeAnalyzer.ts         # Volume trends/spikes
│   │
│   ├── constants/
│   │   ├── sentimentKeywords.ts      # Bullish/bearish/risk
│   │   ├── qualityAccounts.ts        # Default VIP handles
│   │   ├── endpoints.ts              # X API URLs
│   │   └── defaults.ts               # Default config values
│   │
│   ├── types/
│   │   ├── index.ts                  # All type exports
│   │   ├── tweet.types.ts            # XTweet, XThread
│   │   ├── user.types.ts             # XUser, XAccountTier
│   │   ├── sentiment.types.ts        # XSentiment, XVibe
│   │   ├── analysis.types.ts         # Velocity, Cluster, etc.
│   │   └── api.types.ts              # X API response types
│   │
│   ├── utils/
│   │   ├── queryBuilder.ts           # Build X search queries
│   │   ├── rateLimiter.ts            # Token bucket / backoff
│   │   ├── cache.ts                  # Cache helpers
│   │   └── parseHelpers.ts           # Response parsing
│   │
│   └── __tests__/
│       ├── xClient.test.ts
│       ├── xSearch.test.ts
│       ├── xSentiment.test.ts
│       ├── velocityScorer.test.ts
│       ├── topicCluster.test.ts
│       └── integration/
│           └── fullPipeline.test.ts
│
├── README.md
├── CHANGELOG.md
└── package.json
```

---

## X API v2 Reference

### Authentication

```typescript
// Bearer Token (App-Only) — what we use
Authorization: Bearer ${X_BEARER_TOKEN}

// Rate limits: ~450 requests per 15-minute window (Basic tier)
// Pay-as-you-go: deduplication within 24hr UTC window
```

### Endpoints We Use

#### Posts

| Endpoint | Method | Description | Rate |
|----------|--------|-------------|------|
| `/2/tweets/search/recent` | GET | Search posts (last 7 days) | 450/15m |
| `/2/tweets/counts/recent` | GET | Count posts per time bucket | 300/15m |
| `/2/tweets/:id` | GET | Single post by ID | 900/15m |
| `/2/tweets` | GET | Multiple posts by IDs | 900/15m |
| `/2/tweets/:id/quote_tweets` | GET | Quote tweets of a post | 75/15m |
| `/2/tweets/:id/retweeted_by` | GET | Users who retweeted | 75/15m |
| `/2/tweets/:id/liking_users` | GET | Users who liked | 75/15m |

#### Users

| Endpoint | Method | Description | Rate |
|----------|--------|-------------|------|
| `/2/users/by/username/:username` | GET | User by handle | 900/15m |
| `/2/users/by` | GET | Multiple users by usernames | 900/15m |
| `/2/users/:id` | GET | User by ID | 900/15m |
| `/2/users/:id/tweets` | GET | User's timeline | 900/15m |
| `/2/users/:id/mentions` | GET | Mentions of user | 450/15m |
| `/2/users/:id/followers` | GET | User's followers | 15/15m |
| `/2/users/:id/following` | GET | Who user follows | 15/15m |

#### Lists

| Endpoint | Method | Description | Rate |
|----------|--------|-------------|------|
| `/2/lists/:id` | GET | List metadata | 75/15m |
| `/2/lists/:id/tweets` | GET | Posts from list | 900/15m |
| `/2/lists/:id/members` | GET | List members | 900/15m |
| `/2/users/:id/owned_lists` | GET | Lists user owns | 15/15m |
| `/2/users/:id/list_memberships` | GET | Lists containing user | 75/15m |

#### Spaces (Future)

| Endpoint | Method | Description | Rate |
|----------|--------|-------------|------|
| `/2/spaces/search` | GET | Search spaces | 300/15m |
| `/2/spaces/:id` | GET | Space details | 300/15m |

### Query Operators

```
# Basic
from:username       Posts from user
to:username         Replies to user
@username           Mentions user
#hashtag            Has hashtag
$cashtag            Has cashtag (e.g., $BTC)

# Filters
-is:retweet         Exclude retweets
-is:reply           Exclude replies
is:verified         Only verified accounts
has:links           Has URLs
has:media           Has images/video

# Engagement (post-hoc only, not query)
# X API doesn't support min_faves in query — filter after fetch

# Time
since:2024-01-01    After date
until:2024-01-31    Before date

# Combine
($BTC OR Bitcoin) -is:retweet -giveaway -airdrop min_faves:50
```

---

## Services

### xClient.service.ts

Core API client handling auth, rate limits, and request queue.

```typescript
/**
 * X API Client Service
 * 
 * Responsibilities:
 * - Bearer token management (primary + optional background token)
 * - Rate limit tracking per endpoint
 * - Request queue with backoff
 * - Response parsing and error handling
 * - Usage tracking for cost monitoring
 */

export interface XClientConfig {
  bearerToken: string;
  backgroundToken?: string;        // For sentiment (doesn't block in-chat)
  maxRetries: number;              // Default: 3
  baseDelayMs: number;             // Default: 1000
  maxDelayMs: number;              // Default: 60000
}

export interface XClientService {
  // Core request method
  request<T>(
    endpoint: string,
    params?: Record<string, string>,
    options?: RequestOptions
  ): Promise<XApiResponse<T>>;
  
  // Rate limit info
  getRateLimitStatus(endpoint: string): RateLimitStatus;
  isRateLimited(endpoint: string): boolean;
  getSecondsUntilReset(endpoint: string): number;
  
  // Token management
  useBackgroundToken(): boolean;
  getActiveToken(): string;
  
  // Usage tracking
  getUsageToday(): UsageSummary;
  getUsageThisMonth(): UsageSummary;
}

interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetAtMs: number;
}

interface UsageSummary {
  requests: number;
  estimatedCost: number;
  byEndpoint: Record<string, number>;
}
```

### xSearch.service.ts

Search, counts, and trending analysis.

```typescript
/**
 * X Search Service
 * 
 * Endpoints:
 * - /2/tweets/search/recent
 * - /2/tweets/counts/recent
 */

export interface XSearchService {
  // Basic search
  search(query: string, options?: SearchOptions): Promise<XSearchResult>;
  
  // Paginated search (generator)
  searchPaginated(
    query: string, 
    options?: SearchOptions
  ): AsyncGenerator<XSearchPage>;
  
  // Collect up to N tweets
  searchAll(
    query: string, 
    options?: SearchAllOptions
  ): Promise<XTweet[]>;
  
  // Volume analysis
  getCounts(
    query: string, 
    options?: CountsOptions
  ): Promise<XCountsResult>;
  
  // Volume trend (spike detection)
  getVolumeTrend(query: string): Promise<VolumeTrend>;
  
  // Trending (based on velocity)
  getTrending(options?: TrendingOptions): Promise<TrendingResult>;
}

interface SearchOptions {
  maxResults?: number;           // 10-100, default 100
  sinceId?: string;
  untilId?: string;
  startTime?: string;            // ISO timestamp
  endTime?: string;
  sortOrder?: 'relevancy' | 'recency';
  expansions?: string[];
  tweetFields?: string[];
  userFields?: string[];
}

interface SearchAllOptions extends SearchOptions {
  maxTweets?: number;            // Total tweets to collect
  maxPages?: number;             // Max pagination requests
}

interface CountsOptions {
  granularity?: 'minute' | 'hour' | 'day';
  startTime?: string;
  endTime?: string;
}

interface VolumeTrend {
  query: string;
  currentHour: number;
  previousHour: number;
  avg24h: number;
  percentChange: number;
  isSpike: boolean;              // > 2x avg
  trend: 'rising' | 'falling' | 'stable';
}
```

### xSentiment.service.ts

Trading-grade sentiment analysis.

```typescript
/**
 * X Sentiment Service
 * 
 * Produces sentiment signals for the trading aggregator.
 * Features:
 * - Keyword + phrase scoring
 * - Engagement-weighted sentiment
 * - Account reputation tiers
 * - Velocity adjustment
 * - Contrarian detection
 */

export interface XSentimentService {
  // Core sentiment for trading
  getTradingSentiment(asset: string): Promise<XTradingSentiment>;
  
  // Batch sentiment (multiple assets)
  getBatchSentiment(assets: string[]): Promise<Map<string, XTradingSentiment>>;
  
  // List-based sentiment (curated accounts)
  getListSentiment(listId: string): Promise<XListSentiment>;
  
  // Raw tweet sentiment (for analysis)
  analyzeTweets(tweets: XTweet[]): TweetSentimentAnalysis;
  
  // Staggered refresh (background)
  startBackgroundRefresh(): void;
  stopBackgroundRefresh(): void;
  
  // Manual refresh
  refreshAsset(asset: string): Promise<XTradingSentiment>;
}

interface XTradingSentiment {
  asset: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number;                 // -1 to 1
  confidence: number;            // 0 to 100
  strength: number;              // 0 to 100
  
  // Breakdown
  tweetCount: number;
  avgEngagement: number;
  topTier: AccountTier;          // Highest tier that contributed
  
  // Warnings
  hasHighRiskEvent: boolean;
  contrarianWarning?: string;
  
  // Meta
  cachedAt: number;
  expiresAt: number;
  source: 'search' | 'list' | 'combined';
}

interface TweetSentimentAnalysis {
  tweets: Array<{
    tweet: XTweet;
    sentiment: number;
    keywords: string[];
    tier: AccountTier;
    velocityScore: number;
  }>;
  aggregate: {
    average: number;
    weighted: number;            // By engagement + tier
    velocityAdjusted: number;    // Recent tweets weighted higher
  };
  breakdown: {
    bullish: number;
    bearish: number;
    neutral: number;
  };
}
```

### xAccounts.service.ts

User profiles, followers, and discovery.

```typescript
/**
 * X Accounts Service
 * 
 * Endpoints:
 * - /2/users/by/username/:username
 * - /2/users/:id/tweets
 * - /2/users/:id/mentions
 * - /2/users/:id/followers
 * - /2/users/:id/following
 */

export interface XAccountsService {
  // Get user profile
  getUser(username: string): Promise<XUser>;
  getUsers(usernames: string[]): Promise<XUser[]>;
  getUserById(id: string): Promise<XUser>;
  
  // User timeline
  getUserTweets(
    username: string, 
    options?: TimelineOptions
  ): Promise<XTweet[]>;
  
  // Mentions
  getMentions(
    username: string, 
    options?: MentionsOptions
  ): Promise<XTweet[]>;
  
  // Social graph (rate limited!)
  getFollowers(userId: string, maxResults?: number): Promise<XUser[]>;
  getFollowing(userId: string, maxResults?: number): Promise<XUser[]>;
  
  // Account analysis
  analyzeAccount(username: string): Promise<AccountAnalysis>;
  
  // Discovery
  discoverAccounts(tweets: XTweet[]): Promise<AccountDiscovery[]>;
}

interface XUser {
  id: string;
  username: string;
  name: string;
  description: string;
  verified: boolean;
  protected: boolean;
  createdAt: string;
  
  metrics: {
    followers: number;
    following: number;
    tweets: number;
    listed: number;
  };
  
  // Computed
  tier: AccountTier;
  reputationScore: number;
}

interface AccountAnalysis {
  user: XUser;
  tier: AccountTier;
  recentActivity: {
    tweetsLast24h: number;
    avgEngagement: number;
    topTopics: string[];
  };
  influence: {
    score: number;
    reach: number;
    engagement_rate: number;
  };
}

interface AccountDiscovery {
  username: string;
  engagementTotal: number;
  tweetCount: number;
  avgEngagement: number;
  isNew: boolean;                 // Not in quality list
  suggestion: string;
}
```

### xLists.service.ts

Curated lists for quality filtering.

```typescript
/**
 * X Lists Service
 * 
 * Endpoints:
 * - /2/lists/:id
 * - /2/lists/:id/tweets
 * - /2/lists/:id/members
 */

export interface XListsService {
  // List metadata
  getList(listId: string): Promise<XList>;
  
  // List tweets
  getListTweets(
    listId: string, 
    options?: ListTweetsOptions
  ): Promise<XTweet[]>;
  
  // List members (quality accounts)
  getListMembers(listId: string): Promise<XUser[]>;
  
  // Quality account management
  getQualityAccounts(): Promise<QualityAccountSet>;
  isQualityAccount(username: string): boolean;
  
  // Filter tweets by quality
  filterByQuality(
    tweets: XTweet[], 
    options?: QualityFilterOptions
  ): XTweet[];
}

interface XList {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  followerCount: number;
  private: boolean;
  ownerId: string;
}

interface QualityAccountSet {
  fromList: Set<string>;         // From X_RESEARCH_QUALITY_LIST_ID
  vipHandles: Set<string>;       // From SOLUS_X_VIP_HANDLES
  combined: Set<string>;
  lastUpdated: number;
}

interface QualityFilterOptions {
  minFollowers?: number;         // Default: 5000
  minLikes?: number;             // Default: 50
  minImpressions?: number;       // Default: 5000
  requireQualityAuthor?: boolean;
  useFallbackBar?: boolean;      // Relax to 1000/10
}
```

### xThreads.service.ts

Thread detection and full conversation fetch.

```typescript
/**
 * X Threads Service
 * 
 * Endpoints:
 * - /2/tweets/search/recent (conversation_id)
 * - /2/tweets/:id (with expansions)
 */

export interface XThreadsService {
  // Detect thread starters
  detectThreadStarters(tweets: XTweet[]): XTweet[];
  
  // Get full thread
  getThread(tweetId: string): Promise<XThread>;
  
  // Get conversation (all replies)
  getConversation(
    conversationId: string, 
    options?: ConversationOptions
  ): Promise<XConversation>;
  
  // Auto-fetch threads from search results
  enrichWithThreads(
    tweets: XTweet[], 
    options?: ThreadEnrichOptions
  ): Promise<EnrichedSearchResult>;
}

interface XThread {
  id: string;
  author: XUser;
  tweets: XTweet[];              // Ordered by position
  totalTweets: number;
  engagement: {
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
  };
  summary?: string;              // LLM-generated
}

interface XConversation {
  rootTweet: XTweet;
  replies: XTweet[];
  participants: XUser[];
  depth: number;
}

interface ThreadEnrichOptions {
  maxThreads?: number;           // Default: 3
  minReplies?: number;           // Default: 10
  includeConversation?: boolean;
}

interface EnrichedSearchResult {
  tweets: XTweet[];
  threads: XThread[];
  threadStarters: XTweet[];
}
```

---

## Actions

### X_SEARCH

```typescript
/**
 * X_SEARCH — Search X/Twitter
 * 
 * Triggers:
 * - "search X for {query}"
 * - "what are people saying about {topic}"
 * - "X research {query}"
 * - "check X for {topic}"
 */

name: "X_SEARCH"
similes: ["SEARCH_X", "TWITTER_SEARCH", "X_RESEARCH"]

// Input parsing
extractQuery(text: string): string
expandTicker(query: string): string  // BTC → "$BTC OR Bitcoin"

// Output: ALOHA-style narrative + top posts
```

### X_VIBE

```typescript
/**
 * X_VIBE — CT Vibe Check
 * 
 * Triggers:
 * - "CT vibe"
 * - "crypto twitter sentiment"
 * - "what's the vibe on X"
 */

name: "X_VIBE"
similes: ["CT_VIBE", "TWITTER_SENTIMENT", "X_SENTIMENT"]

// Output: Overall market vibe with breakdown by asset
```

### X_ACCOUNT

```typescript
/**
 * X_ACCOUNT — Account Analysis
 * 
 * Triggers:
 * - "what's @user thinking"
 * - "recent from @user"
 * - "profile @user"
 */

name: "X_ACCOUNT"
similes: ["TWITTER_PROFILE", "USER_TWEETS"]

// Output: Account analysis + recent tweets
```

### X_THREAD

```typescript
/**
 * X_THREAD — Get Thread
 * 
 * Triggers:
 * - "get thread {url}"
 * - "thread for {tweet_id}"
 * - x.com/user/status/123 URL
 */

name: "X_THREAD"
similes: ["GET_THREAD", "TWITTER_THREAD"]

// Output: Full thread with summary
```

### X_ALPHA

```typescript
/**
 * X_ALPHA — Find Alpha
 * 
 * Triggers:
 * - "find alpha on X"
 * - "X alpha {topic}"
 * - "what alpha is on Twitter"
 */

name: "X_ALPHA"
similes: ["FIND_ALPHA", "TWITTER_ALPHA"]

// Searches, filters by velocity + quality, returns top alpha posts
```

### X_PULSE

```typescript
/**
 * X_PULSE — Daily Briefing
 * 
 * Triggers:
 * - "X pulse"
 * - "daily X briefing"
 * - (scheduled via cron)
 */

name: "X_PULSE"
similes: ["DAILY_X", "X_BRIEFING"]

// Full pipeline: search → analyze → ALOHA narrative
// Saves to knowledge/research-daily/
```

### X_MENTIONS

```typescript
/**
 * X_MENTIONS — Who's Mentioning
 * 
 * Triggers:
 * - "who's mentioning @user"
 * - "mentions of @user"
 */

name: "X_MENTIONS"
similes: ["GET_MENTIONS", "TWITTER_MENTIONS"]

// Output: Recent mentions with sentiment
```

---

## Providers

### xSentiment.provider.ts

Exposes sentiment to signal aggregator.

```typescript
/**
 * X Sentiment Provider
 * 
 * Used by plugin-vince signal aggregator:
 * 
 * import { xSentimentProvider } from "@vince/plugin-x-research";
 * const signal = await xSentimentProvider.getTradingSentiment("BTC");
 */

export const xSentimentProvider = {
  name: "X_SENTIMENT_PROVIDER",
  
  async getTradingSentiment(asset: string): Promise<TradingSignal> {
    const sentiment = await xSentimentService.getTradingSentiment(asset);
    
    return {
      source: "XSentiment",
      direction: sentiment.direction,
      strength: sentiment.strength,
      confidence: sentiment.confidence,
      factors: [{
        name: "X Sentiment",
        value: sentiment.score,
        explanation: `${sentiment.tweetCount} posts, ${sentiment.direction} bias`
      }],
      warnings: sentiment.contrarianWarning 
        ? [sentiment.contrarianWarning] 
        : []
    };
  },
  
  // For batch requests
  async getBatchSentiment(assets: string[]): Promise<Map<string, TradingSignal>> {
    // ...
  }
};
```

### xVibe.provider.ts

Exposes vibe check to ALOHA action.

```typescript
/**
 * X Vibe Provider
 * 
 * Used by VINCE_ALOHA action for market vibe section.
 */

export const xVibeProvider = {
  name: "X_VIBE_PROVIDER",
  
  async getMarketVibe(): Promise<MarketVibe> {
    const assets = ["BTC", "ETH", "SOL"];
    const sentiments = await xSentimentService.getBatchSentiment(assets);
    
    return {
      overall: computeOverallVibe(sentiments),
      byAsset: sentiments,
      trending: await xSearchService.getTrending(),
      contrarianWarnings: detectContrarianSignals(sentiments)
    };
  }
};
```

---

## Analysis Modules

### velocityScorer.ts

```typescript
/**
 * Engagement Velocity Scorer
 * 
 * Problem: 1000 likes from yesterday < 100 likes in 1 hour
 * Solution: Score by likes/hour
 */

export function engagementVelocity(tweet: XTweet): number {
  const ageMs = Date.now() - new Date(tweet.created_at).getTime();
  const ageHours = ageMs / 3_600_000;
  
  // Minimum 30 minutes to avoid division by tiny numbers
  const effectiveAge = Math.max(0.5, ageHours);
  
  const likes = tweet.metrics.likes;
  const retweets = tweet.metrics.retweets * 2; // Weight RT higher
  
  return (likes + retweets) / effectiveAge;
}

export function sortByVelocity(tweets: XTweet[]): XTweet[] {
  return [...tweets].sort((a, b) => 
    engagementVelocity(b) - engagementVelocity(a)
  );
}

export function getVelocityWinners(
  tweets: XTweet[], 
  count: number = 5
): VelocityWinner[] {
  return sortByVelocity(tweets)
    .slice(0, count)
    .map(t => ({
      tweet: t,
      velocity: engagementVelocity(t),
      ageHours: (Date.now() - new Date(t.created_at).getTime()) / 3_600_000,
      label: formatVelocityLabel(t)
    }));
}

function formatVelocityLabel(tweet: XTweet): string {
  const v = engagementVelocity(tweet);
  const age = (Date.now() - new Date(tweet.created_at).getTime()) / 3_600_000;
  
  if (age < 1) {
    return `${tweet.metrics.likes} likes in ${Math.round(age * 60)}min 🔥`;
  }
  return `${tweet.metrics.likes} likes in ${age.toFixed(1)}h`;
}
```

### topicCluster.ts

```typescript
/**
 * Topic Clustering
 * 
 * Groups tweets by common themes to identify emerging narratives.
 */

export interface TopicCluster {
  topic: string;
  keywords: string[];
  tweets: XTweet[];
  engagement: number;
  sentiment: number;
  isEmerging: boolean;
}

export function clusterByTopic(tweets: XTweet[]): TopicCluster[] {
  const clusters = new Map<string, XTweet[]>();
  
  for (const tweet of tweets) {
    const topics = extractTopics(tweet);
    for (const topic of topics) {
      const existing = clusters.get(topic) || [];
      existing.push(tweet);
      clusters.set(topic, existing);
    }
  }
  
  return Array.from(clusters.entries())
    .map(([topic, tweets]) => ({
      topic,
      keywords: extractKeywords(tweets),
      tweets,
      engagement: sumEngagement(tweets),
      sentiment: avgSentiment(tweets),
      isEmerging: tweets.length >= 3 && avgAge(tweets) < 6 // hours
    }))
    .filter(c => c.tweets.length >= 2)
    .sort((a, b) => b.engagement - a.engagement);
}

function extractTopics(tweet: XTweet): string[] {
  const topics: string[] = [];
  
  // Cashtags
  topics.push(...tweet.hashtags.filter(h => h.startsWith('$')));
  
  // Hashtags
  topics.push(...tweet.hashtags.filter(h => !h.startsWith('$')));
  
  // Known topics from text
  const text = tweet.text.toLowerCase();
  if (text.includes('etf')) topics.push('ETF');
  if (text.includes('whale')) topics.push('Whales');
  if (text.includes('airdrop')) topics.push('Airdrops');
  if (text.includes('hack') || text.includes('exploit')) topics.push('Security');
  
  return [...new Set(topics)];
}
```

### contrarianDetector.ts

```typescript
/**
 * Contrarian Signal Detector
 * 
 * Extreme sentiment often precedes reversals.
 */

export interface ContrarianWarning {
  type: 'extreme_bullish' | 'extreme_bearish' | 'divergence';
  asset?: string;
  sentiment: number;
  confidence: number;
  message: string;
  severity: 'info' | 'warning' | 'alert';
}

export function detectContrarian(
  sentiment: XTradingSentiment
): ContrarianWarning | null {
  const { score, confidence, asset } = sentiment;
  
  // Extreme bullish
  if (score > 0.6 && confidence > 70) {
    return {
      type: 'extreme_bullish',
      asset,
      sentiment: score,
      confidence,
      message: `⚠️ ${asset} sentiment extremely bullish (${(score * 100).toFixed(0)}%). Historically precedes pullbacks.`,
      severity: 'warning'
    };
  }
  
  // Extreme bearish
  if (score < -0.6 && confidence > 70) {
    return {
      type: 'extreme_bearish',
      asset,
      sentiment: score,
      confidence,
      message: `🔄 ${asset} sentiment extremely bearish. Contrarian buy signal?`,
      severity: 'info'
    };
  }
  
  return null;
}

export function detectDivergence(
  sentiments: Map<string, XTradingSentiment>,
  priceChanges: Map<string, number>
): ContrarianWarning[] {
  const warnings: ContrarianWarning[] = [];
  
  for (const [asset, sentiment] of sentiments) {
    const priceChange = priceChanges.get(asset);
    if (priceChange === undefined) continue;
    
    // Bullish sentiment + falling price = potential bull trap
    if (sentiment.score > 0.4 && priceChange < -5) {
      warnings.push({
        type: 'divergence',
        asset,
        sentiment: sentiment.score,
        confidence: sentiment.confidence,
        message: `${asset}: Bullish sentiment but price down ${priceChange.toFixed(1)}%. Divergence.`,
        severity: 'warning'
      });
    }
    
    // Bearish sentiment + rising price = potential bear trap
    if (sentiment.score < -0.4 && priceChange > 5) {
      warnings.push({
        type: 'divergence',
        asset,
        sentiment: sentiment.score,
        confidence: sentiment.confidence,
        message: `${asset}: Bearish sentiment but price up ${priceChange.toFixed(1)}%. Divergence.`,
        severity: 'info'
      });
    }
  }
  
  return warnings;
}
```

### accountReputation.ts

```typescript
/**
 * Account Reputation Tiers
 * 
 * Weight sentiment by account influence.
 */

export type AccountTier = 'whale' | 'alpha' | 'quality' | 'emerging' | 'unknown';

export interface TierConfig {
  minFollowers: number;
  weight: number;
  label: string;
}

export const TIER_CONFIG: Record<AccountTier, TierConfig> = {
  whale: { minFollowers: 100_000, weight: 3.0, label: '🐋 Whale' },
  alpha: { minFollowers: 25_000, weight: 2.0, label: '⭐ Alpha' },
  quality: { minFollowers: 5_000, weight: 1.0, label: '✓ Quality' },
  emerging: { minFollowers: 1_000, weight: 0.5, label: '📈 Emerging' },
  unknown: { minFollowers: 0, weight: 0.25, label: '?' }
};

export function getAccountTier(followers: number | undefined): AccountTier {
  if (followers === undefined) return 'unknown';
  
  if (followers >= 100_000) return 'whale';
  if (followers >= 25_000) return 'alpha';
  if (followers >= 5_000) return 'quality';
  if (followers >= 1_000) return 'emerging';
  return 'unknown';
}

export function getTierWeight(tier: AccountTier): number {
  return TIER_CONFIG[tier].weight;
}

export function weightedSentiment(tweet: XTweet, baseSentiment: number): number {
  const tier = getAccountTier(tweet.author_followers);
  return baseSentiment * getTierWeight(tier);
}
```

### volumeAnalyzer.ts

```typescript
/**
 * Volume Analyzer
 * 
 * Uses counts endpoint to detect volume spikes.
 */

export interface VolumeAnalysis {
  query: string;
  buckets: VolumeBucket[];
  currentHour: number;
  avg24h: number;
  max24h: number;
  percentChange: number;
  isSpike: boolean;
  trend: 'rising' | 'falling' | 'stable';
  narrative: string;
}

interface VolumeBucket {
  start: string;
  end: string;
  count: number;
}

export async function analyzeVolume(
  countsData: VolumeBucket[]
): Promise<VolumeAnalysis> {
  const counts = countsData.map(b => b.count);
  const current = counts[counts.length - 1] || 0;
  const previous = counts[counts.length - 2] || current;
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const max = Math.max(...counts);
  
  const percentChange = previous > 0 
    ? ((current - previous) / previous) * 100 
    : 0;
  
  const isSpike = current > avg * 2;
  const trend = percentChange > 20 ? 'rising' 
    : percentChange < -20 ? 'falling' 
    : 'stable';
  
  return {
    query: '',
    buckets: countsData,
    currentHour: current,
    avg24h: avg,
    max24h: max,
    percentChange,
    isSpike,
    trend,
    narrative: generateVolumeNarrative(current, avg, trend, isSpike)
  };
}

function generateVolumeNarrative(
  current: number, 
  avg: number, 
  trend: string, 
  isSpike: boolean
): string {
  if (isSpike) {
    return `🔥 Volume spike: ${current} posts this hour (${(current / avg).toFixed(1)}x average)`;
  }
  if (trend === 'rising') {
    return `📈 Volume rising: ${current} posts (+${((current - avg) / avg * 100).toFixed(0)}% vs avg)`;
  }
  if (trend === 'falling') {
    return `📉 Volume falling: ${current} posts (${((current - avg) / avg * 100).toFixed(0)}% vs avg)`;
  }
  return `Volume stable: ${current} posts (near average)`;
}
```

### threadDetector.ts

```typescript
/**
 * Thread Detector
 * 
 * Identifies thread starters from search results.
 */

export interface ThreadCandidate {
  tweet: XTweet;
  confidence: number;
  indicators: string[];
}

export function detectThreadStarters(tweets: XTweet[]): ThreadCandidate[] {
  const candidates: ThreadCandidate[] = [];
  
  for (const tweet of tweets) {
    const indicators: string[] = [];
    let confidence = 0;
    
    // High replies = likely thread
    if (tweet.metrics.replies > 20) {
      indicators.push(`${tweet.metrics.replies} replies`);
      confidence += 30;
    } else if (tweet.metrics.replies > 10) {
      indicators.push(`${tweet.metrics.replies} replies`);
      confidence += 20;
    }
    
    // conversation_id === id means it's a root tweet
    if (tweet.conversation_id === tweet.id) {
      indicators.push('Thread root');
      confidence += 20;
    }
    
    // Text patterns
    const text = tweet.text.toLowerCase();
    if (text.includes('thread') || text.includes('🧵')) {
      indicators.push('Thread marker in text');
      confidence += 25;
    }
    if (text.match(/^\d+[.\/)]/) || text.includes('1/')) {
      indicators.push('Numbered format');
      confidence += 15;
    }
    
    // High engagement relative to replies = valuable thread
    const engagementRatio = tweet.metrics.likes / Math.max(1, tweet.metrics.replies);
    if (engagementRatio > 10) {
      indicators.push('High like:reply ratio');
      confidence += 10;
    }
    
    if (confidence >= 40) {
      candidates.push({ tweet, confidence, indicators });
    }
  }
  
  return candidates.sort((a, b) => b.confidence - a.confidence);
}
```

---

## Types

### tweet.types.ts

```typescript
export interface XTweet {
  id: string;
  text: string;
  author_id: string;
  username: string;
  name: string;
  created_at: string;
  conversation_id: string;
  author_followers?: number;
  
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
  cashtags: string[];
  
  tweet_url: string;
  
  // Computed
  sentiment?: number;
  velocityScore?: number;
  tier?: AccountTier;
}

export interface XThread {
  id: string;
  rootTweetId: string;
  author: XUser;
  tweets: XTweet[];
  totalEngagement: number;
  summary?: string;
}
```

### sentiment.types.ts

```typescript
export interface XTradingSentiment {
  asset: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number;                 // -1 to 1
  confidence: number;            // 0-100
  strength: number;              // 0-100
  
  tweetCount: number;
  avgEngagement: number;
  topTier: AccountTier;
  
  hasHighRiskEvent: boolean;
  riskKeywords: string[];
  contrarianWarning?: ContrarianWarning;
  
  cachedAt: number;
  expiresAt: number;
  source: 'search' | 'list' | 'combined';
}

export interface XMarketVibe {
  overall: {
    direction: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    score: number;
    confidence: number;
    narrative: string;
  };
  
  byAsset: Map<string, XTradingSentiment>;
  
  trending: TrendingResult;
  
  volumeAnalysis?: VolumeAnalysis;
  
  contrarianWarnings: ContrarianWarning[];
  
  velocityWinners: VelocityWinner[];
  
  emergingNarratives: TopicCluster[];
  
  threadsToRead: XThread[];
  
  accountsToWatch: AccountDiscovery[];
}
```

---

## Configuration

### Environment Variables

```bash
# Required
X_BEARER_TOKEN=xxx                    # Primary API token

# Optional: Second token for background (prevents blocking in-chat)
X_BEARER_TOKEN_SENTIMENT=xxx

# Quality filtering
X_RESEARCH_QUALITY_LIST_ID=xxx        # Curated X list ID
SOLUS_X_VIP_HANDLES=user1,user2       # Additional VIP handles
CRYPTO_VIP_HANDLES=user3,user4        # More VIP handles

# Sentiment
X_SENTIMENT_ASSETS=BTC,ETH,SOL,HYPE   # Assets to track
X_SENTIMENT_STAGGER_INTERVAL_MS=3600000  # 1 hour between refreshes
X_SENTIMENT_CONFIDENCE_FLOOR=40       # Min confidence to contribute
X_SENTIMENT_SINCE=1d                  # Search window (6h, 1d, 2d)
X_SENTIMENT_SORT_ORDER=relevancy      # or recency

# Analysis features
X_VELOCITY_SORT=true                  # Sort by engagement velocity
X_THREAD_AUTO_FETCH=true              # Auto-fetch detected threads
X_VOLUME_ANALYSIS=true                # Use counts endpoint
X_CONTRARIAN_WARNINGS=true            # Warn at sentiment extremes
X_ACCOUNT_DISCOVERY=true              # Flag emerging accounts

# Rate limiting
X_MAX_REQUESTS_PER_15M=400            # Stay under 450 limit
X_BACKOFF_BASE_MS=1000
X_BACKOFF_MAX_MS=60000

# Caching
X_CACHE_TTL_SEARCH_MS=900000          # 15 minutes
X_CACHE_TTL_SENTIMENT_MS=86400000     # 24 hours
X_CACHE_TTL_LIST_MEMBERS_MS=86400000  # 24 hours
```

### Default Config

```typescript
// constants/defaults.ts

export const DEFAULTS = {
  // Search
  maxResults: 100,
  sinceDefault: '1d',
  sortOrder: 'relevancy' as const,
  
  // Quality filter
  minFollowersQuality: 5000,
  minLikesQuality: 50,
  minImpressionsQuality: 5000,
  minFollowersFallback: 1000,
  minLikesFallback: 10,
  
  // Sentiment
  confidenceFloor: 40,
  softTierFloor: 25,
  bullBearThreshold: 0.15,
  minTweetsForConfidence: 3,
  engagementCap: 3,
  
  // Analysis
  velocitySortEnabled: true,
  threadAutoFetchEnabled: true,
  maxThreadsToFetch: 3,
  minRepliesForThread: 10,
  
  // Volume
  volumeAnalysisEnabled: true,
  spikeThreshold: 2.0,  // 2x average
  
  // Contrarian
  extremeBullishThreshold: 0.6,
  extremeBearishThreshold: -0.6,
  extremeConfidenceThreshold: 70,
  
  // Tiers
  tiers: {
    whale: 100_000,
    alpha: 25_000,
    quality: 5_000,
    emerging: 1_000
  }
};
```

---

## Caching Strategy

```typescript
/**
 * Cache Layers:
 * 
 * 1. In-memory (fast, loses on restart)
 * 2. File-based (persistent, .elizadb/plugin-x-research/)
 * 3. X API deduplication (24hr UTC window, server-side)
 */

// Cache TTLs
const CACHE_TTLS = {
  search: 15 * 60 * 1000,        // 15 min (fresh results)
  sentiment: 24 * 60 * 60 * 1000, // 24h (staggered refresh)
  listMembers: 24 * 60 * 60 * 1000, // 24h (rarely changes)
  userProfile: 60 * 60 * 1000,    // 1h
  thread: 60 * 60 * 1000,         // 1h
  counts: 5 * 60 * 1000           // 5 min (volume analysis)
};

// Cache keys
const CACHE_KEYS = {
  search: (query: string) => `x:search:${hash(query)}`,
  sentiment: (asset: string) => `x:sentiment:${asset}`,
  listMembers: (listId: string) => `x:list:${listId}:members`,
  user: (username: string) => `x:user:${username}`,
  thread: (tweetId: string) => `x:thread:${tweetId}`,
  counts: (query: string) => `x:counts:${hash(query)}`
};
```

---

## Rate Limiting

```typescript
/**
 * Rate Limit Strategy:
 * 
 * 1. Track limits per endpoint category
 * 2. Pre-check before request
 * 3. Exponential backoff on 429
 * 4. Respect X-Rate-Limit headers
 */

interface RateLimitBucket {
  endpoint: string;
  limit: number;
  remaining: number;
  resetAtMs: number;
}

// Endpoint categories
const RATE_LIMITS = {
  search: { limit: 450, window: 15 * 60 * 1000 },
  counts: { limit: 300, window: 15 * 60 * 1000 },
  tweets: { limit: 900, window: 15 * 60 * 1000 },
  users: { limit: 900, window: 15 * 60 * 1000 },
  followers: { limit: 15, window: 15 * 60 * 1000 },
  lists: { limit: 75, window: 15 * 60 * 1000 }
};

// Backoff
function backoffDelay(attempt: number, baseMs: number = 1000): number {
  return Math.min(
    baseMs * Math.pow(2, attempt) + Math.random() * 1000,
    60000
  );
}
```

---

## Testing

### Unit Tests

```typescript
// __tests__/velocityScorer.test.ts

describe('engagementVelocity', () => {
  it('scores recent tweets higher', () => {
    const recent = mockTweet({ likes: 100, createdAt: minutesAgo(30) });
    const old = mockTweet({ likes: 1000, createdAt: hoursAgo(24) });
    
    expect(engagementVelocity(recent)).toBeGreaterThan(
      engagementVelocity(old)
    );
  });
  
  it('handles edge case of very new tweet', () => {
    const veryNew = mockTweet({ likes: 10, createdAt: minutesAgo(5) });
    const velocity = engagementVelocity(veryNew);
    
    expect(velocity).toBeLessThan(1000); // Capped by min age
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/fullPipeline.test.ts

describe('Full X Research Pipeline', () => {
  it('produces ALOHA-style briefing', async () => {
    // Mock X API responses
    mockXApi.search.mockResolvedValue(mockSearchResults);
    mockXApi.counts.mockResolvedValue(mockCountsResults);
    
    const result = await xPulseAction.execute();
    
    expect(result.briefing).toContain('vibe');
    expect(result.velocityWinners.length).toBeGreaterThan(0);
    expect(result.savedPath).toMatch(/research-daily/);
  });
});
```

---

## Migration from plugin-vince

### Phase 1: Create Plugin (Week 1)
- [ ] Scaffold directory structure
- [ ] Copy `xResearch.service.ts` → `xSearch.service.ts`
- [ ] Copy `xSentiment.service.ts` → new location
- [ ] Copy `xSentimentLogic.ts` → `analysis/`
- [ ] Update imports

### Phase 2: Add Features (Week 2)
- [ ] Implement `velocityScorer.ts`
- [ ] Implement `topicCluster.ts`
- [ ] Implement `contrarianDetector.ts`
- [ ] Implement `volumeAnalyzer.ts`
- [ ] Add `X_PULSE` action

### Phase 3: Integration (Week 3)
- [ ] Create `xSentiment.provider.ts`
- [ ] Update plugin-vince signal aggregator to import from plugin-x-research
- [ ] Update ALOHA action to use `xVibe.provider.ts`
- [ ] Update OpenClaw cron job

### Phase 4: Deprecation (Week 4)
- [ ] Mark old services as deprecated
- [ ] Update documentation
- [ ] Remove old code after verification

---

## Examples

### Daily Pulse Output

```markdown
# X Pulse — Feb 12, 2026

Quiet morning on CT but something's brewing under the surface. BTC discourse 
is cautiously bullish with the usual suspects calling for 90k, but engagement 
is muted — posts that would normally get 500 likes are sitting at 150. ETH 
sentiment turned sharply negative overnight after that thread from @crediblecrypto 
about declining L2 activity got 2k likes in 3 hours.

The interesting stuff is in the weeds. Three separate threads about a new 
restaking protocol dropped in the last 6 hours, all from accounts I don't 
recognize but with solid engagement velocity. Worth watching. Meanwhile the 
AI agent discourse has cooled significantly — @shawmakesmagic's thread on 
ElizaOS V2 got attention but the replies are more skeptical than the usual 
cheerleading.

One thing that stands out: sentiment is bullish but volume is down 40% from 
yesterday. That divergence usually means either a slow bleed or a sharp move 
coming. The whales are quiet, the mids are posting, and the retail crowd is 
nowhere. Classic calm before something.

---
**Velocity Winners** (fastest-growing posts):
1. [@crediblecrypto](https://x.com/...) — ETH L2 analysis — 2.1k likes in 3h 🔥
2. [@inversebrah](https://x.com/...) — BTC funding rates — 890 likes in 2h

**Threads Worth Reading**:
- [ETH L2 Activity Declining](https://x.com/crediblecrypto/status/...)
- [New Restaking Protocol Deep Dive](https://x.com/...)

**Sources**: @crediblecrypto, @inversebrah, @shawmakesmagic, @colocho, @lightcrypto
```

---

## References

- [X API v2 Documentation](https://docs.x.com/x-api)
- [X TypeScript XDK](https://docs.x.com/xdks/typescript)
- [X API Pricing](https://docs.x.com/x-api/getting-started/pricing)
- [Search Operators](https://developer.x.com/en/docs/twitter-api/tweets/search/integrate/build-a-query)
- [Rate Limits](https://docs.x.com/fundamentals/rate-limits)
