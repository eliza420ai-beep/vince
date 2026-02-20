/**
 * GET /edge/status
 * Returns edge engine status (strategies, contracts, BTC price).
 */

import type { IAgentRuntime } from "@elizaos/core";
import { EDGE_SERVICE_TYPES } from "../constants";

export function buildEdgeStatusHandler() {
  return async (
    _req: { params?: Record<string, string>; [k: string]: unknown },
    res: {
      status: (n: number) => { json: (o: object) => void };
      json: (o: object) => void;
    },
    runtime?: IAgentRuntime,
  ): Promise<void> => {
    const agentRuntime = runtime as IAgentRuntime | undefined;
    if (!agentRuntime) {
      res.status(500).json({
        error: "No runtime",
        running: false,
        hint: "Ensure the agent has plugin-polymarket-edge loaded",
      });
      return;
    }
    const engine = agentRuntime.getService(EDGE_SERVICE_TYPES.EDGE_ENGINE) as {
      getStatus?: () => Record<string, unknown>;
    } | null;
    if (!engine?.getStatus) {
      res.status(200).json({
        running: false,
        paused: false,
        contractsWatched: 0,
        btcLastPrice: null,
        strategies: {},
        hint: "Edge engine not available on this agent",
      });
      return;
    }
    try {
      const status = engine.getStatus();
      res.status(200).json({
        running: true,
        paused: status.paused ?? false,
        contractsWatched: status.contractsWatched ?? 0,
        btcLastPrice: status.btcLastPrice ?? null,
        strategies: status.strategies ?? {},
        whyOnlySomeStrategies: status.whyOnlySomeStrategies ?? null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({
        error: msg,
        running: false,
      });
    }
  };
}
