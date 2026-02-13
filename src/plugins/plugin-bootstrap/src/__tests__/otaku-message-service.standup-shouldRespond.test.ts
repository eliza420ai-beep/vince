/**
 * Unit tests for OtakuMessageService.shouldRespond in standup channels.
 * Standup channel + human → only single responder (Kelly) gets true; others false.
 * Standup channel + agent message → only directly called agent gets true; others false.
 */
import { describe, it, expect, mock } from "bun:test";
import type { IAgentRuntime, Memory, Room } from "@elizaos/core";
import { OtakuMessageService } from "../services/otaku-message-service";

function createMockRuntime(overrides?: {
  characterName?: string;
  getSetting?: (key: string) => string | null;
}): IAgentRuntime {
  const { characterName = "Otaku", getSetting } = overrides ?? {};
  return {
    character: { name: characterName },
    getSetting: mock(
      (key: string) =>
        getSetting?.(key) ??
        (key === "A2A_STANDUP_CHANNEL_NAMES" ? null : null) ??
        null
    ),
    ...overrides,
  } as unknown as IAgentRuntime;
}

function createMessage(overrides?: {
  senderName?: string;
  text?: string;
  isBot?: boolean;
}): Memory {
  const { senderName = "user", text = "hello", isBot = false } = overrides ?? {};
  return {
    id: "msg-1" as any,
    entityId: "entity-1" as any,
    agentId: "agent-1" as any,
    roomId: "room-1" as any,
    content: {
      text,
      name: senderName,
      userName: senderName,
      metadata: isBot ? { isBot: true } : {},
    },
    createdAt: Date.now(),
    embedding: [],
  } as Memory;
}

function createRoom(name: string): Room {
  return {
    id: "room-1" as any,
    name,
    type: "GROUP" as any,
    worldId: "world-1" as any,
  } as Room;
}

describe("OtakuMessageService shouldRespond in standup channels", () => {
  const service = new OtakuMessageService();

  describe("standup channel + human message", () => {
    it("Kelly (single responder) gets shouldRespond true", () => {
      const runtime = createMockRuntime({ characterName: "Kelly" });
      const room = createRoom("daily-standup");
      const message = createMessage({ senderName: "yves", isBot: false });
      const decision = service.shouldRespond(runtime, message, room);
      expect(decision.shouldRespond).toBe(true);
      expect(decision.skipEvaluation).toBe(true);
      expect(decision.reason).toContain("single responder");
    });

    it("non-Kelly agent gets shouldRespond false when human speaks in standup", () => {
      const runtime = createMockRuntime({ characterName: "VINCE" });
      const room = createRoom("daily-standup");
      const message = createMessage({ senderName: "Human", isBot: false });
      const decision = service.shouldRespond(runtime, message, room);
      expect(decision.shouldRespond).toBe(false);
      expect(decision.skipEvaluation).toBe(true);
      expect(decision.reason).toContain("only facilitator");
    });

    it("Solus gets shouldRespond false when human in standup", () => {
      const runtime = createMockRuntime({ characterName: "Solus" });
      const room = createRoom("standup");
      const message = createMessage({ senderName: "ikigai", isBot: false });
      const decision = service.shouldRespond(runtime, message, room);
      expect(decision.shouldRespond).toBe(false);
      expect(decision.skipEvaluation).toBe(true);
    });
  });

  describe("standup channel + agent message", () => {
    it("agent not called by name gets shouldRespond false", () => {
      const runtime = createMockRuntime({ characterName: "Solus" });
      const room = createRoom("daily-standup");
      const message = createMessage({
        senderName: "Kelly",
        text: "VINCE just reported. Here is the summary.",
        isBot: true,
      });
      const decision = service.shouldRespond(runtime, message, room);
      expect(decision.shouldRespond).toBe(false);
      expect(decision.skipEvaluation).toBe(true);
      expect(decision.reason).toContain("not called");
    });

    it("agent directly called (@Solus) gets shouldRespond true", () => {
      const runtime = createMockRuntime({ characterName: "Solus" });
      const room = createRoom("daily-standup");
      const message = createMessage({
        senderName: "Kelly",
        text: "@solus, go.",
        isBot: true,
      });
      const decision = service.shouldRespond(runtime, message, room);
      expect(decision.shouldRespond).toBe(true);
      expect(decision.skipEvaluation).toBe(true);
      expect(decision.reason).toContain("called by name");
    });

    it("agent called as 'Solus, you're up' gets shouldRespond true", () => {
      const runtime = createMockRuntime({ characterName: "Solus" });
      const room = createRoom("daily-standup");
      const message = createMessage({
        senderName: "Kelly",
        text: "Solus, you're up.",
        isBot: true,
      });
      const decision = service.shouldRespond(runtime, message, room);
      expect(decision.shouldRespond).toBe(true);
      expect(decision.skipEvaluation).toBe(true);
    });
  });

  describe("non-standup channel unchanged", () => {
    it("human in general channel returns needs LLM evaluation", () => {
      const runtime = createMockRuntime({ characterName: "Kelly" });
      const room = createRoom("general");
      const message = createMessage({ senderName: "user", isBot: false });
      const decision = service.shouldRespond(runtime, message, room);
      expect(decision.skipEvaluation).toBe(false);
      expect(decision.reason).toContain("needs LLM");
    });
  });
});
