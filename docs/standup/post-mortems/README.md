# Post-mortems (losing trades)

When the paper bot closes a position at a loss, Vince automatically runs a **post-mortem**: he asks Echo (CT sentiment), Oracle (Polymarket regime), and Solus (options/mechanics) for feedback and writes a markdown file here.

- **Auto:** Triggered from `closeTrade()` when `realizedPnl < 0`.
- **Manual:** Use the Vince quick action **Post-mortem (last loss)** or say "Post-mortem on the last losing trade" to run the same flow for the most recent closed losing trade.

Files are named: `YYYY-MM-DD-{ASSET}-post-mortem.md`.

## Required post-mortem sections

Each new post-mortem should include, in order:

1. Trade Snapshot
2. Evidence Pack
3. Agent Findings (structured)
4. Root-Cause Tags
5. Corrective Actions
6. Confidence and Data Gaps
7. What changes on next trade?
8. Machine-Readable Summary

### Lane context (Echo / Oracle / Solus)

For each agent lane Vince asks on a loss, the post-mortem generator also builds a **lane context** object:

- **Echo (sentiment / CT):**
  - `entryTimestampUtc` (trade open time, UTC)
  - `exitTimestampUtc` (trade close time, UTC)
  - `sentimentScore` (numeric CT snapshot at entry)
  - `regime` (e.g. `risk-on`, `risk-off`, `uncertain`)
- **Oracle (prediction markets):**
  - `entryTimestampUtc`, `exitTimestampUtc`
  - `conditionId` (Polymarket `condition_id` when available)
- **Solus (mechanics / sizing):**
  - `assetClass`, `thesisClass`
  - `leverage`, `stopDistancePct`
  - `maxLossUsd`, `maxLossPct`
  - `entryAtrPct` (ATR-based volatility at entry, when present)

These lane contexts are summarized in prose under **Agent Findings (structured)** and emitted in the JSON payload for Sentinel/feature-store use.

## Machine-readable markers

For weekly governance and KPI rollups, include these lines:

- `PM_QUALITY_SCORE: <0-100>`
- `PM_QUALITY_ESCALATE: <true|false>`
- `PM_PRIMARY_CAUSE: <taxonomy_tag>`
- `PM_SECONDARY_CAUSES: <tag1,tag2|none>`
- `PM_PTQG_COMPLETE: <true|false>`
- `PM_PMEP_COMPLETENESS_PCT: <0-100>`
- `PM_MISSING_DATA_COUNT: <integer>`
- `PM_CONTEXT_COMPLETENESS_PCT: <0-100>` (Echo/Oracle/Solus lane context filled vs expected)
- `PM_BUDGET_BREACH: <true|false>`
- `PM_RISK_SLIPPAGE_USD: <number>`
- `PM_ADAPTATION_ELIGIBLE: <true|false>`
- `PM_POLICY_VERSION_AT_ENTRY: <string|unknown>`
- `PM_PROPOSED_DELTA_PRESENT: <true|false>`

## Root-cause taxonomy (canonical tags)

Primary and secondary causes must use one of these tags (lowercase):

- `thesis_invalid`
- `regime_conflict`
- `sizing_too_aggressive`
- `stop_too_tight_for_vol`
- `agent_lane_mismatch`
- `missing_pretrade_data`
- `execution_or_slippage`
- `unknown_insufficient_evidence`

`PM_PRIMARY_CAUSE` must be exactly one of the above. `PM_SECONDARY_CAUSES` should be a comma-separated list of these tags or `none`.

## Machine-Readable JSON payload

Each post-mortem ends with a fenced JSON block under **Machine-Readable Summary**. The JSON object has this shape:

