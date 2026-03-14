# Forge Autoresearch Program

This is VINCE's keep-or-revert loop, adapted from the AIHF autoresearch mindset:
- one focused mutation
- deterministic replay
- keep winners
- revert losers

Reference mindset: [AIHF autoresearch loop](https://github.com/eliza420ai-beep/ai-hedge-fund/blob/main/autoresearch/program.md)

---

## Goal

Maximize Forge composite score on holdout replay:

`composite = win_rate * sharpe * (1 - brier_score)`

Subject to hard gates:
- delta composite >= +0.5%
- holdout win rate >= 45%
- uncertain-regime OOS does not degrade beyond tolerance
- window confirmation passes (majority of windows improve or hold)
- policy hard limits are respected

---

## Mutable surface (phase 1)

Use exactly one surface per run:

1. `policies/trading-policy.yaml`
   - `signal.min_strength`
   - `signal.min_confidence`
   - `signal.min_confirming_signals`

Do not mix surfaces in one run.

---

## Data source

Deterministic replay from local forge cache:

- `.elizadb/forge/signal-cache.jsonl`
- outcomes must be back-filled (`outcome`, `pnlPct`)
- chronological holdout split (default 20%)

No external API calls in the replay loop.

---

## Loop

1. Read baseline
   - load current policy
   - load forge cache
   - build holdout split
   - compute baseline metrics

2. Apply one mutation
   - nudge one threshold (small step)

3. Replay candidate
   - compute candidate metrics on holdout
   - run uncertain-regime gate
   - run window confirmation gate

4. Decide
   - if all gates pass and delta >= +0.5%: commit winner on `forge/experiment-*`
   - else: revert mutation immediately

5. Repeat until budget is consumed

---

## Runtime defaults

- `FORGE_BUDGET_MINUTES=120`
- `FORGE_MAX_EXPERIMENTS=10`
- `FORGE_HOLDOUT_FRACTION=0.2`
- `FORGE_CONFIRM_WINDOWS=3`
- `FORGE_REQUIRE_REGIME_OOS_IMPROVEMENT=true`
- `FORGE_REQUIRE_WINDOW_CONFIRMATION=true`

---

## Operator commands

- On-demand run: ask Forge `forge run`
- Status: ask Forge `forge status`
- Nightly mode: `FORGE_ENABLED=true` with `FORGE_NIGHTLY_HOUR_UTC`

---

## Promotion standard

Promotion is allowed only when:
- winner passes hard safety gates
- improvement is stable across windows
- uncertain-regime replay does not materially regress

All winners go through PR review before main.
