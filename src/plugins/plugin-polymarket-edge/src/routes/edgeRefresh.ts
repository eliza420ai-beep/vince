/**
 * POST /edge/refresh
 * Runs discovery once and returns edge status (quick action so both strategies
 * can see fresh contracts without waiting for the 5-min discovery interval).
 */

import type { IAgentRuntime } from "@elizaos/core";
import { EDGE_SERVICE_TYPES } from "../constants";

type Engine = {
  getStatus?: () => Record<string, unknown>;
  refreshDiscovery?: () => Promise<void>;
};

type Res = {
  status: (n: number) => { json: (o: object) => void };
  json: (o: object) => void;
};

export function buildEdgeRefreshHandler() {
  return async (
    _req: unknown,
    res: unknown,
    runtime?: unknown,
  ): Promise<void> => {
    const resTyped = res as Res;
    const agentRuntime = runtime as IAgentRuntime | undefined;
    if (!agentRuntime) {
      resTyped.status(500).json({
        error: "No runtime",
        running: false,
        hint: "Ensure the agent has plugin-polymarket-edge loaded",
      });
      return;
    }
    const engine = agentRuntime.getService(
      EDGE_SERVICE_TYPES.EDGE_ENGINE,
    ) as Engine | null;
    if (!engine?.getStatus) {
      resTyped.status(200).json({
        running: false,
        paused: false,
        contractsWatched: 0,
        btcLastPrice: null,
        lastDiscoveryAt: null,
        strategies: {},
        refreshed: false,
        hint: "Edge engine not available on this agent",
      });
      return;
    }
    try {
      if (typeof engine.refreshDiscovery === "function") {
        await engine.refreshDiscovery();
      }
      const status = engine.getStatus();
      resTyped.status(200).json({
        running: true,
        paused: status.paused ?? false,
        contractsWatched: status.contractsWatched ?? 0,
        btcLastPrice: status.btcLastPrice ?? null,
        lastDiscoveryAt: status.lastDiscoveryAt ?? null,
        strategies: status.strategies ?? {},
        whyOnlySomeStrategies: status.whyOnlySomeStrategies ?? null,
        refreshed: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      resTyped.status(500).json({
        error: msg,
        running: true,
        refreshed: false,
      });
    }
  };
}
