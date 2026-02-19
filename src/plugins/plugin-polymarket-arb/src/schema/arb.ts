/**
 * Drizzle schema for Polymarket latency arb plugin.
 * Schema: plugin_polymarket_arb (arb_trades, arb_sessions).
 */

import { pgSchema, text, timestamp, real, integer } from "drizzle-orm/pg-core";

export const pluginPolymarketArbSchema = pgSchema("plugin_polymarket_arb");

/** One row per trade (paper or live) */
export const arbTrades = pluginPolymarketArbSchema.table("arb_trades", {
  id: text("id").primaryKey(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  condition_id: text("condition_id").notNull(),
  token_id: text("token_id").notNull(),
  side: text("side").notNull(),
  btc_spot_price: real("btc_spot_price").notNull(),
  contract_price: real("contract_price").notNull(),
  implied_prob: real("implied_prob").notNull(),
  edge_pct: real("edge_pct").notNull(),
  size_usd: real("size_usd").notNull(),
  fill_price: real("fill_price"),
  pnl_usd: real("pnl_usd"),
  status: text("status").notNull(),
  clob_order_id: text("clob_order_id"),
  exit_price: real("exit_price"),
  exit_reason: text("exit_reason"),
  latency_ms: integer("latency_ms"),
});

/** One row per calendar day (session aggregate) */
export const arbSessions = pluginPolymarketArbSchema.table("arb_sessions", {
  id: text("id").primaryKey(),
  date: text("date").notNull().unique(),
  trades_count: integer("trades_count").notNull().default(0),
  win_count: integer("win_count").notNull().default(0),
  total_pnl_usd: real("total_pnl_usd").notNull().default(0),
  avg_edge_pct: real("avg_edge_pct"),
  avg_latency_ms: real("avg_latency_ms"),
  bankroll_start: real("bankroll_start").notNull(),
  bankroll_end: real("bankroll_end").notNull(),
});

export const arbSchema = {
  arbTrades,
  arbSessions,
};
