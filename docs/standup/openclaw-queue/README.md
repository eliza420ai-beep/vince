# OpenClaw task queue

Structured task briefs (JSON) for coding agents (OpenClaw, Cursor, Claude Code). Consumed from this directory; see [OPENCLAW_TASK_CONTRACT.md](../OPENCLAW_TASK_CONTRACT.md) for format and workflow.

## Prioritization

Sort order: **priority** (P1 > P2), then **effort** (XS first), then by **dependency** (e.g. add feature-store columns before "review ML threshold"). Duplicates (same title, different dates) are listed once; prefer the most recent file when executing.

### Prioritized list (deduplicated by title)

| Priority | Effort | Title |
| -------- | ------ | ----- |
| P2 | XS | Add Bid-ask spread to feature store |
| P2 | XS | Add DVOL / volatility index to feature store |
| P2 | XS | Add ETF flow (BTC/ETH) to feature store |
| P2 | XS | Add Funding 8h delta to feature store |
| P2 | XS | Add Order book imbalance to feature store |
| P2 | XS | Add Price vs SMA20 to feature store |
| P2 | XS | Add Recent win/loss streak to feature store |
| P2 | XS | Add Signal source sentiment to feature store |
| P2 | XS | Add WTT alignment to feature store |
| P2 | XS | Add WTT edge to feature store |
| P2 | XS | Review ML signalQualityThreshold from improvement report |
| P2 | XS | Tighten TP level 0 rules |
| P2 | XS | Tighten TP level 1 rules |

## Feature store / WTT verification

- **Feature store:** `FeatureRecord` in `vinceFeatureStore.service.ts` includes optional `wtt` block (primary, alignment, edge, payoffShape, timingForgiveness, invalidateCondition, invalidateHit). Payload written to JSONL/PGLite/Supabase includes these when provided.
- **train_models.py:** `OPTIONAL_FEATURE_COLUMNS` and `load_features()` flatten `wtt_*`; improvement report includes `wtt_performance` slice when ≥5 WTT trades. Column names match INTEGRATION-WITH-PAPER-BOT.md.
- **Queue tasks** such as "Add WTT edge" / "Add WTT alignment" often mean **populate** the existing columns (e.g. 0% non-null → ensure paper bot or WTT flow sets the field), not add new schema.

## Source

Tasks are written here by Sentinel (SENTINEL_SHIP with `SENTINEL_SHIP_WRITE_OPENCLAW_TASK=true`, or SENTINEL_WEEKLY with `SENTINEL_WEEKLY_WRITE_OPENCLAW_TASK=true`) or by scripts. Re-run prioritization after adding or archiving tasks.
