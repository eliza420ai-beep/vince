# Post-mortem: NFLX short (stop_loss)

**Date:** 2026-02-24
**Trade:** NFLX short closed stop_loss: entry $76.12 → exit $77.29, P&L $-85.55 (5376 USD, 10x).

## Agent feedback

### Echo

I didn't run a sentiment read on NFLX before your trade, so I can't tell you if CT had a contrarian vibe that would've flagged this — that's on me for not proactively checking. **NFLX isn't in my core watch lane** (I focus BTC, ETH, SOL, macro, HIP-3 stocks), so I wouldn't have caught it unless you'd asked me to run X_PULSE on it beforehand. Going forward: if you're trading stocks or alts outside my default radar, ping me first and I'll pull CT sentiment so we can check for crowding or contrarian setups before you size in. The loss itself isn't surprising given a 10x lever on a single-day reversal — that's execution risk, not sentiment risk.

### Oracle

**Polymarket context:** I'd need to pull the live odds on NFLX-related markets (earnings, stock direction) at your entry time to give you a clean read—those don't live in my standard feed. **If you have the condition_id or market name**, I can check what the crowd was pricing in and whether implied move matched realized vol.

**On regime:** That's VINCE's lane—he tracks perps, realized vol, and macro tilt. Ask him what the paper bot's risk-on/off signal was at entry; I can then cross it against Polymarket sentiment if a relevant market existed.

**Quick take:** A $5.3K stop on a $76 short is tight (1.5% from entry); if earnings or a catalyst was flagged in Polymarket as high-conviction bullish, that's a "should have known" signal. Send me the market name and I

### Solus

**This was direction, not mechanics.** You shorted spot at $76.12 with 10x leverage on a $5,376 notional—that's a $53.76 risk per contract, which is tight for NFLX's typical daily vol (~2-3%). The $1.17 move (1.5%) hit your stop; with that leverage, you needed either tighter vol or a stronger directional thesis. From an options lens: if you'd sold a $76 put instead (collecting premium, capping loss), you'd have had a cushion. Spot leverage is binary; options let you get paid for being wrong. **The lesson: this size + leverage on spot needs either higher conviction or a hedge (sell a call/put collar).**
