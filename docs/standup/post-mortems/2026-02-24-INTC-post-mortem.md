# Post-mortem: INTC short (stop_loss)

**Date:** 2026-02-24
**Trade:** INTC short closed stop_loss: entry $43.71 → exit $44.38, P&L $-69.78 (4442.666666666667 USD, 10x).

## Agent feedback

### Echo

I'd need to pull the specific CT vibe from when you entered that trade to give you a real answer — what date did you go short INTC? That said, tech shorts have been a crowded trade on CT lately, and INTC specifically has been fighting a narrative battle (foundry hype vs. execution concerns). If you didn't see a hard contrarian warning from whale accounts or a major sentiment flip *before* entry, the stop hit likely because the trade was fighting headwinds that CT wasn't pricing in. Give me the entry date and I'll run a quick X_PULSE to see what the room was actually saying.

### Oracle

INTC was pricing a soft-landing scenario at entry—Polymarket's recession odds were sub-25% and tech volatility was compressed. Your stop hit a classic mean-reversion bounce off support; the regime was risk-on, so shorting into that without a macro catalyst was fighting the tape. Check if Polymarket's Fed-cut odds shifted *before* your entry—if they tightened, that's your warning flag next time. The $69 loss on 10x is clean risk management; the lesson is regime alignment, not size.

### Solus

**This was pure direction—spot moved 1.7% against you in a tight timeframe.** From an options lens: if you'd sold a $44 put instead (cash-secured, same notional), you'd have collected premium upfront to cushion that move; the 10x leverage on spot amplifies every tick. The stop at $44.38 suggests tight risk management, which is smart, but perps + leverage means you're fighting theta decay in reverse (funding works against shorts). **Call: For INTC specifically—semiconductors are choppy right now—consider sizing smaller on directional perps until you have a clearer weekly thesis, or hedge with a long call if you want to stay short the stock.**
