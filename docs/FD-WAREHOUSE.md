# Financial Datasets Warehouse

FD-backed pipeline for tastytrade/watchlist sleeves: prices, fundamentals, earnings, filings, insiders, and factor snapshots for backtests, projections, and discovery ranking.

## Env vars

- **FINANCIAL_DATASETS_API_KEY** — Required for cache prewarm and warehouse refresh. Get a key at [financialdatasets.ai](https://financialdatasets.ai).
- **VINCE_FD_CACHE_PREWARM_ENABLED** — Set to `false` or `0` to disable scheduled price prewarm (default: enabled).
- **VINCE_FD_CACHE_PREWARM_INTERVAL_HOURS** — How often to run prewarm (default: 6).
- **VINCE_FD_CACHE_MAX_AGE_HOURS** — Treat cache stale after this many hours (default: 24).
- **VINCE_FD_DISCOVERY_WEEKLY_ENABLED** — Set to `false` or `0` to disable weekly discovery report task (default: enabled).

## Refresh cadence

- **Prices**: prewarm task (or manual `bun run scripts/cache-fd-portfolio-history.ts`) — default every 6h when stale.
- **Fundamentals / earnings / filings / insiders**: run `VinceFinancialDatasetsService.refreshSleeve(projectRoot)` (e.g. from a task or script). Per-domain manifests under `.elizadb/financialdatasets-cache/<domain>/manifest.json`.
- **Snapshots**: built from warehouse data via `buildSnapshots(projectRoot)` or `buildAllFdSnapshots(projectRoot)`. Refresh after prices (and optionally other domains) are updated.

## Backfill

```bash
# Prices + factor snapshots (no API for fundamentals/earnings/filings/insiders in script)
bun run scripts/backfill-fd-warehouse.ts
bun run scripts/backfill-fd-warehouse.ts --years=3 --force
```

For a full warehouse refresh (all domains), use the app: get `VINCE_FINANCIAL_DATASETS_SERVICE` and call `refreshSleeve(projectRoot)`.

## Promotion workflow

- Discovery ranker outputs **PromoteNow**, **ResearchNext**, **Avoid**.
- Optional file: `portfolio_watchlist_candidates.json` (written by weekly task or `VinceTickerDiscoveryService.writeCandidatesFile()`).
- **Do not** auto-edit `portfolio_tastytrade.json` or `portfolio_watchlist.json`. Human promotion only: move tickers from candidates into the portfolio files as desired.

## Verification

- Deterministic sleeve refresh: re-running prewarm with same inputs reproduces the same manifest.
- Per-ticker factor snapshots are stable when built from the same raw cached payloads.
- Backtests and replay use stored data only (no live API in replay path).
- Forward projections are logged via `registerFdProjections()` and scored later by the prediction tracker.
- Discovery output includes a reason per ticker (momentum, insider skew, liquidity, etc.).
