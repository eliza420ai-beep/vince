import { describe, expect, it } from "bun:test";
import {
  localTradePnlPct,
  normalizePasteTradeTicker,
} from "../pasteTradeMarks.ts";

describe("normalizePasteTradeTicker", () => {
  it("strips perp suffix", () => {
    expect(normalizePasteTradeTicker("btc-perp")).toBe("BTC");
  });
});

describe("localTradePnlPct", () => {
  it("long: profit when live above ref", () => {
    const t = {
      ticker: "BTC",
      direction: "long",
      reference_price_usd: 100,
    };
    expect(localTradePnlPct(t, 110)).toBeCloseTo(10, 5);
  });

  it("short: profit when live below ref", () => {
    const t = {
      ticker: "BTC",
      direction: "short",
      reference_price_usd: 100,
    };
    expect(localTradePnlPct(t, 90)).toBeCloseTo(10, 5);
  });

  it("returns null without ref", () => {
    expect(localTradePnlPct({ ticker: "BTC", direction: "long" }, 100)).toBe(
      null,
    );
  });
});
