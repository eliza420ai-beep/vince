#!/usr/bin/env bun
/**
 * Backfill FD warehouse: prewarm price cache and build factor snapshots.
 *
 * Ensures:
 * - .elizadb/financialdatasets-cache/prices/ populated for sleeve tickers
 * - .elizadb/financialdatasets-cache/snapshots/ populated with per-ticker factor snapshots
 *
 * Requires FINANCIAL_DATASETS_API_KEY in env. For fundamentals/earnings/filings/insiders,
 * run the app and call VinceFinancialDatasetsService.refreshSleeve() or use the FD prewarm task.
 *
 * Usage:
 *   bun run scripts/backfill-fd-warehouse.ts
 *   bun run scripts/backfill-fd-warehouse.ts --years=3
 *   bun run scripts/backfill-fd-warehouse.ts --force
 */

import * as path from "node:path";
import { prewarmFdPortfolioHistoryCache } from "../src/plugins/plugin-vince/src/utils/fdPortfolioCachePrewarm";
import { buildAllFdSnapshots } from "../src/plugins/plugin-vince/src/utils/fdFactorBuilder";

const projectRoot = process.cwd();

function parseArgs(): { years: number; force: boolean } {
  const args = process.argv.slice(2);
  let years = 5;
  let force = false;
  for (const arg of args) {
    if (arg.startsWith("--years=")) {
      const n = Number(arg.split("=")[1]);
      if (Number.isFinite(n) && n > 0) years = Math.floor(n);
    } else if (arg === "--force") force = true;
  }
  return { years, force };
}

async function main(): Promise<void> {
  const { years, force } = parseArgs();
  const apiKey = process.env.FINANCIAL_DATASETS_API_KEY?.trim();
  if (!apiKey) {
    console.error("FINANCIAL_DATASETS_API_KEY is required.");
    process.exit(1);
  }

  console.log("Backfilling FD warehouse: prices + snapshots...");
  const prewarm = await prewarmFdPortfolioHistoryCache({
    projectRoot,
    apiKey,
    years,
    force,
  });
  console.log(
    `Prewarm: ${prewarm.tickerCount} tickers, ${prewarm.hits} hits, ${prewarm.misses} misses`,
  );

  const snapshots = buildAllFdSnapshots(projectRoot);
  console.log(`Snapshots: ${snapshots.length} built.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
