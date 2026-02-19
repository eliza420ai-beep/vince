/**
 * Tests for A2A Context Provider
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";

const { a2aContextProvider } = await import("../a2aContext.provider");

describe("A2A Context Provider", () => {
  const mockAgentId = "agent-123" as UUID;
  const mockRoomId = "room-456" as UUID;

  const createMockRuntime = (
    memories: Memory[] = [],
    options?: { characterName?: string; roomName?: string },
  ): IAgentRuntime =>
    ({
      agentId: mockAgentId,
      character: { name: options?.characterName ?? "TestAgent" },
      getMemories: mock(() => Promise.resolve(memories)),
      getRoom: mock(() =>
        Promise.resolve(
          options?.roomName != null
            ? { name: options.roomName }
            : { name: "general" },
        ),
      ),
    }) as unknown as IAgentRuntime;

  const createMockMemory = (overrides: Partial<Memory> = {}): Memory => ({
    id: "mem-1" as UUID,
    agentId: "sender-789" as UUID,
    entityId: "sender-789" as UUID,
    roomId: mockRoomId,
    content: {
      text: "Hello from another agent",
      name: "vince",
    },
    createdAt: Date.now(),
    ...overrides,
  });

  const getText = (result: unknown): string =>
    typeof result === "string"
      ? result
      : ((result as { text?: string })?.text ?? "");

  beforeEach(() => {
    delete process.env.A2A_MAX_EXCHANGES;
    delete process.env.A2A_LOOKBACK_MESSAGES;
    delete process.env.A2A_STANDUP_SINGLE_RESPONDER;
    delete process.env.A2A_STANDUP_CHANNEL_NAMES;
    delete process.env.A2A_KNOWN_HUMANS;
  });

  afterEach(() => {
    delete process.env.A2A_MAX_EXCHANGES;
    delete process.env.A2A_LOOKBACK_MESSAGES;
    delete process.env.A2A_STANDUP_SINGLE_RESPONDER;
    delete process.env.A2A_STANDUP_CHANNEL_NAMES;
    delete process.env.A2A_KNOWN_HUMANS;
  });

  it("returns human priority context for non-agent non-bot messages", async () => {
    const runtime = createMockRuntime();
    // No agentId so provider treats as human; use known human name for HUMAN MESSAGE block
    const memory = createMockMemory({
      content: { text: "Hello", name: "livethelifetv" },
      agentId: undefined as unknown as UUID,
    });

    const result = await a2aContextProvider.get(runtime, memory);
    const text = getText(result);
    expect(text).toContain("HUMAN MESSAGE");
    expect(text).toContain("PRIORITY RESPONSE");
  });

  it("returns context for agent messages", async () => {
    const runtime = createMockRuntime();
    const memory = createMockMemory({
      content: { text: "Hello", name: "vince" },
    });

    const result = await a2aContextProvider.get(runtime, memory);
    const text = getText(result);
    expect(text).toContain("Agent-to-Agent");
    expect(text).toContain("vince");
  });

  it("hard stops when max exchanges reached", async () => {
    process.env.A2A_MAX_EXCHANGES = "2";

    // Simulate: vince → testagent → vince → testagent (2 responses from testagent)
    const memories: Memory[] = [
      createMockMemory({ content: { name: "vince", text: "hi" } }),
      createMockMemory({
        content: { name: "testagent", text: "hello" },
        agentId: mockAgentId,
      }),
      createMockMemory({ content: { name: "vince", text: "how are you" } }),
      createMockMemory({
        content: { name: "testagent", text: "good" },
        agentId: mockAgentId,
      }),
      createMockMemory({ content: { name: "vince", text: "nice" } }),
    ];

    const runtime = createMockRuntime(memories);
    const memory = createMockMemory({
      content: { name: "vince", text: "great" },
    });

    const result = await a2aContextProvider.get(runtime, memory);
    const text = getText(result);
    expect(text).toContain("SYSTEM OVERRIDE");
    expect(text).toContain("IGNORE");
  });

  it("warns on last exchange", async () => {
    process.env.A2A_MAX_EXCHANGES = "2";

    // Simulate: vince → testagent (1 response from testagent, 1 more allowed)
    const memories: Memory[] = [
      createMockMemory({ content: { name: "vince", text: "hi" } }),
      createMockMemory({
        content: { name: "testagent", text: "hello" },
        agentId: mockAgentId,
      }),
    ];

    const runtime = createMockRuntime(memories);
    const memory = createMockMemory({
      content: { name: "vince", text: "how are you" },
    });

    const result = await a2aContextProvider.get(runtime, memory);
    const text = getText(result);
    expect(text).toContain("LAST reply");
    expect(text).toContain("catch you later");
  });

  it("allows response when under max exchanges", async () => {
    process.env.A2A_MAX_EXCHANGES = "5";

    const memories: Memory[] = [
      createMockMemory({ content: { name: "vince", text: "hi" } }),
      createMockMemory({
        content: { name: "testagent", text: "hello" },
        agentId: mockAgentId,
      }),
    ];

    const runtime = createMockRuntime(memories);
    const memory = createMockMemory({
      content: { name: "vince", text: "how are you" },
    });

    const result = await a2aContextProvider.get(runtime, memory);
    const text = getText(result);
    expect(text).toContain("may respond");
    expect(text).not.toContain("DO NOT RESPOND");
  });

  it("detects known agents", async () => {
    const runtime = createMockRuntime();

    for (const agent of [
      "vince",
      "eliza",
      "kelly",
      "solus",
      "otaku",
      "sentinel",
      "echo",
      "oracle",
    ]) {
      const memory = createMockMemory({
        content: { text: "Hello", name: agent },
      });

      const result = await a2aContextProvider.get(runtime, memory);
      const text = getText(result);
      expect(text).toContain("Agent-to-Agent");
    }
  });

  it("detects bots via metadata", async () => {
    const runtime = createMockRuntime();
    const memory = createMockMemory({
      content: {
        text: "Hello",
        name: "unknown-bot",
        metadata: { isBot: true },
      },
    });

    const result = await a2aContextProvider.get(runtime, memory);
    const text = getText(result);
    // Bots are treated as agents; unknown-bot hits the empty return (no exchange limit applied)
    expect(text).toBe("");
  });

  describe("standup single-responder", () => {
    it("human in standup room: only facilitator (Kelly) gets PRIORITY RESPONSE", async () => {
      const runtime = createMockRuntime([], {
        characterName: "Kelly",
        roomName: "daily-standup",
      });
      const memory = createMockMemory({
        content: { text: "What's the TLDR?", name: "livethelifetv" },
        agentId: undefined as unknown as UUID,
      });

      const result = await a2aContextProvider.get(runtime, memory);
      const text = getText(result);
      expect(text).toContain("HUMAN MESSAGE");
      expect(text).toContain("PRIORITY RESPONSE");
      expect(text).not.toContain("IGNORE");
    });

    it("human in standup room: non-facilitator gets IGNORE", async () => {
      const runtime = createMockRuntime([], {
        characterName: "VINCE",
        roomName: "daily-standup",
      });
      const memory = createMockMemory({
        content: { text: "What's the TLDR?", name: "livethelifetv" },
        agentId: undefined as unknown as UUID,
      });

      const result = await a2aContextProvider.get(runtime, memory);
      const text = getText(result);
      expect(text).toContain("IGNORE");
      expect(text).toContain("Do not reply");
      expect(text).toContain("Kelly");
      expect(text).not.toContain("PRIORITY RESPONSE");
    });

    it("human in non-standup room: all agents get PRIORITY RESPONSE", async () => {
      const runtime = createMockRuntime([], {
        characterName: "VINCE",
        roomName: "general",
      });
      const memory = createMockMemory({
        content: { text: "Hey", name: "livethelifetv" },
        agentId: undefined as unknown as UUID,
      });

      const result = await a2aContextProvider.get(runtime, memory);
      const text = getText(result);
      expect(text).toContain("HUMAN MESSAGE");
      expect(text).toContain("PRIORITY RESPONSE");
      expect(text).not.toContain("IGNORE");
    });
  });
});
