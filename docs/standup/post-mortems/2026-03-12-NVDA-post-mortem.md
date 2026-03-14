# Post-mortem: NVDA long (stop_loss)

**Date:** 2026-03-12

## Trade Snapshot

- NVDA long closed stop_loss: entry $185.01 -> exit $182.07, P&L $-24.68 (1507.3968 USD, 5x).
- Entry time (UTC): 2026-03-12T11:13:33.098Z
- Hold window target: intraday
- Max loss budget: $22.61 (7.50%)

## Evidence Pack

- PTQG complete: true
- PMEP completeness: 100%
- Hold duration: 165 minutes
- Adverse move: 1.588%
- Sentiment snapshot: sentiment_score:5
- Regime snapshot: regime:uncertain
- Missing data: none

## Agent Findings (structured)

### Echo

- Lane: CT sentiment + macro risk pulse
- Confidence: 30%
- Source stamp: x_sentiment_snapshot
- Missing data flags: timestamp, entry_datetime

**Missing key context:** When did you enter (date/time)? What was CT sentiment on NVDA/tech at entry vs. exit? Was there a macro catalyst (Fed speak, earnings, rate expectations) that shifted between those two points?

**If this was a momentum fade into resistance:** CT was likely euphoric on AI/NVDA into that level — classic setup for a stop-hunt. **If macro shifted (e.g., hawkish Fed pivot):** Sentiment would've turned sharply; you'd have caught the tail of a reversal, not a mispricing.

Without the timestamp and sentiment delta, I can't tell if you got caught in a sentiment whipsaw or just bad timing into a technical level. Bring the entry/exit times + what CT was saying at each point, and I can give you the real post-mortem.

**Confidence: 0.3** (not enough data

### Oracle

- Lane: prediction market regime
- Confidence: 62%
- Source stamp: polymarket_regime_snapshot
- Missing data flags: none

**Missing context:** NVDA prediction-market odds at entry and exit (Polymarket has weekly/monthly NVDA moves—what was the market pricing for your timeframe?), and your hold duration (hours? days?). That said: a $24.68 stop on a $185 entry (13 bps) is tight for a 5x leveraged perp in a stock that routinely swings 1–2% intraday; if you hit that stop in normal market hours, regime likely shifted against you faster than the edge thesis developed. Pull the Polymarket NVDA contract odds for your entry/exit window—if the market repriced meaningfully, the stop was reactive rather than strategic. If odds stayed stable, the edge was either mis-timed or the leverage was too aggressive for the conviction level.

**Confidence: 0.62** (tight stop + no market-pricing context limits the read

### Solus

- Lane: options mechanics and sizing
- Confidence: 60%
- Source stamp: options_mechanics_snapshot
- Missing data flags: none

**Missing context:** Was this a hedge against a short position, or a standalone long? What was your invalidation (the level that would've changed the thesis)? The 1.6% stop at $182.07 is tight for a $185 entry on a mega-cap—typical for scalp, risky for swing. If this was a swing thesis and you got stopped at noise, tighten your entry logic next time (wait for confirmation, higher R:R threshold). If it was a scalp, the mechanics are clean; losses happen. **Confidence: 0.6** (need the trade intent to assess properly).

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

- Quality score: 91/100
- Escalate to Sentinel: false
- Score breakdown: completeness=30, evidence=25, diagnosis=15, actionability=15, ownership=10
- Context completeness: 92.9%
- Regime vs execution: regime_miss
- Risk budget: planned=$22.61, realized=$24.68, slippage=$2.07, breach=true
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

- PM_QUALITY_SCORE: 91
- PM_QUALITY_ESCALATE: false
- PM_PRIMARY_CAUSE: regime_conflict
- PM_SECONDARY_CAUSES: none
- PM_PTQG_COMPLETE: true
- PM_PMEP_COMPLETENESS_PCT: 100
- PM_MISSING_DATA_COUNT: 0
- PM_CONTEXT_COMPLETENESS_PCT: 92.9
- PM_BUDGET_BREACH: true
- PM_RISK_SLIPPAGE_USD: 2.07
- PM_ADAPTATION_ELIGIBLE: false
- PM_POLICY_VERSION_AT_ENTRY: baseline
- PM_PROPOSED_DELTA_PRESENT: false

```json
{
  "qualityScore": 91,
  "qualityEscalate": false,
  "primaryCause": "regime_conflict",
  "secondaryCauses": [],
  "ptqgComplete": true,
  "pmevCompletenessPct": 100,
  "missingData": [],
  "holdMinutes": 165,
  "adverseMovePct": 1.588,
  "riskBudget": {
    "plannedRiskUsd": 22.61,
    "realizedRiskUsd": 24.68,
    "riskSlippageUsd": 2.07,
    "budgetBreach": true
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 1.588,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 1.5,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "baseline",
  "proposedPolicyDelta": null,
  "echoContext": {
    "entryTimestampUtc": "2026-03-12T11:13:33.098Z",
    "exitTimestampUtc": "2026-03-12T13:58:31.374Z",
    "sentimentScore": 5,
    "regime": "uncertain"
  },
  "oracleContext": {
    "entryTimestampUtc": "2026-03-12T11:13:33.098Z",
    "exitTimestampUtc": "2026-03-12T13:58:31.374Z"
  },
  "solusContext": {
    "assetClass": "equity",
    "thesisClass": "momentum",
    "leverage": 5,
    "stopDistancePct": 1.5,
    "maxLossUsd": 22.61,
    "maxLossPct": 7.5,
    "entryAtrPct": 3
  },
  "agentContextMissing": {
    "Echo": [
      "timestamp",
      "entry_datetime"
    ]
  },
  "contextCompletenessPct": 92.9,
  "regimeVsExecution": "regime_miss"
}
```
