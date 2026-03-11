---
tags: [trading, derivatives, perps]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Funding Rate Interpretation Guide

A practical guide to interpreting perpetual futures funding rates for options strike selection.

## What Funding Rates Tell Us

Funding rates reveal **positioning sentiment** in the perpetual futures market:

| Funding Rate     | What It Means           | Crowd Position   |
| ---------------- | ----------------------- | ---------------- |
| > +0.05% (8h)    | Extremely crowded longs | Very bullish     |
| +0.02% to +0.05% | Crowded longs           | Bullish          |
| +0.01% to +0.02% | Mildly long-biased      | Slightly bullish |
| -0.01% to +0.01% | Neutral/balanced        | No strong bias   |
| -0.02% to -0.01% | Shorts paying           | Slightly bearish |
| < -0.02%         | Crowded shorts          | Very bearish     |

## Options Strike Implications

### Crowded Longs (Positive Funding)

When funding is positive, longs are paying shorts to hold their positions:

1. **Dump Risk Elevated**: Crowded longs can cascade into liquidations on any pullback
2. **Call Strikes**: Use WIDER strikes (25-30 delta) to account for volatility
3. **Put Strikes**: CSPs are riskier - rapid downside possible

### Crowded Shorts (Negative Funding)

When funding is negative, shorts are paying longs:

1. **Squeeze Potential**: Short squeeze can cause rapid upside
2. **Call Strikes**: Be cautious - assignment risk elevated
3. **Put Strikes**: Can tighten CSP strikes (15-20 delta) - tailwind from squeeze

### Neutral Funding

Balanced positioning indicates no extreme crowding:

1. **Standard Strikes**: Use typical 20-30 delta approach
2. **Both Sides**: Normal risk on calls and puts
3. **Focus on IV**: Let volatility drive strike selection

## Annualized Funding Perspective

To contextualize 8h funding, annualize it:

- **Annualized Rate** = 8h Rate × 3 × 365
- Example: +0.02% × 3 × 365 = +21.9% annual

This helps compare to:

- Risk-free rates (~5%)
- Historical crypto volatility
- Option premium yields

## Red Flags to Watch

1. **Extreme Funding (>0.05%)**: Imminent correction likely
2. **Funding Divergence**: When funding and price disagree (e.g., price up but funding falling)
3. **Sudden Spikes**: Rapid funding changes indicate new positioning
4. **Cross-Asset Divergence**: When one asset's funding differs dramatically from others

## Integration with Options Strategy

For Hypersurface covered calls and CSPs:

1. **Friday Check**: Always check funding before setting weekly strikes
2. **Strike Width Priority**: Funding > IV > Delta for strike selection
3. **Assignment Protection**: Widen strikes when opposite-side squeeze risk is high
4. **HYPE Specifics**: HYPE funding often more volatile than majors - extra caution

## Data Sources

- **Hyperliquid**: Primary source for BTC, ETH, SOL, HYPE
- **Update Frequency**: 8-hour settlement periods
- **Historical Trend**: 7-day funding trend provides momentum context
