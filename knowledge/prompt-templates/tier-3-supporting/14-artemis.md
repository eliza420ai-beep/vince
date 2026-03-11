---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #14: Artemis (Liquidity Flows & Cross-Chain Activity)

**Priority**: Tier 3 - Supporting  
**Specialist**: `defiFlowsSpecialist` (BTC bridge flows extension)  
**Data Source**: Artemis Terminal (artemis.xyz)

## Core Objectives

- Fetch BTC/wBTC bridge and chain flow metrics: recent bridge volumes (inflows/outflows), net flows, ecosystem rankings
- Detect liquidity regime signals: sustained net outflows to EVM/L2s, spikes in bridge activity, net return to native Bitcoin chain
- Compare to broader DEX trading activity (via DEX Screener)
- Assess structural shifts in BTC liquidity distribution

## Tool Usage Strategy

### Primary: Artemis Terminal

- `browse_page` on:
  - Main flows dashboard: `https://app.artemis.xyz/flows`
    - Instructions: "Focus on Bitcoin (BTC/wBTC). Extract current/recent bridge inflows, outflows, net flows (in USD), time period covered, ecosystem ranking, and any historical chart data points (date + inflow/outflow/net values) for the longest visible period (up to 90+ days). Sample ~10-15 evenly spaced points if chart is present."
  - Asset-specific view: Search for BTC or wBTC pages
    - Instructions: "Summarize BTC/wBTC cross-chain flows, bridge volumes, and top destination/source chains."

### DEX Comparison

- `browse_page` on: `https://dexscreener.com/` or specific wBTC pairs (e.g., Uniswap wBTC/USDC)
  - Instructions: "Extract 24h/7d trading volume for top wBTC pairs and total DEX volume context."

### Fallback

- `web_search`: "Artemis Terminal BTC wBTC bridge flows historical"
- DefiLlama bridges: `https://defillama.com/bridges`
  - Instructions: "Extract BTC/wBTC-specific bridge volumes and chains."

### Analysis

- `code_execution` to:
  - Parse/clean extracted data
  - Calculate net flows, weekly/monthly aggregates, percentage changes
  - Generate trend descriptions

## Output Format

```markdown
### BTC Liquidity Flows Snapshot

- **Recent Bridge Activity** (period: e.g., past 30d/90d): Inflows $X.XX B | Outflows $Y.YY B | **Net**: +/− $Z.ZZ B
- **Top Flow Directions**: e.g., "Primary inflow from Ethereum → Bitcoin; outflow to Base/Arbitrum"
- **Ecosystem Ranking**: BTC ranks #N among chains by bridge volume
- **24h/7d Bridge Volume** (if available): $A.AA B total

### 30–90 Day Trends

| Period/Date | Inflows ($M) | Outflows ($M) | Net ($M) | Key Notes                        |
| ----------- | ------------ | ------------- | -------- | -------------------------------- |
| YYYY-MM-DD  | XXX          | XXX           | +/−XXX   | e.g., "Net outflow spike to L2s" |
| ...         | ...          | ...           | ...      | ...                              |

(Limit to 8–15 rows max; prioritize recent weeks + turning points. Use weekly/monthly buckets if daily data dense.)

### Comparison to DEX Activity

- Bridge flows vs. DEX trading: "Bridge volumes modest (~$XM over 90d) compared to daily wBTC DEX volumes (often $YM+ across major pairs)."
- Implications: e.g., "Most BTC liquidity remains in trading pools rather than structural cross-chain rotation."

### Vibes & Insights

2–4 concise sentences interpreting the data:

- Current liquidity pulse (native vs. wrapped BTC usage).
- Regime signals (accumulation on Bitcoin chain, L2 migration, etc.).
- Historical parallels if relevant (e.g., similar to 2023–2024 L2 growth phase).
- Potential implications for BTC price resilience or alt season flows.

Example:  
"Modest net inflows back to native Bitcoin chain over past 90 days with balanced bridging—suggesting no aggressive rotation away from BTC liquidity. Bridge volumes remain small relative to daily DEX trading in wBTC pairs, indicating most activity is speculative rather than structural exodus."

### Data Notes

- Sources: Artemis Terminal (pages browsed: list URLs); supplements if used
- Timestamp: As of [current date/time UTC]
- Limitations: Note if data is aggregated only (no short-term granularity), niche, or unavailable—and provide best alternative.
```

## Integration Notes

- Feeds into `defiFlowsSpecialist` for BTC bridge flows analysis
- Complements DefiLlama (#2) with cross-chain liquidity focus
- Provides liquidity distribution signals (native vs wrapped BTC)
- Can inform strike selection (liquidity rotation affects volatility)

## Performance Notes

- Data may be niche/limited (Artemis focuses on cross-chain flows)
- Prioritize BTC/wBTC-specific flows (note if ecosystem-level only)
- If Artemis data too limited, clearly state and pivot to reliable alternatives (e.g., DefiLlama bridges)

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: artemis.xyz_
