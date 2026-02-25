# Plan: What's the Trade Improvement System (Execution Board)

**PRD Link:** `PRD_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md`  
**Playbook Link:** `PLAYBOOK_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md`  
**Cadence:** Daily execution + weekly Sentinel governance  
**Status Legend:** `todo` | `in_progress` | `blocked` | `done`

---

## 1) Phase Timeline

| Phase | Window | Goal |
|------|--------|------|
| Phase 1 | Week 1 | Contract hardening (single source of truth + validation) |
| Phase 2 | Week 2 | Quality gating + attribution on WTT-driven entries |
| Phase 3 | Week 3 | Invalidation normalization and close-time attribution |
| Phase 4 | Week 4 | Sentinel governance loop + guardrail automation |

---

## 2) Sprint Board

| ID | Ticket | Owner | ETA | Depends On | Status | Deliverable |
|----|--------|-------|-----|------------|--------|-------------|
| WTT-001 | Define WTT v2 types + validator | vince | Week 1 Day 1 | - | todo | Typed schema + validator with structured errors |
| WTT-002 | Single-source render path (JSON + markdown) | vince | Week 1 Day 2 | WTT-001 | todo | One object renders both outputs |
| WTT-003 | Backward-compatible loader (v2 + legacy fallback) | vince | Week 1 Day 3 | WTT-001 | todo | Loader with warning path for legacy files |
| WTT-101 | Quality scorer (0-100 + reasons) | vince | Week 2 Day 1 | WTT-001 | todo | Deterministic score and reason breakdown |
| WTT-102 | Enforce eligibility policy (auto / size-capped / blocked) | vince | Week 2 Day 2 | WTT-101, WTT-003 | todo | Pre-entry gate logic in paper bot |
| WTT-103 | Persist open-time WTT attribution fields | vince | Week 2 Day 3 | WTT-102 | todo | report_id, score, primary_or_alt recorded |
| WTT-201 | Normalize invalidation schema + parser | vince | Week 3 Day 1 | WTT-001 | todo | type/operator/value/asset normalization |
| WTT-202 | Close-time invalidation-hit computation | vince | Week 3 Day 2 | WTT-201 | todo | Reliable hit flag + parse-status handling |
| WTT-203 | Add close `wtt_exit_reason` taxonomy | vince | Week 3 Day 3 | WTT-202 | todo | tp/sl/manual/invalidate/timeout tagging |
| WTT-301 | Add Sentinel weekly WTT governance block | sentinel | Week 4 Day 1 | WTT-103, WTT-203 | todo | Weekly KPI + failure mode summary |
| WTT-302 | Two-week underperformance guardrail | sentinel | Week 4 Day 2 | WTT-301 | todo | Threshold raise + extra review rules |
| WTT-303 | Update integration docs to v2 contract | sentinel | Week 4 Day 3 | WTT-102, WTT-203 | todo | Synced contract, scoring, guardrails docs |
| WTT-900 | Metrics instrumentation | vince | Week 2-4 | WTT-102 | todo | Validity/parse/trade/expectancy counters |
| WTT-901 | Optional sidecar migration script | vince | Week 3-4 | WTT-003 | todo | Backfill recent sidecars to v2 shape |
| WTT-902 | Feature-store/train compatibility pass | vince | Week 4 | WTT-203 | todo | Confirm optional columns and training path |

---

## 3) Acceptance Criteria by Ticket

### WTT-001
- [ ] `WttReportV2` type exists and is exported.
- [ ] Validator returns normalized payload or structured errors.
- [ ] Unit tests cover happy path and invalid payload cases.

### WTT-002
- [ ] Markdown and JSON generated from one typed payload.
- [ ] Snapshot or equivalent test verifies semantic parity.
- [ ] No duplicate field-building logic remains in daily path.

### WTT-003
- [ ] Loader reads v2 first, then legacy fallback.
- [ ] Legacy fallback emits warning with migration hint.
- [ ] Fixture tests for v2 and legacy payloads pass.

### WTT-101
- [ ] Score includes category breakdown and total.
- [ ] Reason codes are stable and machine-parseable.
- [ ] Band tests for `>=80`, `65-79`, `<65` pass.

### WTT-102
- [ ] Gate runs before WTT-sourced trade entry.
- [ ] Behavior matches policy bands exactly.
- [ ] Blocked entries are logged with reason breakdown.

### WTT-103
- [ ] Open-time records include report ID and score.
- [ ] Primary-vs-alt marker is persisted.
- [ ] Feature-store payload includes attribution fields.

### WTT-201
- [ ] Invalidation normalization supports price/event/time/liquidity types.
- [ ] Parser handles known historical strings at >=95% success.
- [ ] Unknown patterns fail gracefully with explicit status.

### WTT-202
- [ ] Close flow computes `wtt_invalidation_hit` when parseable.
- [ ] Unparseable rules set explicit unknown parse state.
- [ ] Tests cover hit, miss, and unknown branches.

### WTT-203
- [ ] Every WTT close has one `wtt_exit_reason`.
- [ ] Enum values are constrained and documented.
- [ ] Close-path tests cover all exit reasons.

### WTT-301
- [ ] Weekly task emits WTT KPI section when data exists.
- [ ] Includes WTT vs non-WTT comparison.
- [ ] Includes top repeated WTT failure modes.

### WTT-302
- [ ] Guardrail triggers only after 2 consecutive negative weeks.
- [ ] Trigger applies policy changes in playbook order.
- [ ] Guardrail activation is visible in weekly output.

### WTT-303
- [ ] Integration doc reflects runtime contract v2.
- [ ] Score thresholds and guardrail policy are documented.
- [ ] Field names match code exactly.

---

## 4) Weekly KPI Checkpoint Template

| Metric | Target | Current | Trend | Owner | Notes |
|--------|--------|---------|-------|-------|-------|
| WTT payload validity rate | 100% | - | - | vince | |
| Invalidation parse success (7d) | >=95% | - | - | vince | |
| WTT attribution coverage (traded) | >=95% | - | - | vince | |
| WTT win rate delta vs baseline | +8% | - | - | sentinel | |
| WTT expectancy delta vs baseline | +10% | - | - | sentinel | |
| Weekly WTT report published | 100% | - | - | sentinel | |

---

## 5) Ready / Done Gates

### Definition of Ready (all tickets)
- [ ] Clear owner and ETA.
- [ ] File targets are known.
- [ ] Test scope is explicit.
- [ ] Dependencies are resolved.

### Definition of Done (all tickets)
- [ ] Code merged and tests pass.
- [ ] Behavior verified with at least one real WTT artifact.
- [ ] Docs synced where contract changed.
- [ ] KPI impact captured in weekly output.

---

## 6) Daily Standup Update Snippet

Use this template in standup:

- **Yesterday:** `<ticket IDs completed>`
- **Today:** `<ticket IDs in progress>`
- **Blocked:** `<ticket ID + blocker>`
- **Risk:** `<one-line risk>`
- **Need:** `<one-line ask>`

