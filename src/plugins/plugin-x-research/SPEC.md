# Plugin X Research — Full Specification v2

**Version:** 2.0.0  
**Status:** Specification Complete  
**Last Updated:** 2026-02-12

---

## 🎯 North Star

> **ALOHA for X** — One action that delivers sentiment and alpha around the topics we care about, written like a smart friend texting you about what's happening on CT.

Just like `VINCE_ALOHA` gives you the daily market vibe, `X_PULSE` gives you the X/Twitter vibe for our focus areas:

```
"What's CT saying about BTC today?"
→ Bullish sentiment (72% confidence), 3 threads worth reading,
  @crediblecrypto's take on ETF flows hit 2k likes in 2 hours,
  whale accounts quiet, retail is fading. Classic divergence setup.
```

---

## 📌 Topics We Care About

From the VINCE README — these are our focus areas:

### Core Assets (Paper Trading)
| Asset | Why |
|-------|-----|
| **BTC** | Primary trading asset, market leader |
| **ETH** | L2 activity, DeFi backbone |
| **SOL** | Meme season, speed narrative |
| **HYPE** | Our ecosystem token |

### Trading Intelligence
| Topic | Why |
|-------|-----|
| **Perps & Funding** | Crowded longs/shorts, liquidation cascades |
| **Options & DVOL** | IV, put/call ratios, whale positioning |
| **Whale Moves** | Smart money flows, large transfers |
| **Liquidations** | Cascade detection, pain points |

### Ecosystem
| Topic | Why |
|-------|-----|
| **ElizaOS** | Our framework, community, releases |
| **AI Agents** | Industry trends, competitors |
| **DeFi** | Yields, protocols, exploits |
| **Memes** | Early detection, lifecycle |

### Meta
| Topic | Why |
|-------|-----|
| **Macro** | FOMC, CPI, risk-on/risk-off |
| **Regulatory** | SEC, legislation, enforcement |
| **Hacks/Exploits** | Risk events, security |

---

## 🔥 X API v2 — Full Endpoint Coverage

### NEW: News API (Game Changer!)

```
GET /2/news/search
GET /2/news/:id
```

**What it returns:**
```json
{
  "name": "BTC ETF Sees Record Inflows",
  "summary": "Bitcoin ETFs recorded $1.2B in inflows...",
  "hook": "The biggest single-day inflow since launch",
  "contexts": {
    "finance": { "tickers": ["BTC", "IBIT", "GBTC"] },
    "topics": ["Cryptocurrency", "ETF"],
    "entities": {
      "organizations": ["BlackRock", "Fidelity"],
      "people": ["Larry Fink"]
    }
  },
  "cluster_posts_results": [
    { "post_id": "1989409257394245835" },
    { "post_id": "1989410019562197162" }
  ]
}
```

**Why it's gold:**
- Pre-structured news with Grok summaries
- **finance.tickers** — filter for crypto/stocks we care about
- **cluster_posts_results** — the actual tweets driving the story
- No need to parse sentiment from raw tweets for news

### NEW: Personalized Trends API

```
GET /2/users/personalized_trends
```

**What it returns:**
```json
{
  "data": [
    { "trend_name": "#Bitcoin", "post_count": 125000, "category": "Finance" },
    { "trend_name": "ETH", "post_count": 85000, "category": "Crypto" }
  ]
}
```

**Why it matters:**
- Volume numbers (post_count) for trending topics
- Category filtering
- Detect when our topics are trending

### Lists API (Quality-First Approach)

```
GET /2/lists/:id              # List metadata
GET /2/lists/:id/tweets       # Posts from list members
GET /2/lists/:id/members      # Quality accounts
```

**Our approach:**
1. Create curated X list with 50-100 quality crypto accounts
2. Set `X_RESEARCH_QUALITY_LIST_ID` to that list
3. Weight posts from list members higher
4. Use list feed as primary source, search as supplement

