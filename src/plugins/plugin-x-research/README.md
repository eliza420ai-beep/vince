# Plugin X Research

ALOHA-style X/Twitter research for crypto sentiment and alpha.

## Overview

Just like `VINCE_ALOHA` gives you the daily market vibe, `X_PULSE` gives you the X/Twitter vibe for our focus areas:

```
"What's CT saying about BTC today?"
→ Bullish sentiment (72% confidence), 3 threads worth reading,
  @crediblecrypto's take on ETF flows hit 2k likes in 2 hours,
  whale accounts quiet, retail is fading. Classic divergence setup.
```

## Features

- **X_PULSE**: Full briefing on CT sentiment (the north star action)
- **Sentiment Analysis**: Keyword-based with account tier weighting
- **Volume Spikes**: Detect unusual activity on topics
- **Thread Discovery**: Find high-engagement threads
- **Contrarian Warnings**: Flag extreme sentiment as potential reversals

## Setup

### 1. Get X API Access

1. Go to [X Developer Portal](https://developer.x.com)
2. Create a project with "Read" permissions
3. Generate a Bearer Token

### 2. Configure Environment

```bash
# Required
export X_BEARER_TOKEN="your-bearer-token"

# Optional: curated list ID for quality filtering
export X_RESEARCH_QUALITY_LIST_ID="your-list-id"
```

### 3. Register Plugin

```typescript
import { xResearchPlugin } from '@vince/plugin-x-research';

const character = {
  plugins: [xResearchPlugin],
  // ...
};
```

## Actions

### X_PULSE (North Star)

Get a full ALOHA-style briefing on X sentiment.

**Triggers:** "What's CT saying?", "X vibe check", "crypto twitter pulse"

```
📊 X Pulse

📈 Overall: Bullish (+42) | 78% confidence

By Topic:
• BTC 📈 +45 (whales: +38)
• ETH 📉 -12 (whales: +5)
• SOL 😐 +3

Top Threads:
🧵 @crediblecrypto: Technical breakdown...

🔥 Breaking:
• @lookonchain: Large BTC transfer (340 likes/hour)

_Based on 847 posts from the last 24h_
```

### X_VIBE

Quick sentiment check for a single topic.

**Triggers:** "What's the vibe on ETH?", "BTC sentiment check"

```
📊 ETH Vibe Check

📉 Bearish (-28) | 65% confidence

Breakdown:
• Bullish: 23 tweets
• Bearish: 47 tweets

Whale alignment: +12 (whales more bullish)
```

### X_THREAD

Fetch and summarize a Twitter thread.

**Triggers:** "Summarize this thread: [URL]", "Get thread [ID]"

```
🧵 Thread Summary

Author: @crediblecrypto (whale)
Length: 12 tweets
Engagement: 2.3k likes, 450 RTs

TL;DR: [AI-generated summary of key points]
```

### X_ACCOUNT

Analyze a Twitter/X account.

**Triggers:** "Who is @crediblecrypto?", "Tell me about @DegenSpartan"

```
👤 @crediblecrypto

Tier: 🐋 Whale
Reason: 285K followers, market-moving

Stats: 285K followers, 1.2k avg likes
Focus: BTC, trading, macro
Bias: Bullish | Reliability: 80/100
```

### X_NEWS

Get crypto news from X's News API.

**Triggers:** "Crypto news on X", "What's happening?"

```
📰 X News | Crypto

🔴 HIGH IMPACT
• BTC ETF Sees Record $1.2B Inflows [BTC]
  📈 Bullish | Relevance: 95

🟡 MEDIUM IMPACT
• Solana DEX Volume Hits ATH [SOL]
  📈 Bullish | Relevance: 72
```

## Architecture

```
plugin-x-research/
├── src/
│   ├── index.ts              # Plugin entry (5 actions)
│   ├── types/                # TypeScript types
│   │   ├── tweet.types.ts    # Tweet, User, SearchResponse
│   │   ├── news.types.ts     # News API types
│   │   ├── trends.types.ts   # Trends API types
│   │   ├── sentiment.types.ts # Sentiment analysis types
│   │   └── analysis.types.ts # Computed analysis results
│   ├── constants/
│   │   ├── topics.ts         # Topics we care about
│   │   ├── sentimentKeywords.ts # Bullish/bearish keywords
│   │   ├── qualityAccounts.ts # Whale/alpha/quality tiers
│   │   └── endpoints.ts      # X API v2 URLs
│   ├── services/
│   │   ├── xClient.service   # Core API client (auth, cache, rate limits)
│   │   ├── xSearch.service   # Topic search, volume spikes
│   │   ├── xSentiment.service # Keyword scoring, tier weighting
│   │   ├── xNews.service     # X News API integration
│   │   ├── xTrends.service   # Personalized trends
│   │   ├── xThreads.service  # Thread detection & fetching
│   │   └── xAccounts.service # Account analysis
│   ├── actions/
│   │   ├── xPulse.action     # 🎯 North star - full briefing
│   │   ├── xVibe.action      # Quick topic sentiment
│   │   ├── xThread.action    # Thread summarization
│   │   ├── xAccount.action   # Account analysis
│   │   └── xNews.action      # News headlines
│   └── __tests__/            # Vitest tests
```

## Topics We Track

### Core Assets
- **BTC** — Primary trading asset
- **ETH** — L2 activity, DeFi
- **SOL** — Meme season, speed
- **HYPE** — Ecosystem token

### Trading Intelligence
- Perps & Funding
- Options & DVOL
- Whale Moves
- Liquidations

### Ecosystem
- ElizaOS
- AI Agents
- DeFi
- Memes

### Meta
- Macro (FOMC, CPI)
- Regulatory (SEC)
- Hacks/Exploits

## API Usage

X API is pay-as-you-go with 24h tweet deduplication. The plugin:
- Caches responses for 1 hour
- Respects rate limits with exponential backoff
- Batches topic searches to minimize calls

Typical daily usage: ~$0.50-2.00 depending on frequency.

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Test
bun test

# Watch mode
bun run dev
```

## Roadmap

**Implemented:**
- ✅ `X_PULSE` - Full ALOHA-style briefing
- ✅ `X_VIBE` - Quick topic sentiment
- ✅ `X_THREAD` - Thread summarization
- ✅ `X_ACCOUNT` - Account analysis
- ✅ `X_NEWS` - News headlines

**Planned:**
- `X_SEARCH` - Manual search with custom filters
- `X_ALPHA` - Alpha discovery (new accounts, emerging narratives)
- Providers for VINCE signal aggregation
- X Spaces monitoring

## Credits

Part of the VINCE multi-agent system by Ikigai Labs.
