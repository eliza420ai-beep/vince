# AUTORESEARCH.md - VINCE Forge Keep-or-Revert Loop

Karpathy's "autoresearch" is the same loop you'd run by hand if you could sleep:
change one thing, score it on a fixed test, keep winners, revert losers.

In VINCE, the loop is implemented as **Forge**: an overnight VINCE-specific optimizer that mutates trading thresholds and gate prompts, then scores each mutation by deterministic paper-bot replay on cached signal data.

This document is the repo-fit runbook: what the loop needs, what you're allowed to touch, and how to use it without turning evaluation into "the agent learns to cheat."

## What this loop is (in one breath)

1. Pick a **mutable surface** (where the agent is allowed to change values).
2. Keep the **scoring charter** fixed (the evaluator's rules live in this repo and must not change mid-run).
3. Replay the mutated surface against a **holdout** and compute a single composite improvement.
4. If the improvement clears hard gates, commit; otherwise revert immediately.

Forge's key property is the same as Karpathy's: **each experiment is isolated by a single mutation and a fixed test harness**. The system can't "optimize the grader," only the output.

## The three "files" in this repo

### 1) Mutable surface (Forge edits these)

Forge mutates exactly the kinds of things that affect decisions:

- `policies/trading-policy.yaml` (numeric thresholds)
- `prompts/vince-entry-gate.md` (numeric rule thresholds inside the prompt)
- `prompts/solus-strike-ritual.md` (numeric rule thresholds inside the prompt)

Every experiment cycle applies **one candidate mutation** (one numeric nudge in one file), then replays and either commits the result or reverts the change.

### 2) Locked scoring criteria (Forge must not self-modify)

The rules for "what counts as better" are the research charter:

- `docs/FORGE_PROGRAM.md` (research charter: composite metric + safety gates + commit policy)
- `src/plugins/plugin-forge/src/services/forgeExperiment.service.ts` (the evaluator logic that enforces those rules)

Treat both as **read-only during a run**. If you edit them mid-loop, you break comparability across experiments and the run becomes meaningless.

### 3) Human instruction input (read by Forge, not mutated by Forge)

Forge also reads thesis context:

- `knowledge/teammate/SOUL.md` (investment thesis; used for thesis-alignment penalty)

This is your "why we care about this regime" file. You update it when the thesis changes; Forge adapts the next run.

## How Forge's keep-or-revert works (exact mechanics)

Within a single Forge run:

1. **Baseline**
   - Forge loads `policies/trading-policy.yaml`
   - Forge loads cached signal records from `.elizadb/forge/signal-cache.jsonl`
   - Forge splits records into a chronological **train/holdout** split (default holdout fraction is `0.2`)
   - Forge computes baseline replay metrics and baseline composite

2. **One mutation**
   - Forge applies one numeric mutation to either:
     - `policies/trading-policy.yaml`, or
     - a numeric rule threshold in one of the prompt files

3. **Deterministic replay + scoring**
   - Forge replays the mutated thresholds/weights over the **same cached records**
   - It calculates:
     - win rate / Sharpe / Brier calibration terms
     - composite metric deltas vs baseline
   - It enforces the safety gates:
     - minimum composite delta: `+0.5%` (delta composite >= `0.005`)
     - minimum win rate floor: `45%`
     - max drawdown does not exceed `policies/trading-policy.yaml:risk.max_drawdown_pct`
     - hard limits like `max_leverage` and `max_single_trade_usd`
     - regime OOS gate + window confirmation gate (both based on holdout)
   - Thesis alignment applies as a multiplier (see `forgeExperiment.service.ts`)

4. **Decide**
   - Winner: Forge commits the mutated surface to `forge/experiment-YYYYMMDD-NNN` (via git branch + commit)
   - Loser: Forge reverts the mutable file back to the original state for the next experiment

This is the "Karpathy loop" part: **keep winners, revert losers**, and only allow the mutable surface to change.

## Setup checklist (so you don't waste a run)

Before you press "run," verify you have the ingredients:

1. Thesis file exists and matches your current regime
   - `knowledge/teammate/SOUL.md`

2. Mutable surfaces exist and have the numeric patterns Forge can edit
   - `policies/trading-policy.yaml`
   - `prompts/vince-entry-gate.md`
   - `prompts/solus-strike-ritual.md`

3. Replay cache has enough labeled outcomes
   - Forge replays from `.elizadb/forge/signal-cache.jsonl`
   - Forge requires a minimum number of holdout outcomes (see `MIN_HOLDOUT_OUTCOMES` in the service; low-data remediation is triggered if needed)

If feature rows are too low, Forge won't "fail gracefully." It will either skip or run remediation, and you won't get meaningful signal.

## Run Forge (on-demand and nightly)

### On-demand

- Trigger: `FORGE_RUN` via the action phrasing `forge run`
- Status: `FORGE_REPORT` via `forge status`

Notes:
- Forge runs in the background.
- Check results via `forge status` and (if configured) the Telegram summary.

### Nightly

Nightly runs are handled by the Forge task `FORGE_NIGHTLY_RUN`.

The important environment knobs:

- `FORGE_ENABLED` (default `true`)
- `FORGE_NIGHTLY_HOUR_UTC` (default `2`)
- `FORGE_BUDGET_MINUTES` (default `120`)
- `FORGE_MAX_EXPERIMENTS` (default `10`)
- `FORGE_RUNTIME` (`mlx` or `python`)
- `FORGE_TARGET_METRIC` (string expression; default `causal_uplift * sharpe * (1 - brier_score)`)

## "Yes/No evaluation" in this repo

Karpathy's headline lesson was: **binary questions beat vibes**.

In this repo, your "binary questions" are the safety gates and promotion validator:

- Pass/fail for `+0.5%` composite delta
- Pass/fail for win rate floor
- Pass/fail for max drawdown
- Pass/fail for regime OOS improvement within tolerance
- Pass/fail for window confirmation (majority-of-windows logic)

If you ever extend the charter, keep the same discipline:

- express criteria as explicit booleans and thresholds
- avoid "pretty good" criteria that don't map to a measurable test
- never mutate the charter during the run

## Use cases this repo can run tonight (examples rewritten for Forge)

These are "what to let the loop try" examples, mapped to the actual mutable surfaces in VINCE.

### 1) Self-improving entry gate (VINCE LLM gate thresholds)

Mutable surface: `prompts/vince-entry-gate.md`

What Forge changes:
- numeric thresholds in rule lines (risk-off / bearish strength / HIP-3 confirming minimum)

What "better" means (scoring):
- composite metric improves on the holdout
- safety gates pass (win rate floor, drawdown limit, regime OOS gate, confirmation windows)

Typical failure mode you're guarding against:
- letting weak confirmations trigger trades too often (hurts win rate + Brier-like calibration downstream)

### 2) Threshold tuning (signal quality gates)

Mutable surface: `policies/trading-policy.yaml`

What Forge changes:
- `signal.min_strength`
- `signal.min_confidence`
- `signal.min_confirming_signals`

Typical effect:
- fewer low-quality triggers
- higher win rate, often improved Sharpe (but watch "too strict" over-filtering)

### 3) Sentiment gate hardening (bearish filter calibration)

Mutable surface: `policies/trading-policy.yaml`

What Forge changes:
- `sentiment_gate.bearish_threshold`

Why it can help:
- a tighter bearish filter prevents "catching bad regimes early"
- it can improve regime OOS stability even if the overall trade count drops

### 4) Solus strike ritual (assignment calibration improvements)

Mutable surface: `prompts/solus-strike-ritual.md`

Numeric knobs you can mutate one-at-a-time (these are now present in the prompt):
- Strike width target (OTM%): `28%`
- DVOL minimum to execute: `18`
- Put/Call ratio ceiling to execute: `1.15`

What "better" means:
- lower mean Brier over resolved assignment predictions (assignment calibration)
- enough resolved rows to trust the estimate (count gate)

Score where it is computed in this repo:
- Predictions go into `.elizadb/solus/solus-assignment-predictions.jsonl`
- Forge now scores `prompts/solus-strike-ritual.md` knob candidates by re-simulating assignment outcomes on resolved rows and computing mean Brier (lower is better)

### 5) Thesis rotation without rewriting code (SOUL.md alignment penalty)

Mutable surface: `knowledge/teammate/SOUL.md` (human-edited, then Forge reads it)

Use case:
- You update the thesis (new regime emphasis).
- Forge keeps testing mutations, but contradictory mutations get penalized via thesis alignment multiplier.

This is useful when:
- the "right" thresholds should change because the regime definition changed, not because the evaluator broke.

### 6) Governance / audit trail: commit winners to experiment branches

Mutable surface: any Forge-mutable file, but the workflow impact is:
- winners commit to `forge/experiment-*` branches
- losers are reverted and leave no lasting history

Why this matters:
- you get a transparent audit trail of what changed and why it passed holdout scoring
- you can PR-review winners before merging them into the baseline

## The three mistakes (Forge-specific version)

### Mistake 1: Fuzzy criteria

In this repo, "fuzzy criteria" is anything that can't be evaluated in replay.

Fix:
- make criteria measurable (numeric thresholds, boolean gates)
- ensure the gate is enforced by code (or by the charter that the code enforces)

### Mistake 2: Changing the scoring charter mid-loop

Don't edit:
- `docs/FORGE_PROGRAM.md`
- `forgeExperiment.service.ts` (or anything that changes the evaluation logic)

Fix:
- if the charter is wrong, stop, fix via PR, then restart Forge.

### Mistake 3: Too many criteria (or too many moving parts)

Even if every criterion is measurable, too many gates can push the agent toward corner-case compliance instead of real improvement.

Fix:
- keep gates focused on what you actually care about (in VINCE terms: composite uplift + safety + stability)
- let the composite metric do the ranking work

## Operator commands (quick reference)

- Run: `FORGE_RUN` (say `forge run`)
- Status: `FORGE_REPORT` (say `forge status`)
- Recover after a bad mutation: `FORGE_REVERT` (say `forge revert`)

`FORGE_REVERT` reverts:
- `policies/trading-policy.yaml`
- `prompts/vince-entry-gate.md`
- `prompts/solus-strike-ritual.md`

## If you want to extend Forge "autoresearch" later

Add new mutable surfaces only when:

- the surface is bounded to one experiment mutation at a time
- the scorer is deterministic over cached data (no external calls during evaluation)
- you can express the success criteria as hard gates + a composite metric

Otherwise you'll recreate the original anti-pattern: the agent learns how to game the grader instead of improving the output.

