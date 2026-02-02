/**
 * VINCE Trade Performance Evaluator
 * 
 * Runs after trades close to:
 * - Analyze trade outcomes and extract patterns
 * - Identify winning/losing signal combinations
 * - Store learnings in memory for future retrieval
 * - Trigger parameter tuning when thresholds are met
 * - Generate improvement journal entries for ClawdBot
 * 
 * This is a key component of the self-improving architecture:
 * The evaluator enables the system to learn from every trade.
 */

import type { Evaluator, Memory, State, IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VinceTradeJournalService } from "../services/vinceTradeJournal.service";
import type { VinceParameterTunerService } from "../services/parameterTuner.service";
import type { VinceImprovementJournalService } from "../services/improvementJournal.service";
import { dynamicConfig } from "../config/dynamicConfig";

// ==========================================
// Types
// ==========================================

interface TradeLearning {
  id: string;
  pattern: string;
  description: string;
  winRate: number;
  sampleSize: number;
  confidence: "low" | "medium" | "high";
  suggestedAction?: string;
  metadata: {
    avgPnlPct: number;
    signalSources: string[];
    marketRegimes?: string[];
    timeOfDay?: string;
  };
  createdAt: number;
}

interface PatternAnalysis {
  signalCombos: Map<string, { wins: number; losses: number; totalPnl: number }>;
  timePatterns: Map<string, { wins: number; losses: number }>;
  assetPatterns: Map<string, { wins: number; losses: number; totalPnl: number }>;
}

// ==========================================
// Pattern Detection
// ==========================================

/**
 * Analyze recent trades for patterns
 */
function analyzeTradePatterns(
  journal: VinceTradeJournalService
): PatternAnalysis {
  const analysis: PatternAnalysis = {
    signalCombos: new Map(),
    timePatterns: new Map(),
    assetPatterns: new Map(),
  };

  const recentTrades = journal.getRecentTrades(50);

  for (const { entry, exit } of recentTrades) {
    if (!exit?.realizedPnl) continue;

    const isWin = exit.realizedPnl > 0;
    const pnl = exit.realizedPnl;

    // Analyze signal combinations
    if (entry.signalDetails && entry.signalDetails.length > 0) {
      const sources = entry.signalDetails
        .map(s => s.source)
        .filter(Boolean)
        .sort()
        .join("+");
      
      if (sources) {
        const existing = analysis.signalCombos.get(sources) || { wins: 0, losses: 0, totalPnl: 0 };
        if (isWin) existing.wins++;
        else existing.losses++;
        existing.totalPnl += pnl;
        analysis.signalCombos.set(sources, existing);
      }
    }

    // Analyze time patterns
    const hour = new Date(entry.timestamp).getHours();
    const session = getSession(hour);
    const sessionData = analysis.timePatterns.get(session) || { wins: 0, losses: 0 };
    if (isWin) sessionData.wins++;
    else sessionData.losses++;
    analysis.timePatterns.set(session, sessionData);

    // Analyze asset patterns
    const assetData = analysis.assetPatterns.get(entry.asset) || { wins: 0, losses: 0, totalPnl: 0 };
    if (isWin) assetData.wins++;
    else assetData.losses++;
    assetData.totalPnl += pnl;
    analysis.assetPatterns.set(entry.asset, assetData);
  }

  return analysis;
}

/**
 * Determine trading session from hour
 */
function getSession(hour: number): string {
  if (hour >= 0 && hour < 8) return "Asia";
  if (hour >= 8 && hour < 14) return "Europe";
  if (hour >= 14 && hour < 21) return "US";
  return "Off-hours";
}

/**
 * Extract learnings from pattern analysis
 */
