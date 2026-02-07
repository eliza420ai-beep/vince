/**
 * VINCE Parameter Tuner Service
 *
 * Automatically adjusts trading parameters based on performance:
 * - Signal thresholds (strength, confidence, confirming count)
 * - Signal source weights
 * - Risk parameters
 *
 * This is a key component of the self-improving architecture:
 * The system learns from trade outcomes and adjusts its behavior.
 *
 * V2: Enhanced with Bayesian optimization for joint threshold tuning.
 * Uses a Gaussian Process-inspired approach with Expected Improvement
 * to explore parameter space efficiently.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import {
  dynamicConfig,
  initializeDynamicConfig,
  type SignalThresholds,
  type AdjustmentRecord,
} from "../config/dynamicConfig";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import type { VinceTradeJournalService } from "./vinceTradeJournal.service";

// ==========================================
// Configuration
// ==========================================

const TUNING_CONFIG = {
  /** Minimum trades required before making adjustments */
  minTradesForTuning: 10,

  /** Minimum trades per source before adjusting its weight */
  minTradesPerSource: 5,

  /** How often to run tuning analysis (ms) */
  tuningIntervalMs: 30 * 60 * 1000, // 30 minutes

  /** Win rate thresholds for adjustments */
  winRateThresholds: {
    excellent: 70, // Increase weight
    good: 55, // Slight increase
    poor: 40, // Decrease weight
    terrible: 30, // Significant decrease
  },

  /** Maximum adjustment per tuning cycle */
  maxAdjustmentPerCycle: {
    threshold: 5, // Max 5 points per cycle
    weight: 0.2, // Max 0.2 weight change per cycle
  },

  /** Lookback window for performance analysis */
  lookbackTrades: 20, // Analyze last 20 trades
};

// ==========================================
// Bayesian Optimization Configuration (V2)
// ==========================================

const BAYESIAN_CONFIG = {
  /** Enable Bayesian optimization for joint threshold tuning */
  enabled: true,

  /** Minimum observations before starting optimization */
  minObservations: 20,

  /** How often to propose new parameter sets (in tuning cycles) */
  proposalFrequency: 3,

  /** Exploration vs exploitation trade-off (higher = more exploration) */
  explorationWeight: 0.1,

  /** Parameter bounds */
  bounds: {
    minStrength: { min: 55, max: 85 },
    minConfidence: { min: 50, max: 80 },
    minConfirming: { min: 2, max: 4 },
  },

  /** Grid resolution for parameter search */
  gridResolution: 5, // 5 points per dimension

  /** Maximum history of parameter-outcome pairs */
  maxHistory: 100,
};

/**
 * A parameter-outcome observation for Bayesian optimization
 */
interface ParameterObservation {
  timestamp: number;
  parameters: {
    minStrength: number;
    minConfidence: number;
    minConfirming: number;
  };
  outcome: {
    winRate: number;
    avgPnl: number;
    sharpeRatio: number;
    trades: number;
  };
  score: number; // Combined objective score
}

/**
 * State for Bayesian optimization
 */
interface BayesianState {
  version: string;
  observations: ParameterObservation[];
  bestObservation: ParameterObservation | null;
  currentProposal: {
    minStrength: number;
    minConfidence: number;
    minConfirming: number;
  } | null;
  proposalStartTime: number | null;
  tuningCyclesSinceProposal: number;
}

// ==========================================
// Types
// ==========================================

interface SourcePerformance {
  source: string;
  winRate: number;
  totalPnl: number;
  trades: number;
  currentWeight: number;
  suggestedWeight: number;
  shouldAdjust: boolean;
  reason?: string;
}

interface TuningAnalysis {
  timestamp: number;
  overallWinRate: number;
  overallPnl: number;
  totalTrades: number;
  sourcePerformance: SourcePerformance[];
  suggestedThresholdChanges: Array<{
    parameter: keyof SignalThresholds;
    currentValue: number;
    suggestedValue: number;
    reason: string;
  }>;
  actionsApplied: string[];
}

// ==========================================
// Service Implementation
// ==========================================

