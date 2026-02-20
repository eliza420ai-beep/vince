/**
 * Writes EdgeSignal to plugin_polymarket_desk.signals for Risk/Executor pipeline.
 * Also logs to plugin_polymarket_edge.edge_signals for audit.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { EdgeSignal } from "../strategies/types";

const DESK_SIGNALS_TABLE = "plugin_polymarket_desk.signals";
const EDGE_SIGNALS_TABLE = "plugin_polymarket_edge.edge_signals";

export async function emitSignal(
  runtime: IAgentRuntime,
  signal: EdgeSignal,
): Promise<string | null> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const conn = await (
    runtime as { getConnection?: () => Promise<unknown> }
  ).getConnection?.();
  if (
    !conn ||
    typeof (conn as { query: (s: string, v?: unknown[]) => Promise<unknown> })
      .query !== "function"
  ) {
    logger.debug(
      "[SignalEmitter] No DB connection; signal not persisted (id=" + id + ")",
    );
    return null;
  }

  const client = conn as {
    query: (text: string, values?: unknown[]) => Promise<unknown>;
  };

  const metadataJson =
    signal.metadata && Object.keys(signal.metadata).length > 0
      ? JSON.stringify(signal.metadata)
      : null;
  try {
    await client.query(
      `INSERT INTO plugin_polymarket_desk.signals (id, created_at, source, market_id, side, confidence, forecast_prob, market_price, edge_bps, status, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)`,
      [
        id,
        now,
        signal.source,
        signal.market_id,
        signal.side,
        signal.confidence,
        signal.forecast_prob,
        signal.market_price,
        signal.edge_bps,
        metadataJson,
      ],
    );
  } catch (e) {
    logger.warn(
      "[SignalEmitter] Failed to insert desk signal: " +
        (e instanceof Error ? e.message : String(e)),
    );
    return null;
  }

  try {
    await client.query(
      `INSERT INTO plugin_polymarket_edge.edge_signals (id, created_at, strategy, source, market_id, side, confidence, edge_bps, forecast_prob, market_price, desk_signal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        crypto.randomUUID(),
        now,
        signal.strategy,
        signal.source,
        signal.market_id,
        signal.side,
        signal.confidence,
        signal.edge_bps,
        signal.forecast_prob,
        signal.market_price,
        id,
      ],
    );
  } catch (e) {
    logger.debug(
      "[SignalEmitter] Edge_signals log failed (desk signal already written): " +
        (e instanceof Error ? e.message : String(e)),
    );
  }

  return id;
}