### Posts API (Search & Analysis)

```
GET /2/tweets/search/recent   # Search last 7 days
GET /2/tweets/counts/recent   # Volume by hour/day (spike detection)
GET /2/tweets/:id             # Single post
GET /2/tweets                 # Multiple posts by ID
GET /2/tweets/:id/quote_tweets    # Reactions
GET /2/tweets/:id/retweeted_by    # Spread
```

### Users API (Account Analysis)

```
GET /2/users/by/username/:username   # Profile
GET /2/users/:id/tweets              # Timeline
GET /2/users/:id/mentions            # Who's mentioning
GET /2/users/:id/followers           # Follower analysis (rate limited)
GET /2/users/:id/following           # Alpha discovery (rate limited)
```

### Spaces API (Future)

```
GET /2/spaces/search          # Find spaces about topic
GET /2/spaces/:id             # Space details
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         plugin-x-research                                    │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                        🎯 X_PULSE (North Star)                         ║  │
│  ║  ALOHA-style briefing: sentiment + alpha + threads + warnings          ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐          ┌─────────────┐           ┌─────────────┐        │
│  │  xNews      │          │ xSentiment  │           │  xAlpha     │        │
│  │  Service    │          │  Service    │           │  Service    │        │
│  │             │          │             │           │             │        │
│  │ • News API  │          │ • Keywords  │           │ • Velocity  │        │
│  │ • Tickers   │          │ • Tiers     │           │ • Threads   │        │
│  │ • Summaries │          │ • Contrarian│           │ • Discovery │        │
│  └─────────────┘          └─────────────┘           └─────────────┘        │
│         │                          │                          │             │
│         └──────────────────────────┼──────────────────────────┘             │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         xClient Service                                │  │
│  │  Auth • Rate Limits • Request Queue • Caching • Error Handling        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────┬─────────┬─────────┬───┴───┬─────────┬─────────┬─────────┐     │
│  │ Search  │ Counts  │  News   │ Trends│  Lists  │  Users  │ Threads │     │
│  └─────────┴─────────┴─────────┴───────┴─────────┴─────────┴─────────┘     │
│                              X API v2                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/plugins/plugin-x-research/
├── src/
│   ├── index.ts
│   │
│   ├── services/
│   │   ├── xClient.service.ts       # Core API client (auth, rate limits)
│   │   ├── xNews.service.ts         # 🆕 News API (summaries, tickers)
│   │   ├── xTrends.service.ts       # 🆕 Personalized trends
│   │   ├── xSearch.service.ts       # Search + counts
│   │   ├── xSentiment.service.ts    # Trading sentiment
│   │   ├── xLists.service.ts        # Curated quality accounts
│   │   ├── xAccounts.service.ts     # User profiles, discovery
│   │   ├── xThreads.service.ts      # Thread detection + fetch
│   │   └── xAlpha.service.ts        # Alpha aggregation
│   │
│   ├── actions/
│   │   ├── xPulse.action.ts         # 🎯 North Star — ALOHA for X
│   │   ├── xNews.action.ts          # "crypto news on X"
│   │   ├── xVibe.action.ts          # Quick sentiment check
│   │   ├── xSearch.action.ts        # Manual search
│   │   ├── xThread.action.ts        # Get thread
│   │   └── xAccount.action.ts       # Account analysis
│   │
│   ├── providers/
│   │   ├── xSentiment.provider.ts   # For VINCE signal aggregator
│   │   ├── xNews.provider.ts        # For VINCE news sentiment
│   │   └── xVibe.provider.ts        # For VINCE ALOHA
│   │
│   ├── analysis/
│   │   ├── velocityScorer.ts        # Engagement velocity (likes/hour)
│   │   ├── topicCluster.ts          # Emerging narratives
│   │   ├── contrarianDetector.ts    # Extreme sentiment warnings
│   │   ├── accountReputation.ts     # Whale/alpha/quality tiers
│   │   ├── threadDetector.ts        # Thread identification
│   │   ├── volumeAnalyzer.ts        # Spike detection (counts API)
│   │   └── newsAnalyzer.ts          # 🆕 News relevance scoring
│   │
│   ├── constants/
│   │   ├── topics.ts                # Topics we care about
│   │   ├── sentimentKeywords.ts     # Bullish/bearish/risk
│   │   ├── qualityAccounts.ts       # Default VIP handles
│   │   └── endpoints.ts             # X API URLs
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── tweet.types.ts
│   │   ├── news.types.ts            # 🆕 XNews types
│   │   ├── trends.types.ts          # 🆕 XTrend types
│   │   ├── sentiment.types.ts
│   │   └── analysis.types.ts
│   │
│   └── __tests__/
│
└── README.md
```

