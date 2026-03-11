---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #30: Skew (Derivatives Analytics & Risk Metrics)

**Priority**: Tier 1 - MVP Critical  
**Specialist**: `derivativesSpecialist`  
**Data Source**: Skew.com (derivatives analytics platform)

## Core Objectives

- Extract derivatives risk metrics: Put/Call ratios, Skew index, Risk reversals
- Analyze options flow and positioning sentiment
- Compare implied vs realized volatility spreads
- Identify unusual options activity (large block trades, unusual strikes)
- Provide risk-adjusted context for strike selection

## Tool Usage Strategy

### Primary: Skew Dashboard

- `browse_page` on Skew.com:
  - Main dashboard: https://skew.com/dashboard
  - BTC options: https://skew.com/dashboard/bitcoin-options
  - ETH options: https://skew.com/dashboard/ethereum-options
  - Instructions: "Extract current Bitcoin and Ethereum derivatives metrics: Put/Call ratio (options), Skew index (25Δ risk reversal), Put/Call OI ratio, Implied Volatility (IV) vs Realized Volatility (RV) spread, Unusual options activity (large trades, unusual strikes), Options flow (call/put buying pressure). Include any highlighted risk signals or positioning extremes. Note current values and recent trends (24h/7d changes if visible)."

### Secondary: Skew Charts

- `browse_page` on specific Skew charts:
  - IV/RV spread: https://skew.com/dashboard/bitcoin-options/iv-rv-spread
  - Skew index: https://skew.com/dashboard/bitcoin-options/skew
  - Options flow: https://skew.com/dashboard/bitcoin-options/options-flow
  - Instructions: "Extract current readings from charts, recent trends (rising/falling), and any annotations or highlighted levels. Describe chart patterns and key levels."

### Fallback: Web Search

- `web_search`: "skew.com bitcoin options put call ratio latest" OR "skew bitcoin risk reversal January 2026"
  - If Skew site is paywalled or limited, search for shared screenshots or summaries

## Output Format

```markdown
# Skew Derivatives Analytics Snapshot – [Current Date]

**Key Risk Metrics**

### BTC Options

- **Put/Call Ratio** (Options Volume): X.XX
  → [Interpretation, e.g., "Elevated >1.0 = put buying pressure, bearish positioning"]
- **Put/Call OI Ratio**: X.XX
  → [Interpretation, e.g., "Call-heavy OI = bullish positioning held"]
- **Skew Index** (25Δ Risk Reversal): ±X.X%
  → [Interpretation, e.g., "Positive = call skew = bullish sentiment, Negative = put skew = bearish"]
- **IV vs RV Spread**: IV XX% vs RV XX% = ±X.X% spread
  → [Interpretation, e.g., "IV > RV = options rich, IV < RV = options cheap"]

### ETH Options

[Same structure as BTC]

**Options Flow Analysis**

- **Call Buying Pressure**: [High/Moderate/Low] - [Description of recent call buying]
- **Put Buying Pressure**: [High/Moderate/Low] - [Description of recent put buying]
- **Unusual Activity**: [Note any large block trades, unusual strikes, or flow anomalies]

**Positioning Sentiment**
[One-paragraph synthesis:]

- Overall options positioning (bullish/bearish/neutral based on P/C ratios and skew)
- Risk sentiment (extreme skew = fear/greed, balanced = neutral)
- Flow direction (buying pressure on calls vs puts)

**Strike Selection Implications**
• [Insight 1 – e.g., "High put/call ratio suggests bearish hedging—OTM puts may have rich premiums but assignment risk elevated"]
• [Insight 2 – e.g., "Positive skew (call premium) indicates bullish sentiment—covered calls at OTM strikes likely to hold"]
• [Insight 3 – e.g., "IV > RV spread of X% means options are expensive—favor selling (covered calls/cash-secured puts)"]

**Data Sources & Notes**

- Source: Skew.com dashboard (free/public data)
- Limitations: Some advanced metrics may require account; note if data is limited
- Update frequency: Real-time or near-real-time
```

## Integration Notes

- Feeds into `derivativesSpecialist` for options flow and positioning context
- Complements Deribit (#29) with risk-adjusted metrics (P/C ratios, skew index)
- Provides sentiment overlay for strike selection (extreme positioning = contrarian edge)
- Can be merged with #13 Coinglass, #29 Deribit into "Derivatives Pulse" agent (per Grok suggestion)

## Performance Notes

- Skew provides unique risk metrics not available in raw options chain data
- Put/Call ratios reveal market sentiment (elevated ratios = fear, low ratios = greed)
- Skew index (risk reversal) shows options pricing bias (call vs put premium)
- IV/RV spread indicates whether options are rich or cheap (sell rich, buy cheap)
- Focus on unusual activity for early positioning signals

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: https://skew.com/_
