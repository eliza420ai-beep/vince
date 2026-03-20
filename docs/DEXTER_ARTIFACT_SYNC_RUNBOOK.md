# Dexter artifact sync runbook (VINCE)

**Purpose:** Keep VINCE’s monitoring universe, scorecard enrichment, and optional FD cache import aligned with [Dexter](https://github.com/eliza420ai-beep/dexter) without merging repos.

**Mechanism:** Set **`DEXTER_ARTIFACT_ROOT`** to an absolute path that contains Dexter outputs, **or** copy/symlink the same files into the VINCE process working directory.

**Related:** [DEXTER-PORTFOLIO-SYNC.md](DEXTER-PORTFOLIO-SYNC.md), [standup/prds/PRD_THREE_LAYER_STACK_PRODUCTION_AND_REPO_INTEGRATION.md](standup/prds/PRD_THREE_LAYER_STACK_PRODUCTION_AND_REPO_INTEGRATION.md), plugin loader `resolveDexterArtifactRoot()` in `src/plugins/plugin-vince/src/utils/dexterPortfolio.ts`.

---

## What VINCE reads from Dexter

| Artifact | Expected location under `DEXTER_ARTIFACT_ROOT` | Writer |
|----------|--------------------------------------------------|--------|
| HL sleeve | `portfolio_hyperliquid.json` | Dexter `/suggest`, rebalance flows |
| Tastytrade sleeve | `portfolio_tastytrade.json` | Same |
| Watchlist | `portfolio_watchlist.json` | Same |
| Scorecard | `.dexter/scorecard.json` (preferred) or `scorecard.json` | Dexter `bun run score` |
| FD cache (import) | `.dexter/cache/` (preferred), or `cache_dexter/`, or `cache/` | Dexter `bun run warmup` |

VINCE **does not** write portfolio JSONs; Dexter (or your CI) remains the source of truth.

---

## What VINCE writes (Phase C)

VINCE emits a JSON file for the `regime_bundle_v1` handoff to Dexter operators / ingest:

| Bundle | Expected location under `DEXTER_ARTIFACT_ROOT` | Writer |
|--------|---------------------------------------------------|--------|
| `regime_bundle_v1.json` | `.dexter/regime_bundle_v1.json` (default) or `REGIME_BUNDLE_OUT_PATH` (relative paths resolve under `DEXTER_ARTIFACT_ROOT`) | VINCE task `VINCE_REGIME_BUNDLE_V1` |

Schema: [`docs/regime_bundle_v1.schema.json`](regime_bundle_v1.schema.json)

---

## Local development

### Option A — Files in VINCE repo root

Keep the three `portfolio_*.json` files in the vince repo (or symlink them from a Dexter clone):

```bash
ln -sf /path/to/dexter/portfolio_hyperliquid.json ./portfolio_hyperliquid.json
# … tastytrade, watchlist
```

Leave **`DEXTER_ARTIFACT_ROOT` unset**. Resolution falls back to `process.cwd()` when any portfolio file exists there.

### Option B — Point env at a Dexter clone

```bash
export DEXTER_ARTIFACT_ROOT=/path/to/dexter
bun start
```

Startup logs one line from plugin-vince, for example:

`[plugin-vince] Dexter artifacts (DEXTER_ARTIFACT_ROOT) root=/path/to/dexter | portfolio_hyperliquid:ok … | scorecard:ok (.dexter/scorecard.json)`

---

## CI / Railway

1. **Build or deploy step** before `elizaos start`:
   - Copy or `rsync` from Dexter repo/artifact bucket into a directory, e.g. `/app/dexter-artifacts/`, including:
     - `portfolio_*.json`
     - `.dexter/scorecard.json` if you use TOP100/scorecard enrichment
     - `.dexter/cache/` only if you use `VINCE_DEXTER_CACHE_IMPORT`
2. Set **`DEXTER_ARTIFACT_ROOT=/app/dexter-artifacts`** (adjust to your layout).
3. Ensure the **start command’s cwd** is the vince app root (unchanged); artifact root is independent.

**PGLite note:** Artifact directory is plain files; it is **not** automatically persisted across Railway redeploys unless you bake copies into the image, pull from storage on boot, or mount a volume. Treat portfolio JSONs like config you refresh each deploy or on a schedule.

---

## Optional: FD cache import

When `VINCE_DEXTER_CACHE_IMPORT=true`, the weekly discovery task imports Dexter’s cache into `.elizadb/financialdatasets-cache/`. The **source** directory defaults to `getDexterCacheRoot(resolveDexterArtifactRoot())`, i.e. under `DEXTER_ARTIFACT_ROOT`: prefer `.dexter/cache`, then `cache_dexter`, then `cache`.

**Destination** remains the vince project root’s `.elizadb/...` (typically `process.cwd()` of the running app).

---

## Verification checklist

- [ ] Startup log shows `portfolio_*:ok` or confirms intentional `missing`.
- [ ] Ask VINCE for Dexter drift or check context provider: universe matches Dexter sleeves.
- [ ] If using scorecard: `scorecard:ok` in log or run TOP100 path that uses `loadDexterScorecard()`.
- [ ] If using cache import: `getDexterCacheDomainsPresent` or weekly task shows imported domains after warmup in Dexter.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| All `portfolio_*:missing` | `DEXTER_ARTIFACT_ROOT` wrong path, or files not copied into cwd |
| Scorecard missing | No `bun run score` in Dexter; wrong root (scorecard lives under `.dexter/` in Dexter) |
| Cache import no-op | No `.dexter/cache` (or legacy dirs) under artifact root; run Dexter `warmup` first |
