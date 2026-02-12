# X Research Improvements

Analysis of current `plugin-vince` X research capabilities and opportunities.

## Current Capabilities

### What's Working
- **VinceXResearchService**: Full X API v2 wrapper (search, profile, thread, lists)
- **VinceXSentimentService**: Trading sentiment (bullish/bearish/neutral + confidence)
- **Quality filtering**: 5K+ followers OR 50+ likes OR 5K+ impressions
- **Curated lists**: `X_RESEARCH_QUALITY_LIST_ID` + `SOLUS_X_VIP_HANDLES`
- **ALOHA-style briefings**: LLM generates narrative from tweet samples
- **Signal aggregator integration**: XSentiment feeds paper trading (weight 0.5)
- **Staggered refresh**: One asset per hour to manage API costs
- **24hr deduplication**: Same posts don't double-charge

### Config Knobs
- `X_SENTIMENT_ASSETS`: Which tickers to track (default: BTC,ETH,SOL,HYPE)
- `X_SENTIMENT_SINCE`: Time window (6h, 1d, 2d)
- `X_SENTIMENT_SORT_ORDER`: relevancy or recency
- `X_SENTIMENT_CONFIDENCE_FLOOR`: Min confidence to contribute (default: 40)
- `X_RESEARCH_QUALITY_LIST_ID`: Curated X list for quality accounts
- `SOLUS_X_VIP_HANDLES`: Additional VIP handles (comma-separated)

---

## Improvement Ideas

### 1. **Thread Detection & Deep Dive** (High Impact)
**Problem**: Current search returns individual tweets, but alpha often lives in threads.

**Solution**:
```typescript
// After search, detect high-engagement tweets that are thread starters
const threadStarters = tweets.filter(t => 
  t.metrics.replies > 10 && 
  t.conversation_id === t.id
);
// Auto-fetch full thread for top 2-3 thread starters
for (const starter of threadStarters.slice(0, 3)) {
  const thread = await xResearch.getThread(starter.id);
  // Include thread summary in briefing
}
```
**Benefit**: Capture multi-tweet alpha that gets missed by single-tweet search.

---

### 2. **Engagement Velocity Scoring** (Medium Impact)
**Problem**: A tweet with 1000 likes from yesterday is less actionable than one with 100 likes from 1 hour ago.

**Solution**:
```typescript
function engagementVelocity(tweet: XTweet): number {
  const ageHours = (Date.now() - new Date(tweet.created_at).getTime()) / 3_600_000;
  const likes = tweet.metrics.likes;
  return likes / Math.max(1, ageHours); // likes per hour
}
// Sort by velocity, not raw likes
tweets.sort((a, b) => engagementVelocity(b) - engagementVelocity(a));
```
**Benefit**: Surface breaking/viral content faster.

---

### 3. **Account Reputation Tiers** (Medium Impact)
**Problem**: Quality filter is binary (5K followers = quality). Reality is more nuanced.

**Solution**:
```typescript
const REPUTATION_TIERS = {
  whale: { minFollowers: 100_000, weight: 3.0 },
  alpha: { minFollowers: 25_000, weight: 2.0 },
  quality: { minFollowers: 5_000, weight: 1.0 },
  emerging: { minFollowers: 1_000, weight: 0.5 },
};
// Weight sentiment by author tier
function weightedSentiment(tweet: XTweet): number {
  const tier = getTier(tweet.author_followers);
  const baseSentiment = simpleSentiment(tweet.text);
  return baseSentiment * tier.weight;
}
```
**Benefit**: Whale accounts move markets; weight accordingly.

---

### 4. **Topic Clustering** (High Impact)
**Problem**: Search for "$BTC" returns diverse topics. Hard to spot emerging narratives.

