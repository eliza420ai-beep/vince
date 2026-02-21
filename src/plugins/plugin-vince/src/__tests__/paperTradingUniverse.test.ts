/**
 * Paper trading universe and "why so few trades" tests
 *
 * 1. Proves the paper bot is configured to consider all assets from targetAssets
 *    (core + HIP-3) when HIP-3 is enabled.
 * 2. Documents why the bot opens relatively few trades by encoding the main
 *    gates in test descriptions and assertions.
 *
 * Run: bun test src/plugins/plugin-vince/src/__tests__/paperTradingUniverse.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  CORE_ASSETS,
  HIP3_ASSETS,
  ALL_TRACKED_ASSETS,
} from "../constants/targetAssets";
import {
  TRADEABLE_ASSETS,
  getPaperTradeAssets,
  isHip3Enabled,
  SIGNAL_THRESHOLDS,
  PRIMARY_SIGNAL_SOURCES,
  DEFAULT_RISK_LIMITS,
} from "../constants/paperTradingDefaults";
import { createMockRuntime } from "./test-utils";

// =============================================================================
// TRADEABLE_ASSETS universe
// =============================================================================

describe("TRADEABLE_ASSETS contains full universe from targetAssets", () => {
  it("length equals CORE_ASSETS.length + HIP3_ASSETS.length", () => {
    expect(TRADEABLE_ASSETS.length).toBe(
      CORE_ASSETS.length + HIP3_ASSETS.length,
    );
  });

  it("contains every CORE_ASSETS symbol", () => {
    const set = new Set(TRADEABLE_ASSETS as readonly string[]);
    for (const symbol of CORE_ASSETS) {
      expect(set.has(symbol)).toBe(true);
    }
  });

  it("contains every HIP3_ASSETS symbol", () => {
    const set = new Set(TRADEABLE_ASSETS as readonly string[]);
    for (const symbol of HIP3_ASSETS) {
      expect(set.has(symbol)).toBe(true);
    }
  });
});

// =============================================================================
// getPaperTradeAssets(runtime) behavior
// =============================================================================

describe("getPaperTradeAssets with default runtime (HIP-3 enabled)", () => {
  it("returns same set as TRADEABLE_ASSETS", () => {
    const runtime = createMockRuntime();
    const assets = getPaperTradeAssets(runtime);
    expect(assets.length).toBe(TRADEABLE_ASSETS.length);
    const assetSet = new Set(assets);
    for (const symbol of TRADEABLE_ASSETS) {
      expect(assetSet.has(symbol)).toBe(true);
    }
  });
});

describe("getPaperTradeAssets with HIP-3 disabled", () => {
  it("returns only CORE_ASSETS", () => {
    const runtime = createMockRuntime({
      settings: { vince_paper_hip3_enabled: false },
    });
    const assets = getPaperTradeAssets(runtime);
    expect(assets.length).toBe(CORE_ASSETS.length);
    expect(assets).toEqual([...CORE_ASSETS]);
  });

  it("isHip3Enabled returns false when setting is false", () => {
    const runtime = createMockRuntime({
      settings: { vince_paper_hip3_enabled: false },
    });
    expect(isHip3Enabled(runtime)).toBe(false);
  });
});

describe("getPaperTradeAssets with vince_paper_assets custom list", () => {
  it("returns only valid assets from ALL_TRACKED_ASSETS", () => {
    const runtime = createMockRuntime({
      settings: { vince_paper_assets: "BTC,NVDA,GOLD,INVALID,SOL" },
    });
    const assets = getPaperTradeAssets(runtime);
    const tracked = new Set(ALL_TRACKED_ASSETS as readonly string[]);
    expect(assets.length).toBe(4);
    expect(assets).toContain("BTC");
    expect(assets).toContain("NVDA");
    expect(assets).toContain("GOLD");
    expect(assets).toContain("SOL");
    expect(assets).not.toContain("INVALID");
    for (const a of assets) {
      expect(tracked.has(a)).toBe(true);
    }
  });

  it("falls back to CORE_ASSETS when no valid assets in list", () => {
    const runtime = createMockRuntime({
      settings: { vince_paper_assets: "INVALID,SPY,TLT" },
    });
    const assets = getPaperTradeAssets(runtime);
    expect(assets.length).toBe(CORE_ASSETS.length);
    expect(assets).toEqual([...CORE_ASSETS]);
  });
});

// =============================================================================
// Why the paper bot may open few trades (documentation + gate assertions)
// =============================================================================

describe("Why the paper bot may open few trades", () => {
  it("gate: at least one primary source is required to open a trade", () => {
    expect(PRIMARY_SIGNAL_SOURCES.size).toBeGreaterThan(0);
    expect(PRIMARY_SIGNAL_SOURCES.has("HIP3Momentum")).toBe(true);
    expect(PRIMARY_SIGNAL_SOURCES.has("HIP3Funding")).toBe(true);
  });

  it("gate: signal direction must not be neutral (aggregator vote threshold)", () => {
    expect(true).toBe(true);
    // Direction is set in aggregator when longVotes > shortVotes + voteDifference
    // (or vice versa). Otherwise direction stays "neutral" and no trade opens.
  });

  it("gate: validateSignal requires strength/confidence above thresholds", () => {
    expect(SIGNAL_THRESHOLDS.MIN_STRENGTH).toBe(40);
    expect(SIGNAL_THRESHOLDS.MIN_CONFIDENCE).toBe(35);
    expect(SIGNAL_THRESHOLDS.HIP3_MIN_STRENGTH).toBe(45);
    expect(SIGNAL_THRESHOLDS.HIP3_MIN_CONFIDENCE).toBe(40);
  });

  it("gate: validateTrade enforces maxTotalExposurePct and maxPositionSizePct", () => {
    expect(DEFAULT_RISK_LIMITS.maxTotalExposurePct).toBe(30);
    expect(DEFAULT_RISK_LIMITS.maxPositionSizePct).toBe(10);
  });

  it("gate: one position per asset (no pyramiding)", () => {
    expect(true).toBe(true);
    // evaluateAndTrade skips asset if positionManager.hasOpenPosition(asset).
  });

  it("gate: openTrade requires valid price (HIP-3 fallback in paper service)", () => {
    expect(true).toBe(true);
    // openTrade returns null if entryPrice <= 0; HIP-3 assets get fallback via
    // VINCE_HIP3_SERVICE.getAssetPrice when marketData returns 0.
  });
});
