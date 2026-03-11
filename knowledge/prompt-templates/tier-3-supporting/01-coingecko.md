---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #1: CoinGecko (Price & Market Data)

**Priority**: Tier 3 - Supporting  
**Specialist**: `fundamentalsSpecialist`  
**Data Source**: CoinGecko API (15,000+ coins, NFTs, exchanges, trending)

## Core Objectives

- Deliver clean market snapshots for **any requested asset(s)**
- Track prices, market caps, volumes, and key ratios
- Identify trending coins, top gainers/losers, new listings
- Calculate relative performance and dominance metrics
- Support both major assets (BTC, ETH, SOL) and long-tail altcoins

## Supported Queries

- **Price Checks**: Any coin by name/symbol
- **Market Overview**: Total market cap, BTC dominance, sector breakdown
- **Trending**: Top trending, gainers, losers, new listings
- **Comparisons**: Any asset vs any asset (BTC/ETH, SOL/AVAX, etc.)
- **Historical**: Price history, ATH, performance over time

## Tool Usage Strategy

### Parallel Tool Calls

1. **BTC Dominance & Global Market Cap**
   - `browse_page`: https://api.coingecko.com/api/v3/global
   - Instructions: "Return the full JSON exactly. Extract data.market_cap_percentage.btc and data.total_market_cap.usd. If error, fallback to https://coinmarketcap.com/api/v3/global-metrics/quotes/latest and extract bitcoin_dominance."

2. **Current Spot Prices**
   - `browse_page`: https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,pax-gold&vs_currencies=usd&include_24hr_change=true&include_market_cap=true
   - Instructions: "Return the full JSON exactly. If error, fallback to individual CoinGecko pages or use Polygon spot if available."

3. **Historical Daily Closes (7 years)**
   - `code_execution` with Python using `polygon.RESTClient`:
     - Tickers: 'X:BTCUSD', 'X:ETHUSD', 'X:PAXGUSD'
     - Period: from '2018-01-01' to current_date
     - Resample to monthly, calculate ratios and performance metrics
     - Output: Monthly DataFrame tail(24) + formatted summary metrics table

## Output Format

```markdown
## CoinGecko Market Snapshot — [Current Date]

### Market Overview

- **Total Market Cap**: $X.XX T (24h: ±X.X%)
- **BTC Dominance**: XX.XX%
- **ETH Dominance**: XX.XX%
- **24h Volume**: $XXX B
- **Fear & Greed**: XX/100 ([interpretation])

### Requested Asset(s)

| Asset       | Price   | 24h   | 7d    | Market Cap | Rank | ATH      | From ATH |
| ----------- | ------- | ----- | ----- | ---------- | ---- | -------- | -------- |
| BTC         | $XX,XXX | +X.X% | +X.X% | $X.XX T    | #1   | $XXX,XXX | -XX%     |
| ETH         | $X,XXX  | +X.X% | +X.X% | $XXX B     | #2   | $X,XXX   | -XX%     |
| [requested] | ...     | ...   | ...   | ...        | ...  | ...      | ...      |

### Trending (If Relevant)

| Rank | Coin | Price | 24h Change | Why Trending |
| ---- | ---- | ----- | ---------- | ------------ |
| 1    | XXX  | $X.XX | +XX%       | [reason]     |
| 2    | XXX  | $X.XX | +XX%       | [reason]     |

### Top Gainers/Losers (24h)

**Gainers**: [coin] +XX%, [coin] +XX%, [coin] +XX%
**Losers**: [coin] -XX%, [coin] -XX%, [coin] -XX%

### Comparative Analysis (If Requested)

| Metric          | Asset A | Asset B | Winner |
| --------------- | ------- | ------- | ------ |
| 24h Performance | +X.X%   | +X.X%   | [A/B]  |
| 7d Performance  | +X.X%   | +X.X%   | [A/B]  |
| Market Cap      | $XX B   | $XX B   | [A/B]  |
| Volume/MCap     | X.X%    | X.X%    | [A/B]  |

### Key Insights

- [Most important observation about requested asset(s)]
- [Market context: risk-on/risk-off, rotation signals]
- [Trend or pattern worth noting]

### Data Notes

- Source: CoinGecko API
- Timestamp: [current date/time UTC]
```

## Query-Specific Guidance

### "What's the price of [coin]?"

Direct price lookup with context (market cap, rank, ATH distance)

### "Compare BTC vs ETH" or "SOL vs AVAX"

Side-by-side performance comparison with clear winner/loser

### "What's trending?"

Top trending coins with reasons why

### "Market overview"

Full market snapshot: dominance, total cap, volume, fear/greed

### "Top gainers/losers"

Quick performance leaderboard

## Integration Notes

- Feeds into `fundamentalsSpecialist` for price/ratio context
- Provides market backdrop for any trading decisions
- Supports both major assets and long-tail altcoin queries

## Performance Notes

- CoinGecko tracks 15,000+ coins - can answer almost any price query
- Use API for structured data, browse for real-time
- Cross-reference with DexScreener for DEX-specific data

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_
