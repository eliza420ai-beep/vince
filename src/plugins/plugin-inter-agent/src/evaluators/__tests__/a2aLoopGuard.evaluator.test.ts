/**
 * Tests for A2A Loop Guard Evaluator
 */

import { describe, it, expect, vi, beforeEach, afterEach, mock } from "bun:test";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";

// Import after mocking
const { a2aLoopGuardEvaluator } = await import("../a2aLoopGuard.evaluator");

describe("A2A Loop Guard Evaluator", () => {
  const mockAgentId = "agent-123" as UUID;
  const mockRoomId = "room-456" as UUID;
  const mockSenderId = "sender-789" as UUID;

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
    agentId: mockSenderId,
    entityId: mockSenderId,
    roomId: mockRoomId,
    content: {
      text: "Hello from another agent",
      name: "vince", // Known agent name
      metadata: {},
    },
    createdAt: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    // Reset env
    delete process.env.A2A_ENABLED;
    delete process.env.A2A_MAX_EXCHANGES;
    delete process.env.A2A_LOOKBACK_MESSAGES;
  });

  afterEach(() => {
    delete process.env.A2A_ENABLED;
    delete process.env.A2A_MAX_EXCHANGES;
    delete process.env.A2A_LOOKBACK_MESSAGES;
  });

  describe("validate", () => {
    it("returns true for messages from known agents", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory({
        content: { text: "Hello", name: "vince" },
      });

      const result = await a2aLoopGuardEvaluator.validate(runtime, memory);
      expect(result).toBe(true);
    });

    it("returns true for messages with isBot metadata", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory({
        content: {
          text: "Hello",
          name: "unknown-bot",
          metadata: { isBot: true },
        },
      });

      const result = await a2aLoopGuardEvaluator.validate(runtime, memory);
      expect(result).toBe(true);
    });

    it("returns false for messages from unknown non-bots", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory({
        content: { text: "Hello", name: "random-human" },
      });

      const result = await a2aLoopGuardEvaluator.validate(runtime, memory);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("allows response when A2A is disabled", async () => {
      process.env.A2A_ENABLED = "false";
      const runtime = createMockRuntime();
      const memory = createMockMemory();

      const result = await a2aLoopGuardEvaluator.handler(runtime, memory);

      expect(result.shouldRespond).toBe(true);
      expect(result.reason).toBe("A2A guard disabled");
    });

    it("blocks response to reply to own message (ping-pong)", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory({
        content: {
          text: "Reply to you",
          name: "vince",
          metadata: {
            replyTo: {
              authorId: mockAgentId,
              isBot: true,
            },
          },
        },
      });

      const result = await a2aLoopGuardEvaluator.handler(runtime, memory);

      expect(result.shouldRespond).toBe(false);
      expect(result.reason).toContain("reply to own");
    });

    it("blocks response after max exchanges reached", async () => {
      process.env.A2A_MAX_EXCHANGES = "2";

      // Simulate conversation: sender → agent → sender → agent (2 exchanges)
      const memories: Memory[] = [
        createMockMemory({ id: "m1" as UUID, entityId: mockSenderId }),
        createMockMemory({ id: "m2" as UUID, entityId: mockAgentId, agentId: mockAgentId }),
        createMockMemory({ id: "m3" as UUID, entityId: mockSenderId }),
        createMockMemory({ id: "m4" as UUID, entityId: mockAgentId, agentId: mockAgentId }),
        createMockMemory({ id: "m5" as UUID, entityId: mockSenderId }),
      ];

      const runtime = createMockRuntime(memories);
      const memory = memories[4];

      const result = await a2aLoopGuardEvaluator.handler(runtime, memory);

      expect(result.shouldRespond).toBe(false);
      expect(result.reason).toContain("Already responded 2 times");
    });

    it("allows response when under max exchanges", async () => {
      process.env.A2A_MAX_EXCHANGES = "3";

      // Simulate: sender → agent (1 exchange)
      const memories: Memory[] = [
        createMockMemory({ id: "m1" as UUID, entityId: mockSenderId }),
        createMockMemory({ id: "m2" as UUID, entityId: mockAgentId, agentId: mockAgentId }),
        createMockMemory({ id: "m3" as UUID, entityId: mockSenderId }),
      ];

      const runtime = createMockRuntime(memories);
      const memory = memories[2];

      const result = await a2aLoopGuardEvaluator.handler(runtime, memory);

      expect(result.shouldRespond).toBe(true);
      expect(result.reason).toBe("A2A exchange allowed");
    });

    it("handles getMemories errors gracefully", async () => {
      const runtime = {
        agentId: mockAgentId,
        character: { name: "TestAgent" },
        getMemories: mock(() => Promise.reject(new Error("DB error"))),
      } as unknown as IAgentRuntime;
      const memory = createMockMemory();

      const result = await a2aLoopGuardEvaluator.handler(runtime, memory);

      // Should allow on error (fail open)
      expect(result.shouldRespond).toBe(true);
    });
  });

  describe("known agent detection", () => {
    const knownAgents = ["vince", "eliza", "kelly", "solus", "otaku", "sentinel", "echo", "oracle"];

    for (const agentName of knownAgents) {
      it(`detects ${agentName} as known agent`, async () => {
        const runtime = createMockRuntime();
        const memory = createMockMemory({
          content: { text: "Hello", name: agentName },
        });

        const result = await a2aLoopGuardEvaluator.validate(runtime, memory);
        expect(result).toBe(true);
      });
    }

    it("detects partial name matches (case insensitive)", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory({
        content: { text: "Hello", name: "VINCE-bot" },
      });

      const result = await a2aLoopGuardEvaluator.validate(runtime, memory);
      expect(result).toBe(true);
    });
  });

  describe("env configuration", () => {
    it("respects A2A_MAX_EXCHANGES env var", async () => {
      process.env.A2A_MAX_EXCHANGES = "1";

      const memories: Memory[] = [
        createMockMemory({ id: "m1" as UUID, entityId: mockSenderId }),
        createMockMemory({ id: "m2" as UUID, entityId: mockAgentId, agentId: mockAgentId }),
        createMockMemory({ id: "m3" as UUID, entityId: mockSenderId }),
      ];

      const runtime = createMockRuntime(memories);
      const memory = memories[2];

      const result = await a2aLoopGuardEvaluator.handler(runtime, memory);

      expect(result.shouldRespond).toBe(false);
      expect(result.reason).toContain("max: 1");
    });

    it("uses default max exchanges (3) when not set", async () => {
      // No env var set, should use default of 3
      const memories: Memory[] = [
        createMockMemory({ id: "m1" as UUID, entityId: mockSenderId }),
        createMockMemory({ id: "m2" as UUID, entityId: mockAgentId, agentId: mockAgentId }),
        createMockMemory({ id: "m3" as UUID, entityId: mockSenderId }),
      ];

      const runtime = createMockRuntime(memories);
      const memory = memories[2];

      const result = await a2aLoopGuardEvaluator.handler(runtime, memory);

      // Only 1 exchange so far, default max is 3
      expect(result.shouldRespond).toBe(true);
    });
  });
});
