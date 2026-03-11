---
tags: [defi, protocols, metrics]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# TVL Analysis Guide

## What is TVL?

Total Value Locked (TVL) measures the total amount of crypto assets deposited in a DeFi protocol. It's the most widely used metric for gauging protocol adoption and trust.

## TVL Calculation Methods

### Standard TVL

- Sum of all assets deposited in smart contracts
- Usually denominated in USD
- Affected by both deposits/withdrawals AND price changes

### Double-Counting Considerations

- **Example**: Deposit ETH in Aave → Get aETH → Deposit aETH in Yearn
- This creates "double counting" in aggregate TVL
- DefiLlama handles this in their adjusted metrics

## Interpreting TVL

### Absolute TVL

| TVL Range    | Classification          |
| ------------ | ----------------------- |
| > $10B       | Tier 1 / Blue Chip      |
| $1B - $10B   | Established Protocol    |
| $100M - $1B  | Mid-Cap Protocol        |
| $10M - $100M | Emerging Protocol       |
| < $10M       | Early Stage / High Risk |

### TVL Trends

- **Rising TVL + Rising Price**: Organic growth (bullish)
- **Rising TVL + Flat Price**: Accumulation (potentially bullish)
- **Falling TVL + Falling Price**: Capital flight (bearish)
- **Falling TVL + Rising Price**: Profit taking (watch carefully)

## Key TVL Metrics

### TVL/Market Cap Ratio

```
TVL/MCap Ratio = Protocol TVL / Token Market Cap
```

| Ratio     | Interpretation                                      |
| --------- | --------------------------------------------------- |
| > 1.0     | Potentially undervalued (locked value > market cap) |
| 0.5 - 1.0 | Fairly valued                                       |
| < 0.5     | Premium valuation or low capital efficiency         |

### TVL Dominance

```
Chain Dominance = Chain TVL / Total DeFi TVL
```

Track shifts in dominance to identify capital migration patterns.

### TVL Velocity

```
TVL Velocity = Trading Volume / TVL
```

Higher velocity = more active usage of locked capital.

## Chain-Level TVL Analysis

### Current Landscape (2024)

1. **Ethereum**: ~60% dominance, most established
2. **Solana**: Growing rapidly, low fees
3. **Arbitrum/Base**: L2 migration trends
4. **BSC**: Retail-heavy, lower TVL quality

### Migration Patterns to Watch

- ETH → L2s: Cost optimization
- EVM → Solana: Speed requirements
- Cross-chain: Bridge volume signals

## Protocol-Level Analysis

### Healthy Protocol Indicators

1. **Stable/Growing TVL**: Not declining long-term
2. **Diversified Depositors**: Not whale-dominated
3. **Organic Growth**: Not incentivized by excessive emissions
4. **Real Revenue**: Fees sustain operations

### Red Flags

- Sudden TVL drops (> 20% in 24h)
- TVL highly correlated with token price
- Most TVL in single asset/pool
- Native token > 50% of TVL

## TVL for Options Strategy

### Friday Strike Selection Context

1. **DeFi Sentiment**: Rising aggregate TVL = risk-on
2. **Chain Flows**: Where is capital moving?
3. **Protocol Health**: Is the underlying protocol stable?
4. **Yield Context**: High yields attract capital

### Monday Review Focus

- Weekly TVL changes across major protocols
- New protocol launches with significant TVL
- Cross-chain flow patterns
- Unusual TVL movements to investigate

## Data Sources

### Primary

- **DefiLlama**: Most comprehensive, open-source
- **Protocol Dashboards**: First-party data

### Secondary

- **DeFi Pulse**: Historical perspective
- **Token Terminal**: Revenue correlation
- **Dune Analytics**: Custom queries

## Best Practices

1. **Adjust for Price**: TVL in token terms vs USD
2. **Compare Peers**: Same-category protocols
3. **Track Over Time**: Point-in-time less useful than trends
4. **Cross-Reference**: Multiple data sources
5. **Consider Incentives**: Paid TVL vs organic TVL

## Related

- [180166429The Carry Trade](180166429the-carry-trade.md)
- [180496598Yearn Finance](180496598yearn-finance.md)
- [181420524The Big Six](181420524the-big-six.md)
- [Crypto Tax Frameworks](../regulation/crypto-tax-frameworks.md)
- [Global Regulatory Map](../regulation/global-regulatory-map.md)
