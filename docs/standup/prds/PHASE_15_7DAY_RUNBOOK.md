# Phase 15 7-Day Runbook

## Objective

Operate Phase 15 in production-safe mode, validate confidence/sufficiency behavior, and graduate from `observe_only` to guarded one-sleeve `auto_apply` with rollback proof.

## Scope

- VINCE proof engine (causal + sufficiency + source quality + allocator)
- Solus proof parity surface in operator outputs
- Eliza verified-claims distribution guardrail

## Runtime prerequisites

- `VINCE_PHASE14_PROOF_ENGINE_ENABLED=true`
- `VINCE_PROOF_MIN_SUFFICIENCY_GRADE=MEDIUM` (or stricter)
- `VINCE_PHASE15_CAUSAL_MIN_EFFECT=0.02`
- `VINCE_PHASE15_CAUSAL_MIN_SAMPLES_PER_ARM=12`
- `VINCE_SOURCE_QUALITY_COOLDOWN_HOURS=24`
- `VINCE_SOURCE_QUALITY_HYSTERESIS_POINTS=5`
- `ELIZA_VERIFIED_CLAIMS_MIN_CONFIDENCE=0.6`

## Daily verification commands

```bash
# Attribution coverage and outcomes
rg '"tradeId"' data/trade-attribution.jsonl | wc -l
rg '"gateStack"' data/trade-attribution.jsonl | wc -l
rg '"sourceLineage"' data/trade-attribution.jsonl | wc -l
rg '"outcome":"win"|"outcome":"loss"|"outcome":"scratch"' data/trade-attribution.jsonl | wc -l

# Allocator, source quality, and proof artifacts
rg '.' .elizadb/vince-paper-bot/proof-allocator-history.jsonl | wc -l
rg '.' .elizadb/vince-paper-bot/source-quality-history.jsonl | wc -l
rg '.' .elizadb/vince-paper-bot/sufficiency-tasks.json
rg '.' .elizadb/vince-paper-bot/verified-claims.json
```

## Day-by-day plan

### Day 1 — Baseline + Observe-Only Start

1. Set:
   - `VINCE_PROOF_ALLOCATOR_MODE=observe_only`
2. Restart runtime (`bun start`).
3. Confirm new rows are written to attribution and allocator history.
4. Confirm `/vince/paper` includes:
   - `proofSummary.causal30d`
   - `proofSummary.sufficiencyTasks`
   - `proofSummary.solus30d`

**Pass gate**
- New closed rows include `gateStack` and `sourceLineage`.
- Allocator history row count increases.

### Day 2 — Causal Pair Health

1. Inspect `causal30d` snapshot in `/vince/paper`.
2. Validate each pair has coherent counts and confidence values.
3. Confirm failure reasons are explicit (`insufficient_samples`, `effect_below_threshold`) when not eligible.

**Pass gate**
- Causal snapshot is populated and interpretable.
- No schema regressions in pair output.

### Day 3 — Sufficiency v2 Blocker Quality

1. Review `.elizadb/vince-paper-bot/sufficiency-tasks.json`.
2. Identify top blockers and track trend from Day 1.
3. Verify blocker tasks are actionable (not generic/noisy).

**Pass gate**
- Blocker list is stable or improving.
- At least one high-impact blocker trend improves (coverage, depth, or time).

### Day 4 — Source Quality Stability

1. Review `.elizadb/vince-paper-bot/source-quality-history.jsonl`.
2. Confirm cooldown and hysteresis prevent rapid weight flip-flops.
3. Spot-check recommendations for reasonableness by dominant regime.

**Pass gate**
- No same-source thrash inside cooldown window.
- Changes are incremental and policy-consistent.

### Day 5 — Recommendation Mode

1. Set:
   - `VINCE_PROOF_ALLOCATOR_MODE=recommendation`
2. Observe recommendations without applying.
3. Validate recommendation direction aligns with causal + sufficiency context.

**Pass gate**
- No risk-increase recommendations under `LOW` sufficiency.
- Causal-fail windows do not produce aggressive increase logic.

### Day 6 — Rollback Drill + Guarded Auto-Apply

1. Run rollback drill (simulate confidence regression after prior increase).
2. If drill passes, set:
   - `VINCE_PROOF_ALLOCATOR_MODE=auto_apply`
   - Keep scope to one sleeve.
3. Monitor allocator output and policy boundaries.

**Pass gate**
- Rollback path works on confidence failure.
- No policy regressions under guarded auto-apply.

### Day 7 — Closeout and Signoff

1. Compile 7-day report:
   - causal eligibility trend
   - sufficiency grade + blocker trend
   - source quality stability
   - allocator actions: applied/blocked/rollback
   - verified claims count + confidence distribution
2. Confirm Sentinel operator summary is coherent for perps + options proof.
3. Confirm Eliza claims remain confidence-gated.

**Pass gate**
- Stable operation across all checkpoints.
- One-sleeve auto-apply trial completes without regressions.
- Evidence package is ready for Phase 15 signoff.

## Exit criteria (Phase 15 operational completion)

- Promotions require causal confidence pass, not directional uplift only.
- Sufficiency blockers are emitted and used operationally.
- Source quality adjustments are stable (no oscillatory churn).
- Solus proof appears in combined operator confidence framing.
- Eliza uses only verified claims above configured confidence threshold.
