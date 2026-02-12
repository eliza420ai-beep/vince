import { describe, it, expect } from "bun:test";
import { polymarketDiscoveryProvider } from "../providers/polymarketDiscovery.provider";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockPolymarketService,
} from "./test-utils";

describe("polymarketDiscoveryProvider", () => {
  it("returns empty text and values when not in context", async () => {
    const state = createMockState({
      recentMessagesData: [{ id: "1", content: { text: "weather today" }, createdAt: 0 } as any],
    });
    const message = createMockMessage("tell me a joke");
    const runtime = createMockRuntime({ polymarketService: createMockPolymarketService([]) });
    const result = await polymarketDiscoveryProvider.get(runtime, message, state);
    expect(result.text).toBe("");
    expect(result.values).toEqual({});
  });

  it("returns intent summary and preferred topics when in context and service exists", async () => {
    const state = createMockState({
      recentMessagesData: [{ id: "1", content: { text: "polymarket" }, createdAt: 0 } as any],
    });
    const message = createMockMessage("what polymarket markets do we track?");
    const runtime = createMockRuntime({
      polymarketService: createMockPolymarketService([]),
    });
    const result = await polymarketDiscoveryProvider.get(runtime, message, state);
    expect(result.text).toContain("Polymarket discovery available");
    expect(result.text).toContain("paper bot");
    expect(result.text).toContain("Hypersurface strike selection");
    expect(result.text).toContain("vibe check");
    expect(result.values?.polymarketIntentSummary).toBeDefined();
    expect((result.values?.polymarketIntentSummary as string)).toContain("paper bot");
    expect(result.values?.preferredTagSlugs).toBeDefined();
    expect(Array.isArray(result.values?.preferredTagSlugs)).toBe(true);
  });

  it("returns intent and topics when in context but no service", async () => {
    const state = createMockState({
      recentMessagesData: [{ id: "1", content: { text: "prediction market" }, createdAt: 0 } as any],
    });
    const message = createMockMessage("polymarket odds");
    const runtime = createMockRuntime({ polymarketService: null });
    const result = await polymarketDiscoveryProvider.get(runtime, message, state);
    expect(result.text).not.toBe("");
    expect(result.text).toContain("Preferred topics");
    expect(result.values?.preferredTagSlugs).toBeDefined();
    expect(result.values?.polymarketIntentSummary).toBeDefined();
  });
});
