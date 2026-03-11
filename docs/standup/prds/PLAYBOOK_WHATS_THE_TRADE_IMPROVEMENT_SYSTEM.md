# Playbook: What's the Trade Improvement System Ops

**Purpose:** Day-to-day operating SOP for `PRD_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md`.  
**Owner:** Sentinel (governance) + Vince (execution loop)

**Narrative trading (catalysts, feedback, roadmap):** [NARRATIVE_TRADING_IMPROVEMENTS.md](../NARRATIVE_TRADING_IMPROVEMENTS.md)

---

## 1. Daily Operating Rhythm

### 1.1 Before publishing WTT

1. Draft thesis, primary expression, risk, invalidation, and optional alt.
2. Build one typed payload (v2) as source of truth.
3. Render markdown and sidecar JSON from the same payload.
4. Run validation and quality scoring.

### 1.2 Before paper-bot execution

1. Read WTT quality score.
2. Apply eligibility policy:
   - `>= 80`: auto-eligible,
   - `65-79`: size-capped,
   - `< 65`: blocked from auto-trade.
3. If blocked, still publish WTT with explicit reasons and fixes.

### 1.3 On trade open (WTT-sourced)

Persist attribution fields:

- `wtt_report_id`,
- `wtt_quality_score`,
- `wtt_primary_or_alt`,
- normalized invalidation schema.

### 1.4 On trade close (WTT-sourced)

Persist outcome fields:

- `wtt_invalidation_hit`,
- `wtt_exit_reason`,
- realized result metrics used by weekly review.

---

## 2. Weekly Operating Rhythm (Sentinel)

### 2.1 Weekly review agenda

1. Count WTT reports, traded reports, skipped reports.
2. Compare WTT vs non-WTT outcomes (win rate + expectancy).
3. Rank top WTT failure modes:
   - malformed payload,
   - weak invalidation,
   - timing mismatch,
   - thesis/rubric inconsistency.
4. Propose up to 3 policy deltas for next week.

### 2.2 Mandatory weekly output

- one markdown summary in standup stream,
- KPI table (process + outcome),
- approved policy changes with owner and due date,
- rollback trigger for each change.

---

## 3. Escalation Matrix

| Trigger | Escalation | SLA |
|--------|------------|-----|
| WTT payload invalid | block auto-trade + publish error reason | same day |
| Invalidation parse rate `< 95%` (rolling 7d) | parser fix priority raise | 48h |
| WTT underperforms non-WTT for 2 consecutive weeks | guardrail mode on | same week |
| Missing weekly WTT report | Sentinel escalation | 24h |

Guardrail mode actions:

- raise quality threshold by +5,
- disable size-capped auto entries,
- require human review for WTT auto-trade.

---

## 4. Policy Change Protocol

A WTT policy change ships only when:

- backed by at least 10 recent WTT observations or equivalent evidence,
- has one primary metric and one guardrail metric,
- has named owner and test window,
- has explicit rollback threshold.

Policy change template:

- **Hypothesis**
- **Change**
- **Primary metric**
- **Guardrail metric**
- **Test window**
- **Rollback condition**

---

## 5. Data Contract Checklist

Each daily WTT must contain:

- thesis (falsifiable),
- primary ticker/direction/instrument,
- risk definition,
- normalized invalidation,
- rubric dimensions,
- EV threshold,
- optional alt expression.

Each WTT trade record must contain:

- report ID and quality score,
- primary-or-alt marker,
- invalidation-hit flag at close,
- exit reason enum.

Missing required fields:

- mark `wtt_contract_valid: false`,
- set `wtt_auto_trade_eligible: false`.

---

## 6. Quality Guardrails

- No WTT auto-trade without normalized invalidation.
- No high-conviction label if risk block is incomplete.
- No weekly policy change without before/after metric framing.
- No silent schema drift: every new field requires docs update in the integration doc.

---

## 7. First 30 Days Execution Checklist

- Week 1: payload v2 + shared render path live.
- Week 2: quality gate active and attribution stamped on open.
- Week 3: invalidation normalization and close-time hit logic stable.
- Week 4: weekly governance running with policy deltas.

Day-30 targets:

- 100% valid WTT payloads,
- >= 95% invalidation parse success,
- >= 95% attribution coverage on traded WTT picks,
- positive WTT expectancy delta vs baseline window.

---

## 8. Lightweight RACI

| Workstream | Responsible | Accountable | Consulted |
|------------|-------------|-------------|-----------|
| WTT payload contract + rendering | Vince | Vince | Sentinel |
| Quality scoring + auto-trade gating | Vince | Vince | Sentinel |
| Weekly governance + escalation | Sentinel | Sentinel | Vince |
| Policy experiments | Vince | Sentinel | Human operator |
| Documentation hygiene | Sentinel | Sentinel | Vince |

