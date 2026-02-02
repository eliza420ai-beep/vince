/**
 * VINCE Weight Bandit Service
 *
 * Implements Multi-Armed Bandit (MAB) optimization using Thompson Sampling
 * for adaptive signal source weight optimization.
 *
 * How it works:
 * 1. Each signal source is treated as an "arm" in the bandit problem
 * 2. Each arm has a Beta distribution tracking (wins, losses)
 * 3. When selecting weights, we sample from each distribution (exploration)
 * 4. After trade outcomes, we update the distributions (exploitation)
 * 5. Over time, converges to optimal weights while still exploring
 *
 * Benefits:
 * - No external training required - learns online in real-time
 * - Automatically balances exploration vs exploitation
 * - Adapts to changing market conditions
 * - Degrades gracefully - falls back to dynamic config weights
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import { dynamicConfig } from "../config/dynamicConfig";

// ==========================================
// Types
// ==========================================

/**
 * Beta distribution parameters for a signal source
 */
interface BetaParams {
  /** Number of successes (wins) */
  alpha: number;
  /** Number of failures (losses) */
  beta: number;
  /** Total observations */
  count: number;
  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * Complete arm statistics
 */
interface ArmStats extends BetaParams {
  /** Empirical win rate */
  winRate: number;
  /** Thompson-sampled weight */
  sampledWeight: number;
  /** Weight multiplier from sampling */
  multiplier: number;
}

/**
 * Bandit state for persistence
 */
interface BanditState {
  version: string;
  lastUpdated: number;
  arms: Record<string, BetaParams>;
  totalTradesProcessed: number;
  explorationRate: number;
}

// ==========================================
// Configuration
// ==========================================

const DEFAULT_PRIOR_ALPHA = 5; // Start with mild optimism (55% prior)
const DEFAULT_PRIOR_BETA = 4;
const MIN_WEIGHT_MULTIPLIER = 0.3; // Never go below 30% of base weight
const MAX_WEIGHT_MULTIPLIER = 2.0; // Never exceed 200% of base weight
const DECAY_FACTOR = 0.995; // Slowly decay old observations
const STATE_FILE_NAME = "weight-bandit-state.json";
const BANDIT_VERSION = "1.0.0";

// Known signal sources with their baseline weights from dynamicConfig
// NOTE: TopTraders and SanbaseWhales are disabled (weight=0) because:
//   - TopTraders: No real wallet addresses configured in wallets.json
//   - SanbaseWhales: 30-day lag on free tier makes it useless for trading
const KNOWN_SOURCES = [
  "LiquidationCascade",
  "LiquidationPressure",
  "BinanceFundingExtreme",
  "DeribitPutCallRatio",
  "HyperliquidCrowding",
  // "TopTraders",     // DISABLED - no wallet addresses configured
  "BinanceTopTraders", // Only real whale data source (public API)
  // "SanbaseWhales",  // DISABLED - 30-day lag on free tier
  "SanbaseExchangeFlows",
  "CrossVenueFunding",
  "CoinGlass",
  "BinanceTakerFlow",
  "DeribitIVSkew",
  "HyperliquidBias",
  "MarketRegime",
  "NewsSentiment",
];

// ==========================================
// Beta Distribution Utilities
// ==========================================

/**
 * Sample from a Beta distribution using the inverse CDF method
 * This is more accurate than the simple formula for small alpha/beta
 */
function betaSample(alpha: number, beta: number): number {
  // Use gamma distribution relationship: Beta(a,b) = Gamma(a) / (Gamma(a) + Gamma(b))
  const gammaA = gammaSample(alpha);
  const gammaB = gammaSample(beta);
  return gammaA / (gammaA + gammaB);
}

/**
 * Sample from Gamma distribution using Marsaglia and Tsang's method
 */
function gammaSample(shape: number): number {
  if (shape < 1) {
    return gammaSample(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number;
    let v: number;

    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Sample from standard normal distribution using Box-Muller transform
 */
function normalSample(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Calculate expected value of Beta distribution
 */
function betaMean(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

// ==========================================
// Weight Bandit Service
// ==========================================

export class VinceWeightBanditService extends Service {
  static serviceType = "VINCE_WEIGHT_BANDIT_SERVICE";
  capabilityDescription = "Adaptive signal source weight optimization via Thompson Sampling";

  private arms: Map<string, BetaParams> = new Map();
  private totalTradesProcessed = 0;
  private explorationRate = 1.0; // Starts at full exploration
  private statePath: string | null = null;
  private initialized = false;
  private cachedSampledWeights: Map<string, number> = new Map();
  private lastSampleTime = 0;
  private readonly SAMPLE_CACHE_MS = 5000; // Resample every 5 seconds

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceWeightBanditService> {
    const service = new VinceWeightBanditService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    try {
      const elizaDbDir = path.join(process.cwd(), ".elizadb");
      const persistDir = path.join(elizaDbDir, PERSISTENCE_DIR);

      if (!fs.existsSync(persistDir)) {
        fs.mkdirSync(persistDir, { recursive: true });
      }

      this.statePath = path.join(persistDir, STATE_FILE_NAME);

      // Initialize arms with priors
      for (const source of KNOWN_SOURCES) {
        this.arms.set(source, {
          alpha: DEFAULT_PRIOR_ALPHA,
          beta: DEFAULT_PRIOR_BETA,
          count: 0,
          lastUpdated: Date.now(),
        });
      }

      // Try to load existing state
      if (fs.existsSync(this.statePath)) {
        const data = JSON.parse(fs.readFileSync(this.statePath, "utf-8")) as BanditState;
        this.loadState(data);
        logger.info(
          `[WeightBandit] Loaded state with ${this.totalTradesProcessed} trades processed`
        );
      }

      this.initialized = true;
      logger.info("[WeightBandit] ✅ Thompson Sampling initialized for source weight optimization");
    } catch (error) {
      logger.error(`[WeightBandit] Initialization error: ${error}`);
    }
  }

  async stop(): Promise<void> {
    await this.saveState();
    logger.info("[WeightBandit] Stopped and state saved");
  }

  // ==========================================
  // Weight Sampling (Exploration/Exploitation)
  // ==========================================

  /**
   * Get Thompson-sampled weights for all sources
   * This is the main method called by the signal aggregator
   */
  getSampledWeights(): Map<string, number> {
    // Use cached samples if recent enough
    const now = Date.now();
    if (now - this.lastSampleTime < this.SAMPLE_CACHE_MS && this.cachedSampledWeights.size > 0) {
      return new Map(this.cachedSampledWeights);
    }

    const sampledWeights = new Map<string, number>();

    for (const source of KNOWN_SOURCES) {
      const weight = this.getSampledWeight(source);
      sampledWeights.set(source, weight);
    }

    // Cache the samples
    this.cachedSampledWeights = new Map(sampledWeights);
    this.lastSampleTime = now;

    return sampledWeights;
  }

  /**
   * Get Thompson-sampled weight for a specific source
   */
  getSampledWeight(source: string): number {
    // Get base weight from dynamic config
    const baseWeight = dynamicConfig.getSourceWeight(source);

    // Get or create arm
    let arm = this.arms.get(source);
    if (!arm) {
      arm = {
        alpha: DEFAULT_PRIOR_ALPHA,
        beta: DEFAULT_PRIOR_BETA,
        count: 0,
        lastUpdated: Date.now(),
      };
      this.arms.set(source, arm);
    }

    // Sample from Beta distribution
    const sample = betaSample(arm.alpha, arm.beta);

    // Convert sample (0-1) to multiplier (MIN_WEIGHT_MULTIPLIER to MAX_WEIGHT_MULTIPLIER)
    // sample = 0.5 -> multiplier = 1.0 (baseline)
    // sample = 1.0 -> multiplier = MAX_WEIGHT_MULTIPLIER
    // sample = 0.0 -> multiplier = MIN_WEIGHT_MULTIPLIER
    const multiplier = MIN_WEIGHT_MULTIPLIER + sample * (MAX_WEIGHT_MULTIPLIER - MIN_WEIGHT_MULTIPLIER);

    return baseWeight * multiplier;
  }

  /**
   * Get deterministic weights (for comparison/logging)
   * Uses mean of Beta distribution instead of sampling
   */
  getDeterministicWeights(): Map<string, number> {
    const weights = new Map<string, number>();

    for (const source of KNOWN_SOURCES) {
      const baseWeight = dynamicConfig.getSourceWeight(source);
      const arm = this.arms.get(source);

      if (arm) {
        const mean = betaMean(arm.alpha, arm.beta);
        const multiplier = MIN_WEIGHT_MULTIPLIER + mean * (MAX_WEIGHT_MULTIPLIER - MIN_WEIGHT_MULTIPLIER);
        weights.set(source, baseWeight * multiplier);
      } else {
        weights.set(source, baseWeight);
      }
    }

    return weights;
  }

  // ==========================================
  // Outcome Updates (Learning)
  // ==========================================

  /**
   * Update arm statistics based on trade outcome
   * Called after a trade closes
   */
  async recordOutcome(params: {
    sources: string[];
    profitable: boolean;
    pnlPct: number;
  }): Promise<void> {
    const { sources, profitable, pnlPct } = params;

    if (sources.length === 0) return;

    // Apply decay to all arms (recency weighting)
    for (const [, arm] of this.arms) {
      arm.alpha *= DECAY_FACTOR;
      arm.beta *= DECAY_FACTOR;
    }

    // Update arms for sources that contributed to this trade
    for (const source of sources) {
      let arm = this.arms.get(source);
      if (!arm) {
        arm = {
          alpha: DEFAULT_PRIOR_ALPHA,
          beta: DEFAULT_PRIOR_BETA,
          count: 0,
          lastUpdated: Date.now(),
        };
        this.arms.set(source, arm);
      }

      if (profitable) {
        // Weight the update by how profitable
        const winBonus = Math.min(1, Math.abs(pnlPct) / 5); // Max 1.0 for 5%+ profit
        arm.alpha += 1 + winBonus;
      } else {
        // Weight the update by how much was lost
        const lossWeight = Math.min(1, Math.abs(pnlPct) / 5);
        arm.beta += 1 + lossWeight;
      }

      arm.count++;
      arm.lastUpdated = Date.now();
    }

    this.totalTradesProcessed++;

    // Update exploration rate (decrease over time)
    this.explorationRate = Math.max(0.1, 1 / Math.sqrt(1 + this.totalTradesProcessed / 50));

    // Clear cached samples to pick up new values
    this.cachedSampledWeights.clear();

    // Save state periodically
    if (this.totalTradesProcessed % 10 === 0) {
      await this.saveState();
    }

    logger.debug(
      `[WeightBandit] Updated ${sources.length} sources: ${profitable ? "WIN" : "LOSS"} ${pnlPct.toFixed(2)}%`
    );
  }

  /**
   * Record a combo outcome (when multiple sources worked together)
   * Gives bonus to source combinations that worked well
   */
  async recordComboOutcome(params: {
    sources: string[];
    profitable: boolean;
    comboName: string;
    pnlPct: number;
  }): Promise<void> {
    // For combo outcomes, give a bonus to all participating sources
    const bonusMultiplier = 1.5;

    for (const source of params.sources) {
      const arm = this.arms.get(source);
      if (arm) {
        if (params.profitable) {
          arm.alpha += bonusMultiplier;
        } else {
          arm.beta += bonusMultiplier * 0.5; // Less penalty for combos
        }
        arm.lastUpdated = Date.now();
      }
    }

    logger.debug(
      `[WeightBandit] Combo ${params.comboName}: ${params.profitable ? "WIN" : "LOSS"} - boosted ${params.sources.length} sources`
    );
  }

  // ==========================================
  // Statistics and Analysis
  // ==========================================

  /**
   * Get detailed statistics for all arms
   */
  getArmStats(): Map<string, ArmStats> {
    const stats = new Map<string, ArmStats>();

    for (const [source, arm] of this.arms) {
      const baseWeight = dynamicConfig.getSourceWeight(source);
      const mean = betaMean(arm.alpha, arm.beta);
      const multiplier = MIN_WEIGHT_MULTIPLIER + mean * (MAX_WEIGHT_MULTIPLIER - MIN_WEIGHT_MULTIPLIER);

      stats.set(source, {
        ...arm,
        winRate: mean,
        sampledWeight: baseWeight * multiplier,
        multiplier,
      });
    }

    return stats;
  }

  /**
   * Get top performing sources
   */
  getTopSources(count: number = 5): Array<{ source: string; winRate: number; observations: number }> {
    const stats = this.getArmStats();
    const sorted = Array.from(stats.entries())
      .filter(([, stat]) => stat.count >= 5) // Minimum observations
      .sort((a, b) => b[1].winRate - a[1].winRate);

    return sorted.slice(0, count).map(([source, stat]) => ({
      source,
      winRate: stat.winRate,
      observations: stat.count,
    }));
  }

  /**
   * Get underperforming sources that might need investigation
   */
  getUnderperformingSources(): Array<{ source: string; winRate: number; observations: number }> {
    const stats = this.getArmStats();
    return Array.from(stats.entries())
      .filter(([, stat]) => stat.count >= 10 && stat.winRate < 0.4)
      .map(([source, stat]) => ({
        source,
        winRate: stat.winRate,
        observations: stat.count,
      }));
  }

  /**
   * Get summary for logging/display
   */
  getSummary(): {
    totalTrades: number;
    explorationRate: number;
    topSources: Array<{ source: string; winRate: number }>;
    bottomSources: Array<{ source: string; winRate: number }>;
  } {
    const stats = this.getArmStats();
    const sorted = Array.from(stats.entries())
      .filter(([, stat]) => stat.count >= 5)
      .sort((a, b) => b[1].winRate - a[1].winRate);

    return {
      totalTrades: this.totalTradesProcessed,
      explorationRate: this.explorationRate,
      topSources: sorted.slice(0, 3).map(([source, stat]) => ({
        source,
        winRate: Math.round(stat.winRate * 100) / 100,
      })),
      bottomSources: sorted
        .slice(-3)
        .reverse()
        .map(([source, stat]) => ({
          source,
          winRate: Math.round(stat.winRate * 100) / 100,
        })),
    };
  }

  // ==========================================
  // Persistence
  // ==========================================

  private async saveState(): Promise<void> {
    if (!this.statePath) return;

    try {
      const state: BanditState = {
        version: BANDIT_VERSION,
        lastUpdated: Date.now(),
        arms: Object.fromEntries(this.arms),
        totalTradesProcessed: this.totalTradesProcessed,
        explorationRate: this.explorationRate,
      };

      fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
      logger.debug("[WeightBandit] State saved");
    } catch (error) {
      logger.error(`[WeightBandit] Error saving state: ${error}`);
    }
  }

  private loadState(state: BanditState): void {
    this.totalTradesProcessed = state.totalTradesProcessed || 0;
    this.explorationRate = state.explorationRate || 1.0;

    if (state.arms) {
      for (const [source, params] of Object.entries(state.arms)) {
        this.arms.set(source, params);
      }
    }
  }

  /**
   * Reset all learning (for debugging/testing)
   */
  async reset(): Promise<void> {
    for (const source of KNOWN_SOURCES) {
      this.arms.set(source, {
        alpha: DEFAULT_PRIOR_ALPHA,
        beta: DEFAULT_PRIOR_BETA,
        count: 0,
        lastUpdated: Date.now(),
      });
    }
    this.totalTradesProcessed = 0;
    this.explorationRate = 1.0;
    this.cachedSampledWeights.clear();

    await this.saveState();
    logger.warn("[WeightBandit] Reset to initial priors");
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}

export default VinceWeightBanditService;
