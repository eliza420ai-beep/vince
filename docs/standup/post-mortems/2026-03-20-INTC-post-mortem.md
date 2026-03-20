# Post-mortem: INTC long (stop_loss)

**Date:** 2026-03-20

## Trade Snapshot

- INTC long closed stop_loss: entry $45.89 -> exit $44.10, P&L $-196.69 (4992 USD, 5x).
- Entry time (UTC): 2026-03-20T11:01:30.204Z
- Hold window target: intraday
- Max loss budget: $187.20 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 442 minutes
- Adverse move: 3.89%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 40%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing context:** Was this trade sized against a CT/macro sentiment read, or was it a solo TA/FA call? I need to know if you had sentiment tailwinds or headwinds at entry to assess whether the loss was a "sentiment miss" or just bad timing on a contrarian setup.

**If sentiment-driven:** INTC has been under pressure on CT (AI fears, foundry doubts, geopolitical fab risk)—shorting it would've made sense. Going long into that macro vibe was fighting the tape.

**If TA/FA solo:** This is Solus/sizing lane, not mine—but the macro backdrop matters for position durability next time.

**Confidence: 0.4** (need the sentiment context to give real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing critical context:** I need the trade date, the specific Polymarket prediction market you were tracking (if any), and what consensus odds were at entry/exit—without that, I can't connect your stop loss to what the prediction market was pricing. That said, **regime-wise:** a 5x levered long on a mega-cap chip stock into macro uncertainty is inherently regime-sensitive; if you entered on bullish Poly consensus (e.g., "AI capex surge") but exited on a reversal in that narrative (earnings miss, Fed pivot), that's a regime flip, not a bad entry. The -196 bps move is tight discipline—the question is whether the *thesis* broke or just your risk tolerance. **To give you real feedback:** pull the Poly odds at your entry time and tell me what the market was pricing for INTC's next quarter or sector rotation.

**Confidence:

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV environment at entry/exit, and whether this was a thesis-driven play or a technical setup. On mechanics alone: 5x leverage on a $45 stock is aggressive sizing—that's a $225K notional position on a $5K entry, leaving almost no room for normal intraday/daily swings (2.4% move = stop). If INTC thesis was solid, the structure should've been 2–3x max with a wider stop (~$43–44 range) or smaller size at 5x. The $196 loss on a 2.5% adverse move suggests the leverage was mismatched to the volatility profile.

**Confidence: 0.6** (structure critique is sound; full post-mortem needs the missing fields above).

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
   - action: A/B test defined-risk structure recommendation vs spot leverage entries.
   - success_metric: Reduce losses tagged sizing_too_aggressive by >= 20% in test window.
   - rollback: Abort if win rate drops by >8 points with no drawdown improvement.

## Confidence and Data Gaps

- Quality score: 87/100
- Escalate to Sentinel: true
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$187.20, realized=$196.69, slippage=$9.49, breach=true
- Consistency checks: fail (truncated_agent_findings)

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.
- No automatic policy mutation due to data/quality gate.

## Recursive Policy Delta

- Adaptation eligible: false
- Policy version at entry: baseline
- Proposed delta: none

## Machine-Readable Summary

- PM_QUALITY_SCORE: 87
- PM_QUALITY_ESCALATE: true
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 9.49
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 87,
  "qualityEscalate": true,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 442,
  "adverseMovePct": 3.89,
  "riskBudget": {
    "plannedRiskUsd": 187.2,
    "realizedRiskUsd": 196.69,
    "riskSlippageUsd": 9.49,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": false,
    "issues": [
      "truncated_agent_findings"
    ],
    "adverseMovePctFromPrices": 3.89,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": true
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:01:30.204Z",
    "exitTimestampUtc": "2026-03-20T18:23:12.987Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:01:30.204Z",
    "exitTimestampUtc": "2026-03-20T18:23:12.987Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 187.2,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