export class VinceParameterTunerService extends Service {
  static serviceType = "VINCE_PARAMETER_TUNER_SERVICE";
  capabilityDescription =
    "Automatically tunes trading parameters based on performance with Bayesian optimization";

  private tuningInterval: NodeJS.Timeout | null = null;
  private lastTuningAnalysis: TuningAnalysis | null = null;
  private initialized = false;

  // V2: Bayesian optimization state
  private bayesianState: BayesianState = {
    version: "1.0.0",
    observations: [],
    bestObservation: null,
    currentProposal: null,
    proposalStartTime: null,
    tuningCyclesSinceProposal: 0,
  };
  private bayesianStatePath: string | null = null;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceParameterTunerService> {
    const service = new VinceParameterTunerService(runtime);
    await service.initialize();
    logger.info(
      "[VinceParameterTuner] ✅ Service started with Bayesian optimization",
    );
    return service;
  }

  async stop(): Promise<void> {
    if (this.tuningInterval) {
      clearInterval(this.tuningInterval);
      this.tuningInterval = null;
    }
    await this.saveBayesianState();
    logger.info("[VinceParameterTuner] Service stopped");
  }

  private async initialize(): Promise<void> {
    // Initialize dynamic config
    await initializeDynamicConfig();

    // Initialize Bayesian optimization state
    await this.initializeBayesianState();

    // Start tuning loop
    this.startTuningLoop();
    this.initialized = true;
  }

  // ==========================================
  // Bayesian Optimization Initialization
  // ==========================================

  private async initializeBayesianState(): Promise<void> {
    try {
      const elizaDbDir = path.join(process.cwd(), ".elizadb");
      const persistDir = path.join(elizaDbDir, PERSISTENCE_DIR);

      if (!fs.existsSync(persistDir)) {
        fs.mkdirSync(persistDir, { recursive: true });
      }

      this.bayesianStatePath = path.join(
        persistDir,
        "bayesian-tuner-state.json",
      );

      if (fs.existsSync(this.bayesianStatePath)) {
        const data = JSON.parse(
          fs.readFileSync(this.bayesianStatePath, "utf-8"),
        );
        this.bayesianState = { ...this.bayesianState, ...data };
        logger.info(
          `[VinceParameterTuner] Loaded Bayesian state with ${this.bayesianState.observations.length} observations`,
        );
      }
    } catch (error) {
      logger.debug(
        `[VinceParameterTuner] Could not load Bayesian state: ${error}`,
      );
    }
  }

  private async saveBayesianState(): Promise<void> {
    if (!this.bayesianStatePath) return;

    try {
      // Trim history if too large
      if (this.bayesianState.observations.length > BAYESIAN_CONFIG.maxHistory) {
        this.bayesianState.observations = this.bayesianState.observations.slice(
          -BAYESIAN_CONFIG.maxHistory,
        );
      }

      fs.writeFileSync(
        this.bayesianStatePath,
        JSON.stringify(this.bayesianState, null, 2),
      );
    } catch (error) {
      logger.error(
        `[VinceParameterTuner] Could not save Bayesian state: ${error}`,
      );
    }
  }

  // ==========================================
  // Service Getters
  // ==========================================

  private getTradeJournal(): VinceTradeJournalService | null {
    return this.runtime.getService(
      "VINCE_TRADE_JOURNAL_SERVICE",
    ) as VinceTradeJournalService | null;
  }

  // ==========================================
  // Tuning Loop
  // ==========================================

  private startTuningLoop(): void {
    // Run tuning analysis periodically
    this.tuningInterval = setInterval(async () => {
      await this.runTuningCycle();
    }, TUNING_CONFIG.tuningIntervalMs);

    // Run initial analysis after a short delay
    setTimeout(async () => {
      await this.runTuningCycle();
    }, 5000);
  }

