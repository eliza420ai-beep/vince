---
tags: [trading, options, derivatives]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# $HYPE Wheel Strategy: From Tradfi Wisdom to Crypto Reality

## Overview

This document details our real-world implementation of the wheel strategy on $HYPE (Hyperliquid token), demonstrating how traditional options strategies can be adapted for high-volatility crypto assets with superior capital efficiency.

## The Core Thesis

**Tradfi Reality**: $500K position in SPY/QQQ yields $10-20K/month (2-4% monthly) through covered calls. Low volatility, predictable income, but requires significant capital.

**Crypto Advantage**: High-IV assets like $HYPE enable similar (or larger) monthly income with significantly less capital, while maintaining asymmetric upside potential.

### Our Proof Point

- **Position**: ~$90K in $HYPE
- **Current Yield**: $2K-$3K weekly premiums
- **Scaled Projection**: At $500K position → $40-50K/month at current implied vols
- **Asset Context**: Token tied to fastest-growing on-chain derivatives empire (Hyperliquid)

## Trading History: The Full Arc

### Phase 1: Aggressive Growth (Mid-October to Mid-December 2025)

**Strategy**: Aggressive wheeling with:

- Primary: Covered calls
- Secondary: Naked puts for extra premium

**Results**:

- Harvested over $11K in premiums
- Climbed to #2 on Hyperliquid options leaderboard
- Felt unstoppable

### Phase 2: The Steamroller (Late December 2025)

**What Happened**:

- $HYPE wicked down to $22
- Our $27 puts got exercised at ugly prices
- Wiped $4.4K in profits
- Left $25K unrealized drawdown

**Response**: Capitulated on the bounce, rotated entire stack into BTC for safe 1-1.3% weekly yields through holidays.

**Key Learning**: The healing period was important, but we continued monitoring Hyperliquid fundamentals.

### Phase 3: The Comeback (Early January 2026)

**Observations During Healing**:

- Hyperliquid protocol didn't break
- Dominated perp volume and revenue through entire crash
- Kept shipping (new markets, HyperEVM upgrades)
- Assistance Fund buybacks aggressively offset unlocks
- **Fundamentals held strong while everything else bled**

**Re-entry Decision**:

- Yields on $HYPE options were roughly double BTC's
- Premium income cushions dips effectively
- Swapped 1 BTC (~$25.50) for ~3,400 $HYPE
- Started grinding $27 covered calls, collecting ~$2K weekly

**Position Addition** (January 16):

- Spot dipped to $23.62, formed potential double bottom
- Added 200 more $HYPE at $25.30 with spare USDT
- Stack grew to ~3,600 $HYPE

**Strategy Refinement**:

- Rolled forward from $27 calls to $26 strike for January 23 expiry
- Not chasing volatility—refining setup for richer premiums in cooled market
- Staying 100% convicted on long-term thesis

## Why $26 Is the Sweet Spot (Current Setup)

### The Premium Edge

- **$26 strike**: Currently offering >118% APR on Hypersurface
- **$27 strike**: Was offering ~65% APR
- **Premium increase**: Nearly double the yield

### Position-Level Impact

- **Full position**: 3,600 $HYPE
- **Premium boost**: ~$1,000 additional weekly upfront
- **Swap math**: Becomes absurdly attractive

### Risk-Reward Math

**Drawdown Scenario**:

- $1 drop in spot = ~$3,600 principal hit (3.9% drawdown)
- Extra premium vs. BTC (or old $27 strike) = $52K+ annualized
- **Coverage**: Full $5 drawdown covered in ~5 weeks of rolling
- **Volatility becomes your friend instead of enemy**

### Assignment Discipline

**If Called Away at $26**:

- 2.4% gain from blended entry
- Plus every penny of premium collected

**If Expires Worthless**:

- Keep full stack
- Roll again immediately

**Assignment Odds**:

- Platform models: ~31% assignment probability
- Real-world (with momentum): Likely 35-40%
- Higher than $27's 20%, but yield premium more than compensates

