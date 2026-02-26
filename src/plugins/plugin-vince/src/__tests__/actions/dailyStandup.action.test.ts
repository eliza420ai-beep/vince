/**
 * VINCE Daily Standup Action Tests
 *
 * Tests for the daily standup action that aggregates:
 * - Flywheel score from VinceGenomeService
 * - Genome evolution from VinceParameterTunerService
 * - Paper trading performance from VinceTradeJournalService
 * - Signal source rankings from VinceTradeJournalService
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "../test-utils";
import { vinceDailyStandupAction } from "../../actions/dailyStandup.action";

// ==========================================
// Mock Data for Services
// ==========================================

const mockGenomeData = {
  generation: 15,
  history: [
    {
      generation: 14,
      timestamp: Date.now() - 86400000, // 1 day ago
      candidateCount: 5,
      bestFitness: 0.823,
      currentFitness: 0.801,
      promoted: false,
      promotedGenomeId: null,
      topCandidates: [
        {
          genomeId: "genome-14-1",
          fitness: 0.823,
          winRate: 62.1,
          sharpe: 1.18,
        },
      ],
    },
    {
      generation: 15,
      timestamp: Date.now() - 3600000, // 1 hour ago
      candidateCount: 5,
      bestFitness: 0.847,
      currentFitness: 0.823,
      promoted: true,
      promotedGenomeId: "genome-15-2",
      promotionReason: "improved Sharpe ratio",
      topCandidates: [
        {
          genomeId: "genome-15-2",
          fitness: 0.847,
          winRate: 64.2,
          sharpe: 1.23,
        },
      ],
    },
  ],
};

const mockTunerData = {
  lastAnalysis: {
    timestamp: Date.now() - 1800000, // 30 minutes ago
    overallWinRate: 68.1,
    totalTrades: 42,
    suggestedThresholdChanges: [
      {
        parameter: "minStrength",
        currentValue: 70,
        suggestedValue: 72,
        reason: "improve precision",
      },
      {
        parameter: "minConfidence",
        currentValue: 65,
        suggestedValue: 67,
        reason: "reduce false signals",
      },
    ],
  },
};

const mockTradeJournalData = {
  stats: {
    totalPnl: 1247.83,
    winRate: 61.3,
    totalTrades: 28,
    winCount: 17,
    lossCount: 11,
    avgPnlPerTrade: 44.56,
    avgWin: 125.5,
    avgLoss: -82.3,
    maxDrawdown: -156.0,
    sharpeRatio: 1.18,
  },
  signalRankings: [
    {
      source: "Binance Top Traders",
      winRate: 72.4,
      totalPnl: 856.23,
      avgPnlPerTrade: 52.34,
      trades: 18,
    },
    {
      source: "CoinGlass Funding",
      winRate: 65.8,
      totalPnl: 543.12,
      avgPnlPerTrade: 45.26,
      trades: 12,
    },
    {
      source: "Liquidation Pressure",
      winRate: 58.9,
      totalPnl: 234.67,
      avgPnlPerTrade: 26.07,
      trades: 9,
    },
  ],
};

// ==========================================
// Mock Services Factory
// ==========================================

function createMockStandupServices() {
  return {
    VINCE_GENOME_SERVICE: {
      getGeneration: () => mockGenomeData.generation,
      getHistory: () => mockGenomeData.history,
    },
    VINCE_PARAMETER_TUNER_SERVICE: {
      getLastAnalysis: () => mockTunerData.lastAnalysis,
    },
    VINCE_TRADE_JOURNAL_SERVICE: {
      getStats: () => mockTradeJournalData.stats,
      getSignalRankings: () => mockTradeJournalData.signalRankings,
    },
    VINCE_SIGNAL_AGGREGATOR_SERVICE: {
      // Used for source attribution but not direct data fetching
      refreshData: async () => {},
    },
  };
}

// ==========================================
// VINCE_DAILY_STANDUP Tests
// ==========================================

describe("VINCE_DAILY_STANDUP Action", () => {
  describe("validate", () => {
    const testCases = [
      { input: "standup", expected: true },
      { input: "daily standup", expected: true },
      { input: "standup update", expected: true },
      { input: "standup report", expected: true },
      { input: "briefing", expected: true },
      { input: "daily briefing", expected: true },
      { input: "give me a briefing", expected: true },
      { input: "give me a standup", expected: true },
      { input: "daily standup update", expected: true },
      { input: "what's the standup", expected: true },
      { input: "unrelated message", expected: false },
      { input: "status", expected: false },
      { input: "report", expected: false }, // Should not match general "report"
      { input: "perps", expected: false },
      { input: "options", expected: false },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should return ${expected} for "${input}"`, async () => {
        const runtime = createMockRuntime();
        const message = createMockMessage(input);
        const result = await vinceDailyStandupAction.validate(runtime, message);
        expect(result).toBe(expected);
      });
    });
  });

  describe("handler", () => {
    it("should generate standup summary with all services available", async () => {
      const mockServices = createMockStandupServices();

      const runtime = createMockRuntime({
        services: mockServices,
        useModel: async () => {
          return "🧬 **Genome Status**: Generation 15, fitness 0.847, strong evolution with 64.2% win rate\n\n🔧 **Parameter Tuning**: Latest optimization improved signal thresholds, now at 68.1% win rate over 42 trades\n\n📊 **Paper Trading (7D)**: +$1,247.83 P&L, 61.3% win rate, solid momentum\n\n🎯 **Top Signal Sources**: Binance Top Traders (72.4% win), CoinGlass Funding (65.8% win), Liquidation Pressure (58.9% win)";
        },
      });

      const message = createMockMessage("daily standup");
      const state = createMockState();
      const callback = createMockCallback();

      await vinceDailyStandupAction.handler(
        runtime,
        message,
        state,
        {},
        callback,
      );

      expect(callback.calls).toHaveLength(1);
      const response = callback.calls[0];

      expect(response.text).toContain("Daily Standup");
      expect(response.text).toContain("🧬");
      expect(response.text).toContain("Generation 15");
      expect(response.text).toContain(
        "Source: Genome Service, Parameter Tuner, Trade Journal, Signal Aggregator",
      );
      expect(response.actions).toContain("VINCE_DAILY_STANDUP");
    });

    it("should handle missing genome service gracefully", async () => {
      const mockServices = createMockStandupServices();
      delete mockServices.VINCE_GENOME_SERVICE;

      const runtime = createMockRuntime({
        services: mockServices,
        useModel: async () => {
          return "🔧 **Parameter Tuning**: Latest optimization improved signal thresholds, now at 68.1% win rate over 42 trades\n\n📊 **Paper Trading (7D)**: +$1,247.83 P&L, 61.3% win rate, solid momentum\n\n🎯 **Top Signal Sources**: Binance Top Traders (72.4% win), CoinGlass Funding (65.8% win), Liquidation Pressure (58.9% win)";
        },
      });

      const message = createMockMessage("standup");
      const state = createMockState();
      const callback = createMockCallback();

      await vinceDailyStandupAction.handler(
        runtime,
        message,
        state,
        {},
        callback,
      );

      expect(callback.calls).toHaveLength(1);
      const response = callback.calls[0];

      expect(response.text).toContain("Daily Standup");
      expect(response.text).not.toContain("Genome Service"); // Should not be in sources
      expect(response.actions).toContain("VINCE_DAILY_STANDUP");
    });

    it("should handle complete action failure gracefully", async () => {
      // Mock runtime with broken getService that throws
      const runtime = {
        getService: () => {
          throw new Error("Runtime service failure");
        },
        useModel: async () => "Mock response",
      } as any;

      const message = createMockMessage("standup");
      const state = createMockState();
      const callback = createMockCallback();

      await vinceDailyStandupAction.handler(
        runtime,
        message,
        state,
        {},
        callback,
      );

      expect(callback.calls).toHaveLength(1);
      const response = callback.calls[0];

      expect(response.text).toContain(
        "Unable to generate daily standup summary",
      );
      expect(response.actions).toContain("VINCE_DAILY_STANDUP");
    });

    it("should include correct timestamp format", async () => {
      const mockServices = createMockStandupServices();

      const runtime = createMockRuntime({
        services: mockServices,
        useModel: async () => "Mock standup response",
      });

      const message = createMockMessage("standup");
      const state = createMockState();
      const callback = createMockCallback();

      await vinceDailyStandupAction.handler(
        runtime,
        message,
        state,
        {},
        callback,
      );

      expect(callback.calls).toHaveLength(1);
      const response = callback.calls[0];

      // Should contain timestamp in format like "2:30 PM"
      expect(response.text).toMatch(
        /\*\*Daily Standup\*\* _\d{1,2}:\d{2} [AP]M_/,
      );
    });
  });
});
