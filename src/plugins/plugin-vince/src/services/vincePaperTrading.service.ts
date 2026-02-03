/**
 * VINCE Paper Trading Service
 *
 * Main orchestration service for paper trading:
 * - Order simulation with slippage
 * - Signal evaluation and trade execution
 * - Position lifecycle management
 * - State persistence
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { 
  Position, 
  SimulatedOrder, 
  AggregatedTradeSignal,
  TradeSignalDetail,
  TradeMarketContext,
} from "../types/paperTrading";
import type { VincePositionManagerService } from "./vincePositionManager.service";
import type { VinceRiskManagerService } from "./vinceRiskManager.service";
import type { VinceTradeJournalService } from "./vinceTradeJournal.service";
import type { VinceSignalAggregatorService, AggregatedSignal } from "./signalAggregator.service";
import type { VinceMarketDataService } from "./marketData.service";
import type { VinceCoinGlassService } from "./coinglass.service";
import type { VinceMarketRegimeService, MarketRegime } from "./marketRegime.service";
// V4: ML Integration Services
import type { VinceFeatureStoreService } from "./vinceFeatureStore.service";
import type { VinceWeightBanditService } from "./weightBandit.service";
import type { VinceSignalSimilarityService } from "./signalSimilarity.service";
import type { VinceNewsSentimentService } from "./newsSentiment.service";
import {
  SLIPPAGE,
  FEES,
  DEFAULT_LEVERAGE,
  AGGRESSIVE_LEVERAGE,
  AGGRESSIVE_MARGIN_USD,
  AGGRESSIVE_BASE_SIZE_PCT,
  AGGRESSIVE_RISK_LIMITS,
  DEFAULT_STOP_LOSS_PCT,
  DEFAULT_TAKE_PROFIT_TARGETS,
  TAKE_PROFIT_USD_AGGRESSIVE,
  getPaperTradeAssets,
  TIMING,
  PERSISTENCE_DIR,
} from "../constants/paperTradingDefaults";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { formatUsd } from "../utils/tradeExplainer";

// ==========================================
// Pending Entry Types
// ==========================================
interface PendingEntry {
  id: string;
  asset: string;
  direction: "long" | "short";
  signal: AggregatedTradeSignal;
  targetPrice: number;       // Price we're waiting for
  triggerPrice: number;      // Price when signal was generated
  sizeUsd: number;
  leverage: number;
  createdAt: number;
  expiresAt: number;         // Entry expires if not filled within 5 minutes
  isCascadeSignal: boolean;  // Cascade signals enter immediately, skip pullback
}

// Pullback configuration
const PULLBACK_CONFIG = {
  pullbackPct: 0.15,         // Wait for 0.15% pullback (was 0.3% - too aggressive, entries kept expiring)
  timeoutMs: 3 * 60 * 1000,  // 3 minute timeout (was 5 min)
};

export class VincePaperTradingService extends Service {
  static serviceType = "VINCE_PAPER_TRADING_SERVICE";
  capabilityDescription = "Paper trading orchestration with simulated execution";

  private initialized = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private persistenceDir: string | null = null;
  private pendingEntries: Map<string, PendingEntry> = new Map();

  // Win-streak tracking for position sizing (last 5 trades)
  private recentTradeOutcomes: boolean[] = []; // true = win, false = loss
  private readonly MAX_STREAK_HISTORY = 5;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VincePaperTradingService> {
    const service = new VincePaperTradingService(runtime);
    await service.initialize();
    logger.info("[VincePaperTrading] ✅ Service started");
    return service;
  }

  async stop(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    await this.persistState();
    logger.info("[VincePaperTrading] Service stopped");
  }

  private async initialize(): Promise<void> {
    // Setup persistence directory
    try {
      const elizaDbDir = path.join(process.cwd(), ".elizadb");
      this.persistenceDir = path.join(elizaDbDir, PERSISTENCE_DIR);
      
      if (!fs.existsSync(this.persistenceDir)) {
        fs.mkdirSync(this.persistenceDir, { recursive: true });
      }

      // Try to restore state
      await this.restoreState();
    } catch (error) {
      logger.warn(`[VincePaperTrading] Could not setup persistence: ${error}`);
    }

    // Start update loop
    this.startUpdateLoop();
    this.initialized = true;
  }

  // ==========================================
  // Service Getters
  // ==========================================

  private getPositionManager(): VincePositionManagerService | null {
    return this.runtime.getService("VINCE_POSITION_MANAGER_SERVICE") as VincePositionManagerService | null;
  }

  private getRiskManager(): VinceRiskManagerService | null {
    return this.runtime.getService("VINCE_RISK_MANAGER_SERVICE") as VinceRiskManagerService | null;
  }

  private getTradeJournal(): VinceTradeJournalService | null {
    return this.runtime.getService("VINCE_TRADE_JOURNAL_SERVICE") as VinceTradeJournalService | null;
  }

  private getSignalAggregator(): VinceSignalAggregatorService | null {
    return this.runtime.getService("VINCE_SIGNAL_AGGREGATOR_SERVICE") as VinceSignalAggregatorService | null;
  }

  private getMarketData(): VinceMarketDataService | null {
    return this.runtime.getService("VINCE_MARKET_DATA_SERVICE") as VinceMarketDataService | null;
  }

  private getCoinGlass(): VinceCoinGlassService | null {
    return this.runtime.getService("VINCE_COINGLASS_SERVICE") as VinceCoinGlassService | null;
  }

  private getMarketRegime(): VinceMarketRegimeService | null {
    return this.runtime.getService("VINCE_MARKET_REGIME_SERVICE") as VinceMarketRegimeService | null;
  }

  // V4: ML Services
  private getFeatureStore(): VinceFeatureStoreService | null {
    return this.runtime.getService("VINCE_FEATURE_STORE_SERVICE") as VinceFeatureStoreService | null;
  }

  private getWeightBandit(): VinceWeightBanditService | null {
    return this.runtime.getService("VINCE_WEIGHT_BANDIT_SERVICE") as VinceWeightBanditService | null;
  }

  private getSignalSimilarity(): VinceSignalSimilarityService | null {
    return this.runtime.getService("VINCE_SIGNAL_SIMILARITY_SERVICE") as VinceSignalSimilarityService | null;
  }
  
  private getNewsSentiment(): VinceNewsSentimentService | null {
    return this.runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as VinceNewsSentimentService | null;
  }

  // ==========================================
  // Win-Streak Position Sizing
  // ==========================================

  /**
   * Record trade outcome for streak tracking
   */
  recordTradeOutcome(isWin: boolean): void {
    this.recentTradeOutcomes.push(isWin);
    
    // Keep only last 5 trades
    if (this.recentTradeOutcomes.length > this.MAX_STREAK_HISTORY) {
      this.recentTradeOutcomes.shift();
    }
    
    const streakInfo = this.getStreakInfo();
    logger.debug(
      `[VincePaperTrading] Trade outcome recorded: ${isWin ? "WIN" : "LOSS"} | ` +
      `Recent: ${this.recentTradeOutcomes.map(w => w ? "W" : "L").join("")} | ` +
      `Multiplier: ${streakInfo.multiplier}x`
    );
  }

  /**
   * Get current streak information and size multiplier
   * 
   * Returns:
   * - 1.2x for 3+ consecutive wins (confidence boost)
   * - 0.7x for 3+ consecutive losses (risk reduction)
   * - 1.0x otherwise
   */
  getStreakInfo(): { 
    consecutiveWins: number; 
    consecutiveLosses: number; 
    multiplier: number;
    reason?: string;
  } {
    if (this.recentTradeOutcomes.length === 0) {
      return { consecutiveWins: 0, consecutiveLosses: 0, multiplier: 1.0 };
    }

    // Count consecutive wins/losses from the end
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    
    // Check from most recent
    for (let i = this.recentTradeOutcomes.length - 1; i >= 0; i--) {
      if (this.recentTradeOutcomes[i]) {
        if (consecutiveLosses === 0) {
          consecutiveWins++;
        } else {
          break; // Streak broken
        }
      } else {
        if (consecutiveWins === 0) {
          consecutiveLosses++;
        } else {
          break; // Streak broken
        }
      }
    }

    // Determine multiplier
    let multiplier = 1.0;
    let reason: string | undefined;

    if (consecutiveWins >= 3) {
      multiplier = 1.2;
      reason = `🔥 Win streak (${consecutiveWins}): +20% size`;
    } else if (consecutiveLosses >= 3) {
      multiplier = 0.7;
      reason = `⚠️ Loss streak (${consecutiveLosses}): -30% size`;
    }

    return { consecutiveWins, consecutiveLosses, multiplier, reason };
  }

  // ==========================================
  // Trade Decision Logging
  // ==========================================

  /**
   * Log why a signal was rejected (didn't meet thresholds)
   */
  private logSignalRejection(
    asset: string, 
    signal: AggregatedTradeSignal, 
    reason: string
  ): void {
    // Rate limit: only log once per asset per 5 minutes
    const cacheKey = `signal_reject_${asset}`;
    const lastLog = this.lastRejectionLog.get(cacheKey);
    const now = Date.now();
    
    if (lastLog && now - lastLog < 5 * 60 * 1000) {
      return; // Skip, logged recently
    }
    this.lastRejectionLog.set(cacheKey, now);

    // Get actual thresholds from risk manager
    const riskManager = this.getRiskManager();
    const limits = riskManager?.getLimits();
    const minStrength = limits?.minSignalStrength ?? 60;
    const minConfidence = limits?.minSignalConfidence ?? 60;
    // HYPE has fewer signal sources, so lower minimum
    const minConfirming = asset === "HYPE" ? 2 : (limits?.minConfirmingSignals ?? 3);

    const dirIcon = signal.direction === "long" ? "🟢" : signal.direction === "short" ? "🔴" : "⚪";
    const strengthBar = this.createProgressBar(signal.strength, minStrength);
    const confidenceBar = this.createProgressBar(signal.confidence, minConfidence);
    
    console.log("");
    console.log(`  ┌─────────────────────────────────────────────────────────────────┐`);
    console.log(`  │  ⏸️  SIGNAL EVALUATED - NO TRADE: ${asset.padEnd(6)}                        │`);
    console.log(`  ├─────────────────────────────────────────────────────────────────┤`);
    console.log(`  │  Bias: ${dirIcon} ${signal.direction.toUpperCase().padEnd(6)} │ Reason: ${reason.substring(0, 30).padEnd(30)} │`);
    console.log(`  ├─────────────────────────────────────────────────────────────────┤`);
    console.log(`  │  Strength:   ${strengthBar} ${signal.strength.toFixed(0).padStart(3)}% (need ${minStrength}%)        │`);
    console.log(`  │  Confidence: ${confidenceBar} ${signal.confidence.toFixed(0).padStart(3)}% (need ${minConfidence}%)        │`);
    console.log(`  │  Confirming: ${signal.confirmingCount} signals (need ${minConfirming})                            │`);
    console.log(`  └─────────────────────────────────────────────────────────────────┘`);
  }

  /**
   * Log why a trade was rejected by risk manager
   */
  private logTradeRejection(
    asset: string,
    direction: "long" | "short",
    reason: string
  ): void {
    const dirIcon = direction === "long" ? "🟢" : "🔴";
    
    console.log("");
    console.log(`  ┌─────────────────────────────────────────────────────────────────┐`);
    console.log(`  │  🚫 TRADE BLOCKED BY RISK MANAGER: ${asset.padEnd(6)}                      │`);
    console.log(`  ├─────────────────────────────────────────────────────────────────┤`);
    console.log(`  │  Direction: ${dirIcon} ${direction.toUpperCase().padEnd(6)}                                        │`);
    console.log(`  │  Reason: ${reason.substring(0, 53).padEnd(53)} │`);
    console.log(`  └─────────────────────────────────────────────────────────────────┘`);
  }

  /**
   * Create a simple ASCII progress bar
   */
  private createProgressBar(value: number, threshold: number): string {
    const width = 20;
    const filled = Math.min(width, Math.round((value / 100) * width));
    const thresholdPos = Math.round((threshold / 100) * width);
    
    let bar = "";
    for (let i = 0; i < width; i++) {
      if (i < filled) {
        bar += value >= threshold ? "█" : "▓";
      } else if (i === thresholdPos) {
        bar += "│";
      } else {
        bar += "░";
      }
    }
    return `[${bar}]`;
  }

  // Track last rejection log time per asset to avoid spam
  private lastRejectionLog: Map<string, number> = new Map();

  // ==========================================
  // Order Simulation
  // ==========================================

  simulateOrder(params: {
    asset: string;
    side: "buy" | "sell";
    sizeUsd: number;
    type: "market" | "limit";
    limitPrice?: number;
  }): SimulatedOrder {
    const { asset, side, sizeUsd, type, limitPrice } = params;

    const order: SimulatedOrder = {
      id: uuidv4(),
      asset,
      type,
      side,
      sizeUsd,
      limitPrice,
      status: "pending",
      createdAt: Date.now(),
    };

    // For market orders, execute immediately with slippage
    if (type === "market") {
      const marketData = this.getMarketData();
      const currentPrice = marketData ? (marketData as any).getCurrentPrice?.(asset) : null;
      
      if (currentPrice) {
        // Calculate slippage
        const slippageBps = this.calculateSlippage(sizeUsd);
        const slippageMultiplier = side === "buy" ? (1 + slippageBps / 10000) : (1 - slippageBps / 10000);
        const executedPrice = currentPrice * slippageMultiplier;

        // Calculate fees
        const feesBps = FEES.TAKER_BPS;
        const fees = (sizeUsd * feesBps) / 10000;

        order.executedPrice = executedPrice;
        order.slippage = slippageBps;
        order.fees = fees;
        order.status = "filled";
        order.executedAt = Date.now();
      } else {
        order.status = "rejected";
        order.rejectReason = "Could not get current price";
      }
    }

    return order;
  }

  private calculateSlippage(sizeUsd: number): number {
    // Base slippage + size impact
    let slippageBps = SLIPPAGE.BASE_BPS;
    
    // Add size impact (2 bps per $10k)
    slippageBps += Math.floor(sizeUsd / 10000) * SLIPPAGE.SIZE_IMPACT_BPS_PER_10K;
    
    // Cap at maximum
    return Math.min(slippageBps, SLIPPAGE.MAX_BPS);
  }

  // ==========================================
  // Trade Execution
  // ==========================================

  async evaluateAndTrade(): Promise<void> {
    const positionManager = this.getPositionManager();
    const riskManager = this.getRiskManager();
    const signalAggregator = this.getSignalAggregator();
    const marketData = this.getMarketData();

    if (!positionManager || !riskManager || !signalAggregator) {
      return;
    }

    // First, check pending entries for pullbacks
    await this.checkPendingEntries();

    const assets = getPaperTradeAssets(this.runtime);
    for (const asset of assets) {
      try {
        // Skip if we already have a position in this asset
        if (positionManager.hasOpenPosition(asset)) {
          continue;
        }

        // Skip if we already have a pending entry for this asset
        if (this.hasPendingEntry(asset)) {
          continue;
        }

        // Get aggregated signal
        const signal = await signalAggregator.getSignal(asset);
        if (!signal) continue;

        // Convert to AggregatedTradeSignal format
        // Now using the proper confirmingCount from multi-source aggregation
        const tradeSignal: AggregatedTradeSignal = {
          asset,
          direction: signal.direction,
          strength: signal.strength,
          confidence: signal.confidence,
          confirmingCount: signal.confirmingCount ?? signal.factors.length, // Use new field, fallback to factors
          conflictingCount: 0,
          signals: signal.factors.map((f, i) => ({
            source: signal.sources?.[i] || signal.sources?.[0] || "signal_aggregator",
            direction: signal.direction,
            strength: signal.strength,
            description: f,
          })),
          reasons: signal.factors,
          sourceBreakdown: signal.sources?.reduce((acc, src) => {
            acc[src] = (acc[src] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {},
          timestamp: Date.now(),
        };

        // Validate signal
        const signalValidation = riskManager.validateSignal(tradeSignal);
        if (!signalValidation.valid) {
          // Log WHY signal was rejected (only for meaningful signals, not neutral)
          if (signal.direction !== "neutral" && signal.strength > 30) {
            this.logSignalRejection(asset, tradeSignal, signalValidation.reason || "threshold not met");
          }
          continue;
        }

        // Calculate position size
        const portfolio = positionManager.getPortfolio();
        const aggressive = this.runtime.getSetting?.("vince_paper_aggressive") === true || this.runtime.getSetting?.("vince_paper_aggressive") === "true";
        const leverage = aggressive ? AGGRESSIVE_LEVERAGE : DEFAULT_LEVERAGE;
        let baseSizeUsd = aggressive
          ? (portfolio.totalValue >= AGGRESSIVE_MARGIN_USD
              ? AGGRESSIVE_MARGIN_USD * AGGRESSIVE_LEVERAGE
              : portfolio.totalValue * (AGGRESSIVE_BASE_SIZE_PCT / 100))
          : portfolio.totalValue * 0.05;
        if (aggressive && baseSizeUsd > portfolio.totalValue * (AGGRESSIVE_RISK_LIMITS.maxPositionSizePct / 100)) {
          baseSizeUsd = portfolio.totalValue * (AGGRESSIVE_RISK_LIMITS.maxPositionSizePct / 100);
        }

        // Apply correlation filter (reduce size for correlated positions)
        const correlationResult = riskManager.getCorrelationSizeMultiplier(
          asset,
          signal.direction as "long" | "short",
          positionManager.getOpenPositions()
        );
        baseSizeUsd = baseSizeUsd * correlationResult.multiplier;
        if (correlationResult.reason) {
          logger.info(`[VincePaperTrading] ${asset}: ${correlationResult.reason}`);
        }

        // Apply DVOL-adjusted sizing (reduce size in high volatility)
        if (marketData && (asset === "BTC" || asset === "ETH")) {
          const dvol = await marketData.getDVOL(asset);
          if (dvol !== null) {
            if (dvol > 85) {
              // Extreme volatility: 50% size
              baseSizeUsd = baseSizeUsd * 0.5;
              logger.info(`[VincePaperTrading] ${asset} DVOL ${dvol.toFixed(0)} (>85): size reduced 50%`);
            } else if (dvol > 70) {
              // High volatility: 70% size
              baseSizeUsd = baseSizeUsd * 0.7;
              logger.info(`[VincePaperTrading] ${asset} DVOL ${dvol.toFixed(0)} (>70): size reduced 30%`);
            }
          }
        }

        // Apply regime-based sizing adjustment
        const regimeService = this.getMarketRegime();
        let regime: MarketRegime | null = null;
        if (regimeService) {
          try {
            regime = await regimeService.getRegime(asset);
            if (regime.positionSizeMultiplier !== 1.0) {
              baseSizeUsd = baseSizeUsd * regime.positionSizeMultiplier;
              logger.info(
                `[VincePaperTrading] ${asset} regime ${regime.regime}: size ${regime.positionSizeMultiplier}x`
              );
            }
          } catch (e) {
            logger.debug(`[VincePaperTrading] Could not get regime for ${asset}: ${e}`);
          }
        }

        // Apply session-based sizing (from time modifiers)
        const timeModifiers = riskManager.getTimeModifiers();
        if (timeModifiers.sizeMultiplier !== 1.0) {
          baseSizeUsd = baseSizeUsd * timeModifiers.sizeMultiplier;
          logger.info(
            `[VincePaperTrading] ${asset} session (${timeModifiers.session.session}): size ${timeModifiers.sizeMultiplier}x`
          );
        }

        // Apply win-streak sizing adjustment
        const streakInfo = this.getStreakInfo();
        if (streakInfo.multiplier !== 1.0) {
          baseSizeUsd = baseSizeUsd * streakInfo.multiplier;
          if (streakInfo.reason) {
            logger.info(`[VincePaperTrading] ${asset}: ${streakInfo.reason}`);
          }
        }

        // Validate trade
        const tradeValidation = riskManager.validateTrade({
          sizeUsd: baseSizeUsd,
          leverage,
          portfolioValue: portfolio.totalValue,
          currentExposure: positionManager.getCurrentExposure(),
        });

        if (!tradeValidation.valid) {
          // Log WHY trade was rejected by risk manager
          this.logTradeRejection(asset, signal.direction as "long" | "short", tradeValidation.reason || "risk check failed");
          continue;
        }

        const finalSize = tradeValidation.adjustedSize || baseSizeUsd;

        // Check if this is a cascade signal (requires immediate entry)
        const isCascadeSignal = signal.sources?.includes("LiquidationCascade") || 
                                signal.sources?.includes("LiquidationPressure");

        // Get current price
        let currentPrice = 0;
        if (marketData) {
          const ctx = await marketData.getEnrichedContext(asset);
          currentPrice = ctx?.currentPrice || 0;
        }

        // Execute immediately - pullback entries were causing too many missed trades
        await this.openTrade({
          asset,
          direction: signal.direction as "long" | "short",
          sizeUsd: finalSize,
          leverage,
          signal: tradeSignal,
        });

      } catch (error) {
        logger.error(`[VincePaperTrading] Error evaluating ${asset}: ${error}`);
      }
    }
  }

  // ==========================================
  // Pending Entry Management (Pullback Entry)
  // ==========================================

  private hasPendingEntry(asset: string): boolean {
    for (const entry of this.pendingEntries.values()) {
      if (entry.asset === asset) {
        return true;
      }
    }
    return false;
  }

  private createPendingEntry(params: {
    asset: string;
    direction: "long" | "short";
    signal: AggregatedTradeSignal;
    currentPrice: number;
    sizeUsd: number;
    leverage: number;
    isCascadeSignal: boolean;
  }): void {
    const { asset, direction, signal, currentPrice, sizeUsd, leverage, isCascadeSignal } = params;

    // Calculate target price (pullback)
    const pullbackPct = PULLBACK_CONFIG.pullbackPct / 100;
    let targetPrice: number;
    
    if (direction === "long") {
      // For LONG: Wait for price to drop 0.3%
      targetPrice = currentPrice * (1 - pullbackPct);
    } else {
      // For SHORT: Wait for price to rise 0.3%
      targetPrice = currentPrice * (1 + pullbackPct);
    }

    const entry: PendingEntry = {
      id: uuidv4(),
      asset,
      direction,
      signal,
      targetPrice,
      triggerPrice: currentPrice,
      sizeUsd,
      leverage,
      createdAt: Date.now(),
      expiresAt: Date.now() + PULLBACK_CONFIG.timeoutMs,
      isCascadeSignal,
    };

    this.pendingEntries.set(entry.id, entry);
    
    // Log pending entry with signal context
    const dirIcon = direction === "long" ? "🟢" : "🔴";
    const pullbackDirection = direction === "long" ? "drop" : "rise";
    
    console.log("");
    console.log(`  ┌─────────────────────────────────────────────────────────────────┐`);
    console.log(`  │  📝 PENDING ENTRY: ${dirIcon} ${direction.toUpperCase()} ${asset.padEnd(6)}                             │`);
    console.log(`  ├─────────────────────────────────────────────────────────────────┤`);
    console.log(`  │  Waiting for ${PULLBACK_CONFIG.pullbackPct}% ${pullbackDirection} before entry                        │`);
    console.log(`  │  Current: $${currentPrice.toFixed(2).padEnd(12)} Target: $${targetPrice.toFixed(2).padEnd(12)}       │`);
    console.log(`  │  Size: ${formatUsd(sizeUsd).padEnd(10)} Leverage: ${leverage}x                          │`);
    console.log(`  ├─────────────────────────────────────────────────────────────────┤`);
    console.log(`  │  Signals: Str ${signal.strength.toFixed(0)}% | Conf ${signal.confidence.toFixed(0)}% | ${signal.confirmingCount} confirming              │`);
    console.log(`  │  Expires in 5 minutes                                          │`);
    console.log(`  └─────────────────────────────────────────────────────────────────┘`);
    
    logger.info(
      `[VincePaperTrading] 📝 Pending ${direction.toUpperCase()} ${asset}: waiting for pullback to $${targetPrice.toFixed(2)} ` +
      `(current: $${currentPrice.toFixed(2)}, expires in 5m)`
    );
  }

  private async checkPendingEntries(): Promise<void> {
    const marketData = this.getMarketData();
    const positionManager = this.getPositionManager();
    const now = Date.now();

    if (!marketData || !positionManager) return;

    for (const [id, entry] of this.pendingEntries) {
      try {
        // Check expiration
        if (now >= entry.expiresAt) {
          this.pendingEntries.delete(id);
          logger.info(`[VincePaperTrading] ⏰ Pending ${entry.asset} ${entry.direction} EXPIRED (no pullback)`);
          continue;
        }

        // Check if position already exists (race condition)
        if (positionManager.hasOpenPosition(entry.asset)) {
          this.pendingEntries.delete(id);
          continue;
        }

        // Get current price
        const ctx = await marketData.getEnrichedContext(entry.asset);
        if (!ctx?.currentPrice) continue;

        const currentPrice = ctx.currentPrice;

        // Check if pullback target hit
        let targetHit = false;
        if (entry.direction === "long" && currentPrice <= entry.targetPrice) {
          targetHit = true;
        } else if (entry.direction === "short" && currentPrice >= entry.targetPrice) {
          targetHit = true;
        }

        if (targetHit) {
          logger.info(
            `[VincePaperTrading] ✅ Pullback target HIT for ${entry.asset} ${entry.direction}: ` +
            `$${currentPrice.toFixed(2)} (target: $${entry.targetPrice.toFixed(2)})`
          );

          // Execute the trade at the better price
          await this.openTrade({
            asset: entry.asset,
            direction: entry.direction,
            sizeUsd: entry.sizeUsd,
            leverage: entry.leverage,
            signal: entry.signal,
          });

          this.pendingEntries.delete(id);
        }
      } catch (error) {
        logger.error(`[VincePaperTrading] Error checking pending entry ${entry.asset}: ${error}`);
        this.pendingEntries.delete(id);
      }
    }
  }

  getPendingEntries(): PendingEntry[] {
    return Array.from(this.pendingEntries.values());
  }

  async openTrade(params: {
    asset: string;
    direction: "long" | "short";
    sizeUsd: number;
    leverage: number;
    signal: AggregatedTradeSignal;
  }): Promise<Position | null> {
    const { asset, direction, sizeUsd, leverage, signal } = params;

    const positionManager = this.getPositionManager();
    const riskManager = this.getRiskManager();
    const tradeJournal = this.getTradeJournal();
    const marketData = this.getMarketData();

    if (!positionManager || !riskManager) {
      return null;
    }

    // Get current price
    let entryPrice: number;
    try {
      const ctx = marketData ? await (marketData as any).getEnrichedContext(asset) : null;
      entryPrice = ctx?.currentPrice;
      if (!entryPrice) {
        logger.warn(`[VincePaperTrading] Could not get entry price for ${asset}`);
        return null;
      }
    } catch (error) {
      logger.error(`[VincePaperTrading] Error getting price for ${asset}: ${error}`);
      return null;
    }

    // Apply slippage
    const slippageBps = this.calculateSlippage(sizeUsd);
    const slippageMultiplier = direction === "long" ? (1 + slippageBps / 10000) : (1 - slippageBps / 10000);
    entryPrice = entryPrice * slippageMultiplier;

    // Calculate ATR-based dynamic stop loss
    // Calculate ATR-based dynamic stop loss
    let stopLossPct = DEFAULT_STOP_LOSS_PCT; // Default fallback
    let entryATRPct: number | undefined;
    
    if (marketData) {
      try {
        entryATRPct = await marketData.getATRPercent(asset);
        // Use 1.5x ATR for stop loss, capped between 1% and 4%
        stopLossPct = Math.max(1, Math.min(4, entryATRPct * 1.5));
        logger.debug(`[VincePaperTrading] ${asset} ATR-based SL: ${stopLossPct.toFixed(2)}% (ATR: ${entryATRPct.toFixed(2)}%)`);
      } catch (e) {
        logger.debug(`[VincePaperTrading] Could not get ATR for ${asset}, using default SL`);
      }
    }

    const stopLossDistance = entryPrice * (stopLossPct / 100);
    const stopLossPrice = direction === "long"
      ? entryPrice - stopLossDistance
      : entryPrice + stopLossDistance;

    const aggressive = this.runtime.getSetting?.("vince_paper_aggressive") === true || this.runtime.getSetting?.("vince_paper_aggressive") === "true";
    const takeProfitPrices: number[] = aggressive
      ? (() => {
          const targetUsd = TAKE_PROFIT_USD_AGGRESSIVE;
          const pctMove = (targetUsd / sizeUsd) * 100;
          const tpDistance = entryPrice * (pctMove / 100);
          const singleTp = direction === "long" ? entryPrice + tpDistance : entryPrice - tpDistance;
          return [singleTp];
        })()
      : DEFAULT_TAKE_PROFIT_TARGETS.map((multiplier) => {
          const tpDistance = stopLossDistance * multiplier;
          return direction === "long" ? entryPrice + tpDistance : entryPrice - tpDistance;
        });

    // Open position with ATR stored for trailing stop calculations
    const position = positionManager.openPosition({
      asset,
      direction,
      entryPrice,
      sizeUsd,
      leverage,
      stopLossPrice,
      takeProfitPrices,
      strategyName: "VinceSignalFollowing",
      triggerSignals: (signal.reasons ?? []).slice(0, 15),
      metadata: {
        entryATRPct,
      },
    });

    // Store ATR on position for trailing stop calculations
    if (entryATRPct && position) {
      position.entryATRPct = entryATRPct;
    }

    // Record trade
    riskManager.recordTrade();

    // Journal entry
    if (tradeJournal) {
      const coinGlass = this.getCoinGlass();
      const funding = coinGlass?.getFunding(asset);

      tradeJournal.recordEntry({
        position,
        signalDetails: signal.signals,
        marketContext: {
          price: entryPrice,
          funding: funding?.rate,
        },
      });
    }

    // ==========================================
    // V4: ML Feature Recording
    // Record comprehensive features for ML training
    // ==========================================
    if (position) {
      await this.recordMLFeatures(position, signal, entryATRPct);
    }

    // ==========================================
    // DETAILED TRADE OPENED LOG
    // ==========================================
    const slPct = Math.abs((stopLossPrice - entryPrice) / entryPrice * 100);
    const tp1Pct = takeProfitPrices[0] ? Math.abs((takeProfitPrices[0] - entryPrice) / entryPrice * 100) : 0;
    
    const marginUsd = sizeUsd / leverage;
    const liqPct = position?.liquidationPrice != null
      ? Math.abs((position.liquidationPrice - entryPrice) / entryPrice * 100)
      : (100 / leverage) * 0.9;

    console.log("");
    console.log("  ╔═══════════════════════════════════════════════════════════════╗");
    console.log(`  ║  📈 PAPER TRADE OPENED                                         ║`);
    console.log("  ╠═══════════════════════════════════════════════════════════════╣");
    console.log(`  ║  ${direction === "long" ? "🟢 LONG" : "🔴 SHORT"} ${asset.padEnd(6)} @ $${entryPrice.toFixed(2).padEnd(12)}                       ║`);
    console.log(`  ║  Notional: ${formatUsd(sizeUsd).padEnd(8)} (margin ≈${formatUsd(marginUsd)} @ ${leverage}x)              ║`);
    if (position?.liquidationPrice != null) {
      console.log(`  ║  Liquidation: $${position.liquidationPrice.toFixed(2).padEnd(10)} (~${liqPct.toFixed(1)}% away)              ║`);
    }
    console.log("  ╠═══════════════════════════════════════════════════════════════╣");
    const factorCount = signal.reasons?.length ?? 0;
    const sourceCount = signal.confirmingCount ?? 0;
    const sourcesList = [...new Set((signal.signals ?? []).map((s) => s.source))];
    const sourcesStr = sourcesList.length > 0 ? sourcesList.join(", ") : "—";
    const maxSourcesLen = 26;
    const sourcesDisplay = sourcesStr.length > maxSourcesLen ? sourcesStr.slice(0, maxSourcesLen - 1) + "…" : sourcesStr;
    console.log(`  ║  WHY: ${String(factorCount).padStart(2)} factors, ${sourceCount} sources (${sourcesDisplay.padEnd(maxSourcesLen)}) ║`);
    const reasons = (signal.reasons ?? []).slice(0, 14);
    const thesisParts = reasons.slice(0, 4).map((r) => r.replace(/\s*[(\-].*$/, "").trim().split(/\s+/).slice(0, 2).join(" "));
    const thesisLine = [...new Set(thesisParts)].slice(0, 3).join(" + ") + ` → ${direction.toUpperCase()}`;
    const maxThesisLen = 44;
    const thesisDisplay = thesisLine.length > maxThesisLen ? thesisLine.slice(0, maxThesisLen - 1) + "…" : thesisLine;
    console.log(`  ║  Thesis: ${thesisDisplay.padEnd(maxThesisLen)} ║`);
    const maxReasonLen = 51;
    for (const reason of reasons) {
      let text = reason;
      if (text.length > maxReasonLen) {
        const lastSpace = text.slice(0, maxReasonLen + 1).lastIndexOf(" ");
        text = (lastSpace > 32 ? text.slice(0, lastSpace) : text.slice(0, maxReasonLen)) + "…";
      }
      console.log(`  ║    • ${text.padEnd(maxReasonLen)} ║`);
    }
    if (factorCount > 14) {
      console.log(`  ║    … +${factorCount - 14} more (feature store / journal)                      ║`);
    }
    console.log("  ╠═══════════════════════════════════════════════════════════════╣");
    console.log(`  ║  Signal Strength: ${signal.strength.toFixed(0)}%  Confidence: ${signal.confidence.toFixed(0)}%  Confirming: ${sourceCount} (sources)  ║`);
    console.log("  ╠═══════════════════════════════════════════════════════════════╣");
    console.log("  ║  RISK MANAGEMENT:                                             ║");
    // sizeUsd = notional (position value); PnL = notional * (price_move_pct/100), same as position manager
    const slLoss = sizeUsd * (slPct / 100);
    console.log(`  ║    Stop-Loss:   $${stopLossPrice.toFixed(2).padEnd(10)} (${slPct.toFixed(1)}% → -$${slLoss.toFixed(0)})              ║`);
    if (takeProfitPrices.length > 0) {
      const tp1Profit = sizeUsd * (tp1Pct / 100);
      console.log(`  ║    Take-Profit: $${takeProfitPrices[0].toFixed(2).padEnd(10)} (${tp1Pct.toFixed(1)}% → +$${tp1Profit.toFixed(0)})             ║`);
      if (takeProfitPrices.length > 1) {
        const tp2Pct = Math.abs((takeProfitPrices[1] - entryPrice) / entryPrice * 100);
        const tp2Profit = sizeUsd * (tp2Pct / 100);
        console.log(`  ║                 $${takeProfitPrices[1].toFixed(2).padEnd(10)} (${tp2Pct.toFixed(1)}% → +$${tp2Profit.toFixed(0)})             ║`);
      }
    }
    console.log("  ╚═══════════════════════════════════════════════════════════════╝");
    console.log("");

    logger.info(
      `[VincePaperTrading] ✅ Opened ${direction.toUpperCase()} ${asset} @ $${entryPrice.toFixed(2)} (size: $${sizeUsd.toFixed(0)}, ${leverage}x)`
    );

    return position;
  }

  async closeTrade(positionId: string, reason: Position["closeReason"]): Promise<Position | null> {
    const positionManager = this.getPositionManager();
    const riskManager = this.getRiskManager();
    const tradeJournal = this.getTradeJournal();

    if (!positionManager || !riskManager) {
      return null;
    }

    const position = positionManager.getPosition(positionId);
    if (!position) {
      return null;
    }

    // Close at current mark price
    const closedPosition = positionManager.closePosition(positionId, position.markPrice, reason);
    if (!closedPosition) {
      return null;
    }

    // Update risk state
    if (closedPosition.realizedPnl !== undefined) {
      const portfolio = positionManager.getPortfolio();
      const isWin = closedPosition.realizedPnl > 0;
      
      if (isWin) {
        riskManager.recordWin(closedPosition.realizedPnl, portfolio.totalValue);
      } else {
        riskManager.recordLoss(Math.abs(closedPosition.realizedPnl), portfolio.totalValue);
      }
      
      // Track for win-streak sizing
      this.recordTradeOutcome(isWin);
    }

    // Journal exit
    if (tradeJournal) {
      tradeJournal.recordExit({
        position: closedPosition,
        exitPrice: closedPosition.markPrice,
        realizedPnl: closedPosition.realizedPnl || 0,
        closeReason: reason || "manual",
      });
    }

    // ==========================================
    // V4: ML Outcome Recording
    // Record trade outcomes for ML learning
    // ==========================================
    await this.recordMLOutcome(closedPosition, reason);

    // ==========================================
    // DETAILED TRADE CLOSED LOG
    // ==========================================
    const pnl = closedPosition.realizedPnl || 0;
    const pnlPct = closedPosition.realizedPnlPct || 0;
    const isWin = pnl > 0;
    const pnlIcon = isWin ? "💰" : "💸";
    const resultText = isWin ? "WIN" : "LOSS";
    const dirIcon = closedPosition.direction === "long" ? "🟢" : "🔴";
    
    console.log("");
    console.log("  ╔═══════════════════════════════════════════════════════════════╗");
    console.log(`  ║  ${pnlIcon} PAPER TRADE CLOSED - ${resultText.padEnd(4)}                               ║`);
    console.log("  ╠═══════════════════════════════════════════════════════════════╣");
    console.log(`  ║  ${dirIcon} ${closedPosition.direction.toUpperCase()} ${closedPosition.asset.padEnd(6)}                                            ║`);
    console.log(`  ║  Entry: $${closedPosition.entryPrice.toFixed(2).padEnd(12)} Exit: $${closedPosition.markPrice.toFixed(2).padEnd(12)}        ║`);
    console.log("  ╠═══════════════════════════════════════════════════════════════╣");
    console.log(`  ║  P&L: ${(isWin ? "+" : "") + "$" + pnl.toFixed(2).padEnd(12)} (${(isWin ? "+" : "") + pnlPct.toFixed(2)}%)                       ║`);
    console.log(`  ║  Close Reason: ${(reason || "manual").padEnd(45)} ║`);
    console.log("  ╚═══════════════════════════════════════════════════════════════╝");
    console.log("");

    logger.info(
      `[VincePaperTrading] ${isWin ? "✅" : "❌"} Closed ${closedPosition.direction.toUpperCase()} ${closedPosition.asset} | ` +
      `P&L: ${isWin ? "+" : ""}$${pnl.toFixed(2)} (${isWin ? "+" : ""}${pnlPct.toFixed(2)}%) | Reason: ${reason || "manual"}`
    );

    return closedPosition;
  }

  // ==========================================
  // V4: ML Feature Recording Methods
  // ==========================================

  /**
   * Record comprehensive features for ML training when trade opens
   */
  private async recordMLFeatures(
    position: Position,
    signal: AggregatedTradeSignal,
    entryATRPct?: number
  ): Promise<void> {
    const featureStore = this.getFeatureStore();
    const similarityService = this.getSignalSimilarity();
    const signalAggregator = this.getSignalAggregator();
    const regimeService = this.getMarketRegime();
    
    // Convert trade signal to aggregated signal format for feature recording
    const aggSignal: AggregatedSignal = {
      asset: position.asset,
      direction: position.direction,
      strength: signal.strength,
      confidence: signal.confidence,
      sources: Object.keys(signal.sourceBreakdown || {}),
      factors: signal.reasons,
      confirmingCount: signal.confirmingCount,
      timestamp: signal.timestamp,
    };

    // Get current regime
    const regime = regimeService?.getCurrentRegime?.();
    const session = signalAggregator?.getSessionInfo?.()?.session || "unknown";

    // Record in feature store
    if (featureStore) {
      try {
        // Get streak info for execution features
        const streakInfo = this.getStreakInfo();
        
        const decisionId = await featureStore.recordDecision({
          asset: position.asset,
          signal: aggSignal,
        });
        
        // Link the trade to the decision
        await featureStore.linkTrade(decisionId, position.id);
        
        // Record execution details
        await featureStore.recordExecution(position.id, {
          fillPrice: position.entryPrice,
          slippagePct: 0, // Already applied to entry price
          sizeUsd: position.sizeUsd,
          leverage: position.leverage,
          atrPct: entryATRPct,
          streakMultiplier: streakInfo.multiplier,
          positionSizeMultiplier: 1.0, // Can be enhanced with ML position sizing
        });
        
        logger.debug(`[VincePaperTrading] ML features recorded for ${position.asset} trade`);
      } catch (e) {
        logger.debug(`[VincePaperTrading] Could not record ML features: ${e}`);
      }
    }

    // Record in similarity service for embedding-based lookup
    if (similarityService) {
      try {
        await similarityService.recordTradeContext({
          tradeId: position.id,
          asset: position.asset,
          signal: aggSignal,
          marketRegime: regime?.marketRegime || "neutral",
          session,
        });
      } catch (e) {
        logger.debug(`[VincePaperTrading] Could not record similarity context: ${e}`);
      }
    }
  }

  /**
   * Record trade outcome for ML learning
   */
  private async recordMLOutcome(
    position: Position,
    closeReason: Position["closeReason"]
  ): Promise<void> {
    const featureStore = this.getFeatureStore();
    const weightBandit = this.getWeightBandit();
    const similarityService = this.getSignalSimilarity();
    
    const pnl = position.realizedPnl || 0;
    const pnlPct = position.realizedPnlPct || 0;
    const isWin = pnl > 0;

    // Calculate R-multiple (profit in units of risk)
    // Risk = distance from entry to stop loss
    let rMultiple = 0;
    if (position.stopLossPrice && position.entryPrice) {
      const riskPct = Math.abs((position.stopLossPrice - position.entryPrice) / position.entryPrice) * 100;
      if (riskPct > 0) {
        rMultiple = pnlPct / riskPct;
      }
    }

    // Calculate max adverse excursion (MAE) - how far trade went against us
    // This would need to be tracked during trade - using 0 as placeholder
    const maxAdverseExcursion = 0;

    // Record in feature store
    if (featureStore) {
      try {
        await featureStore.recordOutcome(position.id, {
          profitable: isWin,
          pnlPct,
          pnlUsd: pnl,
          rMultiple,
          durationMs: position.closeTime ? position.closeTime - position.openTime : 0,
          exitReason: closeReason || "manual",
          maxAdverseExcursion,
          maxFavorableExcursion: pnlPct > 0 ? pnlPct : 0, // Simplified
        });
        
        logger.debug(`[VincePaperTrading] ML outcome recorded: ${isWin ? "WIN" : "LOSS"} ${pnlPct.toFixed(2)}%`);
      } catch (e) {
        logger.debug(`[VincePaperTrading] Could not record ML outcome: ${e}`);
      }
    }

    // Record in weight bandit for source weight optimization
    if (weightBandit) {
      try {
        // Get the sources that contributed to this trade
        const sources = position.triggerSignals?.map(s => {
          // Extract source name from signal description
          // This is a simplified extraction - in production, store sources explicitly
          return "signal_source";
        }) || [];
        
        // Record combo outcome
        if (sources.length > 0) {
          await weightBandit.recordComboOutcome(sources, isWin, pnlPct);
        }
      } catch (e) {
        logger.debug(`[VincePaperTrading] Could not record bandit outcome: ${e}`);
      }
    }

    // Record in similarity service
    if (similarityService) {
      try {
        await similarityService.recordOutcome({
          tradeId: position.id,
          profitable: isWin,
          pnlPct,
          exitReason: closeReason || "manual",
        });
      } catch (e) {
        logger.debug(`[VincePaperTrading] Could not record similarity outcome: ${e}`);
      }
    }
  }

  // ==========================================
  // Update Loop
  // ==========================================

  private startUpdateLoop(): void {
    // Update mark prices and check triggers every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.updateMarkPrices();
      await this.checkAndCloseTriggers();
      await this.evaluateAndTrade();
    }, TIMING.MARK_PRICE_UPDATE_MS);
  }

  private async updateMarkPrices(): Promise<void> {
    const positionManager = this.getPositionManager();
    const marketData = this.getMarketData();

    if (!positionManager || !marketData) return;

    const positions = positionManager.getOpenPositions();
    for (const position of positions) {
      try {
        const ctx = await (marketData as any).getEnrichedContext(position.asset);
        if (ctx?.currentPrice) {
          positionManager.updateMarkPrice(position.asset, ctx.currentPrice);
        }
      } catch (error) {
        // Silent fail for price updates
      }
    }
  }

  private async checkAndCloseTriggers(): Promise<void> {
    const positionManager = this.getPositionManager();
    if (!positionManager) return;

    const triggered = positionManager.checkTriggers();
    for (const { position, trigger } of triggered) {
      logger.info(`[VincePaperTrading] Trigger hit: ${position.asset} ${trigger}`);
      await this.closeTrade(position.id, trigger === "liquidation" ? "liquidation" : trigger);
    }
  }

  // ==========================================
  // Pause / Resume
  // ==========================================

  pause(reason: string = "Manual pause"): void {
    const riskManager = this.getRiskManager();
    if (riskManager) {
      riskManager.pause(reason);
    }
  }

  resume(): void {
    const riskManager = this.getRiskManager();
    if (riskManager) {
      riskManager.resume();
    }
  }

  isPaused(): boolean {
    const riskManager = this.getRiskManager();
    return riskManager?.getRiskState().isPaused || false;
  }

  // ==========================================
  // State Persistence
  // ==========================================

  private async persistState(): Promise<void> {
    if (!this.persistenceDir) return;

    try {
      const positionManager = this.getPositionManager();
      const riskManager = this.getRiskManager();
      const tradeJournal = this.getTradeJournal();

      if (positionManager) {
        const state = positionManager.getStateForPersistence();
        fs.writeFileSync(
          path.join(this.persistenceDir, "positions.json"),
          JSON.stringify(state, null, 2)
        );
      }

      if (riskManager) {
        const state = riskManager.getStateForPersistence();
        fs.writeFileSync(
          path.join(this.persistenceDir, "risk-state.json"),
          JSON.stringify(state, null, 2)
        );
      }

      if (tradeJournal) {
        const entries = tradeJournal.getEntriesForPersistence();
        fs.writeFileSync(
          path.join(this.persistenceDir, "journal.json"),
          JSON.stringify(entries, null, 2)
        );
      }

      logger.debug("[VincePaperTrading] State persisted");
    } catch (error) {
      logger.error(`[VincePaperTrading] Failed to persist state: ${error}`);
    }
  }

  private async restoreState(): Promise<void> {
    if (!this.persistenceDir) return;

    try {
      const positionManager = this.getPositionManager();
      const riskManager = this.getRiskManager();
      const tradeJournal = this.getTradeJournal();

      // Restore positions
      const positionsPath = path.join(this.persistenceDir, "positions.json");
      if (fs.existsSync(positionsPath) && positionManager) {
        const data = JSON.parse(fs.readFileSync(positionsPath, "utf-8"));
        positionManager.restoreState(data);
      }

      // Restore risk state
      const riskPath = path.join(this.persistenceDir, "risk-state.json");
      if (fs.existsSync(riskPath) && riskManager) {
        const data = JSON.parse(fs.readFileSync(riskPath, "utf-8"));
        riskManager.restoreState(data);
      }

      // Restore journal
      const journalPath = path.join(this.persistenceDir, "journal.json");
      if (fs.existsSync(journalPath) && tradeJournal) {
        const entries = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
        tradeJournal.restoreEntries(entries);
      }

      logger.info("[VincePaperTrading] State restored from disk");
    } catch (error) {
      logger.warn(`[VincePaperTrading] Could not restore state: ${error}`);
    }
  }

  // ==========================================
  // Status
  // ==========================================

  getStatus(): {
    initialized: boolean;
    isPaused: boolean;
    pauseReason?: string;
    openPositions: number;
    portfolioValue: number;
    returnPct: number;
  } {
    const positionManager = this.getPositionManager();
    const riskManager = this.getRiskManager();

    const portfolio = positionManager?.getPortfolio();
    const riskState = riskManager?.getRiskState();

    return {
      initialized: this.initialized,
      isPaused: riskState?.isPaused || false,
      pauseReason: riskState?.pauseReason,
      openPositions: positionManager?.getOpenPositions().length || 0,
      portfolioValue: portfolio?.totalValue || 0,
      returnPct: portfolio?.returnPct || 0,
    };
  }
}
