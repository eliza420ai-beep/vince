---
tags: [defi, protocols, metrics]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# On-Chain Analytics Fundamentals

## Core Metrics

### Supply Metrics

#### Active Supply

- **Definition**: Coins moved within a specific timeframe (7d, 30d, 90d, 1y)
- **Signal**: Low active supply = HODLing behavior, high = distribution/rotation
- **Context**: Compare to historical levels and price action

#### Exchange Flows

- **Exchange Inflow**: Coins moving TO exchanges (potential sell pressure)
- **Exchange Outflow**: Coins moving FROM exchanges (accumulation signal)
- **Net Flow**: Inflow - Outflow (positive = bearish, negative = bullish)
- **Nuance**: Not all inflows = sells, could be for derivatives collateral

#### Supply Distribution

- **Top 100 Holders**: Concentration risk metric
- **Whale Holdings**: Addresses with 1000+ BTC / 10000+ ETH
- **Retail Holdings**: Smaller addresses, often contrarian indicator
- **Exchange Holdings**: Available liquid supply

### Activity Metrics

#### Transaction Volume

- **Definition**: Total value transferred on-chain
- **Adjusted**: Removes internal exchange transfers, change outputs
- **Signal**: Rising volume with price = healthy trend, divergence = warning

#### Active Addresses

- **Definition**: Unique addresses participating in transactions
- **Leading Indicator**: Often precedes price moves
- **Network Effect**: More users = stronger network value

#### New vs Returning Addresses

- **New Addresses**: First-time users, adoption metric
- **Returning Addresses**: Existing users re-engaging
- **Ratio**: High new/returning = retail FOMO, low = accumulation

### Profitability Metrics

#### SOPR (Spent Output Profit Ratio)

- **Definition**: Realized value / value at creation for spent outputs
- **SOPR > 1**: Coins moved at profit (selling into strength)
- **SOPR < 1**: Coins moved at loss (capitulation signal)
- **SOPR = 1**: Break-even, critical support/resistance level

#### NUPL (Net Unrealized Profit/Loss)

- **Definition**: (Market Cap - Realized Cap) / Market Cap
- **Zones**:
  - > 0.75: Greed (cycle top risk)
  - 0.5-0.75: Belief (bull market)
  - 0.25-0.5: Optimism (accumulation)
  - 0-0.25: Hope/Fear (uncertainty)
  - <0: Capitulation (cycle bottom)

#### Realized Price

- **Definition**: Average acquisition cost of all coins
- **Signal**: Price below realized = market underwater
- **Support**: Often acts as strong support in bear markets

### Miner Metrics (Bitcoin-Specific)

#### Hash Rate

- **Definition**: Total computational power securing network
- **Signal**: Rising hash rate = miner confidence, network security
- **Divergence**: Falling hash rate + stable price = potential stress

#### Miner Revenue

- **Components**: Block subsidy + transaction fees
- **Context**: Post-halving stress periods typical
- **Outflow**: Miner selling to cover costs (operational pressure)

#### Difficulty Ribbon

- **Definition**: Moving averages of mining difficulty
- **Compression**: Weak miners capitulating (accumulation signal)
- **Expansion**: Strong network, miners profitable

### Derivatives Metrics (On-Chain Observable)

#### Perpetual Funding Rates

- **Definition**: Periodic payments between long/short holders
- **Positive**: Longs pay shorts (bullish sentiment)
- **Negative**: Shorts pay longs (bearish sentiment)
- **Extreme**: Contrarian signal (crowded trade)

#### Open Interest

- **Definition**: Total value of outstanding derivatives contracts
- **Rising OI + Rising Price**: Trend confirmation
- **Rising OI + Falling Price**: Short buildup
- **Falling OI**: Position unwinding, trend exhaustion

#### Liquidations

- **Definition**: Forced closure of leveraged positions
- **Long Liquidations**: Cascade selling pressure
- **Short Liquidations**: Short squeeze potential
- **Volume**: Large liquidation events clear excess leverage

## Analysis Frameworks

### Market Cycle Identification

#### Accumulation Phase

- **Characteristics**:
  - Low active supply (HODLing)
  - Exchange outflows (coins moving to cold storage)
  - SOPR < 1 (selling at loss, capitulation)
  - NUPL near 0 or negative
  - Low social sentiment

#### Markup Phase (Bull Market)

- **Characteristics**:
  - Increasing active supply
  - Growing active addresses
  - SOPR consistently > 1
  - NUPL rising through belief zone
  - Network fees increasing

#### Distribution Phase

- **Characteristics**:
  - Old coins moving (long-term holders selling)
  - Exchange inflows increasing
  - Whale distribution to retail
  - NUPL in greed zone (>0.75)
  - High social hype

#### Markdown Phase (Bear Market)

- **Characteristics**:
  - Declining active addresses
  - SOPR volatile around 1
  - Exchange balance stable/increasing
  - NUPL declining through zones
  - Miner capitulation (for BTC)

### Divergence Analysis

#### Bullish Divergences

- Price falling + active addresses rising
- Price falling + exchange outflows increasing
- Price falling + long-term holder accumulation

#### Bearish Divergences

- Price rising + active addresses flat/falling
- Price rising + exchange inflows accelerating
- Price rising + whale distribution

### Cohort Analysis

#### Holder Cohorts by Age

- **<1 week**: Hot money, highly reactive
- **1 week - 1 month**: Short-term speculators
- **1-6 months**: Medium-term holders
- **6-12 months**: Long-term believers
- **>1 year**: Diamond hands, cycle survivors

#### Realized Cap by Cohort

- Track value acquired by each holding period
- Short-term holders selling = late-cycle distribution
- Long-term holders buying = accumulation signal

## Data Quality Considerations

### Exchange Attribution

- Not all exchange addresses identified
- Internal transfers can skew flow data
- Cross-exchange arbitrage creates noise

### Entity Clustering

- Single user may have multiple addresses
- Exchange cold wallets often miscategorized
- Whale tracking requires entity resolution

### Timing Considerations

- On-chain data has confirmation delays
- Mempool analysis for real-time signals
- Block time variations affect metrics

### Cross-Chain Complexity

- Wrapped tokens (WBTC, etc.) complicate supply analysis
- Bridge flows need separate tracking
- Multi-chain activity splits user base

## Platform-Specific Notes

### Glassnode

- Most comprehensive Bitcoin metrics
- Strong entity-adjusted data
- Premium features require subscription

### CryptoQuant

- Excellent exchange flow data
- Real-time alert capabilities
- Good derivatives integration

### Santiment

- Social + on-chain hybrid analysis
- Development activity tracking
- Unique behavioral metrics

### Dune Analytics

- Custom query capability
- Community-created dashboards
- DeFi protocol-specific analysis

---

_Knowledge Version: 1.0_
_Focus: Practical on-chain analysis for market intelligence_

## Related

- [180145295Long Live The Battery](180145295long-live-the-battery.md)
- [181420524The Big Six](181420524the-big-six.md)
- [182125879Fixed Rate Fantasy](182125879fixed-rate-fantasy.md)
- [Global Regulatory Map](../regulation/global-regulatory-map.md)
- [Stablecoin Legislation](../regulation/stablecoin-legislation.md)