function extractLearnings(analysis: PatternAnalysis): TradeLearning[] {
  const learnings: TradeLearning[] = [];
  const minSampleSize = 5;

  // Signal combo learnings
  for (const [combo, stats] of analysis.signalCombos) {
    const total = stats.wins + stats.losses;
    if (total < minSampleSize) continue;

    const winRate = (stats.wins / total) * 100;
    const avgPnl = stats.totalPnl / total;
    const sources = combo.split("+");

    // High-performing combos
    if (winRate >= 65 && total >= minSampleSize) {
      learnings.push({
        id: `combo_high_${combo}_${Date.now()}`,
        pattern: `high_performance_combo`,
        description: `Signal combo "${combo}" has ${winRate.toFixed(1)}% win rate over ${total} trades`,
        winRate,
        sampleSize: total,
        confidence: total >= 10 ? "high" : "medium",
        suggestedAction: "Consider increasing weight for these signal sources",
        metadata: {
          avgPnlPct: avgPnl,
          signalSources: sources,
        },
        createdAt: Date.now(),
      });
    }

    // Low-performing combos
    if (winRate < 35 && total >= minSampleSize) {
      learnings.push({
        id: `combo_low_${combo}_${Date.now()}`,
        pattern: `low_performance_combo`,
        description: `Signal combo "${combo}" has only ${winRate.toFixed(1)}% win rate over ${total} trades`,
        winRate,
        sampleSize: total,
        confidence: total >= 10 ? "high" : "medium",
        suggestedAction: "Consider reducing weight for these signal sources",
        metadata: {
          avgPnlPct: avgPnl,
          signalSources: sources,
        },
        createdAt: Date.now(),
      });
    }
  }

  // Time-based learnings
  for (const [session, stats] of analysis.timePatterns) {
    const total = stats.wins + stats.losses;
    if (total < minSampleSize) continue;

    const winRate = (stats.wins / total) * 100;

    if (winRate >= 60 || winRate < 40) {
      learnings.push({
        id: `session_${session}_${Date.now()}`,
        pattern: winRate >= 60 ? "favorable_session" : "unfavorable_session",
        description: `${session} session has ${winRate.toFixed(1)}% win rate`,
        winRate,
        sampleSize: total,
        confidence: total >= 10 ? "high" : "medium",
        suggestedAction: winRate >= 60 
          ? "Consider increasing position size during this session"
          : "Consider reducing position size during this session",
        metadata: {
          avgPnlPct: 0,
          signalSources: [],
          timeOfDay: session,
        },
        createdAt: Date.now(),
      });
    }
  }

  // Asset-based learnings
  for (const [asset, stats] of analysis.assetPatterns) {
    const total = stats.wins + stats.losses;
    if (total < minSampleSize) continue;

    const winRate = (stats.wins / total) * 100;
    const avgPnl = stats.totalPnl / total;

    if (winRate >= 65 || winRate < 35) {
      learnings.push({
        id: `asset_${asset}_${Date.now()}`,
        pattern: winRate >= 65 ? "strong_asset" : "weak_asset",
        description: `${asset} has ${winRate.toFixed(1)}% win rate with avg P&L $${avgPnl.toFixed(2)}`,
        winRate,
        sampleSize: total,
        confidence: total >= 10 ? "high" : "medium",
        suggestedAction: winRate >= 65
          ? "Consider prioritizing this asset for signals"
          : "Consider avoiding or reducing exposure to this asset",
        metadata: {
          avgPnlPct: avgPnl,
          signalSources: [],
        },
        createdAt: Date.now(),
      });
    }
  }

  return learnings;
}

// ==========================================
// Evaluator Implementation
// ==========================================

