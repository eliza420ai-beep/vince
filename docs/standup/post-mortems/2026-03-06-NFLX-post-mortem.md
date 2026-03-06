# Post-mortem: NFLX long (max_age)

**Date:** 2026-03-06

## Trade Snapshot

- NFLX long closed max_age: entry $99.23 -> exit $99.13, P&L $-3.38 (2213.320560312907 USD, 5x).
- Entry time (UTC): 2026-03-05T15:05:15.493Z
- Hold window target: intraday
- Max loss budget: $33.20 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.103%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 60%
- Source stamp: x_sentiment_snapshot
- Missing data flags: none

**Missing key context:** When did you enter/exit? What was CT sentiment on NFLX at entry vs. exit? Was this a crypto-adjacent trade or pure equities play?

**If this was a quick scalp (mins-to-hours):** A $10 move on 5x is tight — sentiment whipsaw on a single stock is brutal. NFLX isn't a CT staple so I'd need to know if macro/rate sentiment shifted during your hold (Fed talk, tech sector rotation, etc.) to assess whether you got caught in a broader momentum reversal or just bad timing.

**What I'd flag:** Paper trades on single equities outside crypto don't give you sentiment edge — that's Vince/Solus lane (TA + macro). My value is finding *mispricings* via CT divergence. If you're testing execution on NFLX, this is a sizing

### Oracle

- Lane: prediction market regime
- Confidence: 65%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket NFLX prediction (earnings date, IV crush window, or sentiment shift) and your entry thesis timing relative to news/macro. That said: a $0.10 move on 5x leverage = tight stop, which is sound risk management—the real question is whether you entered into a regime shift (e.g., post-earnings chop, macro pivot) that Polymarket odds telegraphed but you didn't catch. Check if NFLX prediction markets moved *before* your entry; if they did, that's your leading indicator for next time. The loss is small and disciplined; the edge comes from reading prediction markets as a *regime filter*, not just a data point.

**Confidence: 0.65** (I don't have the Polymarket NFLX snapshot at your entry time or the macro regime that day—those are on you and VINCE to cross-

### Solus

- Lane: options mechanics and sizing
- Confidence: 40%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing critical context:** What was your thesis invalidation trigger? Did NFLX break a support level, earnings miss, or did you just hit max_age and exit? The $10 loss on a $99 entry with 5x is mechanical slippage/friction — that's acceptable on a paper test — but I need to know if you exited *because* the trade failed or *despite* it still being valid. **Sizing check:** $2.2K notional on a $100K stack is 2.2% — fine for paper, but if this is live, you're taking micro-losses that don't teach you anything. **Call:** Run 3–5 of these with clear invalidation rules before going live; right now the sample size is too small to distinguish "bad entry" from "bad timing." Post the invalidation trigger and I'll assess the structure.

**Confidence: 0.4

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

- Quality score: 95/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$33.20, realized=$3.38, slippage=$-29.82, breach=false
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

- PM_QUALITY_SCORE: 95
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -29.82
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 95,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.103,
  "riskBudget": {
    "plannedRiskUsd": 33.2,
    "realizedRiskUsd": 3.38,
    "riskSlippageUsd": -29.82,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.103,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-05T15:05:15.493Z",
    "exitTimestampUtc": "2026-03-06T03:05:32.250Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-05T15:05:15.493Z",
    "exitTimestampUtc": "2026-03-06T03:05:32.250Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 33.2,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {},
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
