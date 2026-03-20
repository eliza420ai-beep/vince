import { describe, it, expect } from "vitest";
import type { IAgentRuntime } from "@elizaos/core";
import {
  textTargetsHyperliquid,
  buildHlPerpsMarketFromSwap,
  enrichSwapRequestForHyperliquid,
  enrichLimitOrderRequestForHyperliquid,
} from "../lib/hlIntentFromText";
import type { SwapRequest, LimitOrderRequest } from "../services/otaku.service";

const mockRt = (hlUrl: string | undefined): IAgentRuntime =>
  ({
    getSetting: (k: string) =>
      k === "OTAKU_HL_SIDECAR_URL" ? hlUrl : undefined,
  }) as unknown as IAgentRuntime;

describe("hlIntentFromText", () => {
  it("textTargetsHyperliquid detects hyperliquid and hl perp phrases", () => {
    expect(
      textTargetsHyperliquid("swap 0.1 BTC on hyperliquid", undefined),
    ).toBe(true);
    expect(textTargetsHyperliquid("long btc on hl perp", undefined)).toBe(true);
    expect(textTargetsHyperliquid("swap eth to usdc on base", undefined)).toBe(
      false,
    );
    expect(textTargetsHyperliquid("", "hyperliquid")).toBe(true);
  });

  it("buildHlPerpsMarketFromSwap long vs USDC", () => {
    const h = buildHlPerpsMarketFromSwap(
      "on hyperliquid",
      "USDC",
      "BTC",
      "0.01",
    );
    expect(h).toEqual({
      coin: "BTC",
      isBuy: true,
      size: "0.01",
      orderType: "market",
    });
  });

  it("buildHlPerpsMarketFromSwap short into USDC", () => {
    const h = buildHlPerpsMarketFromSwap("short on hl", "ETH", "USDC", "0.2");
    expect(h).toEqual({
      coin: "ETH",
      isBuy: false,
      size: "0.2",
      orderType: "market",
    });
  });

  it("enrichSwapRequest adds venue when sidecar configured", () => {
    const rt = mockRt("http://localhost:9");
    const base: SwapRequest = {
      sellToken: "USDC",
      buyToken: "SOL",
      amount: "2",
    };
    const out = enrichSwapRequestForHyperliquid(
      rt,
      "buy sol on hyperliquid",
      base,
    );
    expect(out.executionVenue).toBe("hyperliquid_perps");
    expect(out.hlPerps?.coin).toBe("SOL");
    expect(out.hlPerps?.isBuy).toBe(true);
  });

  it("enrichSwapRequest noop without sidecar URL", () => {
    const rt = mockRt(undefined);
    const base: SwapRequest = {
      sellToken: "USDC",
      buyToken: "BTC",
      amount: "0.1",
    };
    const out = enrichSwapRequestForHyperliquid(rt, "on hyperliquid", base);
    expect(out.executionVenue).toBeUndefined();
  });

  it("enrichLimitOrderRequest adds limit hlPerps", () => {
    const rt = mockRt("http://localhost:9");
    const base: LimitOrderRequest = {
      sellToken: "USDC",
      buyToken: "ETH",
      amount: "0.5",
      limitPrice: "3000",
    };
    const out = enrichLimitOrderRequestForHyperliquid(
      rt,
      "limit buy eth at 3000 on hyperliquid",
      base,
    );
    expect(out.executionVenue).toBe("hyperliquid_perps");
    expect(out.hlPerps?.orderType).toBe("limit");
    expect(out.hlPerps?.limitPx).toBe("3000");
  });
});
