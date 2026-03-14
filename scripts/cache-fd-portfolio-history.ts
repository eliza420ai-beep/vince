#!/usr/bin/env bun
/**
 * Prewarm Financial Datasets historical cache for Dexter sleeves.
 *
 * Reads tickers from:
 * - portfolio_tastytrade.json
 * - portfolio_watchlist.json
 *
 * Fetches OHLCV history once and writes per-ticker cache files under:
 * .elizadb/financialdatasets-cache/prices/
 *
 * Usage:
 *   bun run scripts/cache-fd-portfolio-history.ts
 *   bun run scripts/cache-fd-portfolio-history.ts --years=5
 *   bun run scripts/cache-fd-portfolio-history.ts --start=2020-01-01 --end=2026-12-31
 *   bun run scripts/cache-fd-portfolio-history.ts --force
 */

import * as path from "node:path";
import { prewarmFdPortfolioHistoryCache } from "../src/plugins/plugin-vince/src/utils/fdPortfolioCachePrewarm";

function parseArgs(): {
  years: number;
  startDate?: string;
  endDate?: string;
  force: boolean;
} {
  const args = process.argv.slice(2);
  let years = 5;
  let startDate: string | undefined;
  let endDate: string | undefined;
  let force = false;

  for (const arg of args) {
    if (arg.startsWith("--years=")) {
      const n = Number(arg.split("=")[1]);
      if (Number.isFinite(n) && n > 0) years = Math.floor(n);
    } else if (arg.startsWith("--start=")) {
      startDate = arg.split("=")[1];
    } else if (arg.startsWith("--end=")) {
      endDate = arg.split("=")[1];
    } else if (arg === "--force") {
      force = true;
    }
  }

  return { years, startDate, endDate, force };
}

async function main(): Promise<void> {
  const { years, startDate: startOverride, endDate: endOverride, force } = parseArgs();
  const result = await prewarmFdPortfolioHistoryCache({
    years,
    startDate: startOverride,
    endDate: endOverride,
    force,
  });
  if (result.tickerCount === 0) {
    console.log(
      "[fd-cache] No tickers found in portfolio_tastytrade.json / portfolio_watchlist.json",
    );
    return;
  }
  console.log(
    `[fd-cache] Prewarming ${result.tickerCount} tickers (${result.startDate} → ${result.endDate}), force=${force}`,
  );
  for (const row of result.files) {
    const mode = row.rowCount > 0 ? "cached" : "empty";
    console.log(`[fd-cache] ${mode} ${row.ticker} (${row.rowCount} rows)`);
  }
  console.log(
    `[fd-cache] done | hits=${result.hits} misses=${result.misses} | manifest=${path.relative(process.cwd(), result.manifestPath)}`,
  );
}

main().catch((err) => {
  console.error(`[fd-cache] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

