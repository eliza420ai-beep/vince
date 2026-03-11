---
tags: [trading, options, derivatives]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Options Fundamentals for Crypto Trading

## Core Concepts

### Option Types

- **Call Option**: Right to BUY the underlying asset at the strike price
- **Put Option**: Right to SELL the underlying asset at the strike price

### Key Terms

- **Strike Price**: The price at which you can exercise the option
- **Premium**: The cost to buy the option
- **Expiration**: When the option contract ends
- **ITM (In-The-Money)**: Option has intrinsic value (call: spot > strike, put: spot < strike)
- **OTM (Out-of-The-Money)**: Option has no intrinsic value
- **ATM (At-The-Money)**: Strike price ≈ current spot price

## The Greeks

### Delta (Δ)

- **Measures**: How much option price changes per $1 move in underlying
- **Range**: 0 to 1 for calls, -1 to 0 for puts
- **Interpretation**:
  - Delta 0.50 = Option moves $0.50 for every $1 underlying move
  - Also approximates probability of expiring ITM

### Gamma (Γ)

- **Measures**: Rate of change of delta
- **Highest**: At ATM options near expiration
- **Risk**: High gamma = rapid delta changes = harder to hedge

### Theta (Θ)

- **Measures**: Time decay (how much value lost per day)
- **Always Negative**: For long options (you lose value over time)
- **Accelerates**: As expiration approaches

### Vega (V)

- **Measures**: Sensitivity to implied volatility changes
- **Higher**: For longer-dated options and ATM strikes
- **Strategy**: Long vega = profit from volatility increase

### Rho (ρ)

- **Measures**: Sensitivity to interest rate changes
- **Less Relevant**: For short-dated crypto options

## Implied Volatility (IV)

### Understanding IV

- **Definition**: Market's expectation of future volatility
- **Not Historical**: IV is forward-looking, not backward
- **Premium Driver**: Higher IV = higher option premiums

### IV Surface

- **Volatility Smile**: OTM puts and calls often have higher IV than ATM
- **Term Structure**: Longer-dated options may have different IV than near-term
- **Skew**: Difference between put IV and call IV (indicates market bias)

### Reading IV Signals

- **High IV**: Market expects big move, options expensive
- **Low IV**: Market complacent, options cheap
- **IV Crush**: Post-event IV collapse (after announcements, etc.)

## Common Strategies

### Income Generation

1. **Covered Call**: Own asset + sell OTM call
   - Profit: Premium + any gain up to strike
   - Risk: Miss upside above strike, still have downside exposure

2. **Cash-Secured Put**: Have cash + sell OTM put
   - Profit: Premium if price stays above strike
   - Risk: Forced to buy at strike if price drops

### Directional Plays

1. **Long Call**: Bullish, unlimited upside, limited loss (premium)
2. **Long Put**: Bearish, profit from price drop, limited loss (premium)
3. **Call Spread**: Buy call + sell higher call (capped profit, lower cost)
4. **Put Spread**: Buy put + sell lower put (capped profit, lower cost)

### Volatility Plays

1. **Straddle**: Buy ATM call + ATM put (profit from big move either direction)
2. **Strangle**: Buy OTM call + OTM put (cheaper than straddle, needs bigger move)
3. **Iron Condor**: Sell OTM call spread + put spread (profit from low volatility)

## Crypto-Specific Considerations

### Funding Rates vs Options

- **Perp Funding**: Ongoing cost/income, variable
- **Options Premium**: One-time cost, fixed
- **Trade-off**: Negative funding can make puts more attractive than shorts

### 7-Day Options (Weeklies)

- **Popular in Crypto**: Deribit standard expiration cycle
- **Higher Theta**: Faster time decay than monthlies
- **Gamma Risk**: Significant near expiration
- **Strategy Fit**: Income generation (covered calls), short-term directional

### Liquidity Considerations

- **BTC**: Most liquid options, tightest spreads
- **ETH**: Second most liquid, reasonable spreads
- **SOL/Others**: Less liquidity, wider spreads, careful with size

### Key OI Levels

- **Magnetic Effect**: Large OI at strikes can act as support/resistance
- **Max Pain**: Strike where most options expire worthless
- **Whale Watching**: Track large OI changes for positioning signals

## Risk Management

### Position Sizing

- **Never Risk More Than**: 2-5% of portfolio per trade
- **Premium Paid**: Your maximum loss on long options
- **Margin Requirements**: Understand collateral for short options

### Greeks Management

- **Delta Neutral**: Balance long/short deltas to reduce directional risk
- **Gamma Scalping**: Profit from underlying moves while maintaining delta neutral
- **Theta Harvesting**: Time decay collection through short options

### Exit Strategies

- **Profit Targets**: Define exit points before entry
- **Stop Losses**: For long options, often % of premium paid
- **Rolling**: Extend expiration by closing and opening new position
- **Adjustment**: Modify strikes/size as market moves

## Data Sources

### Primary Sources

- **Deribit**: Main crypto options exchange (BTC, ETH, SOL)
- **Coinglass**: Derivatives data aggregator
- **Skew**: Professional-grade options analytics

### Key Metrics to Monitor

- **Open Interest**: Total outstanding contracts
- **Volume**: Daily trading activity
- **Put/Call Ratio**: Market sentiment indicator
- **IV Rank/Percentile**: Is IV high or low historically?
- **Max Pain**: Where do market makers want price at expiration?

---

_Knowledge Version: 1.0_
_Focus: Practical options concepts for crypto trading_