---

## 🆕 Services

### xNews.service.ts (NEW!)

```typescript
/**
 * X News Service
 * 
 * Leverages the new News API for structured crypto/finance news.
 * Returns Grok-generated summaries with ticker extraction.
 * 
 * Endpoints:
 * - GET /2/news/search
 * - GET /2/news/:id
 */

export interface XNewsService {
  // Search news by query
  searchNews(query: string, options?: NewsSearchOptions): Promise<XNewsResult[]>;
  
  // Get news by ID (with full details)
  getNews(newsId: string): Promise<XNewsItem>;
  
  // Get news for our focus tickers
  getTickerNews(tickers: string[]): Promise<XNewsResult[]>;
  
  // Get crypto-specific news
  getCryptoNews(options?: CryptoNewsOptions): Promise<XNewsResult[]>;
  
  // Get posts that drove a news story
  getNewsClusterPosts(newsId: string): Promise<XTweet[]>;
}

interface XNewsItem {
  id: string;
  name: string;                  // Headline
  summary: string;               // Grok-generated summary
  hook: string;                  // Attention-grabbing one-liner
  category: string;
  
  contexts: {
    finance: {
      tickers: string[];         // BTC, ETH, NVDA, etc.
    };
    topics: string[];            // Cryptocurrency, ETF, etc.
    entities: {
      organizations: string[];   // BlackRock, SEC, etc.
      people: string[];          // Vitalik, CZ, etc.
      events: string[];
      places: string[];
    };
  };
  
  clusterPostIds: string[];      // Tweet IDs driving the story
  lastUpdatedAt: number;
  disclaimer: string;
}

interface XNewsResult extends XNewsItem {
  relevanceScore: number;        // How relevant to our topics (0-100)
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impactLevel: 'high' | 'medium' | 'low';
}

// Filter news for our focus areas
const FOCUS_TICKERS = ['BTC', 'ETH', 'SOL', 'HYPE'];
const FOCUS_TOPICS = ['Cryptocurrency', 'DeFi', 'NFT', 'AI', 'Blockchain'];
const FOCUS_ORGS = ['SEC', 'Binance', 'Coinbase', 'BlackRock', 'Fidelity'];
```

### xTrends.service.ts (NEW!)

```typescript
/**
 * X Trends Service
 * 
 * Personalized trends with volume data.
 * 
 * Endpoint:
 * - GET /2/users/personalized_trends
 */

export interface XTrendsService {
  // Get personalized trends
  getTrends(): Promise<XTrend[]>;
  
  // Filter for crypto/finance trends
  getCryptoTrends(): Promise<XTrend[]>;
  
  // Check if our topics are trending
  getOurTopicsTrending(): Promise<TrendingTopicStatus[]>;
  
  // Volume comparison
  getTrendVolume(topic: string): Promise<TrendVolume>;
}

interface XTrend {
  trendName: string;
  postCount: number;
  category?: string;
  trendingSince?: string;
}

interface TrendingTopicStatus {
  topic: string;                 // BTC, ETH, ElizaOS, etc.
  isTrending: boolean;
  postCount?: number;
  rank?: number;                 // Position in trends
}

interface TrendVolume {
  topic: string;
  current: number;
  avg24h: number;
  percentChange: number;
  isSpike: boolean;
}
```

