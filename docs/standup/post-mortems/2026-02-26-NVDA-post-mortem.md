# Post-mortem: NVDA short (stop_loss)

**Date:** 2026-02-26

## Trade Snapshot

- NVDA short closed stop_loss: entry $195.60 -> exit $198.71, P&L $-39.96 (2437.12 USD, 10x).
- Entry time (UTC): 2026-02-26T04:33:46.206Z
- Hold window target: intraday
- Max loss budget: $36.56 (15.00%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 296 minutes
- Adverse move: 1.59%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** What was CT saying about NVDA at entry? Was there a macro catalyst (Fed speak, earnings, tech rotation)? And did sentiment flip *before* your stop or after?

**If this was a contrarian short into extreme bullish CT:** that's structurally sound — but 2437 USD loss on a sentiment-driven trade suggests the crowd's conviction was stronger than the positioning warranted. **If sentiment stayed neutral/bullish the whole way:** you shorted into tailwinds, which is the real lesson here.

Run an **X_PULSE on NVDA** at your entry time and we can see if CT was priced in or if you had a real edge that just didn't play out.

**Confidence: 0.4** — I need the sentiment snapshot to give you real feedback.

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket NVDA earnings/guidance odds at entry and exit, and whether this was a pre-earnings or post-earnings short—that regime shift (implied move compression vs. realized vol spike) is the tell. If you shorted into compressed IV ahead of earnings, the stop was right; if you shorted post-earnings expecting mean reversion and got caught in a momentum cascade, the thesis broke. The 1.6% move against you on 10x is tight risk management, but without the market's probability pricing at entry, I can't tell if you were fighting consensus or if consensus shifted mid-trade. **What were Polymarket odds for NVDA earnings beat/miss when you entered?** Confidence: 0.4 (need market context to assess regime vs. execution).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** What was your invalidation for the short? Where was support/resistance that triggered the stop? Was 10x sizing pre-planned for this thesis, or did you add size into a losing position?

**On structure:** $195.60 entry into a $198.71 stop is only 3.1% risk — tight for a stock short, which means you sized aggressively (10x) to hit a meaningful dollar target. That's a valid mechanic IF the thesis was high-conviction and the stop was hard. The loss itself ($2.4K on a $100K stack = 2.4%) is manageable, but I need to know: did NVDA break a key level that invalidated the trade, or did it just grind higher? If it grinded, tighter stops on shorts can whipsaw you. If it broke structure, the stop worked as designed.

**Confidence:

## Root-Cause Tags

- Primary: sizing_too_aggressive
- Secondary: none

## Corrective Actions

1. [immediate] owner=vince due=next_trade
   - action: Cap leverage on this asset class and widen stop to volatility-adjusted range before next entry.
   - success_metric: Next trade includes complete PTQG fields and no missing_data flags.
   - rollback: If signal quality drops for 10+ trades, review cap thresholds.
2. [policy] owner=sentinel due=72h
   - action: Add weekly guardrail review for repeated root-cause tags by asset class.
   - success_metric: Post-mortems with pmevCompletenessPct >= 90% over rolling 7 days.
   - rollback: If operational overhead causes missed trades, reduce required manual fields.
3. [experiment] owner=solus due=7d
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- Apply temporary leverage cap for this asset class in next 7 days.

## Machine-Readable Summary

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: sizing_too_aggressive
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "sizing_too_aggressive",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 296,
  "adverseMovePct": 1.59
}
```
