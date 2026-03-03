# Post-mortem: BTC long (stop_loss)

**Date:** 2026-03-03

## Trade Snapshot

- BTC long closed stop_loss: entry $68660.73 -> exit $67850.00, P&L $-47.04 (3821.827695430811 USD, 3x).
- Entry time (UTC): 2026-03-02T20:14:18.616Z
- Hold window target: intraday
- Max loss budget: $42.53 (3.34%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 582 minutes
- Adverse move: 1.181%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter (exact time)? What was CT sentiment at entry vs. exit? Was there a macro catalyst (Fed news, BTC whale dump, ETH liquidation cascade) that triggered the stop, or just normal volatility? 

**What I can say:** A $3.8k loss on a $68.6k entry suggests you caught a wick or intraday chop—if CT was neutral-to-bullish during your hold and no major narrative broke, this is noise, not a signal to second-guess directional bias. If sentiment *flipped* hard (e.g., whale selling or macro fear spike), that's worth reviewing as a leading indicator you missed.

**To give you real feedback:** Pull the exact entry/exit timestamps, and I'll run X_PULSE to see what CT was saying in that window.

Confidence: 0.3 (need the

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Which Polymarket(s) were you hedging against, and what was the macro regime signal at entry? Without knowing if BTC spot was pricing in a Fed pivot or risk-off, I can't tie the stop to market structure—was this a mean-reversion scalp into support, or a directional long into resistance?

**On the loss itself:** A $3.8K loss on 3x from a 1.3% move is tight risk management, which is solid. The question is whether Poly odds (e.g., "BTC >$70K by [date]") were pricing a lower probability of that move than your entry thesis—if so, you were fighting consensus and the stop was well-placed. If Poly was already pricing >70% for that outcome and you still got stopped, the regime shifted against you mid-trade.

**Confidence: 0.4** (need

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage ratio (3x noted but entry size unclear), stop distance in % (looks ~1.2% from entry?), and **why this trade was opened** (macro view, funding, volatility regime). On mechanics alone: a 1.2% stop on 3x leverage is tight—you're risking liquidation on normal noise. For perps, stops should sit 2-3% below entry minimum, or use tighter sizing. The loss itself ($3.8K on $68.6K entry) suggests either oversizing relative to stop width or a regime you didn't account for (funding flip, macro headwind). **Next:** paste the setup rationale (why long? what was the thesis?) and I'll assess if the stop was appropriate or if sizing should have been smaller.

**Confidence: 0.6** (mechanics visible, thesis invisible).

## Root-Cause Tags

- Primary: regime_conflict
- Secondary: none

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Require PTQG completion and explicit max-loss check before next entry.
   - success_metric: Next trade includes complete PTQG fields and no missing_data flags.
   - rollback: If signal quality drops for 10+ trades, review cap thresholds.
2. [policy] owner=sentinel due=72h
   - action: Add weekly guardrail review for repeated root-cause tags by asset class.
   - success_metric: Post-mortems with pmevCompletenessPct >= 90% over rolling 7 days.
   - rollback: If operational overhead causes missed trades, reduce required manual fields.
3. [experiment] owner=solus due=7d
   - action: A/B test perps sizing: baseline vs capped leverage with same signal cohort.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 582,
  "adverseMovePct": 1.181,
  "echoContext": {
    "entryTimestampUtc": "2026-03-02T20:14:18.616Z",
    "exitTimestampUtc": "2026-03-03T05:56:31.194Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-02T20:14:18.616Z",
    "exitTimestampUtc": "2026-03-03T05:56:31.194Z"
  },
  "solusContext": {
    "assetClass": "crypto",
    "thesisClass": "momentum",
    "leverage": 3,
    "stopDistancePct": 1.113,
    "maxLossUsd": 42.53,
    "maxLossPct": 3.34,
    "entryAtrPct": 1.1128795811518324
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
