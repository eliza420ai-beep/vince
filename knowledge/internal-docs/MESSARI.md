# Messari Free Tier Integration Guide

## Overview

This guide documents what's available on Messari's free tier and the recommended data source strategy for comprehensive crypto research without enterprise costs.

## Free Tier Limitations

### MessariAI API

- **Daily Limit**: 2 requests/day (enterprise: 20/day)
- **Use sparingly**: Save for complex research questions only
- **Don't use for**: Price lookups, TVL queries, simple rankings

### Available Free Endpoints

| Endpoint                    | Description      | Rate Limit |
| --------------------------- | ---------------- | ---------- |
| `GET /api/v1/news`          | Crypto news feed | 200/min    |
| `GET /api/v2/topics`        | Trending topics  | 200/min    |
| `GET /api/v2/assets`        | Basic asset list | 200/min    |
| `GET /api/v2/assets/{slug}` | Asset metadata   | 200/min    |
| `POST /api/v1/ai/chat`      | AI research      | **2/day**  |

### Enterprise-Gated (NOT Available)

| Feature           | What You're Missing              |
| ----------------- | -------------------------------- |
| Token Unlocks API | Vesting schedules, unlock events |
| Protocol API      | Detailed protocol metrics        |
| Markets API       | Real-time trading pairs          |
| Exchanges API     | Exchange volumes, metrics        |
| Fundraising API   | VC rounds, M&A data              |
| Intel API         | On-chain events                  |
| Bulk API          | Historical datasets              |
| Asset Timeseries  | Premium price history            |

## Recommended Data Source Strategy

Since Messari's most valuable features are enterprise-gated, use this multi-source approach:

| Data Need          | Best Free Source   | Notes                   |
| ------------------ | ------------------ | ----------------------- |
| Real-time prices   | **CoinGecko**      | Comprehensive, reliable |
| Historical prices  | **CoinGecko**      | Charts, ATH/ATL         |
| Market cap, volume | **CoinGecko**      | Token-level metrics     |
| Protocol TVL       | **DeFiLlama**      | Most accurate DeFi data |
| Fees & Revenue     | **DeFiLlama**      | Protocol economics      |
| Yield/APY          | **DeFiLlama**      | Yield farming           |
| Chain analytics    | **DeFiLlama**      | L1/L2 comparisons       |
| News sentiment     | **Messari**        | Free news API           |
| Trending topics    | **Messari**        | Free topics API         |
| Token unlocks      | **unlocks.app**    | Free alternative        |
| On-chain data      | **Dune Analytics** | Community queries       |

## What to Use Each Source For

### CoinGecko (Primary for Token Data)

- Current prices with 24h/7d/30d changes
- Market cap and fully diluted valuation
- Trading volume and liquidity
- Circulating and total supply
- ATH/ATL and price history
- Token metadata and categories

### DeFiLlama (Primary for DeFi Data)

- Protocol TVL and rankings
- Fees and revenue (24h/7d/30d)
- Yield opportunities and APY
- Chain TVL comparisons
- Multi-chain protocol breakdown
- Stablecoin market cap by chain

### Messari Free Tier (Secondary for Context)

- News feed for sentiment analysis
- Trending topics for narrative tracking
- Asset sector/category classification
- Basic asset discovery

## Practical Usage Examples

### Daily Research Digest (1 MessariAI request)

```
"What are the top crypto narratives and catalysts this week?"
```

Use 1 of your 2 daily requests for a comprehensive overview.

### News Polling (Unlimited)

```
GET https://data.messari.io/api/v1/news?page=1
```

Poll every 15-30 minutes for sentiment analysis input.

### Topic Tracking (Unlimited)

```
GET https://data.messari.io/api/v2/topics
```

Track what topics are trending in crypto.

## When Users Ask for Enterprise Data

Provide honest responses with alternatives:

**Token Unlocks**:
"Token unlock data requires Messari Enterprise. Try unlocks.app or tokenterminal.com instead."

**Protocol Metrics**:
"Detailed protocol internals need Enterprise access. I can provide TVL and fees from DeFiLlama."

**Exchange Data**:
"Exchange metrics require Enterprise. CoinGecko has basic exchange rankings."

## Coverage Comparison

| Metric        | CoinGecko  | DeFiLlama   | Messari Free    |
| ------------- | ---------- | ----------- | --------------- |
| Token prices  | ✅ Full    | ❌          | ❌              |
| Market cap    | ✅ Full    | ❌          | ⚠️ Limited      |
| Volume        | ✅ Full    | ⚠️ DEX only | ❌              |
| TVL           | ❌         | ✅ Full     | ❌              |
| Fees/Revenue  | ❌         | ✅ Full     | ❌              |
| Yields        | ❌         | ✅ Full     | ❌              |
| Chain metrics | ⚠️ Limited | ✅ Full     | ❌              |
| News          | ❌         | ❌          | ✅ Full         |
| Topics        | ❌         | ❌          | ✅ Full         |
| Token unlocks | ❌         | ❌          | ❌ (Enterprise) |

## Key Insight

**CoinGecko + DeFiLlama cover 90% of what crypto traders and researchers need.**

Messari's free tier adds value through:

- News sentiment analysis
- Narrative/topic tracking
- Asset categorization

Don't over-rely on MessariAI's 2 daily requests—use your other data sources first.