### xLists.service.ts (Quality-First)

```typescript
/**
 * X Lists Service
 * 
 * Curated lists are our primary source of quality content.
 * Search is supplementary.
 * 
 * Strategy:
 * 1. Maintain a curated list of 50-100 quality crypto accounts
 * 2. Fetch list posts first (high signal)
 * 3. Use search to fill gaps or check specific queries
 * 4. Weight list members higher in sentiment calculation
 */

export interface XListsService {
  // Get list metadata
  getList(listId: string): Promise<XList>;
  
  // Get recent posts from list (primary content source!)
  getListPosts(listId: string, options?: ListPostsOptions): Promise<XTweet[]>;
  
  // Get list members (our quality account set)
  getListMembers(listId: string): Promise<XUser[]>;
  
  // Check if account is in quality list
  isQualityAccount(username: string): boolean;
  
  // Get quality account set (cached)
  getQualityAccounts(): Promise<QualityAccountSet>;
  
  // Filter tweets to quality authors only
  filterToQualityAuthors(tweets: XTweet[]): XTweet[];
}

interface ListPostsOptions {
  maxResults?: number;           // Up to 100
  sinceId?: string;
  untilId?: string;
  excludeReplies?: boolean;
  excludeRetweets?: boolean;
}

// Our curated list approach
const QUALITY_LIST_STRATEGY = `
1. Create X list: "VINCE Alpha Sources"
2. Add accounts: @crediblecrypto, @lightcrypto, @cobie, @inversebrah, etc.
3. Set X_RESEARCH_QUALITY_LIST_ID=<list_id>
4. Plugin fetches list posts → high-signal content
5. Supplement with search for specific queries
`;
```

### xAlpha.service.ts (Alpha Aggregation)

```typescript
/**
 * X Alpha Service
 * 
 * Aggregates alpha from all sources:
 * - News API (structured news with tickers)
 * - List posts (curated accounts)
 * - Search (specific queries)
 * - Trends (what's hot)
 * 
 * Applies analysis:
 * - Engagement velocity (what's going viral NOW)
 * - Thread detection (where's the deep alpha)
 * - Account tiers (weight whales higher)
 * - Contrarian signals (extreme sentiment warnings)
 */

export interface XAlphaService {
  // Main alpha aggregation
  getAlpha(options?: AlphaOptions): Promise<XAlphaResult>;
  
  // Alpha for specific asset
  getAssetAlpha(asset: string): Promise<AssetAlpha>;
  
  // Get velocity winners (fastest-growing posts)
  getVelocityWinners(count?: number): Promise<VelocityWinner[]>;
  
  // Get threads worth reading
  getAlphaThreads(): Promise<XThread[]>;
  
  // Get emerging accounts to watch
  getEmergingAccounts(): Promise<AccountDiscovery[]>;
}

interface XAlphaResult {
  // Top-level summary
  summary: {
    overallVibe: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    confidence: number;
    topNarratives: string[];
    warnings: ContrarianWarning[];
  };
  
  // By source
  news: XNewsResult[];           // From News API
  listPosts: XTweet[];           // From curated list
  trending: XTrend[];            // From Trends API
  
  // Analysis
  velocityWinners: VelocityWinner[];
  threads: XThread[];
  emergingAccounts: AccountDiscovery[];
  topicClusters: TopicCluster[];
  
  // For trading
  assetSentiments: Map<string, XTradingSentiment>;
}

interface AlphaOptions {
  assets?: string[];             // Focus assets (default: BTC,ETH,SOL,HYPE)
  includeNews?: boolean;         // Use News API
  includeTrends?: boolean;       // Use Trends API
  includeList?: boolean;         // Use curated list
  includeSearch?: boolean;       // Use search
  timeWindow?: string;           // '1h', '6h', '24h'
}
```

