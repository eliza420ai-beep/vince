---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #13 Variant: CoinGlass (Derivatives Vibes & Flows - Browse Page Approach)

**Priority**: Tier 1 - MVP Critical  
**Specialist**: `derivativesSpecialist`  
**Data Source**: Coinglass.com (browse page approach - alternative to API version)

**Note**: This is a variant of `13-coinglass.md` that uses `browse_page` instead of API calls. The API version (`13-coinglass.md`) is preferred for programmatic access, but this variant is useful if API access is unavailable or for quick manual checks.

## Core Objectives

- Fetch Bitcoin perpetual futures data from Coinglass via browse_page
- Assess leverage buildup, market sentiment, funding dynamics, potential regime shifts
- Detect signals: overheating, flush risks, bull/bear conviction
- Compare to historical analogs (2021 bull, 2022 bear, March 2025 flush)

## Tool Usage Strategy

### Primary: Coinglass Browse Pages

- `browse_page` on targeted URLs:
  - Open Interest: `https://www.coinglass.com/BitcoinOpenInterest` or `https://www.coinglass.com/pro/futures/BitcoinOpenInterest`
    - Instructions: "Extract current aggregate BTC OI in USD, 24h change, and historical chart data points (date + OI value) for the past 90 days."
  - Funding Rates: `https://www.coinglass.com/FundingRate`
    - Instructions: "Extract current BTC funding rate (8h), predicted rate, average over periods, and historical chart data (date + rate) for past 90 days. Include major exchange breakdown if visible."
  - Long/Short Ratios: `https://www.coinglass.com/LongShortRatio`
    - Instructions: "Extract global BTC long/short accounts ratio, top trader ratio, and 24h/7d changes. Pull historical data if chart is available."
  - Liquidations: `https://www.coinglass.com/LiquidationData` or heatmap
    - Instructions: "Extract 24h BTC liquidations (long vs short in USD), recent spikes, and any heatmap summary."
- Use multiple `browse_page` calls in parallel
- If charts present: "Sample ~15-20 evenly spaced date/value pairs from the visible chart"

### Supplement

- `web_search`: "Bitcoin perpetual futures open interest historical Coinglass" if data incomplete

### Analysis

- `code_execution` to:
  - Parse and clean extracted data
  - Calculate averages, changes, ratios
  - Detect anomalies (e.g., funding > 0.05% sustained, OI ATHs)
  - Generate trend descriptions

## Output Format

```markdown
### Current Derivatives Snapshot

- **Aggregate BTC Open Interest**: $X.XX B (24h Δ: +Y.YY%)
- **Current Funding Rate**: Z.ZZ% (8h average; predicted: W.WW%)
- **Global Long/Short Ratio (Accounts)**: A.AA : 1 (24h Δ: +B.B%)
- **Top Trader Long/Short Ratio**: C.CC : 1
- **24h Liquidations**: $D.DD B total ($E.E long / $F.F short)

### 30–90 Day Trends

| Date       | OI ($B) | Funding Rate (%) | L/S Accounts Ratio | Key Notes                      |
| ---------- | ------- | ---------------- | ------------------ | ------------------------------ |
| YYYY-MM-DD | X.XX    | Y.YY             | Z.ZZ : 1           | e.g., "OI peak, funding spike" |
| ...        | ...     | ...              | ...                | ...                            |

(Limit to 12–20 rows max; prioritize recent weeks + major turning points.)

### Vibes & Insights

2–4 concise sentences interpreting the data:

- Current leverage pulse and sentiment.
- Risk signals (overheating, potential flush, capitulation).
- Historical parallels.
- Implications for spot price or alt flows.

Example:  
"Funding has flipped persistently positive (0.04–0.08%) while OI climbs to new local highs—classic late-stage bull conviction where longs are willing to pay up. Similar to Q4 2020 and early 2025 setups before major leg ups, but watch for long liquidations if spot cracks."

### Data Notes

- Sources: Coinglass.com (pages browsed: list URLs)
- Timestamp: As of [current date/time UTC]
- If any metric unavailable: note clearly and provide best alternative.
```

## Integration Notes

- Alternative approach to `13-coinglass.md` (API version preferred for production)
- Feeds into `derivativesSpecialist` for leverage & positioning
- Same integration points as API version

## Performance Notes

- Use when API access unavailable or for manual validation
- Browse page approach less reliable than API (may miss data)
- Charts require careful extraction (approximate values)

---

_Template Version: 1.0 (Variant)_  
_Last Tested: 2026-01-XX_  
_Note: Prefer API version (`13-coinglass.md`) when possible_
