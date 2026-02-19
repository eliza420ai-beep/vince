/**
 * WTT → Paper Bot Integration Tests
 *
 * Proves that the What's the Trade → paper trading → feature store → train_models
 * pipeline works end-to-end at the unit level:
 *
 * - normalizeWttTicker: map WTT tickers to paper-bot assets (core + HIP-3, aliases)
 * - wttRubricToSignal: rubric → strength/confidence for the paper bot
 * - wttPickToWttBlock: WTT pick → feature-store wtt block (ordinals)
 * - isWttEnabled: env/character gating
 * - parseWttInvalidateCondition: invalidate condition → hit/miss at exit
 * - Feature store: recordDecision with wtt, recordOutcome sets wtt.invalidateHit
 *
 * Run: bun test src/plugins/plugin-vince/src/__tests__/wttPaperBotIntegration.test.ts
 * Or:  vitest run src/__tests__/wttPaperBotIntegration.test.ts --dir=.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createMockRuntime, createMockServices } from "./test-utils";
import { normalizeWttTicker } from "../constants/targetAssets";
import {
  isWttEnabled,
  wttRubricToSignal,
  wttPickToWttBlock,
} from "../constants/paperTradingDefaults";
import {
  parseWttInvalidateCondition,
  VinceFeatureStoreService,
} from "../services/vinceFeatureStore.service";

// =============================================================================
// normalizeWttTicker
// =============================================================================

describe("WTT → Paper Bot: normalizeWttTicker", () => {
  it("returns core assets as-is (BTC, ETH, SOL, HYPE)", () => {
    expect(normalizeWttTicker("BTC")).toBe("BTC");
    expect(normalizeWttTicker("ETH")).toBe("ETH");
    expect(normalizeWttTicker("SOL")).toBe("SOL");
    expect(normalizeWttTicker("HYPE")).toBe("HYPE");
  });

  it("returns HIP-3 assets as-is (NVDA, TSLA, GOOGL, etc.)", () => {
    expect(normalizeWttTicker("NVDA")).toBe("NVDA");
    expect(normalizeWttTicker("TSLA")).toBe("TSLA");
    expect(normalizeWttTicker("GOOGL")).toBe("GOOGL");
    expect(normalizeWttTicker("US500")).toBe("US500");
  });

  it("maps GOOG/GOOGLE to GOOGL", () => {
    expect(normalizeWttTicker("GOOG")).toBe("GOOGL");
    expect(normalizeWttTicker("GOOGLE")).toBe("GOOGL");
  });

  it("returns null for non-tracked tickers (options-only, etc.)", () => {
    expect(normalizeWttTicker("TLT")).toBeNull();
    expect(normalizeWttTicker("SPY")).toBeNull();
    expect(normalizeWttTicker("")).toBeNull();
    expect(normalizeWttTicker("   ")).toBeNull();
  });

  it("is case-insensitive for ticker input", () => {
    expect(normalizeWttTicker("btc")).toBe("BTC");
    expect(normalizeWttTicker("NvDa")).toBe("NVDA");
  });
});

// =============================================================================
// wttRubricToSignal
// =============================================================================

describe("WTT → Paper Bot: wttRubricToSignal", () => {
  it("returns strength and confidence in 0–100 range", () => {
    const out = wttRubricToSignal({
      alignment: "direct",
      edge: "undiscovered",
      payoffShape: "max_asymmetry",
      timingForgiveness: "very_forgiving",
    });
    expect(out.strength).toBeGreaterThanOrEqual(0);
    expect(out.strength).toBeLessThanOrEqual(100);
    expect(out.confidence).toBeGreaterThanOrEqual(0);
    expect(out.confidence).toBeLessThanOrEqual(100);
  });

  it("higher alignment + edge produce higher strength/confidence", () => {
    const high = wttRubricToSignal({
      alignment: "direct",
      edge: "undiscovered",
      payoffShape: "high",
      timingForgiveness: "forgiving",
    });
    const low = wttRubricToSignal({
      alignment: "tangential",
      edge: "crowded",
      payoffShape: "capped",
      timingForgiveness: "very_punishing",
    });
    expect(high.strength).toBeGreaterThan(low.strength);
    expect(high.confidence).toBeGreaterThan(low.confidence);
  });

  it("handles all rubric string values without throwing", () => {
    const alignments = [
      "direct",
      "pure_play",
      "exposed",
      "partial",
      "tangential",
    ] as const;
    const edges = ["undiscovered", "emerging", "consensus", "crowded"] as const;
    const payoffs = [
      "max_asymmetry",
      "high",
      "moderate",
      "linear",
      "capped",
    ] as const;
    const timings = [
      "very_forgiving",
      "forgiving",
      "punishing",
      "very_punishing",
    ] as const;
    for (const a of alignments) {
      for (const e of edges) {
        for (const p of payoffs) {
          for (const t of timings) {
            const out = wttRubricToSignal({
              alignment: a,
              edge: e,
              payoffShape: p,
              timingForgiveness: t,
            });
            expect(typeof out.strength).toBe("number");
            expect(typeof out.confidence).toBe("number");
          }
        }
      }
    }
  });
});

// =============================================================================
// wttPickToWttBlock
// =============================================================================

describe("WTT → Paper Bot: wttPickToWttBlock", () => {
  it("produces ordinals for alignment (1–5), edge (1–4), payoff (1–5), timing (1–4)", () => {
    const block = wttPickToWttBlock({
      primary: true,
      ticker: "BTC",
      thesis: "Risk-on rotation",
      rubric: {
        alignment: "direct",
        edge: "undiscovered",
        payoffShape: "max_asymmetry",
        timingForgiveness: "very_forgiving",
      },
      invalidateCondition: "BTC < 65k",
      evThresholdPct: 5,
    });
    expect(block.primary).toBe(true);
    expect(block.ticker).toBe("BTC");
    expect(block.thesis).toBe("Risk-on rotation");
    expect(block.alignment).toBeGreaterThanOrEqual(1);
    expect(block.alignment).toBeLessThanOrEqual(5);
    expect(block.edge).toBeGreaterThanOrEqual(1);
    expect(block.edge).toBeLessThanOrEqual(4);
    expect(block.payoffShape).toBeGreaterThanOrEqual(1);
    expect(block.payoffShape).toBeLessThanOrEqual(5);
    expect(block.timingForgiveness).toBeGreaterThanOrEqual(1);
    expect(block.timingForgiveness).toBeLessThanOrEqual(4);
    expect(block.invalidateCondition).toBe("BTC < 65k");
    expect(block.evThresholdPct).toBe(5);
  });

  it("maps tangential/crowded/capped/very_punishing to low ordinals", () => {
    const block = wttPickToWttBlock({
      primary: false,
      ticker: "SOL",
      thesis: "Alt",
      rubric: {
        alignment: "tangential",
        edge: "crowded",
        payoffShape: "capped",
        timingForgiveness: "very_punishing",
      },
    });
    expect(block.alignment).toBe(1);
    expect(block.edge).toBe(1);
    expect(block.payoffShape).toBe(1);
    expect(block.timingForgiveness).toBe(1);
  });
});

// =============================================================================
// isWttEnabled
// =============================================================================

describe("WTT → Paper Bot: isWttEnabled", () => {
  it("returns true when vince_paper_wtt_enabled is not set (default on)", () => {
    const runtime = createMockRuntime({ settings: {} });
    expect(isWttEnabled(runtime)).toBe(true);
  });

  it("returns true when vince_paper_wtt_enabled is true (boolean)", () => {
    const runtime = createMockRuntime({
      settings: { vince_paper_wtt_enabled: true },
    });
    expect(isWttEnabled(runtime)).toBe(true);
  });

  it("returns true when vince_paper_wtt_enabled is the string 'true'", () => {
    const runtime = createMockRuntime({
      settings: { vince_paper_wtt_enabled: "true" },
    });
    expect(isWttEnabled(runtime)).toBe(true);
  });

  it("returns false when vince_paper_wtt_enabled is false or other", () => {
    expect(
      isWttEnabled(
        createMockRuntime({ settings: { vince_paper_wtt_enabled: false } }),
      ),
    ).toBe(false);
    expect(
      isWttEnabled(
        createMockRuntime({ settings: { vince_paper_wtt_enabled: "false" } }),
      ),
    ).toBe(false);
  });
});

// =============================================================================
// parseWttInvalidateCondition
// =============================================================================

describe("WTT → Paper Bot: parseWttInvalidateCondition", () => {
  it("BTC < 65k: hit when exit price below 65000", () => {
    expect(parseWttInvalidateCondition("BTC", 64_000, "BTC < 65k")).toBe(true);
    expect(parseWttInvalidateCondition("BTC", 65_000, "BTC < 65k")).toBe(false);
    expect(parseWttInvalidateCondition("BTC", 66_000, "BTC < 65k")).toBe(false);
  });

  it("BTC > 70k: hit when exit price above 70000", () => {
    expect(parseWttInvalidateCondition("BTC", 71_000, "BTC > 70k")).toBe(true);
    expect(parseWttInvalidateCondition("BTC", 70_000, "BTC > 70k")).toBe(false);
    expect(parseWttInvalidateCondition("BTC", 69_000, "BTC > 70k")).toBe(false);
  });

  it("parses 65k as 65000, 1.5M as 1.5e6", () => {
    expect(parseWttInvalidateCondition("BTC", 60_000, "BTC < 65k")).toBe(true);
    expect(parseWttInvalidateCondition("BTC", 1_400_000, "BTC < 1.5M")).toBe(
      true,
    );
    expect(parseWttInvalidateCondition("BTC", 1_600_000, "BTC < 1.5M")).toBe(
      false,
    );
  });

  it("above $X / below $X (no ticker)", () => {
    expect(parseWttInvalidateCondition("BTC", 190, "above $180")).toBe(true);
    expect(parseWttInvalidateCondition("BTC", 170, "above $180")).toBe(false);
    expect(parseWttInvalidateCondition("NVDA", 170, "below $180")).toBe(true);
    expect(parseWttInvalidateCondition("NVDA", 190, "below $180")).toBe(false);
  });

  it("returns false when condition does not match asset or pattern", () => {
    expect(parseWttInvalidateCondition("ETH", 64_000, "BTC < 65k")).toBe(false);
    expect(parseWttInvalidateCondition("BTC", 64_000, "ETH < 65k")).toBe(false);
    expect(
      parseWttInvalidateCondition("BTC", 64_000, "dies if sentiment flips"),
    ).toBe(false);
  });

  it("is case-insensitive for asset and condition", () => {
    expect(parseWttInvalidateCondition("btc", 64_000, "btc < 65k")).toBe(true);
    expect(parseWttInvalidateCondition("BTC", 64_000, "BTC < 65K")).toBe(true);
  });
});

// =============================================================================
// Feature Store: recordDecision with wtt, recordOutcome sets invalidateHit
// =============================================================================

describe("WTT → Paper Bot: Feature store wtt block and invalidateHit", () => {
  let tmpDir: string;
  let store: VinceFeatureStoreService;
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeAll(async () => {
    tmpDir = path.join(process.cwd(), ".tmp-wtt-test-" + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
    const mockServices = {
      VINCE_MARKET_DATA_SERVICE: {
        getEnrichedContext: async (_asset: string) => ({
          currentPrice: 85000,
          priceChange24h: 1.5,
          fundingRate: 0.0001,
          longShortRatio: 1.05,
          volumeRatio: 1.0,
          volume24h: 1e9,
          marketRegime: "neutral",
          fearGreedValue: 50,
        }),
        getPrices: async () => ({}),
        getMarketRegime: async () => "neutral",
        getFearGreed: async () => 50,
        refreshData: async () => {},
      },
    };
    runtime = createMockRuntime({
      settings: { VINCE_FEATURE_STORE_DATA_DIR: tmpDir },
      services: { ...createMockServices(), ...mockServices },
    });
    store = await VinceFeatureStoreService.start(runtime);
  });

  afterAll(async () => {
    await store.stop();
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  it("recordDecision with wtt stores the wtt block on the record", async () => {
    const recordId = await store.recordDecision({
      asset: "BTC",
      signal: {
        asset: "BTC",
        direction: "long",
        strength: 70,
        confidence: 65,
        sources: ["wtt"],
        factors: ["Risk-on rotation"],
        confirmingCount: 1,
        timestamp: Date.now(),
      },
      wtt: {
        primary: true,
        ticker: "BTC",
        thesis: "Risk-on rotation",
        alignment: 5,
        edge: 4,
        payoffShape: 5,
        timingForgiveness: 4,
        invalidateCondition: "BTC < 65k",
        evThresholdPct: 5,
      },
    });
    expect(recordId).toBeTruthy();
    const records = store.getRecentRecords(1);
    expect(records.length).toBe(1);
    expect(records[0].wtt).toBeDefined();
    expect(records[0].wtt?.primary).toBe(true);
    expect(records[0].wtt?.ticker).toBe("BTC");
    expect(records[0].wtt?.invalidateCondition).toBe("BTC < 65k");
    expect(records[0].wtt?.invalidateHit).toBeUndefined();
  });

  it("recordOutcome sets wtt.invalidateHit when condition is hit", async () => {
    const recordId = await store.recordDecision({
      asset: "NVDA",
      signal: {
        asset: "NVDA",
        direction: "long",
        strength: 60,
        confidence: 55,
        sources: ["wtt"],
        factors: ["AI capex"],
        confirmingCount: 1,
        timestamp: Date.now(),
      },
      wtt: {
        primary: true,
        ticker: "NVDA",
        thesis: "AI capex",
        alignment: 4,
        edge: 3,
        payoffShape: 4,
        timingForgiveness: 3,
        invalidateCondition: "NVDA < 800",
      },
    });
    expect(recordId).toBeTruthy();
    const posId = "test-position-nvda";
    await store.recordExecution(recordId, {
      id: posId,
      asset: "NVDA",
      direction: "long",
      status: "open",
      entryPrice: 850,
      sizeUsd: 1000,
      leverage: 2,
      stopLossPrice: 800,
      takeProfitPrices: [900, 950],
      openAt: Date.now(),
      signal: {} as any,
    } as any);
    await store.recordOutcome(posId, {
      exitPrice: 750,
      realizedPnl: -100,
      realizedPnlPct: -10,
      feesUsd: 5,
      exitReason: "stop",
      holdingPeriodMs: 60_000,
    });
    const records = store.getRecentRecords(5);
    const withOutcome = records.find((r) => r.asset === "NVDA" && r.outcome);
    expect(withOutcome?.wtt?.invalidateHit).toBe(true);
  });

  it("recordOutcome sets wtt.invalidateHit false when condition is not hit", async () => {
    const recordId = await store.recordDecision({
      asset: "SOL",
      signal: {
        asset: "SOL",
        direction: "short",
        strength: 55,
        confidence: 50,
        sources: ["wtt"],
        factors: ["SOL overextended"],
        confirmingCount: 1,
        timestamp: Date.now(),
      },
      wtt: {
        primary: true,
        ticker: "SOL",
        thesis: "SOL overextended",
        alignment: 3,
        edge: 2,
        payoffShape: 3,
        timingForgiveness: 2,
        invalidateCondition: "SOL > 200",
      },
    });
    const posId = "test-position-sol";
    await store.recordExecution(recordId, {
      id: posId,
      asset: "SOL",
      direction: "short",
      status: "open",
      entryPrice: 180,
      sizeUsd: 500,
      leverage: 1,
      stopLossPrice: 200,
      takeProfitPrices: [160],
      openAt: Date.now(),
      signal: {} as any,
    } as any);
    await store.recordOutcome(posId, {
      exitPrice: 170,
      realizedPnl: 50,
      realizedPnlPct: 10,
      feesUsd: 2,
      exitReason: "tp",
      holdingPeriodMs: 120_000,
    });
    const records = store.getRecentRecords(10);
    const solRecord = records.find(
      (r) =>
        r.asset === "SOL" &&
        r.outcome &&
        r.wtt?.invalidateCondition === "SOL > 200",
    );
    expect(solRecord?.wtt?.invalidateHit).toBe(false);
  });
});

// =============================================================================
// E2E: Fixture WTT JSON → evaluateWttPick path (research → structured output → bot)
// =============================================================================

describe("WTT E2E: fixture JSON → bot evaluation path", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = path.join(process.cwd(), ".tmp-wtt-e2e-" + Date.now());
    fs.mkdirSync(path.join(tmpDir, "whats-the-trade"), { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  it("writes valid WTT fixture, reads back, and signal/asset pass bot gates", async () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const fixturePath = path.join(
      tmpDir,
      "whats-the-trade",
      `${dateStr}-whats-the-trade.json`,
    );
    const fixture: Record<string, unknown> = {
      date: dateStr,
      thesis:
        "Defense AI spending will accelerate faster than commercial AI; PLTR pure play.",
      primaryTicker: "PLTR",
      primaryDirection: "long",
      primaryInstrument: "perp",
      primaryEntryPrice: 133.09,
      primaryRiskUsd: 665,
      invalidateCondition: "dies if peace breaks out",
      killConditions: ["peace breaks out"],
      rubric: {
        alignment: "pure_play",
        edge: "emerging",
        payoffShape: "high",
        timingForgiveness: "forgiving",
      },
    };
    fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2), "utf-8");

    const raw = fs.readFileSync(fixturePath, "utf-8");
    const parsed = JSON.parse(raw) as {
      primaryTicker: string;
      rubric: Parameters<typeof wttRubricToSignal>[0];
    };
    expect(parsed.primaryTicker).toBe("PLTR");
    expect(normalizeWttTicker(parsed.primaryTicker)).toBe("PLTR");

    const { strength, confidence } = wttRubricToSignal(parsed.rubric);
    expect(strength).toBeGreaterThanOrEqual(70);
    expect(confidence).toBeGreaterThanOrEqual(65);
  });

  it("rejects fixture with ticker not in universe when normalized", () => {
    expect(normalizeWttTicker("TLT")).toBeNull();
    expect(normalizeWttTicker("SPY")).toBeNull();
  });
});
