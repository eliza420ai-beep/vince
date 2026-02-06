/**
 * Drizzle schema for VINCE paper trades / feature store.
 * Used by ElizaOS runtime migrations to create the table in PGLite or Postgres.
 * Table: plugin_vince.paper_bot_features (same shape as Supabase vince_paper_bot_features).
 */

import { pgSchema, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/** Plugin namespace so table is plugin_vince.paper_bot_features */
export const pluginVinceSchema = pgSchema("plugin_vince");

/**
 * Paper bot feature records (one row per trading decision / closed trade).
 * Payload holds the full FeatureRecord for ML training and queries.
 */
export const paperBotFeatures = pluginVinceSchema.table("paper_bot_features", {
  id: text("id").primaryKey(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  payload: jsonb("payload").notNull(),
});

export type PaperBotFeatureRow = typeof paperBotFeatures.$inferSelect;
export type PaperBotFeatureInsert = typeof paperBotFeatures.$inferInsert;

/** Schema object for ElizaOS runtime migrations (plugin_vince.paper_bot_features). */
export const paperTradesSchema = { paperBotFeatures };
