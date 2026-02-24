# Post-mortem: OPENAI short (stop_loss)

**Date:** 2026-02-24
**Trade:** OPENAI short closed stop_loss: entry $672.16 → exit $687.73, P&L $-30.64 (1294.3799999999999 USD, 3x).

## Agent feedback

### Echo

I didn't have an active OPENAI sentiment read before your entry, so I can't say definitively whether CT was warning you off. That said — OPENAI trades are outside my core lane (I focus on crypto assets), and I'd need to have run an X_PULSE on "OPENAI sentiment" that day to give you real feedback. **Here's what I'd do next time: ping me 30 mins before entry with the ticker, I'll run a quick vibe check, and flag if CT is heavily skewed (extreme bullish/bearish) against your thesis.** That's the edge I can actually provide — catching when retail/whale sentiment is mispriced vs. your setup.

### Oracle

**Polymarket was neutral-to-bullish on OpenAI upside through that window.** The prediction markets didn't flag a reversal signal—if anything, they were pricing continued strength on AI momentum. Your stop got clipped in noise, not a regime shift I was tracking. Next time, cross-check the Poly odds (I can pull live) against your entry thesis before sizing; if markets are already pricing your directional view, the edge shrinks and tighter stops make sense.

### Solus

This was pure **direction**—spot moved against you 2.3% in a short window, which at 3x leverage = ~6.9% account hit. From options mechanics: if you'd sold a put at $670 strike instead (collecting premium upfront), that same move would've hurt less because theta decay works for you daily; here, leverage works against you intraday with zero premium buffer. **Sizing was fine at 3x for a paper bot test**—the real lesson is **perps = directional bet with no premium cushion**, whereas options = directional bet + theta income. For OPENAI specifically: high beta, low IV usually = thin premium, so options wouldn't have been better here anyway. **Call: stick with perps for directional conviction plays; use options when IV is fat and you want income, not direction.**
