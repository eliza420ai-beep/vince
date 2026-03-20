# regime_bundle_v1 ingest contract (Phase C)

## Goal
Let Dexter operators/ingest code consume a `regime_bundle_v1.json` emitted by VINCE and turn it into weekly/thesis review inputs.

## Producer: VINCE
VINCE writes the payload as JSON into Dexter artifact storage.

### Input file
- Default path under `DEXTER_ARTIFACT_ROOT`:
  - `.dexter/regime_bundle_v1.json`
- Override:
  - set `REGIME_BUNDLE_OUT_PATH` in VINCE
  - if `REGIME_BUNDLE_OUT_PATH` is relative, resolve it under `DEXTER_ARTIFACT_ROOT`

### Schema
- `docs/regime_bundle_v1.schema.json`

## Consumer: Dexter ingest (recommended minimum)
1. Load `regime_bundle_v1.json`.
2. Validate against `docs/regime_bundle_v1.schema.json` (must accept `null` only for numeric fields `strength`/`confidence`).
3. Validate `universe_hash` matches the bundle’s `universe` tickers:
   - SHA-256 hex of a stable JSON structure:
     - `{ hyperliquid: sort(...), tastytrade: sort(...), watchlist: sort(...), coreCrypto: sort(...) }`
4. Build weekly review inputs:
   - `summary.overall_direction` as the high-level bucket
   - `summary.alerts[]` as the shortlist of “attention required” assets
   - `assets.{SYMBOL}` for per-asset flags:
     - `funding_stress`
     - `oi_change_bucket` (e.g. `high_crowding`, `flush`, `unspecified`, `none`)
     - `regime_label`
   - `sleeves.{SLEEVE}` for per-sleeve aggregates:
     - `aggregate_direction`
     - `funding_stress`
     - `regime_label`

## Local verification without Dexter
This repo includes a local ingest/validator shim (so you can verify the payload shape end-to-end without adding a Dexter consumer yet):
- `src/plugins/plugin-vince/src/utils/regimeBundleV1IngestShim.ts`
- CLI wrapper:
  - `bun run verify:regime-bundle -- /path/to/regime_bundle_v1.json`

## Versioning / drift
The bundle includes `version: "regime_bundle_v1"`. If the schema changes in a future version, bump `version` and either:
- keep backward-compatible parsing for older bundles, or
- add an explicit `regime_bundle_v2` ingest route.

