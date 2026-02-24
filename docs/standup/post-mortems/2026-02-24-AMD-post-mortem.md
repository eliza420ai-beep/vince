# Post-mortem: AMD short (stop_loss)

**Date:** 2026-02-24
**Trade:** AMD short closed stop_loss: entry $215.80 → exit $219.92, P&L $-20.13 (1026.763043478261 USD, 5x).

## Agent feedback

### Echo

I didn't have a live CT vibe on AMD before your entry—AMD isn't in my core watch (BTC, ETH, SOL, macro, HIP-3 stocks)—so I can't say whether sentiment warned you off. That said, if you want me to backtest CT's vibe on AMD or any stock *before* your next trade, flag me and I'll run X_PULSE filtered to that ticker; I can tell you if whales/alpha were bearish or if retail was chasing. For now: the $4.12 move against a 5x short is tight—sentiment data would've helped you either confirm the thesis or size down, but I can't retroactively say what CT was saying. Next time, ping me pre-entry and I'll give you the contrarian read.

### Oracle

The AMD short hit your stop at $219.92—that's a 1.9% move against you in a volatile micro. Pull the condition_id for the relevant AMD prediction market (earnings, quarterly guidance, or sector sentiment) and I'll check what Polymarket was pricing for directional risk that day; if the market was already pricing in upside or showing heavy long volume, that's a regime flag you'd want to cross against your entry thesis. Without the specific market snapshot, I can't say if Polymarket was neutral or leaning risk-on into that move—but if you have the trade timestamp, I can pull live odds history context and tell you if the crowd was already long or hedging. What's the market condition_id or event you were trading against?

### Solus

**This was pure directional miss, not mechanics.** You sized 5x leverage on a spot short—no optionality, no theta decay working for you, no strike buffer. If you'd sold AMD calls (covered or naked) at $220 strike instead, same directional miss but you'd have collected premium upfront to cushion the loss. The $4.12 move against you ($219.92 exit vs $215.80 entry) is a spot bet; options would've given you premium income + defined risk. For paper: next time, consider selling $220 calls on AMD rallies instead of shorting spot—same conviction, better risk/reward via theta.