export const tradePerformanceEvaluator: Evaluator = {
  name: "tradePerformance",
  description: "Analyzes closed trades to extract patterns and learnings for self-improvement",
  similes: ["TRADE_ANALYSIS", "PERFORMANCE_LEARNING", "PATTERN_DETECTION"],
  alwaysRun: false,

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Run periodically, not on every message
    // Check if we've accumulated enough new trades since last evaluation
    const journal = runtime.getService<VinceTradeJournalService>("VINCE_TRADE_JOURNAL_SERVICE");
    if (!journal) return false;

    const stats = journal.getStats();
    
    // Run evaluation if we have at least 5 trades
    if (stats.totalTrades < 5) return false;

    // Check last evaluation time from cache
    const lastEvalTime = await runtime.getCache<number>("vince_last_performance_eval");
    const now = Date.now();
    const evalIntervalMs = 30 * 60 * 1000; // 30 minutes

    if (lastEvalTime && now - lastEvalTime < evalIntervalMs) {
      return false;
    }

    // Run evaluation
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<any> => {
    logger.info("[tradePerformanceEvaluator] Starting trade performance analysis...");

    const journal = runtime.getService<VinceTradeJournalService>("VINCE_TRADE_JOURNAL_SERVICE");
    const parameterTuner = runtime.getService<VinceParameterTunerService>("VINCE_PARAMETER_TUNER_SERVICE");
    const improvementJournal = runtime.getService<VinceImprovementJournalService>("VINCE_IMPROVEMENT_JOURNAL_SERVICE");

    if (!journal) {
      logger.debug("[tradePerformanceEvaluator] Trade journal not available");
      return { learningsExtracted: 0 };
    }

    try {
      // Mark evaluation time
      await runtime.setCache("vince_last_performance_eval", Date.now());

      // Get overall stats
      const stats = journal.getStats();
      logger.info(
        `[tradePerformanceEvaluator] Analyzing ${stats.totalTrades} trades | ` +
        `Win rate: ${stats.winRate.toFixed(1)}% | P&L: $${stats.totalPnl.toFixed(2)}`
      );

      // Analyze patterns
      const analysis = analyzeTradePatterns(journal);
      
      // Extract learnings
      const learnings = extractLearnings(analysis);
      
      // Store learnings in memory
      for (const learning of learnings) {
        await runtime.createMemory(
          {
            entityId: runtime.agentId,
            agentId: runtime.agentId,
            content: {
              text: learning.description,
              data: learning,
            },
            roomId: message.roomId,
          },
          "facts"
        );
      }

      // Trigger parameter tuning if available
      if (parameterTuner) {
        const tuningResult = await parameterTuner.forceTuning();
        if (tuningResult?.actionsApplied.length) {
          logger.info(
            `[tradePerformanceEvaluator] Parameter tuning applied ${tuningResult.actionsApplied.length} adjustments`
          );
        }
      }

      // Generate improvement journal entries for significant findings
      if (improvementJournal && learnings.length > 0) {
        for (const learning of learnings) {
          if (learning.confidence === "high") {
            await improvementJournal.recordPerformanceIssue({
              pattern: learning.pattern,
              description: learning.description,
              winRate: learning.winRate,
              sampleSize: learning.sampleSize,
              suggestedAction: learning.suggestedAction,
              signalSources: learning.metadata.signalSources,
            });
          }
        }
      }

      // Log summary
      if (learnings.length > 0) {
        console.log("");
        console.log("  ╔═══════════════════════════════════════════════════════════════╗");
        console.log("  ║  📊 TRADE PERFORMANCE LEARNINGS                               ║");
        console.log("  ╠═══════════════════════════════════════════════════════════════╣");
        console.log(`  ║  Trades: ${stats.totalTrades}  |  Win Rate: ${stats.winRate.toFixed(1)}%  |  P&L: $${stats.totalPnl.toFixed(2).padEnd(9)} ║`);
        console.log("  ╠═══════════════════════════════════════════════════════════════╣");
        
        for (const learning of learnings.slice(0, 5)) {
          const desc = learning.description.length > 53 
            ? learning.description.substring(0, 50) + "..." 
            : learning.description;
          console.log(`  ║  • ${desc.padEnd(55)} ║`);
        }
        
        if (learnings.length > 5) {
          console.log(`  ║  ... and ${learnings.length - 5} more learning(s)                              ║`);
        }
        
        console.log("  ╚═══════════════════════════════════════════════════════════════╝");
        console.log("");
      }

      logger.info(
        `[tradePerformanceEvaluator] Extracted ${learnings.length} learning(s) from ${stats.totalTrades} trades`
      );

      return {
        learningsExtracted: learnings.length,
        learnings: learnings.map(l => ({
          pattern: l.pattern,
          description: l.description,
          winRate: l.winRate,
          confidence: l.confidence,
        })),
        overallStats: {
          totalTrades: stats.totalTrades,
          winRate: stats.winRate,
          totalPnl: stats.totalPnl,
          profitFactor: stats.profitFactor,
        },
      };
    } catch (error) {
      logger.error("[tradePerformanceEvaluator] Error analyzing trades:", error);
      return { learningsExtracted: 0, error: String(error) };
    }
  },

  examples: [
    {
      prompt: "System analyzes recent trade performance",
      messages: [
        {
          name: "System",
          content: {
            text: "Periodic trade performance analysis triggered",
          },
        },
      ],
      outcome: `{
        "learningsExtracted": 3,
        "learnings": [
          {
            "pattern": "high_performance_combo",
            "description": "Signal combo 'LiquidationCascade+TopTraders' has 75% win rate",
            "winRate": 75,
            "confidence": "high"
          }
        ]
      }`,
    },
  ],
};

export default tradePerformanceEvaluator;
