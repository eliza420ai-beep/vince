---
tags: [trading, options, derivatives]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Strike Selection from Perps Data

A practical workflow for translating perpetual futures data into options strike selection for Hypersurface.

## The Core Framework

Perps data provides **sentiment context** that IV and Greeks don't capture:

```
Traditional: IV + Delta → Strike
Enhanced:    Perps Pulse + IV + Delta → Strike
```

## The 3-Step Workflow

### Step 1: Gather Perps Pulse (HyperliquidAnalyst)

Query HyperliquidAnalyst for:

- Funding rates for BTC, ETH, SOL, HYPE
- Squeeze risk assessment
- Overall market bias
- Strike guidance per asset

### Step 2: Apply Strike Adjustments

Based on funding data:

| Funding          | Crowding       | Call Strike | Put Strike  |
| ---------------- | -------------- | ----------- | ----------- |
| > +0.03%         | Extreme longs  | 25-30 delta | 25-30 delta |
| +0.01% to +0.03% | Crowded longs  | 25 delta    | 20-25 delta |
| -0.01% to +0.01% | Neutral        | 20-25 delta | 20-25 delta |
| -0.03% to -0.01% | Crowded shorts | 20-25 delta | 20 delta    |
| < -0.03%         | Extreme shorts | 25-30 delta | 15-20 delta |

### Step 3: Final Strike Selection (DeribitAnalyst)

Combine perps pulse with:

- Current IV levels
- Historical IV percentile
- Expiry (weekly Friday)
- Account position limits

## Example Workflow

**Friday Morning Routine:**

1. Ask HyperliquidAnalyst: "Friday strikes please"
2. Receive:
   - BTC: +0.02% (crowded) → Wider calls
   - ETH: +0.005% (neutral) → Standard
   - SOL: -0.01% (shorts paying) → Tighter CSPs OK
   - HYPE: +0.03% (very crowded) → Much wider calls

3. Ask DeribitAnalyst: "Friday strikes for BTC, ETH, SOL" with context
4. DeribitAnalyst factors in:
   - Perps guidance from HyperliquidAnalyst
   - Current IV surface
   - Premium targets ($1K-$2K weekly)
5. Final strikes selected with perps-informed adjustments

## Asset-Specific Considerations

### BTC

- Most liquid perps market
- Funding usually tracks overall crypto sentiment
- Standard interpretation applies

### ETH

- Often trades with BTC but can diverge
- Check for ETF flow impacts
- Gas usage affects positioning

### SOL

- More volatile than BTC/ETH
- Funding can swing more dramatically
- Consider additional buffer on strikes

### HYPE

- Unique to Hyperliquid
- Often more crowded (both directions)
- Consider 1.5x strike width adjustments
- Lower liquidity = wider strikes

## When to Override Perps Guidance

1. **Major News Events**: News can overwhelm funding signals
2. **Technical Levels**: Strong support/resistance overrides
3. **Options-Specific Factors**: Extreme IV can override
4. **Position Limits**: Account safety takes priority

## Integration Checklist

Before finalizing weekly strikes:

- [ ] Checked funding for all target assets
- [ ] Identified any squeeze risks
- [ ] Noted overall market bias
- [ ] Applied strike adjustments per asset
- [ ] Cross-referenced with IV levels
- [ ] Verified premiums meet targets
- [ ] Confirmed within position limits

## Cross-Agent Communication

The workflow involves two agents:

1. **HyperliquidAnalyst**: Provides perps pulse
   - Output: Strike guidance per asset
   - Published to: agent-comms (options_context)

2. **DeribitAnalyst**: Final strike selection
   - Input: Perps context + IV data
   - Output: Specific strike recommendations

This separation ensures:

- Specialized expertise per agent
- Clear data provenance
- Consistent workflow every Friday

## Common Mistakes to Avoid

1. **Ignoring Perps for Options**: Perps sentiment is a leading indicator
2. **Over-Relying on Single Reading**: Check trends, not just current funding
3. **Same Width All Assets**: Each asset has different crowding
4. **Skipping HYPE Check**: HYPE is unique and often most volatile
5. **Friday Morning Rush**: Check Thursday night to plan ahead
