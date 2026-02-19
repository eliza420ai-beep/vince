/**
 * Drizzle schema for Polymarket trading desk.
 * Used by ElizaOS runtime migrations to create tables in PGLite or Postgres.
 * Schema: plugin_polymarket_desk (signals, sized_orders, trade_log, risk_config).
 */

import { pgSchema, text, timestamp, real, integer } from "drizzle-orm/pg-core";

export const pluginPolymarketDeskSchema = pgSchema("plugin_polymarket_desk");

/** Analyst → Risk: structured signal when edge above threshold */
export const signals = pluginPolymarketDeskSchema.table("signals", {
  id: text("id").primaryKey(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  source: text("source").notNull(),
  market_id: text("market_id").notNull(),
  side: text("side").notNull(),
  suggested_size_usd: real("suggested_size_usd"),
  confidence: real("confidence"),
  forecast_prob: real("forecast_prob"),
  market_price: real("market_price"),
  edge_bps: real("edge_bps"),
  status: text("status").notNull().default("pending"),
});

/** Risk → Executor: sized order after approval */
export const sizedOrders = pluginPolymarketDeskSchema.table("sized_orders", {
  id: text("id").primaryKey(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  signal_id: text("signal_id").notNull(),
  market_id: text("market_id").notNull(),
  side: text("side").notNull(),
  size_usd: real("size_usd").notNull(),
  max_price: real("max_price"),
  slippage_bps: integer("slippage_bps"),
  status: text("status").notNull().default("pending"),
  filled_at: timestamp("filled_at", { withTimezone: true }),
  fill_price: real("fill_price"),
});

/** Executor write; Performance read: one row per fill */
export const tradeLog = pluginPolymarketDeskSchema.table("trade_log", {
  id: text("id").primaryKey(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  sized_order_id: text("sized_order_id").notNull(),
  signal_id: text("signal_id").notNull(),
  market_id: text("market_id").notNull(),
  side: text("side").notNull(),
  size_usd: real("size_usd").notNull(),
  arrival_price: real("arrival_price"),
  fill_price: real("fill_price").notNull(),
  slippage_bps: real("slippage_bps"),
  clob_order_id: text("clob_order_id"),
  wallet: text("wallet"),
});

/** Risk limits and bankroll config (optional) */
export const riskConfig = pluginPolymarketDeskSchema.table("risk_config", {
  id: text("id").primaryKey(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  key: text("key").notNull().unique(),
  value_json: text("value_json").notNull(),
});

export const deskSchema = {
  signals,
  sizedOrders,
  tradeLog,
  riskConfig,
};