  /**
   * Run a complete tuning cycle
   */
  async runTuningCycle(): Promise<TuningAnalysis | null> {
    const journal = this.getTradeJournal();
    if (!journal) {
      logger.debug("[VinceParameterTuner] Trade journal not available");
      return null;
    }

    const stats = journal.getStats();

    // Need minimum trades before tuning
    if (stats.totalTrades < TUNING_CONFIG.minTradesForTuning) {
      logger.debug(
        `[VinceParameterTuner] Insufficient trades for tuning: ${stats.totalTrades}/${TUNING_CONFIG.minTradesForTuning}`,
      );
      return null;
    }

    const analysis = await this.analyzePerformance(journal, stats);
    this.lastTuningAnalysis = analysis;

    // Apply rule-based adjustments (existing logic)
    await this.applyAdjustments(analysis);

    // V2: Run Bayesian optimization for joint threshold tuning
    await this.runBayesianOptimization(stats, analysis);

    // Log summary
    this.logTuningSummary(analysis);

    return analysis;
  }

  // ==========================================
  // Performance Analysis
  // ==========================================

  private async analyzePerformance(
    journal: VinceTradeJournalService,
    stats: ReturnType<VinceTradeJournalService["getStats"]>,
  ): Promise<TuningAnalysis> {
    const analysis: TuningAnalysis = {
      timestamp: Date.now(),
      overallWinRate: stats.winRate,
      overallPnl: stats.totalPnl,
      totalTrades: stats.totalTrades,
      sourcePerformance: [],
      suggestedThresholdChanges: [],
      actionsApplied: [],
    };

    // Analyze signal source performance
    const rankings = journal.getSignalRankings();
    const currentWeights = dynamicConfig.getAllSourceWeights();

    for (const ranking of rankings) {
      const currentWeight = currentWeights[ranking.source] ?? 1.0;
      const suggestedWeight = this.calculateSuggestedWeight(
        ranking,
        currentWeight,
      );

      const shouldAdjust =
        ranking.trades >= TUNING_CONFIG.minTradesPerSource &&
        Math.abs(suggestedWeight - currentWeight) >= 0.1;

      const sourcePerf: SourcePerformance = {
        source: ranking.source,
        winRate: ranking.winRate,
        totalPnl: ranking.totalPnl,
        trades: ranking.trades,
        currentWeight,
        suggestedWeight,
        shouldAdjust,
      };

      if (shouldAdjust) {
        if (suggestedWeight > currentWeight) {
          sourcePerf.reason = `Win rate ${ranking.winRate.toFixed(1)}% exceeds threshold, increasing weight`;
        } else {
          sourcePerf.reason = `Win rate ${ranking.winRate.toFixed(1)}% below threshold, reducing weight`;
        }
      }

      analysis.sourcePerformance.push(sourcePerf);
    }

    // Analyze threshold performance
    analysis.suggestedThresholdChanges = this.analyzeThresholds(stats);

    return analysis;
  }

  /**
   * Calculate suggested weight based on performance
   */
  private calculateSuggestedWeight(
    ranking: { winRate: number; totalPnl: number; trades: number },
    currentWeight: number,
  ): number {
    const { winRate, trades } = ranking;

    // Not enough data
    if (trades < TUNING_CONFIG.minTradesPerSource) {
      return currentWeight;
    }

    let adjustment = 0;
    const { winRateThresholds, maxAdjustmentPerCycle } = TUNING_CONFIG;

    if (winRate >= winRateThresholds.excellent) {
      adjustment = maxAdjustmentPerCycle.weight;
    } else if (winRate >= winRateThresholds.good) {
      adjustment = maxAdjustmentPerCycle.weight * 0.5;
    } else if (winRate < winRateThresholds.terrible) {
      adjustment = -maxAdjustmentPerCycle.weight;
    } else if (winRate < winRateThresholds.poor) {
      adjustment = -maxAdjustmentPerCycle.weight * 0.5;
    }

    // Calculate new weight with bounds
    const newWeight = Math.max(0.1, Math.min(3.0, currentWeight + adjustment));

    return Math.round(newWeight * 100) / 100; // Round to 2 decimals
  }

