---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #29: Bitfinex (Exchange Volumes & Lending Rates)

**Priority**: Tier 3 - Supporting  
**Specialist**: `derivativesSpecialist`, `liquiditySpecialist`  
**Data Source**: Bitfinex.com (exchange-specific metrics)

**Note**: This is different from `29-deribit.md`. This focuses on Bitfinex exchange metrics, while Deribit focuses on options chain data.

## Core Objectives

- Fetch Bitcoin-specific metrics from Bitfinex: spot/derivatives volumes, margin lending rates, leverage buildup, market stats
- Gauge exchange-specific volumes, funding/lending demand, leverage buildup, institutional sentiment signals
- Compare to broader derivatives/exchange data (Coinglass aggregate)
- Highlight lending market as proxy for leverage conviction (high rates = shorts paying longs or bullish margin demand)

## Tool Usage Strategy

### Primary: Bitfinex Official Pages

- `browse_page` on:
  - Stats/dashboard: `https://www.bitfinex.com/stats`
    - Instructions: "Extract current BTC trading volumes (spot + derivatives, 24h/7d/30d), any volume charts, lending/funding rates, and historical summaries if visible."
  - Lending/funding: `https://www.bitfinex.com/funding` or `https://trading.bitfinex.com/funding`
    - Instructions: "Focus on BTC/USD or BTC margin pairs. Extract current flash return rates (FRR), average lend/borrow rates (APR), offered/supplied amounts, and any rate charts over past month/year."
  - Market pulse/reports: `https://pulse.bitfinex.com/` or `https://www.bitfinex.com/posts/`
    - Instructions: "List recent posts/reports mentioning BTC volumes, lending rates, long/short positions, or market stats. Provide URLs and summarize key BTC metrics quoted."
  - Derivatives/positions: `https://trading.bitfinex.com/`
    - Instructions: "Extract BTC perp/futures OI, long/short ratios, volumes if shown publicly."

### Supplement

- Coinglass Bitfinex-specific: `https://www.coinglass.com/exchange/Bitfinex`
- `web_search`: "Bitfinex BTC lending rates latest" OR "Bitfinex Bitcoin volume report 2025/2026"

### Analysis

- `code_execution` to:
  - Parse/clean extracted tables or text data
  - Calculate averages (7d/30d lending rate), changes, ratios
  - Aggregate trends and detect spikes/anomalies

## Output Format

```markdown
### Bitfinex BTC Metrics Snapshot

- **Trading Volume** (24h): $X.XX B (spot + derivatives) | 7d: $Y.YY B | 30d: $Z.ZZ B
- **Margin Lending Rate** (BTC, current FRR/APR): A.AA% (lend) / B.BB% (borrow)
- **Margin Long/Short Positions** (if available): Longs $C.C B | Shorts $D.D B | **Ratio**: E.E : 1
- **Open Interest** (perps/futures, if available): $F.F B
- **Key Highlights**: e.g., "Lending demand elevated; volumes up X% WoW"

### 30–90 Day Trends (Where Available)

| Date/Period | Volume ($B, 24h avg) | Lending Rate (%) | Long/Short Ratio | Key Notes                         |
| ----------- | -------------------- | ---------------- | ---------------- | --------------------------------- |
| YYYY-MM-DD  | X.XX                 | Y.YY             | Z.Z : 1          | e.g., "Rate spike + volume surge" |
| ...         | ...                  | ...              | ...              | ...                               |

(Limit to 10–15 rows max; prioritize recent weeks + major turning points. Use weekly averages if daily dense.)

### Comparison to Aggregate (Coinglass)

- Context: e.g., "Bitfinex volumes represent ~XX% of total spot market; lending rates higher than perp funding on aggregate."
- Divergences: e.g., "Stronger long skew on Bitfinex margin vs. neutral perp ratios elsewhere."

### Vibes & Insights

2–4 concise sentences interpreting the data:

- Current exchange pulse (volume momentum, lending demand).
- Regime signals (leverage buildup, institutional accumulation, or caution).
- Historical parallels (e.g., similar to 2021 margin peaks or 2023 recovery phases).
- Implications for BTC spot resilience or broader market flows.

Example:  
"Elevated lending rates (~0.08% APR) with rising volumes suggest strong borrow demand and bullish margin leverage—classic institutional conviction signal on Bitfinex. Long/short ratio tilting long amid volume recovery, echoing early 2022 post-bear phases. Watch for rate spikes as potential overheating precursor."

### Data Notes

- Sources: Bitfinex (pages browsed: list URLs, e.g., stats, funding, pulse); supplements if used
- Timestamp: As of [current date/time UTC]
- Limitations: Note if data is partial (e.g., lending rates aggregated, no granular OI), paywalled, or requires login—and confirm with alternatives.
```

## Integration Notes

- Feeds into `derivativesSpecialist` for exchange-specific leverage data
- Complements `liquiditySpecialist` with Bitfinex volume context
- Provides margin lending as leverage proxy (high rates = bullish demand)
- Can be merged with derivatives-heavy prompts (#13, #23, #29 Deribit) per Grok suggestion

## Performance Notes

- Prioritize BTC/USD or core BTC pairs (note if metrics multi-asset aggregated)
- Lending rates as key leverage proxy (high rates = bullish demand)
- If primary pages lack depth, clearly state and rely on supplements

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: bitfinex.com_
