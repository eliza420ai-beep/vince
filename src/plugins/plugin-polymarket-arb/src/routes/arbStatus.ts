/**
 * GET /arb/status
 * Returns latency arb bot status for the leaderboard Polymarket tab.
 * Use Oracle agent ID: /api/agents/:oracleAgentId/plugins/polymarket-arb/arb/status
 */

import type { IAgentRuntime } from "@elizaos/core";

const ARB_ENGINE_SERVICE = "POLYMARKET_ARB_ENGINE_SERVICE";

export function buildArbStatusHandler() {
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
        hint: "Ensure the Oracle agent is running and has plugin-polymarket-arb loaded",
      });
      return;
    }
    const engine = agentRuntime.getService(ARB_ENGINE_SERVICE) as {
      getStatus?: () => Promise<Record<string, unknown>>;
    } | null;
    if (!engine?.getStatus) {
      res.status(200).json({
        running: false,
        liveExecution: false,
        paused: false,
        tradesToday: 0,
        winCountToday: 0,
        todayPnlUsd: 0,
        bankrollUsd: 0,
        contractsWatched: 0,
        btcLastPrice: null,
        hint: "Arb engine not available on this agent",
      });
      return;
    }
    try {
      const status = await engine.getStatus();
      res.status(200).json({
        running: true,
        liveExecution: status.liveExecution ?? false,
        paused: status.paused ?? false,
        tradesToday: status.tradesToday ?? 0,
        winCountToday: status.winCountToday ?? 0,
        todayPnlUsd: status.todayPnlUsd ?? 0,
        bankrollUsd: status.bankrollUsd ?? 0,
        contractsWatched: status.contractsWatched ?? 0,
        btcLastPrice: status.btcLastPrice ?? null,
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