**Solution**:
```typescript
// Group tweets by common phrases/hashtags
function clusterByTopic(tweets: XTweet[]): Map<string, XTweet[]> {
  const clusters = new Map<string, XTweet[]>();
  for (const t of tweets) {
    const key = extractDominantTopic(t); // hashtags, cashtags, key phrases
    clusters.get(key)?.push(t) || clusters.set(key, [t]);
  }
  return clusters;
}
// Report: "3 emerging narratives: ETF flows (12 posts), Saylor buy (8 posts), whale alert (5 posts)"
```
**Benefit**: Identify emerging narratives before they're mainstream.

---

### 5. **Historical Comparison** (Medium Impact)
**Problem**: "Sentiment is 0.3 bullish" means nothing without context.

**Solution**:
```typescript
// Store daily sentiment snapshots
interface SentimentSnapshot {
  date: string;
  asset: string;
  sentiment: number;
  confidence: number;
  tweetCount: number;
}
// Compare: "BTC sentiment +0.15 vs 7-day avg. Highest since Jan 28."
```
**Benefit**: "Higher than usual" is more actionable than raw numbers.

---

### 6. **Contrarian Signal Detection** (High Impact)
**Problem**: Extreme bullish sentiment often precedes corrections.

**Solution**:
```typescript
function detectContrarian(sentiment: number, confidence: number): string | null {
  if (sentiment > 0.6 && confidence > 70) {
    return "⚠️ Extreme bullish sentiment — historically precedes pullbacks";
  }
  if (sentiment < -0.6 && confidence > 70) {
    return "🔄 Extreme fear — contrarian buy signal?";
  }
  return null;
}
```
**Benefit**: Warn when sentiment is at extremes (mean reversion).

---

### 7. **Smart Account Discovery** (Low Effort, High Value)
**Problem**: Quality list is static. New alpha accounts emerge constantly.

**Solution**:
```typescript
// Track accounts that appear in multiple high-engagement threads
function discoverQualityAccounts(tweets: XTweet[]): string[] {
  const accountEngagement = new Map<string, number>();
  for (const t of tweets) {
    const total = t.metrics.likes + t.metrics.retweets * 2;
    accountEngagement.set(
      t.username,
      (accountEngagement.get(t.username) || 0) + total
    );
  }
  // Surface accounts with high cumulative engagement but not in quality list
  return [...accountEngagement.entries()]
    .filter(([user, eng]) => eng > 500 && !isInQualityList(user))
    .map(([user]) => user);
}
// Report: "Emerging accounts to consider adding: @trader_xyz (1.2K engagement this week)"
```
**Benefit**: Quality list grows organically.

---

### 8. **Real-Time Alert Mode** (Future)
**Problem**: Daily research misses intraday moves.

**Solution**:
- Use X API streaming (filtered stream) when available
- Alert on: sudden sentiment shift, whale account posts, risk keywords spike
- Push to Discord/Telegram immediately

**Constraint**: Requires Pro API tier or polling (costs more).

---

## Quick Wins (Can Implement Now)

1. **Add engagement velocity to sort** — 10 lines of code
2. **Thread detection in daily cron** — check if top tweets are thread starters
3. **Add contrarian warning to ALOHA briefing** — simple threshold check
4. **Log emerging accounts** — track high-engagement accounts not in quality list

## Recommended Priority

| # | Improvement | Effort | Impact |
|---|-------------|--------|--------|
| 1 | Engagement velocity scoring | S | High |
| 2 | Contrarian signal detection | S | High |
| 3 | Thread detection & deep dive | M | High |
| 4 | Topic clustering | M | High |
| 5 | Account reputation tiers | M | Medium |
| 6 | Historical comparison | M | Medium |
| 7 | Smart account discovery | S | Medium |
| 8 | Real-time alerts | L | High (future) |

---

## Implementation Notes

All improvements should:
- Respect X API rate limits (stagger, cache, dedup)
- Work with current `VinceXResearchService` / `VinceXSentimentService`
- Feed into signal aggregator where appropriate
- Be toggleable via env (e.g. `X_SENTIMENT_VELOCITY_SORT=true`)
