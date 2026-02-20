/**
 * Drizzle schema for Polymarket edge plugin.
 * Local edge_signals log; primary signal output goes to plugin_polymarket_desk.signals.
 */

import { pgSchema, text, timestamp, real } from "drizzle-orm/pg-core";

export const pluginPolymarketEdgeSchema = pgSchema("plugin_polymarket_edge");

/** Local log of signals emitted by the edge engine (audit trail) */
export const edgeSignals = pluginPolymarketEdgeSchema.table("edge_signals", {
  id: text("id").primaryKey(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  strategy: text("strategy").notNull(),
  source: text("source").notNull(),
  market_id: text("market_id").notNull(),
  side: text("side").notNull(),
  confidence: real("confidence"),
  edge_bps: real("edge_bps"),
  forecast_prob: real("forecast_prob"),
  market_price: real("market_price"),
  desk_signal_id: text("desk_signal_id"),
});

export const edgeSchema = {
  edgeSignals,
};
