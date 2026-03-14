# Paper trading guardrails

Post-mortem corrective actions and policy. **No automatic trading changes** — these are process and cap guardrails.

## Leverage caps by asset class

Applied as the minimum of per-asset cap and this class cap. Override via env: `VINCE_PAPER_MAX_LEVERAGE_EQUITY`, `VINCE_PAPER_MAX_LEVERAGE_CRYPTO`, `VINCE_PAPER_MAX_LEVERAGE_COMMODITY`.

| Asset class | Max leverage | Source |
|-------------|--------------|--------|
| Equity      | 10x          | Post-mortem: sizing_too_aggressive (equity) |
| Crypto      | 4x           | Post-mortem: sizing_too_aggressive (crypto) |
| Commodity   | 4x           | Post-mortem: sizing_too_aggressive (commodity) |
| Other       | 5x           | Default |

Defined in `plugin-vince` → `paperTradingDefaults.ts` → `ASSET_CLASS_MAX_LEVERAGE`. Policy loop overlays can tighten further via ingested post-mortems.

## Before next entry (regime_conflict, sizing_too_aggressive, agent_lane_mismatch)

From post-mortem corrective actions:

- **Require PTQG completion** — Pre-trade quality gate (required fields) must be satisfied before opening a new position.
- **Explicit max-loss check** — Confirm max loss and stop placement before submitting.

Weekly guardrail review for repeated root-cause tags by asset class is recommended (policy items in `tasks/todo.md`).

## Weekly guardrail review (runbook)

Once per week (e.g. Monday or after a batch of post-mortems):

1. **Refresh** — Run `bun run postmortems:ingest` to regenerate corrective actions from `docs/standup/post-mortems/*.md`.
2. **Scan by asset class** — Open `tasks/todo.md` (Post-mortem corrective actions block) and `knowledge/sentinel-docs/POST_MORTEM_LESSONS.md`. Look for repeated root-cause tags: regime_conflict, sizing_too_aggressive, agent_lane_mismatch, stop_too_tight_for_vol, thesis_invalid, missing_pretrade_data.
3. **Decide** — For any asset class with a spike or pattern: (a) Is the current cap/process enough? (b) Do we need a one-off policy overlay (e.g. tighter leverage for crypto for one week)? (c) Any schema/evidence fix for post-mortem quality?
4. **Log** — If you change anything (overlay, doc, or code), note it in `tasks/lessons.md` or the standup so the next review has context.

No code required; this is a 5–10 minute checklist. Policy loop overlays can apply temporary caps without changing default constants.

## Process

1. Run `bun run postmortems:ingest` to refresh corrective actions from `docs/standup/post-mortems/*.md`.
2. Review the generated block in `tasks/todo.md` and `knowledge/sentinel-docs/POST_MORTEM_LESSONS.md`.
3. Apply leverage caps in code (as above) or via policy loop overlays; keep PTQG and max-loss as process requirements.
