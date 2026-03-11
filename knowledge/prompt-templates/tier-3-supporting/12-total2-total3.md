---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #12: TOTAL2/TOTAL3 (Altcoin Market Caps & BTC Dominance)

**Priority**: Tier 3 - Supporting  
**Specialist**: `fundamentalsSpecialist`, `cycleContextSpecialist`  
**Data Source**: CoinGecko API (market cap calculations)

## Core Objectives

- Provide accurate snapshots of TOTAL2 (total crypto market cap excluding BTC) and TOTAL3 (total crypto market cap excluding BTC and ETH)
- Calculate BTC dominance precisely: `BTC Dominance = (BTC Market Cap / Total Crypto Market Cap) × 100`
- Deliver historical trends over past 12 months (sample to ~26-52 points max for readability)
- Highlight altcoin vs. BTC performance and altseason signals
- Assess Bitcoin dominance and liquidity rotation patterns

## Tool Usage Strategy

### Primary: CoinGecko API

- `code_execution` with Python `requests`:
  - Endpoint: `https://api.coingecko.com/api/v3/global` for current global metrics
  - Individual coin historical data for BTC, ETH
  - Reconstruct TOTAL2 and TOTAL3 from components:
    - `TOTAL2 ≈ Total Market Cap - BTC Market Cap`
    - `TOTAL3 ≈ Total Market Cap - BTC Market Cap - ETH Market Cap`
- For historical data: Pull daily market cap series, sample to bi-weekly or monthly averages (keep tables concise)
- Round large numbers sensibly (billions with 1-2 decimals, dominance to 2 decimals)

## Output Format

```markdown
### Current Snapshot

- **Total Crypto Market Cap**: $X.XX T
- **BTC Market Cap**: $X.XX T
- **ETH Market Cap**: $X.XX T
- **TOTAL2 (Alts ex-BTC)**: $X.XX T
- **TOTAL3 (Alts ex-BTC/ETH)**: $X.XX T
- **BTC Dominance**: XX.XX%

### 12-Month Trends

| Date       | Total Market Cap ($T) | TOTAL2 ($T) | TOTAL3 ($T) | BTC Dominance (%) |
| ---------- | --------------------- | ----------- | ----------- | ----------------- |
| YYYY-MM-DD | X.XX                  | X.XX        | X.XX        | XX.XX             |
| ...        | ...                   | ...         | ...         | ...               |

(Include ~12-24 rows max; use monthly endpoints or bi-weekly sampling for clarity.)

### Vibes & Insights

A concise 2-4 sentence narrative highlighting key trends, comparisons to historical cycles (e.g., 2017, 2021), and potential implications for altseason or BTC liquidity absorption.

Example:  
"TOTAL3 has dipped 15% in the last quarter while BTC dominance climbed to 56%—classic sign of BTC sucking up liquidity ahead of a potential alt rotation, similar to late 2017."

### Visual/Plot Notes (Optional)

If any sharp anomalies, breakouts, or divergences appear:

- Use pandas/matplotlib in `code_execution` to analyze.
- Describe key plot insights in text (e.g., "TOTAL3 shows a clear descending triangle vs. rising BTC dominance").
- Do not output raw images unless explicitly supported; keep everything text-based.
```

## Integration Notes

- Feeds into `fundamentalsSpecialist` for market structure context
- Used by `cycleContextSpecialist` for altseason/dominance cycle analysis
- Provides regime signal: rising dominance = BTC strength, falling = alt rotation risk
- Can inform strike selection (dominance trends affect volatility expectations)

## Performance Notes

- Prioritize accuracy over speed (double-check calculations)
- Always cite data source and timestamp
- If data temporarily unavailable, note clearly and suggest alternatives
- Cache or reuse data within session to avoid redundant calls

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: CoinGecko API_
