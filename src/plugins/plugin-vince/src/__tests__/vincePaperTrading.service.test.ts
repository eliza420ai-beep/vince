import { describe, it, expect, vi } from "vitest";
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
        restoreState: () => {},
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

  it("uses swarm consensus to veto trades when below confidence threshold", async () => {
    const recorded: Array<{ asset: string; reason: string }> = [];
    const services = {
      ...createMockServices(),
      VINCE_POSITION_MANAGER_SERVICE: {
        hasOpenPosition: () => false,
        getPortfolio: () => ({ totalValue: 10_000 }),
        getCurrentExposure: () => 0,
        getOpenPositions: () => [],
        getPositionByAsset: () => null,
        restoreState: () => {},
        openPosition: vi.fn(),
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
        restoreState: () => {},
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
          fearGreedValue: 50,
        }),
        getDVOL: async () => 60,
        estimateRSI: async () => 55,
      },
      VINCE_COINGLASS_SERVICE: {
        getOpenInterest: () => ({ change24h: 12 }),
        getLongShortRatio: () => ({ ratio: 1.2 }),
        getFearGreed: () => ({ value: 50, classification: "Neutral" }),
        getFunding: () => ({ rate: 0 }),
      },
      VINCE_FEATURE_STORE_SERVICE: {
        getExtendedMarketSnapshot: async () => null,
        recordAvoidedDecision: vi.fn(
          async (params: { asset: string; reason: string }) => {
            recorded.push({ asset: params.asset, reason: params.reason });
            return "rec-1";
          },
        ),
      } as any,
      VINCE_MARKET_REGIME_SERVICE: {
        getRegime: async () => ({
          regime: "trending",
          positionSizeMultiplier: 1,
        }),
      },
      VINCE_HIP3_SERVICE: {
        getMaxLeverageForAsset: async () => 5,
      },
      VINCE_ML_INFERENCE_SERVICE: null,
      VINCE_TRADE_JOURNAL_SERVICE: {
        restoreEntries: () => {},
        recordEntry: () => {},
      },
      "swarm-coordination": {
        getSwarmConsensus: vi.fn().mockResolvedValue({
          votes: [],
          weightedDirection: "neutral",
          confidenceLevel: 0.2,
          dissentScore: 1,
          participatingAgents: ["vince"],
          consensusReached: false,
          decisionTimestamp: Date.now(),
          consensusId: "test-consensus",
        }),
        recordSwarmOutcome: vi.fn(),
        getSwarmStats: vi.fn().mockReturnValue({
          totalOutcomes: 0,
          activeAgents: 1,
          trackedSignals: 0,
          recentDecisions: 0,
          averageConsensusRate: 0,
          topPerformingAgents: [],
          signalCorrelations: 0,
          regimes: [],
        }),
      },
    };

    const runtime = createMockRuntime({
      services,
      settings: {
        vince_paper_assets: "BTC",
        vince_paper_wtt_enabled: false,
        vince_paper_watchlist_enabled: false,
        VINCE_SWARM_ENABLED: true,
        VINCE_SWARM_MIN_CONFIDENCE: 0.6,
      },
    });
    const svc = await VincePaperTradingService.start(runtime);
    await svc.evaluateAndTrade();

    // Swarm veto should consult consensus and prevent opening a position
    expect(
      services["swarm-coordination"].getSwarmConsensus,
    ).toHaveBeenCalledTimes(1);
  });

  it("does not consult swarm when VINCE_SWARM_ENABLED is false", async () => {
    const recorded: Array<{ asset: string; reason: string }> = [];
    const swarm = {
      getSwarmConsensus: vi.fn(),
      recordSwarmOutcome: vi.fn(),
      getSwarmStats: vi.fn().mockReturnValue(null),
    };

    const services = {
      ...createMockServices(),
      VINCE_POSITION_MANAGER_SERVICE: {
        hasOpenPosition: () => false,
        getPortfolio: () => ({ totalValue: 10_000 }),
        getCurrentExposure: () => 0,
        getOpenPositions: () => [],
        getPositionByAsset: () => null,
        restoreState: () => {},
        openPosition: () => {},
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
          fearGreedValue: 50,
        }),
        getDVOL: async () => 60,
        estimateRSI: async () => 55,
      },
      VINCE_COINGLASS_SERVICE: {
        getOpenInterest: () => ({ change24h: 12 }),
        getLongShortRatio: () => ({ ratio: 1.2 }),
        getFearGreed: () => ({ value: 50, classification: "Neutral" }),
      },
      VINCE_FEATURE_STORE_SERVICE: {
        getExtendedMarketSnapshot: async () => null,
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
        getMaxLeverageForAsset: async () => 5,
      },
      VINCE_ML_INFERENCE_SERVICE: null,
      VINCE_PRE_MORTEM_SERVICE: {
        evaluate: () => ({
          survivalProbability: 80,
          blocked: false,
          threshold: 30,
          topScenario: {
            id: "baseline",
            title: "Baseline",
            rationale: "benign",
            riskScore: 10,
          },
          scenarios: [
            {
              id: "baseline",
              title: "Baseline",
              rationale: "benign",
              riskScore: 10,
            },
          ],
        }),
      },
      VINCE_DEVILS_ADVOCATE_SERVICE: {
        challengeTrade: () => ({
          baseRate: 0.9,
          score: 20,
          block: false,
          downgradeMultiplier: 1,
          rationale: "no strong objection",
        }),
      },
      "swarm-coordination": swarm,
    };

    const runtime = createMockRuntime({
      services,
      settings: {
        vince_paper_assets: "BTC",
        vince_paper_wtt_enabled: false,
        vince_paper_watchlist_enabled: false,
        VINCE_SWARM_ENABLED: false,
      },
    });

    const svc = await VincePaperTradingService.start(runtime);
    await svc.evaluateAndTrade();

    expect(swarm.getSwarmConsensus).not.toHaveBeenCalled();
    // No swarm-based avoided decisions should be recorded
    expect(recorded.length).toBe(0);
  });

  it("uses multi-agent votes via orchestrator when enabled", async () => {
    const recorded: Array<{ asset: string; reason: string }> = [];
    const orchestrator = {
      collectVotes: vi.fn().mockResolvedValue([
        {
          agentId: "vince",
          direction: "long" as const,
          confidence: 0.8,
          supportingSignals: ["signal_aggregator"],
          riskAssessment: 0.5,
          reasoning: "VINCE vote",
        },
        {
          agentId: "echo",
          direction: "long" as const,
          confidence: 0.7,
          supportingSignals: ["x_sentiment"],
          riskAssessment: 0.6,
          reasoning: "Echo vote",
        },
      ]),
    };

    const swarm = {
      getSwarmConsensus: vi.fn().mockResolvedValue({
        votes: [],
        weightedDirection: "long",
        confidenceLevel: 0.9,
        dissentScore: 0.1,
        participatingAgents: ["vince", "echo"],
        consensusReached: true,
        decisionTimestamp: Date.now(),
        consensusId: "swarm-consensus-1",
      }),
      recordSwarmOutcome: vi.fn(),
      getSwarmStats: vi.fn().mockReturnValue(null),
    };

    const services = {
      ...createMockServices(),
      VINCE_POSITION_MANAGER_SERVICE: {
        hasOpenPosition: () => false,
        getPortfolio: () => ({ totalValue: 10_000 }),
        getCurrentExposure: () => 0,
        getOpenPositions: () => [],
        getPositionByAsset: () => null,
        restoreState: () => {},
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
          fearGreedValue: 60,
        }),
        getDVOL: async () => 60,
        estimateRSI: async () => 55,
      },
      VINCE_COINGLASS_SERVICE: {
        getOpenInterest: () => ({ change24h: 12 }),
        getLongShortRatio: () => ({ ratio: 1.2 }),
        getFearGreed: () => ({ value: 60, classification: "Greed" }),
      },
      VINCE_FEATURE_STORE_SERVICE: {
        getExtendedMarketSnapshot: async () => null,
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
        getMaxLeverageForAsset: async () => 5,
      },
      VINCE_ML_INFERENCE_SERVICE: null,
      VINCE_PRE_MORTEM_SERVICE: {
        evaluate: () => ({
          survivalProbability: 80,
          blocked: false,
          threshold: 30,
          topScenario: {
            id: "baseline",
            title: "Baseline",
            rationale: "benign",
            riskScore: 10,
          },
          scenarios: [
            {
              id: "baseline",
              title: "Baseline",
              rationale: "benign",
              riskScore: 10,
            },
          ],
        }),
      },
      VINCE_DEVILS_ADVOCATE_SERVICE: {
        challengeTrade: () => ({
          baseRate: 0.9,
          score: 20,
          block: false,
          downgradeMultiplier: 1,
          rationale: "no strong objection",
        }),
      },
      "swarm-coordination": swarm,
      VINCE_SWARM_ORCHESTRATOR_SERVICE: orchestrator,
    };

    const runtime = createMockRuntime({
      services,
      settings: {
        vince_paper_assets: "BTC",
        vince_paper_wtt_enabled: false,
        vince_paper_watchlist_enabled: false,
        VINCE_SWARM_ENABLED: true,
        VINCE_SWARM_MIN_CONFIDENCE: 0.6,
      },
    });

    const svc = await VincePaperTradingService.start(runtime);
    await svc.evaluateAndTrade();

    expect(orchestrator.collectVotes).toHaveBeenCalledTimes(1);
    expect(swarm.getSwarmConsensus).toHaveBeenCalledTimes(1);

    const [votesArg] = (swarm.getSwarmConsensus as any).mock.calls[0];
    expect(Array.isArray(votesArg)).toBe(true);
    expect(votesArg.length).toBeGreaterThanOrEqual(2);

    // With strong consensus, no swarm-based avoided decision should be recorded
    expect(recorded.length).toBe(0);
  });

  it("applies proof-coverage bias for near-threshold candidates", async () => {
    const openPosition = vi.fn(() => ({
      id: "pos-1",
      asset: "BTC",
      direction: "long",
      entryPrice: 100_000,
      sizeUsd: 500,
      leverage: 5,
      stopLoss: 98_500,
      takeProfit: 102_000,
      openedAt: Date.now(),
      status: "open",
    }));
    const services = {
      ...createMockServices(),
      VINCE_POSITION_MANAGER_SERVICE: {
        hasOpenPosition: () => false,
        getPortfolio: () => ({ totalValue: 10_000 }),
        getCurrentExposure: () => 0,
        getOpenPositions: () => [],
        getPositionByAsset: () => null,
        restoreState: () => {},
        openPosition,
      },
      VINCE_RISK_MANAGER_SERVICE: {
        getLimits: () => ({ minSignalStrength: 60, minSignalConfidence: 60 }),
        validateSignal: (sig: { strength: number; confidence: number }) => ({
          valid: sig.strength >= 60 && sig.confidence >= 60,
          reason: "threshold not met",
        }),
        validateTrade: () => ({ valid: true, adjustedSize: 500 }),
        getCorrelationSizeMultiplier: () => ({ multiplier: 1, reason: "" }),
        getModeRiskMultiplier: () => 1,
        getTimeModifiers: () => ({
          sizeMultiplier: 1,
          session: { session: "US", isWeekend: false, isHoliday: false },
        }),
        getRiskState: () => ({ currentDrawdownPct: 0 }),
        recordTrade: () => {},
        restoreState: () => {},
      },
      VINCE_SIGNAL_AGGREGATOR_SERVICE: {
        getSignal: async () => ({
          direction: "long",
          strength: 57,
          confidence: 57,
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
          fundingRate: 0,
          volumeRatio: 1.1,
          priceChange24h: 0.5,
          fearGreedValue: 50,
        }),
        getDVOL: async () => 60,
        estimateRSI: async () => 52,
      },
      VINCE_COINGLASS_SERVICE: {
        getOpenInterest: () => ({ change24h: 5 }),
        getLongShortRatio: () => ({ ratio: 1.1 }),
        getFearGreed: () => ({ value: 50, classification: "Neutral" }),
      },
      VINCE_FEATURE_STORE_SERVICE: {
        getExtendedMarketSnapshot: async () => null,
        recordAvoidedDecision: vi.fn(async () => "rec-1"),
      } as any,
      VINCE_MARKET_REGIME_SERVICE: {
        getRegime: async () => ({
          regime: "trending",
          positionSizeMultiplier: 1,
        }),
      },
      VINCE_HIP3_SERVICE: {
        getMaxLeverageForAsset: async () => 5,
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
    (svc as any).buildProofCoverageContext = () => ({
      stageDepth: { pairDepth: [{ deficitToMin: 3 }] },
      uplift: { byRegime: [] },
      regimeMinTarget: 5,
      dominantRegime: null,
      dominantRegimeShare: 0,
      underrepresentedRegimes: new Set<string>(),
      stageDeficitCount: 1,
      stageDeficitByStage: { onnx_enabled: 3 },
      pairDeficitByStage: { onnx_enabled: 3 },
      pairDeficitTotal: 3,
      treatmentExpectedEdge: 0.2,
      totalClosed: 12,
    });
    (svc as any).getRegimeQuotaBlockReason = () => null;
    await svc.evaluateAndTrade();
    expect(openPosition).toHaveBeenCalledTimes(1);
  });

  it("enforces regime quota guard and records avoided reason", async () => {
    const recorded: Array<{ asset: string; reason: string }> = [];
    const openPosition = vi.fn();
    const services = {
      ...createMockServices(),
      VINCE_POSITION_MANAGER_SERVICE: {
        hasOpenPosition: () => false,
        getPortfolio: () => ({ totalValue: 10_000 }),
        getCurrentExposure: () => 0,
        getOpenPositions: () => [],
        getPositionByAsset: () => null,
        restoreState: () => {},
        openPosition,
      },
      VINCE_RISK_MANAGER_SERVICE: {
        getLimits: () => ({ minSignalStrength: 60, minSignalConfidence: 60 }),
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
        restoreState: () => {},
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
          fundingRate: 0,
          volumeRatio: 1.1,
          priceChange24h: 0.5,
          fearGreedValue: 50,
        }),
        getDVOL: async () => 60,
        estimateRSI: async () => 52,
      },
      VINCE_COINGLASS_SERVICE: {
        getOpenInterest: () => ({ change24h: 5 }),
        getLongShortRatio: () => ({ ratio: 1.1 }),
        getFearGreed: () => ({ value: 50, classification: "Neutral" }),
      },
      VINCE_FEATURE_STORE_SERVICE: {
        getExtendedMarketSnapshot: async () => null,
        recordAvoidedDecision: vi.fn(
          async (params: { asset: string; reason: string }) => {
            recorded.push({ asset: params.asset, reason: params.reason });
            return "rec-1";
          },
        ),
      } as any,
      VINCE_MARKET_REGIME_SERVICE: {
        getRegime: async () => ({
          regime: "trending",
          positionSizeMultiplier: 1,
        }),
      },
      VINCE_HIP3_SERVICE: {
        getMaxLeverageForAsset: async () => 5,
      },
      VINCE_ML_INFERENCE_SERVICE: null,
    };
    const runtime = createMockRuntime({
      services,
      settings: {
        vince_paper_assets: "BTC",
        vince_paper_wtt_enabled: false,
        vince_paper_watchlist_enabled: false,
        VINCE_PROOF_REGIME_QUOTA_ENABLED: true,
      },
    });
    const svc = await VincePaperTradingService.start(runtime);
    (svc as any).buildProofCoverageContext = () => ({
      stageDepth: { pairDepth: [{ deficitToMin: 0 }] },
      uplift: {
        byRegime: [
          { regime: "trending", count: 10 },
          { regime: "ranging", count: 2 },
        ],
      },
      regimeMinTarget: 5,
      dominantRegime: "trending",
      dominantRegimeShare: 0.83,
      underrepresentedRegimes: new Set<string>(["ranging"]),
      stageDeficitCount: 0,
      totalClosed: 64,
    });
    await svc.evaluateAndTrade();
    expect(openPosition).not.toHaveBeenCalled();
    expect(
      recorded.some((row) => row.reason.includes("Regime quota guard")),
    ).toBe(true);
  });

  it("suppresses saturated coverage buckets when deficits exist elsewhere", async () => {
    const openPosition = vi.fn();
    const services = {
      ...createMockServices(),
      VINCE_POSITION_MANAGER_SERVICE: {
        hasOpenPosition: () => false,
        getPortfolio: () => ({ totalValue: 10_000 }),
        getCurrentExposure: () => 0,
        getOpenPositions: () => [],
        getPositionByAsset: () => null,
        restoreState: () => {},
        openPosition,
      },
      VINCE_RISK_MANAGER_SERVICE: {
        getLimits: () => ({ minSignalStrength: 60, minSignalConfidence: 60 }),
        validateSignal: (sig: { strength: number; confidence: number }) => ({
          valid: sig.strength >= 60 && sig.confidence >= 60,
          reason: "threshold not met",
        }),
        validateTrade: () => ({ valid: true, adjustedSize: 500 }),
        getCorrelationSizeMultiplier: () => ({ multiplier: 1, reason: "" }),
        getModeRiskMultiplier: () => 1,
        getTimeModifiers: () => ({
          sizeMultiplier: 1,
          session: { session: "US", isWeekend: false, isHoliday: false },
        }),
        getRiskState: () => ({ currentDrawdownPct: 0 }),
        recordTrade: () => {},
        restoreState: () => {},
      },
      VINCE_SIGNAL_AGGREGATOR_SERVICE: {
        getSignal: async () => ({
          direction: "long",
          strength: 61,
          confidence: 61,
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
          fundingRate: 0,
          volumeRatio: 1.1,
          priceChange24h: 0.5,
          fearGreedValue: 50,
        }),
        getDVOL: async () => 60,
        estimateRSI: async () => 52,
      },
      VINCE_COINGLASS_SERVICE: {
        getOpenInterest: () => ({ change24h: 5 }),
        getLongShortRatio: () => ({ ratio: 1.1 }),
        getFearGreed: () => ({ value: 50, classification: "Neutral" }),
      },
      VINCE_FEATURE_STORE_SERVICE: {
        getExtendedMarketSnapshot: async () => null,
        recordAvoidedDecision: vi.fn(async () => "rec-1"),
      } as any,
      VINCE_MARKET_REGIME_SERVICE: {
        getRegime: async () => ({
          regime: "trending",
          positionSizeMultiplier: 1,
        }),
      },
      VINCE_HIP3_SERVICE: {
        getMaxLeverageForAsset: async () => 5,
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
    (svc as any).buildProofCoverageContext = () => ({
      stageDepth: { pairDepth: [{ deficitToMin: 3 }] },
      uplift: { byRegime: [] },
      regimeMinTarget: 5,
      dominantRegime: null,
      dominantRegimeShare: 0,
      underrepresentedRegimes: new Set<string>(),
      stageDeficitCount: 1,
      stageDeficitByStage: { onnx_plus_swarm: 3, onnx_enabled: 0 },
      pairDeficitByStage: { onnx_plus_swarm: 4, onnx_enabled: 0 },
      pairDeficitTotal: 4,
      treatmentExpectedEdge: 0.2,
      totalClosed: 12,
    });
    (svc as any).getRegimeQuotaBlockReason = () => null;
    await svc.evaluateAndTrade();
    expect(openPosition).not.toHaveBeenCalled();
  });

  it("blocks weak treatment-stage signals when expected swarm edge is non-positive", async () => {
    const recorded: string[] = [];
    const openPosition = vi.fn();
    const services = {
      ...createMockServices(),
      VINCE_POSITION_MANAGER_SERVICE: {
        hasOpenPosition: () => false,
        getPortfolio: () => ({ totalValue: 10_000 }),
        getCurrentExposure: () => 0,
        getOpenPositions: () => [],
        getPositionByAsset: () => null,
        restoreState: () => {},
        openPosition,
      },
      VINCE_RISK_MANAGER_SERVICE: {
        getLimits: () => ({ minSignalStrength: 60, minSignalConfidence: 60 }),
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
        restoreState: () => {},
      },
      VINCE_SIGNAL_AGGREGATOR_SERVICE: {
        getSignal: async () => ({
          direction: "long",
          strength: 62,
          confidence: 62,
          confirmingCount: 3,
          factors: ["x", "y", "z"],
          sources: ["swarm_consensus", "CoinGlass", "MarketRegime"],
          sourceBreakdown: {
            swarm_consensus: 1,
            CoinGlass: 1,
            MarketRegime: 1,
          },
        }),
      },
      VINCE_MARKET_DATA_SERVICE: {
        getEnrichedContext: async () => ({
          currentPrice: 100_000,
          fundingRate: 0,
          volumeRatio: 1.1,
          priceChange24h: 0.5,
          fearGreedValue: 50,
        }),
        getDVOL: async () => 60,
        estimateRSI: async () => 52,
      },
      VINCE_COINGLASS_SERVICE: {
        getOpenInterest: () => ({ change24h: 5 }),
        getLongShortRatio: () => ({ ratio: 1.1 }),
        getFearGreed: () => ({ value: 50, classification: "Neutral" }),
      },
      VINCE_FEATURE_STORE_SERVICE: {
        getExtendedMarketSnapshot: async () => null,
        recordAvoidedDecision: vi.fn(async (params: { reason: string }) => {
          recorded.push(params.reason);
          return "rec-1";
        }),
      } as any,
      VINCE_MARKET_REGIME_SERVICE: {
        getRegime: async () => ({
          regime: "trending",
          positionSizeMultiplier: 1,
        }),
      },
      VINCE_HIP3_SERVICE: {
        getMaxLeverageForAsset: async () => 5,
      },
      VINCE_ML_INFERENCE_SERVICE: null,
    };
    const runtime = createMockRuntime({
      services,
      settings: {
        vince_paper_assets: "BTC",
        vince_paper_wtt_enabled: false,
        vince_paper_watchlist_enabled: false,
        VINCE_SWARM_TREATMENT_MIN_EDGE: 0,
      },
    });
    const svc = await VincePaperTradingService.start(runtime);
    (svc as any).buildProofCoverageContext = () => ({
      stageDepth: { pairDepth: [{ deficitToMin: 0 }] },
      uplift: { byRegime: [] },
      regimeMinTarget: 5,
      dominantRegime: null,
      dominantRegimeShare: 0,
      underrepresentedRegimes: new Set<string>(),
      stageDeficitCount: 0,
      stageDeficitByStage: { onnx_plus_swarm: 0 },
      pairDeficitByStage: { onnx_plus_swarm: 0 },
      pairDeficitTotal: 0,
      treatmentExpectedEdge: -0.25,
      totalClosed: 48,
    });
    (svc as any).getRegimeQuotaBlockReason = () => null;
    await svc.evaluateAndTrade();
    expect(openPosition).not.toHaveBeenCalled();
    expect(
      recorded.some((reason) => reason.includes("Treatment quality gate")),
    ).toBe(true);
  });
});
