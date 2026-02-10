/**
 * VINCE Trade Journal Service
 *
 * Records trade entries and exits with full context:
 * - Entry/exit prices and reasoning
 * - Signal details at time of trade
 * - Market context (funding, OI, sentiment)
 * - Performance tracking
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type {
  TradeJournalEntry,
  TradeSignalDetail,
  TradeMarketContext,
  Position,
  PositionDirection,
} from "../types/paperTrading";

// Signal performance tracking interface
interface SignalSourceStats {
  wins: number;
  losses: number;
  totalPnl: number;
  avgPnlPerTrade: number;
}

export class VinceTradeJournalService extends Service {
  static serviceType = "VINCE_TRADE_JOURNAL_SERVICE";
  capabilityDescription = "Records trade entries and exits with full context";

  private entries: TradeJournalEntry[] = [];
  private readonly MAX_ENTRIES = 1000; // Keep last 1000 entries

  // Signal source performance tracking (feedback loop)
  private signalPerformance: Map<string, SignalSourceStats> = new Map();

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceTradeJournalService> {
    const service = new VinceTradeJournalService(runtime);
    logger.debug("[VinceTradeJournal] Service started");
    return service;
  }

  async stop(): Promise<void> {
    logger.debug("[VinceTradeJournal] Service stopped");
  }

  // ==========================================
  // Entry Recording
  // ==========================================

  recordEntry(params: {
    position: Position;
    signalDetails: TradeSignalDetail[];
    marketContext: TradeMarketContext;
  }): void {
    const { position, signalDetails, marketContext } = params;

    const entry: TradeJournalEntry = {
      positionId: position.id,
      type: "entry",
      asset: position.asset,
      direction: position.direction,
      price: position.entryPrice,
      sizeUsd: position.sizeUsd,
      leverage: position.leverage,
      strategyName: position.strategyName,
      signalDetails,
      marketContext,
      stopLoss: position.stopLossPrice,
      takeProfits: position.takeProfitPrices,
      timestamp: Date.now(),
    };

    this.entries.push(entry);
    this.trimEntries();

    logger.debug(
      `[VinceTradeJournal] Entry recorded: ${position.direction.toUpperCase()} ${position.asset} @ $${position.entryPrice}`,
    );
  }

  recordExit(params: {
    position: Position;
    exitPrice: number;
    realizedPnl: number;
    closeReason: string;
    signalDetails?: TradeSignalDetail[];
    marketContext?: TradeMarketContext;
  }): void {
    const {
      position,
      exitPrice,
      realizedPnl,
      closeReason,
      signalDetails,
      marketContext,
    } = params;

    const entry: TradeJournalEntry = {
      positionId: position.id,
      type: "exit",
      asset: position.asset,
      direction: position.direction,
      price: exitPrice,
      sizeUsd: position.sizeUsd,
      leverage: position.leverage,
      strategyName: position.strategyName,
      signalDetails: signalDetails || [],
      marketContext: marketContext || { price: exitPrice },
      realizedPnl,
      closeReason,
      durationMs: Date.now() - position.openedAt,
      timestamp: Date.now(),
    };

    this.entries.push(entry);
    this.trimEntries();

    // Update signal source performance tracking
    this.updateSignalPerformance(position.id, realizedPnl);

    const pnlStr =
      realizedPnl >= 0
        ? `+$${realizedPnl.toFixed(2)}`
        : `-$${Math.abs(realizedPnl).toFixed(2)}`;
    logger.info(
      `[VinceTradeJournal] Exit recorded: ${position.asset} ${closeReason} @ $${exitPrice} (${pnlStr})`,
    );
  }

  /**
   * Update signal source performance based on trade outcome
   */
  private updateSignalPerformance(
    positionId: string,
    realizedPnl: number,
  ): void {
    // Find the entry for this position to get signal sources
    const entryRecord = this.getEntry(positionId);
    if (!entryRecord || !entryRecord.signalDetails) return;

    const isWin = realizedPnl > 0;
    const sources = new Set<string>();

    // Extract unique signal sources
    for (const signal of entryRecord.signalDetails) {
      if (signal.source) {
        sources.add(signal.source);
      }
    }

    // Update performance for each source
    for (const source of sources) {
      const current = this.signalPerformance.get(source) || {
        wins: 0,
        losses: 0,
        totalPnl: 0,
        avgPnlPerTrade: 0,
      };

      if (isWin) {
        current.wins++;
      } else {
        current.losses++;
      }
      current.totalPnl += realizedPnl;
      const totalTrades = current.wins + current.losses;
      current.avgPnlPerTrade = current.totalPnl / totalTrades;

      this.signalPerformance.set(source, current);
    }
  }

  private trimEntries(): void {
    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries = this.entries.slice(-this.MAX_ENTRIES);
    }
  }

  // ==========================================
  // Retrieval
  // ==========================================

  getEntry(positionId: string): TradeJournalEntry | undefined {
    return this.entries.find(
      (e) => e.positionId === positionId && e.type === "entry",
    );
  }

  getExit(positionId: string): TradeJournalEntry | undefined {
    return this.entries.find(
      (e) => e.positionId === positionId && e.type === "exit",
    );
  }

  getEntriesForPosition(positionId: string): TradeJournalEntry[] {
    return this.entries.filter((e) => e.positionId === positionId);
  }

  getRecentEntries(count: number = 10): TradeJournalEntry[] {
    return this.entries.slice(-count);
  }

  getRecentTrades(
    count: number = 10,
  ): { entry: TradeJournalEntry; exit?: TradeJournalEntry }[] {
    const trades: { entry: TradeJournalEntry; exit?: TradeJournalEntry }[] = [];
    const exits = this.entries.filter((e) => e.type === "exit").slice(-count);

    for (const exit of exits) {
      const entry = this.getEntry(exit.positionId);
      if (entry) {
        trades.push({ entry, exit });
      }
    }

    return trades.reverse();
  }

  getAllEntries(): TradeJournalEntry[] {
    return [...this.entries];
  }

  // ==========================================
  // Analytics
  // ==========================================

  getStats(): {
    totalTrades: number;
    winCount: number;
    lossCount: number;
    winRate: number;
    totalPnl: number;
    avgPnlPerTrade: number;
    avgWin: number;
    avgLoss: number;
    avgDuration: number;
    profitFactor: number;
  } {
    const exits = this.entries.filter(
      (e) => e.type === "exit" && e.realizedPnl !== undefined,
    );

    if (exits.length === 0) {
      return {
        totalTrades: 0,
        winCount: 0,
        lossCount: 0,
        winRate: 0,
        totalPnl: 0,
        avgPnlPerTrade: 0,
        avgWin: 0,
        avgLoss: 0,
        avgDuration: 0,
        profitFactor: 0,
      };
    }

    const wins = exits.filter((e) => e.realizedPnl! > 0);
    const losses = exits.filter((e) => e.realizedPnl! <= 0);

    const totalPnl = exits.reduce((sum, e) => sum + (e.realizedPnl || 0), 0);
    const totalWins = wins.reduce((sum, e) => sum + (e.realizedPnl || 0), 0);
    const totalLosses = Math.abs(
      losses.reduce((sum, e) => sum + (e.realizedPnl || 0), 0),
    );
    const totalDuration = exits.reduce(
      (sum, e) => sum + (e.durationMs || 0),
      0,
    );

    return {
      totalTrades: exits.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate: (wins.length / exits.length) * 100,
      totalPnl,
      avgPnlPerTrade: exits.length > 0 ? totalPnl / exits.length : 0,
      avgWin: wins.length > 0 ? totalWins / wins.length : 0,
      avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
      avgDuration: totalDuration / exits.length,
      profitFactor:
        totalLosses > 0
          ? totalWins / totalLosses
          : totalWins > 0
            ? Infinity
            : 0,
    };
  }

  getStatsByAsset(asset: string): ReturnType<typeof this.getStats> {
    const originalEntries = this.entries;
    this.entries = this.entries.filter((e) => e.asset === asset);
    const stats = this.getStats();
    this.entries = originalEntries;
    return stats;
  }

  // ==========================================
  // Signal Performance Tracking (Feedback Loop)
  // ==========================================

  /**
   * Get performance statistics for all signal sources
   */
  getSignalPerformance(): Map<string, SignalSourceStats & { winRate: number }> {
    const result = new Map<string, SignalSourceStats & { winRate: number }>();

    for (const [source, stats] of this.signalPerformance) {
      const totalTrades = stats.wins + stats.losses;
      const winRate = totalTrades > 0 ? (stats.wins / totalTrades) * 100 : 0;
      result.set(source, { ...stats, winRate });
    }

    return result;
  }

  /**
   * Get signal source rankings sorted by performance
   */
  getSignalRankings(): Array<{
    source: string;
    winRate: number;
    totalPnl: number;
    trades: number;
  }> {
    const rankings: Array<{
      source: string;
      winRate: number;
      totalPnl: number;
      trades: number;
    }> = [];

    for (const [source, stats] of this.signalPerformance) {
      const totalTrades = stats.wins + stats.losses;
      const winRate = totalTrades > 0 ? (stats.wins / totalTrades) * 100 : 0;
      rankings.push({
        source,
        winRate,
        totalPnl: stats.totalPnl,
        trades: totalTrades,
      });
    }

    // Sort by win rate, then by total PnL
    return rankings.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalPnl - a.totalPnl;
    });
  }

  /**
   * Get a weight multiplier for a signal source based on historical performance
   *
   * Returns:
   * - 1.2x for sources with >60% win rate and 5+ trades
   * - 1.1x for sources with >50% win rate and 5+ trades
   * - 0.9x for sources with <40% win rate and 5+ trades
   * - 0.8x for sources with <30% win rate and 5+ trades
   * - 1.0x otherwise (default, or insufficient data)
   */
  getSignalWeight(source: string): number {
    const stats = this.signalPerformance.get(source);

    if (!stats) {
      return 1.0; // No data, use default weight
    }

    const totalTrades = stats.wins + stats.losses;

    // Need at least 5 trades for statistical significance
    if (totalTrades < 5) {
      return 1.0;
    }

    const winRate = (stats.wins / totalTrades) * 100;

    if (winRate >= 60) {
      return 1.2; // Strong performer
    } else if (winRate >= 50) {
      return 1.1; // Good performer
    } else if (winRate < 30) {
      return 0.8; // Poor performer
    } else if (winRate < 40) {
      return 0.9; // Below average performer
    }

    return 1.0; // Average performer
  }

  /**
   * Check if a signal source has enough data for reliable weight calculation
   */
  hasReliableData(source: string): boolean {
    const stats = this.signalPerformance.get(source);
    if (!stats) return false;
    return stats.wins + stats.losses >= 5;
  }

  // ==========================================
  // Persistence
  // ==========================================

  getEntriesForPersistence(): TradeJournalEntry[] {
    return [...this.entries];
  }

  getSignalPerformanceForPersistence(): Record<string, SignalSourceStats> {
    const result: Record<string, SignalSourceStats> = {};
    for (const [source, stats] of this.signalPerformance) {
      result[source] = stats;
    }
    return result;
  }

  restoreEntries(entries: TradeJournalEntry[]): void {
    this.entries = entries;
    this.trimEntries();
    logger.info(
      `[VinceTradeJournal] Restored ${entries.length} journal entries`,
    );
  }

  restoreSignalPerformance(data: Record<string, SignalSourceStats>): void {
    this.signalPerformance.clear();
    for (const [source, stats] of Object.entries(data)) {
      this.signalPerformance.set(source, stats);
    }
    logger.info(
      `[VinceTradeJournal] Restored signal performance for ${Object.keys(data).length} sources`,
    );
  }

  clear(): void {
    this.entries = [];
    this.signalPerformance.clear();
    logger.debug("[VinceTradeJournal] Journal cleared");
  }
}
