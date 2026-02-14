/**
 * Matcher tests: shouldOpenclawPluginBeInContext
 */

import { describe, it, expect } from "bun:test";
import { shouldOpenclawPluginBeInContext } from "../../matcher";
import { createMockMessage, createMockState } from "./test-utils";

describe("shouldOpenclawPluginBeInContext", () => {
  it("returns true when state is undefined (fallback)", () => {
    expect(shouldOpenclawPluginBeInContext(undefined, undefined)).toBe(true);
    expect(shouldOpenclawPluginBeInContext(undefined, createMockMessage("anything"))).toBe(true);
  });

  it("returns false when state has no relevant context and message is unrelated", () => {
    const state = createMockState({
      recentMessagesData: [
        { id: "1", content: { text: "What is the weather today" }, createdAt: 0 } as any,
      ],
    });
    const message = createMockMessage("Tell me a joke");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(false);
  });

  it("returns true when message contains keyword openclaw", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("How do I set up openclaw?");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message contains keyword gateway status", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("gateway status");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message contains keyword ai 2027", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("What's AI 2027?");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message contains keyword agi", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("When is AGI coming?");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message contains keyword research agent", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("Explain research agents");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message contains keyword clawterm", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("Who is clawterm?");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message contains keyword hip3 ai", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("hip3 ai assets on Hyperliquid");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message contains keyword nvda", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("NVDA perps?");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when recentMessagesData contains openclaw", () => {
    const state = createMockState({
      recentMessagesData: [
        { id: "1", content: { text: "I want to set up openclaw" }, createdAt: 0 } as any,
      ],
    });
    expect(shouldOpenclawPluginBeInContext(state, undefined)).toBe(true);
  });

  it("returns true when message matches regex openclaw setup", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("openclaw setup");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message matches regex gateway status", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("gateway status");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message matches regex ai 2027", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("ai-2027 scenario");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when message matches regex agi timeline", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("agi timeline");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });

  it("returns true when state has empty recentMessagesData but message has keyword", () => {
    const state = createMockState({ recentMessagesData: [] });
    const message = createMockMessage("openclaw");
    expect(shouldOpenclawPluginBeInContext(state, message)).toBe(true);
  });
});
