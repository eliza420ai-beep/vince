---
tags: [trading, options, derivatives]
agents: [solus, eliza]
last_reviewed: 2026-02-17
---

# Hypersurface Options Reference

> **This is the ONLY platform we use for options trading.**
> All covered calls and secured puts are executed on Hypersurface.
> Deribit is used for IV/volatility data only, NOT for trading.

## Platform Overview

- **URL**: https://hypersurface.io
- **Assets**: HYPE, SOL, WBTC, ETH
- **Expiry**: Friday 08:00 UTC (weekly)
- **Early Exercise**: Hypersurface may exercise ITM options up to 24 hours before expiry
- **Settlement**: Automatic on expiry

## Settlement Timing (CRITICAL)

Options expire **Friday 08:00 UTC**:

- For Europe: Friday 09:00 CET / 10:00 CEST
- For US East: Friday 03:00 EST / 04:00 EDT
- For US West: Friday 00:00 PST / 01:00 PDT

IMPORTANT: for us that's 09:00 each friday

**Important**: Hypersurface may exercise ITM options up to ~24 hours before expiry when optimal for the protocol. This means Thursday evening decisions matter.

## Covered Calls

A covered call is selling someone the right to buy your asset at a chosen strike price.

**How it works:**

1. You own a crypto asset (HYPE, SOL, WBTC, ETH)
2. You sell a call option at a strike price
3. You earn an upfront premium (yield) regardless of outcome

**Outcomes at expiry:**

| Scenario     | Price at Expiry    | What Happens         | What You Earn           |
| ------------ | ------------------ | -------------------- | ----------------------- |
| Below Strike | $95 (strike $100)  | Keep asset + premium | Premium                 |
| At Strike    | $100 (strike $100) | Keep asset + premium | Premium                 |
| Above Strike | $110 (strike $100) | Asset sold at $100   | Premium + $100 per unit |

**Key insight**: You keep the premium no matter what. If assigned, you sell at a price you chose as acceptable.

## Cash-Secured Puts

A cash-secured put is selling someone the right to sell you an asset at a chosen strike price.

**How it works:**

1. You hold stablecoins equal to (strike × quantity)
2. You sell a put option at a strike price
3. You earn an upfront premium (yield) regardless of outcome

**Outcomes at expiry:**

| Scenario     | Price at Expiry    | What Happens        | What You Earn                |
| ------------ | ------------------ | ------------------- | ---------------------------- |
| Above Strike | $110 (strike $100) | Keep cash + premium | Premium                      |
| At Strike    | $100 (strike $100) | Keep cash + premium | Premium                      |
| Below Strike | $95 (strike $100)  | Buy asset at $100   | Premium (reduces cost basis) |

**Key insight**: Premium reduces your effective purchase price. If assigned at $100 with $5 premium, your real cost basis is $95.

## Early Position Closures

You can close positions **BEFORE expiry** from the Portfolio Page.

**Steps:**

1. Go to Portfolio
2. Select your position
3. Click "Close Early"
4. Choose the portion to buy back
5. Pay the applicable premium

**After closing:**

- Position is settled, collateral is unlocked
- **CRITICAL: You must WITHDRAW collateral after closing — it doesn't auto-return to your wallet**

**Solus context — when to close early:**

- Position is deeply ITM and you'd rather take the loss now than risk full assignment
- Market regime changed (black swan, major news) and your thesis is invalidated
- You want to **roll**: close current position early, open new one at different strike/expiry
- Premium has decayed enough that buying back is cheap (time decay worked in your favor)

**Rolling strategy:**
Close early on Wednesday/Thursday when theta has eaten most of the premium → reopen Friday at new strike. This is how you adjust without waiting for expiry.

**Cost consideration:**
Early close premium = current market value of the option. If the option moved against you, closing early costs more than the premium you received.

```
Net P&L = Premium received − Close cost
```

If you sold a call for $50 premium and it's now worth $120 to close → you lose $70 net. Know this before clicking.

**Reference:** https://docs.hypersurface.io/overview/early-position-closures

## Points Program

- **Season 1** is currently active
- Earn points by trading, community engagement, and protocol interaction
- Exact formula (weightings, thresholds, multipliers) is internal and may change
- **Distribution**: calculated weekly, distributed every **Wednesday**
- **Anti-abuse**: accounts showing abuse may be excluded at Hypersurface's full discretion
- Points have **NO inherent monetary value** currently
- **No guarantee** of future token rewards or airdrops
- **NFT multiplier**: must hold both Pass NFT AND partner NFT at the time of each weekly distribution. If either is sold/transferred before distribution, multiplier is not applied

**Solus context:**
Points are a bonus, not the strategy. Don't chase points by overtrading or taking bad strikes. The premium income is the real yield. Points are upside optionality on a potential airdrop — treat them like a free call option on the protocol.

## Eligibility

- US individuals are **NOT eligible** to use Hypersurface
- Everyone else: individuals and institutions welcome
- Only need: wallet + assets + determination

## The Wheel Strategy

The wheel is a systematic income strategy that cycles between covered calls and secured puts:

```
┌─────────────────────────────────────────────────────────────┐
│                    THE WHEEL STRATEGY                        │
│                                                              │
│   1. Own Asset → Sell Covered Calls                          │
│          ↓                                                   │
│   2. If price > strike → Assigned (sell asset)               │
│          ↓                                                   │
│   3. Hold Cash → Sell Secured Puts                           │
│          ↓                                                   │
│   4. If price < strike → Assigned (buy asset back)           │
│          ↓                                                   │
│   5. Return to Step 1 → Repeat                               │
│                                                              │
│   Premium income at every step, regardless of direction      │
└─────────────────────────────────────────────────────────────┘
```

