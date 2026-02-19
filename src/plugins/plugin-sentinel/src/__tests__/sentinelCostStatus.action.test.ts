/**
 * SENTINEL_COST_STATUS: validate triggers and handler response mentions TREASURY or Usage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sentinelCostStatusAction } from "../actions/sentinelCostStatus.action";
import type {
  IAgentRuntime,
  Memory,
  HandlerCallback,
  Content,
  UUID,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

function createMessage(text: string): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

function createMockRuntime(overrides?: {
  composeState?: (msg: Memory) => Promise<{ text: string }>;
  useModel?: (type: string, params: { prompt: string }) => Promise<string>;
}): IAgentRuntime {
  const composeState =
    overrides?.composeState ??
    (async () => ({
      text: "TREASURY.md cost breakdown. Leaderboard → Usage tab. Burn rate.",
    }));
  const useModel =
    overrides?.useModel ??
    (async () =>
      "Usage tab shows token usage. TREASURY has the cost breakdown. Watch burn rate; target 100K.");
  return {
    agentId: uuidv4() as UUID,
    composeState,
    useModel: useModel as any,
    getSetting: () => null,
    getService: () => null,
  } as unknown as IAgentRuntime;
}

describe("sentinelCostStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validate", () => {
    it("returns true for cost/burn/breakeven phrases", async () => {
      const runtime = createMockRuntime();
      const phrases = [
        "what's our burn?",
        "cost status",
        "breakeven",
        "100k target",
        "monthly spend",
        "run rate",
      ];
      for (const phrase of phrases) {
        const msg = createMessage(phrase);
        const result = await sentinelCostStatusAction.validate!(runtime, msg);
        expect(result).toBe(true);
      }
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const msg = createMessage("hello, how are you?");
      const result = await sentinelCostStatusAction.validate!(runtime, msg);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("callback response mentions TREASURY or Usage", async () => {
      const runtime = createMockRuntime({
        composeState: async () => ({
          text: "TREASURY.md. Usage tab. Burn rate.",
        }),
        useModel: async () =>
          "Leaderboard → Usage for tokens. TREASURY cost breakdown. Watch burn rate.",
      });
      const msg = createMessage("what's our burn?");
      const calls: Content[] = [];
      const callback: HandlerCallback = async (content) => {
        calls.push(content);
      };

      await sentinelCostStatusAction.handler!(
        runtime,
        msg,
        {} as any,
        undefined,
        callback,
      );

      expect(calls.length).toBeGreaterThanOrEqual(1);
      const text = (calls[0]?.text ?? "").toLowerCase();
      const hasRef = text.includes("treasury") || text.includes("usage");
      expect(hasRef).toBe(true);
    });
  });
});
