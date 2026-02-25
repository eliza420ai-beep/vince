# PRD: Post-Mortem Learning System (PMLS)

**Status:** Draft (Format-aligned)  
**Scope:** Turn losing-trade post-mortems into a closed-loop system that improves trade quality, agent coordination, and risk policy week over week.

### Implementation status (Baseline from current post-mortems)

| # | Capability | Status | Notes |
|---|------------|--------|-------|
| 1 | Auto-run post-mortem on loss | ✅ | Trigger exists when losing trade closes. |
| 2 | Multi-agent feedback (Echo/Oracle/Solus) | ✅ | Present in all reviewed files. |
| 3 | Structured evidence pack | ❌ | Missing timestamp/regime/sentiment context in many reports. |
| 4 | Root-cause taxonomy tags | ❌ | Most outcomes described only as "direction miss". |
| 5 | Action owner + due date | ❌ | Advice exists; ownership is not explicit. |
| 6 | KPI tracking and policy feedback | ❌ | No measurable loop from post-mortem to behavior change. |

---

## 1. Goal

Ship a post-mortem system that does more than explain losses.  
It must change future decisions with measurable impact.

Primary outcomes:

- reduce avoidable losses caused by process mistakes,
- enforce better pre-trade data and sizing discipline,
- route analysis to the right agent lane by default,
- and convert each loss into owner-assigned corrective actions.

---

## 2. Problem

Current post-mortems are readable but not systematized enough to drive compounding improvements.

Across `docs/standup/post-mortems/*.md`, repeated gaps appear:

- pre-trade context is often unavailable during review,
- agents repeatedly ask for missing entry timestamp / condition ID / event context,
- several assets sit outside an agent's operating lane unless manually prompted,
- leverage is frequently high versus normal adverse move,
- and diagnosis is broad ("direction miss") rather than causal and testable.

Without structure, learning remains anecdotal.

---

## 3. Users and JTBD

### 3.1 Primary users

- Vince (paper-trade decision loop)
- Sentinel (quality governance, weekly patterns)
- Human operator (policy approval and overrides)

### 3.2 Secondary users

- Echo/Oracle/Solus owners tuning lane boundaries
- Otaku (future execution path informed by learned constraints)

### 3.3 Jobs-to-be-done

- "Before entry, tell me if this trade meets quality minimums."
- "After a loss, show what failed with evidence."
- "Prove that we are learning, not repeating."

---

## 4. Key Findings From Reviewed Post-Mortems

### 4.1 Lane mismatch and dependency gaps

- Echo often flags non-crypto assets as outside default coverage.
- Oracle often needs a market identifier or has no direct market mapping.
- Solus gives strong structure advice, but mostly post-loss.

### 4.2 Missing evidence at time of diagnosis

- Many reports request data that should already be attached.
- This blocks confidence in sentiment and regime conclusions.

### 4.3 Sizing risk is a repeated dominant factor

- Frequent stop-outs on ~1.3%-2.0% adverse move while using 10x-20x leverage.
- Suggests volatility-aware sizing rules are under-enforced.

### 4.4 Taxonomy weakness

- "Direction miss" appears often but lacks remediation detail.
- No consistent tags to compare failures across assets and regimes.

### 4.5 No explicit learning loop

- No automated conversion from findings into owned tasks and policy changes.
- No KPI dashboard proving behavior change after losses.

---

## 5. Product Requirements

### 5.1 Pre-Trade Quality Gate (PTQG)

Before opening any position, persist:

- asset class (`crypto`, `equity`, `commodity`, `other`),
- thesis class (`momentum`, `mean_reversion`, `event`, `regime`, `other`),
- entry timestamp UTC,
- expected hold window,
- leverage + stop distance,
- max loss in USD and percent,
- catalyst/event flag.

If required fields are missing:

- block entry, or
- enforce "low-confidence mode" with reduced size.

### 5.2 Agent Routing Contract (ARC)

Route prompts by asset class and question intent:

- **Echo:** X/CT sentiment and macro risk pulse.
- **Oracle:** prediction-market regime context where a market exists.
- **Solus:** structure, sizing, and defined-risk alternatives.
- **Vince:** synthesis and final confidence.

Each response must include:

- confidence (`0.00-1.00`),
- source stamp (`as_of`, source type),
- `missing_data[]` flags.

### 5.3 Post-Mortem Evidence Pack (PMEP)

For every losing close, attach:

