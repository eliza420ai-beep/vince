---
tags: [trading, derivatives, perps]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Tread.fi Complete Strategy Guide

IMPORTANT: always check https://treadtools.vercel.app/

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Connected Exchanges](#connected-exchanges)
3. [Market Maker Bot](#market-maker-bot)
4. [Delta Neutral Bot](#delta-neutral-bot)
5. [Reference Price Modes](#reference-price-modes)
6. [Advanced Settings Deep Dive](#advanced-settings-deep-dive)
7. [Exchange-Specific Strategies](#exchange-specific-strategies)
8. [Recommended Strategies](#recommended-strategies)
9. [Points Program](#points-program)
10. [Risk Management](#risk-management)
11. [Troubleshooting](#troubleshooting)
12. [Quick Reference](#quick-reference)

---

## Core Concepts

### What Tread.fi Actually Is

**Tread.fi is an algorithmic trading terminal and Order Execution Management System (OEMS)** — NOT a simple trading bot. It provides institutional-grade execution across multiple CEX and DEX venues.

Two main bot types:

1. **Market Maker Bot** — Automated market making via TWAP with passive limit orders
2. **Delta Neutral Bot** — Simultaneous long/short positions for funding rate capture

### Key Distinction

| What It Is               | What It Is NOT                |
| ------------------------ | ----------------------------- |
| Liquidity provision tool | Price prediction bot          |
| Spread capture mechanism | Directional trading system    |
| Points farming vehicle   | Set-and-forget passive income |
| TWAP execution engine    | Taker/market order bot        |

### Fee Structure

**Tread Builder Fee:**
| Exchange | Builder Fee |
|----------|-------------|
| Hyperliquid | 2 bps (0.02%) |
| Extended | 2 bps (0.02%) |
| Pacifica | 2 bps (0.02%) |
| Paradex | Check current |
| Nado | Check current |

**Exchange Maker Fees:**
| Exchange | Maker Fee | Notes |
|----------|-----------|-------|
| **Hyperliquid** | Low | VIP tiers available |
| **Paradex** | **ZERO** | Zero maker AND taker for retail |
| **Extended** | Low | Standard perp fees |
| **Nado** | -0.8 bps rebate | You GET PAID to make |
| **Pacifica** | Low | VIP tiers available |

**Total Cost:** Builder Fee + Exchange Maker Fee × Notional (check pre-trade analytics)

---

## Connected Exchanges

We have connected **5 perpetual DEXs** to Tread.fi. Each has unique characteristics that affect strategy selection. Understanding these differences is critical for optimizing your market making and delta neutral strategies.

### Exchange Overview

| Exchange        | Chain                    | Key Feature                          | Tread Boost       | Points Program          |
| --------------- | ------------------------ | ------------------------------------ | ----------------- | ----------------------- |
| **Hyperliquid** | Hyperliquid L1           | Deepest liquidity, 200k orders/sec   | **2x**            | Season 3 rumored        |
| **Paradex**     | Paradex Chain (Starknet) | Zero fees, 250+ markets, privacy     | Check points page | Active                  |
| **Extended**    | Starknet                 | Unified margin vision, TradFi assets | **2x**            | Active                  |
| **Nado**        | Ink L2 (Kraken)          | Unified margin, 5-15ms latency       | Check points page | Early (no announcement) |
| **Pacifica**    | TBD                      | AI-powered, self-funded              | Check points page | Active                  |

---

### Hyperliquid

> **Docs:** https://hyperliquid.gitbook.io/hyperliquid-docs

**What It Is:**

- Custom L1 blockchain with HyperBFT consensus
- Fully onchain perpetuals and spot orderbooks
- 200k orders/second throughput, one-block finality
- HyperEVM for general-purpose smart contracts

**Key Advantages:**

- Deepest liquidity among perp DEXs
- Most established, battle-tested
- Strong ecosystem and builder activity

**Tread Strategy Adjustments:**

| Aspect            | Recommendation                      |
| ----------------- | ----------------------------------- |
| **Tread Boost**   | 2x points — prioritize volume here  |
| **Liquidity**     | Excellent — can use Aggressive mode |
| **Spread**        | -1 to +2 bps works well on majors   |
| **Grid Mode**     | Safe on BTC/ETH due to deep books   |
| **Delta Neutral** | Ideal short leg due to 2x boost     |
| **Risk**          | Lower slippage risk, reliable fills |

**Best Use Cases:**

- Short side of delta neutral (2x boost)
- High-frequency MM on majors
- Grid -1 bps strategy during NY session

---

### Paradex

> **Docs:** https://docs.paradex.trade/docs/getting-started/what-is-paradex

**What It Is:**

- Zero-fee perpetuals with privacy (zk-encrypted accounts)
- 250+ markets including futures, options, pre-markets, spot
- Unified margin across all products
- Powered by $DIME token

**Key Advantages:**

- **Zero maker AND taker fees** for retail
- Privacy — positions, entries, exits, liquidation levels hidden
- Fastest new token listings
- Tokenized high-yield vaults

**Tread Strategy Adjustments:**

| Aspect            | Recommendation                                    |
| ----------------- | ------------------------------------------------- |
| **Fees**          | Zero — pure spread capture                        |
| **Spread**        | Can use tighter spreads (+0 to +2 bps)            |
| **Participation** | Normal or Passive (less urgency with zero fees)   |
| **Grid Mode**     | Excellent for range-bound plays                   |
| **Privacy**       | Positions hidden — harder for others to front-run |
| **Best Markets**  | New listings, pre-markets                         |

**Best Use Cases:**

- Pure spread capture (no fee drag)
- Points farming with wider spreads
- Long side of delta neutral pairs
- Pre-market and early listing plays

---

### Extended

> **Docs:** https://docs.extended.exchange/

**What It Is:**

- Ex-Revolut team building unified margin system
- Perpetuals on crypto AND TradFi assets
- Up to 100x leverage, USDC collateral
- Vision: Native lending + spot markets integrated

**Key Advantages:**

- TradFi asset exposure (stocks, commodities)
- Unified margin with integrated lending coming
- Native wallet integrations planned
- EVM-compatible network vision

**Tread Strategy Adjustments:**

| Aspect          | Recommendation                                    |
| --------------- | ------------------------------------------------- |
| **Tread Boost** | 2x points — high priority                         |
| **Assets**      | Trade TradFi perps not available elsewhere        |
| **Leverage**    | Up to 100x available — use carefully              |
| **Grid Mode**   | Works well, use Blend mode for less liquid assets |
| **Spread**      | +2 to +5 bps for non-crypto assets                |
| **Uniqueness**  | Only place to MM TradFi on Tread                  |

**Best Use Cases:**

- Farming 2x boosted points
- TradFi asset exposure (stocks, commodities)
- Blend mode for price convergence plays
- Delta neutral with TradFi assets

---

### Nado

> **Docs:** https://docs.nado.xyz/

**What It Is:**

- Central-limit orderbook DEX on Ink L2 (Kraken-backed)
- Spot AND perpetuals via unified margin
- 5-15ms latency, on-chain settlement
- "Kinetic collateral" — dynamically flows across positions

**Key Advantages:**

- Unified margin across spot, perps, money markets
- NLP vault for passive yields
- Lowest fees (1.5 bps taker, -0.8 bps maker rebate)
- Pro tools: TWAPs, scale orders, conditional triggers
- **No announced points program yet — EARLY**

**Tread Strategy Adjustments:**

| Aspect             | Recommendation                                |
| ------------------ | --------------------------------------------- |
| **Points**         | Not announced — high upside for early farmers |
| **Fees**           | Super low + maker rebates                     |
| **Unified Margin** | Collateral works across products              |
| **Latency**        | 5-15ms — good for Aggressive mode             |
| **Grid Mode**      | Use for spot + perp hedges                    |
| **Delta Neutral**  | Ideal long leg (farm early points)            |

**Best Use Cases:**

- Long side of delta neutral (early points)
- Unified margin plays (spot + perp)
- Low-fee high-volume MM
- Getting in before points announcement

---

### Pacifica

> **Docs:** https://docs.pacifica.fi/

**What It Is:**

- Founded January 2025 by ex-Binance, FTX, Coinbase, Jane Street team
- AI-powered smart trading tools
- Self-funded (no external capital — all value to users)
- Focus on execution speed and UX

**Key Advantages:**

- Team from top exchanges and AI labs (OpenAI, DeepMind)
- Launched testnet in 3 months, mainnet in 6
- AI-enhanced trading features
- Self-funded = user-aligned incentives

**Tread Strategy Adjustments:**

| Aspect         | Recommendation                                |
| -------------- | --------------------------------------------- |
| **Maturity**   | Newer — expect growing pains                  |
| **Liquidity**  | Building — use Passive mode                   |
| **Spread**     | Wider (+5 to +10 bps) initially               |
| **Blend Mode** | Useful for price convergence to larger venues |
| **Points**     | Active program — check current multipliers    |
| **AI Tools**   | Leverage their native AI features             |

**Best Use Cases:**

- Early points farming
- Testing Blend mode strategies
- AI-assisted trading experiments
- Building relationship with emerging venue

---

### Exchange Comparison Matrix

| Feature            | Hyperliquid  | Paradex     | Extended | Nado          | Pacifica    |
| ------------------ | ------------ | ----------- | -------- | ------------- | ----------- |
| **Tread Boost**    | 2x           | Variable    | 2x       | Variable      | Variable    |
| **Liquidity**      | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐    | ⭐⭐⭐   | ⭐⭐⭐        | ⭐⭐        |
| **Fees**           | Low          | Zero        | Low      | Lowest        | Low         |
| **Max Leverage**   | 50x          | 50x         | 100x     | 20x           | TBD         |
| **Unified Margin** | No           | Yes         | Coming   | Yes           | TBD         |
| **Unique Assets**  | Crypto       | Pre-markets | TradFi   | Spot+Perp     | AI tools    |
| **Points Stage**   | Season 3?    | Active      | Active   | Pre-announce  | Active      |
| **Best For**       | Short leg DN | Zero-fee MM | TradFi   | Early farming | AI features |

---

### Delta Neutral Pairing Matrix

Optimal cross-exchange delta neutral combinations:

| Long Leg     | Short Leg       | Rationale               | Risk Level |
| ------------ | --------------- | ----------------------- | ---------- |
| **Nado**     | **Hyperliquid** | Early points + 2x boost | Low        |
| **Paradex**  | **Hyperliquid** | Zero fees + 2x boost    | Low        |
| **Extended** | **Hyperliquid** | 2x + 2x double boost    | Low        |
| **Pacifica** | **Hyperliquid** | Early + established     | Medium     |
| **Nado**     | **Extended**    | Both early stage        | Medium     |
| **Paradex**  | **Extended**    | Zero fees + TradFi      | Medium     |

**Priority Order for Delta Neutral Short Leg:**

1. Hyperliquid (2x boost, deep liquidity)
2. Extended (2x boost, TradFi)
3. Others (check current multipliers)

**Priority Order for Delta Neutral Long Leg:**

1. Nado (pre-announcement, early)
2. Paradex (zero fees, privacy)
3. Pacifica (early stage, AI)

---

## Market Maker Bot

### How It Works

The Market Maker Bot:

1. **Simultaneously places buy and sell limit orders** around current market price
2. **Uses TWAP strategy** for optimal execution timing
3. **Splits notional 50/50** between buy and sell sides
4. **Only uses maker/limit orders** — never crosses spread or uses taker orders
5. **Refreshes orders periodically** to stay close to market price
6. **Auto-pauses** when exposure in one direction grows too large

### Quick Start Setup

**Step 1: Select Exchange & Pair**

- Start with highly liquid perpetual pairs (BTC-PERP, ETH-PERP)
- For spot: Must hold 50% base token, 50% quote token

**Step 2: Input Margin**

- Margin × Leverage = Target Volume
- Higher leverage = more volume but higher liquidation risk

**Step 3: Select Mode**

- Start with **Normal** mode
- Keep default settings for first trade

**Step 4: Review Pre-Trade Analytics**

- Verify margin < available margin
- Check estimated fees and max loss
- Max Loss = Stop Loss % × Margin

### Supported Assets

| Type              | Supported | Notes                              |
| ----------------- | --------- | ---------------------------------- |
| Perpetuals        | ✅ Yes    | Primary use case                   |
| Spot              | ✅ Yes    | Requires 50/50 split of base/quote |
| Futures Contracts | ❌ No     | Not supported                      |
| Options           | ❌ No     | Separate beta feature              |

---

## Delta Neutral Bot

### Overview

Opens simultaneous long and short positions to:

- **Capture funding rate differentials**
- **Neutralize directional price risk**
- **Farm multiple protocol points simultaneously**

### How It Works

1. **Setup**: Select accounts/pairs for long and short legs
2. **Execution**: TWAP strategy minimizes market impact on both legs
3. **Funding Capture**: Earn/pay based on net funding rate difference
4. **Wind Down**: Use "Wind Down" action to close both positions

### Key Metrics

| Metric                     | Definition                                |
| -------------------------- | ----------------------------------------- |
| **Total Exposure**         | Sum of both legs' executed notional       |
| **Net Exposure**           | Directional imbalance (should be ~0%)     |
| **Net Sided Funding Rate** | Long FR + Short FR = your net income/cost |
| **Unbalanced Warning**     | Triggers when net exposure > 1%           |

### Delta Neutral Configuration

| Setting       | Recommendation                                           |
| ------------- | -------------------------------------------------------- |
| **Long Leg**  | Choose DEX with positive funding or early points program |
| **Short Leg** | Choose DEX with 2x Tread boost (e.g., Hyperliquid)       |
| **Pair**      | Same asset both sides for true delta neutral             |
| **Notional**  | Split 50/50 automatically                                |
| **Duration**  | Based on 50% POV of slower leg, max 1 day                |

### Execution Modes (Delta Neutral)

| Mode           | Duration | Use Case                      |
| -------------- | -------- | ----------------------------- |
| **Aggressive** | ~5 min   | Fast entry, higher impact     |
| **Normal**     | ~15 min  | Balanced approach             |
| **Passive**    | ~30 min  | Minimize impact, slower fills |

### Multi-Airdrop Farming Strategy

Run delta-neutral to simultaneously farm:

1. **TreadFi points** (100k weekly pool)
2. **Long DEX points** (e.g., Nado pre-announcement, Paradex, Pacifica)
3. **Short DEX points** (e.g., Hyperliquid 2x boost, Extended 2x boost)

**Recommended DEX Combinations (Connected Exchanges):**

| Long Side    | Short Side      | Rationale                   | Priority   |
| ------------ | --------------- | --------------------------- | ---------- |
| **Nado**     | **Hyperliquid** | Pre-announcement + 2x boost | ⭐⭐⭐⭐⭐ |
| **Nado**     | **Extended**    | Pre-announcement + 2x boost | ⭐⭐⭐⭐   |
| **Paradex**  | **Hyperliquid** | Zero fees + 2x boost        | ⭐⭐⭐⭐   |
| **Pacifica** | **Hyperliquid** | Early + established         | ⭐⭐⭐     |
| **Paradex**  | **Extended**    | Zero fees + TradFi          | ⭐⭐⭐     |

> **Current Meta:** Long Nado + Short Hyperliquid is the optimal setup. You're farming an unannounced points program (Nado) while capturing 2x Tread boost on the hedge (Hyperliquid).

---

## Reference Price Modes

### Mid Price Mode (Default)

**How it works:** Orders placed based on current order book mid-price. Orders float with market.

| Aspect       | Details                                                 |
| ------------ | ------------------------------------------------------- |
| **Best For** | General MM, volume generation, points farming           |
| **Pros**     | High fill probability, follows market trend             |
| **Cons**     | No guaranteed profit per trade (can buy high, sell low) |

**Spread Settings (Mid Price):**

- **Lower (0-2 bps)**: Prioritizes speed, capture rebates
- **Higher (+10-50 bps)**: Prioritizes margin, fewer fills

### Grid Mode (Advanced)

**How it works:** Uses last executed price as anchor. Rule: "Don't buy higher than I sold, don't sell lower than I bought."

| Aspect        | Details                                 |
| ------------- | --------------------------------------- |
| **Best For**  | Range-bound/sideways markets            |
| **Pros**      | Guarantees $0 or positive PnL on spread |
| **Cons**      | Can stall if price trends strongly      |
| **Hard Stop** | ±0.5% from last fill — order may cancel |

**Spread Settings (Grid):**

| Spread            | Effect                                        |
| ----------------- | --------------------------------------------- |
| **-10 to -1 bps** | Price concession to unstick stalled positions |
| **0 bps**         | Break-even on spread (still pay fees)         |
| **+1 to +50 bps** | Lock in profit, but risk stalling             |

### Reverse Grid Mode

**How it works:** Uses average of both executed prices as anchor. Profits during trending movements.

| Aspect       | Details                                    |
| ------------ | ------------------------------------------ |
| **Best For** | Trending markets                           |
| **Pros**     | Auto locks profits when trends continue    |
| **Cons**     | Can stall in sideways or reversing markets |
| **Safety**   | Has both stop loss AND take profit         |

### Blend Mode

**How it works:** Averages your exchange's mid-price with a reference price from a more liquid market.

| Aspect       | Details                                       |
| ------------ | --------------------------------------------- |
| **Best For** | Trading on less liquid exchanges              |
| **Use Case** | Anticipate price convergence to larger market |

---

## Advanced Settings Deep Dive

### Participation Rate

Controls execution speed relative to 24h trading volume.

| Mode           | Speed    | Rate Multiplier | Duration       | Use Case                       |
| -------------- | -------- | --------------- | -------------- | ------------------------------ |
| **Aggressive** | Fastest  | 0.10            | Shortest       | Fast markets, quick entry/exit |
| **Normal**     | Moderate | 0.025           | 4× Aggressive  | General purpose                |
| **Passive**    | Slowest  | 0.01            | 10× Aggressive | Low-liquidity, minimize impact |

**Notes:**

- Minimum duration: 10 minutes (enforced)
- Aggressive = higher impact, may worsen fills
- Passive = longer exposure to directional moves

### Directional Bias

Influence timing/distribution of buy vs sell orders.

| Bias            | Effect                             |
| --------------- | ---------------------------------- |
| **Long (+)**    | Front-loads buys, back-loads sells |
| **Short (-)**   | Front-loads sells, back-loads buys |
| **Neutral (0)** | Equal timing distribution          |

**Technical Notes:**

- Maps linearly to alpha tilt (±1 → ±0.2)
- Extreme bias (±1) requires 20% additional margin

### Stop Loss

Monitors PnL in real-time, cancels all orders and closes positions when threshold hit.

**Formula:** `Max Loss = Stop Loss % × Margin`

| Stop Loss | Risk Level   | Use Case                       |
| --------- | ------------ | ------------------------------ |
| 5%        | Conservative | High leverage, volatile assets |
| 10%       | Moderate     | Standard trading               |
| 25%       | Patient      | Range-bound strategies         |
| 100%      | Maximum      | Willing to lose entire margin  |

> ⚠️ **WARNING:** Stop loss may not prevent liquidation at >20x leverage during extreme moves. Exchange can liquidate before stop triggers.

### Grid Reset Threshold (Soft Reset)

Circuit breaker before stop loss — gives position chance to rebalance naturally.

**How it works:**

1. When price drifts from last fill by configured %, bot triggers soft reset
2. "Behind" leg switches from grid pricing to mid-market pricing
3. Helps unfilled leg execute and rebalance exposure
4. Returns to grid mode once balanced

| Setting      | Behavior                                                    |
| ------------ | ----------------------------------------------------------- |
| **Lower %**  | More conservative, triggers earlier, sacrifices some profit |
| **Higher %** | More patient, allows deeper unrealized loss                 |
| **Off**      | For choppy, mean-reverting markets                          |
| **25-50%**   | Moderate trending markets                                   |
| **75%**      | Volatile markets, last resort                               |

---

## Exchange-Specific Strategies

### Hyperliquid Optimal Settings

**For BTC/ETH (High Liquidity):**

| Setting         | Value      | Rationale                 |
| --------------- | ---------- | ------------------------- |
| Reference Price | Grid       | Deep books support grid   |
| Spread          | -1 bps     | High turnover compensates |
| Participation   | Aggressive | Fills are reliable        |
| Stop Loss       | 5-10%      | Tight due to volatility   |
| Leverage        | 20-40x     | Manageable on majors      |

**For Altcoins:**

| Setting         | Value        | Rationale            |
| --------------- | ------------ | -------------------- |
| Reference Price | Mid Price    | More forgiving       |
| Spread          | +2 to +5 bps | Less liquid          |
| Participation   | Normal       | Balance speed/impact |
| Stop Loss       | 10-25%       | Wider for volatility |

---

### Paradex Optimal Settings

**Zero-Fee Advantage Play:**

| Setting         | Value        | Rationale                   |
| --------------- | ------------ | --------------------------- |
| Reference Price | Grid         | Maximize spread capture     |
| Spread          | +2 to +5 bps | Pure profit, no fee drag    |
| Participation   | Passive      | No urgency, maximize uptime |
| Stop Loss       | 10%          | Standard                    |
| Grid Reset      | 0.25%        | Tighter rebalancing         |

**Pre-Market/New Listings:**

| Setting         | Value            | Rationale                  |
| --------------- | ---------------- | -------------------------- |
| Reference Price | Mid Price        | High volatility            |
| Spread          | +10 bps or wider | Capture volatility premium |
| Participation   | Passive          | Let price discover         |
| Stop Loss       | 25%              | Wider for new assets       |

---

### Extended Optimal Settings

**Crypto Assets:**

| Setting         | Value                | Rationale               |
| --------------- | -------------------- | ----------------------- |
| Reference Price | Grid                 | Standard approach       |
| Spread          | -1 to +2 bps         | Competitive             |
| Participation   | Aggressive           | Capture 2x boost volume |
| Stop Loss       | 10%                  | Standard                |
| Leverage        | Up to 100x available | Use 20-40x safely       |

**TradFi Assets (Unique to Extended):**

| Setting         | Value                     | Rationale                 |
| --------------- | ------------------------- | ------------------------- |
| Reference Price | Blend                     | Converge to tradfi prices |
| Spread          | +5 to +10 bps             | Less liquid               |
| Participation   | Normal/Passive            | Patient execution         |
| Stop Loss       | 10-25%                    | Account for gaps          |
| Session         | Trade during market hours | Liquidity higher          |

---

### Nado Optimal Settings

**Pre-Announcement Farming:**

| Setting         | Value              | Rationale               |
| --------------- | ------------------ | ----------------------- |
| Reference Price | Mid Price          | Maximize volume         |
| Spread          | +5 bps             | Balance fills vs margin |
| Participation   | Normal             | Steady volume           |
| Stop Loss       | 10%                | Standard                |
| Products        | Use unified margin | Spot + Perp together    |

**Unified Margin Plays:**

| Setting         | Value      | Rationale                  |
| --------------- | ---------- | -------------------------- |
| Reference Price | Grid       | For hedged positions       |
| Spread          | +2 bps     | Capture maker rebates      |
| Participation   | Aggressive | 5-15ms latency supports it |
| Stop Loss       | 10%        | Standard                   |

---

### Pacifica Optimal Settings

**Early Stage Approach:**

| Setting         | Value          | Rationale                   |
| --------------- | -------------- | --------------------------- |
| Reference Price | Mid Price      | More forgiving              |
| Spread          | +5 to +10 bps  | Account for lower liquidity |
| Participation   | Passive        | Minimize impact             |
| Stop Loss       | 15-25%         | Wider for newer venue       |
| Blend Mode      | Consider using | Reference larger venues     |

---

### Cross-Exchange Arbitrage Opportunities

When price diverges between exchanges:

| Scenario                   | Action                          |
| -------------------------- | ------------------------------- |
| Paradex < Hyperliquid      | Long Paradex, Short Hyperliquid |
| Extended lags on TradFi    | Use Blend mode to capture       |
| Nado vs Hyperliquid spread | Delta neutral both sides        |
| New listing on Paradex     | Premium capture opportunity     |

**Blend Mode Use Cases:**

1. **Pacifica → Hyperliquid**: Reference HL's deeper book
2. **Extended TradFi → TradFi CEX**: Converge to spot prices
3. **Any low-liquidity venue**: Reference most liquid market

---

## Recommended Strategies

### Strategy 1: Highly Liquid Majors (Fast Price Action)

**Best for:** BTC-PERP, ETH-PERP during active sessions

| Setting         | Value          |
| --------------- | -------------- |
| Reference Price | **Grid Mode**  |
| Spread          | **-1 bps**     |
| Participation   | **Aggressive** |
| Stop Loss       | 5-10%          |

**When to Run:**

- ✅ NY Session (Mon-Fri 9:30am-4pm ET) mid-session
- ✅ Choppy, non-trending environments

**When to AVOID:**

- ❌ US Market Open (9:30am ET)
- ❌ NY Close (4pm ET)
- ❌ Major macro events (Fed, CPI)

**Why -1 bps Works:**

- Acts as "insurance" — tiny concession improves fill probability
- Prevents stalling that leads to 50 bps hard stop-loss
- Results cluster tightly around -1 to +1 bps
- High turnover compensates for smaller margin

### Strategy 2: Range-Bound / Low-OI Assets

**Best for:** Sideways markets with clear support/resistance

| Setting         | Value                 |
| --------------- | --------------------- |
| Reference Price | **Grid Mode**         |
| Spread          | **+5 bps**            |
| Participation   | **Normal or Passive** |
| Stop Loss       | 10-25%                |

**Rationale:**

- Grid mode excels in clean ranges
- Wider spreads capture more per loop without price running away

### Strategy 3: Points Farming (Ventuals/Low Liquidity)

**Best for:** Maker points programs on low-liquidity venues

| Setting         | Value                 |
| --------------- | --------------------- |
| Reference Price | **Mid Price Mode**    |
| Spread          | **+10 bps or higher** |
| Participation   | **Passive**           |
| Stop Loss       | 25%                   |

**Points Scoring Factors:**

- **Size**: Total volume of maker orders
- **Distance**: Orders within "reasonable range" of mid
- **Uptime**: Continuous presence in order book
- **Two-Sidedness**: Activity on both bid and ask
- **Fill Quality**: Competitive price execution

**Optimization:**

- +10 bps keeps orders in book longer (better uptime)
- Not so close that you fill too fast
- Maintains balanced book both sides

### Strategy 4: Delta Neutral Multi-Farm

**Best for:** Farming multiple airdrops with hedged exposure

| Setting  | Long Leg        | Short Leg   |
| -------- | --------------- | ----------- |
| Exchange | Early-stage DEX | Hyperliquid |
| Pair     | BTC-PERP        | BTC-PERP    |
| Leverage | 20-40x          | 20-40x      |
| Duration | 15-30 min       | 15-30 min   |

**Always:**

- Set TP/SL directly on each DEX
- Monitor net exposure (should be ~0%)
- Check funding rates before entry

---

## Points Program

### Season 1 Overview

| Detail              | Value                             |
| ------------------- | --------------------------------- |
| **Weekly Pool**     | 100,000 points                    |
| **Distribution**    | Proportional to adjusted volume   |
| **Week Reset**      | Wednesday 00:00 UTC               |
| **Season End**      | May 18, 2026                      |
| **Min Eligibility** | $100,000 adjusted volume per week |

### Points Formula

```
Your Points = 100,000 × (Your Adjusted Volume / Total Adjusted Volume)
```

### Volume Buff Multipliers

| Weekly Volume | Multiplier |
| ------------- | ---------- |
| < $1M         | 1.0x       |
| ≥ $1M         | 1.1x       |
| ≥ $5M         | 1.2x       |
| ≥ $10M        | 1.3x       |

### Exchange Multipliers

| Exchange        | Boost    | Status                    |
| --------------- | -------- | ------------------------- |
| **Hyperliquid** | 2x       | Confirmed                 |
| **Extended**    | 2x       | Confirmed                 |
| **Paradex**     | Variable | Check points page         |
| **Nado**        | Variable | Pre-announcement (early!) |
| **Pacifica**    | Variable | Check points page         |

### Referral Program

- **20%** of referred users' weekly volume added to your activity
- Referred user must trade ≥$100k/week before you earn

### Boosted Campaigns

Watch for time-limited campaigns:

- 5x points for first $100M volume on new integrations
- Special events and voting rewards
- Community share from exchange integration fees

### Point Valuation Estimate

Per community estimates (not financial advice):

- **~$4+ per point** at modest FDV
- Getting harder to farm as competition increases
- Early adopters have significant advantage

---

## Risk Management

### Critical Rules

1. **ALWAYS configure stop loss in TreadFi** — options: 5%, 10%, 25%, 50%, 100%
2. **At >20x leverage, also set TP/SL on DEX** — exchange can liquidate before TreadFi stop triggers
3. **Stop loss may not save you** during extreme volatility gaps
4. **Monitor positions actively** — not a passive income strategy

### Liquidation Prevention

| Risk Factor         | Mitigation                                   |
| ------------------- | -------------------------------------------- |
| High leverage       | Use 10-20x max, especially when learning     |
| One-sided exposure  | Watch for "Paused" status, let bot rebalance |
| No stop loss on DEX | ALWAYS set external TP/SL                    |
| Overnight positions | Close or set wide stops before sleep         |

### When Bot Pauses

**This is a safety feature, not an error.**

The bot auto-pauses when:

- Exposure in one direction grows too large
- It will resume when exposure naturally rebalances

Do NOT:

- Panic cancel
- Force close at bad prices

DO:

- Wait for rebalance
- Monitor the situation
- Only intervene if truly stuck

---

## Troubleshooting

### Common Issues

| Issue                    | Cause                        | Solution                                 |
| ------------------------ | ---------------------------- | ---------------------------------------- |
| **Insufficient Margin**  | Collateral too low           | Add funds or reduce notional             |
| **Bot Paused**           | One-sided exposure           | Wait for rebalance (safety feature)      |
| **Order Stalling**       | Grid mode in trending market | Switch to Mid Price or use -1 bps spread |
| **No Fills**             | Spread too wide              | Reduce spread, try Aggressive mode       |
| **Order Not Submitting** | API key issues               | Check permissions, balance, margin mode  |

### Spot Trading Issues

- Must hold **50% base, 50% quote** token
- Funds must be in **Spot Account**, not Perps account
- Leverage not available for spot

### Residual Positions

- Orders paused/resumed may have unfilled residuals
- Cancelled MM orders auto-place closing order for zero balance

---

## Quick Reference

### Optimal Settings by Scenario

| Scenario             | Mode         | Spread  | Participation | Stop Loss |
| -------------------- | ------------ | ------- | ------------- | --------- |
| BTC/ETH fast markets | Grid         | -1 bps  | Aggressive    | 5-10%     |
| Range-bound altcoins | Grid         | +5 bps  | Normal        | 10-25%    |
| Points farming       | Mid Price    | +10 bps | Passive       | 25%       |
| Delta neutral        | Mid Price    | 0 bps   | Normal        | 10%       |
| Trending market      | Reverse Grid | +2 bps  | Normal        | 10%       |

### Trading Session Timing

| Session        | Time (ET) | Recommendation |
| -------------- | --------- | -------------- |
| NY Open        | 9:30am    | ❌ Avoid       |
| NY Mid-Session | 10am-3pm  | ✅ Best time   |
| NY Close       | 4pm       | ❌ Avoid       |
| Macro Events   | Variable  | ❌ Avoid       |

### Minimum Requirements

- **Weekly volume for points**: $100,000 adjusted
- **Minimum order duration**: 10 minutes
- **Spot trading**: 50/50 base/quote split

### Key URLs

**Tread.fi:**

- **Main App**: https://tread.fi
- **Documentation**: https://docs.tread.fi
- **Points Dashboard**: https://tread.fi/points

**Connected Exchanges:**

- **Hyperliquid**: https://hyperliquid.gitbook.io/hyperliquid-docs
- **Paradex**: https://docs.paradex.trade
- **Extended**: https://docs.extended.exchange
- **Nado**: https://docs.nado.xyz
- **Pacifica**: https://docs.pacifica.fi

---

## Summary

**Tread.fi is a sophisticated market making and delta neutral execution platform, not a simple trading bot.**

### Connected Exchanges Summary

| Exchange        | Best For                             | Tread Boost  |
| --------------- | ------------------------------------ | ------------ |
| **Hyperliquid** | Short leg DN, high-freq MM           | 2x           |
| **Paradex**     | Zero-fee MM, pre-markets             | Variable     |
| **Extended**    | TradFi assets, 2x farming            | 2x           |
| **Nado**        | Long leg DN (early!), unified margin | Pre-announce |
| **Pacifica**    | Early farming, AI tools              | Variable     |

### Key Takeaways

1. **Understand the mechanics** before scaling up
2. **Grid -1 bps** is statistically safer for active markets
3. **Configure stop loss in TreadFi** — at >20x leverage, also set TP/SL on DEX as backup
4. **Points farming requires $100k+ weekly** adjusted volume
5. **Delta neutral** lets you farm multiple airdrops simultaneously
6. **Prioritize 2x boosted exchanges** (Hyperliquid, Extended) for short leg
7. **Farm early-stage DEXs** (Nado) on the long leg
8. **Use Paradex for zero-fee** pure spread capture
9. **Monitor actively** — this is not passive income
10. **Season 1 ends May 18, 2026** — still time to accumulate

### Optimal Delta Neutral Setup (Current Meta)

```
Long Leg:  Nado (pre-announcement, early points)
Short Leg: Hyperliquid (2x boost, deep liquidity)
Pair:      BTC-PERP or ETH-PERP
Duration:  15-30 min TWAP
```

> "Tread alone will end up as a more lucrative play than all Perp DEXs farmed on it"