---

## 🎯 Actions

### X_PULSE (North Star Action)

```typescript
/**
 * X_PULSE — ALOHA for X
 * 
 * The north star action. Delivers sentiment and alpha around our
 * focus topics, written like VINCE's ALOHA.
 * 
 * Triggers:
 * - "X pulse"
 * - "what's CT saying"
 * - "crypto twitter vibe"
 * - "X sentiment"
 * - (scheduled via daily cron)
 * 
 * Output: ALOHA-style briefing (300-500 words)
 */

name: "X_PULSE"
similes: ["CT_PULSE", "TWITTER_VIBE", "X_SENTIMENT", "CRYPTO_TWITTER"]

// Pipeline:
// 1. Fetch news (News API) → filter for our tickers
// 2. Fetch list posts (curated accounts) → sentiment + velocity
// 3. Check trends (Trends API) → what's hot
// 4. Search (specific queries) → fill gaps
// 5. Analyze (velocity, threads, contrarian)
// 6. Generate ALOHA-style narrative

// Output format:
interface XPulseOutput {
  briefing: string;              // ALOHA-style narrative
  
  // Structured data
  sentiment: {
    overall: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    confidence: number;
    byAsset: Map<string, number>;
  };
  
  news: XNewsResult[];           // Top 3 relevant news
  velocityWinners: VelocityWinner[];  // Top 3 fast-movers
  threads: XThread[];            // Top 2 threads to read
  warnings: ContrarianWarning[]; // Extreme sentiment alerts
  accountsToWatch: string[];     // Emerging accounts
  
  // Meta
  savedPath: string;             // knowledge/research-daily/...
}
```

### X_NEWS (News Focus)

```typescript
/**
 * X_NEWS — Crypto News from X
 * 
 * Triggers:
 * - "crypto news on X"
 * - "X news about BTC"
 * - "what's the news on Twitter"
 */

name: "X_NEWS"
similes: ["CRYPTO_NEWS", "TWITTER_NEWS"]

// Uses News API directly
// Filters for our focus tickers and topics
// Returns structured news with summaries
```

### X_VIBE (Quick Check)

```typescript
/**
 * X_VIBE — Quick Sentiment Check
 * 
 * Triggers:
 * - "BTC vibe on X"
 * - "what's CT saying about ETH"
 * - "SOL sentiment"
 */

name: "X_VIBE"
similes: ["CT_VIBE", "QUICK_SENTIMENT"]

// Fast sentiment for specific asset
// Returns: direction, confidence, top posts
```

---

## 🔬 Analysis Modules

### newsAnalyzer.ts (NEW!)

```typescript
/**
 * News Analyzer
 * 
 * Scores news relevance to our focus areas.
 */

export function scoreNewsRelevance(news: XNewsItem): number {
  let score = 0;
  
  // Ticker match (highest weight)
  const ourTickers = ['BTC', 'ETH', 'SOL', 'HYPE'];
  const tickerMatches = news.contexts.finance.tickers
    .filter(t => ourTickers.includes(t)).length;
  score += tickerMatches * 30;
  
  // Topic match
  const ourTopics = ['Cryptocurrency', 'DeFi', 'Blockchain', 'AI'];
  const topicMatches = news.contexts.topics
    .filter(t => ourTopics.includes(t)).length;
  score += topicMatches * 20;
  
  // Organization match
  const relevantOrgs = ['SEC', 'Binance', 'Coinbase', 'BlackRock', 'Fidelity'];
  const orgMatches = news.contexts.entities.organizations
    .filter(o => relevantOrgs.includes(o)).length;
  score += orgMatches * 15;
  
  // Keywords in summary
  const keywords = ['ETF', 'regulation', 'whale', 'hack', 'exploit', 'airdrop'];
  const keywordMatches = keywords
    .filter(k => news.summary.toLowerCase().includes(k)).length;
  score += keywordMatches * 10;
  
  return Math.min(100, score);
}

export function extractNewsSentiment(news: XNewsItem): 'bullish' | 'bearish' | 'neutral' {
  const text = `${news.name} ${news.summary} ${news.hook}`.toLowerCase();
  
  const bullishWords = ['surge', 'soar', 'rally', 'bullish', 'inflow', 'adoption', 'approval'];
  const bearishWords = ['plunge', 'crash', 'bearish', 'outflow', 'reject', 'hack', 'exploit'];
  
  const bullCount = bullishWords.filter(w => text.includes(w)).length;
  const bearCount = bearishWords.filter(w => text.includes(w)).length;
  
  if (bullCount > bearCount + 1) return 'bullish';
  if (bearCount > bullCount + 1) return 'bearish';
  return 'neutral';
}
```