- trade snapshot (entry/exit/notional/leverage/hold time),
- volatility snapshot (ATR or consistent proxy),
- pre-trade checklist state,
- sentiment snapshot reference,
- regime snapshot reference (or explicit unavailable reason).

Rule: no evidence pack, no final grade.

### 5.4 Root-Cause Taxonomy v1

Require `primary_cause` + `secondary_causes[]` from:

- `thesis_invalid`
- `regime_conflict`
- `sizing_too_aggressive`
- `stop_too_tight_for_vol`
- `agent_lane_mismatch`
- `missing_pretrade_data`
- `execution_or_slippage`
- `unknown_insufficient_evidence`

### 5.5 Corrective Action Generator (CAG)

Each post-mortem outputs 1-3 actions:

- next-trade action (immediate),
- this-week policy action,
- one controlled experiment.

Each action must include:

- owner,
- due window,
- success metric,
- rollback condition (if experiment worsens outcome).

---

## 6. Non-Goals

- Live execution deployment logic changes.
- A perfect forecasting engine.
- Full replacement of narrative analysis with metrics only.

---

## 7. Output Format Requirements

All post-mortems must render these sections in order:

1. Trade Snapshot  
2. Evidence Pack  
3. Agent Findings (structured)  
4. Root-Cause Tags  
5. Corrective Actions  
6. Confidence + Data Gaps  
7. Next-Trade Policy Delta

### 7.1 Quality rubric (0-100)

- completeness: 30
- evidence quality: 25
- diagnosis depth: 20
- actionability: 15
- ownership clarity: 10

Minimum acceptable quality score: 75.  
Below 75 triggers Sentinel escalation.

---

## 8. Metrics and Success Criteria

### 8.1 Process KPIs

- PTQG completion >= 95%
- Full PMEP attachment >= 90%
- Post-mortem quality >= 75 in >= 90% of losses
- Agent output with confidence + missing_data >= 95%

### 8.2 Outcome KPIs (paper bot)

- Reduce avoidable-loss rate by 30% in 30 days
- Reduce `missing_pretrade_data` losses by 60% in 30 days
- Reduce `sizing_too_aggressive` losses by 40% in 45 days

### 8.3 Learning velocity

- Median time from post-mortem publication to policy change <= 72h

---

## 9. Rollout Plan

### Phase A: Standardize (Week 1)

- add taxonomy and output template,
- persist PTQG data at entry,
- attach PMEP in close-loss path.

### Phase B: Enforce (Week 2)

- enforce ARC routing,
- enforce confidence and missing-data metadata,
- enable quality scoring + Sentinel escalation.

### Phase C: Optimize (Week 3-4)

- analyze first 50 scored post-mortems,
- tune leverage/stop constraints by volatility band,
- run controlled policy experiments and compare deltas.

### Implementation status (this PRD)

| Phase | Scope | Status |
|------|-------|--------|
| A | Standardize | Planned |
| B | Enforce | Planned |
| C | Optimize | Planned |

---

## 10. Suggested File Map

| File | Agent/System | Action |
|------|--------------|--------|
| `src/plugins/plugin-vince/src/services/postMortem.ts` | Vince | Modify (structured PMEP + taxonomy + quality score) |
| `src/plugins/plugin-vince/src/services/vincePaperTrading.service.ts` | Vince | Modify (persist PTQG at entry) |
| `src/plugins/plugin-vince/src/services/vinceSentimentGate.ts` | Vince | Modify (low-confidence mode support) |
| `src/plugins/plugin-sentinel/src/tasks/*weekly*.ts` | Sentinel | Modify (escalation + pattern summary by taxonomy) |
| `docs/standup/post-mortems/README.md` | Docs | Update (new required sections + scoring rubric) |
| `docs/standup/day-reports/*.md` | Reporting | Include quality/KPI summary snapshot |

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Process overhead slows throughput | Keep PTQG minimal and auto-filled where possible |
| False precision from incomplete data | Require confidence + missing-data flags and allow unknown class |
| Agents produce overlapping advice | Enforce routing contract with lane ownership |
| Better docs but same outcomes | Tie process KPI review to outcome KPI review weekly |
| Overfitting to recent losses | Use rolling windows and controlled experiments before policy hardening |

---

## 12. Open Questions

- Should low-confidence setups be hard-blocked or size-capped first?
- What volatility proxy should be canonical for stop calibration?
- Should leverage ceilings be global or asset-class specific in Phase A?
- Should Sentinel publish weekly "top repeated failure tags" automatically?

