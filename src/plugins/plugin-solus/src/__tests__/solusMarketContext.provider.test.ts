import { describe, it, expect, vi } from "vitest";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import { solusMarketContextProvider } from "../providers/solusMarketContext.provider";

function createRuntime(overrides: {
  getService?: (name: string) => unknown;
}): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: { name: "Solus" },
    getService: overrides.getService ?? (() => null),
  } as unknown as IAgentRuntime;
}

function createMessage(text: string): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

describe("SOLUS_MARKET_CONTEXT provider", () => {
  it("uses VINCE_MARKET_DATA_SERVICE when available", async () => {
    const mockService = {
      getEnrichedContext: vi.fn(async (asset: string) => ({
        asset,
        currentPrice: 100,
        priceChange24h: 2.5,
        fundingRate: 0,
        longShortRatio: 1,
        fearGreedValue: null,
        fearGreedLabel: null,
        marketRegime: "bullish",
        timestamp: Date.now(),
        dailyOpenPrice: 95,
        volumeRatio: 1.2,
      })),
      getATRPercent: vi.fn(async () => 4.2),
      getDVOL: vi.fn(async () => 60),
    };

    const runtime = createRuntime({
      getService: (name: string) =>
        name === "VINCE_MARKET_DATA_SERVICE" ? mockService : null,
    });

    const result = await solusMarketContextProvider.get(
      runtime,
      createMessage("market context"),
    );

    expect(mockService.getEnrichedContext).toHaveBeenCalledWith("BTC");
    expect(result.text).toContain("[Solus market context]");
    expect(result.values?.solusMarketContext).toBeDefined();
  });
});
