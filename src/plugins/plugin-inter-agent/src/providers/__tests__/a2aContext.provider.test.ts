/**
 * Tests for A2A Context Provider
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";

const { a2aContextProvider } = await import("../a2aContext.provider");

describe("A2A Context Provider", () => {
  const mockAgentId = "agent-123" as UUID;
  const mockRoomId = "room-456" as UUID;

  const createMockRuntime = (memories: Memory[] = []): IAgentRuntime =>
    ({
      agentId: mockAgentId,
      character: { name: "TestAgent" },
      getMemories: mock(() => Promise.resolve(memories)),
    }) as unknown as IAgentRuntime;

  const createMockMemory = (
    overrides: Partial<Memory> = {}
  ): Memory => ({
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

  beforeEach(() => {
    delete process.env.A2A_MAX_EXCHANGES;
    delete process.env.A2A_LOOKBACK_MESSAGES;
  });

  afterEach(() => {
    delete process.env.A2A_MAX_EXCHANGES;
    delete process.env.A2A_LOOKBACK_MESSAGES;
  });

  it("returns human priority context for non-agent non-bot messages", async () => {
    const runtime = createMockRuntime();
    const memory = createMockMemory({
      content: { text: "Hello", name: "random-human" },
    });

    const result = await a2aContextProvider.get(runtime, memory);
    // Non-agent, non-bot messages are treated as human users and get priority
    expect(result).toContain("HUMAN MESSAGE");
    expect(result).toContain("PRIORITY RESPONSE");
  });

  it("returns context for agent messages", async () => {
    const runtime = createMockRuntime();
    const memory = createMockMemory({
      content: { text: "Hello", name: "vince" },
    });

    const result = await a2aContextProvider.get(runtime, memory);
    expect(result).toContain("Agent-to-Agent");
    expect(result).toContain("vince");
  });

  it("hard stops when max exchanges reached", async () => {
    process.env.A2A_MAX_EXCHANGES = "2";

    // Simulate: vince → testagent → vince → testagent (2 responses from testagent)
    const memories: Memory[] = [
      createMockMemory({ content: { name: "vince", text: "hi" } }),
      createMockMemory({ content: { name: "testagent", text: "hello" }, agentId: mockAgentId }),
      createMockMemory({ content: { name: "vince", text: "how are you" } }),
      createMockMemory({ content: { name: "testagent", text: "good" }, agentId: mockAgentId }),
      createMockMemory({ content: { name: "vince", text: "nice" } }),
    ];

    const runtime = createMockRuntime(memories);
    const memory = createMockMemory({ content: { name: "vince", text: "great" } });

    const result = await a2aContextProvider.get(runtime, memory);
    expect(result).toContain("SYSTEM OVERRIDE");
    expect(result).toContain("IGNORE");
  });

  it("warns on last exchange", async () => {
    process.env.A2A_MAX_EXCHANGES = "2";

    // Simulate: vince → testagent (1 response from testagent, 1 more allowed)
    const memories: Memory[] = [
      createMockMemory({ content: { name: "vince", text: "hi" } }),
      createMockMemory({ content: { name: "testagent", text: "hello" }, agentId: mockAgentId }),
    ];

    const runtime = createMockRuntime(memories);
    const memory = createMockMemory({ content: { name: "vince", text: "how are you" } });

    const result = await a2aContextProvider.get(runtime, memory);
    expect(result).toContain("LAST reply");
    expect(result).toContain("catch you later");
  });

  it("allows response when under max exchanges", async () => {
    process.env.A2A_MAX_EXCHANGES = "5";

    const memories: Memory[] = [
      createMockMemory({ content: { name: "vince", text: "hi" } }),
      createMockMemory({ content: { name: "testagent", text: "hello" }, agentId: mockAgentId }),
    ];

    const runtime = createMockRuntime(memories);
    const memory = createMockMemory({ content: { name: "vince", text: "how are you" } });

    const result = await a2aContextProvider.get(runtime, memory);
    expect(result).toContain("may respond");
    expect(result).not.toContain("DO NOT RESPOND");
  });

  it("detects known agents", async () => {
    const runtime = createMockRuntime();
    
    for (const agent of ["vince", "eliza", "kelly", "solus", "otaku", "sentinel", "echo", "oracle"]) {
      const memory = createMockMemory({
        content: { text: "Hello", name: agent },
      });

      const result = await a2aContextProvider.get(runtime, memory);
      expect(result).toContain("Agent-to-Agent");
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
    expect(result).toContain("Agent-to-Agent");
  });
});
