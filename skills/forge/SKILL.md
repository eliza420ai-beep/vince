---
name: forge
description: >
  Forge agent playbook: MLX AutoResearch overnight experiments on paper-trading policy, prompts,
  and ML weights; composite metric causal_uplift × Sharpe × Brier; branch/commit winners only.
  Use when: (1) user says "Forge", "forge nightly", "autoresearch", "trading-policy.yaml",
  "vince-entry-gate", "solus-strike-ritual" prompt mutations,
  (2) user is tuning `policies/` or `prompts/` under Forge charter,
  (3) user asks for FORGE_REPORT / FORGE_REVERT semantics or FORGE_* env.
  NOT for: Otaku/onchain mutations without approval, manual live trading ops, production deploy without review.
---

# Forge — MLX AutoResearch

Silent **self-optimization** layer: mutates allowed config, replays/evaluates, **commits only winners** on experiment branches. See `docs/FORGE_PROGRAM.md` for the full charter.

## Composite metric (default framing)

`causal_uplift × Sharpe × brier_calibration` (Brier from Solus calibration story). Winner gate: ΔComposite ≥ +0.5% and safety checks — exact thresholds in `docs/FORGE.md`.

## What Forge touches (Phase 1+)

- `policies/trading-policy.yaml` — numeric thresholds.
- `prompts/vince-entry-gate.md`, `prompts/solus-strike-ritual.md` — LLM gate copy.
- Paper-bot replay against feature-store history (when replay API is fully wired — see gaps in `docs/FORGE.md`).
- Git: branches `forge/experiment-*`, revert via **FORGE_REVERT**.

## Gaps (honest)

Replay may be stubbed; MLX submodule may be uninitialized; Otaku mutations gated — always read **What Forge cannot do yet** in `docs/FORGE.md` before promising behavior.

## Key env

`FORGE_ENABLED`, `FORGE_RUNTIME`, `FORGE_BUDGET_MINUTES`, `FORGE_NIGHTLY_HOUR_UTC`, `FORGE_AUTO_MERGE`, `FORGE_TELEGRAM_PUSH` — table in `docs/FORGE.md`.

## Repo map

| Area | Path |
|------|------|
| Agent | `src/agents/forge.ts` |
| Plugin | `src/plugins/plugin-forge/` |
| Charter | `docs/FORGE_PROGRAM.md` |
| Thesis input | `knowledge/teammate/SOUL.md` |
| Feature store | `docs/FEATURE-STORE.md` |

## Related skills

- **vince** — paper bot and policies consumed by Forge.
- **solus** — Brier / calibration linkage in composite metric.

Full brief: `docs/FORGE.md`.
