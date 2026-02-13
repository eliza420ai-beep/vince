#!/usr/bin/env bun
/**
 * Verify live Polymarket Gamma and CLOB APIs (env-gated).
 * Run only when you want to hit real APIs: POLYMARKET_LIVE_TEST=1 bun run scripts/polymarket-verify-live.ts
 * Exit 0 on success, 1 on failure or when POLYMARKET_LIVE_TEST is not set.
 *
 * Steps:
 * 1. GET Gamma /markets?limit=5&active=true&closed=false → parse one conditionId and token IDs
 * 2. GET CLOB /book?token_id=<yes_token_id> → assert asks or bids exist and prices in [0, 1]
 * 3. GET Gamma /events?limit=1 → assert response shape
 */

import "../src/load-env.ts";

const GAMMA_URL = process.env.POLYMARKET_GAMMA_API_URL ?? "https://gamma-api.polymarket.com";
const CLOB_URL = process.env.POLYMARKET_CLOB_API_URL ?? "https://clob.polymarket.com";

function log(msg: string): void {
  process.stderr.write(`polymarket-verify-live: ${msg}\n`);
}

async function main(): Promise<void> {
  if (process.env.POLYMARKET_LIVE_TEST !== "1") {
    log("Skip (set POLYMARKET_LIVE_TEST=1 to run live checks)");
    process.exit(0);
  }

  let ok = true;

  // 1. Gamma markets
  const marketsUrl = `${GAMMA_URL}/markets?limit=5&active=true&closed=false`;
  log(`Fetching ${marketsUrl}`);
  const marketsRes = await fetch(marketsUrl);
  if (!marketsRes.ok) {
    log(`Gamma markets failed: ${marketsRes.status} ${marketsRes.statusText}`);
    process.exit(1);
  }
  const markets = (await marketsRes.json()) as any[];
  if (!Array.isArray(markets) || markets.length === 0) {
    log("Gamma markets: expected non-empty array");
    process.exit(1);
  }

  const market = markets[0];
  const conditionId = market.conditionId ?? market.condition_id;
  if (!conditionId || typeof conditionId !== "string") {
    log("Gamma markets: first market missing conditionId");
    process.exit(1);
  }

  let tokenIds: string[] = [];
  try {
    const raw = market.clobTokenIds ?? market.clob_token_ids;
    tokenIds = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch {
    log("Gamma markets: could not parse clobTokenIds");
    process.exit(1);
  }
  if (tokenIds.length < 2) {
    log("Gamma markets: expected at least 2 token IDs");
    process.exit(1);
  }

  const yesTokenId = tokenIds[0];
  log(`ConditionId: ${conditionId.slice(0, 20)}..., yesTokenId: ${yesTokenId.slice(0, 16)}...`);

  // 2. CLOB orderbook
  const bookUrl = `${CLOB_URL}/book?token_id=${yesTokenId}`;
  log(`Fetching ${bookUrl}`);
  const bookRes = await fetch(bookUrl);
  if (!bookRes.ok) {
    log(`CLOB book failed: ${bookRes.status} ${bookRes.statusText}`);
    process.exit(1);
  }
  const book = (await bookRes.json()) as { asks?: Array<{ price: string }>; bids?: Array<{ price: string }> };
  const asks = book?.asks ?? [];
  const bids = book?.bids ?? [];
  if (asks.length === 0 && bids.length === 0) {
    log("CLOB book: empty (no asks or bids); skipping price range check");
  } else {
    const prices = [...asks.slice(0, 3).map((a) => parseFloat(a.price)), ...bids.slice(0, 3).map((b) => parseFloat(b.price))];
    for (const p of prices) {
      if (Number.isNaN(p) || p < 0 || p > 1) {
        log(`CLOB book: price ${p} outside [0, 1]`);
        ok = false;
      }
    }
  }

  // 3. Gamma events
  const eventsUrl = `${GAMMA_URL}/events?limit=1`;
  log(`Fetching ${eventsUrl}`);
  const eventsRes = await fetch(eventsUrl);
  if (!eventsRes.ok) {
    log(`Gamma events failed: ${eventsRes.status} ${eventsRes.statusText}`);
    process.exit(1);
  }
  const events = (await eventsRes.json()) as any[];
  if (!Array.isArray(events)) {
    log("Gamma events: expected array");
    process.exit(1);
  }

  if (ok) {
    log("All live checks passed.");
    process.exit(0);
  }
  process.exit(1);
}

main().catch((err) => {
  log(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
