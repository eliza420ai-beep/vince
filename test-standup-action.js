#!/usr/bin/env node

/**
 * Direct test of the DAILY_STANDUP action functionality
 * This simulates how the action would work in a real environment
 */

import { vinceDailyStandupAction } from './src/plugins/plugin-vince/src/actions/dailyStandup.action.ts';

// Mock runtime with sample data
const mockRuntime = {
  getService: (serviceName) => {
    const services = {
      'VINCE_GENOME_SERVICE': {
        getGeneration: () => 15,
        getHistory: () => [{
          generation: 15,
          timestamp: Date.now() - 3600000, // 1 hour ago
          candidateCount: 5,
          bestFitness: 0.847,
          currentFitness: 0.823,
          promoted: true,
          promotedGenomeId: "genome-15-2",
          promotionReason: "improved Sharpe ratio",
          topCandidates: [{
            genomeId: "genome-15-2",
            fitness: 0.847,
            winRate: 64.2,
            sharpe: 1.23,
          }],
        }],
      },
      'VINCE_PARAMETER_TUNER_SERVICE': {
        getLastAnalysis: () => ({
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
        }),
      },
      'VINCE_TRADE_JOURNAL_SERVICE': {
        getStats: () => ({
          totalPnl: 1247.83,
          winRate: 61.3,
          totalTrades: 28,
          winCount: 17,
          lossCount: 11,
          avgPnlPerTrade: 44.56,
          avgWin: 125.50,
          avgLoss: -82.30,
          maxDrawdown: -156.00,
          sharpeRatio: 1.18,
        }),
        getSignalRankings: () => [
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
      },
      'VINCE_SIGNAL_AGGREGATOR_SERVICE': {
        refreshData: async () => {},
      },
    };
    return services[serviceName];
  },
  useModel: async () => {
    return `🧬 **Genome Status**: Generation 15, fitness 0.847, evolving strong with 64.2% win rate

🔧 **Parameter Tuning**: Last optimization improved signal thresholds, now at 68.1% win rate over 42 trades

📊 **Paper Trading (7D)**: +$1,247.83 P&L, 61.3% win rate, solid momentum

🎯 **Top Signal Sources**: Binance Top Traders (72.4% win), CoinGlass Funding (65.8% win), Liquidation Pressure (58.9% win)`;
  }
};

// Mock message
const mockMessage = {
  content: { text: "daily standup" }
};

// Mock state
const mockState = {};

// Mock callback to capture output
let capturedOutput = null;
const mockCallback = async (output) => {
  capturedOutput = output;
};

// Test the action
console.log("🧪 Testing DAILY_STANDUP Action...\n");

try {
  // Test validation
  const isValid = await vinceDailyStandupAction.validate(mockRuntime, mockMessage);
  console.log(`✅ Validation: ${isValid ? 'PASSED' : 'FAILED'}`);

  // Test handler
  await vinceDailyStandupAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

  if (capturedOutput) {
    console.log(`✅ Handler: PASSED`);
    console.log(`🎯 Action: ${capturedOutput.actions?.join(', ') || 'N/A'}`);
    console.log(`\n📄 Generated Output:`);
    console.log("─".repeat(60));
    console.log(capturedOutput.text);
    console.log("─".repeat(60));
  } else {
    console.log(`❌ Handler: FAILED - No output captured`);
  }

} catch (error) {
  console.error(`❌ Test failed:`, error);
}