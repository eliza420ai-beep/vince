# Post-mortem: INTC long (max_age)

**Date:** 2026-03-05

## Trade Snapshot

- INTC long closed max_age: entry $45.67 -> exit $45.41, P&L $-34.44 (5425.049180327867 USD, 5x).
- Entry time (UTC): 2026-03-04T23:31:49.907Z
- Hold window target: intraday
- Max loss budget: $81.38 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.585%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp

**Missing key context:** When did you enter vs. exit? Was this during a macro dump, Fed announcement, or tech sector rotation? I need the timestamp to cross-ref CT sentiment at entry/exit — if you shorted into euphoria or longed into panic, that's a sentiment timing miss, not a thesis miss.

**What I'd check:** Did CT flip bearish on semis/INTC specifically between entry and exit, or was this a broad risk-off move that caught your thesis off-guard? Sentiment can stay irrational longer than leverage can stay solvent — if the macro vibe shifted against you, that's the lesson.

**Bottom line:** Post the entry/exit times and I'll run an X_PULSE snapshot for those windows. That'll tell us if you were fighting CT consensus or if the sentiment just repriced faster than your thesis played out.

Confidence: 0.3 (too many

### Oracle

- Lane: prediction market regime
- Confidence: 40%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: timestamp

**Missing key context:** entry/exit timestamp, Polymarket INTC sentiment at those moments, and whether this was a perps scalp or a longer hold (regime matters). That said: a $0.26 move against you on 5x leverage is tight—suggests you caught a micro-reversal or got shaken on noise rather than a directional miss. Check if Polymarket's INTC earnings or macro probability shifted *during* your hold; if not, this looks like bad timing into support, not a regime call. **Confidence: 0.4** (need timestamps and PM context to give you real feedback).

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** entry date, hold duration, IV regime at entry/exit, and whether this was part of a hedge or standalone directional bet—all matter for post-mortem. **On structure:** $5.4K loss on a $45 stock at 5x is tight risk/reward for a paper trade (you risked ~$270 notional to make maybe $200–300 on a win); if this was a test of the bot's execution, the slippage and fill quality look clean, but the position sizing assumes strong conviction on INTC—did you have it? **Mechanics:** The trade worked (entry/exit executed), but the edge wasn't there; paper trades should either prove a signal or prove the bot can scale—this did neither. **Call:** Post-mortem should focus on: Was INTC the right vehicle (low vol, tight spreads), or should you test on higher-beta

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

- Quality score: 81/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$81.38, realized=$34.44, slippage=$-46.94, breach=false
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

- PM_QUALITY_SCORE: 81
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -46.94
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 81,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 720,
  "adverseMovePct": 0.585,
  "riskBudget": {
    "plannedRiskUsd": 81.38,
    "realizedRiskUsd": 34.44,
    "riskSlippageUsd": -46.94,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.585,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-04T23:31:49.907Z",
    "exitTimestampUtc": "2026-03-05T11:32:08.690Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-04T23:31:49.907Z",
    "exitTimestampUtc": "2026-03-05T11:32:08.690Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 81.38,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp"
    ],
    "Oracle": [
      "timestamp"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
