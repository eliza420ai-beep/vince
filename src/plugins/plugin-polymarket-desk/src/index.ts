/**
 * Polymarket Trading Desk Plugin
 *
 * Shared state and actions for the 4-role desk: Analyst (edge), Risk, Executor, Performance.
 * - Schema: plugin_polymarket_desk.signals, sized_orders, trade_log, risk_config
 * - POLYMARKET_EDGE_CHECK: Analyst compares Synth vs Polymarket price and emits signals
 *
 * Oracle (Analyst) loads this plugin + plugin-polymarket-discovery.
 * Risk and Performance agents (and Executor via plugin-otaku) use the same DB tables.
 */

import type { Plugin } from "@elizaos/core";
import { deskSchema } from "./schema/desk";
import { polymarketEdgeCheckAction } from "./actions/polymarketEdgeCheck.action";
import { polymarketRiskApproveAction } from "./actions/polymarketRiskApprove.action";
import { polymarketDeskReportAction } from "./actions/polymarketDeskReport.action";
import { registerDeskSchedule } from "./tasks/deskSchedule.tasks";
import { buildDeskPositionsHandler } from "./routes/deskPositions";
import { buildDeskStatusHandler } from "./routes/deskStatus";
import { buildDeskTradesHandler } from "./routes/deskTrades";

export const pluginPolymarketDesk: Plugin = {
  name: "polymarket-desk",
  description:
    "Polymarket trading desk: signals, sized orders, trade log schema; edge-check (Analyst), risk-approve (Risk), report (Performance). No execution.",

  schema: deskSchema,

  routes: [
    {
      name: "desk-status",
      path: "/desk/status",
      type: "GET",
      handler: buildDeskStatusHandler(),
    },
    {
      name: "desk-trades",
      path: "/desk/trades",
      type: "GET",
      handler: buildDeskTradesHandler(),
    },
    {
      name: "desk-positions",
      path: "/desk/positions",
      type: "GET",
      handler: buildDeskPositionsHandler(),
    },
  ],

  actions: [
    polymarketEdgeCheckAction,
    polymarketRiskApproveAction,
    polymarketDeskReportAction,
  ],

  init: async (_config, runtime) => {
    registerDeskSchedule(runtime);
    try {
      const conn = await (
        runtime as { getConnection?: () => Promise<unknown> }
      ).getConnection?.();
      if (
        conn &&
        typeof (
          conn as { query: (s: string, v?: unknown[]) => Promise<unknown> }
        ).query === "function"
      ) {
        await (
          conn as {
            query: (text: string, values?: unknown[]) => Promise<unknown>;
          }
        ).query(
          `ALTER TABLE plugin_polymarket_desk.signals ADD COLUMN IF NOT EXISTS metadata_json TEXT`,
        );
      }
    } catch {
      // Tables may not exist yet or DB may not support IF NOT EXISTS
    }
  },
};

export default pluginPolymarketDesk;
export { deskSchema } from "./schema/desk";
export { polymarketEdgeCheckAction } from "./actions/polymarketEdgeCheck.action";
export { polymarketRiskApproveAction } from "./actions/polymarketRiskApprove.action";
export { polymarketDeskReportAction } from "./actions/polymarketDeskReport.action";
export { getSynthForecast } from "./services/synthClient";
export type { SynthForecast } from "./services/synthClient";
