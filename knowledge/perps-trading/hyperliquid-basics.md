---
tags: [trading, derivatives, perps]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Hyperliquid Platform Fundamentals

## What is Hyperliquid?

Hyperliquid is a high-performance decentralized perpetual futures exchange built on its own L1 blockchain. It combines the speed of centralized exchanges with the transparency and self-custody of DeFi.

## Key Features

### Performance

- **Sub-second finality**: Transactions confirm in under 1 second
- **High throughput**: Handles 100,000+ orders per second
- **Zero gas fees**: No transaction fees for trading
- **On-chain order book**: Fully transparent, verifiable order matching

### Trading

- **50+ perpetual markets**: BTC, ETH, SOL, and many altcoins
- **Up to 50x leverage**: High leverage available on major pairs
- **Cross-margin by default**: Capital efficient position management
- **Market/Limit/Stop orders**: Full order type support

### HYPE Token

- **Native token**: Powers the Hyperliquid ecosystem
- **Staking rewards**: Earn rewards by staking HYPE
- **Fee discounts**: Reduced trading fees for HYPE holders
- **Governance**: Vote on protocol upgrades

## Trading Mechanics

### Funding Rates

- **8-hourly payments**: Funding settles every 8 hours
- **Positive funding**: Longs pay shorts (bullish market bias)
- **Negative funding**: Shorts pay longs (bearish market bias)
- **Typical range**: -0.1% to +0.1% per 8 hours

### Open Interest

- **Total OI**: Sum of all long positions (equals shorts by definition)
- **Rising OI + Rising Price**: New money entering long side (bullish)
- **Rising OI + Falling Price**: New money entering short side (bearish)
- **Falling OI**: Positions being closed regardless of direction

### Mark Price vs Oracle Price

- **Mark Price**: Used for liquidations, includes impact of order book
- **Oracle Price**: External price feed, used for funding calculations
- **Premium**: Difference between mark and oracle (indicates leverage bias)

## Key Metrics for Analysis

1. **Funding Rate**: Shows market sentiment and crowded trades
2. **Open Interest**: Money flow and position buildup
3. **Volume/OI Ratio**: Trading activity relative to positions
4. **Order Book Depth**: Liquidity at different price levels
5. **Liquidation Levels**: Where forced selling might occur

## Trading Tips

### For Margaux's Friday Strike Selection

- Check HYPE funding rate trend over the week
- Monitor OI changes for accumulation/distribution
- Use order book depth to gauge support/resistance
- Compare HYPE metrics to BTC/ETH for relative strength

### Risk Management

- Hyperliquid uses cross-margin by default
- Monitor account margin ratio during volatility
- Set stop losses to avoid liquidation
- Consider reducing leverage in high-funding environments
