# PRD: What's the Trade Improvement System (WTT-IS)

**Status:** Draft  
**Scope:** Improve `docs/standup/whats-the-trade/` from a strong daily artifact into a measurable decision-quality system that compounds paper-bot performance.

---

## 1. Goal

Make WTT the highest-signal daily decision layer for Vince.

Primary outcomes:

- increase risk-adjusted quality of WTT-sourced paper trades,
- reduce avoidable WTT misses caused by format drift and weak invalidation logic,
- convert daily WTT outputs into weekly learning loops with clear policy deltas,
- and keep the writing sharp while making extraction and scoring deterministic.

---

## 2. Current State

What already works:

- Daily WTT markdown files are generated in `docs/standup/whats-the-trade/`.
- Structured sidecars exist (`.json` / `.traded.json`) with thesis, direction, rubric, and invalidation fields.
- Paper bot can ingest today's WTT pick when gated by `VINCE_PAPER_WTT_ENABLED`.
- Feature store and `train_models.py` already accept WTT optional columns and report WTT slices.

Current gaps:

- markdown and sidecar can diverge semantically,
- invalidation strings are not normalized enough for reliable analytics,
- no explicit quality score for each WTT report before trade use,
- no weekly governance loop focused only on WTT signal quality,
- and no formal escalation when WTT quality drops.

---

## 3. Users and Jobs To Be Done

### 3.1 Primary users

- Vince (daily trade expression and paper-bot intake)
- Sentinel (quality governance and weekly process control)
- Human operator (policy approval and overrides)

### 3.2 JTBD

- "Give me one clear trade expression with explicit failure conditions."
- "Only route WTT picks to paper execution when they pass quality gates."
- "Show whether WTT picks are improving week over week with evidence."

---

## 4. Product Requirements

### 4.1 WTT Output Contract v2

Every daily WTT must produce one canonical payload:

- `thesis` (single sentence, falsifiable),
- `primary` block (ticker, direction, instrument, entry zone),
- `risk` block (max risk, invalidate condition, kill conditions),
- `rubric` block (alignment, edge, payoffShape, timingForgiveness),
- `evThresholdPct`,
- optional `alt` block.

Rules:

- markdown summary and JSON must be generated from the same typed object,
- one source of truth per day keyed by date,
- missing required fields marks report invalid for auto-trade.

### 4.2 Invalidation Normalization

Replace free-form invalidation text with parseable structure:

- `invalidation.type`: `price_level` | `event` | `time_window` | `liquidity_break`,
- `invalidation.operator`: `<` | `>` | `cross_below` | `cross_above` (when applicable),
- `invalidation.value` (numeric when applicable),
- `invalidation.asset` (ticker scoped).

Keep human-readable text for display, but execution and analytics use normalized fields.

### 4.3 WTT Quality Score (Pre-Execution Gate)

Before a WTT pick is eligible for paper entry, compute a score (0-100):

- structure completeness (25),
- invalidation clarity and parseability (25),
- rubric consistency with thesis (20),
- risk definition quality (20),
- alt expression usefulness (10).

Policy:

- score `>= 80`: auto-eligible (if global WTT toggle is on),
- score `65-79`: size-capped mode,
- score `< 65`: no auto-trade; publish report with reasons.

### 4.4 WTT Outcome Attribution

Each WTT-sourced trade must carry:

- `wtt_report_id` (date + hash),
- `wtt_quality_score`,
- `wtt_primary_or_alt`,
- `wtt_invalidation_hit`,
- `wtt_exit_reason` (`tp` | `sl` | `manual` | `invalidate` | `timeout`).

This enables per-report and per-rubric attribution in weekly review.

### 4.5 Weekly WTT Governance Loop

Sentinel publishes a weekly WTT review containing:

- total WTT picks, traded picks, skipped picks,
- win rate and average expectancy for WTT vs non-WTT trades,
- top repeated failure modes (quality, invalidation, timing),
- policy changes proposed for next week (max 3).

If two consecutive weeks show negative WTT delta vs non-WTT baseline, trigger guardrail mode:

- tighten quality threshold by +5,
- disable low-score size-capped entries,
- require human review for WTT auto-trade.

---

## 5. Non-Goals

- Live-capital execution changes.
- Replacing narrative style with sterile templates.
- Rebuilding the full paper bot architecture.

---

## 6. Success Metrics

### 6.1 Process KPIs

- 100% of WTT reports emit valid v2 payload.
- >= 95% of invalidation rules parse successfully.
- >= 95% of traded WTT picks include attribution fields.
- Weekly WTT governance report published 100% of weeks.

### 6.2 Outcome KPIs (30-45 days)

- Improve WTT win rate vs its current 30-day baseline by >= 8%.
- Improve WTT average expectancy by >= 10%.
- Reduce invalidation ambiguity incidents by >= 70%.
- Reduce WTT no-trade due to malformed payload to < 5%.

---

## 7. Rollout Plan

### Phase 1 (Week 1): Contract Hardening

- define WTT payload v2 types,
- generate markdown + JSON from one object,
- add required-field validation and explicit errors.

### Phase 2 (Week 2): Quality Gate + Attribution

- implement quality scorer,
- enforce eligibility bands (auto / size-capped / blocked),
- stamp report IDs and attribution on all WTT-sourced entries.

### Phase 3 (Week 3): Invalidation Engine

- normalize invalidation schema,
- add parser and fallback rules,
- compute invalidation-hit outcomes with higher confidence.

### Phase 4 (Week 4): Governance + Guardrails

- add Sentinel weekly WTT report,
- add alerting for two-week underperformance,
- ship first policy deltas with before/after tracking.

---

## 8. Suggested File Map

| File | System | Action |
|------|--------|--------|
| `src/plugins/plugin-vince/src/utils/postMortem.ts` | Vince analytics | Extend WTT attribution in outcome analysis |
| `src/plugins/plugin-vince/src/services/vincePaperTrading.service.ts` | Paper bot | Enforce quality gate + attribution fields |
| `src/plugins/plugin-vince/src/utils/wtt*.ts` (new or existing utility module) | WTT parser/scorer | Add payload v2 validation + score logic |
| `src/plugins/plugin-sentinel/src/tasks/sentinelWeekly.tasks.ts` | Sentinel | Add weekly WTT governance section |
| `docs/standup/whats-the-trade/INTEGRATION-WITH-PAPER-BOT.md` | Docs | Update with v2 contract + gate policy |
| `docs/standup/prds/PLAYBOOK_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md` | Ops | Define daily/weekly operating SOP |

---

## 9. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Quality gate blocks too many picks | Start in audit mode for 3-5 days, then enforce thresholds |
| Parser misses nuanced human invalidation text | Keep display text plus structured fields; fail closed only for auto-trade |
| Better format but no outcome lift | Tie weekly review to expectancy and policy experiments |
| Increased ops load | Keep weekly output concise with fixed sections and caps |

---

## 10. Open Questions

- Should quality score thresholds be global or asset-specific?
- Should alt expression ever auto-trade, or only primary?
- What max hold window should trigger `timeout` exit reason by default?
- Should weekly WTT report include confidence calibration error?

---

## 11. Definition of Done

Done means:

- every daily WTT emits one validated v2 payload,
- paper bot only auto-trades eligible WTT picks by score policy,
- traded WTT entries carry full attribution through close,
- and weekly governance shows measurable WTT performance deltas plus policy actions.