  /**
   * Analyze if thresholds should be adjusted
   */
  private analyzeThresholds(
    stats: ReturnType<VinceTradeJournalService["getStats"]>,
  ): TuningAnalysis["suggestedThresholdChanges"] {
    const changes: TuningAnalysis["suggestedThresholdChanges"] = [];
    const currentThresholds = dynamicConfig.getThresholds();
    const { winRate, totalTrades } = stats;

    // Need sufficient trades
    if (totalTrades < TUNING_CONFIG.minTradesForTuning) {
      return changes;
    }

    // If win rate is very high (>65%), we can afford to be less strict
    if (winRate > 65) {
      if (currentThresholds.minStrength > 60) {
        changes.push({
          parameter: "minStrength",
          currentValue: currentThresholds.minStrength,
          suggestedValue: currentThresholds.minStrength - 5,
          reason: `High win rate (${winRate.toFixed(1)}%): can reduce threshold to capture more trades`,
        });
      }
      if (currentThresholds.minConfidence > 55) {
        changes.push({
          parameter: "minConfidence",
          currentValue: currentThresholds.minConfidence,
          suggestedValue: currentThresholds.minConfidence - 5,
          reason: `High win rate (${winRate.toFixed(1)}%): can reduce confidence threshold`,
        });
      }
    }

    // If win rate is low (<45%), be more strict
    if (winRate < 45) {
      if (currentThresholds.minStrength < 85) {
        changes.push({
          parameter: "minStrength",
          currentValue: currentThresholds.minStrength,
          suggestedValue: currentThresholds.minStrength + 5,
          reason: `Low win rate (${winRate.toFixed(1)}%): increasing threshold to filter weak signals`,
        });
      }
      if (currentThresholds.minConfidence < 85) {
        changes.push({
          parameter: "minConfidence",
          currentValue: currentThresholds.minConfidence,
          suggestedValue: currentThresholds.minConfidence + 5,
          reason: `Low win rate (${winRate.toFixed(1)}%): increasing confidence requirement`,
        });
      }
    }

    return changes;
  }

  // ==========================================
  // Apply Adjustments
  // ==========================================

  private async applyAdjustments(analysis: TuningAnalysis): Promise<void> {
    // Apply source weight adjustments
    for (const source of analysis.sourcePerformance) {
      if (source.shouldAdjust && source.reason) {
        await dynamicConfig.updateSourceWeight(
          source.source,
          source.suggestedWeight,
          source.reason,
          { sampleSize: source.trades, winRate: source.winRate },
        );
        analysis.actionsApplied.push(
          `Updated ${source.source} weight: ${source.currentWeight} → ${source.suggestedWeight}`,
        );
      }
    }

    // Apply threshold adjustments
    for (const change of analysis.suggestedThresholdChanges) {
      await dynamicConfig.updateThreshold(
        change.parameter,
        change.suggestedValue,
        change.reason,
        { sampleSize: analysis.totalTrades, winRate: analysis.overallWinRate },
      );
      analysis.actionsApplied.push(
        `Updated ${change.parameter}: ${change.currentValue} → ${change.suggestedValue}`,
      );
    }
  }

  // ==========================================
  // Logging
  // ==========================================

  private logTuningSummary(analysis: TuningAnalysis): void {
    if (analysis.actionsApplied.length === 0) {
      logger.debug("[VinceParameterTuner] No adjustments needed this cycle");
      return;
    }

    console.log("");
    console.log(
      "  ╔═══════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "  ║  🔧 PARAMETER TUNING APPLIED                                  ║",
    );
    console.log(
      "  ╠═══════════════════════════════════════════════════════════════╣",
    );
    console.log(
      `  ║  Win Rate: ${analysis.overallWinRate.toFixed(1)}%  |  Trades: ${analysis.totalTrades}  |  P&L: $${analysis.overallPnl.toFixed(2).padEnd(8)} ║`,
    );
    console.log(
      "  ╠═══════════════════════════════════════════════════════════════╣",
    );

    for (const action of analysis.actionsApplied) {
      const truncated =
        action.length > 55 ? action.substring(0, 52) + "..." : action;
      console.log(`  ║  • ${truncated.padEnd(55)} ║`);
    }

    console.log(
      "  ╚═══════════════════════════════════════════════════════════════╝",
    );
    console.log("");

    logger.info(
      `[VinceParameterTuner] Applied ${analysis.actionsApplied.length} adjustment(s) | ` +
        `Win rate: ${analysis.overallWinRate.toFixed(1)}%`,
    );
  }

