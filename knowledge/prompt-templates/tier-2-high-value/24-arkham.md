---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #24: Arkham Intelligence (Wallet Tracking & Entity Labels)

**Priority**: Tier 2 - High Value  
**Specialist**: `institutionalSpecialist` (complements #16 Nansen)  
**Data Source**: Arkham Intelligence (platform.arkhamintelligence.com)

## Core Objectives

- Track smart money movements: entity-labeled flows (exchanges, ETFs, funds, whales, governments), large transfers, net inflows/outflows
- Detect signals: accumulation/distribution phases, regime shifts (fund inflows = institutional conviction, whale-to-exchange moves = profit-taking)
- Compare to historical analogs (2023 bear bottom accumulation, 2021 top distribution, post-ETF launch flows)
- Flag free tier limitations and pivot to alternatives when data restricted

## Tool Usage Strategy

### Primary: Arkham Intelligence Explorer

- `browse_page` on:
  - Main explorer: `https://platform.arkhamintelligence.com/explorer`
    - Instructions: "Search for 'Bitcoin' or top BTC entities (e.g., Binance, Coinbase, Grayscale, BlackRock IBIT, MicroStrategy, known whales). List top labeled entities with BTC holdings/activity. Provide direct URLs to entity dashboards."
  - Entity dashboards:
    - Exchanges: `/explorer/entity/binance`, `/coinbase`
      - Instructions: "Extract recent BTC transfers (in/out), net flow over 7d/30d if shown, total holdings, and top transactions (amount, date, counterparties)."
    - ETFs/Funds: `/explorer/entity/grayscale-bitcoin-trust`, `/blackrock-ibit`, `/fidelity-fbtc`
      - Instructions: "Extract latest inflows/outflows, cumulative holdings, recent large deposits/withdrawals."
    - Whales/Governments: Search known labels
      - Instructions: "Summarize recent movements and holdings."

### Supplement

- Whale Alert: `https://whale-alert.io/`
- Lookonchain summaries: `web_search` for "Lookonchain Bitcoin whale transfers latest"
- BitInfoCharts: `https://bitinfocharts.com/` large transfers

### Analysis

- `code_execution` to:
  - Parse/clean extracted transaction lists
  - Calculate net flows (sum inflows vs. outflows per entity or aggregate)
  - Aggregate top transfers or daily/weekly nets

## Output Format

```markdown
### Arkham BTC Wallet Flows Snapshot

- **Net Exchange Flows** (recent 7d/30d, if available): +/− X,XXX BTC (~$Y.YY B) (negative = net outflows/accumulation)
- **ETF/Fund Activity** (e.g., IBIT/GBTC): +/− Z,ZZZ BTC latest deposits
- **Top Recent Transfers**:
  - e.g., "5,000 BTC ($350M) from unknown wallet to Coinbase (YYYY-MM-DD)"
  - e.g., "10,000 BTC internal move in Binance cold wallet"
- **Active Labeled Entities**: List 4–6 with holdings/changes (e.g., MicroStrategy +A.AK BTC; Mt. Gox trustee dormant)

### Recent Trends (Key Flows/Transfers)

| Date       | Transfer Amount (BTC) | Direction/Entity         | Notes                       |
| ---------- | --------------------- | ------------------------ | --------------------------- |
| YYYY-MM-DD | +/− X,XXX             | e.g., Unknown → Coinbase | Potential OTC/sell pressure |
| ...        | ...                   | ...                      | ...                         |

(Limit to 8–15 rows max; prioritize large (>1,000 BTC) or entity-labeled moves from recent weeks.)

### Cross-Verification (Alternatives)

- Alignment: e.g., "Flows match Whale Alert large transfer logs."
- Divergences or supplements if primary limited.

### Vibes & Insights

2–4 concise sentences interpreting the data:

- Current smart money pulse (whale/fund accumulation vs. distribution).
- Regime signals (net outflows = HODL conviction, exchange inflows = caution).
- Historical parallels (e.g., similar to 2023 accumulation or 2021 whale games).
- Implications for BTC spot price or leverage risks.

Example:  
"Continued net outflows from exchanges combined with steady ETF deposits—classic institutional accumulation pattern with reduced sell pressure. Large whale clustering to self-custody echoes early 2023 bottom setups. No major distribution flags despite spot highs."

### Data Notes

- Sources: Arkham Intelligence (pages browsed: list URLs); alternatives if used (e.g., Whale Alert)
- Timestamp: As of [current date/time UTC]
- Limitations: Arkham free tier often limited to recent/surface data—deep flows may be pro-only; confirmed with public supplements where needed.
```

## Integration Notes

- Complements Nansen (#16) for smart money tracking (may merge per Grok suggestion)
- Feeds into `institutionalSpecialist` for wallet/entity flow analysis
- Provides labeled entity tracking (exchanges, ETFs, known funds/whales)
- Can inform strike selection (smart money positioning affects price pressure)

## Performance Notes

- Free tier often limited to recent/surface data (deep labels pro-only)
- Prioritize labeled entity flows (treat unknown large moves cautiously)
- Net exchange outflows as bullish signal (self-custody shift)
- Can be merged with Nansen for "Smart Money + Wallet Tracking" agent

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: platform.arkhamintelligence.com_
