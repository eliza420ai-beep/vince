/**
 * VINCE Alert Service
 *
 * Detects and stores alerts from:
 * - Watchlist token price movements
 * - Wallet activity (smart money buys/sells)
 * - New AI token discoveries
 *
 * Alert Types:
 * - WATCHLIST_PUMP: Token on watchlist hit +30% in 24h
 * - WATCHLIST_ENTRY: Token dropped to entry target
 * - WALLET_BUY: Tracked wallet bought a new token
 * - WALLET_SELL: Tracked wallet sold a position
 * - NEW_TOKEN: New AI token detected in sweet spot range
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { VinceWatchlistService, WatchlistToken } from "./watchlist.service";
import type { VinceTopTradersService } from "./topTraders.service";
import type { VinceDexScreenerService } from "./dexscreener.service";

// ==========================================
// Types
// ==========================================

export type AlertType = 
  | "WATCHLIST_PUMP"
  | "WATCHLIST_ENTRY" 
  | "WATCHLIST_STOPLOSS"
  | "WATCHLIST_TAKEPROFIT"
  | "WALLET_BUY"
  | "WALLET_SELL"
  | "NEW_TOKEN";

export type AlertPriority = "high" | "medium" | "low";

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  data: {
    symbol?: string;
    chain?: string;
    walletName?: string;
    currentMcap?: number;
    targetMcap?: number;
    priceChange?: number;
    [key: string]: unknown;
  };
  timestamp: number;
  read: boolean;
}

export interface AlertSummary {
  total: number;
  unread: number;
  byType: Record<AlertType, number>;
  highPriority: number;
}

// ==========================================
// Service
// ==========================================

export class VinceAlertService extends Service {
  static serviceType = "VINCE_ALERT_SERVICE";
  capabilityDescription = "Detects and stores alerts for watchlist/wallet activity";

  private alerts: Alert[] = [];
  private readonly MAX_ALERTS = 100;
  private lastCheckTimestamp = 0;
  private readonly CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
  private seenTokens: Set<string> = new Set();

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceAlertService> {
    const service = new VinceAlertService(runtime);
    logger.info("[VinceAlert] ✅ Service started");
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceAlert] Service stopped");
  }

  // ==========================================
  // Alert Detection
  // ==========================================

  /**
   * Run alert detection check
   * Call this periodically from the MEMES action or a task
   */
  async checkForAlerts(
    watchlistService: VinceWatchlistService | null,
    topTradersService: VinceTopTradersService | null,
    dexScreenerService: VinceDexScreenerService | null
  ): Promise<Alert[]> {
    const now = Date.now();
    if (now - this.lastCheckTimestamp < this.CHECK_INTERVAL_MS) {
      return [];
    }
    this.lastCheckTimestamp = now;

    const newAlerts: Alert[] = [];

    // Check watchlist tokens
    if (watchlistService && dexScreenerService) {
      const watchlistAlerts = await this.checkWatchlistAlerts(watchlistService, dexScreenerService);
      newAlerts.push(...watchlistAlerts);
    }

    // Check wallet activity
    if (topTradersService) {
      const walletAlerts = this.checkWalletAlerts(topTradersService);
      newAlerts.push(...walletAlerts);
    }

    // Check for new AI tokens
    if (dexScreenerService) {
      const tokenAlerts = await this.checkNewTokenAlerts(dexScreenerService);
      newAlerts.push(...tokenAlerts);
    }

    // Store new alerts
    for (const alert of newAlerts) {
      this.addAlert(alert);
    }

    return newAlerts;
  }

  private async checkWatchlistAlerts(
    watchlistService: VinceWatchlistService,
    dexScreenerService: VinceDexScreenerService
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const watchedTokens = watchlistService.getWatchedTokens();

    for (const token of watchedTokens) {
      try {
        // Get current token data
        const tokenData = await dexScreenerService.searchToken(token.symbol);
        if (!tokenData || tokenData.length === 0) continue;

        const currentToken = tokenData[0];
        const currentMcap = currentToken.marketCap || 0;
        const priceChange24h = currentToken.priceChange24h || 0;

        // Check for pump (+30% in 24h)
        if (priceChange24h >= 30) {
          alerts.push(this.createAlert({
            type: "WATCHLIST_PUMP",
            priority: token.priority,
            title: `🚀 ${token.symbol} Pumping!`,
            message: `${token.symbol} is up ${priceChange24h.toFixed(1)}% in 24h. Current mcap: $${this.formatNumber(currentMcap)}`,
            data: {
              symbol: token.symbol,
              chain: token.chain,
              currentMcap,
              priceChange: priceChange24h,
            },
          }));
        }

        // Check for entry target
        if (token.entryTarget && currentMcap <= token.entryTarget && currentMcap > 0) {
          alerts.push(this.createAlert({
            type: "WATCHLIST_ENTRY",
            priority: "high",
            title: `🎯 ${token.symbol} at Entry!`,
            message: `${token.symbol} hit entry target. Current: $${this.formatNumber(currentMcap)}, Target: $${this.formatNumber(token.entryTarget)}`,
            data: {
              symbol: token.symbol,
              chain: token.chain,
              currentMcap,
              targetMcap: token.entryTarget,
            },
          }));
        }

        // Check for stop loss
        if (token.stopLoss && currentMcap <= token.stopLoss && currentMcap > 0) {
          alerts.push(this.createAlert({
            type: "WATCHLIST_STOPLOSS",
            priority: "high",
            title: `⚠️ ${token.symbol} Stop Loss!`,
            message: `${token.symbol} hit stop loss. Current: $${this.formatNumber(currentMcap)}, SL: $${this.formatNumber(token.stopLoss)}`,
            data: {
              symbol: token.symbol,
              chain: token.chain,
              currentMcap,
              targetMcap: token.stopLoss,
            },
          }));
        }

        // Check for take profit
        if (token.takeProfit && currentMcap >= token.takeProfit) {
          alerts.push(this.createAlert({
            type: "WATCHLIST_TAKEPROFIT",
            priority: "high",
            title: `💰 ${token.symbol} Take Profit!`,
            message: `${token.symbol} hit take profit! Current: $${this.formatNumber(currentMcap)}, TP: $${this.formatNumber(token.takeProfit)}`,
            data: {
              symbol: token.symbol,
              chain: token.chain,
              currentMcap,
              targetMcap: token.takeProfit,
            },
          }));
        }

      } catch (error) {
        logger.debug(`[VinceAlert] Error checking ${token.symbol}: ${error}`);
      }
    }

    return alerts;
  }

  private checkWalletAlerts(topTradersService: VinceTopTradersService): Alert[] {
    const alerts: Alert[] = [];
    const recentSignals = topTradersService.getHighPrioritySignals(20);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    for (const signal of recentSignals) {
      // Only alert on very recent signals
      if (signal.timestamp < fiveMinutesAgo) continue;

      const alertId = `wallet-${signal.address}-${signal.asset}-${signal.timestamp}`;
      if (this.alerts.some(a => a.id === alertId)) continue;

      if (signal.action === "bought" || signal.action === "opened_long") {
        alerts.push({
          id: alertId,
          type: "WALLET_BUY",
          priority: "high",
          title: `🐋 ${signal.traderName || "Whale"} Bought ${signal.asset}`,
          message: `${signal.traderName || signal.address.slice(0, 8)} bought ${signal.asset} on ${signal.chain}`,
          data: {
            symbol: signal.asset,
            chain: signal.chain,
            walletName: signal.traderName,
          },
          timestamp: signal.timestamp,
          read: false,
        });
      } else if (signal.action === "sold" || signal.action === "opened_short" || signal.action === "closed") {
        alerts.push({
          id: alertId,
          type: "WALLET_SELL",
          priority: "medium",
          title: `📉 ${signal.traderName || "Whale"} Sold ${signal.asset}`,
          message: `${signal.traderName || signal.address.slice(0, 8)} ${signal.action} ${signal.asset} on ${signal.chain}`,
          data: {
            symbol: signal.asset,
            chain: signal.chain,
            walletName: signal.traderName,
          },
          timestamp: signal.timestamp,
          read: false,
        });
      }
    }

    return alerts;
  }

  private async checkNewTokenAlerts(dexScreenerService: VinceDexScreenerService): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    try {
      // Get AI memes in sweet spot range
      const aiMemes = await dexScreenerService.scanAIMemes();
      
      for (const token of aiMemes) {
        const tokenId = `${token.chain}-${token.address || token.symbol}`;
        
        // Only alert on new tokens we haven't seen
        if (this.seenTokens.has(tokenId)) continue;
        this.seenTokens.add(tokenId);

        // Sweet spot: $1M-$5M mcap with good vol/liq ratio
        const mcap = token.marketCap || 0;
        const isInSweetSpot = mcap >= 1_000_000 && mcap <= 5_000_000;
        const volLiqRatio = token.liquidity ? (token.volume24h || 0) / token.liquidity : 0;
        const hasGoodTraction = volLiqRatio >= 3;

        if (isInSweetSpot && hasGoodTraction) {
          alerts.push(this.createAlert({
            type: "NEW_TOKEN",
            priority: "medium",
            title: `✨ New AI Token: ${token.symbol}`,
            message: `${token.symbol} spotted in sweet spot. Mcap: $${this.formatNumber(mcap)}, Vol/Liq: ${volLiqRatio.toFixed(1)}x`,
            data: {
              symbol: token.symbol,
              chain: token.chain,
              currentMcap: mcap,
            },
          }));
        }
      }

      // Limit seen tokens cache
      if (this.seenTokens.size > 500) {
        const tokensArray = Array.from(this.seenTokens);
        this.seenTokens = new Set(tokensArray.slice(-300));
      }

    } catch (error) {
      logger.debug(`[VinceAlert] Error checking new tokens: ${error}`);
    }

    return alerts;
  }

  // ==========================================
  // Alert Management
  // ==========================================

  private createAlert(params: {
    type: AlertType;
    priority: AlertPriority;
    title: string;
    message: string;
    data: Alert["data"];
  }): Alert {
    return {
      id: `${params.type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: params.type,
      priority: params.priority,
      title: params.title,
      message: params.message,
      data: params.data,
      timestamp: Date.now(),
      read: false,
    };
  }

  private addAlert(alert: Alert): void {
    // Check for duplicate
    const isDuplicate = this.alerts.some(
      a => a.type === alert.type && 
           a.data.symbol === alert.data.symbol &&
           a.timestamp > Date.now() - 10 * 60 * 1000 // Within 10 minutes
    );
    if (isDuplicate) return;

    this.alerts.unshift(alert);

    // Trim old alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    logger.info(`[VinceAlert] New alert: ${alert.title}`);
  }

  // ==========================================
  // Public API
  // ==========================================

  getAlerts(options?: {
    type?: AlertType;
    unreadOnly?: boolean;
    limit?: number;
    priority?: AlertPriority;
  }): Alert[] {
    let filtered = [...this.alerts];

    if (options?.type) {
      filtered = filtered.filter(a => a.type === options.type);
    }
    if (options?.unreadOnly) {
      filtered = filtered.filter(a => !a.read);
    }
    if (options?.priority) {
      filtered = filtered.filter(a => a.priority === options.priority);
    }

    return filtered.slice(0, options?.limit || 50);
  }

  getUnreadAlerts(): Alert[] {
    return this.alerts.filter(a => !a.read);
  }

  getHighPriorityAlerts(): Alert[] {
    return this.alerts.filter(a => a.priority === "high" && !a.read);
  }

  getSummary(): AlertSummary {
    const byType: Record<AlertType, number> = {
      WATCHLIST_PUMP: 0,
      WATCHLIST_ENTRY: 0,
      WATCHLIST_STOPLOSS: 0,
      WATCHLIST_TAKEPROFIT: 0,
      WALLET_BUY: 0,
      WALLET_SELL: 0,
      NEW_TOKEN: 0,
    };

    for (const alert of this.alerts) {
      byType[alert.type]++;
    }

    return {
      total: this.alerts.length,
      unread: this.alerts.filter(a => !a.read).length,
      byType,
      highPriority: this.alerts.filter(a => a.priority === "high" && !a.read).length,
    };
  }

  markAsRead(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
      return true;
    }
    return false;
  }

  markAllAsRead(): number {
    let count = 0;
    for (const alert of this.alerts) {
      if (!alert.read) {
        alert.read = true;
        count++;
      }
    }
    return count;
  }

  clearOldAlerts(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    const initialLength = this.alerts.length;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    return initialLength - this.alerts.length;
  }

  // ==========================================
  // Formatting Helpers
  // ==========================================

  private formatNumber(num: number): string {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(0);
  }

  /**
   * Format alerts for display
   */
  formatAlertsForDisplay(alerts: Alert[]): string {
    if (alerts.length === 0) {
      return "No alerts to display.";
    }

    const lines: string[] = [];
    
    for (const alert of alerts) {
      const timeAgo = this.getTimeAgo(alert.timestamp);
      const readMarker = alert.read ? "" : "🔴 ";
      lines.push(`${readMarker}${alert.title} (${timeAgo})`);
      lines.push(`   ${alert.message}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  private getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
