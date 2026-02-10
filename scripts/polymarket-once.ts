#!/usr/bin/env bun
/**
 * Run one Polymarket discovery "tick" using plugin-polymarket-discovery.
 * Fetches active markets and prints a short summary. Intended for cron/supervisor:
 * exit 0 on success, exit 1 on failure; errors go to stderr.
 *
 * Usage:
 *   bun run scripts/polymarket-once.ts
 *   bun run polymarket:once   # if npm script is defined
 *
 * Optional env: POLYMARKET_GAMMA_API_URL, POLYMARKET_CLOB_API_URL (defaults in plugin).
 * Load .env from project root when run from repo root.
 */

import "../src/load-env.ts";

import { PolymarketService } from "../src/plugins/plugin-polymarket-discovery/src/services/polymarket.service";

const LIMIT = 10;

function logErr(msg: string): void {
  process.stderr.write(`polymarket-once: ${msg}\n`);
}

async function main(): Promise<void> {
  const runtime = {
    getSetting: (key: string): string | undefined => process.env[key],
  } as any;

  const service = new PolymarketService(runtime);
  await service.initialize(runtime);

  const markets = await service.getActiveMarkets(LIMIT);
  await service.stop();

  // stdout: one-line summary for scripting
  process.stdout.write(`polymarket-once: ${markets.length} active markets\n`);
  if (markets.length > 0 && markets[0].question) {
    process.stdout.write(`  first: ${markets[0].question.slice(0, 60)}${markets[0].question.length > 60 ? "…" : ""}\n`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    logErr(err instanceof Error ? err.message : String(err));
    process.exit(1);
  },
);
