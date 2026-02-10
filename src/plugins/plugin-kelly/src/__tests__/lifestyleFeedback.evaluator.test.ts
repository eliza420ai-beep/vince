/**
 * Lifestyle feedback evaluator tests (validate and handler).
 */

import { describe, it, expect } from "bun:test";
import { lifestyleFeedbackEvaluator } from "../evaluators/lifestyleFeedback.evaluator";
import { createMockRuntime, createMockMessage } from "./test-utils";
import type { UUID } from "@elizaos/core"; // used in handler test roomId/agentId

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

    it("returns true when recent messages contain 'too noisy'", async () => {
      const roomId = "room-noise" as UUID;
      const runtime = createMockRuntime({
        character: { name: "Kelly", bio: "Test" },
        getMemories: async (params: { roomId?: string }) => {
          if (params?.roomId === roomId) {
            return [
              { id: "m1", entityId: "u1", roomId, agentId: "a1", content: { text: "That place was too noisy" }, createdAt: Date.now() },
            ] as any;
          }
          return [];
        },
      });
      const message = createMockMessage("ok", { roomId });
      const result = await lifestyleFeedbackEvaluator.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true when recent messages contain 'perfect for us'", async () => {
      const roomId = "room-perfect" as UUID;
      const runtime = createMockRuntime({
        character: { name: "Kelly", bio: "Test" },
        getMemories: async (params: { roomId?: string }) => {
          if (params?.roomId === roomId) {
            return [
              { id: "m1", entityId: "u1", roomId, agentId: "a1", content: { text: "That was perfect for us" }, createdAt: Date.now() },
            ] as any;
          }
          return [];
        },
      });
      const message = createMockMessage("thanks", { roomId });
      const result = await lifestyleFeedbackEvaluator.validate(runtime, message);
      expect(result).toBe(true);
    });
  });

  describe("handler", () => {
    it("calls createMemory with fact-like payload when useModel returns structured feedback", async () => {
      const roomId = "room-fact" as UUID;
      const agentId = "agent-kelly" as UUID;
      const createMemoryCalls: Array<{ content: { text: string }; tableName: string }> = [];
      const runtime = createMockRuntime({
        character: { name: "Kelly", bio: "Test" },
        getMemories: async (params: { roomId?: string }) => {
          if (params?.roomId === roomId) {
            return [
              { id: "m1", entityId: "user1", roomId, agentId, content: { text: "We went to Le Cinq" }, createdAt: Date.now() },
              { id: "m2", entityId: "user1", roomId, agentId, content: { text: "loved it, we'll go back" }, createdAt: Date.now() },
            ] as any;
          }
          return [];
        },
        createMemory: async (memory: any, tableName: string) => {
          createMemoryCalls.push({ content: memory.content, tableName });
          return "fact-uuid" as UUID;
        },
        useModel: async () =>
          '{"placeName": "Le Cinq", "category": "restaurant", "sentiment": "positive", "reason": "great experience", "preferredCuisine": null, "preferredVibe": null, "tags": ["restaurant", "liked"]}',
      }) as any;
      const message = createMockMessage("loved it", { roomId });
      (message as any).agentId = agentId;
      (message as any).roomId = roomId;

      await lifestyleFeedbackEvaluator.handler(runtime, message, undefined);

      expect(createMemoryCalls.length).toBeGreaterThanOrEqual(1);
      const call = createMemoryCalls.find((c) => c.tableName === "facts");
      expect(call).toBeDefined();
      expect(call?.content?.text).toMatch(/User loved|Le Cinq|positive|great experience/i);
    });

    it("does not call createMemory when useModel returns neutral with no place or reason", async () => {
      const roomId = "room-neutral" as UUID;
      const agentId = "agent-kelly" as UUID;
      let createMemoryCallCount = 0;
      const runtime = createMockRuntime({
        character: { name: "Kelly", bio: "Test" },
        getMemories: async (params: { roomId?: string }) => {
          if (params?.roomId === roomId) {
            return [
              { id: "m1", entityId: "user1", roomId, agentId, content: { text: "loved it" }, createdAt: Date.now() },
            ] as any;
          }
          return [];
        },
        createMemory: async () => {
          createMemoryCallCount++;
          return "fact-uuid" as UUID;
        },
        useModel: async () =>
          '{"sentiment": "neutral", "placeName": null, "category": null, "reason": null, "preferredCuisine": null, "preferredVibe": null, "tags": null}',
      }) as any;
      const message = createMockMessage("loved it", { roomId });
      (message as any).agentId = agentId;
      (message as any).roomId = roomId;

      await lifestyleFeedbackEvaluator.handler(runtime, message, undefined);

      expect(createMemoryCallCount).toBe(0);
    });
  });
});
