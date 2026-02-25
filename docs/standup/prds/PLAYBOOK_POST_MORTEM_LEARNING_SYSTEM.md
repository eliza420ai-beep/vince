# Playbook: Post-Mortem Learning System Ops

**Purpose:** Operational SOP for running `PRD_POST_MORTEM_LEARNING_SYSTEM.md` day-to-day.  
**Owner:** Sentinel (process) + Vince (trade loop)

---

## 1. Daily Operating Rhythm

### 1.1 Before trade entry

1. Run Pre-Trade Quality Gate (PTQG).
2. If required fields are missing, block or size-cap.
3. Route agent requests by lane (Echo/Oracle/Solus).
4. Persist checklist + confidence metadata with entry.

### 1.2 On losing close

1. Auto-generate post-mortem with evidence pack.
2. Apply root-cause taxonomy (primary + secondary).
3. Generate 1-3 corrective actions with owner and due date.
4. Compute quality score; escalate to Sentinel if `< 75`.

### 1.3 End of day

1. Aggregate losses by taxonomy tag.
2. Track unresolved actions and overdue owners.
3. Publish day-report snippet:
   - losses,
   - top causes,
   - action completion rate,
   - policy deltas applied.

---

## 2. Weekly Operating Rhythm (Sentinel)

### 2.1 Weekly review agenda

1. Review KPI dashboard:
   - PTQG completion
   - PMEP completeness
   - quality score distribution
   - avoidable loss rate
2. Rank top repeated failure tags by asset class.
3. Approve/reject policy changes from experiments.
4. Publish one "Policy Changelog" note for next week.

### 2.2 Mandatory weekly outputs

- `Top 3 failure patterns`
- `Top 3 policy updates`
- `Actions overdue > 7 days`
- `Expected impact for next week`

---

## 3. Escalation Matrix

| Trigger | Escalation | SLA |
|--------|------------|-----|
| Post-mortem quality `< 75` | Sentinel review required | 24h |
| Missing evidence pack | Re-run PMEP builder + mark confidence low | 12h |
| `missing_pretrade_data` repeats >= 3/day | Temporary trade throttle + owner alert | Same day |
| `sizing_too_aggressive` repeats >= 3/day | Temporary leverage cap reduction | Same day |
| Action overdue > 7 days | Escalate owner in weekly review | Weekly |

---

## 4. Policy Change Protocol

### 4.1 Rule for shipping a policy change

A policy change is eligible only if:

- backed by >= 3 relevant post-mortems,
- has measurable target metric,
- has rollback condition,
- and has a named owner.

### 4.2 Policy change template

- **Hypothesis:** what should improve
- **Change:** exact parameter/process change
- **Metric:** primary and guardrail metrics
- **Window:** test duration
- **Rollback:** explicit threshold

---

## 5. Data Contract Checklist

Every post-mortem should include:

- trade fields (entry/exit/notional/leverage/hold)
- PTQG state at entry
- sentiment + regime references
- taxonomy tags
- quality score
- owner-assigned actions

If any required field is missing, label:

- `incomplete_postmortem: true`
- `confidence_cap: 0.50`

---

## 6. Quality Guardrails

- No generic recommendation without owner and due date.
- No regime claim without source stamp or "unavailable" reason.
- No strategy suggestion without sizing implication.
- No final closeout if actions are missing.

---

## 7. First 30 Days Success Checklist

- Week 1: PTQG + PMEP enforced on all new losses.
- Week 2: Taxonomy tags applied with >90% consistency.
- Week 3: Sentinel weekly review publishing top failure patterns.
- Week 4: At least 2 policy experiments completed with outcome readout.

Target outcomes by Day 30:

- avoidable-loss rate down >= 30%
- missing-data loss tag down >= 60%
- aggressive-sizing loss tag down >= 40%

---

## 8. RACI (Lightweight)

| Workstream | Responsible | Accountable | Consulted |
|------------|-------------|-------------|-----------|
| PTQG enforcement | Vince | Vince | Sentinel |
| Post-mortem scoring + escalation | Sentinel | Sentinel | Vince |
| Lane routing quality | Echo/Oracle/Solus owners | Sentinel | Vince |
| Policy experiments | Vince | Sentinel | Human operator |
| Weekly governance report | Sentinel | Sentinel | Kelly |

