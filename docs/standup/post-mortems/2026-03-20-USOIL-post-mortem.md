# Post-mortem: USOIL short (max_age)

**Date:** 2026-03-20

## Trade Snapshot

- USOIL short closed max_age: entry $118.82 -> exit $119.34, P&L $-10.55 (2150.4 USD, 5x).
- Entry time (UTC): 2026-03-20T11:01:19.395Z
- Hold window target: intraday
- Max loss budget: $80.64 (18.75%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 720 minutes
- Adverse move: 0.441%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 20%
- Source stamp: x_sentiment_snapshot
- Missing data flags: entry_datetime

**Missing key context:** I need to know *when* you entered and exited (date/time) and *what CT sentiment was saying about energy/macro at those moments*. Was there a macro shift (Fed pivot, geopolitical flare, supply news) that reversed the thesis between entry and exit? Without the timing and the sentiment backdrop, I can't tell if you got blindsided by a CT narrative flip or if the setup was just tight. Run X_PULSE for those dates and I can give you the real feedback on whether sentiment telegraphed the reversal.

**Confidence: 0.2** (can't assess sentiment without the when/why).

### Oracle

- Lane: prediction market regime
- Confidence: 60%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** Polymarket USOIL price at entry/exit, your probability estimate vs market odds, and orderbook spread at entry—these tell us whether you were fighting market consensus or if the market repriced faster than your thesis. **On regime:** Oil was likely pricing geopolitical risk or demand shock; a short at $118.82 assumes mean reversion, but if macro shifted (Fed pivot, supply shock), the market was right to push higher. **The math:** 2150 USD loss on 5x leverage is a 1% account hit if you're trading ~$430K notional—acceptable for a thesis that didn't pan out, but the real question is whether Polymarket consensus disagreed with your short at entry (if so, you were fighting the crowd's probability). **Next time:** Pull live USOIL odds from Poly at entry and compare to your edge; if the market was already >55

### Solus

- Lane: options mechanics and sizing
- Confidence: 62%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Entry date, exit date, IV regime at entry/exit, and whether this was a hedge or standalone directional bet. **On mechanics:** A $10.55 move against a $118.82 entry is ~8.9% — tight stop for a commodity on 5x, especially if held <1 day. At that leverage, you're fighting slippage and funding; USOIL moves in choppy $1-2 swings intraday. **Structure call:** If this was a tactical short (not hedge), size down to 2-3x or use options (put spreads) to define risk upfront rather than relying on stop discipline. **Missing:** Were you stopped out or did you exit discretionary?

Confidence: 0.62

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
- Risk budget: planned=$80.64, realized=$10.55, slippage=$-70.09, breach=false
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
- PM_BUDGET_BREACH: false
- PM_RISK_SLIPPAGE_USD: -70.09
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
  "holdMinutes": 720,
  "adverseMovePct": 0.441,
  "riskBudget": {
    "plannedRiskUsd": 80.64,
    "realizedRiskUsd": 10.55,
    "riskSlippageUsd": -70.09,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0.441,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 3.75,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-20T11:01:19.395Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.041Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-20T11:01:19.395Z",
    "exitTimestampUtc": "2026-03-20T23:01:46.041Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 3.75,
    "maxLossUsd": 80.64,
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
