---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #19: IntoTheBlock (On-Chain Indicators & Holder Stats)

**Priority**: Tier 3 - Supporting  
**Specialist**: `onChainHealthSpecialist`  
**Data Source**: IntoTheBlock.com (public/free dashboards)

## Core Objectives

- Assess market health via on-chain indicators: addresses in/out/near the money (%), concentration by large holders, net network growth, large transactions volume
- Analyze holder demographics (retail vs. whales vs. institutions)
- Detect signals: accumulation/distribution phases, regime shifts (high in-the-money % as bullish resilience, rising concentration as whale control risk)
- Compare to historical analogs (2021 bull in-money peaks, 2022 bear out-of-money capitulation, 2023-2024 accumulation)

## Tool Usage Strategy

### Primary: IntoTheBlock Dashboards

- `browse_page` on:
  - Main BTC page: `https://app.intotheblock.com/coin/BTC` or `https://intotheblock.com/coin/bitcoin`
    - Instructions: "Extract all free/public on-chain indicators visible: In/Out/Near the Money addresses (counts and %), Concentration by Large Holders (top tiers share), Net Network Growth, Large Transactions volume/count, holder breakdowns (retail/whale/institutional if shown), and any signal summaries (bullish/bearish flags)."
  - Signals/Indicators tabs: `/signals`, `/ownership`, `/transactions`
    - Instructions: "Summarize current signal status and key stats. If historical charts visible, sample ~12-20 evenly spaced date/value pairs for core metrics (e.g., in-money %, concentration %, net growth %)."

### Supplement

- Nansen free/public dashboards: `https://app.nansen.ai/`
- Glassnode free metrics or BitInfoCharts
- `web_search`: "IntoTheBlock Bitcoin on-chain signals latest" or "ITB BTC in the money historical"

### Analysis

- `code_execution` to:
  - Parse/clean extracted data points
  - Calculate changes (MoM in-money %, concentration deltas)
  - Aggregate holder tiers or signal trends
  - Generate text summaries of patterns

## Output Format

```markdown
### IntoTheBlock BTC On-Chain Snapshot

- **In/Out/Near the Money**: XX% In the Money (Y.Y M addresses) | ZZ% Out | WW% Near
- **Concentration by Large Holders**: Top 10: A.AA% | Top 100: B.BB% of supply
- **Net Network Growth**: +/− C.CC% (7d/30d new addresses net)
- **Large Transactions** (24h): D.DD ($E.E B volume)
- **Overall Signals**: e.g., "Mostly Bullish (high in-profit + growth)"

### 30–90 Day Trends

| Date/Period | In the Money (%) | Concentration (Top 100 %) | Net Growth (%) | Large Tx Volume ($B) | Key Notes             |
| ----------- | ---------------- | ------------------------- | -------------- | -------------------- | --------------------- |
| YYYY-MM-DD  | XX.X             | YY.Y                      | +/− Z.Z        | A.A                  | e.g., "In-money peak" |
| ...         | ...              | ...                       | ...            | ...                  | ...                   |

(Limit to 12–20 rows max; prioritize recent weeks + major shifts.)

### Cross-Verification (Alternatives)

- Alignment: e.g., "In-money % matches Glassnode profit metrics."
- Supplements if primary limited.

### Vibes & Insights

2–4 concise sentences interpreting the data:

- Current holder pulse (profit distribution, growth, concentration).
- Regime signals (in-money dominance = resilience, concentration rise = risk).
- Historical parallels (e.g., similar to 2021 conviction or 2022 capitulation).
- Implications for BTC price conviction or flush potential.

Example:  
"70%+ addresses in profit with steady net network growth—strong holder conviction and accumulation signal, echoing mid-2021 bull phase. Concentration stable below historical peaks, reducing whale dump risk. Supports resilient base amid spot volatility."

### Data Notes

- Sources: IntoTheBlock (pages browsed: list URLs); supplements if used
- Timestamp: As of [current date/time UTC]
- Limitations: Free tier may show partial indicators/history—confirmed with alternatives where needed.
```

## Integration Notes

- Feeds into `onChainHealthSpecialist` for holder behavior analysis
- Provides profit/loss distribution context (in/out/near the money)
- Concentration metrics reveal whale control risks
- Can inform strike selection (holder conviction affects price support/resistance)

## Performance Notes

- Free tier may show partial indicators/history
- Signal direction grounded in ITB interpretations or clear metrics (e.g., >65% in-money typically bullish)
- Always double-check extracted values for accuracy
- If primary dashboard limited, clearly state and rely on verified alternatives

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: intotheblock.com_
