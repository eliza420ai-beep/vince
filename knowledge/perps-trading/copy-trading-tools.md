---
tags: [trading, derivatives, perps]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Copy Trading Tools for Hyperliquid

## The Edge

Perp trading is brutal. 90% of traders lose money.

But there's a cheat code most people don't know about: **profitable wallets on Hyperliquid are fully visible.**

Free tools let you see exactly how consistent winners are positioned. It's like copying off the kid who always aces the test.

## Tool Comparison

### 1. HyperTracker (@HyperTracker)

**Best for:** Crowd sentiment analysis, watchlist building

Features:

- Tracks millions of Hyperliquid wallets
- Buckets by size and profitability
- Real-time positioning from top performers
- Liquidation risk across price ranges
- Directional bias trends over time

**Key Insight:** Smaller and unprofitable wallets skew way more bullish on average. Useful for gauging crowd sentiment (potential fade signal when retail is max long).

### 2. hypurrdash v2 (@hypurrdash)

**Best for:** Active copy trading with automatic execution

Features:

- New v2 trading terminal with copytrading baked in
- Mirror up to 3 wallets simultaneously
- System replicates their net exposure automatically

**Tips:**

- Filter for swing or position traders working longer timeframes
- Avoid wallets with tons of positions open - you might accidentally copytrade a market maker
- Check wallet's historical drawdowns before copying

### 3. trysuper* (@trysuper*)

**Best for:** Controlled, filtered copy trading with backtesting

Features:

- Long-only or short-only filtering
- Token whitelists and blacklists
- Copytrading backtester (actually useful for validation)
- More granular control over what gets copied

**Use Case:** When you have a directional thesis and want to filter copies to match.

## Important Warnings

### Execution Lag

Don't ape blindly. Execution lag means you won't perfectly replicate returns. The copied wallet enters at one price, you enter slightly later at a worse price.

### Come With Your Own Thesis

Use these tools to:

1. **Gut-check** your existing thesis
2. **Find new ideas** to research further
3. **Gauge crowd positioning** for sentiment analysis

Don't use them as a replacement for thinking.

### Start Small

If you test copy trading:

- Start with minimal position sizes
- Track performance against your own analysis
- Understand the wallet's strategy before scaling

## Workflow Recommendation

1. Build a watchlist of consistently profitable traders in HyperTracker
2. Study their patterns - when do they enter? What's their holding period?
3. Use trysuper\_ backtester to validate the strategy would have worked
4. If copying, start with hypurrdash on small size
5. Compare against your own thesis - don't blindly follow

## Current Status

Not automated yet - just tracking and learning. The value is in understanding HOW consistent winners think, not in blindly copying their trades.
