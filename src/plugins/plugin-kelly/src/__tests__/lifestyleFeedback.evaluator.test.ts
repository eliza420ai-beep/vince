/**
 * Lifestyle feedback evaluator tests.
 */

import { describe, it, expect } from "bun:test";
import { lifestyleFeedbackEvaluator } from "../evaluators/lifestyleFeedback.evaluator";
import { createMockRuntime, createMockMessage } from "./test-utils";

describe("LIFESTYLE_FEEDBACK Evaluator", () => {
  describe("validate", () => {
    it("returns false when character is not Kelly", async () => {
      const runtime = createMockRuntime({
        character: { name: "Vince", bio: "Test" },
        getMemories: async () => [],
      });
      const message = createMockMessage("loved it");
      const result = await lifestyleFeedbackEvaluator.validate(runtime, message);
      expect(result).toBe(false);
    });

    it("returns true when character is Kelly and recent messages contain 'loved it'", async () => {
      const roomId = "room-123" as any;
      const runtime = createMockRuntime({
        character: { name: "Kelly", bio: "Test" },
        getMemories: async (params: { roomId?: string }) => {
          if (params?.roomId === roomId) {
            return [
              {
                id: "m1",
                entityId: "user1",
                roomId,
                agentId: "agent1",
                content: { text: "We went to Le Cinq" },
                createdAt: Date.now(),
              },
              {
                id: "m2",
                entityId: "user1",
                roomId,
                agentId: "agent1",
                content: { text: "loved it, we'll go back" },
                createdAt: Date.now(),
              },
            ] as any;
          }
          return [];
        },
      });
      const message = createMockMessage("loved it", { roomId });
      const result = await lifestyleFeedbackEvaluator.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true when message contains feedback signal 'didn't work'", async () => {
      const roomId = "room-456" as any;
      const runtime = createMockRuntime({
        character: { name: "Kelly", bio: "Test" },
        getMemories: async (params: { roomId?: string }) => {
          if (params?.roomId === roomId) {
            return [
              {
                id: "m1",
                entityId: "user1",
                roomId,
                agentId: "agent1",
                content: { text: "That place didn't work for us" },
                createdAt: Date.now(),
              },
            ] as any;
          }
          return [];
        },
      });
      const message = createMockMessage("ok", { roomId });
      const result = await lifestyleFeedbackEvaluator.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns false when character is Kelly but no feedback signals in recent messages", async () => {
      const roomId = "room-789" as any;
      const runtime = createMockRuntime({
        character: { name: "Kelly", bio: "Test" },
        getMemories: async (params: { roomId?: string }) => {
          if (params?.roomId === roomId) {
            return [
              {
                id: "m1",
                entityId: "user1",
                roomId,
                agentId: "agent1",
                content: { text: "What's the weather like in Paris?" },
                createdAt: Date.now(),
              },
            ] as any;
          }
          return [];
        },
      });
      const message = createMockMessage("hello", { roomId });
      const result = await lifestyleFeedbackEvaluator.validate(runtime, message);
      expect(result).toBe(false);
    });
  });
});
