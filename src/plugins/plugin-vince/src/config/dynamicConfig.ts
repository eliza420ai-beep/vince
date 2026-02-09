/**
 * VINCE Dynamic Configuration System
 *
 * This module provides a runtime-adjustable configuration system that:
 * - Loads tuned parameters from a JSON file
 * - Allows the Parameter Tuner service to adjust values based on performance
 * - Falls back to static defaults when no tuned config exists
 * - Maintains a history of all adjustments for transparency
 *
 * This is a key component of the self-improving architecture:
 * The system can modify its own behavior based on trade performance.
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";
import {
  SIGNAL_THRESHOLDS,
  PERSISTENCE_DIR,
  DEFAULT_RISK_LIMITS,
} from "../constants/paperTradingDefaults";

// ==========================================
// Types
// ==========================================

export interface SignalThresholds {
  minStrength: number;
  minConfidence: number;
  minConfirming: number;
  strongStrength: number;
  highConfidence: number;
}

export interface SourceWeights {
  [source: string]: number;
}

export interface AdjustmentRecord {
  timestamp: number;
  parameter: string;
  oldValue: number;
  newValue: number;
  reason: string;
  sampleSize?: number;
  winRate?: number;
}

export interface TunedConfig {
  version: string;
  lastUpdated: number;
  thresholds: SignalThresholds;
  sourceWeights: SourceWeights;
  adjustmentHistory: AdjustmentRecord[];
}

// ==========================================
// Default Values (from paperTradingDefaults)
// ==========================================

const DEFAULT_THRESHOLDS: SignalThresholds = {
  minStrength: SIGNAL_THRESHOLDS.MIN_STRENGTH,
  minConfidence: SIGNAL_THRESHOLDS.MIN_CONFIDENCE,
  minConfirming: SIGNAL_THRESHOLDS.MIN_CONFIRMING,
  strongStrength: SIGNAL_THRESHOLDS.STRONG_STRENGTH,
  highConfidence: SIGNAL_THRESHOLDS.HIGH_CONFIDENCE,
};

const DEFAULT_SOURCE_WEIGHTS: SourceWeights = {
  // High-impact events (2.0x) - immediate price impact
  LiquidationCascade: 2.0,
  LiquidationPressure: 1.6,

  // Proven mean-reversion signals (1.5x)
  BinanceFundingExtreme: 1.5,
  DeribitPutCallRatio: 1.4,
  HyperliquidCrowding: 1.4,
  HyperliquidFundingExtreme: 1.35, // HL funding in top/bottom 10% (history-based)
  HyperliquidOICap: 1.2, // Perp at OI cap = max crowding, contrarian

  // Smart money / whale activity
  // NOTE: TopTraders disabled - wallets.json has no real addresses configured
  // NOTE: SanbaseWhales disabled - free tier has 30-day lag (useless for trading)
  // Only BinanceTopTraders provides real-time data (public API)
  TopTraders: 0.0, // DISABLED - add real wallet addresses to wallets.json to enable
  BinanceTopTraders: 1.0, // Real data from public Binance API
  SanbaseWhales: 0.0, // DISABLED - 30-day lag on free tier

  // Strong on-chain signals (1.2x)
  SanbaseExchangeFlows: 1.2,
  CrossVenueFunding: 1.2,

  // Market data signals (1.0x - baseline)
  CoinGlass: 1.0,
  BinanceTakerFlow: 1.0,
  BinanceLongShort: 0.9, // All-accounts L/S from Binance (contrarian)
  BinanceOIFlush: 0.7, // Weak: OI dropping sharply (position flush, often precedes bounce)
  DeribitIVSkew: 1.0,
  HyperliquidBias: 1.0,
  MarketRegime: 1.0,

  // Noisy / lagging signals (0.6x)
  NewsSentiment: 0.6,
  XSentiment: 0.5, // X (Twitter) sentiment, staggered one per hour, cache 24h
};

const CONFIG_FILE_NAME = "tuned-config.json";
const CONFIG_VERSION = "1.0.0";
const MAX_HISTORY_ENTRIES = 100;

// ==========================================
// Dynamic Config Manager
// ==========================================

class DynamicConfigManager {
  private config: TunedConfig;
  private configPath: string | null = null;
  private initialized = false;

  constructor() {
    // Initialize with defaults
    this.config = {
      version: CONFIG_VERSION,
      lastUpdated: Date.now(),
      thresholds: { ...DEFAULT_THRESHOLDS },
      sourceWeights: { ...DEFAULT_SOURCE_WEIGHTS },
      adjustmentHistory: [],
    };
  }

  /**
   * Initialize the config manager with a persistence directory
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const elizaDbDir = path.join(process.cwd(), ".elizadb");
      const persistDir = path.join(elizaDbDir, PERSISTENCE_DIR);

      if (!fs.existsSync(persistDir)) {
        fs.mkdirSync(persistDir, { recursive: true });
      }

      this.configPath = path.join(persistDir, CONFIG_FILE_NAME);

      // Try to load existing config
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, "utf-8"));
        this.config = this.mergeWithDefaults(data);
        logger.info(
          `[DynamicConfig] Loaded tuned config (${this.config.adjustmentHistory.length} adjustments)`,
        );
      } else {
        // Save default config
        await this.save();
        logger.info("[DynamicConfig] Created new config with defaults");
      }

      this.initialized = true;
    } catch (error) {
      logger.warn(`[DynamicConfig] Could not initialize: ${error}`);
      // Continue with defaults
      this.initialized = true;
    }
  }

  /**
   * Merge loaded config with defaults (handles missing keys)
   */
  private mergeWithDefaults(loaded: Partial<TunedConfig>): TunedConfig {
    return {
      version: loaded.version || CONFIG_VERSION,
      lastUpdated: loaded.lastUpdated || Date.now(),
      thresholds: {
        ...DEFAULT_THRESHOLDS,
        ...(loaded.thresholds || {}),
      },
      sourceWeights: {
        ...DEFAULT_SOURCE_WEIGHTS,
        ...(loaded.sourceWeights || {}),
      },
      adjustmentHistory: loaded.adjustmentHistory || [],
    };
  }

  /**
   * Save config to disk
   */
  async save(): Promise<void> {
    if (!this.configPath) return;

    try {
      this.config.lastUpdated = Date.now();

      // Trim history if too long
      if (this.config.adjustmentHistory.length > MAX_HISTORY_ENTRIES) {
        this.config.adjustmentHistory =
          this.config.adjustmentHistory.slice(-MAX_HISTORY_ENTRIES);
      }

      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      logger.debug("[DynamicConfig] Config saved");
    } catch (error) {
      logger.error(`[DynamicConfig] Failed to save: ${error}`);
    }
  }

  // ==========================================
  // Getters
  // ==========================================

  getThresholds(): SignalThresholds {
    return { ...this.config.thresholds };
  }

  getSourceWeight(source: string): number {
    return this.config.sourceWeights[source] ?? 1.0;
  }

  getAllSourceWeights(): SourceWeights {
    return { ...this.config.sourceWeights };
  }

  getAdjustmentHistory(): AdjustmentRecord[] {
    return [...this.config.adjustmentHistory];
  }

  getLastUpdated(): number {
    return this.config.lastUpdated;
  }

  // ==========================================
  // Setters (with history tracking)
  // ==========================================

  /**
   * Update a threshold value
   */
  async updateThreshold(
    key: keyof SignalThresholds,
    newValue: number,
    reason: string,
    metadata?: { sampleSize?: number; winRate?: number },
  ): Promise<void> {
    const oldValue = this.config.thresholds[key];

    if (oldValue === newValue) return;

    // Validate bounds
    const bounds = this.getThresholdBounds(key);
    newValue = Math.max(bounds.min, Math.min(bounds.max, newValue));

    // Record the adjustment
    this.config.adjustmentHistory.push({
      timestamp: Date.now(),
      parameter: `threshold.${key}`,
      oldValue,
      newValue,
      reason,
      ...metadata,
    });

    this.config.thresholds[key] = newValue;

    logger.info(
      `[DynamicConfig] Threshold ${key}: ${oldValue} → ${newValue} | ${reason}`,
    );

    await this.save();
  }

  /**
   * Update a source weight
   */
  async updateSourceWeight(
    source: string,
    newWeight: number,
    reason: string,
    metadata?: { sampleSize?: number; winRate?: number },
  ): Promise<void> {
    const oldWeight = this.config.sourceWeights[source] ?? 1.0;

    if (oldWeight === newWeight) return;

    // Validate bounds (weights should be between 0.1 and 3.0)
    newWeight = Math.max(0.1, Math.min(3.0, newWeight));

    // Record the adjustment
    this.config.adjustmentHistory.push({
      timestamp: Date.now(),
      parameter: `sourceWeight.${source}`,
      oldValue: oldWeight,
      newValue: newWeight,
      reason,
      ...metadata,
    });

    this.config.sourceWeights[source] = newWeight;

    logger.info(
      `[DynamicConfig] Source ${source}: ${oldWeight.toFixed(2)} → ${newWeight.toFixed(2)} | ${reason}`,
    );

    await this.save();
  }

  /**
   * Get bounds for threshold adjustments
   */
  private getThresholdBounds(key: keyof SignalThresholds): {
    min: number;
    max: number;
  } {
    switch (key) {
      case "minStrength":
        return { min: 30, max: 90 }; // Learning Mode: allow down to 30%
      case "minConfidence":
        return { min: 30, max: 90 }; // Learning Mode: allow down to 30%
      case "minConfirming":
        return { min: 2, max: 5 }; // Need at least 2, max 5
      case "strongStrength":
        return { min: 50, max: 95 }; // Lowered for Learning Mode
      case "highConfidence":
        return { min: 50, max: 95 }; // Lowered for Learning Mode
      default:
        return { min: 0, max: 100 };
    }
  }

  // ==========================================
  // Utilities
  // ==========================================

  /**
   * Reset all values to defaults
   */
  async resetToDefaults(reason: string): Promise<void> {
    // Record all resets in history
    for (const [key, value] of Object.entries(DEFAULT_THRESHOLDS)) {
      if (this.config.thresholds[key as keyof SignalThresholds] !== value) {
        this.config.adjustmentHistory.push({
          timestamp: Date.now(),
          parameter: `threshold.${key}`,
          oldValue: this.config.thresholds[key as keyof SignalThresholds],
          newValue: value,
          reason: `RESET: ${reason}`,
        });
      }
    }

    for (const [source, weight] of Object.entries(DEFAULT_SOURCE_WEIGHTS)) {
      if (this.config.sourceWeights[source] !== weight) {
        this.config.adjustmentHistory.push({
          timestamp: Date.now(),
          parameter: `sourceWeight.${source}`,
          oldValue: this.config.sourceWeights[source] ?? 1.0,
          newValue: weight,
          reason: `RESET: ${reason}`,
        });
      }
    }

    this.config.thresholds = { ...DEFAULT_THRESHOLDS };
    this.config.sourceWeights = { ...DEFAULT_SOURCE_WEIGHTS };

    logger.warn(`[DynamicConfig] Reset to defaults: ${reason}`);
    await this.save();
  }

  /**
   * Get a summary of recent adjustments
   */
  getRecentAdjustments(count: number = 10): AdjustmentRecord[] {
    return this.config.adjustmentHistory.slice(-count);
  }

  /**
   * Check if config has been modified from defaults
   */
  isModified(): boolean {
    return this.config.adjustmentHistory.length > 0;
  }

  /**
   * Get config state for persistence/debugging
   */
  getState(): TunedConfig {
    return JSON.parse(JSON.stringify(this.config));
  }
}

// ==========================================
// Singleton Export
// ==========================================

export const dynamicConfig = new DynamicConfigManager();

// Helper function to ensure initialization
export async function initializeDynamicConfig(): Promise<void> {
  await dynamicConfig.initialize();
}

// ==========================================
// Convenience Functions
// ==========================================

/**
 * Get the current signal thresholds (auto-initializes if needed)
 */
export function getThresholds(): SignalThresholds {
  return dynamicConfig.getThresholds();
}

/**
 * Get weight for a specific source
 */
export function getSourceWeight(source: string): number {
  return dynamicConfig.getSourceWeight(source);
}

/**
 * Check if a signal meets the minimum thresholds
 */
export function meetsThresholds(
  strength: number,
  confidence: number,
  confirmingCount: number,
): boolean {
  const thresholds = dynamicConfig.getThresholds();
  return (
    strength >= thresholds.minStrength &&
    confidence >= thresholds.minConfidence &&
    confirmingCount >= thresholds.minConfirming
  );
}