---

## 13. Definition of Done

Done means:

- every new losing trade produces a scored, evidence-backed post-mortem,
- every post-mortem includes fixed taxonomy tags and owned actions,
- weekly reports show trendlines for process and outcome KPIs,
- and policy changes can be traced back to post-mortem evidence.

# PRD: Post-Mortem Learning System (PMLS)

**Status:** Draft  
**Scope:** Convert losing-trade post-mortems into a closed-loop improvement system that raises signal quality, reduces preventable losses, and improves cross-agent coordination before and after entry.

---

## 1. Goal

Build a production process where each losing trade teaches the system something concrete, then changes behavior on future trades.

Success means:

- fewer avoidable stop-outs from process errors,
- better pre-trade validation before leverage is deployed,
- cleaner agent routing (right agent, right question, right timing),
- and post-mortems that contain evidence, not generic commentary.

---

## 2. Problem

Current post-mortems are useful but too inconsistent to drive systematic improvement.

Across reviewed files in `docs/standup/post-mortems`, repeated issues appear:

- pre-trade checks are often missing or not logged,
- feedback frequently asks for missing inputs (timestamp, condition_id, event context),
- several responses defer because the trade was outside an agent's core lane,
- leverage is often high relative to expected intraday move (especially 10x-20x),
- and root-cause labels are mostly "direction miss" without deeper diagnostics.

Result: we get commentary, but not enough structured learning to improve the paper bot quickly.

---

## 3. Users and Jobs To Be Done

### 3.1 Primary users

- Vince (paper-bot operator logic)
- Sentinel (ops quality and governance)
- Otaku (future execution translation from paper signals)

### 3.2 Secondary users

- Human operator reviewing daily outcomes
- Agent owners tuning Echo/Oracle/Solus responsibilities

### 3.3 JTBD

- "Before I enter, tell me if this setup passes minimum quality gates."
- "After a loss, show exactly what failed and what should change."
- "Prove the system is improving week over week."

---

## 4. Key Findings From Current Post-Mortems

1. **Coverage mismatch by asset class**
   - Echo often notes equities/commodities are outside default lane unless explicitly asked.
   - Oracle often needs condition IDs or has no direct market for the ticker.
   - Solus provides mechanics advice, but often after the fact with no pre-trade gating.

2. **Missing evidence at review time**
   - Repeated requests for timestamp, market ID, and context imply data is not attached automatically.
   - This limits confidence in regime/sentiment conclusions.

3. **Sizing risk dominates outcome**
   - Many stops are hit on 1.3%-2.0% adverse move while using 10x-20x leverage.
   - Suggests process-level sizing rules are not strict enough for volatility regime.

4. **Root-cause taxonomy too shallow**
   - "Direction miss" is common but not diagnostic enough.
   - We need explicit tags: thesis quality, catalyst mismatch, sizing error, route error, data gap, execution slippage.

5. **No measurable learning loop**
   - No KPI framework linking post-mortem insights to future trade quality.
   - No auto-generated action items with owners and due dates.

---

## 5. Product Requirements

### 5.1 Pre-Trade Quality Gate (PTQG)

Before opening a position, require a machine-checkable checklist:

- asset class identified (`crypto`, `equity`, `commodity`, `other`)
- thesis type (`momentum`, `mean_reversion`, `event`, `regime`, `other`)
- required context captured:
  - entry timestamp (UTC),
  - expected hold window,
  - catalyst/event flag,
  - leverage and stop distance,
  - max loss in USD and percent.

Trade is blocked (or marked low-confidence) if required fields are missing.

### 5.2 Agent Routing Contract

Route pre-trade and post-mortem prompts based on asset class and question type:

- **Echo:** CT/X sentiment + macro risk-on/off pulse (not stock-specific TA unless explicit support exists).
- **Oracle:** prediction-market regime context when relevant market exists; explicit "no direct market" fallback structure.
- **Solus:** structure/sizing/mechanics and alternatives (perps vs options vs defined-risk structures).
- **Vince:** final synthesis + decision score.

Each agent response must include:

- confidence score (0-1),
- data source stamp,
- missing-data flags.

### 5.3 Post-Mortem Evidence Pack (PMEP)

When `realizedPnl < 0`, auto-attach:

- trade snapshot (entry/exit, leverage, stop, hold time),
- volatility snapshot (ATR or realized intraday range proxy),
- sentiment snapshot hash/reference,
- regime snapshot reference (Poly/macro if available),
- pre-trade checklist state at time of entry.

