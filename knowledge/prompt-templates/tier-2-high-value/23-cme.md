---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #23: CME Group (Futures Data & Institutional Vibes)

**Priority**: Tier 2 - High Value  
**Specialist**: `derivativesSpecialist`, `institutionalSpecialist`  
**Data Source**: CME Group official pages (regulated futures)

## Core Objectives

- Fetch Bitcoin futures data from CME: open interest, volume trends, basis dynamics (contango/backwardation), commitment of traders (COT)
- Assess institutional sentiment: record OI as conviction proxy, positive basis as bullish term structure
- Compare to aggregate derivatives (Coinglass) and historical analogs (2021 bull OI peaks, 2024 ETF-driven basis expansion)
- Emphasize CME's regulated/institutional nature vs. offshore venues

## Tool Usage Strategy

### Primary: CME Group Official Pages

- `browse_page` on:
  - Quotes/Overview: `https://www.cmegroup.com/markets/cryptocurrencies/bitcoin/bitcoin.html`
    - Instructions: "Extract current front-month price, volume, open interest (total, standard + micro), and globex/settlement details."
  - Volume & OI: `https://www.cmegroup.com/markets/cryptocurrencies/bitcoin/bitcoin.volume.html` and `...bitcoin.open-interest.html`
    - Instructions: "Extract latest daily/weekly volume and OI totals (in contracts and USD notional if shown), changes, and historical chart summaries."
  - Settlements: `https://www.cmegroup.com/markets/cryptocurrencies/bitcoin/bitcoin.settlements.html`
    - Instructions: "Extract recent settlement prices by contract month; calculate basis as front-month premium/discount to spot BRR or current spot price if referenced."
  - Micro futures: `https://www.cmegroup.com/markets/cryptocurrencies/bitcoin/micro-bitcoin.html`
  - COT reports: `https://www.cmegroup.com/tools-information/quikstrike/bitcoin-commitment-of-traders.html`
    - Instructions: "Extract leveraged funds net positioning (long/short) for BTC futures."

### Supplement

- Coinglass CME-specific: `https://www.coinglass.com/pro/futures/Cme`
- `web_search`: "CME Bitcoin futures open interest latest" OR "CME BTC COT report 2025/2026"
- CoinGecko for spot price (basis calculation)

### Analysis

- `code_execution` to:
  - Parse/clean extracted data
  - Convert contracts to USD notional (1 standard = 5 BTC, micro = 0.1 BTC)
  - Calculate basis % (futures price - spot)/spot
  - Aggregate trends, changes, rolling averages

## Output Format

```markdown
### CME BTC Futures Snapshot

- **Aggregate Open Interest**: X,XXX contracts (~$Y.YY B notional) | Standard: A.AA K | Micro: B.BB K (24h Δ: +/− C.C%)
- **Daily Volume**: Z,ZZZ contracts (~$W.WW B)
- **Front-Month Price**: $VV,VVV (Basis to Spot: +/− U.UU%)
- **COT Positioning** (latest weekly, if available): Leveraged Funds Net Long: +/− T.TK contracts

### 30–90 Day Trends

| Date       | OI (Contracts, K) | OI ($B) | Volume (Contracts, K) | Basis (%) | Key Notes      |
| ---------- | ----------------- | ------- | --------------------- | --------- | -------------- |
| YYYY-MM-DD | X.XX              | Y.YY    | Z.ZZ                  | +/− A.AA  | e.g., "OI ATH" |
| ...        | ...               | ...     | ...                   | ...       | ...            |

(Limit to 12–20 rows max; prioritize recent weeks + major turning points.)

### Comparison to Aggregate (Coinglass)

- CME share: "OI represents ~XX% of total perp/futures market; basis tighter/looser than offshore."
- Divergences: e.g., "CME showing stronger long positioning vs. neutral aggregate funding."

### Vibes & Insights

2–4 concise sentences interpreting the data:

- Current institutional futures pulse (OI buildup, basis direction).
- Regime signals (positive basis = bull conviction, flattening = caution).
- Historical parallels (e.g., similar to 2024 ETF inflows or 2021 leveraged peaks).
- Implications for BTC spot or broader regulated vs. offshore flows.

Example:  
"Record CME OI with persistent positive basis (~2–4%) signals strong institutional roll demand and bullish term structure—mirroring 2024 post-ETF launch phase. Volume steady amid spot highs, with leveraged funds net long growing. Contrasts milder offshore perp funding, highlighting regulated conviction."

### Data Notes

- Sources: CME Group (pages browsed: list URLs); supplements if used
- Timestamp: As of [current date/time UTC]
- Limitations: Note if data is end-of-day only, micro/standard separated, or COT weekly lag—and confirm with alternatives.
```

## Integration Notes

- Feeds into `derivativesSpecialist` for regulated futures context
- Complements `institutionalSpecialist` with COT positioning data
- Can be merged with #13 Coinglass, #29 Deribit into "Derivatives Pulse" agent (per Grok suggestion)
- Provides institutional conviction signals (CME basis = regulated market sentiment)

## Performance Notes

- CME is regulated venue (institutional focus) vs offshore
- Basis as key proxy (positive contango typically bullish for institutional carry)
- Always double-check extracted numbers (contract sizing, notional)

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: cmegroup.com_
