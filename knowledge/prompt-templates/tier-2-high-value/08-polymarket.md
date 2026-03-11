---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #8: Polymarket (Prediction Markets Analysis)

**Priority**: Tier 2 - High Value  
**Specialist**: `regimeAggregatorSpecialist`, `polymarketSpecialist`  
**Data Source**: Polymarket prediction markets

## Core Objectives

- Extract crypto and macro sentiment from active Polymarket prediction markets
- Cover **all relevant markets**: BTC, ETH, SOL price targets, regulatory, macro events
- Categorize by time horizons: Short-term (1–7 days), Mid-term (1 week–3 months), Long-term (3–12 months)
- Translate prediction market odds into actionable signals
- Act as market expectation proxy for trading decisions

## Supported Categories

- **Crypto Price**: BTC, ETH, SOL reaching price thresholds
- **Regulatory**: ETF approvals, SEC actions, legislation
- **Macro**: Fed rates, elections, economic events affecting crypto
- **Protocol-Specific**: Ethereum upgrades, Solana milestones, etc.

## Tool Usage Strategy

### Get Current BTC Price

- `web_search`: "current bitcoin price USD"
- OR `browse_page`: https://www.coingecko.com/en/coins/bitcoin or https://coinmarketcap.com/currencies/bitcoin/
  - Instructions: "Extract the current live Bitcoin price in USD."

### Fetch Polymarket BTC Markets

- `browse_page` on:
  - https://polymarket.com/crypto
  - https://polymarket.com/bitcoin
  - https://polymarket.com/search?query=bitcoin+price
  - Instructions: "List all active Bitcoin price-related markets. For each market, extract: Full market title/question, Resolution date, Yes probability % (current Yes share price), No probability %, Total volume (in USD), Liquidity (if available). Prioritize markets about BTC reaching specific price thresholds (e.g., 'Will Bitcoin be above $X on DATE?') or price range markets. Ignore unrelated or resolved markets."

### Fallback Search

- `web_search`: "Polymarket Bitcoin price markets odds" OR "Polymarket BTC $100k $150k predictions"

### Analysis (if needed)

- `code_execution` to:
  - Average probabilities across similar markets
  - Calculate implied expected price (if multiple thresholds)
  - Compute sentiment score (0–100 scale: 50 = neutral, >70 strongly bullish, <30 strongly bearish)

## Output Format

```markdown
# BTC Sentiment Snapshot – Polymarket (as of [CURRENT DATE])

**Current BTC Price**: $[PRICE] USD

## Short-Term Sentiment (1–7 days)

- [Market title or summary]: [Yes %]% chance [event] (Volume: $[VOLUME])
- Overall: [Bullish / Moderately Bullish / Neutral / Moderately Bearish / Bearish] – "[brief 1-sentence explanation]"

## Mid-Term Sentiment (1 week–3 months)

- [Market 1]: [Yes %]% chance [event] (Volume: $[VOLUME])
- [Market 2 (if any)]: [Yes %]% chance [event] (Volume: $[VOLUME])
- Overall: [Bullish / Moderately Bullish / Neutral / Moderately Bearish / Bearish] – "[brief 1-sentence explanation]"

## Long-Term Sentiment (3–12 months)

- [Market 1]: [Yes %]% chance [event] (Volume: $[VOLUME])
- [Market 2 (if any)]: [Yes %]% chance [event] (Volume: $[VOLUME])
- Overall: [Bullish / Moderately Bullish / Neutral / Moderately Bearish / Bearish] – "[brief 1-sentence explanation, e.g., Market pricing ~65% chance of $150k+ by end of 2026]"

**Key Insight**: [One-sentence overall market vibe across horizons]
```

## Integration Notes

- Feeds into `regimeAggregatorSpecialist` for regime context
- Can inform `thesisValidatorSpecialist` (market expectations vs fair value)
- Short-term sentiment (1–7 days) directly relevant for 7-day options

## Performance Notes

- Cross-check multiple markets per horizon (favor higher-volume markets)
- Binary markets: Yes % = probability of hitting that price
- Range markets: Extract highest-probability bins and implied expected price

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_
