---
tags: [trading, risk-management, strategy]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Risk Management Framework

## Methodology & Framework

### Core Concepts

Risk management is the single most important edge in trading. Markets are probabilistic — no setup has a 100% win rate. The goal is survival first, growth second. Capital preservation during drawdowns ensures you're still in the game when high-conviction opportunities appear. Think in terms of expected value across hundreds of trades, not individual outcomes.

### Analytical Approach

**Position Sizing Models:**

- **Fixed Fractional** — Risk a fixed % of portfolio per trade (typically 1-3%). Simple, scales naturally with equity. A 2% risk rule means 50 consecutive losers to blow up — statistically near-impossible with any edge.
- **Kelly Criterion** — Optimal sizing: `f = (bp - q) / b` where b = odds, p = win probability, q = loss probability. Full Kelly is aggressive; use half-Kelly or quarter-Kelly in practice. Requires accurate win rate and reward/risk estimates.
- **Volatility-Adjusted** — Size inversely to asset volatility. Higher ATR = smaller position. Normalizes risk across assets so a BTC position and an altcoin position carry similar dollar risk.

**Stop-Loss Strategies:**

- **Structure-based** — Below key support, swing low, or order block. Best for swing trades.
- **ATR-based** — 1.5-2x ATR from entry. Adapts to current volatility regime.
- **Time-based** — If thesis hasn't played out within X candles, exit. Prevents capital lock-up.
- **Invalidation-based** — Define what breaks the thesis before entry. If that level hits, exit without debate.

### Pattern Recognition

**Portfolio Heat** — Total open risk across all positions. If risking 2% per trade with 5 open trades, portfolio heat is 10%. Cap portfolio heat at 6-10% in normal conditions, reduce to 3-5% in high-uncertainty regimes. When heat is maxed, no new trades until existing ones are stopped out or moved to breakeven.

**Correlation Risk** — Five "different" altcoin longs are effectively one trade if BTC dumps. Measure effective diversification, not just position count. In crypto, correlation spikes to ~1.0 during liquidation cascades. Treat correlated positions as a single risk unit. Hedge directional exposure with stablecoin allocation or delta-neutral strategies.

### Decision Framework

**Max Drawdown Rules:**

- **-10% monthly** → Reduce position sizes by 50%, review all open trades
- **-15% monthly** → Stop trading, go to cash, review journal for 48 hours minimum
- **-20% from equity peak** → Full stop. Re-evaluate strategy, market regime, and psychological state before resuming

**Pre-Trade Checklist:**

1. Define entry, stop, and target before executing
2. Calculate position size from stop distance and risk budget
3. Check portfolio heat — is there room?
4. Assess correlation with existing positions
5. Confirm risk/reward ≥ 2:1 (exceptions for high win-rate setups)

**Risk Scaling by Conviction:**

- Low conviction: 0.5-1% risk
- Standard: 1-2% risk
- High conviction (A+ setup + regime alignment): 2-3% risk
- Never exceed 5% on a single trade regardless of conviction

The best traders aren't right more often — they lose small and win big. Asymmetric risk/reward combined with disciplined sizing is the entire game.

_Last updated: 2026-02-15_