### velocityScorer.ts

```typescript
/**
 * Engagement Velocity Scorer
 * 
 * 100 likes in 1 hour > 1000 likes from yesterday
 */

export function engagementVelocity(tweet: XTweet): number {
  const ageMs = Date.now() - new Date(tweet.created_at).getTime();
  const ageHours = Math.max(0.5, ageMs / 3_600_000);
  
  const likes = tweet.metrics.likes;
  const retweets = tweet.metrics.retweets * 2;
  const quotes = tweet.metrics.quotes * 3;  // Quotes = high engagement
  
  return (likes + retweets + quotes) / ageHours;
}

export interface VelocityWinner {
  tweet: XTweet;
  velocity: number;
  ageHours: number;
  label: string;                 // "2.1k likes in 2h 🔥"
  why: string;                   // "Thread on ETF flows"
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
  type: 'extreme_bullish' | 'extreme_bearish' | 'divergence' | 'whale_silence';
  asset?: string;
  message: string;
  severity: 'info' | 'warning' | 'alert';
}

export function detectContrarian(
  sentiment: XTradingSentiment,
  priceChange?: number
): ContrarianWarning | null {
  // Extreme bullish
  if (sentiment.score > 0.6 && sentiment.confidence > 70) {
    return {
      type: 'extreme_bullish',
      asset: sentiment.asset,
      message: `⚠️ Extreme bullish sentiment on ${sentiment.asset}. Historically precedes pullbacks.`,
      severity: 'warning'
    };
  }
  
  // Extreme bearish
  if (sentiment.score < -0.6 && sentiment.confidence > 70) {
    return {
      type: 'extreme_bearish',
      asset: sentiment.asset,
      message: `🔄 Extreme fear on ${sentiment.asset}. Contrarian buy signal?`,
      severity: 'info'
    };
  }
  
  // Divergence: bullish sentiment + falling price
  if (priceChange !== undefined && sentiment.score > 0.4 && priceChange < -5) {
    return {
      type: 'divergence',
      asset: sentiment.asset,
      message: `${sentiment.asset}: Bullish CT but price down ${priceChange.toFixed(1)}%. Watch for trap.`,
      severity: 'warning'
    };
  }
  
  return null;
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

export const TIER_CONFIG = {
  whale:    { minFollowers: 100_000, weight: 3.0, emoji: '🐋' },
  alpha:    { minFollowers: 25_000,  weight: 2.0, emoji: '⭐' },
  quality:  { minFollowers: 5_000,   weight: 1.0, emoji: '✓' },
  emerging: { minFollowers: 1_000,   weight: 0.5, emoji: '📈' },
  unknown:  { minFollowers: 0,       weight: 0.25, emoji: '?' }
};

export function getAccountTier(followers?: number): AccountTier {
  if (!followers) return 'unknown';
  if (followers >= 100_000) return 'whale';
  if (followers >= 25_000) return 'alpha';
  if (followers >= 5_000) return 'quality';
  if (followers >= 1_000) return 'emerging';
  return 'unknown';
}
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Required
X_BEARER_TOKEN=xxx                       # Primary API token

# Quality List (Primary content source!)
X_RESEARCH_QUALITY_LIST_ID=xxx           # Your curated list ID
SOLUS_X_VIP_HANDLES=user1,user2,user3    # Additional VIP handles

# Optional: Second token for background
X_BEARER_TOKEN_SENTIMENT=xxx

# Focus topics (what we care about)
X_FOCUS_TICKERS=BTC,ETH,SOL,HYPE
X_FOCUS_TOPICS=Cryptocurrency,DeFi,AI,Blockchain

# Sentiment
X_SENTIMENT_CONFIDENCE_FLOOR=40
X_SENTIMENT_STAGGER_INTERVAL_MS=3600000

# Features
X_NEWS_ENABLED=true                      # Use News API
X_TRENDS_ENABLED=true                    # Use Trends API
X_VELOCITY_SORT=true                     # Sort by engagement velocity
X_THREAD_AUTO_FETCH=true                 # Auto-fetch detected threads
X_CONTRARIAN_WARNINGS=true               # Warn at extremes

# Caching
X_CACHE_TTL_NEWS_MS=300000               # 5 min (news changes fast)
X_CACHE_TTL_TRENDS_MS=300000             # 5 min
X_CACHE_TTL_SEARCH_MS=900000             # 15 min
X_CACHE_TTL_LIST_MS=900000               # 15 min
```

