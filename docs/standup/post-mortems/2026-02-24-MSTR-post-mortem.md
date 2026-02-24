# Post-mortem: MSTR short (stop_loss)

**Date:** 2026-02-24
**Trade:** MSTR short closed stop_loss: entry $121.31 → exit $124.02, P&L $-153.72 (6720 USD, 10x).

## Agent feedback

### Echo

Good question. If this was in the last 48h, I'd need to run X_PULSE to give you the real CT vibe at entry — but my read beforehand: MSTR shorts have been *consistently* contrarian plays on CT. Whale accounts and retail were heavily long MSTR into that move, which is a classic setup where sentiment consensus can pin shorts. The $3 move against you isn't huge, but it's exactly the kind of crowded short that gets flushed when CT is this bullish on the stock. Next time, check the sentiment divergence first — if CT is 70%+ long and you're shorting, that's a yellow flag for stop-hunts.

Want me to run a quick X_PULSE on MSTR sentiment from the last 24h to see if the vibe has shifted?

### Oracle

MSTR had no active Polymarket prediction market during that window, so I had no direct signal there. On macro regime: mid-November sentiment was risk-on (tech strength, post-election relief), which made a short on a mega-cap AI proxy structurally harder to defend—the tape was against you. Your stop at +23 bps was tight for a 10x levered position in a momentum environment; the real miss was directional bias, not execution. Next time, check the Poly macro overlay (inflation/recession/election) and cross-reference with VINCE's perp sentiment before sizing into crowded shorts.

### Solus

This was pure directional miss—spot moved 2.2% against you in what sounds like a short-term perp trade, not an options mechanics problem. If you'd structured this as a **short call spread** (sell $124 call, buy $126 call) instead of naked short, you'd have capped the loss and kept theta working for you; the 10x leverage + no hedge = binary outcome. For paper trades: test **defined-risk structures** (spreads, collars) before going live—they teach risk management better than naked shorts and let you size bigger without blowing up. Direction was wrong, but mechanics could've saved the PNL.
