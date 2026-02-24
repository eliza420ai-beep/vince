# Post-mortem: INTC long (stop_loss)

**Date:** 2026-02-24
**Trade:** INTC long closed stop_loss: entry $44.55 → exit $43.73, P&L $-236.19 (12480 USD, 10x).

## Agent feedback

### Echo

I don't have a record of running WTT or X_PULSE on INTC before your entry — that's a HIP-3 stock, outside my core crypto lane, so I wouldn't have flagged sentiment there anyway. **ASK_AGENT VINCE** for the macro/TA context on why INTC was a long candidate at $44.55, but from a *sentiment* angle: if CT was quiet on INTC or leaning skeptical on semis (which they often are during rate-hike cycles), that should've been a yellow flag on conviction. The stop was tight (1.8% loss on a 10x) — smart risk management, but worth asking: did you have a strong thesis *before* checking sentiment, or was sentiment supposed to validate the trade? That's the real lesson here.

### Oracle

**The regime was neutral-to-risk-on.** Pull the INTC condition_id from that timeframe and I'll check what Polymarket was pricing for semiconductor/earnings sentiment—if it was flat or bullish, the stop hit a normal drawdown, not a regime miss. The real question: was your entry *after* a Polymarket signal flipped, or did you enter on a Poly-backed thesis and get shaken out on noise? Give me the entry timestamp and I'll tell you what the market was saying at that exact moment.

### Solus

This was a **spot direction miss, not a mechanics problem**—10x leverage on a single-name semiconductor play without hedging is pure directional bet, and INTC broke support. From an options lens: you could've collared this (long stock + long put + short call) to cap loss at ~2-3% instead of eating the full 1.8% move into a stop, or sized the leverage position smaller (5x max) and held through noise. The real lesson: leverage + no hedge + tight stop = you're fighting the market's intraday chop. For future: either reduce leverage, add a protective put, or skip single-name plays when IV is low and conviction isn't extreme.
