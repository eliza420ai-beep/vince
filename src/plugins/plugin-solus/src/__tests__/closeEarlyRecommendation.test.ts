import { describe, expect, it } from "vitest";
import type { State } from "@elizaos/core";
import {
  buildCloseEarlyRecommendation,
  buildCloseEarlyRecommendationFromState,
  parseCloseEarlyHintsFromText,
} from "../utils/closeEarlyRecommendation";

function makeState(overrides?: Partial<State>): State {
  const now = Date.now();
  return {
    text: "",
    values: {
      solusSizingState: {
        entries: {
          BTC: {
            asset: "BTC",
            positionType: "covered_calls",
            strikeUsd: 70500,
            expiryUtc: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
            raw: {},
            missing: [],
          },
        },
      },
      solusMarketContext: {
        assets: {
          BTC: {
            asset: "BTC",
            price: 70380,
            change24h: 2.4,
            marketRegime: "bullish",
            volume24h: null,
            volumeRatio: null,
            atrPct: null,
            dvol: null,
            fundingRate: 0.0003,
            longShortRatio: null,
          },
        },
        fearGreed: null,
      },
      optionsByAsset: {
        BTC: { spot: 70380, atmIV: 55 },
      },
      hypersurfaceSpotPrices: { bitcoin: 70380 },
    },
    ...(overrides ?? {}),
  } as State;
}

describe("closeEarlyRecommendation", () => {
  it("returns CLOSE_EARLY_NOW for near-strike bullish covered call", () => {
    const rec = buildCloseEarlyRecommendation({
      asset: "BTC",
      positionType: "covered_calls",
      strikeUsd: 70500,
      spotUsd: 70470,
      change24hPct: 2.1,
      marketRegime: "bull",
      fundingRate: 0.0003,
      expiryUtc: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    });
    expect(rec.action).toBe("CLOSE_EARLY_NOW");
    expect(rec.reasons).toContain("BULLISH_MOMENTUM");
  });

  it("downgrades to WATCH_CLOSE_WINDOW when USDT0 is insufficient", () => {
    const state = makeState({
      text: "Not enough USDT0 to close, you need $3,809.84 more. Premium cost -$4,034.36",
    });
    const rec = buildCloseEarlyRecommendationFromState(state);
    expect(rec).not.toBeNull();
    expect(rec?.action).toBe("WATCH_CLOSE_WINDOW");
    expect(rec?.reasons).toContain("USDT0_INSUFFICIENT");
    expect(rec?.bridgeNeeded).toBe(true);
  });

  it("returns HOLD_TO_EXPIRY for favorable CSP theta setup", () => {
    const rec = buildCloseEarlyRecommendation({
      asset: "HYPE",
      positionType: "secured_puts",
      strikeUsd: 30,
      spotUsd: 33,
      change24hPct: 0.3,
      marketRegime: "range",
      fundingRate: 0.00005,
      expiryUtc: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
    });
    expect(rec.action).toBe("HOLD_TO_EXPIRY");
    expect(rec.reasons).toContain("THETA_FAVORABLE");
  });

  it("returns ROLL_NEXT_WEEK for late-week adverse CSP momentum", () => {
    const rec = buildCloseEarlyRecommendation({
      asset: "HYPE",
      positionType: "secured_puts",
      strikeUsd: 30,
      spotUsd: 29.1,
      change24hPct: -4.5,
      marketRegime: "bear",
      fundingRate: -0.0005,
      expiryUtc: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    });
    expect(rec.action).toBe("ROLL_NEXT_WEEK");
    expect(rec.reasons).toContain("BEARISH_MOMENTUM");
    expect(rec.reasons).toContain("EXPIRY_URGENT");
  });

  it("parses close-early hints from UI text", () => {
    const hints = parseCloseEarlyHintsFromText(
      "Premium cost -$5,492.236362. Not enough USDT0 to close, you need $5,348.67 more.",
    );
    expect(hints.hasEnoughUsdt0).toBe(false);
    expect(hints.premiumCostToCloseUsd).toBe(5492.236362);
    expect(hints.usdtShortfallUsd).toBe(5348.67);
  });
});
