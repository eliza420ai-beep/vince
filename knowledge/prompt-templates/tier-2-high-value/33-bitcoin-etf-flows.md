---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #33: Bitcoin ETF Flows (Delphi Digital Focus)

**Priority**: Tier 2 - High Value  
**Specialist**: `institutionalSpecialist`  
**Data Source**: Delphi Digital (primary), Farside Investors, SoSoValue (alternatives)

## Core Objectives

- Track daily/cumulative net inflows for spot Bitcoin ETFs to assess institutional demand, accumulation trends
- Detect signals: impacts on BTC price momentum or regime shifts (sustained inflows = conviction, pauses/dips = caution)
- Compare to historical analogs (early 2024 launch phase, mid-2024 pauses, 2025 institutional ramp)
- Flag sustained inflows/outflows as proxies for institutional sentiment

## Tool Usage Strategy

### Primary: Delphi Digital

- `browse_page` on:
  - Main ETF flows page: `https://members.delphidigital.io/projects/bitcoin?subpage=etf-flows`
    - Instructions: "Extract latest daily net flows (total and per ETF in USD), 7d/30d aggregates, cumulative AUM, and historical table/chart data points (date + daily net flow in $M or $B) for the past 90+ days. Sample ~15-20 evenly spaced date/value pairs if chart present. Include top ETFs (e.g., IBIT, FBTC, GBTC) breakdowns if visible."

### Supplement (If Paywalled)

- Farside Investors: `https://farside.co.uk/bitcoin-etf/`
  - Instructions: "Extract latest BTC spot ETF daily flows table (total net and per ETF), cumulative totals, and historical data if available."
- SoSoValue: `https://www.sosovalue.xyz/assets/etf/btc`
  - Instructions: "Extract daily/weekly BTC ETF net flows, cumulative AUM, and historical chart points."
- `web_search`: "Bitcoin spot ETF daily flows Delphi Digital" or "BTC ETF flows today Farside"

### Analysis

- `code_execution` to:
  - Parse/clean extracted tabular data
  - Calculate 7d/30d rolling sums, streaks (consecutive positive/negative days), percentage changes
  - Detect anomalies (e.g., >$1B single-day inflow, multi-day outflow streaks)

## Output Format

```markdown
### BTC Spot ETF Flows Snapshot

- **Latest Daily Net Flow** (as of YYYY-MM-DD): +/− $X.XX B
- **7-Day Net Flow**: +/− $Y.YY B
- **30-Day Net Flow**: +/− $Z.ZZ B
- **Cumulative AUM** (all spot BTC ETFs): ~$A.AA B
- **Top Performers** (latest day): e.g., IBIT +$B.BB M, FBTC +$C.CC M, GBTC −$D.DD M

### 30–90 Day Trends

| Date       | Daily Net Flow ($M) | 7d Rolling ($B) | Cumulative AUM ($B) | Key Notes                 |
| ---------- | ------------------- | --------------- | ------------------- | ------------------------- |
| YYYY-MM-DD | +/− XXX             | +/− Y.YY        | Z.ZZ                | e.g., "Record inflow day" |
| ...        | ...                 | ...             | ...                 | ...                       |

(Limit to 12–20 rows max; prioritize recent weeks + major turning points/streaks.)

### Vibes & Insights

2–4 concise sentences interpreting the data:

- Current institutional demand pulse.
- Regime signals (accelerating inflows = conviction, pauses/outflows = caution or profit-taking).
- Historical parallels.
- Implications for BTC spot price resilience or macro sentiment.

Example:  
"Consistent positive inflows over the past week (~$2B total) with accelerating daily volumes—classic institutional accumulation phase similar to Q1 2024 post-launch. No signs of outflow pressure despite spot consolidation, supporting bullish conviction. Watch for sustained >$1B days as potential catalysts for upside breaks."

### Data Notes

- Sources: Primary Delphi Digital (URL browsed); supplements if used (list URLs)
- Timestamp: As of [current date/time UTC]
- If primary data unavailable (e.g., paywall): note clearly and confirm with alternatives.
```

## Integration Notes

- Feeds into `institutionalSpecialist` for ETF flow tracking
- Provides institutional demand signals (ETF inflows = regulated market conviction)
- Complements Nansen (#16) and Arkham (#24) for complete institutional picture
- Can inform strike selection (ETF flows affect spot price support/resistance)

## Performance Notes

- Cross-verify numbers across sources (Delphi, Farside, SoSoValue) for accuracy
- Prioritize total aggregate flows (highlight major ETF skews only if extreme)
- Note any discrepancies between sources

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: members.delphidigital.io (primary), farside.co.uk, sosovalue.xyz (alternatives)_
