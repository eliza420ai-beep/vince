---
tags: [rwa, tokenization, institutional]
agents: [eliza]
last_reviewed: 2026-02-15
---

# RWA vs DeFi Yields

_Last updated: 2026-02-15_

## The Risk-Free Rate in Crypto

Before tokenized Treasuries, crypto had no risk-free rate. The lowest-risk yield was stablecoin lending on blue-chip protocols — but that still carried smart contract risk, oracle risk, and counterparty risk. "Risk-free" was always relative.

Tokenized Treasuries changed this. Products like BlackRock's BUIDL, Ondo's USDY, and Franklin Templeton's BENJI offer 4-5% yields backed by actual US government obligations. The yield source is unambiguous: Uncle Sam pays interest on his debt.

**But "risk-free" has caveats on-chain:**

- **Smart contract risk** — the token wrapper can be exploited even if the underlying Treasury is safe
- **Custodial risk** — the actual T-bills sit with a custodian (often a regulated entity, but still a single point of failure)
- **Redemption risk** — can you actually get your money back same-day? Most products have T+1 to T+3 redemption windows
- **Regulatory risk** — the product could be forced to delist, restrict access, or restructure

So the real risk-free rate in crypto is Treasury yield minus a small spread for these wrapper risks. Call it 4-5% minus 20-50bps — still dramatically better than the 0% that idle stablecoins earn.

## Yield Decomposition

Understanding where yield comes from is everything:

| Source                                  | Sustainability                            | Risk                                   |
| --------------------------------------- | ----------------------------------------- | -------------------------------------- |
| US Treasury interest                    | Extremely sustainable (sovereign backing) | Near-zero credit risk                  |
| Real borrower interest (private credit) | Sustainable if underwriting is sound      | Credit/default risk                    |
| Protocol lending fees (Aave, Compound)  | Sustainable but variable with utilization | Smart contract + liquidation risk      |
| LP fees (Uniswap, Curve)                | Sustainable but variable with volume      | Impermanent loss + smart contract risk |
| Token emissions (farming rewards)       | Unsustainable — dilutive by nature        | Token price collapse risk              |
| Points/airdrop expectations             | Extremely unsustainable — one-time        | Rug/disappointment risk                |

**The hierarchy of yield quality:** Treasury interest > real borrower interest > protocol fees > LP fees > token emissions > points hopium.

## Comparative Returns (Current Environment)

**Tokenized Treasuries: 4.0-5.0% APY**

- Source: US government interest payments
- Risk: Minimal (smart contract + custodial wrapper risks)
- Volatility: Near-zero on principal
- Liquidity: Good for major products (BUIDL, USDY), thin for smaller ones

**Tokenized Private Credit: 6-12% APY**

- Source: Real borrower interest payments
- Risk: Meaningful — 2022 showed default rates can spike 20%+ on individual pools
- Net realized returns after defaults: often 3-8%, sometimes negative
- The stated APY is a ceiling, not a guarantee

**DeFi Lending (blue-chip): 2-8% variable**

- Source: Borrower interest (organic demand to borrow)
- Varies enormously with market conditions — spikes during leverage demand, collapses in bear markets
- Risk: Smart contract (battle-tested but not zero), liquidation cascades

**Liquidity Provision: 5-20%+ variable**

- Source: Trading fees, often supplemented by token emissions
- Impermanent loss can eat 5-15% of returns in volatile pairs
- Stable pairs (USDC/USDT) offer 2-5% with minimal IL — barely beating Treasuries, with more risk

**Incentivized Farming: 20-100%+ (nominal)**

- Source: Primarily token emissions
- Real yield after token depreciation: frequently negative
- Sustainable for weeks to months, not years

## Risk-Adjusted Framework

The key insight: **RWA yields look boring until you risk-adjust everything else.**

A 4.5% tokenized Treasury yield with near-zero principal risk beats a 15% farming yield where the reward token drops 60% and you suffer 10% impermanent loss. The farming yield was nominally 3x higher but delivered negative real returns.

**Sharpe ratio thinking for crypto yields:**

- Tokenized Treasuries: High Sharpe (stable returns, low volatility)
- Blue-chip DeFi lending: Moderate Sharpe (decent returns, moderate volatility)
- LP positions: Low-to-moderate Sharpe (returns offset by IL and fee variability)
- Token farming: Often negative Sharpe (high nominal yield, higher realized volatility)

## Strategic Implications

**For treasuries and long-term capital:** RWA yields are the rational baseline. Any allocation to higher-yielding DeFi strategies must justify the incremental risk with sufficient excess return.

**For active traders:** DeFi yields are tools, not destinations. Use lending rates as signals (high borrow rates = leveraged demand = potential volatility). Use RWA yields as the opportunity cost benchmark.

**The barbell approach:** Many sophisticated participants now split allocations — bulk in tokenized Treasuries (stable base yield) with a smaller allocation to higher-risk DeFi strategies (asymmetric upside). This mirrors traditional portfolio construction: risk-free core + satellite risk positions.

**Rate sensitivity:** If US rates drop to 2-3%, the RWA yield advantage shrinks, and capital will rotate back toward DeFi's variable but potentially higher yields. The current RWA boom is partly a product of the rate environment — don't mistake a cyclical tailwind for a permanent structural shift.
