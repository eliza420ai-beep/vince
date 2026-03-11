---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #15: Messari (Asset Research & Intelligence)

**Priority**: Tier 3 - Supporting  
**Specialist**: `fundamentalsSpecialist`  
**Data Source**: Messari.io (public/free asset profiles and research)

## Core Objectives

- Fetch comprehensive asset overview for **any crypto project**
- Extract market structure: price, market cap, volume, supply metrics
- Track performance metrics: ROI periods, ATH/ATL distance, sector rankings
- Access on-chain fundamentals where available
- Leverage Messari research reports and sector analysis

## Supported Assets

- **All assets in Messari database** (1000+ projects)
- L1s, L2s, DeFi, Infrastructure, Gaming, AI tokens
- Sector-level analysis and comparisons

## Tool Usage Strategy

### Primary: Messari Asset Profile

- `browse_page` on:
  - BTC profile: `https://messari.io/asset/bitcoin` or `https://messari.io/project/bitcoin`
    - Instructions: "Extract all free/public metrics from the overview/dashboard: current price USD, market cap (realized + FDV if shown), 24h/7d volumes (spot, futures, total), open interest/funding rate if displayed, supply details (circulating/total/max), mindshare %, sector classification/ranking, ROI tables (all periods: 1h/24h/7d/30d/90d/1y/YTD), ATH/ATL with dates and % distance, and any on-chain/mining sections (hash rate, difficulty, production costs, realized price)."
  - Additional tabs: `/metrics`, `/performance`, `/supply`
    - Instructions: "Summarize key current values and any historical chart summaries."

### Supplement

- CoinGecko BTC page: `https://www.coingecko.com/en/coins/bitcoin`
  - Instructions: "Cross-verify price, market cap, 24h volume, ATH/ATL, circulating supply."
- `web_search`: "Messari Bitcoin asset profile latest metrics 2025/2026"

### Analysis

- `code_execution` to:
  - Parse/clean extracted data
  - Calculate relatives (% from ATH = (current - ATH)/ATH \* 100)
  - Aggregate ROI trends or detect outliers

## Output Format

```markdown
## Messari Asset Profile — [Current Date]

### Asset Overview: [ASSET NAME]

| Metric             | Value          | Context         |
| ------------------ | -------------- | --------------- |
| Price              | $X,XXX         | 24h: ±X.X%      |
| Market Cap         | $X.XX B        | Rank: #XX       |
| FDV                | $X.XX B        | MC/FDV: X.X%    |
| 24h Volume         | $X.XX M        | Vol/MC: X.X%    |
| Circulating Supply | X.XX M         | % of Max: XX%   |
| Sector             | [DeFi/L1/etc.] | Sector Rank: #X |
| Mindshare          | X.XX%          | Trend: ↑/↓      |

### Performance (ROI)

| Period | ROI   | vs BTC | vs Sector |
| ------ | ----- | ------ | --------- |
| 24h    | ±X.X% | ±X.X%  | ±X.X%     |
| 7d     | ±X.X% | ±X.X%  | ±X.X%     |
| 30d    | ±X.X% | ±X.X%  | ±X.X%     |
| 90d    | ±X.X% | ±X.X%  | ±X.X%     |
| 1Y     | ±X.X% | ±X.X%  | ±X.X%     |
| YTD    | ±X.X% | ±X.X%  | ±X.X%     |

### ATH/ATL Analysis

- **ATH**: $XX,XXX on [date] — currently -XX% below
- **ATL**: $X.XX on [date] — currently +XX% above
- **Cycle Position**: [Early/Mid/Late] based on ATH distance

### On-Chain/Fundamentals (If Available)

- [Metric 1]: [Value] — [interpretation]
- [Metric 2]: [Value] — [interpretation]
- [Metric 3]: [Value] — [interpretation]

### Sector Context

- Sector: [Sector Name]
- Sector Leader: [Top asset in sector]
- Asset Rank in Sector: #X of Y
- Sector Trend: [Growing/Stable/Declining]

### Research Highlights (If Available)

- Latest Messari report: [title, date]
- Key thesis: [1-2 sentence summary]
- Risk factors: [noted risks]

### Key Insights

1. [Most important observation about the asset]
2. [Performance context: outperforming/underperforming]
3. [Investment implication or catalyst to watch]

### Data Notes

- Source: Messari (pages browsed: list URLs)
- Timestamp: [current date/time UTC]
- Limitations: Free tier; some metrics may be Pro-only
```

## Query-Specific Guidance

### "Tell me about [asset] from Messari"

Full asset profile with sector context

### "How has [asset] performed vs BTC?"

Performance comparison across timeframes

### "What sector is [asset] in? How does it rank?"

Sector classification and relative performance

### "What's Messari's research on [asset]?"

Research report summaries and key theses

### "Compare [A] vs [B] performance"

Side-by-side ROI and market structure comparison

## Integration Notes

- Feeds into `fundamentalsSpecialist` for comprehensive market overview
- Provides research layer beyond just price data
- Sector context helps with rotation analysis
- Can inform investment theses with Messari research

## Performance Notes

- Free tier shows core market metrics
- Cross-verify with CoinGecko for price accuracy
- Research reports provide qualitative edge
- Mindshare % useful for attention/narrative tracking

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: messari.io_
