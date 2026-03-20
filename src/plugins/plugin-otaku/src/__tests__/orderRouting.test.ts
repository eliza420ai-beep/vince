import { describe, it, expect } from "vitest";
import {
  inferLimitRoutingFromText,
  inferSwapRoutingFromText,
  stopLossExchangeNativePrefix,
} from "../lib/orderRouting";
import type { IAgentRuntime } from "@elizaos/core";

function rt(settings: Record<string, string>): IAgentRuntime {
  return {
    getSetting: (k: string) => settings[k],
  } as unknown as IAgentRuntime;
}

describe("orderRouting", () => {
  it("infers post-only swap routing", () => {
    expect(inferSwapRoutingFromText("swap 1 ETH post-only to USDC")).toBe(
      "post_only_preferred",
    );
  });

  it("infers aggressive swap routing", () => {
    expect(inferSwapRoutingFromText("swap 1 ETH to USDC immediate taker")).toBe(
      "aggressive",
    );
  });

  it("infers limit post-only", () => {
    expect(inferLimitRoutingFromText("limit buy 1 ETH at 3000 post only")).toBe(
      "post_only_first",
    );
  });

  it("adds exchange-native stop prefix for perp cues", () => {
    const p = stopLossExchangeNativePrefix(
      rt({ OTAKU_EXCHANGE_NATIVE_STOPS: "true" }),
      "stop loss on my HYPE perp",
    );
    expect(p.length).toBeGreaterThan(0);
  });

  it("skips exchange-native prefix when disabled", () => {
    const p = stopLossExchangeNativePrefix(
      rt({ OTAKU_EXCHANGE_NATIVE_STOPS: "false" }),
      "stop loss ETH perp",
    );
    expect(p).toBe("");
  });
});
