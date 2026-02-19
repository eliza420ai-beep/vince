import { describe, it, expect } from "bun:test";
import { getVincePolymarketMarketsAction } from "../actions/getVincePolymarketMarkets.action";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
  createMockPolymarketService,
  mockPolymarketMarket,
} from "./test-utils";
import { VINCE_POLYMARKET_PREFERRED_LABELS } from "../constants";

const contextState = createMockState({
  recentMessagesData: [
    { id: "1", content: { text: "polymarket markets" }, createdAt: 0 } as any,
  ],
});

describe("GET_VINCE_POLYMARKET_MARKETS validate", () => {
  it("returns false when not in context", async () => {
    const state = createMockState({
      recentMessagesData: [
        { id: "1", content: { text: "weather" }, createdAt: 0 } as any,
      ],
    });
    const runtime = createMockRuntime({
      polymarketService: createMockPolymarketService([]),
    });
    const message = createMockMessage("tell me a joke");
    const result = await getVincePolymarketMarketsAction.validate(
      runtime,
      message,
      state,
    );
    expect(result).toBe(false);
  });

  it("returns false when service is null", async () => {
    const runtime = createMockRuntime({ polymarketService: null });
    const message = createMockMessage("polymarket focus markets");
    const result = await getVincePolymarketMarketsAction.validate(
      runtime,
      message,
      contextState,
    );
    expect(result).toBe(false);
  });

  it("returns true when in context and service present", async () => {
    const runtime = createMockRuntime({
      polymarketService: createMockPolymarketService([]),
    });
    const message = createMockMessage("what polymarket markets matter for us?");
    const result = await getVincePolymarketMarketsAction.validate(
      runtime,
      message,
      contextState,
    );
    expect(result).toBe(true);
  });
});

describe("GET_VINCE_POLYMARKET_MARKETS handler", () => {
  it("calls callback with no markets message when service returns empty", async () => {
    const runtime = createMockRuntime({
      polymarketService: createMockPolymarketService([]),
    });
    const message = createMockMessage("polymarket");
    const callback = createMockCallback();
    const result = await getVincePolymarketMarketsAction.handler(
      runtime,
      message,
      contextState,
      undefined,
      callback,
    );
    expect(result.success).toBe(true);
    expect(callback.calls.length).toBeGreaterThanOrEqual(1);
    const lastCall = callback.calls[callback.calls.length - 1];
    expect(lastCall.text).toContain("No VINCE-priority markets found");
    expect((result as any).data?.markets?.length).toBe(0);
  });

  it("calls callback with market list when service returns one market", async () => {
    const runtime = createMockRuntime({
      polymarketService: createMockPolymarketService([mockPolymarketMarket]),
    });
    const message = createMockMessage("polymarket");
    const callback = createMockCallback();
    const result = await getVincePolymarketMarketsAction.handler(
      runtime,
      message,
      contextState,
      undefined,
      callback,
    );
    expect(result.success).toBe(true);
    expect((result as any).data?.markets?.length).toBe(1);
    expect((result as any).data.markets[0].question).toBe(
      mockPolymarketMarket.question,
    );
    expect((result as any).data.markets[0].condition_id).toBe(
      mockPolymarketMarket.conditionId,
    );
    const lastCall = callback.calls[callback.calls.length - 1];
    expect(lastCall.text).toContain(mockPolymarketMarket.question);
    expect(lastCall.text).toContain(mockPolymarketMarket.conditionId);
  });

  it("uses group crypto when actionParams.group is crypto", async () => {
    const cryptoSlugs = [
      ...new Set(
        VINCE_POLYMARKET_PREFERRED_LABELS.filter(
          (e) => e.group === "crypto",
        ).map((e) => e.slug),
      ),
    ];
    let capturedOptions: { tagSlugs?: string[] } = {};
    const mockService = {
      getMarketsByPreferredTags: async (options: any) => {
        capturedOptions = options ?? {};
        return [];
      },
      recordActivity: () => {},
    };
    const runtime = createMockRuntime({
      polymarketService: mockService,
      composeState: async () =>
        createMockState({ data: { actionParams: { group: "crypto" } } }),
    });
    const message = createMockMessage("polymarket");
    await getVincePolymarketMarketsAction.handler(
      runtime,
      message,
      contextState,
      undefined,
      createMockCallback(),
    );
    expect(capturedOptions.tagSlugs).toBeDefined();
    expect(capturedOptions.tagSlugs!.length).toBe(cryptoSlugs.length);
    for (const slug of cryptoSlugs) {
      expect(capturedOptions.tagSlugs).toContain(slug);
    }
  });

  it("uses defaults when actionParams missing", async () => {
    let capturedOptions: { totalLimit?: number } = {};
    const mockService = {
      getMarketsByPreferredTags: async (options: any) => {
        capturedOptions = options ?? {};
        return [];
      },
      recordActivity: () => {},
    };
    const runtime = createMockRuntime({
      polymarketService: mockService,
      composeState: async () => createMockState({ data: { actionParams: {} } }),
    });
    const message = createMockMessage("polymarket");
    await getVincePolymarketMarketsAction.handler(
      runtime,
      message,
      contextState,
      undefined,
      createMockCallback(),
    );
    expect(capturedOptions.totalLimit).toBe(20);
  });
});
