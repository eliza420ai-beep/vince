/**
 * Tests for ARB_CONTROL action: pause, resume, config.
 */

import { describe, it, expect } from "bun:test";
import { arbControlAction } from "../actions/arbControl.action";
import type { IAgentRuntime, Memory } from "@elizaos/core";

function createMessage(text: string): Memory {
  return {
    id: "msg-1",
    content: { text },
    roomId: "room-1",
    entityId: "user-1",
    agentId: "agent-1",
    createdAt: Date.now(),
  };
}

describe("plugin-polymarket-arb: ARB_CONTROL", () => {
  it("validate returns false when arb engine service not available", async () => {
    const runtime = {
      getService: () => null,
    } as unknown as IAgentRuntime;
    const valid = await arbControlAction.validate!(
      runtime,
      createMessage("arb pause"),
    );
    expect(valid).toBe(false);
  });

  it("validate returns true for arb pause when service present", async () => {
    const runtime = {
      getService: (name: string) =>
        name === "POLYMARKET_ARB_ENGINE_SERVICE" ? {} : null,
    } as unknown as IAgentRuntime;
    const valid = await arbControlAction.validate!(
      runtime,
      createMessage("arb pause"),
    );
    expect(valid).toBe(true);
  });

  it("validate returns true for arb resume when service present", async () => {
    const runtime = {
      getService: (name: string) =>
        name === "POLYMARKET_ARB_ENGINE_SERVICE" ? {} : null,
    } as unknown as IAgentRuntime;
    const valid = await arbControlAction.validate!(
      runtime,
      createMessage("resume arb"),
    );
    expect(valid).toBe(true);
  });

  it("validate returns true for arb config when service present", async () => {
    const runtime = {
      getService: (name: string) =>
        name === "POLYMARKET_ARB_ENGINE_SERVICE" ? {} : null,
    } as unknown as IAgentRuntime;
    const valid = await arbControlAction.validate!(
      runtime,
      createMessage("arb config"),
    );
    expect(valid).toBe(true);
  });

  it("handler calls pause and returns success", async () => {
    let paused = false;
    const runtime = {
      getService: () => ({
        pause: async () => {
          paused = true;
        },
      }),
    } as unknown as IAgentRuntime;
    const result = (await arbControlAction.handler!(
      runtime,
      createMessage("pause arb"),
      undefined,
      undefined,
    )) as { success: boolean; text?: string };
    expect(result.success).toBe(true);
    expect(result.text).toContain("paused");
    expect(paused).toBe(true);
  });

  it("handler calls resume and returns success", async () => {
    let resumed = false;
    const runtime = {
      getService: () => ({
        resume: async () => {
          resumed = true;
        },
      }),
    } as unknown as IAgentRuntime;
    const result = (await arbControlAction.handler!(
      runtime,
      createMessage("arb resume"),
      undefined,
      undefined,
    )) as { success: boolean; text?: string };
    expect(result.success).toBe(true);
    expect(result.text).toContain("resumed");
    expect(resumed).toBe(true);
  });

  it("handler returns config when engine has getConfig", async () => {
    const runtime = {
      getService: () => ({
        getConfig: () => ({
          minEdgePct: 8,
          kellyFraction: 0.25,
          maxPositionUsd: 200,
          maxDailyTrades: 150,
        }),
      }),
    } as unknown as IAgentRuntime;
    let callbackText = "";
    const result = (await arbControlAction.handler!(
      runtime,
      createMessage("arb config"),
      undefined,
      undefined,
      (c) => {
        callbackText = (c as { text?: string }).text ?? "";
      },
    )) as { success: boolean; text?: string };
    expect(result.success).toBe(true);
    expect(callbackText).toContain("Min edge");
    expect(callbackText).toContain("8");
  });
});
