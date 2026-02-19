import { describe, it, expect } from "bun:test";
import { shouldPolymarketPluginBeInContext } from "../../matcher";
import { createMockMessage, createMockState } from "./test-utils";

describe("shouldPolymarketPluginBeInContext", () => {
  it("returns true when state is undefined (fallback)", () => {
    expect(shouldPolymarketPluginBeInContext(undefined, undefined)).toBe(true);
    expect(
      shouldPolymarketPluginBeInContext(
        undefined,
        createMockMessage("anything"),
      ),
    ).toBe(true);
  });

  it("returns true when message contains polymarket keyword", () => {
    const state = createMockState({
      recentMessagesData: [],
    });
    const message = createMockMessage("What are the polymarket predictions?");
    expect(shouldPolymarketPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message contains prediction market keyword", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("Show me prediction markets for bitcoin");
    expect(shouldPolymarketPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when recentMessagesData contains polymarket", () => {
    const state = createMockState({
      recentMessagesData: [
        {
          id: "1",
          content: { text: "I want to check polymarket" },
          createdAt: 0,
        } as any,
      ],
    });
    expect(shouldPolymarketPluginBeInContext(state, undefined)).toBe(true);
  });

  it("returns true when message matches regex /polymarket/i", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("Polymarket odds on BTC?");
    expect(shouldPolymarketPluginBeInContext(state, message)).toBe(true);
  });

  it("returns false when state has no matching context", () => {
    const state = createMockState({
      recentMessagesData: [
        {
          id: "1",
          content: { text: "What is the weather today" },
          createdAt: 0,
        } as any,
      ],
    });
    const message = createMockMessage("Tell me a joke");
    expect(shouldPolymarketPluginBeInContext(state, message)).toBe(false);
  });
});