  // ==========================================
  // Bayesian Optimization (V2)
  // ==========================================

  /**
   * Record an observation of parameter performance
   */
  private async recordBayesianObservation(
    stats: ReturnType<VinceTradeJournalService["getStats"]>,
  ): Promise<void> {
    if (!BAYESIAN_CONFIG.enabled) return;

    const currentThresholds = dynamicConfig.getThresholds();

    // Calculate a combined objective score (higher is better)
    // Combines win rate, average P&L, and penalizes high variance
    const winRateScore = stats.winRate / 100; // 0-1
    const pnlScore = Math.min(1, Math.max(-1, stats.avgPnlPerTrade / 50)); // Normalized
    const sharpeEstimate =
      stats.avgPnlPerTrade > 0 && stats.totalTrades > 5
        ? stats.winRate / (100 - stats.winRate + 1) // Simple approximation
        : 0;

    // Weighted objective: 50% win rate, 30% P&L, 20% Sharpe
    const score =
      0.5 * winRateScore +
      (0.3 * (pnlScore + 1)) / 2 +
      0.2 * Math.min(1, sharpeEstimate / 2);

    const observation: ParameterObservation = {
      timestamp: Date.now(),
      parameters: {
        minStrength: currentThresholds.minStrength,
        minConfidence: currentThresholds.minConfidence,
        minConfirming: currentThresholds.minConfirming,
      },
      outcome: {
        winRate: stats.winRate,
        avgPnl: stats.avgPnlPerTrade,
        sharpeRatio: sharpeEstimate,
        trades: stats.totalTrades,
      },
      score,
    };

    this.bayesianState.observations.push(observation);

    // Update best observation
    if (
      !this.bayesianState.bestObservation ||
      score > this.bayesianState.bestObservation.score
    ) {
      this.bayesianState.bestObservation = observation;
      logger.info(
        `[VinceParameterTuner] 🎯 New best parameters: strength=${currentThresholds.minStrength}, ` +
          `confidence=${currentThresholds.minConfidence}, confirming=${currentThresholds.minConfirming} ` +
          `(score: ${score.toFixed(3)})`,
      );
    }

    await this.saveBayesianState();
  }

  /**
   * Propose new parameters using Expected Improvement
   */
  private proposeNewParameters(): {
    minStrength: number;
    minConfidence: number;
    minConfirming: number;
  } | null {
    if (!BAYESIAN_CONFIG.enabled) return null;
    if (
      this.bayesianState.observations.length < BAYESIAN_CONFIG.minObservations
    ) {
      return null;
    }

    const { bounds, gridResolution, explorationWeight } = BAYESIAN_CONFIG;

    // Generate candidate parameter sets on a grid
    const candidates: Array<{
      params: {
        minStrength: number;
        minConfidence: number;
        minConfirming: number;
      };
      ei: number; // Expected Improvement
    }> = [];

    // Calculate current best score
    const bestScore = this.bayesianState.bestObservation?.score ?? 0;

    // Generate grid
    for (let s = 0; s < gridResolution; s++) {
      for (let c = 0; c < gridResolution; c++) {
        for (let conf = 0; conf < gridResolution; conf++) {
          const minStrength = Math.round(
            bounds.minStrength.min +
              (s / (gridResolution - 1)) *
                (bounds.minStrength.max - bounds.minStrength.min),
          );
          const minConfidence = Math.round(
            bounds.minConfidence.min +
              (c / (gridResolution - 1)) *
                (bounds.minConfidence.max - bounds.minConfidence.min),
          );
          const minConfirming = Math.round(
            bounds.minConfirming.min +
              (conf / (gridResolution - 1)) *
                (bounds.minConfirming.max - bounds.minConfirming.min),
          );

          // Calculate Expected Improvement for this candidate
          const ei = this.calculateExpectedImprovement(
            { minStrength, minConfidence, minConfirming },
            bestScore,
            explorationWeight,
          );

          candidates.push({
            params: { minStrength, minConfidence, minConfirming },
            ei,
          });
        }
      }
    }

    // Sort by Expected Improvement
    candidates.sort((a, b) => b.ei - a.ei);

    // Return best candidate that's different from current
    const current = dynamicConfig.getThresholds();
    for (const candidate of candidates) {
      const isDifferent =
        candidate.params.minStrength !== current.minStrength ||
        candidate.params.minConfidence !== current.minConfidence ||
        candidate.params.minConfirming !== current.minConfirming;

      if (isDifferent) {
        return candidate.params;
      }
    }

    return null;
  }