### constants/topics.ts

```typescript
/**
 * Topics We Care About
 * 
 * These drive:
 * - News API filtering
 * - Search queries
 * - Relevance scoring
 */

export const FOCUS_AREAS = {
  // Core assets we trade
  tickers: ['BTC', 'ETH', 'SOL', 'HYPE'],
  
  // Topics for news/trends filtering
  topics: [
    'Cryptocurrency',
    'DeFi',
    'NFT',
    'AI',
    'Blockchain',
    'Trading'
  ],
  
  // Keywords for search
  keywords: {
    trading: ['perps', 'funding', 'liquidation', 'whale', 'options', 'DVOL'],
    ecosystem: ['ElizaOS', 'AI agents', 'elizaos'],
    defi: ['yield', 'airdrop', 'protocol', 'TVL'],
    risk: ['hack', 'exploit', 'rug', 'scam', 'SEC', 'regulation']
  },
  
  // Organizations to track
  organizations: [
    'SEC',
    'Binance',
    'Coinbase',
    'BlackRock',
    'Fidelity',
    'Grayscale'
  ]
};

// Default search queries for daily pulse
export const PULSE_QUERIES = [
  '"ElizaOS" OR "@elizaos"',
  '$BTC alpha -is:retweet min_faves:20',
  '$ETH alpha -is:retweet min_faves:20',
  '"AI agents" crypto -is:retweet',
  'onchain alpha min_faves:30'
];
```

---

## 📤 Providers (for plugin-vince)

### xSentiment.provider.ts

```typescript
/**
 * X Sentiment Provider
 * 
 * Used by plugin-vince signal aggregator.
 */

export const xSentimentProvider = {
  name: "X_SENTIMENT_PROVIDER",
  
  async getTradingSentiment(asset: string): Promise<TradingSignal> {
    const sentiment = await xSentimentService.getAssetSentiment(asset);
    
    return {
      source: "XSentiment",
      direction: sentiment.direction,
      strength: sentiment.strength,
      confidence: sentiment.confidence,
      factors: [{
        name: "X Sentiment",
        value: sentiment.score,
        explanation: buildExplanation(sentiment)
      }],
      warnings: sentiment.contrarianWarning 
        ? [sentiment.contrarianWarning.message] 
        : []
    };
  }
};
```

### xNews.provider.ts