### Monte Carlo Validation

**Simulation Parameters**: 10,000 paths, neutral drift

**Results**:

- Base + bear cases (chop or further fade): ~70% probability
- **This is where the income buffer shines brightest**
- Pocketing 2.6% weekly while waiting for catalysts

## The Bigger Picture: Hyperliquid Fundamentals

### Market Dominance

- **Perp market share**: ~69%
- **Daily revenue**: $1.5-2.5M
- **Open interest growth**: +34% in recent weeks
- **Assistance Fund**: Burning ~$2M/day to offset unlocks

### Supply Dynamics

**January Unlock**:

- 1.2M tokens (~$31M, 0.3% of supply)
- Absorbed without a hiccup
- Price actually ticked higher post-event
- Supply fears muted until February

### Institutional Validation

**Grayscale ETF Filing**:

- Delaware trust registered
- On Q1 "Assets Under Consideration" list
- Institutional validation for one of youngest assets ever
- **Not priced in yet, but brewing**

### Product Velocity

- Equity perps exploding
- Forex markets live
- HyperEVM upgrades shipping
- Direct routing from Phantom/MetaMask wallets
- Pure product velocity, zero BS promises
- Value accruing straight to holders via burns and revenue share

**Conclusion**: Current levels feel like accumulation territory on every fundamental metric.

## Risk Framework

### Acknowledged Risks

**Not BTC Safety Mode**:

- $HYPE is high-beta
- Alts bleed harder in risk-off scenarios
- Monthly unlocks still ongoing
- Perp funding rotations can sting
- Another steamroller could hit principal fast

### How $26 Wheel Mitigates

1. **Yield-first in uncertainty**: Premiums keep flowing even in chop
2. **Weekly paychecks**: Enable averaging down or rotation if needed
3. **Upside discipline**: Enforces profit-taking on rips without FOMO

### Historical Context

2025 was crypto's maturation crucible—hype fatigue giving way to real infrastructure and revenue-generating protocols. Hyperliquid embodies this perfectly.

**The Thesis**: If execution continues (all signs point to yes), tokenomics will compound seriously. Paired with $2K+ weekly paychecks? Still deeply asymmetric.

## Advanced Strategy: Layering CSPs

### The Enhancement

Layering aggressive cash-secured puts (CSPs) alongside weekly covered calls turns $HYPE setup into a more dynamic hedge, especially given token's historical volatility:

- Average -8.49% in down weeks over past year
- ~20% weekly ranges common

### How the Hedge Works

**Base Setup**:

- 3,600 $HYPE selling $26 covered calls weekly
- ~$2K premium (2% yield)

**CSP Addition**:

- Sell puts at aggressive strikes ($20-22) instead of +2 OTM
- Use stables as collateral
- Target 1-2% premium per put contract
- Higher delta = more sensitivity to dips

**This is NOT a full strangle** (unlimited risk if naked), but secured with stables, so max loss is assignment (buying more at strike).

### Weekly Routine

1. **Sell covered calls** at +2 (~$27 on $25 spot) for upside income/hedge
2. **Sell CSPs** at aggressive strike (e.g., $22, 12% OTM) with stables as collateral
3. **Dip hits**: Puts assigned → buy more $HYPE cheaper, lowering average cost
4. **No dip**: Both expire worthless → double premiums (~$3-4K/week total), roll next week
5. **Rips**: Calls might assign (sell at $27), use put premiums or stables to rebuy via spot or new puts

### The Effect

This creates a "collar-lite":

- Calls cap upside mildly (but you rebuy if convicted)
- Puts provide downside buffer via averaging
- Theta works double-time as seller on both sides

### Pros: Supercharged Yield and Conviction

**Averaging Down on Dips**:

- Perfect for $HYPE's swingy nature
- Past year: -8% average down weeks
- 10-15% dip (to $21-22) triggers assignment
- Scoop 1,000-2,000 more tokens at discount
- Blended cost drops, setting up bigger wins on rebounds

**Extra Income**:

