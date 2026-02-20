#!/usr/bin/env bun
/**
 * Clean up duplicate Polymarket paper positions.
 * Keeps the earliest pending sized_order per market_id, cancels the rest.
 * Also marks orphaned pending signals as 'skipped'.
 *
 * Usage: bun run scripts/polymarket-dedup-cleanup.ts [--execute]
 *   Without --execute: preview only (dry run).
 *   With --execute: actually cancel/skip duplicates.
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq > 0) {
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      )
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const execute = process.argv.includes("--execute");

async function main() {
  const dataDir =
    process.env.PGLITE_DATA_DIR ||
    path.resolve(__dirname, "..", ".eliza/.elizadb");

  let db: any;
  if (process.env.POSTGRES_URL) {
    const pg = await import("pg");
    db = new pg.default.Client({ connectionString: process.env.POSTGRES_URL });
    await db.connect();
    console.log("Connected to Postgres");
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    db = new PGlite(dataDir);
    console.log(`Connected to PGLite at ${dataDir}`);
  }

  // 1. Find duplicate sized_orders (all but earliest per market)
  const dupOrders = await db.query(`
    SELECT so.id, so.created_at, so.market_id, so.side, so.size_usd
    FROM plugin_polymarket_desk.sized_orders so
    WHERE so.status = 'pending'
      AND so.id NOT IN (
        SELECT DISTINCT ON (market_id) id
        FROM plugin_polymarket_desk.sized_orders
        WHERE status = 'pending'
        ORDER BY market_id, created_at ASC
      )
    ORDER BY so.market_id, so.created_at
  `);

  console.log(`\nDuplicate sized_orders to cancel: ${dupOrders.rows.length}`);
  for (const r of dupOrders.rows) {
    console.log(
      `  ${r.id.slice(0, 8)}… | ${r.market_id.slice(0, 20)}… | ${r.side} | $${r.size_usd} | ${r.created_at}`,
    );
  }

  // 2. Find orphaned pending signals
  const orphanSignals = await db.query(`
    SELECT s.id, s.created_at, s.market_id, s.side, s.status
    FROM plugin_polymarket_desk.signals s
    WHERE s.status IN ('pending', 'approved')
      AND s.market_id IN (
        SELECT market_id FROM plugin_polymarket_desk.sized_orders WHERE status = 'pending'
      )
      AND s.id NOT IN (
        SELECT signal_id FROM plugin_polymarket_desk.sized_orders WHERE status = 'pending'
      )
  `);

  console.log(
    `Orphaned pending/approved signals to skip: ${orphanSignals.rows.length}`,
  );
  for (const r of orphanSignals.rows) {
    console.log(
      `  ${r.id.slice(0, 8)}… | ${r.market_id.slice(0, 20)}… | ${r.side} | ${r.status}`,
    );
  }

  if (!execute) {
    console.log(
      "\nDry run. To apply: bun run scripts/polymarket-dedup-cleanup.ts --execute",
    );
    if (db.end) await db.end();
    else if (db.close) await db.close();
    return;
  }

  // 3. Cancel duplicate orders
  if (dupOrders.rows.length > 0) {
    const ids = dupOrders.rows.map((r: any) => r.id);
    const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(",");
    const res = await db.query(
      `UPDATE plugin_polymarket_desk.sized_orders SET status = 'cancelled' WHERE id IN (${placeholders})`,
      ids,
    );
    console.log(
      `\nCancelled ${res.rowCount ?? ids.length} duplicate sized_orders.`,
    );
  }

  // 4. Mark orphaned signals as skipped
  if (orphanSignals.rows.length > 0) {
    const ids = orphanSignals.rows.map((r: any) => r.id);
    const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(",");
    const res = await db.query(
      `UPDATE plugin_polymarket_desk.signals SET status = 'skipped' WHERE id IN (${placeholders})`,
      ids,
    );
    console.log(`Skipped ${res.rowCount ?? ids.length} orphaned signals.`);
  }

  // 5. Summary
  const remaining = await db.query(
    `SELECT COUNT(DISTINCT market_id) AS markets, COUNT(*) AS positions
     FROM plugin_polymarket_desk.sized_orders WHERE status = 'pending'`,
  );
  const r = remaining.rows[0];
  console.log(
    `\nAfter cleanup: ${r.positions} position(s) across ${r.markets} market(s).`,
  );

  if (db.end) await db.end();
  else if (db.close) await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
