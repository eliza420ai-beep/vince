---
tags: [trading, derivatives, perps]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Squeeze Patterns in Perpetual Futures

Understanding squeeze dynamics for options risk management.

## What is a Squeeze?

A squeeze occurs when crowded positioning forces rapid, violent price moves:

- **Long Squeeze**: Crowded longs get liquidated → rapid price crash
- **Short Squeeze**: Crowded shorts get liquidated → rapid price spike

## Identifying Squeeze Risk

### High Squeeze Risk Indicators

| Indicator            | Long Squeeze Risk               | Short Squeeze Risk                 |
| -------------------- | ------------------------------- | ---------------------------------- |
| Funding Rate         | > +0.05% (8h)                   | < -0.03% (8h)                      |
| Open Interest        | High and rising                 | High and rising                    |
| Price Action         | Extended rally                  | Extended decline                   |
| Liquidation Cascades | Small dips causing liquidations | Small bounces causing liquidations |

### Warning Signs

1. **Funding Extremes**: Rates at multi-week highs/lows
2. **OI Build Without Price Move**: Positions accumulating without corresponding price action
3. **Funding/Price Divergence**: Price flat but funding spiking
4. **Whale Positioning**: Large accounts taking opposite side

## Squeeze Mechanics

### Long Squeeze Cascade

1. Price starts declining
2. Overleveraged longs get margin called
3. Forced selling accelerates decline
4. More longs liquidated → more selling
5. Price crashes 10-30% in hours

### Short Squeeze Cascade

1. Price starts rising
2. Shorts get margin called
3. Forced buying accelerates rally
4. More shorts liquidated → more buying
5. Price spikes 10-30% in hours

## Options Implications

### During Long Squeeze Risk

- **Covered Calls**: Safer - rapid decline unlikely to breach call strikes
- **CSPs**: DANGEROUS - rapid decline can breach put strikes immediately
- **Action**: Widen put strikes significantly or reduce CSP positions

### During Short Squeeze Risk

- **Covered Calls**: DANGEROUS - rapid rally can breach call strikes
- **CSPs**: Safer - rapid rally moves price away from puts
- **Action**: Widen call strikes significantly

## Risk Levels and Strike Adjustments

| Squeeze Risk | Call Strike Adjustment  | Put Strike Adjustment   |
| ------------ | ----------------------- | ----------------------- |
| None         | Standard 20-30 delta    | Standard 20-30 delta    |
| Low          | Standard                | Standard                |
| Medium       | +5 delta wider (25-30)  | +5 delta wider (25-30)  |
| High         | +10 delta wider (30-35) | +10 delta wider (30-35) |
| Extreme      | Consider skipping       | Consider skipping       |

## Historical Squeeze Examples

### Crypto Long Squeezes

- BTC April 2021: -25% in 24 hours after extreme positive funding
- ETH May 2022: -15% rapid decline during crowded longs

### Crypto Short Squeezes

- BTC October 2021: +15% in hours during crowded shorts
- HYPE Launch: Massive short squeeze as shorts bet against launch

## Monitoring Protocol

1. **Daily Check**: Review funding rates for all target assets
2. **Pre-Friday Review**: Essential before setting weekly options
3. **Intraday Alerts**: Set alerts for funding extremes (>0.05% or <-0.03%)
4. **Cross-Asset Compare**: Check if squeeze risk is isolated or broad

## Integration with Strike Selection

When squeeze risk is elevated:

1. **Identify Direction**: Long squeeze (positive funding) or short squeeze (negative)
2. **Assess Magnitude**: How extreme is the funding?
3. **Adjust Opposite Side**: If long squeeze risk → widen CSPs
4. **Consider Skipping**: Extreme risk may warrant sitting out
5. **Document Reasoning**: Track decisions for pattern learning
