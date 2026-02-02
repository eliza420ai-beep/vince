/**
 * VINCE Watchlist Service
 *
 * Manages a structured watchlist of tokens to track for early detection.
 * Loads from knowledge/trading/watchlist.json and provides:
 * - Token watchlist with entry/exit targets
 * - Priority filtering
 * - Stale watchlist detection (for reminders)
 * - Hot-reload when file changes
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface WatchlistToken {
  symbol: string;
  chain: "solana" | "base" | "hyperliquid" | "ethereum";
  address: string;
  entryTarget?: number;      // Market cap target for entry
  stopLoss?: number;         // Market cap for stop loss
  takeProfit?: number;       // Market cap for take profit
  notes?: string;
  addedDate: string;
  priority: "high" | "medium" | "low";
  source?: string;           // Where this token was found
}

export interface WatchlistData {
  version: string;
  lastUpdated: string;
  tokens: WatchlistToken[];
  reminders: string[];
  notes?: Record<string, string>;
}

export interface WatchlistStatus {
  tokenCount: number;
  highPriorityCount: number;
  lastUpdated: string;
  isStale: boolean;          // True if not updated in 7+ days
  staleDays: number;
}

// ==========================================
// Service
// ==========================================

export class VinceWatchlistService extends Service {
  static serviceType = "VINCE_WATCHLIST_SERVICE";
  capabilityDescription = "Token watchlist management: track tokens with entry/exit targets";

  private watchlist: WatchlistData | null = null;
  private watchlistPath: string;
  private lastLoadTime = 0;
  private fileWatcher: fs.FSWatcher | null = null;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.watchlistPath = path.join(process.cwd(), "knowledge", "trading", "watchlist.json");
  }

  static async start(runtime: IAgentRuntime): Promise<VinceWatchlistService> {
    const service = new VinceWatchlistService(runtime);
    await service.initialize();
    logger.info("[VinceWatchlist] ✅ Service started");
    return service;
  }

  async stop(): Promise<void> {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    logger.info("[VinceWatchlist] Service stopped");
  }

  private async initialize(): Promise<void> {
    await this.loadWatchlist();
    this.setupFileWatcher();
  }

  // ==========================================
  // File Operations
  // ==========================================

  private async loadWatchlist(): Promise<void> {
    try {
      if (!fs.existsSync(this.watchlistPath)) {
        logger.warn(`[VinceWatchlist] Watchlist file not found at ${this.watchlistPath}`);
        this.watchlist = this.getEmptyWatchlist();
        return;
      }

      const content = fs.readFileSync(this.watchlistPath, "utf-8");
      const data = JSON.parse(content) as WatchlistData;

      // Validate structure
      if (!data.tokens || !Array.isArray(data.tokens)) {
        logger.warn("[VinceWatchlist] Invalid watchlist format, using empty watchlist");
        this.watchlist = this.getEmptyWatchlist();
        return;
      }

      this.watchlist = data;
      this.lastLoadTime = Date.now();
      logger.info(`[VinceWatchlist] Loaded ${data.tokens.length} tokens from watchlist`);
    } catch (error) {
      logger.error(`[VinceWatchlist] Failed to load watchlist: ${error}`);
      this.watchlist = this.getEmptyWatchlist();
    }
  }

  private getEmptyWatchlist(): WatchlistData {
    return {
      version: "1.0",
      lastUpdated: new Date().toISOString().split("T")[0],
      tokens: [],
      reminders: [
        "Add tokens to knowledge/trading/watchlist.json",
        "Check fomo.family for trending tokens",
      ],
    };
  }

  private setupFileWatcher(): void {
    try {
      const dir = path.dirname(this.watchlistPath);
      if (!fs.existsSync(dir)) {
        return;
      }

      this.fileWatcher = fs.watch(this.watchlistPath, (eventType) => {
        if (eventType === "change") {
          logger.info("[VinceWatchlist] Watchlist file changed, reloading...");
          this.loadWatchlist();
        }
      });
    } catch (error) {
      logger.debug(`[VinceWatchlist] Could not set up file watcher: ${error}`);
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Get all watched tokens
   */
  getWatchedTokens(): WatchlistToken[] {
    return this.watchlist?.tokens || [];
  }

  /**
   * Get tokens by priority
   */
  getTokensByPriority(priority: "high" | "medium" | "low"): WatchlistToken[] {
    return this.getWatchedTokens().filter(t => t.priority === priority);
  }

  /**
   * Get high priority tokens (for alerts)
   */
  getHighPriorityTokens(): WatchlistToken[] {
    return this.getTokensByPriority("high");
  }

  /**
   * Get tokens by chain
   */
  getTokensByChain(chain: string): WatchlistToken[] {
    return this.getWatchedTokens().filter(t => t.chain === chain);
  }

  /**
   * Check if a token is on the watchlist
   */
  isWatched(symbol: string): boolean {
    const normalized = symbol.toUpperCase().replace("$", "");
    return this.getWatchedTokens().some(
      t => t.symbol.toUpperCase() === normalized
    );
  }

  /**
   * Get a specific token from watchlist
   */
  getWatchedToken(symbol: string): WatchlistToken | null {
    const normalized = symbol.toUpperCase().replace("$", "");
    return this.getWatchedTokens().find(
      t => t.symbol.toUpperCase() === normalized
    ) || null;
  }

  /**
   * Check if token is at entry target
   */
  isAtEntryTarget(symbol: string, currentMcap: number): boolean {
    const token = this.getWatchedToken(symbol);
    if (!token || !token.entryTarget) return false;
    return currentMcap <= token.entryTarget;
  }

  /**
   * Check if token hit take profit
   */
  isAtTakeProfit(symbol: string, currentMcap: number): boolean {
    const token = this.getWatchedToken(symbol);
    if (!token || !token.takeProfit) return false;
    return currentMcap >= token.takeProfit;
  }

  /**
   * Check if token hit stop loss
   */
  isAtStopLoss(symbol: string, currentMcap: number): boolean {
    const token = this.getWatchedToken(symbol);
    if (!token || !token.stopLoss) return false;
    return currentMcap <= token.stopLoss;
  }

  /**
   * Get watchlist status
   */
  getStatus(): WatchlistStatus {
    const tokens = this.getWatchedTokens();
    const lastUpdated = this.watchlist?.lastUpdated || "";
    
    // Calculate staleness
    let staleDays = 0;
    let isStale = false;
    if (lastUpdated) {
      const lastDate = new Date(lastUpdated);
      const now = new Date();
      staleDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      isStale = staleDays >= 7;
    }

    return {
      tokenCount: tokens.length,
      highPriorityCount: tokens.filter(t => t.priority === "high").length,
      lastUpdated,
      isStale,
      staleDays,
    };
  }

  /**
   * Get reminders from watchlist
   */
  getReminders(): string[] {
    return this.watchlist?.reminders || [];
  }

  /**
   * Get maintenance reminder if watchlist is stale
   */
  getMaintenanceReminder(): string | null {
    const status = this.getStatus();
    
    if (status.isStale) {
      return `⚠️ Watchlist hasn't been updated in ${status.staleDays} days. Update knowledge/trading/watchlist.json with new tickers from fomo.family.`;
    }
    
    if (status.highPriorityCount === 0) {
      return "📋 No high-priority tokens on watchlist. Consider adding tokens from fomo.family or Frank DeGods.";
    }
    
    return null;
  }

  /**
   * Add a token to watchlist (writes to file)
   */
  async addToken(token: WatchlistToken): Promise<boolean> {
    try {
      if (!this.watchlist) {
        this.watchlist = this.getEmptyWatchlist();
      }

      // Check if already exists
      const exists = this.isWatched(token.symbol);
      if (exists) {
        logger.warn(`[VinceWatchlist] Token ${token.symbol} already on watchlist`);
        return false;
      }

      // Add token
      this.watchlist.tokens.push(token);
      this.watchlist.lastUpdated = new Date().toISOString().split("T")[0];

      // Write to file
      const dir = path.dirname(this.watchlistPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.watchlistPath, JSON.stringify(this.watchlist, null, 2));
      
      logger.info(`[VinceWatchlist] Added ${token.symbol} to watchlist`);
      return true;
    } catch (error) {
      logger.error(`[VinceWatchlist] Failed to add token: ${error}`);
      return false;
    }
  }

  /**
   * Remove a token from watchlist (writes to file)
   */
  async removeToken(symbol: string): Promise<boolean> {
    try {
      if (!this.watchlist) return false;

      const normalized = symbol.toUpperCase().replace("$", "");
      const initialLength = this.watchlist.tokens.length;
      
      this.watchlist.tokens = this.watchlist.tokens.filter(
        t => t.symbol.toUpperCase() !== normalized
      );

      if (this.watchlist.tokens.length === initialLength) {
        logger.warn(`[VinceWatchlist] Token ${symbol} not found on watchlist`);
        return false;
      }

      this.watchlist.lastUpdated = new Date().toISOString().split("T")[0];

      // Write to file
      fs.writeFileSync(this.watchlistPath, JSON.stringify(this.watchlist, null, 2));
      
      logger.info(`[VinceWatchlist] Removed ${symbol} from watchlist`);
      return true;
    } catch (error) {
      logger.error(`[VinceWatchlist] Failed to remove token: ${error}`);
      return false;
    }
  }

  /**
   * Force reload watchlist from file
   */
  async reload(): Promise<void> {
    await this.loadWatchlist();
  }
}
