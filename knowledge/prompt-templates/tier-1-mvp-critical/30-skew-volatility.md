---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #30 Variant: Skew (Options Volatility Skew & IV Metrics)

**Priority**: Tier 1 - MVP Critical  
**Specialist**: `derivativesSpecialist`  
**Data Source**: Skew.com (volatility-focused variant)

**Note**: This is a variant/complement to `30-skew.md` that focuses more specifically on volatility skew and IV metrics, while the original focuses on Put/Call ratios and risk reversals. Both are valuable and complement each other.

## Core Objectives

- Uncover market sentiment biases via options implied volatility (IV) and skew metrics: downside protection demand, upside conviction, term structure shifts
- Detect volatility regimes or directional tilts: steep negative skew (downside fear), positive skew (call demand/bullish), contango/backwardation in term structure
- Compare to historical analogs (2021 cycle tops with extreme downside skew, pre-2024 halving bullish flattening, post-crash put spikes)
- Cross-verify with Deribit data where possible

## Tool Usage Strategy

### Primary: Skew Dashboards

- `browse_page` on:
  - Main dashboard or BTC page: `https://skew.com/` or `https://app.skew.com/` or `https://sk3w.com/`
    - Instructions: "Focus on Bitcoin options section. Extract current ATM IV, term structure (IV by expiry), skew charts (25Δ and 10Δ risk reversal or put-call skew), volatility surface summary, and any free visible metrics. If charts present, sample ~10-15 evenly spaced date/value pairs for key lines (e.g., 25Δ skew, 3m ATM IV) over the longest visible period."
  - Specific asset page: `https://skew.com/dashboard/bitcoin`
    - Instructions: "Summarize free BTC volatility skew dashboard: current values for 25Δ/10Δ skew, RR (risk reversal), put/call IV diff by tenor, and top highlights."

### Supplement (If Paywalled)

- Deribit: `https://insights.deribit.com/` reports
- Laevitas: `https://laevitas.ch/data/options/bitcoin`
  - Instructions: "Extract current BTC options skew (25Δ RR, 10Δ), IV term structure, volatility surface, and historical chart samples."
- `web_search`: "BTC options volatility skew latest free" OR "Skew Bitcoin volatility skew update 2025/2026"

### Analysis

- `code_execution` to:
  - Parse/clean extracted data points
  - Calculate skew metrics if raw IVs provided (e.g., 25Δ put IV - call IV)
  - Detect trends/changes (e.g., skew moving from -8% to -2%)

## Output Format

```markdown
### BTC Options Volatility Skew Snapshot

- **ATM Implied Volatility** (e.g., 30d/90d): XX.X% / YY.Y%
- **25Δ Skew (Risk Reversal)**: +/− Z.Z% (positive = call premium/bullish)
- **10Δ Skew**: +/− W.W%
- **Term Structure**: e.g., "Contango (longer tenors higher IV)" or "Inverted"
- **Key Surface Highlights**: e.g., "Downside put wing elevated; upside calls cheap"

### 30–90 Day Trends (Where Available)

| Date/Period | 25Δ Skew (%) | ATM IV (30d %) | Term Structure Note | Key Notes                     |
| ----------- | ------------ | -------------- | ------------------- | ----------------------------- |
| YYYY-MM-DD  | +/− X.X      | Y.Y            | e.g., "Flat"        | e.g., "Skew flipped positive" |
| ...         | ...          | ...            | ...                 | ...                           |

(Limit to 10–15 rows max; prioritize recent weeks + major shifts.)

### Cross-Verification (Deribit/Alternatives)

- Alignment: e.g., "Skew data matches Deribit report quotes (25Δ RR ~+2%); term structure consistent."
- Divergences if any.

### Vibes & Insights

2–4 concise sentences interpreting the data:

- Current volatility sentiment pulse (downside fear vs. upside optimism).
- Regime signals (skew steepening = caution, flattening = conviction).
- Historical parallels (e.g., similar to 2021 tops or 2023 accumulation).
- Implications for spot BTC gamma or vol breakout risks.

Example:  
"Positive 25Δ skew with calls trading at premium—unusual bullish tilt in options pricing, echoing pre-halving 2023–2024 phases. Term structure in mild contango suggests no near-term vol crush expected. Skew less extreme than 2021 peak downside puts, supporting reduced tail risk."

### Data Notes

- Sources: Skew (pages browsed: list URLs); alternatives used if paywalled (e.g., Laevitas, Deribit reports)
- Timestamp: As of [current date/time UTC]
- Limitations: Note if primary Skew data paywalled/limited—confirm with alternatives; chart sampling approximate.
```

## Integration Notes

- Complements `30-skew.md` with more detailed volatility/skew focus
- Feeds into `derivativesSpecialist` for options sentiment analysis
- Provides IV term structure and volatility surface insights
- Can inform strike selection (skew reveals market bias, term structure affects pricing)

## Performance Notes

- Use alongside original `30-skew.md` for comprehensive options analysis
- Prioritize free/public metrics (clearly flag and pivot if Skew dashboard restricted)
- Interpret skew direction consistently (positive RR = call over put IV = bullish)

---

_Template Version: 1.0 (Variant)_  
_Last Tested: 2026-01-XX_  
_Source: skew.com_  
_Note: Complements original 30-skew.md - use both for comprehensive options analysis_
