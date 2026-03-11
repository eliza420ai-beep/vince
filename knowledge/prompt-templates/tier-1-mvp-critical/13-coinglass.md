---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #13: CoinGlass (Derivatives Leverage & Positioning)

**Priority**: Tier 1 - MVP Critical  
**Specialist**: `derivativesSpecialist`  
**Data Source**: CoinGlass API v4.0 (Hobbyist tier: 30 req/min, 70+ endpoints)

## Core Objectives

- Extract comprehensive derivatives data: Open Interest (OI), funding rates, liquidations, long-short ratios
- Cover **all major assets**: BTC, ETH, SOL, and top altcoins
- Assess leverage health and positioning across exchanges
- Identify liquidation risks and funding rate arbitrage opportunities
- Compare current readings to historical cycle benchmarks (2021 euphoria, 2020 accumulation, 2022 bear)
- Deliver cycle-aware derivatives snapshot for strike selection

## Supported Assets

- **Primary**: BTC, ETH, SOL
- **Secondary**: Top 20 by OI (DOGE, XRP, AVAX, LINK, etc.)
- **On Request**: Any asset available on CoinGlass

## Tool Usage Strategy

### Primary: CoinGlass API

- `code_execution` with `requests` to query CoinGlass API:
  - Base URL: `https://open-api-v4.coinglass.com/`
  - Headers: `CG-API-KEY: <your_api_key>`, `Accept: application/json`
  - Key endpoints for BTC derivatives:
    - `/api/futures/openInterest/ohlc-history` - OI history (symbol: BTC, limit: 30)
    - `/api/futures/fundingRate/ohlc-history` - Funding rate history
    - `/api/futures/liquidation/pair-liquidation-history` - Liquidation history
    - `/api/futures/longShortRatio/global-account-ratio` - Long/short ratios
    - `/api/futures/openInterest/aggregated-ohlc-history` - Aggregated OI across exchanges
    - `/api/futures/fundingRate/exchange-list` - Exchange-specific funding rates
    - `/api/futures/liquidation/liquidation-order` - Recent liquidation orders

### Rate Limiting Strategy

- CoinGlass Hobbyist tier: 30 requests per minute
- Implement request queuing with minimum 2-second intervals
- Cache responses for 60 seconds (data updates ≤1 minute)
- Use exponential backoff on 429 responses

### Fallback: Browse Page

- `browse_page` on `https://www.coinglass.com/btc` if API unavailable
  - Instructions: "Extract visible BTC derivatives metrics: current open interest (total $XXB), aggregated funding rate (XX%), 24h liquidations ($XXM), long/short ratio (XX%), and any exchange-specific breakdowns. Note units clearly."

## Output Format

```markdown
# Derivatives Leverage Snapshot – CoinGlass [Current Date]

## Market Overview (All Assets)

| Asset | OI ($B) | 24h Δ | Funding (8h) | 24h Liqs ($M) | L/S Ratio | Signal   |
| ----- | ------- | ----- | ------------ | ------------- | --------- | -------- |
| BTC   | $XX.XX  | +X.X% | X.XXXX%      | $XX.X         | X.XX      | 🟢/🟡/🔴 |
| ETH   | $XX.XX  | +X.X% | X.XXXX%      | $XX.X         | X.XX      | 🟢/🟡/🔴 |
| SOL   | $XX.XX  | +X.X% | X.XXXX%      | $XX.X         | X.XX      | 🟢/🟡/🔴 |

## BTC Derivatives (Primary Focus)

**Key Metrics**

- **Aggregated Open Interest**: $XX.XX B (±X.X% 24h change)
  → [Interpretation, e.g., "Moderate leverage, well below 2021 euphoria peaks (>$60B)"]
- **Aggregated Funding Rate**: X.XXXX% (24h weighted average)
  → [Interpretation, e.g., "Mildly positive – perpetuals bullish without overheating"]
- **24h Liquidations**: $XX.X M (Long: $X.X M | Short: $X.X M)
  → [Interpretation, e.g., "Low – minimal leverage flush, healthy vs bear-market spikes"]
- **Long/Short Ratio** (Global Accounts): X.XX
  → [Interpretation, e.g., "Slight long bias, not extreme positioning"]

## ETH Derivatives

[Same structure as BTC - condensed if similar signals]

## SOL Derivatives

[Same structure as BTC - condensed if similar signals]

## Exchange Breakdown (Top 3-5 by OI)

| Exchange | BTC OI | ETH OI | Funding Δ vs Avg | Notes            |
| -------- | ------ | ------ | ---------------- | ---------------- |
| Binance  | $X.X B | $X.X B | +X.XX%           | [any divergence] |
| OKX      | $X.X B | $X.X B | +X.XX%           |                  |
| Bybit    | $X.X B | $X.X B | +X.XX%           |                  |

## Leverage Health Assessment

[One-paragraph synthesis:]

- Overall leverage level vs historical benchmarks
- Funding rate sustainability (persistent positive = bullish positioning, extreme = top risk)
- Liquidation risk (low liqs = healthy, spiking = volatility ahead)
- Cross-asset divergences (ETH funding higher than BTC = relative positioning)

## Squeeze Risk Monitor

| Asset | Risk Level   | Trigger     | Watch Level           |
| ----- | ------------ | ----------- | --------------------- |
| BTC   | Low/Med/High | [condition] | [price/funding level] |
| ETH   | Low/Med/High | [condition] | [price/funding level] |
| SOL   | Low/Med/High | [condition] | [price/funding level] |

## Key Insights for Trading

• [Insight 1 – cross-asset observation]
• [Insight 2 – exchange divergence opportunity]
• [Insight 3 – funding rate arbitrage potential]

## Data Sources & Notes

- Source: CoinGlass API v4.0 (Hobbyist tier)
- Rate limit: 30 req/min (cached 60s)
- Data update frequency: ≤1 minute
- Assets covered: BTC, ETH, SOL + top 20 by OI on request
```

## Integration Notes

- Primary input for `derivativesSpecialist` (leverage & positioning core)
- Feeds into `regimeAggregatorSpecialist` for strike selection context
- Funding rates and OI directly impact 7-day options pricing (volatility expectations)
- Can be merged with #29 Deribit, #30 Skew, #31 Bitfinex into "Leverage Pulse" agent (per Grok suggestion)

## Performance Notes

- CoinGlass API provides comprehensive derivatives data across exchanges
- Hobbyist tier sufficient for most use cases (30 req/min with caching)
- Focus on cycle comparisons to ground current state in history
- Exchange-specific breakdowns reveal positioning divergences (arbitrage signals)

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_API Reference: https://docs.coinglass.com/reference/getting-started-with-your-api_