```typescript
/**
 * X News Provider
 * 
 * Used by plugin-vince for news sentiment integration.
 */

export const xNewsProvider = {
  name: "X_NEWS_PROVIDER",
  
  async getRelevantNews(): Promise<XNewsResult[]> {
    return xNewsService.getCryptoNews({
      tickers: FOCUS_AREAS.tickers,
      maxResults: 10
    });
  },
  
  async getTickerNews(ticker: string): Promise<XNewsResult[]> {
    return xNewsService.getTickerNews([ticker]);
  }
};
```

---

## 📊 Example Output

### X_PULSE Daily Briefing

```markdown
# X Pulse — Feb 12, 2026

CT is cautiously optimistic this morning but the volume tells a different story. 
BTC sentiment sits at 68% bullish, mostly driven by ETF flow discourse — 
@BitcoinMagazine's thread on BlackRock inflows hit 3k likes in 4 hours and the 
replies are uncharacteristically measured. ETH is where the real action is: three 
separate threads about declining L2 activity dropped overnight, and @crediblecrypto's 
take at 2.1k likes is the one everyone's quoting.

The News API caught something interesting — a structured story about Nebius/Meta 
GPU deals that's tangentially connected to AI compute narratives. Not directly 
crypto but the infrastructure angle is worth tracking.

Whale accounts are quiet. Like, suspiciously quiet. When @cobie and @lightcrypto 
go radio silent for 48 hours while retail is euphoric, that's usually a tell. 
SOL meme discourse has cooled significantly — engagement down 40% from last week. 
Either the rotation is real or everyone's waiting for the next catalyst.

One flag: BTC sentiment is bullish but OI is flat and funding is neutral. 
That divergence plus whale silence = I'd be careful about new longs here.

---

**🔥 Velocity Winners:**
1. [@crediblecrypto](link) — ETH L2 analysis — 2.1k likes in 4h
2. [@inversebrah](link) — BTC funding take — 890 likes in 2h
3. [@shawmakesmagic](link) — ElizaOS V2 thread — 650 likes in 3h

**📰 News:**
- "BlackRock ETF Sees $400M Single-Day Inflow" (bullish, BTC)
- "SEC Delays Decision on ETH ETF Options" (neutral, ETH)

**📖 Threads:**
- [ETH L2 Activity Deep Dive](link) — @crediblecrypto
- [ElizaOS V2 Roadmap](link) — @shawmakesmagic

**⚠️ Warnings:**
- Whale accounts silent 48h (unusual)
- BTC bullish sentiment + flat OI divergence

**Sources:** @crediblecrypto, @inversebrah, @shawmakesmagic, @BitcoinMagazine
```

---

## 🚀 Implementation Priority

### Phase 1: Core (Week 1)
- [ ] `xClient.service.ts` — auth, rate limits, caching
- [ ] `xNews.service.ts` — News API integration
- [ ] `xLists.service.ts` — curated list as primary source
- [ ] `xSearch.service.ts` — search fallback

### Phase 2: Analysis (Week 2)
- [ ] `velocityScorer.ts`
- [ ] `accountReputation.ts`
- [ ] `newsAnalyzer.ts`
- [ ] `contrarianDetector.ts`

### Phase 3: Actions (Week 3)
- [ ] `X_PULSE` — north star action
- [ ] `X_NEWS` — news focused
- [ ] `X_VIBE` — quick sentiment

### Phase 4: Integration (Week 4)
- [ ] Providers for plugin-vince
- [ ] OpenClaw cron job update
- [ ] Migrate from old xResearch/xSentiment

---

## 📚 X API References

- [News API](https://docs.x.com/x-api/news/introduction)
- [Personalized Trends](https://docs.x.com/x-api/trends/personalized-trends/introduction)
- [Lists](https://docs.x.com/x-api/lists)
- [Posts Search](https://docs.x.com/x-api/posts/search-recent-posts)
- [Posts Counts](https://docs.x.com/x-api/posts/get-count-of-recent-posts)
- [Users](https://docs.x.com/x-api/users)
- [Pricing](https://docs.x.com/x-api/getting-started/pricing)
