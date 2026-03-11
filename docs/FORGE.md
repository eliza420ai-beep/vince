# Forge Agent Brief

**Role:** MLX AutoResearch layer for VINCE v2
**Character:** `src/agents/forge.ts`
**Plugin:** `src/plugins/plugin-forge/`
**Research charter:** `docs/FORGE_PROGRAM.md`

---

## What Forge does

Forge runs overnight experiments on Apple Silicon (MLX) to self-optimize VINCE's paper trading system. It mutates policy thresholds, prompts, and ML weights — then commits only the mutations that measurably improve the composite metric.

**Composite metric:** `causal_uplift × Sharpe × brier_calibration`
- `causal_uplift`: win-rate delta vs rule-based baseline
- `Sharpe`: risk-adjusted return on paper-bot replay
- `brier_calibration`: Solus strike prediction accuracy (1 - Brier score)

An experiment is a **winner** if ΔComposite ≥ +0.5% AND the safety gate passes.

---

## What Forge can do

- Read `policies/trading-policy.yaml` and nudge numeric thresholds (Phase 1)
- Read `prompts/vince-entry-gate.md` and `prompts/solus-strike-ritual.md` and mutate rules
- Run paper-bot replay against the last N days of feature-store data
- Create git branches (`forge/experiment-YYYYMMDD-NNN`), commit winners, revert losers
- Push nightly Telegram summaries to `#forge`/`#ops` channels
- Report status on demand via `FORGE_REPORT` action
- Revert mutable files to HEAD via `FORGE_REVERT` action
- Read `SOUL.md` for investment thesis context (thesis_alignment multiplier)

## What Forge cannot do yet

- Real paper-bot replay (stub implementation — needs `VincePaperTradingService.replayFeatureStore()`)
- Phase 2 ML weight mutations (train_models.py hyperparams) — ready when ≥90 feature rows
- Phase 3 agent style mutations (VINCE/Solus system prompts)
- Otaku mutations (gated behind human approval, not yet implemented)
- Auto-merge winning PRs (`FORGE_AUTO_MERGE=false` by default)
- Connect to autoresearch-mlx submodule (submodule at `src/tools/forge/autoresearch-mlx/`, not yet initialized)

---

## Key files

| File | Purpose |
|------|---------|
| `src/agents/forge.ts` | Character definition |
| `src/plugins/plugin-forge/src/index.ts` | Plugin export |
| `src/plugins/plugin-forge/src/services/forgeExperiment.service.ts` | Mutation + eval harness |
| `src/plugins/plugin-forge/src/services/forgeGit.service.ts` | Branch management |
| `src/plugins/plugin-forge/src/services/forgeMlx.service.ts` | MLX subprocess wrapper |
| `src/plugins/plugin-forge/src/services/forgePython.service.ts` | Python/CPU fallback |
| `src/plugins/plugin-forge/src/tasks/forgeNightly.tasks.ts` | Nightly scheduled task |
| `src/plugins/plugin-forge/src/actions/forgeRun.action.ts` | On-demand run trigger |
| `src/plugins/plugin-forge/src/actions/forgeReport.action.ts` | Status report |
| `src/plugins/plugin-forge/src/actions/forgeRevert.action.ts` | Revert mutations |
| `policies/trading-policy.yaml` | Canonical policy thresholds (mutable) |
| `prompts/vince-entry-gate.md` | VINCE LLM gate rules (mutable) |
| `prompts/solus-strike-ritual.md` | Solus strike selection (mutable) |
| `prompts/forge-summary.md` | Nightly Telegram summary template |
| `docs/FORGE_PROGRAM.md` | Research charter |
| `src/tools/forge/autoresearch-mlx/` | MLX submodule (init to activate) |

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FORGE_ENABLED` | `true` | Master switch |
| `FORGE_RUNTIME` | `mlx` | `mlx` \| `python` |
| `FORGE_BUDGET_MINUTES` | `120` | Max runtime per nightly run |
| `FORGE_TARGET_METRIC` | `causal_uplift * sharpe * (1 - brier_score)` | Composite metric expression |
| `FORGE_MAX_EXPERIMENTS` | `10` | Max mutations per run |
| `FORGE_NIGHTLY_HOUR_UTC` | `2` | Nightly trigger hour (UTC) |
| `FORGE_TELEGRAM_PUSH` | `true` | Push summary to Telegram |
| `FORGE_AUTO_MERGE` | `false` | Auto-merge winning PRs |
| `FORGE_OTAKU_MUTATION_REQUIRES_APPROVAL` | `true` | Human confirm for Otaku mutations |

---

## For OpenClaw / PRD

Priority next PRDs:
1. **Forge Phase 1 Replay** — implement `VincePaperTradingService.replayFeatureStore()` so Forge uses real replay data instead of the stub.
2. **Forge Phase 2 ML** — wire `forgePython.service.ts` to mutate `train_models.py` hyperparams and re-evaluate holdout metrics.
3. **autoresearch-mlx integration** — init the submodule and replace the upstream metric with `causal_uplift × Sharpe × brier_calibration`.
4. **SOUL.md v2** — expand `SOUL.md` from communication style guide to investment thesis document (asset rotation, risk tolerance, time horizon) so Forge's thesis_alignment multiplier is meaningful.

---

## References

- `docs/FORGE_PROGRAM.md` — full research charter
- `docs/FEATURE-STORE.md` — how feature data is collected
- `src/plugins/plugin-vince/scripts/train_models.py` — existing ML training
- `knowledge/teammate/SOUL.md` — investment thesis input
