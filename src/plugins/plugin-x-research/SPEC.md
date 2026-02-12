# Plugin X Research — Specification

**Status:** Proposed  
**Purpose:** Dedicated X/Twitter research and sentiment plugin for VINCE

## Why a Dedicated Plugin?

Current X functionality is spread across:
- `plugin-vince/services/xResearch.service.ts`
- `plugin-vince/services/xSentiment.service.ts`
- `plugin-vince/actions/xResearch.action.ts`
- `skills/x-research/` (OpenClaw skill)

A dedicated plugin would:
1. **Consolidate** all X logic in one place
2. **Leverage full X API v2** capabilities
3. **Cleaner separation** — VINCE consumes sentiment, plugin-x-research produces it
4. **Easier testing** — isolated from trading logic
5. **Reusable** — other agents (Eliza, Sentinel) can use it

---

## X API v2 Endpoints (from docs.x.com)

### Posts
| Endpoint | Use Case |
|----------|----------|
| `GET /2/tweets/search/recent` | Search recent posts (last 7 days) |
| `GET /2/tweets/counts/recent` | Count posts matching query (volume analysis) |
| `GET /2/tweets/:id` | Get single post details |
| `GET /2/tweets` | Get multiple posts by IDs |
| `GET /2/tweets/:id/quote_tweets` | Get quote tweets (gauge reactions) |
| `GET /2/tweets/:id/retweets` | Get retweets (spread analysis) |

### Users  
| Endpoint | Use Case |
|----------|----------|
| `GET /2/users/by/username/:username` | Get user by handle |
| `GET /2/users/by` | Get multiple users by usernames |
| `GET /2/users/:id/tweets` | User's recent posts |
| `GET /2/users/:id/mentions` | Who's mentioning this user |
| `GET /2/users/:id/followers` | Follower analysis |
| `GET /2/users/:id/following` | Who they follow (alpha discovery) |

### Lists
| Endpoint | Use Case |
|----------|----------|
| `GET /2/lists/:id` | Get list metadata |
| `GET /2/lists/:id/tweets` | Get posts from list members |
| `GET /2/lists/:id/members` | Get list members (quality accounts) |
| `GET /2/users/:id/owned_lists` | Lists a user owns |
| `GET /2/users/:id/list_memberships` | Lists a user is in |

### Spaces (Audio)
| Endpoint | Use Case |
|----------|----------|
| `GET /2/spaces/search` | Find spaces about topic |
| `GET /2/spaces/:id` | Space details |

---

## Proposed Structure

```
src/plugins/plugin-x-research/
├── src/
│   ├── index.ts                    # Plugin export
│   ├── services/
│   │   ├── xClient.service.ts      # Low-level X API client (auth, rate limits)
│   │   ├── xSearch.service.ts      # Search + counts + trending
│   │   ├── xSentiment.service.ts   # Sentiment analysis (keyword + LLM)
│   │   ├── xAccounts.service.ts    # User profiles, followers, discovery
│   │   ├── xLists.service.ts       # Curated lists, quality accounts
│   │   ├── xThreads.service.ts     # Thread detection + full fetch
│   │   └── xSpaces.service.ts      # Audio spaces discovery
│   ├── actions/
│   │   ├── xSearch.action.ts       # "search X for..."
│   │   ├── xVibe.action.ts         # ALOHA-style vibe check
│   │   ├── xAccount.action.ts      # "what's @user thinking"
│   │   ├── xThread.action.ts       # "get thread for..."
│   │   ├── xAlpha.action.ts        # "find alpha on X"
│   │   └── xPulse.action.ts        # Daily/scheduled briefing
│   ├── providers/
│   │   └── xSentiment.provider.ts  # Expose sentiment to other plugins
│   ├── analysis/
│   │   ├── velocityScorer.ts       # Engagement velocity (likes/hour)
│   │   ├── topicCluster.ts         # Group by emerging narratives
│   │   ├── contrarianDetector.ts   # Warn at sentiment extremes
│   │   ├── accountReputation.ts    # Tier accounts (whale/alpha/quality)
│   │   └── threadDetector.ts       # Identify thread starters
│   ├── constants/
│   │   ├── sentimentKeywords.ts    # Bullish/bearish/risk words
│   │   ├── qualityAccounts.ts      # Default VIP handles
│   │   └── endpoints.ts            # X API endpoint constants
│   ├── types/
│   │   └── index.ts                # XTweet, XUser, XSentiment, etc.
│   └── __tests__/
│       ├── xSearch.test.ts
│       ├── xSentiment.test.ts
│       └── velocityScorer.test.ts
└── README.md
```

