---
tags: [trading, memecoins, degen]
agents: [echo, eliza]
last_reviewed: 2026-02-15
---

## Methodology and Framework

**Key Concepts:**

- Tread.fi is a meta-layer that rewards trading across multiple perp DEXes
- Volume thresholds determine tier multipliers and point eligibility
- Spread trading (long one DEX, short another) maximizes capital efficiency
- Timing matters: week resets Wednesday 00:00 UTC, season has an end date

**Analytical Approach:**

- Think of perp DEX farming as capital allocation across venues with different boosts
- Optimize for adjusted volume (boost multiplier x raw volume), not raw volume
- Balance maker/taker to maximize rebates while hitting volume targets
- Use delta-neutral (DN) strategies to minimize directional risk while farming

**Decision Framework:**

1. **Volume tier selection**: What tier can you realistically hit given capital?
   - If capital < $10k: Target Bronze ($1M volume for 1.1x)
   - If capital $10-50k: Target Silver ($5M volume for 1.2x)
   - If capital > $50k: Target Gold ($10M volume for 1.3x)
2. **DEX pair selection**: Which venues offer best boost combination?
   - Identify highest boost DEXes (2x = maximum value)
   - Pair long leg with short leg across different DEXes
   - Prioritize DEXes with maker rebates for spread capture
3. **Position sizing**: How to allocate across venues?
   - Split 50/50 for pure DN, or tilt toward higher-boost venue
   - Keep dry powder for rebalancing (funding rate shifts)
   - Never size so large you can't exit during volatility

4. **Timing optimization**: When to execute?
   - Weekly reset: Ensure volume counted before Wednesday 00:00 UTC
   - Best execution: NY session (10am-3pm ET) for liquidity
   - Season awareness: Front-load activity if approaching season end

**Pattern Recognition:**

- High boost + maker rebate = optimal venue for long leg
- Pre-announcement DEXes may offer outsized returns (early mover advantage)
- Funding rate divergence between DEXes = free spread capture opportunity
- Volume spikes near week end = others hitting tier targets

**Red Flags:**

- DEX with very thin liquidity (slippage eats boost gains)
- Aggressive leverage that risks liquidation during volatility
- Ignoring funding rates (can erode profits over time)
- Chasing every new DEX without proper due diligence

**Important Notes:**

- Focus on methodology, not specific dates/deadlines
- Volume targets may change - the tier logic is what matters
- Boost multipliers evolve - the optimization framework stays constant

---

> **Knowledge Base Note**
> Specific dates, tier thresholds, and boost numbers may be outdated.
> Use the FRAMEWORK for optimization thinking, not specific numbers.
> Always verify current parameters on Tread.fi directly.

# Tread.fi Optimization Framework

## Context

Tread.fi aggregates trading activity across multiple perp DEXes into a unified points system. The key insight is that you're not just trading on one DEX - you're optimizing capital allocation across venues to maximize point accumulation while managing risk.

This is different from regular trading because:

1. Volume is the metric, not P&L
2. Spreads and maker rebates become profit centers
3. The multi-DEX structure enables delta-neutral farming

## Core Framework: The DN Spread Strategy

The fundamental strategy is to go long on one DEX while going short on another, capturing:

- Points from both legs (volume counted on each venue)
- Spread between funding rates (if one DEX pays more than another)
- Maker rebates (if positioning as maker on both sides)

### Step 1: Venue Analysis

Evaluate each connected DEX on:

| Factor                  | What to Check                                       |
| ----------------------- | --------------------------------------------------- |
| Boost multiplier        | Higher is better (2x is maximum value)              |
| Maker rebate            | Positive rebate = you get paid to provide liquidity |
| Liquidity depth         | Enough to enter/exit without major slippage         |
| Funding rate            | Compared to other venues for spread opportunity     |
| Pre-announcement status | Unannounced airdrop = extra upside                  |

### Step 2: Pair Construction

Build your DN position by pairing venues:

**Optimal pair characteristics:**

- Long leg: Highest boost + maker rebate + lower funding cost
- Short leg: Second highest boost + maker rebate + funding receipt

**Example logic:**

```
If Venue A has 2x boost + maker rebate
AND Venue B has 2x boost + pre-announcement
THEN: Long A, Short B for maximum adjusted volume
```

### Step 3: Execution Rhythm

**Weekly cycle:**

1. Day 1 (post-reset): Establish core positions
2. Days 2-5: Accumulate volume, rebalance as needed
3. Day 6: Verify volume target is hit
4. Day 7: Light activity, prepare for next week

**Session selection:**

- Trade during high liquidity (NY hours) for tighter spreads
- Avoid low liquidity periods (weekends, Asia night)

## Application: Tier Optimization

### Bronze Tier ($1M volume, 1.1x)

- Minimum viable farming
- Good for: Testing strategy, limited capital
- Approach: Light touch, 2-3 trades per day

### Silver Tier ($5M volume, 1.2x)

- Serious farming territory
- Good for: $10-50k capital range
- Approach: Daily trading, active rebalancing

### Gold Tier ($10M volume, 1.3x)

- Maximum point accumulation
- Good for: Larger capital, active traders
- Approach: High frequency, multiple pairs

### Optimization math:

```
Adjusted Volume = Raw Volume × Boost × Tier Multiplier

Example:
$5M raw × 2x boost × 1.2x tier = $12M adjusted volume
vs
$10M raw × 1x boost × 1.0x tier = $10M adjusted volume

The boosted approach wins despite lower raw volume.
```

## Signals and Patterns

**Opportunity signals:**

- New DEX added to Tread.fi ecosystem (early mover advantage)
- Boost multiplier increased on underfarmed venue
- Funding rate divergence between venues (spread capture)
- Season end approaching (urgency creates volume spikes)

**Risk signals:**

- Boost reduction on primary venue (reassess allocation)
- Liquidity draining from DEX (slippage risk increasing)
- Funding rates equalizing (spread opportunity closing)
- Technical issues on DEX (pause activity)

## Common Mistakes

1. **Chasing raw volume without boost optimization**
   - Fix: Always calculate adjusted volume, not raw

2. **Ignoring maker/taker balance**
   - Fix: Position as maker when possible for rebates

3. **Over-leveraging to hit volume targets**
   - Fix: Use reasonable leverage, prioritize consistency

4. **Missing weekly resets**
   - Fix: Set calendar reminder for Wednesday 00:00 UTC

5. **Single-venue concentration**
   - Fix: Spread across 2-3 venues for boost stacking

6. **Ignoring funding rate costs**
   - Fix: Track net funding impact on position profitability

## Conclusion

- Tread.fi farming is a capital allocation problem across venues
- Delta-neutral strategies minimize directional risk while farming points
- Boost multipliers and tier targets determine optimal strategy
- Weekly rhythm and session selection matter for execution
- Framework applies regardless of specific boost values or tier thresholds

## Related

- [179665925You Shouldnt Do Crypto](179665925you-shouldnt-do-crypto.md)
- [180242263Fair Launch](180242263fair-launch.md)
- [180806522The Throne](180806522the-throne.md)
- [Crypto Tax Frameworks](../regulation/crypto-tax-frameworks.md)
- [Defi Regulation Challenges](../regulation/defi-regulation-challenges.md)
