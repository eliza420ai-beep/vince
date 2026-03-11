---
tags: [trading, risk-management, strategy]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Entry & Exit Frameworks

## Methodology & Framework

### Core Concepts

Entries get all the attention; exits determine P&L. Most traders obsess over finding the perfect entry and then panic at every exit decision. The solution is systematic: define your exit framework before you enter. Every trade should have a plan for both winning and losing scenarios. "I'll figure it out when I'm in profit" is how winners become losers.

### Analytical Approach

**Entry Methods:**

- **DCA (Dollar Cost Averaging)** — Deploy capital in equal tranches over time (weekly/monthly). Eliminates timing risk, ideal for core positions (BTC/ETH). Best when you have conviction on direction but not timing. Weakness: underperforms lump sum in sustained uptrends (~66% of the time historically in BTC).
- **Lump Sum** — Full position at once. Superior expected value when you have both conviction and timing signal alignment. Higher variance. Best for high-conviction satellite entries with clear invalidation.
- **Scaling In** — Starter position (30-40%), add on confirmation (30-40%), final add on pullback to support (20-30%). Balances conviction with risk. Each add should have its own stop. Never average down without a predefined plan.

**Entry Filters (all should align):**

1. Regime supports the direction (see market-regime-detection.md)
2. Structure provides clear invalidation (stop level)
3. Risk/reward ≥ 2:1 from current price
4. No conflicting signals on higher timeframe
5. Portfolio heat has room for new risk

### Pattern Recognition

**Exit Frameworks — Taking Profits:**

- **Ladder Out** — Sell in tranches at predetermined levels. Example: 25% at 2R, 25% at 3R, 25% at 5R, trail 25% with structure. Guarantees partial profits while keeping upside exposure. Best for trending markets.
- **Time-Based** — Set a deadline for the thesis. If a catalyst trade hasn't moved in 2 weeks, reassess. Dead capital has opportunity cost. Monthly review: would you enter this trade today at this price? If no, close it.
- **Signal-Based** — Exit when the signal that got you in reverses. MA cross back, RSI divergence on your timeframe, on-chain metrics flipping. Systematic and removes emotion.
- **Trailing Stop** — Move stop to breakeven at 1R profit. Trail with structure (swing lows) or ATR multiple. Lets winners run while locking in gains. Don't trail too tight — give the trade room to breathe.

**Scaling Out vs All-Out:**

- Scaling out reduces regret in both directions (less regret if it keeps running, less regret if it reverses)
- All-out is better for mean reversion / range trades with clear targets
- For trend trades: always scale out. You'll never sell the exact top, stop trying.

### Decision Framework

**The Exit Decision Tree:**

1. **Stop hit?** → Exit immediately. No negotiation. This was decided pre-trade.
2. **First target hit?** → Take 25-33% off. Move stop to breakeven.
3. **Thesis invalidated (but stop not hit)?** → Exit or reduce significantly. Don't wait for the stop if the reason for the trade is gone.
4. **Time limit reached?** → Reassess. Close if no momentum, hold if thesis still intact and progressing.
5. **Regime changed?** → Tighten all stops, take partial profits across portfolio.

**Emotional Discipline Rules:**

- Never move a stop-loss further away. Ever. This is the #1 account killer.
- Don't revenge trade after a loss. Walk away for at least 1 hour, ideally until next session.
- Size down after 3 consecutive losses. The market or your read is off — either way, smaller is safer.
- Journal every trade: entry reason, exit reason, emotional state. Review weekly. Patterns in your behavior are more valuable than patterns on charts.
- If you're checking price every 5 minutes, your position is too large.

**The Endgame:** Build a system you can execute mechanically. The less real-time decision-making required, the less emotion can interfere. Write the rules, follow the rules, review the rules. Repeat.

_Last updated: 2026-02-15_
