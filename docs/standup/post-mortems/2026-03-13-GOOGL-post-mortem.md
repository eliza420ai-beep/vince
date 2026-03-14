# Post-mortem: GOOGL long (stop_loss)

**Date:** 2026-03-13

## Trade Snapshot

- GOOGL long closed stop_loss: entry $306.74 -> exit $301.96, P&L $-74.31 (4619.281437125748 USD, 5x).
- Entry time (UTC): 2026-03-13T14:28:48.418Z
- Hold window target: intraday
- Max loss budget: $69.29 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 135 minutes
- Adverse move: 1.559%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on GOOGL/tech at entry vs. exit? Was there a macro event (Fed speak, jobs data, rate expectations shift) that triggered the stop?

Without the sentiment backdrop and macro timing, I can't tell you if this was a "CT missed the bearish macro pivot" or "you caught a whipsaw in choppy sentiment." Tech is CT's barometer for risk-on/off — if we had a sudden flight-to-safety vibe and you were long, that's a setup problem, not execution.

**Confidence: 0.2** (need the date and macro context to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** I need the entry date, exit date, and what drove the stop—was it time decay, momentum reversal, or macro? Also: were there GOOGL-linked prediction markets (earnings, antitrust, broader tech sentiment) pricing a different regime at entry vs exit? That'd tell us if the market saw the move coming.

**What I can say now:** A 1.5% loss on 5x is tight risk management, so the stop itself was sound. The real question is regime: if you entered on bullish tech sentiment (Polymarket showing high odds on "big tech outperforms") and exited into a reversal (sentiment flipped), that's not a bad trade—that's a regime shift you caught early. If sentiment *didn't* shift but price did, that's noise, and the stop saved you from deeper drawdown.

**Ask VINCE:** Pull the paper bot's entry

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** entry date, hold duration, IV/volatility regime at entry vs exit, whether this was part of a hedge or standalone long, and what invalidation triggered the stop. **On mechanics alone:** 5x leverage on a $306 stock with a $4.75 stop (1.55% width) is tight—you're fighting slippage and intraday noise on a mega-cap. If this was a directional bet, the sizing was aggressive for the conviction level; if it was a hedge against a short, the structure needs review. **Going forward:** post entry, include hold thesis duration (hours/days?) and what price/event would invalidate, so we can assess whether the stop was right-sized or panic-tuned.

**Confidence: 0.65** (structure critique solid; full assessment needs the missing fields).

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

- Quality score: 93/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$69.29, realized=$74.31, slippage=$5.02, breach=true
- Consistency checks: pass

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

- PM_QUALITY_SCORE: 93
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 5.02
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 93,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 135,
  "adverseMovePct": 1.559,
  "riskBudget": {
    "plannedRiskUsd": 69.29,
    "realizedRiskUsd": 74.31,
    "riskSlippageUsd": 5.02,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.559,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-13T14:28:48.418Z",
    "exitTimestampUtc": "2026-03-13T16:44:15.354Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-13T14:28:48.418Z",
    "exitTimestampUtc": "2026-03-13T16:44:15.354Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 69.29,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
