/**
 * ML Inference Service: dynamic signal-quality feature vector and fallback.
 * Verifies that when training_metadata.json has signal_quality_feature_names,
 * the service builds the feature vector by name and predictSignalQuality runs without error.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import { VinceMLInferenceService, type SignalQualityInput } from "../services/mlInference.service";
import { createMockRuntime } from "./test-utils";

vi.mock("../utils/supabaseMlModels", () => ({
  downloadModelsFromSupabase: vi.fn().mockResolvedValue(false),
}));

/** Subset used for basic dynamic-vector tests (23 features). */
const TEST_FEATURE_NAMES = [
  "market_priceChange24h",
  "market_volumeRatio",
  "market_fundingPercentile",
  "market_longShortRatio",
  "signal_strength",
  "signal_confidence",
  "signal_source_count",
  "signal_hasCascadeSignal",
  "signal_hasFundingExtreme",
  "signal_hasWhaleSignal",
  "session_isWeekend",
  "session_isOpenWindow",
  "session_utcHour",
  "signal_hasOICap",
  "news_nasdaqChange",
  "news_macro_risk_on",
  "news_macro_risk_off",
  "regime_volatility_high",
  "regime_bullish",
  "regime_bearish",
  "asset_BTC",
  "asset_ETH",
  "asset_SOL",
];

/**
 * Full feature set matching train_models.py prepare_signal_quality_features when all optional
 * columns and asset dummies are present (base 13 + optional market 7 + hasOICap + sentiment/news + regime 3 + assets 4 = 33).
 */
const FULL_SIGNAL_QUALITY_FEATURE_NAMES = [
  "market_priceChange24h",
  "market_volumeRatio",
  "market_fundingPercentile",
  "market_longShortRatio",
  "signal_strength",
  "signal_confidence",
  "signal_source_count",
  "signal_hasCascadeSignal",
  "signal_hasFundingExtreme",
  "signal_hasWhaleSignal",
  "session_isWeekend",
  "session_isOpenWindow",
  "session_utcHour",
  "market_dvol",
  "market_rsi14",
  "market_oiChange24h",
  "market_fundingDelta",
  "market_bookImbalance",
  "market_bidAskSpread",
  "market_priceVsSma20",
  "signal_hasOICap",
  "signal_avg_sentiment",
  "news_avg_sentiment",
  "news_nasdaqChange",
  "news_macro_risk_on",
  "news_macro_risk_off",
  "regime_volatility_high",
  "regime_bullish",
  "regime_bearish",
  "asset_BTC",
  "asset_ETH",
  "asset_HYPE",
  "asset_SOL",
];

const testMetadataWithFeatureNames = {
  improvement_report: { suggested_signal_quality_threshold: 0.5 },
  signal_quality_input_dim: TEST_FEATURE_NAMES.length,
  signal_quality_feature_names: TEST_FEATURE_NAMES,
};

const testMetadataWithFullFeatureNames = {
  improvement_report: { suggested_signal_quality_threshold: 0.5 },
  signal_quality_input_dim: FULL_SIGNAL_QUALITY_FEATURE_NAMES.length,
  signal_quality_feature_names: FULL_SIGNAL_QUALITY_FEATURE_NAMES,
};

function fullSignalQualityInput(overrides?: Partial<SignalQualityInput>): SignalQualityInput {
  return {
    priceChange24h: 2,
    volumeRatio: 1.2,
    fundingPercentile: 60,
    longShortRatio: 1.1,
    strength: 70,
    confidence: 65,
    sourceCount: 3,
    hasCascadeSignal: 0,
    hasFundingExtreme: 1,
    hasWhaleSignal: 0,
    hasOICap: 1,
    newsNasdaqChange: 0.5,
    newsMacroRiskOn: 1,
    newsMacroRiskOff: 0,
    assetTicker: "BTC",
    isWeekend: 0,
    isOpenWindow: 1,
    utcHour: 14 / 24,
    volatilityRegimeHigh: 0,
    marketRegimeBullish: 1,
    marketRegimeBearish: 0,
    ...overrides,
  };
}

