# Post-mortem: MU long (stop_loss)

**Date:** 2026-03-20

## Trade Snapshot

- MU long closed stop_loss: entry $438.70 -> exit $421.87, P&L $-193.98 (4992 USD, 5x).
- Entry time (UTC): 2026-03-20T11:00:59.505Z
- Hold window target: intraday
- Max loss budget: $187.20 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 391 minutes
- Adverse move: 3.836%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing context:** I need to know the *timing* — when did you enter (date/time)? And what was CT sentiment on MU/semis at entry vs. exit? Was this a contrarian trade against bearish CT, or did sentiment flip while you were in? Without the sentiment backdrop, I can't tell you if this was a "CT got it wrong" miss or a "you fought the vibe" loss. 

**What I can say:** MU is a macro play tied to AI capex and chip cycle sentiment — if CT flipped bearish on semis or macro during your hold, that's the real story, not the 4.7% drawdown itself.

**Confidence: 0.3** (need the timing and CT vibe data to give you real feedback).

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** MU's Polymarket expiry, current odds vs. your entry probability, and whether this was a directional bet or a volatility/earnings play—that shapes the post-mortem. That said: **$193.98 loss on a 5x $4,992 position (3.9% drawdown) suggests tight risk management**, which is solid. If MU was priced >60% on Polymarket at entry and you exited on a technical stop rather than a thesis break, you may have been shaken out of a valid edge; if it was <50%, the market was already pricing downside and your stop caught you early. The regime matters: if this closed during a broad risk-off or earnings miss that Polymarket had already baked in, the loss is regime tax, not edge failure. **Confidence: 0.4** (need market pricing + thesis to separate noise from signal

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** leverage entry timing (was $438.70 support or breakout?), volatility regime at entry (IV/DVOL for semiconductors), and position hold duration (hours? days?). That said: **5x on MU is aggressive for a semiconductor stock with 30–40% realized vol**—you're paying gamma on the way down and getting stopped at a tight level. If this was a breakout long, the stop was too close (sub-2% from entry); if it was a mean-revert, entry into resistance is the real issue, not the stop. **Mechanics call:** size down to 2–3x on SEMIS, widen stops to 3–4% for vol regime, or wait for IV crush before entering—you're fighting vol here, not price direction.

**Confidence: 0.6** (need hold time and entry context to sharpen).

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

- Quality score: 83/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$187.20, realized=$193.98, slippage=$6.78, breach=true
- Consistency checks: pass

## What changes on next trade?

- Keep PTQG required fields hard-enforced.
- Current post-mortem quality is acceptable; continue weekly monitoring.
- No temporary leverage override required.
- Promote bounded policy delta candidate and evaluate over a rolling window.

## Recursive Policy Delta

- Adaptation eligible: true
- Policy version at entry: baseline
- Proposed delta: present
- Delta confidence: 0.43
- Delta window trades: 20
- Delta expiry: 2026-04-03T17:31:55.451Z

## Machine-Readable Summary

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 6.78
- PM_ADAPTATION_ELIGIBLE: true
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: true

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 391,
  "adverseMovePct": 3.836,
  "riskBudget": {
    "plannedRiskUsd": 187.2,
    "realizedRiskUsd": 193.98,
    "riskSlippageUsd": 6.78,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 3.836,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": true,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": {
    "confidence": 0.43,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "2026-04-03T17:31:55.451Z",
    "riskIntent": {
      "enforcePreTradeRiskCheck": true,
      "maxLeverageByAssetClass": {
        "equity": 4
      },
      "maxSingleTradeUsd": 4243
    },
    "validationPlan": {
      "windowTrades": 20,
      "targetMetrics": {
        "maxBudgetBreachRate": 0.2,
        "minExpectancyUsd": -5,
        "maxDrawdownPct": 15
      },
      "rollbackTriggers": [
        "budget_breach_rate_worse_than_baseline",
        "expectancy_usd_degrades",
        "drawdown_pct_exceeds_cap"
      ]
    }
  },
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:00:59.505Z",
    "exitTimestampUtc": "2026-03-20T17:31:43.571Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:00:59.505Z",
    "exitTimestampUtc": "2026-03-20T17:31:43.571Z"
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
  "agentContextMissing": {
    "Echo": [
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
