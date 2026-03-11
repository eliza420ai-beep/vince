---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #29: Deribit (Options Chain Data - CRITICAL for 7-Day Options)

**Priority**: Tier 1 - MVP Critical (HIGHEST PRIORITY)  
**Specialist**: `derivativesSpecialist`  
**Data Source**: Deribit API (BTC, ETH, SOL options)

## Core Objectives

- Pull fresh Deribit 7-day options chain for BTC, SOL, ETH
- Extract full IV surface, skew, OI clusters, volume, Greeks, funding rates
- Identify richest premiums and OI magnets for strike selection
- Calculate expected moves and probability distributions
- Output structured data for `regimeAggregatorSpecialist` (Hypersurface table generation)

## Tool Usage Strategy

### Primary: Deribit API

- `code_execution` with Python `requests` to query Deribit API:
  - Base URL: `https://www.deribit.com/api/v2/`
  - Authentication: API key + secret (generate at https://www.deribit.com/account/api)
  - Key endpoints:
    - `/public/get_book_summary_by_currency` - Summary for BTC/ETH/SOL
    - `/public/get_instruments` - List all options (filter: `kind=option`, `currency=BTC|ETH|SOL`)
    - `/public/get_order_book` - Order book for specific instrument
    - `/public/get_tradingview_chart_data` - Historical data
    - `/public/get_historical_volatility` - Realized volatility
    - `/public/get_implied_volatility` - IV data
    - `/public/ticker` - Latest ticker data (OI, volume, mark IV, Greeks)

### Key Data Points to Extract

For 7-day options (closest expiry ~7 days out):

1. **Options Chain**: All strikes with:
   - Bid/Ask/Last prices
   - Open Interest (OI) per strike
   - Volume (24h)
   - Implied Volatility (IV)
   - Greeks (Delta, Gamma, Theta, Vega)
   - Mark price (mid)

2. **IV Surface**:
   - ATM IV (at-the-money)
   - Skew (25 delta call IV - 25 delta put IV)
   - Term structure (7-day vs longer-dated)

3. **OI Clusters**:
   - Strikes with highest OI (put/call walls)
   - Volume spikes (unusual activity)

4. **Funding Rates**:
   - Perpetual funding rate
   - Historical context

### Fallback: Browse Page

- `browse_page` on Deribit options pages:
  - https://www.deribit.com/options/BTC (for BTC)
  - https://www.deribit.com/options/ETH (for ETH)
  - https://www.deribit.com/options/SOL (for SOL)
  - Instructions: "Extract options chain data for closest 7-day expiry (~7 days out). For each strike, extract: Strike price, Bid/Ask/Last, Open Interest, Volume (24h), Implied Volatility, Delta, Gamma, Theta, Vega. Identify highest OI strikes (put/call walls) and richest premium strikes. Extract current funding rate for perpetual."

## Output Format

```markdown
# Deribit 7-Day Options Chain Snapshot – [Current Date]

**Current Spot & Context**

- **BTC Spot**: $XX,XXX
- **ETH Spot**: $X,XXX
- **SOL Spot**: $XXX.XX
- **Perpetual Funding Rate**: X.XXXX% (24h average)
- **ATM IV (7-day)**: BTC XX% | ETH XX% | SOL XX%
- **IV Skew (25Δ)**: BTC Call-Put = ±X.X% | ETH = ±X.X% | SOL = ±X.X%

**Options Chain Highlights (7-Day Expiry)**

### BTC Options

- **Expiry**: [Date] (~7 days)
- **Highest OI Strikes**:
  - Calls: $XX,XXX (OI: X,XXX contracts)
  - Puts: $XX,XXX (OI: X,XXX contracts)
- **Richest Premiums** (High IV strikes):
  - [Strike] Call: $XXX premium (IV: XX%)
  - [Strike] Put: $XXX premium (IV: XX%)
- **OI Distribution**: [Brief description, e.g., "Heavy call OI at $100k, put support at $95k"]

### ETH Options

[Same structure as BTC]

### SOL Options

[Same structure as BTC]

**Expected Moves (7-Day)**
Based on ATM IV:

- **BTC**: ±$X,XXX (±X.X%) expected move (1 std dev)
- **ETH**: ±$XXX (±X.X%) expected move
- **SOL**: ±$XX (±X.X%) expected move

**Probability Distributions**

- **BTC**: ~68% chance to stay within $XX,XXX - $XX,XXX range
- **ETH**: ~68% chance to stay within $X,XXX - $X,XXX range
- **SOL**: ~68% chance to stay within $XXX - $XXX range

**Strike Selection Insights**
• **Covered Calls**: [Top 6-8 OTM strikes with rich premiums, sorted by APR potential]

- Strike $XX,XXX: Sell price $XXX, APR ~XX%, Hold prob ~XX% (based on Delta/Greeks)
  • **Cash-Secured Puts**: [Top 6-8 ITM/OTM strikes with rich premiums]
- Strike $XX,XXX: Sell price $XXX, APR ~XX%, Assignment prob ~XX%

**Greeks Analysis**

- **Delta clustering**: [Note if calls/puts showing extreme deltas = positioning bias]
- **Gamma hotspots**: [Strikes with high gamma = potential volatility amplification]
- **Theta decay**: [Premium decay rate for 7-day options]

**Data Sources & Notes**

- Source: Deribit API (authenticated requests)
- API Key: Required (generate at https://www.deribit.com/account/api)
- Rate limits: Check Deribit API documentation
- Limitations: Free tier may have rate limits; consider paid tier for production
```

## Integration Notes

- **CRITICAL** for `derivativesSpecialist` - primary source for 7-day options data
- Direct input to `regimeAggregatorSpecialist` for Hypersurface table generation
- Output format designed for easy parsing into strike recommendation tables
- Can be merged with #13 Coinglass, #30 Skew into "Derivatives Pulse" agent (per Grok suggestion)

## Performance Notes

- Deribit is the primary options exchange for BTC/ETH/SOL
- 7-day options are closest weekly expiry (usually ~7 days out, adjust if needed)
- Focus on OI clusters and richest premiums for strike selection edge
- Greeks (Delta) can proxy for probability of holding/assignment
- IV skew reveals market sentiment (call skew = bullish, put skew = bearish)

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_API Reference: https://docs.deribit.com/_
