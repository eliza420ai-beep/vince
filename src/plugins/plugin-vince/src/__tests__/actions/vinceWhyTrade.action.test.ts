import { describe, it, expect, vi } from "vitest";
import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import {
  createMockMessage,
  createMockState,
  createMockCallback,
} from "../test-utils";
import { vinceWhyTradeAction } from "../../actions/vinceWhyTrade.action";

function makeRuntime(options: {
  swarmEnabled: boolean;
  latestConsensus?: {
    weightedDirection: "long" | "short" | "neutral";
    confidenceLevel: number;
    dissentScore?: number;
    participatingAgents: string[];
  } | null;
}) {
  const positionManager = {
    getOpenPositions: () => [],
  };

  const signalAggregator = {
    getAllSignals: async () => [],
    getStatus: () => ({
      dataSources: [],
    }),
  };

  const useModel = vi.fn().mockResolvedValue("Mock trade briefing");

  const runtime: IAgentRuntime = {
    // Only properties used in the action
    getService: (id: string) => {
      if (id === "VINCE_POSITION_MANAGER_SERVICE") return positionManager;
      if (id === "VINCE_SIGNAL_AGGREGATOR_SERVICE") return signalAggregator;
      if (id === "swarm-coordination") {
        return options.latestConsensus
          ? {
              getLatestConsensus: () => ({
                votes: [],
                consensusReached: true,
                decisionTimestamp: Date.now(),
                ...options.latestConsensus,
              }),
            }
          : {
              getLatestConsensus: () => null,
            };
      }
      return null;
    },
    getSetting: (key: string) =>
      key === "VINCE_SWARM_ENABLED" ? options.swarmEnabled : undefined,
    useModel: useModel as any,
  } as unknown as IAgentRuntime;

  return { runtime, useModel };
}

describe("VINCE_WHY_TRADE swarm snapshot", () => {
  it("omits swarm snapshot from prompt when swarm is disabled", async () => {
    const { runtime, useModel } = makeRuntime({
      swarmEnabled: false,
      latestConsensus: null,
    });

    const message = createMockMessage("why trade");
    const state = createMockState();
    const callback = createMockCallback();

    await vinceWhyTradeAction.handler(
      runtime,
      message as Memory,
      state as State,
      {},
      callback as HandlerCallback,
    );

    expect(useModel).toHaveBeenCalledTimes(1);
    const prompt = (useModel.mock.calls[0][1] as { prompt: string }).prompt;
    expect(prompt).not.toContain("=== SWARM SNAPSHOT ===");
  });

  it("includes swarm snapshot in prompt when swarm is enabled and consensus exists", async () => {
    const { runtime, useModel } = makeRuntime({
      swarmEnabled: true,
      latestConsensus: {
        weightedDirection: "long",
        confidenceLevel: 0.8,
        dissentScore: 0.1,
        participatingAgents: ["vince", "echo"],
      },
    });

    const message = createMockMessage("why trade");
    const state = createMockState();
    const callback = createMockCallback();

    await vinceWhyTradeAction.handler(
      runtime,
      message as Memory,
      state as State,
      {},
      callback as HandlerCallback,
    );

    expect(useModel).toHaveBeenCalledTimes(1);
    const prompt = (useModel.mock.calls[0][1] as { prompt: string }).prompt;

    expect(prompt).toContain("=== SWARM SNAPSHOT ===");
    expect(prompt).toContain("Direction: LONG | Swarm confidence:");
    expect(prompt).toContain("Participating agents: 2");
  });
});