---

## Key Features

### 1. Engagement Velocity Scoring
```typescript
// Sort by likes/hour, not raw likes
function engagementVelocity(tweet: XTweet): number {
  const ageHours = (Date.now() - new Date(tweet.created_at).getTime()) / 3_600_000;
  return tweet.metrics.likes / Math.max(0.5, ageHours);
}
```

### 2. Thread Detection & Deep Dive
```typescript
// Detect thread starters and auto-fetch
async function detectAndFetchThreads(tweets: XTweet[]): Promise<XThread[]> {
  const starters = tweets.filter(t => 
    t.metrics.replies > 10 && t.conversation_id === t.id
  );
  return Promise.all(starters.slice(0, 3).map(t => this.getThread(t.id)));
}
```

### 3. Volume Analysis (New!)
```typescript
// Use counts endpoint for volume trends
async function getVolumeTrend(query: string): Promise<VolumeTrend> {
  const counts = await this.client.posts.getCountsRecent(query, {
    granularity: "hour"
  });
  // Detect spikes: current hour vs 24h average
  return analyzeVolumeTrend(counts.data);
}
```

### 4. Account Reputation Tiers
```typescript
const TIERS = {
  whale: { minFollowers: 100_000, weight: 3.0 },
  alpha: { minFollowers: 25_000, weight: 2.0 },
  quality: { minFollowers: 5_000, weight: 1.0 },
  emerging: { minFollowers: 1_000, weight: 0.5 },
};
```

### 5. Contrarian Signals
```typescript
function detectContrarian(sentiment: number, confidence: number): Warning | null {
  if (sentiment > 0.6 && confidence > 70) 
    return { type: "extreme_bullish", message: "Historically precedes pullbacks" };
  if (sentiment < -0.6 && confidence > 70)
    return { type: "extreme_fear", message: "Contrarian buy signal?" };
  return null;
}
```

### 6. Smart Account Discovery
```typescript
// Track high-engagement accounts not in quality list
async function discoverAccounts(tweets: XTweet[]): Promise<AccountDiscovery[]> {
  const engagement = aggregateByAuthor(tweets);
  return engagement
    .filter(a => a.total > 500 && !this.isInQualityList(a.username))
    .map(a => ({ username: a.username, engagement: a.total, suggestion: "add to quality list" }));
}
```

---

## Integration with VINCE

### Signal Aggregator
```typescript
// plugin-vince consumes XSentiment from plugin-x-research
import { XSentimentProvider } from "@vince/plugin-x-research";

// In signal aggregator
const xSentiment = await xSentimentProvider.getTradingSentiment(asset);
if (xSentiment.confidence >= 40) {
  signals.push({ source: "XSentiment", ...xSentiment });
}
```

### Daily Cron
```typescript
// OpenClaw cron uses X_PULSE action
"Run X_PULSE for daily briefing → saves to knowledge/research-daily/"
```

---

## Config (env)

```bash
# Required
X_BEARER_TOKEN=xxx

# Optional
X_BEARER_TOKEN_SENTIMENT=xxx     # Second token for background
X_RESEARCH_QUALITY_LIST_ID=xxx   # Curated list ID
X_SENTIMENT_ASSETS=BTC,ETH,SOL,HYPE
X_SENTIMENT_STAGGER_INTERVAL_MS=3600000
X_SENTIMENT_CONFIDENCE_FLOOR=40
X_VELOCITY_SORT=true             # Sort by engagement velocity
X_THREAD_AUTO_FETCH=true         # Auto-fetch detected threads
X_VOLUME_ANALYSIS=true           # Use counts endpoint
```

---

## Migration Path

1. **Phase 1**: Create plugin structure, copy existing xResearch/xSentiment services
2. **Phase 2**: Add new features (velocity, threads, volume, contrarian)
3. **Phase 3**: Update plugin-vince to import from plugin-x-research
4. **Phase 4**: Deprecate old services in plugin-vince
5. **Phase 5**: Update OpenClaw cron to use new actions

---

## References

- X API v2 Docs: https://docs.x.com/x-api
- XDK (TypeScript): https://docs.x.com/xdks/typescript
- Posts Search: https://docs.x.com/x-api/posts/search-recent-posts
- Counts: https://docs.x.com/x-api/posts/get-count-of-recent-posts
- Users: https://docs.x.com/x-api/users
- Lists: https://docs.x.com/x-api/lists