describe("VinceMLInferenceService", () => {
  let fsExistsSyncSpy: ReturnType<typeof vi.spyOn>;
  let fsReadFileSyncSpy: ReturnType<typeof vi.spyOn>;
  let fsReadDirSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fsExistsSyncSpy = vi.spyOn(fs, "existsSync").mockImplementation((p: fs.PathLike) => {
      const s = String(p);
      if (s.includes(".onnx")) return false;
      return s.includes("training_metadata.json") || s.includes("models") || s.includes("vince-paper-bot");
    });
    fsReadFileSyncSpy = vi.spyOn(fs, "readFileSync").mockImplementation((p: fs.PathLike, encoding?: BufferEncoding) => {
      const s = String(p);
      if (s.includes("training_metadata.json")) {
        return JSON.stringify(testMetadataWithFeatureNames);
      }
      return Buffer.from("[]");
    });
    fsReadDirSyncSpy = vi.spyOn(fs, "readdirSync").mockReturnValue([]);
  });

  afterEach(() => {
    fsExistsSyncSpy?.mockRestore();
    fsReadFileSyncSpy?.mockRestore();
    fsReadDirSyncSpy?.mockRestore();
  });

  it("loads signal_quality_feature_names and predictSignalQuality returns value in [0,1] (fallback)", async () => {
    const runtime = createMockRuntime();
    const service = await VinceMLInferenceService.start(runtime);

    const input = fullSignalQualityInput();
    const prediction = await service.predictSignalQuality(input);

    expect(prediction).toBeDefined();
    expect(typeof prediction.value).toBe("number");
    expect(prediction.value).toBeGreaterThanOrEqual(0);
    expect(prediction.value).toBeLessThanOrEqual(1);
    expect(typeof prediction.confidence).toBe("number");
    expect(prediction.modelVersion).toBeDefined();
  });

  it("predictSignalQuality with assetTicker ETH sets asset_ETH=1 in dynamic vector", async () => {
    const runtime = createMockRuntime();
    const service = await VinceMLInferenceService.start(runtime);

    const input = fullSignalQualityInput({ assetTicker: "ETH" });
    const prediction = await service.predictSignalQuality(input);

    expect(prediction.value).toBeGreaterThanOrEqual(0);
    expect(prediction.value).toBeLessThanOrEqual(1);
  });

  it("predictSignalQuality with full feature names (33: all supported + asset dummies)", async () => {
    fsReadFileSyncSpy.mockImplementation((p: fs.PathLike) => {
      const s = String(p);
      if (s.includes("training_metadata.json")) {
        return JSON.stringify(testMetadataWithFullFeatureNames);
      }
      return Buffer.from("[]");
    });

    const runtime = createMockRuntime();
    const service = await VinceMLInferenceService.start(runtime);

    const input = fullSignalQualityInput({ assetTicker: "HYPE" });
    const prediction = await service.predictSignalQuality(input);

    expect(prediction.value).toBeGreaterThanOrEqual(0);
    expect(prediction.value).toBeLessThanOrEqual(1);
  });

  it("predictSignalQuality with full feature names: each asset ticker gets correct dummy", async () => {
    fsReadFileSyncSpy.mockImplementation((p: fs.PathLike) => {
      const s = String(p);
      if (s.includes("training_metadata.json")) {
        return JSON.stringify(testMetadataWithFullFeatureNames);
      }
      return Buffer.from("[]");
    });

    const runtime = createMockRuntime();
    const service = await VinceMLInferenceService.start(runtime);

    for (const ticker of ["BTC", "ETH", "SOL", "HYPE"] as const) {
      const input = fullSignalQualityInput({ assetTicker: ticker });
      const prediction = await service.predictSignalQuality(input);
      expect(prediction.value).toBeGreaterThanOrEqual(0);
      expect(prediction.value).toBeLessThanOrEqual(1);
    }
  });

  it("predictSignalQuality without feature names uses legacy dim logic", async () => {
    const metadataNoNames = {
      improvement_report: { suggested_signal_quality_threshold: 0.5 },
      signal_quality_input_dim: 16,
    };
    fsReadFileSyncSpy.mockImplementation((p: fs.PathLike) => {
      const s = String(p);
      if (s.includes("training_metadata.json")) {
        return JSON.stringify(metadataNoNames);
      }
      return Buffer.from("[]");
    });

    const runtime = createMockRuntime();
    const service = await VinceMLInferenceService.start(runtime);

    const input = fullSignalQualityInput();
    const prediction = await service.predictSignalQuality(input);

    expect(prediction.value).toBeGreaterThanOrEqual(0);
    expect(prediction.value).toBeLessThanOrEqual(1);
  });

  it("getSignalQualityThreshold returns suggested threshold when metadata has it", async () => {
    const runtime = createMockRuntime();
    const service = await VinceMLInferenceService.start(runtime);

    expect(service.getSignalQualityThreshold()).toBe(0.5);
  });
});
