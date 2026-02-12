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

**Triggers:**
- "What's CT saying about BTC?"
- "X vibe check"
- "Twitter sentiment"
- "Crypto twitter pulse"

**Output:**
```
📊 X Pulse

📈 Overall: Bullish (+42) | 78% confidence

By Topic:
• BTC 📈 +45 (whales: +38)
• ETH 📉 -12 (whales: +5)
• SOL 😐 +3

Top Threads:
🧵 @crediblecrypto: Technical breakdown of the supply shock...
   2.3k likes | https://x.com/crediblecrypto/status/...

🔥 Breaking:
• @lookonchain: Large BTC transfer to Coinbase flagged...
  (340 likes/hour)

⚠️ No contrarian warnings

_Based on 847 posts from the last 24h_
```

## Architecture

```
plugin-x-research/
├── src/
│   ├── index.ts           # Plugin entry
│   ├── types/             # TypeScript types
│   ├── constants/         # Topics, keywords, accounts
│   ├── services/
│   │   ├── xClient        # Core API client
│   │   ├── xSearch        # Topic search
│   │   └── xSentiment     # Sentiment analysis
│   └── actions/
│       └── xPulse         # North star action
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

## Future Actions

- `X_VIBE`: Quick sentiment check for a single topic
- `X_SEARCH`: Manual search with filters
- `X_THREAD`: Fetch and summarize a thread
- `X_ACCOUNT`: Analyze an account's recent takes
- `X_NEWS`: Get news from X News API

## Credits

Part of the VINCE multi-agent system by Ikigai Labs.
