import { describe, it, expect } from "vitest";
import type { IAgentRuntime } from "@elizaos/core";
import { buildPaperResponse } from "../routes/dashboardPaper";

function createRuntimeWithSwarm(): IAgentRuntime {
  const positionManager = {
    getOpenPositions: () => [],
    getPortfolio: () => ({
      balance: 100000,
      initialBalance: 100000,
      realizedPnl: 0,
      unrealizedPnl: 0,
      totalValue: 100000,
      returnPct: 0,
      tradeCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      lastUpdate: Date.now(),
    }),
  };

  const swarmService = {
    getSwarmStats: () => ({
      totalOutcomes: 10,
      averageConsensusRate: 0.7,
      activeAgents: 5,
      trackedSignals: 12,
      topPerformingAgents: [
        { agentId: "vince", accuracyRate: 0.65, outcomesProvided: 20 },
      ],
      regimes: [
        {
          regime: "TRENDING_BULL",
          totalTrades: 4,
          wins: 3,
          winRate: 0.75,
          topSource: "BinanceTopTraders",
          worstSource: "NoiseSource",
          lastActive: Date.now(),
        },
      ],
    }),
    getAgentPerformance: () => [
      {
        agentId: "vince",
        accuracyRate: 65.4,
        outcomesProvided: 20,
        specialtyScore: 1.1,
        specialization: "market_data",
      },
    ],
  };

  const runtime = {
    getService: (id: string) => {
      if (id === "VINCE_POSITION_MANAGER_SERVICE") return positionManager;
      if (id === "VINCE_SIGNAL_AGGREGATOR_SERVICE")
        return { getStatus: () => null };
      if (id === "VINCE_WEIGHT_BANDIT_SERVICE")
        return { getSummary: () => null };
      if (id === "VINCE_GOAL_TRACKER_SERVICE")
        return { getKPIProgress: () => null, getGoal: () => null };
      if (id === "VINCE_PAPER_TRADING_SERVICE")
        return {
          getRecentNoTradeEvaluations: () => [],
          getRecentMLInfluences: () => [],
          getRecentClosedTrades: () => [],
        };
      if (id === "VINCE_ML_INFERENCE_SERVICE")
        return {
          getMLStatus: () => ({
            modelsLoaded: [],
            signalQualityThreshold: 0,
            suggestedMinStrength: null,
            suggestedMinConfidence: null,
            tpLevelIndices: [],
            tpLevelSkipped: null,
          }),
        };
      if (id === "swarm-coordination") return swarmService;
      if (id === "VINCE_TRADE_JOURNAL_SERVICE")
        return {
          getRecentTrades: () => [],
        };
      return null;
    },
  } as unknown as IAgentRuntime;

  return runtime;
}

describe("buildPaperResponse swarm integration", () => {
  it("returns null swarmSummary when swarm service is missing", async () => {
    const runtime = {
      getService: (id: string) =>
        id === "VINCE_POSITION_MANAGER_SERVICE"
          ? {
              getOpenPositions: () => [],
              getPortfolio: () => ({
                balance: 0,
                initialBalance: 0,
                realizedPnl: 0,
                unrealizedPnl: 0,
                totalValue: 0,
                returnPct: 0,
                tradeCount: 0,
                winCount: 0,
                lossCount: 0,
                winRate: 0,
                maxDrawdown: 0,
                maxDrawdownPct: 0,
                lastUpdate: Date.now(),
              }),
            }
          : null,
    } as unknown as IAgentRuntime;

    const resp = await buildPaperResponse(runtime);
    expect(resp.swarmSummary).toBeNull();
  });

  it("maps swarm stats and agent performance when available", async () => {
    const runtime = createRuntimeWithSwarm();
    const resp = await buildPaperResponse(runtime);

    expect(resp.swarmSummary).not.toBeNull();
    const summary = resp.swarmSummary!;

    expect(summary.totalOutcomes).toBe(10);
    expect(summary.activeAgents).toBe(5);
    expect(summary.trackedSignals).toBe(12);
    expect(summary.topAgents[0].agentId).toBe("vince");

    expect(summary.agentPerformance).toHaveLength(1);
    expect(summary.agentPerformance[0]).toMatchObject({
      agentId: "vince",
      outcomesProvided: 20,
      specialization: "market_data",
    });

    expect(summary.regimes[0].regime).toBe("TRENDING_BULL");
    expect(summary.regimes[0].totalTrades).toBe(4);
    expect(summary.regimes[0].topSource).toBe("BinanceTopTraders");
  });
});
