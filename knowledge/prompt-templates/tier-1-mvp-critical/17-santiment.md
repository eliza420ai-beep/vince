---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #17: Santiment (Social Sentiment & Behavioral Analytics)

**Priority**: Tier 1 - MVP Critical  
**Specialist**: `socialPsychologySpecialist`  
**Data Source**: Santiment.net (public/free dashboards)

## Core Objectives

- Gauge crypto market sentiment across **BTC, ETH, SOL, and top altcoins**
- Track social volume, weighted sentiment, on-chain health (active addresses, NVT, exchange flows), development activity
- Detect behavioral signals: hype cycles, crowd psychology shifts, network usage, long-term conviction
- Compare to historical cycle analogs (2021 sentiment tops, 2022 bear lows, 2023-2024 accumulation)
- Flag free tier limitations and pivot to alternatives when needed

## Supported Assets

- **Primary**: BTC, ETH, SOL
- **On Request**: Top 100 by market cap, trending assets
- **Ecosystem Analysis**: L1s, L2s, DeFi tokens, memecoins

## Tool Usage Strategy

### Primary: Santiment Dashboards

- `browse_page` on:
  - Main assets page: `https://app.santiment.net/` or `https://app.santiment.net/assets/bitcoin`
    - Instructions: "Extract all free/public metrics visible without login: social volume (total and per platform), weighted sentiment, DAA, NVT, exchange flows, dev activity index/commits, and any other BTC indicators. Summarize current values and signal interpretations."
  - Charts/trends: Specific metric pages
    - `/charts/social-volume`, `/charts/sentiment-weighted`, `/charts/daily-active-addresses`, `/charts/nvt`, `/charts/development-activity`
    - Instructions: "For each key metric, extract current value and sample ~10-15 evenly spaced date/value pairs from visible historical charts (prioritize recent months + major peaks/troughs)."
  - Insights/reports: `https://insights.santiment.net/` or `https://santiment.net/`
    - Instructions: "List recent articles/reports mentioning BTC; browse relevant ones for quoted metrics, sentiment analysis, or cycle insights."

### Supplement

- CryptoQuant free charts: `https://cryptoquant.com/asset/btc`
- Glassnode free metrics or public studio shares
- `web_search`: "Santiment Bitcoin social sentiment latest" OR "Santiment BTC NVT ratio chart 2025/2026"

### Analysis

- `code_execution` to:
  - Parse/clean extracted data points
  - Calculate averages (e.g., 7d sentiment), changes, outliers (e.g., volume >2x average)
  - Generate trend descriptions

## Output Format

```markdown
## Santiment Crypto Metrics Snapshot — [Current Date]

### Multi-Asset Overview

| Asset | Social Volume | Sentiment | Active Addr | NVT  | Dev Activity | Signal   |
| ----- | ------------- | --------- | ----------- | ---- | ------------ | -------- |
| BTC   | X.XX K (↑/↓)  | +/- Z.ZZ  | A.AA M      | B.BB | D.DD         | 🟢/🟡/🔴 |
| ETH   | X.XX K (↑/↓)  | +/- Z.ZZ  | A.AA M      | B.BB | D.DD         | 🟢/🟡/🔴 |
| SOL   | X.XX K (↑/↓)  | +/- Z.ZZ  | A.AA M      | B.BB | D.DD         | 🟢/🟡/🔴 |

### BTC Deep Dive

- **Social Volume** (24h mentions): X.XX K | 7d avg: Y.YY K | Trend: ↑/↓
- **Weighted Sentiment Score**: +/− Z.ZZ (positive = bullish crowd mood)
- **Daily Active Addresses**: A.AA M (network usage)
- **NVT Ratio**: B.BB (lower = potential undervaluation)
- **Net Exchange Flows** (24h, if available): +/− C.CC K BTC
- **Development Activity** (30d commits/index): D.DD

### ETH Metrics (If Requested)

[Same structure as BTC - condensed if similar]

### SOL Metrics (If Requested)

[Same structure as BTC - condensed if similar]

### 30–90 Day Trends (Key Assets)

| Date/Period | Asset | Social Volume | Sentiment | Active Addr | Key Event |
| ----------- | ----- | ------------- | --------- | ----------- | --------- |
| YYYY-MM-DD  | BTC   | X.XX K        | +/− Y.Y   | Z.ZZ M      | [event]   |
| YYYY-MM-DD  | ETH   | X.XX K        | +/− Y.Y   | Z.ZZ M      | [event]   |

(Limit to 10–15 rows max; prioritize recent weeks + sentiment/activity spikes.)

### Behavioral Signals

- **Crowd Psychology**: [Current mood - Fear/Greed/Neutral]
- **Network Health**: [Active addresses trend = adoption signal]
- **Developer Conviction**: [Dev activity = long-term health]
- **Exchange Flow Signal**: [Inflows = sell pressure, Outflows = accumulation]

### Cross-Asset Divergences

- [Any notable divergence between BTC/ETH/SOL sentiment]
- [Rotation signals: capital moving from X to Y]

### Historical Comparison

- vs 2021 Euphoria: [Current sentiment vs peak FOMO]
- vs 2022 Capitulation: [Current sentiment vs max fear]
- vs 2024 Accumulation: [Current sentiment vs quiet conviction]

### Insights & Trading Implications

1. [Key insight from social data]
2. [Key insight from on-chain data]
3. [Contrarian opportunity if any]

### Data Notes

- Sources: Santiment (pages browsed: list URLs); alternatives if used
- Timestamp: As of [current date/time UTC]
- Limitations: Free tier often restricted to basic/current metrics with limited history
```

## Query-Specific Guidance

### "What's the sentiment on BTC/ETH/SOL?"

Focus on that specific asset, provide deep metrics

### "Is the market euphoric or fearful?"

Compare social volume, sentiment, and active addresses to historical extremes

### "Which assets are seeing increased developer activity?"

Focus on dev activity metric across multiple assets

### "Are people accumulating or selling?"

Exchange flow analysis + whale transaction tracking

## Integration Notes

- Feeds into `socialPsychologySpecialist` for sentiment overlay (complements X/Twitter #10)
- Provides on-chain behavioral context (active addresses, NVT) alongside social sentiment
- Weighted sentiment as key crowd psychology proxy (positive >0 bullish)
- Can inform strike selection (extreme sentiment = contrarian opportunity)

## Performance Notes

- Free tier often restricted to basic/current metrics (limited history)
- Prioritize free/public metrics (clearly flag and pivot if Santiment data paywalled/sparse)
- Combine with X/Twitter (#10) for comprehensive sentiment picture
- If primary dashboards limited, clearly state and rely on verified public alternatives/reports

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: santiment.net_