### Advanced Wheel Mechanics

**The Asymmetry Edge:**

- IV consistently overshoots realized volatility in crypto (the "volatility risk premium")
- This is the fundamental edge: you're selling insurance priced for catastrophe to a market that mostly doesn't catastrophe
- Every week you collect this spread. Over 52 weeks, the law of large numbers is your friend

**Position Sizing for the Wheel:**

- Never wheel with more than you'd be comfortable holding through a 50% drawdown
- For covered calls: the underlying IS your position. If HYPE drops 40%, you own that drawdown
- For secured puts: if assigned, you're buying at strike. Would you buy there anyway? If no, don't sell the put
- Rule of thumb: wheel with 60-70% of your intended position size, keep 30-40% in reserve for averaging

**The "Roll" Decision Tree:**

```
Position ITM mid-week?
├── Yes, and thesis still valid → Hold, let it expire, accept assignment
├── Yes, and thesis broken → Close early, eat the cost, preserve capital
├── Yes, but barely → Monitor. Thursday night is decision time
└── No → Let theta work. Premium decays in your favor
```

**Week-over-week compounding:**

- Premium received → immediately deployable as collateral for next week
- Over 52 weeks at 2-3% weekly yield, compound effect is massive
- Key: reinvest premiums, don't withdraw unless needed for living expenses

**When to use secured puts vs buy back:**

- **Bullish on asset**: Buy back immediately at market, restart calls
- **Bearish on asset**: Sell puts at lower strike, get paid to wait for cheaper entry
- **Neutral**: Sell puts at same strike, collect premium while waiting

## Strike Selection (Friday Decision)

Every Friday, you must decide:

**For Covered Calls:**

- Higher strike = lower premium, lower assignment probability
- Lower strike = higher premium, higher assignment probability
- Sweet spot: Strike with ~20-35% assignment probability and >50% APR

**For Secured Puts (after assignment):**

- Strike at/below where you'd happily buy back
- Consider: recent support levels, funding rates, sentiment

**Hypersurface shows:**

- Sell price (strike)
- APR (annualized premium return)
- Sell probability (assignment probability)

### Strike Selection Cheat Sheet

**Conservative (sleep well):**

- Covered call: 15-20% OTM, ~10-15% assignment probability
- Secured put: 15-20% OTM below current price
- Lower premium but very unlikely assignment
- Best when: high uncertainty, major events upcoming, you REALLY don't want to be assigned

**Standard (sweet spot):**

- Covered call: 8-15% OTM, ~20-35% assignment probability
- Secured put: 8-15% OTM below current price
- Good premium/risk balance
- Best when: normal weeks, clear trend, comfortable with assignment

**Aggressive (max yield):**

- Covered call: 3-8% OTM or even ATM, ~40-60% assignment probability
- Secured put: 3-8% OTM below current price
- High premium but very likely assignment
- Best when: strong conviction on direction, want to exit/enter position anyway, using options as limit orders with premium

### IV Regime Matters

| IV Level | What It Means        | Strike Approach                                      |
| -------- | -------------------- | ---------------------------------------------------- |
| <50%     | Low vol, calm market | Go closer to ATM for decent premium                  |
| 50-80%   | Normal crypto vol    | Standard strikes (8-15% OTM)                         |
| 80-120%  | Elevated fear/greed  | Wider strikes, premium still rich                    |
| >120%    | Extreme event        | Maximum premium opportunity — go wide, sell the fear |

**The golden rule: when IV spikes, premiums get FAT. That's when you lean in and sell aggressively (wider strikes). When IV is crushed, either skip or go very close to ATM.**

## Key Differences from Deribit

| Feature       | Hypersurface                | Deribit               |
| ------------- | --------------------------- | --------------------- |
| **Purpose**   | Execute wheel trades        | IV/volatility data    |
| **Interface** | Simple, wheel-focused       | Complex, full options |
| **Expiries**  | Weekly (Friday 08:00 UTC)   | Multiple per week     |
| **Assets**    | HYPE, SOL, WBTC, ETH        | BTC, ETH only         |
| **Display**   | APR, assignment probability | Greeks, IV surface    |
| **Use case**  | TRADING                     | ANALYSIS ONLY         |

## Why Perps Data Matters for Strikes

Hyperliquid perps data informs strike selection:

- **High positive funding**: Longs crowded → higher chance of pullback → lower strikes safer
- **High negative funding**: Shorts crowded → squeeze potential → higher strikes may get hit
- **Rising OI + price**: Strong trend → strikes may be tested
- **Falling OI + price**: Weak conviction → range likely → closer strikes = more premium

**Workflow:**

1. HyperliquidAnalyst reads funding, OI, positioning
2. DeribitAnalyst reads IV, skew for volatility context
3. Friday: Pick strike on Hypersurface informed by both

## Current Workflow

```
Monday-Thursday: Monitor prices, funding, news
Thursday night: Review positions (early exercise possible)
Friday morning: Strike selection decision
Friday 08:00 UTC: Options expire
Friday: New positions opened for next week
```

## References

- Hypersurface Docs: https://docs.hypersurface.io
- Covered Calls: https://docs.hypersurface.io/overview/how-do-covered-calls-work
- Secured Puts: https://docs.hypersurface.io/overview/how-do-cash-secured-puts-work
- Settlement: https://docs.hypersurface.io/overview/settlement