No evidence pack, no final post-mortem grade.

### 5.4 Root-Cause Taxonomy v1

Require primary + secondary cause tags from fixed set:

- `thesis_invalid`
- `regime_conflict`
- `sizing_too_aggressive`
- `stop_too_tight_for_vol`
- `agent_lane_mismatch`
- `missing_pretrade_data`
- `execution_or_slippage`
- `unknown_insufficient_evidence`

### 5.5 Action Item Generator

Each post-mortem must emit 1-3 actionable changes:

- one immediate (next trade),
- one policy/system change (this week),
- one experiment (A/B or pilot).

Each action includes:

- owner (`vince`, `sentinel`, `echo`, `oracle`, `solus`, `human`),
- due window,
- success metric.

---

## 6. Non-Goals

- Live capital execution changes in this PRD.
- Building a perfect forecasting model.
- Replacing qualitative narrative with metrics only.

This PRD focuses on process quality and learning velocity.

---

## 7. UX / Output Requirements

### 7.1 Standard post-mortem output format

Every file in `docs/standup/post-mortems` should include:

1. Trade Snapshot  
2. Evidence Pack  
3. Agent Findings (structured)  
4. Root-Cause Tags  
5. Corrective Actions  
6. Confidence and Data Gaps  
7. "What changes on next trade?"

### 7.2 Quality rubric (0-100)

Auto-score post-mortem quality:

- completeness (30),
- evidence grounding (25),
- diagnostic depth (20),
- actionability (15),
- owner clarity (10).

Minimum acceptable score: 75.  
Below 75 triggers Sentinel review.

---

## 8. Metrics and Success Criteria

### 8.1 Process KPIs

- Pre-trade checklist completion rate >= 95%.
- Post-mortems with full evidence pack >= 90%.
- Post-mortems scored >= 75 quality: >= 90%.
- Agent response with confidence + missing-data flags: >= 95%.

### 8.2 Outcome KPIs (paper bot)

- Reduce "avoidable loss" rate by 30% in 30 days.
- Reduce losses tagged `missing_pretrade_data` by 60% in 30 days.
- Reduce losses tagged `sizing_too_aggressive` by 40% in 45 days.

### 8.3 Learning velocity KPI

- Median time from post-mortem publication to policy update <= 72 hours.

---

## 9. Rollout Plan

### Phase 1 (Week 1): Structure and Data

- Add standard template and taxonomy.
- Add pre-trade checklist persistence.
- Add evidence pack attachment on close-loss flow.

### Phase 2 (Week 2): Routing and Scoring

- Enforce agent routing contract by asset class.
- Add confidence/missing-data metadata.
- Add quality rubric scoring and Sentinel escalation.

### Phase 3 (Week 3-4): Optimization

- Analyze first 50 scored post-mortems.
- Tune leverage caps and stop-distance rules by volatility band.
- Ship first policy experiments and measure deltas.

---

## 10. Implementation Notes (High Level)

- Keep existing file naming (`YYYY-MM-DD-{ASSET}-post-mortem.md`).
- Extend close-loss path to include structured JSON payload before markdown rendering.
- Store taxonomy tags and quality scores in a queryable store for weekly reporting.
- Backfill recent post-mortems where feasible to establish baseline metrics.

---

## 11. Risks and Mitigations

- **Risk:** Overhead slows trade flow.  
  **Mitigation:** Keep PTQG minimal and machine-generated where possible.

- **Risk:** False precision from weak data sources.  
  **Mitigation:** Require confidence + missing-data flags and allow `unknown_insufficient_evidence`.

- **Risk:** Agent overlap causes noisy recommendations.  
  **Mitigation:** Strict routing by lane plus Vince final synthesis score.

- **Risk:** Process improves documents but not outcomes.  
  **Mitigation:** Tie every process KPI to outcome KPIs and review weekly.

---

## 12. Open Questions

- Should low-confidence setups be blocked or merely size-capped?
- What volatility proxy should be canonical for stop-distance calibration?
- Should asset-specific leverage ceilings be hard-coded in Phase 1?
- Should Sentinel weekly report include top repeated failure tags by asset class?

---

## 13. Definition of Done

This PRD is complete when:

- new losses automatically produce a scored, evidence-backed post-mortem,
- root causes are tagged from fixed taxonomy,
- corrective actions are owner-assigned and trackable,
- and weekly review can prove whether loss quality is improving.

