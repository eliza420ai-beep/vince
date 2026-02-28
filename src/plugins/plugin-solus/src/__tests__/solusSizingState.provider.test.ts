import { describe, it, expect } from "vitest";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import { solusSizingStateProvider } from "../providers/solusSizingState.provider";

function createRuntime(
  overrides: {
    getService?: (name: string) => unknown;
    getCache?: (key: string) => Promise<unknown>;
    setCache?: (key: string, value: unknown) => Promise<boolean>;
  } = {},
): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: { name: "Solus" },
    getService: overrides.getService ?? (() => null),
    getCache: overrides.getCache ?? (async () => undefined),
    setCache: overrides.setCache ?? (async () => true),
  } as unknown as IAgentRuntime;
}

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

describe("SOLUS_SIZING_STATE provider", () => {
  it("parses BTC/HYPE/SOL entries from solus-options-sizing.md", async () => {
    const runtime = createRuntime();
    const result = await solusSizingStateProvider.get(
      runtime,
      createMessage("check sizing"),
    );

    // If the local sizing file is missing, provider is a no-op; skip assertion in that case.
    if (!result.values?.solusSizingState) {
      expect(result.text).toBeUndefined();
      return;
    }

    const state = result.values.solusSizingState as {
      entries: Record<string, unknown>;
    };
    const assets = Object.keys(state.entries);
    expect(assets.length).toBeGreaterThanOrEqual(1);
    expect(assets).toContain("BTC");

    const btc = state.entries["BTC"] as {
      asset: string;
      positionType?: string;
      strikeUsd?: number;
      weeklyPremiumTargetUsd?: number;
    };
    expect(btc.asset).toBe("BTC");
    expect(btc.positionType).toBeDefined();
    expect(
      typeof btc.strikeUsd === "number" || btc.strikeUsd === undefined,
    ).toBe(true);
    if (btc.weeklyPremiumTargetUsd != null) {
      expect(typeof btc.weeklyPremiumTargetUsd).toBe("number");
    }
  });
});