  /**
   * Calculate Expected Improvement for a parameter set
   * Uses a simplified Gaussian Process approximation based on distance to observations
   */
  private calculateExpectedImprovement(
    params: {
      minStrength: number;
      minConfidence: number;
      minConfirming: number;
    },
    bestScore: number,
    explorationWeight: number,
  ): number {
    const observations = this.bayesianState.observations;
    if (observations.length === 0) return 1.0; // Maximum exploration

    // Find similar past observations
    const similarities: Array<{
      obs: ParameterObservation;
      similarity: number;
    }> = [];

    for (const obs of observations) {
      // Calculate distance (normalized by bounds)
      const strengthDist =
        Math.abs(params.minStrength - obs.parameters.minStrength) /
        (BAYESIAN_CONFIG.bounds.minStrength.max -
          BAYESIAN_CONFIG.bounds.minStrength.min);
      const confidenceDist =
        Math.abs(params.minConfidence - obs.parameters.minConfidence) /
        (BAYESIAN_CONFIG.bounds.minConfidence.max -
          BAYESIAN_CONFIG.bounds.minConfidence.min);
      const confirmingDist =
        Math.abs(params.minConfirming - obs.parameters.minConfirming) /
        (BAYESIAN_CONFIG.bounds.minConfirming.max -
          BAYESIAN_CONFIG.bounds.minConfirming.min);

      // RBF-like kernel
      const distance = Math.sqrt(
        Math.pow(strengthDist, 2) +
          Math.pow(confidenceDist, 2) +
          Math.pow(confirmingDist, 2),
      );
      const similarity = Math.exp(-distance * 2);

      if (similarity > 0.01) {
        similarities.push({ obs, similarity });
      }
    }

    if (similarities.length === 0) {
      // No similar observations - high exploration value
      return explorationWeight;
    }

    // Estimate mean and variance from similar observations
    let weightedSum = 0;
    let weightedSumSq = 0;
    let totalWeight = 0;

    for (const { obs, similarity } of similarities) {
      weightedSum += obs.score * similarity;
      weightedSumSq += Math.pow(obs.score, 2) * similarity;
      totalWeight += similarity;
    }

    const mean = weightedSum / totalWeight;
    const variance = Math.max(
      0.001,
      weightedSumSq / totalWeight - Math.pow(mean, 2),
    );
    const std = Math.sqrt(variance);

    // Expected Improvement = E[max(0, f(x) - f_best)]
    // Approximated using normal distribution
    const z = (mean - bestScore) / std;
    const phi = this.standardNormalCDF(z);
    const pdf = Math.exp(-Math.pow(z, 2) / 2) / Math.sqrt(2 * Math.PI);

    const ei = (mean - bestScore) * phi + std * pdf;

    // Add exploration bonus for uncertain regions
    const uncertainty = 1 / (1 + similarities.length);

    return ei + explorationWeight * uncertainty;
  }

  /**
   * Standard normal CDF approximation
   */
  private standardNormalCDF(x: number): number {
    // Approximation using error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1 / (1 + p * x);
    const y =
      1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
  }

