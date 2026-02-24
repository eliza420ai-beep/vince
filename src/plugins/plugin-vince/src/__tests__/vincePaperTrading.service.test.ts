import { describe, it, expect } from "vitest";
import { VincePaperTradingService } from "../services/vincePaperTrading.service";
import { createMockRuntime, createMockServices } from "./test-utils";

describe("VincePaperTradingService integration", () => {
  it("blocks trade when pre-mortem blocks and records avoided decision", async () => {
    const recorded: Array<{ asset: string; reason: string }> = [];
    const services = {
      ...createMockServices(),
      VINCE_POSITION_MANAGER_SERVICE: {
        hasOpenPosition: () => false,
        getPortfolio: () => ({ totalValue: 10_000 }),
        getCurrentExposure: () => 0,
        getOpenPositions: () => [],
      },
      VINCE_RISK_MANAGER_SERVICE: {
        validateSignal: () => ({ valid: true }),
        validateTrade: () => ({ valid: true, adjustedSize: 500 }),
        getCorrelationSizeMultiplier: () => ({ multiplier: 1, reason: "" }),
        getModeRiskMultiplier: () => 1,
        getTimeModifiers: () => ({
          sizeMultiplier: 1,
          session: { session: "US", isWeekend: false, isHoliday: false },
        }),
        getRiskState: () => ({ currentDrawdownPct: 0 }),
        recordTrade: () => {},
      },
      VINCE_SIGNAL_AGGREGATOR_SERVICE: {
        getSignal: async () => ({
          direction: "long",
          strength: 70,
          confidence: 72,
          confirmingCount: 3,
          factors: ["x", "y", "z"],
          sources: ["BinanceTopTraders", "CoinGlass", "MarketRegime"],
          sourceBreakdown: {
            BinanceTopTraders: 1,
            CoinGlass: 1,
            MarketRegime: 1,
          },
        }),
      },
      VINCE_MARKET_DATA_SERVICE: {
        getEnrichedContext: async () => ({
          currentPrice: 100_000,
          fundingRate: 0.01,
          volumeRatio: 1.2,
          priceChange24h: 1.5,
          fearGreedValue: 82,
        }),
        getDVOL: async () => 82,
        estimateRSI: async () => 55,
      },
      VINCE_COINGLASS_SERVICE: {
        getOpenInterest: () => ({ change24h: 12 }),
        getLongShortRatio: () => ({ ratio: 1.9 }),
        getFearGreed: () => ({ value: 82, classification: "Greed" }),
      },
      VINCE_PRE_MORTEM_SERVICE: {
        evaluate: () => ({
          survivalProbability: 80,
          blocked: false,
          threshold: 30,
          topScenario: {
            id: "crowding-reversal",
            title: "Crowding reversal",
            rationale: "test",
            riskScore: 90,
          },
          scenarios: [
            {
              id: "crowding-reversal",
              title: "Crowding reversal",
              rationale: "test",
              riskScore: 90,
            },
          ],
        }),
      },
      VINCE_DEVILS_ADVOCATE_SERVICE: {
        challengeTrade: () => ({
          baseRate: 0.9,
          score: 90,
          block: true,
          downgradeMultiplier: 0,
          rationale: "counter-thesis strong",
        }),
      },
      VINCE_FEATURE_STORE_SERVICE: {
        getExtendedMarketSnapshot: async () => ({
          bookImbalance: 0,
          priceVsSma20: 1,
          fundingDelta: 0,
          dvol: 82,
        }),
        recordAvoidedDecision: async (params: {
          asset: string;
          reason: string;
        }) => {
          recorded.push({ asset: params.asset, reason: params.reason });
          return "rec-1";
        },
      },
      VINCE_MARKET_REGIME_SERVICE: {
        getRegime: async () => ({
          regime: "trending",
          positionSizeMultiplier: 1,
        }),
      },
      VINCE_HIP3_SERVICE: {
        getMaxLeverageForAsset: async () => 10,
      },
      VINCE_ML_INFERENCE_SERVICE: null,
    };

    const runtime = createMockRuntime({
      services,
      settings: {
        vince_paper_assets: "BTC",
        vince_paper_wtt_enabled: false,
        vince_paper_watchlist_enabled: false,
      },
    });
    const svc = await VincePaperTradingService.start(runtime);
    await svc.evaluateAndTrade();
    expect(recorded.length).toBeGreaterThan(0);
    const devilRecord = recorded.find((r) =>
      r.reason.includes("Devil's advocate"),
    );
    expect(devilRecord).toBeTruthy();
  });
});
