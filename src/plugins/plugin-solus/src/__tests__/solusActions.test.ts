/**
 * Plugin-Solus actions: validate triggers and handler callback.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { solusStrikeRitualAction } from "../actions/solusStrikeRitual.action";
import { solusHypersurfaceExplainAction } from "../actions/solusHypersurfaceExplain.action";
import { solusPositionAssessAction } from "../actions/solusPositionAssess.action";
import { solusOptimalStrikeAction } from "../actions/solusOptimalStrike.action";
import type { IAgentRuntime, Memory, HandlerCallback, Content, UUID } from "@elizaos/core";
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

function createSolusRuntime(overrides?: {
  composeState?: (msg: Memory) => Promise<{ text: string }>;
  useModel?: (type: string, params: { prompt: string }) => Promise<string>;
}): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: { name: "Solus" },
    composeState: overrides?.composeState ?? (async () => ({ text: "Hypersurface: Friday 08:00 UTC. CC, CSP, wheel." })),
    useModel: (overrides?.useModel ?? (async () => "Strike ritual: get VINCE options, pick asset, CC vs CSP, strike, invalidation.")) as any,
    getSetting: () => null,
    getService: () => null,
  } as unknown as IAgentRuntime;
}

function createNonSolusRuntime(): IAgentRuntime {
  return {
    ...createSolusRuntime(),
    character: { name: "VINCE" },
  } as unknown as IAgentRuntime;
}

describe("solusStrikeRitualAction", () => {
  it("validate returns true for strike ritual phrases when Solus", async () => {
    const runtime = createSolusRuntime();
    const phrases = ["strike ritual", "walk me through strike", "how do i run strike ritual"];
    for (const phrase of phrases) {
      const result = await solusStrikeRitualAction.validate!(runtime, createMessage(phrase));
      expect(result).toBe(true);
    }
  });

  it("validate returns false when not Solus", async () => {
    const runtime = createNonSolusRuntime();
    const result = await solusStrikeRitualAction.validate!(runtime, createMessage("strike ritual"));
    expect(result).toBe(false);
  });

  it("validate returns false for unrelated message", async () => {
    const runtime = createSolusRuntime();
    const result = await solusStrikeRitualAction.validate!(runtime, createMessage("hello"));
    expect(result).toBe(false);
  });

  it("handler calls callback with text", async () => {
    const runtime = createSolusRuntime({
      useModel: async () => "Checklist: (1) VINCE options. (2) Pick asset. Next: paste his view.",
    });
    const msg = createMessage("strike ritual");
    const calls: Content[] = [];
    const callback: HandlerCallback = async (content) => calls.push(content);
    await solusStrikeRitualAction.handler!(runtime, msg, {} as any, undefined, callback);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect((calls[0]?.text ?? "").length).toBeGreaterThan(0);
  });
});

describe("solusHypersurfaceExplainAction", () => {
  it("validate returns true for explain phrases when Solus", async () => {
    const runtime = createSolusRuntime();
    const phrases = ["how does hypersurface work", "explain secured puts", "what's the wheel"];
    for (const phrase of phrases) {
      const result = await solusHypersurfaceExplainAction.validate!(runtime, createMessage(phrase));
      expect(result).toBe(true);
    }
  });

  it("validate returns true for standup-style explain phrases (assigned, premium, underwater puts)", async () => {
    const runtime = createSolusRuntime();
    const phrases = ["what happens if we get assigned", "premium reduces cost basis", "underwater puts"];
    for (const phrase of phrases) {
      const result = await solusHypersurfaceExplainAction.validate!(runtime, createMessage(phrase));
      expect(result).toBe(true);
    }
  });

  it("validate returns false when not Solus", async () => {
    const runtime = createNonSolusRuntime();
    const result = await solusHypersurfaceExplainAction.validate!(runtime, createMessage("explain hypersurface"));
    expect(result).toBe(false);
  });
});

describe("solusPositionAssessAction", () => {
  it("validate returns true for position phrases when Solus", async () => {
    const runtime = createSolusRuntime();
    const phrases = ["assess my position", "we bought secured puts", "review my hypersurface position"];
    for (const phrase of phrases) {
      const result = await solusPositionAssessAction.validate!(runtime, createMessage(phrase));
      expect(result).toBe(true);
    }
  });

  it("validate returns true for standup-style position phrases (underwater, assigned, our $70k puts)", async () => {
    const runtime = createSolusRuntime();
    const phrases = ["our $70K secured puts are underwater", "we might get assigned", "our $70k puts", "premium reduces cost basis"];
    for (const phrase of phrases) {
      const result = await solusPositionAssessAction.validate!(runtime, createMessage(phrase));
      expect(result).toBe(true);
    }
  });

  it("validate returns false when not Solus", async () => {
    const runtime = createNonSolusRuntime();
    const result = await solusPositionAssessAction.validate!(runtime, createMessage("assess my position"));
    expect(result).toBe(false);
  });
});

describe("solusOptimalStrikeAction", () => {
  it("validate returns true for optimal strike phrases when Solus", async () => {
    const runtime = createSolusRuntime();
    const phrases = ["optimal strike", "what strike for btc", "best strike this week", "size or skip", "what's your call", "weekly view"];
    for (const phrase of phrases) {
      const result = await solusOptimalStrikeAction.validate!(runtime, createMessage(phrase));
      expect(result).toBe(true);
    }
  });

  it("validate returns false when not Solus", async () => {
    const runtime = createNonSolusRuntime();
    const result = await solusOptimalStrikeAction.validate!(runtime, createMessage("optimal strike"));
    expect(result).toBe(false);
  });

  it("fallback callback on error includes paste and VINCE (no-data path)", async () => {
    const runtime = createSolusRuntime({
      composeState: async () => {
        throw new Error("simulated failure");
      },
    });
    const msg = createMessage("optimal strike");
    const calls: Content[] = [];
    const callback: HandlerCallback = async (content) => calls.push(content);
    await solusOptimalStrikeAction.handler!(runtime, msg, {} as any, undefined, callback);
    expect(calls.length).toBe(1);
    const text = (calls[0]?.text ?? "").toLowerCase();
    expect(text).toMatch(/paste/);
    expect(text).toMatch(/vince/);
  });
});
