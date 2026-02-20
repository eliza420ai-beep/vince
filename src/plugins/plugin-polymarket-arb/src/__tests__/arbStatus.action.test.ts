/**
 * Minimal tests for ARB_STATUS action: validate and handler when service missing.
 */

import { describe, it, expect } from "bun:test";
import { arbStatusAction } from "../actions/arbStatus.action";
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

describe("plugin-polymarket-arb: ARB_STATUS", () => {
  it("validate returns false when arb engine service not available", async () => {
    const runtime = {
      getService: () => null,
    } as unknown as IAgentRuntime;
    const valid = await arbStatusAction.validate!(
      runtime,
      createMessage("arb status"),
    );
    expect(valid).toBe(false);
  });

  it("validate returns true when arb engine service is present", async () => {
    const runtime = {
      getService: (name: string) =>
        name === "POLYMARKET_ARB_ENGINE_SERVICE" ? {} : null,
    } as unknown as IAgentRuntime;
    const valid = await arbStatusAction.validate!(
      runtime,
      createMessage("arb status"),
    );
    expect(valid).toBe(true);
  });

  it("handler returns failure and callback when engine has no getStatus", async () => {
    const runtime = {
      getService: () => ({}),
    } as unknown as IAgentRuntime;
    let callbackText = "";
    const result = (await arbStatusAction.handler!(
      runtime,
      createMessage("arb status"),
      undefined,
      undefined,
      (c) => {
        callbackText = (c as { text?: string }).text ?? "";
      },
    )) as { success: boolean; text?: string };
    expect(result.success).toBe(false);
    expect(result.text).toContain("Arb engine not available");
    expect(callbackText).toContain("Arb engine not available");
  });

  it("handler returns success when engine.getStatus returns status", async () => {
    const runtime = {
      getService: () => ({
        getStatus: async () => ({
          liveExecution: false,
          paused: false,
          tradesToday: 5,
          winCountToday: 3,
          todayPnlUsd: 12.5,
          bankrollUsd: 1000,
          contractsWatched: 2,
          btcLastPrice: 68000,
        }),
      }),
    } as unknown as IAgentRuntime;
    let callbackText = "";
    const result = (await arbStatusAction.handler!(
      runtime,
      createMessage("arb status"),
      undefined,
      undefined,
      (c) => {
        callbackText = (c as { text?: string }).text ?? "";
      },
    )) as { success: boolean; text?: string };
    expect(result.success).toBe(true);
    expect(callbackText).toContain("PAPER");
    expect(callbackText).toContain("Trades today: 5");
  });
});
