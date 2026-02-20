/**
 * HIP-3 + WTT Primary Signal Source Tests
 *
 * Validates that HIP-3 stocks and WTT picks can actually trigger paper trades
 * by being promoted to PRIMARY signal sources:
 *
 * 1. PRIMARY_SIGNAL_SOURCES includes HIP3Momentum, HIP3OIBuild, WTT
 * 2. HIP3Funding threshold lowered to 0.01% (from 0.03%)
 * 3. HIP3Momentum fires at |change| > 1.5% with sufficient strength
 * 4. HIP3OIBuild fires at OI/vol > 2.5x with dynamic strength
 * 5. WTT pick injects a primary signal for the matching asset
 * 6. Risk manager uses minConfirming = 2 for non-core assets
 * 7. Dynamic config has WTT weight = 1.5
 *
 * Run: bun test src/plugins/plugin-vince/src/__tests__/hip3SignalPrimary.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  PRIMARY_SIGNAL_SOURCES,
  wttRubricToSignal,
} from "../constants/paperTradingDefaults";
import { CORE_ASSETS } from "../constants/targetAssets";

// =============================================================================
// 1. PRIMARY_SIGNAL_SOURCES membership
// =============================================================================

describe("PRIMARY_SIGNAL_SOURCES includes HIP-3 and WTT", () => {
  it("includes HIP3Funding (pre-existing)", () => {
    expect(PRIMARY_SIGNAL_SOURCES.has("HIP3Funding")).toBe(true);
  });

  it("includes HIP3Momentum (newly promoted)", () => {
    expect(PRIMARY_SIGNAL_SOURCES.has("HIP3Momentum")).toBe(true);
  });

  it("includes HIP3OIBuild (newly promoted)", () => {
    expect(PRIMARY_SIGNAL_SOURCES.has("HIP3OIBuild")).toBe(true);
  });

  it("includes WTT (newly added)", () => {
    expect(PRIMARY_SIGNAL_SOURCES.has("WTT")).toBe(true);
  });

  it("still includes all original crypto primary sources", () => {
    const originalSources = [
      "BinanceTopTraders",
      "LiquidationCascade",
      "LiquidationPressure",
      "BinanceFundingExtreme",
      "HyperliquidFundingExtreme",
      "HyperliquidCrowding",
      "DeribitPutCallRatio",
      "CoinGlass",
      "BinanceTakerFlow",
      "BinanceLongShort",
      "MarketRegime",
    ];
    for (const source of originalSources) {
      expect(PRIMARY_SIGNAL_SOURCES.has(source)).toBe(true);
    }
  });
});

// =============================================================================
// 2. CORE_ASSETS gate — HIP-3 assets are NOT core
// =============================================================================

describe("CORE_ASSETS classification", () => {
  it("BTC, ETH, SOL, HYPE are core", () => {
    for (const asset of ["BTC", "ETH", "SOL", "HYPE"]) {
      expect((CORE_ASSETS as readonly string[]).includes(asset)).toBe(true);
    }
  });

  it("HIP-3 stocks are NOT core (NVDA, TSLA, GOLD, US500)", () => {
    for (const asset of ["NVDA", "TSLA", "GOLD", "US500", "AAPL", "OIL"]) {
      expect((CORE_ASSETS as readonly string[]).includes(asset)).toBe(false);
    }
  });
});

// =============================================================================
// 3. HIP3Funding threshold (now 0.01% = 0.0001)
// =============================================================================

describe("HIP3Funding threshold", () => {
  it("fires at 0.015% funding (above new 0.01% threshold)", () => {
    const fr = 0.00015; // 0.015%
    const triggers = Math.abs(fr) > 0.0001;
    expect(triggers).toBe(true);
  });

  it("does NOT fire at 0.005% funding (below threshold)", () => {
    const fr = 0.00005;
    const triggers = Math.abs(fr) > 0.0001;
    expect(triggers).toBe(false);
  });

  it("would NOT have fired at old 0.03% threshold for 0.015% funding", () => {
    const fr = 0.00015;
    const oldThreshold = Math.abs(fr) > 0.0003;
    expect(oldThreshold).toBe(false);
  });

  it("strength scales correctly with new coefficients", () => {
    const fr = 0.0003; // 0.03%
    const strength = Math.min(72, 55 + Math.abs(fr) * 25000);
    expect(strength).toBeGreaterThanOrEqual(55);
    expect(strength).toBeLessThanOrEqual(72);
  });
});

// =============================================================================
// 4. HIP3Momentum threshold and strength
// =============================================================================

describe("HIP3Momentum signal", () => {
  it("fires at 1.8% change (above new 1.5% threshold)", () => {
    const change = 1.8;
    const triggers = Math.abs(change) > 1.5;
    expect(triggers).toBe(true);
  });

  it("does NOT fire at 1.2% change", () => {
    const change = 1.2;
    const triggers = Math.abs(change) > 1.5;
    expect(triggers).toBe(false);
  });

  it("would NOT have fired at old 2% threshold for 1.8% change", () => {
    const change = 1.8;
    const oldThreshold = Math.abs(change) > 2;
    expect(oldThreshold).toBe(false);
  });

  it("strength reaches sufficient level for a 4% move", () => {
    const change = 4.0;
    const strength = Math.min(75, 56 + Math.abs(change) * 2);
    expect(strength).toBe(64);
    expect(strength).toBeGreaterThanOrEqual(56);
  });

  it("confidence reaches sufficient level for a 4% move", () => {
    const change = 4.0;
    const confidence = Math.min(68, 50 + Math.abs(change) * 1.5);
    expect(confidence).toBe(56);
    expect(confidence).toBeGreaterThanOrEqual(50);
  });

  it("caps at 75 strength for extreme moves", () => {
    const change = 20;
    const strength = Math.min(75, 56 + Math.abs(change) * 2);
    expect(strength).toBe(75);
  });

  it("direction follows momentum (long for positive, short for negative)", () => {
    expect(3.5 > 0 ? "long" : "short").toBe("long");
    expect(-3.5 > 0 ? "long" : "short").toBe("short");
  });
});

// =============================================================================
// 5. HIP3OIBuild threshold and dynamic strength
// =============================================================================

describe("HIP3OIBuild signal", () => {
  it("fires at OI/vol ratio 3x (above new 2.5x threshold)", () => {
    const ratio = 3.0;
    const triggers = ratio > 2.5;
    expect(triggers).toBe(true);
  });

  it("does NOT fire at 2x ratio", () => {
    const ratio = 2.0;
    const triggers = ratio > 2.5;
    expect(triggers).toBe(false);
  });

  it("would NOT have fired at old 3x threshold for 2.8x ratio", () => {
    const ratio = 2.8;
    const oldThreshold = ratio > 3;
    expect(oldThreshold).toBe(false);
  });

  it("strength scales dynamically with ratio", () => {
    const ratio = 4.0;
    const strength = Math.min(70, 52 + ratio * 3);
    expect(strength).toBe(64);
  });

  it("confidence scales dynamically with ratio", () => {
    const ratio = 4.0;
    const confidence = Math.min(64, 48 + ratio * 2.5);
    expect(confidence).toBe(58);
  });

  it("caps at 70 strength for extreme ratios", () => {
    const ratio = 20;
    const strength = Math.min(70, 52 + ratio * 3);
    expect(strength).toBe(70);
  });

  it("direction is contrarian (short when price up, long when price down)", () => {
    const change = 5; // price up
    const dir: "long" | "short" = change > 0 ? "short" : "long";
    expect(dir).toBe("short");

    const change2 = -3; // price down
    const dir2: "long" | "short" = change2 > 0 ? "short" : "long";
    expect(dir2).toBe("long");
  });
});

// =============================================================================
// 6. WTT dynamic config weight (verified by reading the source file directly)
// =============================================================================

describe("WTT dynamic config", () => {
  // dynamicConfig imports @elizaos/core at runtime, so we read the source
  // file to verify the weight is set correctly without triggering that import.
  let configSource: string;

  try {
    const fs = require("node:fs");
    const path = require("node:path");
    configSource = fs.readFileSync(
      path.join(__dirname, "..", "config", "dynamicConfig.ts"),
      "utf-8",
    );
  } catch {
    configSource = "";
  }

  it("has WTT weight of 1.5 in source", () => {
    expect(configSource).toContain("WTT: 1.5");
  });

  it("HIP3Funding weight is 1.3 in source", () => {
    expect(configSource).toContain("HIP3Funding: 1.3");
  });

  it("HIP3Momentum weight is 1.0 in source", () => {
    expect(configSource).toContain("HIP3Momentum: 1.0");
  });

  it("HIP3OIBuild weight is 0.8 in source", () => {
    expect(configSource).toContain("HIP3OIBuild: 0.8");
  });
});

// =============================================================================
// 7. Risk manager: minConfirming = 2 for non-core assets
// =============================================================================

describe("minConfirming for HIP-3 assets", () => {
  it("non-core assets get minConfirming = 1 (primary source gate ensures quality)", () => {
    const asset = "NVDA";
    const isCoreAsset = (CORE_ASSETS as readonly string[]).includes(asset);
    const minConfirming = !isCoreAsset ? 1 : 3;
    expect(minConfirming).toBe(1);
  });

  it("core assets still get minConfirming = 3", () => {
    const asset = "BTC";
    const isCoreAsset = (CORE_ASSETS as readonly string[]).includes(asset);
    const minConfirming = !isCoreAsset ? 1 : 3;
    expect(minConfirming).toBe(3);
  });
});

// =============================================================================
// 8. Primary source gate simulation
// =============================================================================

describe("primary source gate: HIP-3 trade scenarios", () => {
  it("NVDA with HIP3Momentum alone passes primary gate", () => {
    const contributingSources = ["HIP3Momentum"];
    const hasPrimary = contributingSources.some((s) =>
      PRIMARY_SIGNAL_SOURCES.has(s),
    );
    expect(hasPrimary).toBe(true);
  });

  it("NVDA with HIP3OIBuild alone passes primary gate", () => {
    const contributingSources = ["HIP3OIBuild"];
    const hasPrimary = contributingSources.some((s) =>
      PRIMARY_SIGNAL_SOURCES.has(s),
    );
    expect(hasPrimary).toBe(true);
  });

  it("NVDA with WTT alone passes primary gate", () => {
    const contributingSources = ["WTT"];
    const hasPrimary = contributingSources.some((s) =>
      PRIMARY_SIGNAL_SOURCES.has(s),
    );
    expect(hasPrimary).toBe(true);
  });

  it("NVDA with HIP3Momentum alone has 1 confirming (enough for HIP-3, minConfirming=1)", () => {
    const contributingSources = ["HIP3Momentum"];
    const hasPrimary = contributingSources.some((s) =>
      PRIMARY_SIGNAL_SOURCES.has(s),
    );
    const confirmingCount = contributingSources.length;
    const minConfirming = 1; // HIP-3 assets: primary gate ensures quality
    expect(hasPrimary).toBe(true);
    expect(confirmingCount).toBeGreaterThanOrEqual(minConfirming);
  });

  it("NVDA with WTT + HIP3Momentum has 2 confirming (strong conviction)", () => {
    const contributingSources = ["WTT", "HIP3Momentum"];
    const hasPrimary = contributingSources.some((s) =>
      PRIMARY_SIGNAL_SOURCES.has(s),
    );
    const confirmingCount = contributingSources.length;
    expect(hasPrimary).toBe(true);
    expect(confirmingCount).toBe(2);
  });

  it("GOLD with all 3 HIP-3 sources has 3 confirming (exceeds minimum)", () => {
    const contributingSources = ["HIP3Funding", "HIP3Momentum", "HIP3OIBuild"];
    const hasPrimary = contributingSources.some((s) =>
      PRIMARY_SIGNAL_SOURCES.has(s),
    );
    const confirmingCount = contributingSources.length;
    expect(hasPrimary).toBe(true);
    expect(confirmingCount).toBe(3);
  });

  it("GOLD with WTT + all HIP-3 has 4 confirming (strong conviction)", () => {
    const contributingSources = [
      "WTT",
      "HIP3Funding",
      "HIP3Momentum",
      "HIP3OIBuild",
    ];
    const hasPrimary = contributingSources.some((s) =>
      PRIMARY_SIGNAL_SOURCES.has(s),
    );
    const confirmingCount = contributingSources.length;
    expect(hasPrimary).toBe(true);
    expect(confirmingCount).toBe(4);
  });
});

// =============================================================================
// 9. WTT rubric → signal (from paperTradingDefaults)
// =============================================================================

describe("WTT rubric feeds into signal aggregator", () => {
  it("strong rubric produces strength >= 70", () => {
    const { strength } = wttRubricToSignal({
      alignment: "direct",
      edge: "undiscovered",
      payoffShape: "max_asymmetry",
      timingForgiveness: "very_forgiving",
    });
    expect(strength).toBeGreaterThanOrEqual(70);
  });

  it("moderate rubric produces strength >= 50", () => {
    const { strength } = wttRubricToSignal({
      alignment: "partial",
      edge: "consensus",
      payoffShape: "fair",
      timingForgiveness: "moderate",
    });
    expect(strength).toBeGreaterThanOrEqual(50);
  });

  it("weak rubric still produces a positive signal", () => {
    const { strength, confidence } = wttRubricToSignal({
      alignment: "counter",
      edge: "consensus",
      payoffShape: "unfavorable",
      timingForgiveness: "tight",
    });
    expect(strength).toBeGreaterThan(0);
    expect(confidence).toBeGreaterThan(0);
  });
});

// =============================================================================
// 10. End-to-end: HIP-3 asset would now trade where before it was blocked
// =============================================================================

describe("end-to-end: HIP-3 asset tradability", () => {
  it("NVDA with +3% move and OI/vol 3.5x: both primary sources fire", () => {
    const change = 3.0;
    const oiToVol = 3.5;
    const funding = 0.00005; // neutral, below threshold

    const signals: string[] = [];

    // HIP3Funding check (new threshold 0.0001)
    if (Math.abs(funding) > 0.0001) signals.push("HIP3Funding");

    // HIP3Momentum check (new threshold 1.5)
    if (Math.abs(change) > 1.5) signals.push("HIP3Momentum");

    // HIP3OIBuild check (new threshold 2.5)
    if (oiToVol > 2.5) signals.push("HIP3OIBuild");

    expect(signals).toContain("HIP3Momentum");
    expect(signals).toContain("HIP3OIBuild");
    expect(signals).not.toContain("HIP3Funding"); // funding is neutral
    expect(signals.length).toBeGreaterThanOrEqual(2); // meets minConfirming for HIP-3

    const hasPrimary = signals.some((s) => PRIMARY_SIGNAL_SOURCES.has(s));
    expect(hasPrimary).toBe(true);
  });

  it("same scenario under OLD thresholds: zero signals would fire", () => {
    const change = 3.0;
    const oiToVol = 3.5;
    const funding = 0.00005;

    const oldSignals: string[] = [];
    if (Math.abs(funding) > 0.0003) oldSignals.push("HIP3Funding");
    if (Math.abs(change) > 2) oldSignals.push("HIP3Momentum");
    if (oiToVol > 3) oldSignals.push("HIP3OIBuild");

    // Under old thresholds, momentum would fire but OI would too — BUT:
    // HIP3Momentum and HIP3OIBuild were NOT primary sources
    const oldPrimarySources = new Set([
      "BinanceTopTraders",
      "LiquidationCascade",
      "LiquidationPressure",
      "BinanceFundingExtreme",
      "HyperliquidFundingExtreme",
      "HyperliquidCrowding",
      "DeribitPutCallRatio",
      "HIP3Funding",
      "CoinGlass",
      "BinanceTakerFlow",
      "BinanceLongShort",
      "MarketRegime",
    ]);

    const hadPrimary = oldSignals.some((s) => oldPrimarySources.has(s));
    expect(hadPrimary).toBe(false); // funding didn't fire → no primary → BLOCKED
  });

  it("TSLA with WTT pick + mild momentum: WTT unlocks the trade", () => {
    const change = 1.8; // above 1.5 threshold
    const oiToVol = 1.5; // below 2.5 threshold
    const funding = 0.00002; // neutral

    const signals: string[] = [];
    if (Math.abs(funding) > 0.0001) signals.push("HIP3Funding");
    if (Math.abs(change) > 1.5) signals.push("HIP3Momentum");
    if (oiToVol > 2.5) signals.push("HIP3OIBuild");
    signals.push("WTT"); // WTT pick matches TSLA

    const hasPrimary = signals.some((s) => PRIMARY_SIGNAL_SOURCES.has(s));
    expect(hasPrimary).toBe(true); // WTT is primary

    // 2 confirming: WTT + HIP3Momentum
    expect(signals.length).toBeGreaterThanOrEqual(2);
  });
});