- CSP premiums add 1-2% weekly on collateral
- Example: $20K stables secures ~1,000 tokens worth of puts at $20 strike
- Netting $200-400 premium
- **Total yield**: $2K calls + $500-1K puts = $2.5-3K/week
- **Monthly**: $10-12K

**Risk Alignment**:

- Fits low-allocation approach—no overexposure
- If assigned on puts, you're deeper in token you love (Hyperliquid's 69% perp share, burns)
- Not bag-holding junk
- Rotates stables productively without touching BTC core

**Vol as Friend**:

- $HYPE's ~100-120% IV (inferred from 118% APR)
- Put premiums bloat more than calls in fear spikes
- Dips pay you extra to buy low

### Cons and Risks

**Capital Tie-Up**:

- CSPs require cash reserves
- Example: $20K per 1,000-token put at $20 strike

**Assignment Double-Edged**:

- **Good side**: Big dip assigns puts → great for averaging (e.g., add 1,000 $HYPE at $20 net of premium, new average ~$23)
- **Bad side**: If dip persists (alt nuke), you're over-allocated (stack grows 20-50%), amplifying drawdowns
- Historical -20% weekly ranges mean this hits ~1-2x/quarter

**Opportunity Cost**:

- Stables in CSPs earn yield but miss BTC upside
- BTC's been +2-5% weekly in bulls
- If no dip, it's "dead money" vs. spot holding

**Vol Crush or False Dips**:

- Premiums shrink if IV fades post-unlock (February risk)
- Choppy weeks could assign puts on wicks without real crash
- Ties capital unnecessarily

**Tax/Fees**:

- On-chain: Gas and slippage add up on rolls/assignments
- Minimal on Hypersurface, but track it

### Quick Math Example

**Base Position**: 3,600 $HYPE at $25 spot

**Calls**:

- Sell $27 strike (8% OTM) for $2K premium (~2% yield)

**Aggressive Puts**:

- Use $40K stables to secure 2,000-token CSPs at $22 strike (12% OTM, higher delta for dip sensitivity)
- Premium: ~$800 ($0.40/token, realistic at current IV)

**Total Weekly Income**: $2,800 upfront

**Dip Scenario** (Spot to $20, -20%):

- Calls expire worthless (+$2K)
- Puts assigned: Buy 2,000 $HYPE at $22 - $0.40 prem = $21.60 net
- New stack: 5,600 tokens at ~$23 average
- Drawdown cushioned by $2.8K prem; rebound to $25 recoups fast

**No Dip/Rip**:

- Keep $2.8K, roll
- If ripped to $28: Calls assign (sell 3,600 at $27) → use to buy puts or spot back in

### Implementation Notes

**On Hypersurface**:

- Check IV/RSI Sundays
- Sell puts only if oversold (RSI<40) for better odds
- Monte Carlo on past data (~70% no-assignment) suggests 20-30% annualized return boost
- Sim it yourself for $HYPE specifics

**Catalyst Consideration**:

- If catalysts stack (e.g., HyperEVM live), this could print
- Hedges the hedge without complexity

## Key Takeaways

1. **Capital Efficiency**: High-IV crypto assets enable wheel strategy with 5-10x less capital than tradfi equivalents
2. **Yield Premium**: Current $HYPE setup yields 118% APR on $26 strikes vs. 65% on $27
3. **Fundamental Conviction**: Hyperliquid's fundamentals (market dominance, product velocity, institutional validation) support long-term thesis
4. **Risk Management**: The wheel strategy provides yield buffer during uncertainty while maintaining upside participation
5. **Strategic Refinement**: Moving from $27 to $26 strike optimized for current volatility regime
6. **Advanced Hedging**: CSPs layered on covered calls create collar-lite effect, enabling averaging down on dips while maintaining income

## The Wheel Turns Again

The strategy continues to evolve. Each cycle teaches lessons about:

- Strike selection optimization
- Volatility regime adaptation
- Capital allocation between calls and puts
- Balancing yield with conviction

The wheel turns again—sharper this time.
