# Post-mortem: MU short (max_age)

**Date:** 2026-03-21

## Trade Snapshot

- MU short closed max_age: entry $421.79 -> exit $425.61, P&L $-15.43 (1612.8000000000002 USD, 5x).
- Entry time (UTC): 2026-03-20T17:31:47.254Z
- Hold window target: intraday
- Max loss budget: $60.48 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.907%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter vs. exit (dates)? What was CT sentiment on semis/MU at entry vs. exit? Did macro shift (Fed, rates, AI capex narrative)? Without the timing and sentiment backdrop, I can't tell if you fought the crowd or if sentiment flipped against you mid-trade.

**What I'd need to give you real feedback:** Run X_PULSE on "Micron" or "semiconductor" for the entry date, then the exit date, and compare the shift. If CT was bearish semis at entry and flipped bullish by exit, that's a narrative reversal you got caught in — worth knowing. If sentiment was flat both ways, this was a pure macro/TA miss, not a sentiment call.

**Confidence: 0.3** (can't assess without timing + sentiment snapshots).

### Oracle

- Lane: prediction market regime
- Confidence: 35%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: condition_id

**Missing context:** Polymarket condition_id for MU options (which expiry/strike), entry/exit dates, and your probability estimate at entry vs. market price—without those I can't assess whether you were fighting consensus or if the market repriced fundamentals.

**High-level take:** A $3.82 move against a short in a mega-cap semi (MU) on 5x leverage is regime-dependent—if that was a weekly or monthly vol crush play, the loss is friction; if it was directional, you were likely fighting either earnings flow or a sector rotation that Polymarket was pricing in before your entry. The real question: did Polymarket's MU call odds (or put skew) signal a vol expansion you missed, or was this a timing miss on a fade that was structurally sound?

**Confidence: 0.35** (need the Poly market detail and your thesis

### Solus

- Lane: options mechanics and sizing
- Confidence: 65%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, and what triggered the exit (stop, time-based, thesis break?). On mechanics alone: 5x leverage on a $1,612 notional short in a mega-cap semi (MU) is tight sizing for a $100K stack—that's ~1.6% risk, which is sound, but the $3.84 adverse move (0.91% against you) suggests either a stop was tight or thesis broke fast. If this was a swing (hours to days), the structure is fine; if intraday scalp, you're fighting MU's typical range. **Missing: Did the stop hit, or did you exit on a thesis signal?** If stop, structure worked; if manual exit, tighten your thesis invalidation next time.

**Confidence: 0.65** (low because hold duration and exit trigger are critical to the call).

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
- Risk budget: planned=$60.48, realized=$15.43, slippage=$-45.05, breach=false
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

- PM_QUALITY_SCORE: 83
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -45.05
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 83,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.907,
  "riskBudget": {
    "plannedRiskUsd": 60.48,
    "realizedRiskUsd": 15.43,
    "riskSlippageUsd": -45.05,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.907,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T17:31:47.254Z",
    "exitTimestampUtc": "2026-03-21T05:32:14.687Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T17:31:47.254Z",
    "exitTimestampUtc": "2026-03-21T05:32:14.687Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 60.48,
    "maxLossPct": 18.75,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Oracle": [
      "condition_id"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