```json
{
  "qualityScore": 0-100,
  "qualityEscalate": true | false,
  "primaryCause": "<one root-cause tag>",
  "secondaryCauses": ["<root-cause-tag>", "..."],
  "ptqgComplete": true | false,
  "pmevCompletenessPct": 0-100,
  "missingData": ["fieldA", "fieldB"],
  "holdMinutes": 0,
  "adverseMovePct": 0,
  "riskBudget": {
    "plannedRiskUsd": 0,
    "realizedRiskUsd": 0,
    "riskSlippageUsd": 0,
    "budgetBreach": false
  },
  "consistencyChecks": {
    "passed": true,
    "issues": [],
    "adverseMovePctFromPrices": 0,
    "adverseMovePctDelta": 0,
    "stopDistancePctFromPrices": 0,
    "stopDistancePctDelta": 0,
    "hasTruncatedFindings": false
  },
  "adaptationEligible": false,
  "policyVersionAtEntry": "risk-2026-03-04.1 | null",
  "proposedPolicyDelta": {
    "confidence": 0.7,
    "sampleSizeHint": 20,
    "maxStepChangePct": 20,
    "expiresAtUtc": "YYYY-MM-DDTHH:MM:SS.sssZ",
    "riskIntent": {
      "stopToAtrMin": 1.2,
      "maxLeverageByAssetClass": { "crypto": 7 },
      "maxSingleTradeUsd": 5000,
      "enforcePreTradeRiskCheck": true
    },
    "validationPlan": {
      "windowTrades": 20,
      "targetMetrics": {
        "maxBudgetBreachRate": 0.2,
        "minExpectancyUsd": -5,
        "maxDrawdownPct": 15
      },
      "rollbackTriggers": ["budget_breach_rate_worse_than_baseline"]
    }
  },
  "echoContext": {
    "entryTimestampUtc": "YYYY-MM-DDTHH:MM:SS.sssZ",
    "exitTimestampUtc": "YYYY-MM-DDTHH:MM:SS.sssZ",
    "sentimentScore": 0-10,
    "regime": "risk-on | risk-off | uncertain | \"\""
  },
  "oracleContext": {
    "entryTimestampUtc": "YYYY-MM-DDTHH:MM:SS.sssZ",
    "exitTimestampUtc": "YYYY-MM-DDTHH:MM:SS.sssZ",
    "conditionId": "polymarket_condition_id | null"
  },
  "solusContext": {
    "assetClass": "crypto | equity | commodity | other",
    "thesisClass": "momentum | mean_reversion | event | regime | other",
    "leverage": 1,
    "stopDistancePct": 0,
    "maxLossUsd": 0,
    "maxLossPct": 0,
    "entryAtrPct": 0
  },
  "agentContextMissing": {
    "Echo": ["entry_datetime", "timestamp"],
    "Oracle": ["condition_id"],
    "Solus": []
  },
  "contextCompletenessPct": 0-100,
  "regimeVsExecution": "regime_miss | execution_miss | unclear"
}
```

This JSON block is the canonical payload for ingestion into the Vince feature store and Sentinel guardrail stats.

## Ingest script (`bun run postmortems:ingest`)

The script reads all `*.md` files here and expects each to contain a **fenced JSON block** (a section that starts with ` ```json ` and ends with ` ``` `). It uses that block to build:

- `postmortems.jsonl` and `root_cause_stats.json` (for feature store and Sentinel)
- The corrective-actions section in `tasks/todo.md`
- The lessons block in `tasks/lessons.md`
- `knowledge/sentinel-docs/POST_MORTEM_LESSONS.md`

**"Missing JSON block in … skipping structured summary"** means that file has no ` ```json ... ``` ` block. Those files are **skipped** for the structured summary only; the rest of the run still succeeds. Typically these are older post-mortems (e.g. from before the Machine-Readable Summary was added). To include them in ingest: add the full **Machine-Readable Summary** section (including the JSON block) to each file, using a file that parses successfully (e.g. `2026-02-27-ETH-post-mortem.md`) as a template.

---

## Learning system docs

To turn post-mortems into measurable process improvements, use:

- PRD: `docs/standup/prds/PRD_POST_MORTEM_LEARNING_SYSTEM.md`
- Ops playbook: `docs/standup/prds/PLAYBOOK_POST_MORTEM_LEARNING_SYSTEM.md`