  /**
   * Run Bayesian optimization step
   */
  private async runBayesianOptimization(
    stats: ReturnType<VinceTradeJournalService["getStats"]>,
    analysis: TuningAnalysis,
  ): Promise<void> {
    if (!BAYESIAN_CONFIG.enabled) return;

    // Record current observation
    await this.recordBayesianObservation(stats);

    // Increment cycles since last proposal
    this.bayesianState.tuningCyclesSinceProposal++;

    // Check if it's time to propose new parameters
    if (
      this.bayesianState.tuningCyclesSinceProposal >=
      BAYESIAN_CONFIG.proposalFrequency
    ) {
      const proposal = this.proposeNewParameters();

      if (proposal) {
        // Apply proposed parameters
        const current = dynamicConfig.getThresholds();

        if (proposal.minStrength !== current.minStrength) {
          await dynamicConfig.updateThreshold(
            "minStrength",
            proposal.minStrength,
            `Bayesian optimization: exploring parameter space`,
            { sampleSize: this.bayesianState.observations.length },
          );
          analysis.actionsApplied.push(
            `[Bayesian] minStrength: ${current.minStrength} → ${proposal.minStrength}`,
          );
        }

        if (proposal.minConfidence !== current.minConfidence) {
          await dynamicConfig.updateThreshold(
            "minConfidence",
            proposal.minConfidence,
            `Bayesian optimization: exploring parameter space`,
            { sampleSize: this.bayesianState.observations.length },
          );
          analysis.actionsApplied.push(
            `[Bayesian] minConfidence: ${current.minConfidence} → ${proposal.minConfidence}`,
          );
        }

        if (proposal.minConfirming !== current.minConfirming) {
          await dynamicConfig.updateThreshold(
            "minConfirming",
            proposal.minConfirming,
            `Bayesian optimization: exploring parameter space`,
            { sampleSize: this.bayesianState.observations.length },
          );
          analysis.actionsApplied.push(
            `[Bayesian] minConfirming: ${current.minConfirming} → ${proposal.minConfirming}`,
          );
        }

        this.bayesianState.currentProposal = proposal;
        this.bayesianState.proposalStartTime = Date.now();
        this.bayesianState.tuningCyclesSinceProposal = 0;

        logger.info(
          `[VinceParameterTuner] 🔬 Bayesian proposal: strength=${proposal.minStrength}, ` +
            `confidence=${proposal.minConfidence}, confirming=${proposal.minConfirming}`,
        );
      }
    }

    await this.saveBayesianState();
  }

  /**
   * Get Bayesian optimization status
   */
  getBayesianStatus(): {
    enabled: boolean;
    observations: number;
    bestScore: number | null;
    bestParameters: {
      minStrength: number;
      minConfidence: number;
      minConfirming: number;
    } | null;
    currentProposal: {
      minStrength: number;
      minConfidence: number;
      minConfirming: number;
    } | null;
    cyclesSinceProposal: number;
  } {
    return {
      enabled: BAYESIAN_CONFIG.enabled,
      observations: this.bayesianState.observations.length,
      bestScore: this.bayesianState.bestObservation?.score ?? null,
      bestParameters: this.bayesianState.bestObservation?.parameters ?? null,
      currentProposal: this.bayesianState.currentProposal,
      cyclesSinceProposal: this.bayesianState.tuningCyclesSinceProposal,
    };
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Get the last tuning analysis
   */
  getLastAnalysis(): TuningAnalysis | null {
    return this.lastTuningAnalysis;
  }

  /**
   * Force a tuning cycle (for testing or manual trigger)
   */
  async forceTuning(): Promise<TuningAnalysis | null> {
    return await this.runTuningCycle();
  }

  /**
   * Get current parameter status
   */
  getParameterStatus(): {
    thresholds: SignalThresholds;
    sourceWeights: Record<string, number>;
    recentAdjustments: AdjustmentRecord[];
    isModified: boolean;
  } {
    return {
      thresholds: dynamicConfig.getThresholds(),
      sourceWeights: dynamicConfig.getAllSourceWeights(),
      recentAdjustments: dynamicConfig.getRecentAdjustments(10),
      isModified: dynamicConfig.isModified(),
    };
  }

  /**
   * Reset all parameters to defaults
   */
  async resetToDefaults(reason: string = "Manual reset"): Promise<void> {
    await dynamicConfig.resetToDefaults(reason);
    logger.warn(
      `[VinceParameterTuner] Parameters reset to defaults: ${reason}`,
    );
  }

  /**
   * Check if tuning has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
