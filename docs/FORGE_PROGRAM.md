# Forge Research Program

> MLX-powered AutoResearch for VINCE v2.
> Overnight self-optimization — mutate, measure, commit.

---

## Goal

Run nightly experiments on Apple Silicon to find parameter / prompt / model mutations that measurably improve VINCE's composite metric:

```
composite = causal_uplift × Sharpe × brier_calibration
```

- **causal_uplift**: Win-rate improvement vs. rule-based baseline (paper bot replay)
- **Sharpe**: Risk-adjusted return of the paper portfolio over the replay window
- **brier_calibration**: Solus strike prediction accuracy (lower Brier score = better)

---

## Thesis input

Forge reads `knowledge/teammate/SOUL.md` at the start of each nightly run to understand the current investment thesis. Experiments that contradict the thesis are penalized by a 0.8× thesis_alignment multiplier before scoring.

`SOUL.md` must be kept current by the user. When the thesis changes (e.g. rotating from BTC perps to HIP-3 vol plays), update `SOUL.md` and Forge will adapt the next run.

---

## Mutable surfaces (v2 scope)

### Phase 1 — Thresholds (no code changes)
| File | What Forge can mutate |
|------|-----------------------|
| `policies/trading-policy.yaml` | All numeric thresholds |
| `prompts/vince-entry-gate.md` | LLM gate rules |
| `prompts/solus-strike-ritual.md` | Strike selection heuristics |

### Phase 2 — ML weights (Python re-train)
| File | What Forge can mutate |
|------|-----------------------|
| `src/plugins/plugin-vince/scripts/train_models.py` | Hyperparameters via CLI flags |
| `.elizadb/vince-paper-bot/weight-bandit-state.json` | Thompson Sampling priors (reset + retrain) |

### Phase 3 — Agent prompts (VINCE + Solus + Otaku system prompts)
Limited to `style.all` and `style.chat` arrays in character definitions.
Otaku mutations are gated behind human approval (`FORGE_OTAKU_MUTATION_REQUIRES_APPROVAL=true` by default).

---

## Evaluation spec

### Paper bot replay
- Replay the last `FORGE_REPLAY_DAYS` (default: 14) days of feature-store data against the mutated policy.
- Minimum 50 replay trades required; skip if fewer.
- Compare composite metric vs. the `main` branch baseline.

### Safety gate (hard rules — never override)
1. Composite metric delta must be **+0.5% or better** to commit.
2. Max drawdown in replay must not exceed `policies/trading-policy.yaml:risk.max_drawdown_pct`.
3. Win rate must not drop below **45%** (prevents overfitting to a good Sharpe via lucky runs).
4. No mutation can set `max_leverage > 40` for any asset.
5. No mutation can set `max_single_trade_usd > 50000`.
6. Total experiment budget: `FORGE_BUDGET_MINUTES` per run (default: 120 min).

### Commit policy
- Winners → committed to `forge/experiment-YYYYMMDD-NNN` branch, auto-PR created.
- Losers → `git stash drop` (no trace in history).
- Forge never pushes to `main` directly. PRs require human review.

---

## Budget

| Resource | Default | Env var |
|----------|---------|---------|
| Wall-clock budget | 120 min | `FORGE_BUDGET_MINUTES` |
| Max experiments per run | 10 | `FORGE_MAX_EXPERIMENTS` |
| MLX runtime | `mlx` | `FORGE_RUNTIME` (`mlx` \| `python`) |
| Nightly trigger | 02:00 UTC | `FORGE_NIGHTLY_HOUR_UTC` |

---

## Safety rules

1. **Paper only.** Forge never touches live execution, wallet keys, or Otaku's funded account.
2. **Branch isolation.** Every experiment runs on a fresh `forge/experiment-*` branch. Main is untouched until a PR is merged.
3. **Idempotent replay.** The paper bot replay is deterministic given the same feature-store snapshot. Results are reproducible.
4. **Human merge.** Forge creates PRs; a human (or Satoshi) merges. Auto-merge is off by default (`FORGE_AUTO_MERGE=false`).
5. **Cost cap.** If MLX inference cost exceeds `FORGE_BUDGET_MINUTES`, Forge stops and reports partial results.
6. **Otaku gating.** Phase 3 mutations touching Otaku require `FORGE_OTAKU_MUTATION_REQUIRES_APPROVAL=true` (default) and a Telegram confirmation from the user.

---

## Reporting

After each nightly run, Forge pushes a Telegram summary using `prompts/forge-summary.md`.

Claude Cowork (three-machine stack) reads these summaries and can:
- Accept/reject the auto-PR
- Ask Forge to re-run with a different seed
- Update `SOUL.md` to redirect the thesis

---

## Key files

| File | Role |
|------|------|
| `policies/trading-policy.yaml` | Canonical policy thresholds |
| `prompts/vince-entry-gate.md` | LLM gate rules (mutable) |
| `prompts/solus-strike-ritual.md` | Strike ritual rules (mutable) |
| `prompts/forge-summary.md` | Nightly Telegram summary template |
| `knowledge/teammate/SOUL.md` | Investment thesis input |
| `src/plugins/plugin-vince/scripts/train_models.py` | Python/XGBoost training |
| `src/tools/forge/autoresearch-mlx/` | MLX autoresearch submodule |
| `src/plugins/plugin-forge/` | Forge plugin (actions, services, tasks) |
| `src/agents/forge.ts` | Forge agent character |
| `docs/FORGE.md` | Agent brief (can/cannot, PRD focus) |

---

## Versioning

This document tracks the **research charter** — what Forge is allowed to mutate and how it scores results. Changes to the charter require a PR. Forge reads this file as part of its knowledge base but does not self-modify it.
