/**
 * VINCE Top Traders Service
 *
 * Tracks whale wallets on Hyperliquid and Solana:
 * - Position changes (opens, closes, flips)
 * - Size increases/decreases
 * - Aggregated signals from multiple whales
 * - Solana DEX swaps from tracked wallets
 *
 * Loads wallets from knowledge/trading/wallets.json
 * Uses Hyperliquid Info API (FREE, no API key required)
 * Uses Birdeye API for Solana wallet tracking (FREE tier)
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { MarketSignal } from "../types/index";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";
import { isVinceAgent } from "../utils/dashboard";
import * as fs from "fs";
import * as path from "path";

interface TrackedTrader {
  address: string;
  label: string | null;
  chain: "hyperliquid" | "solana";
  accountValue: number;
  lastPosition: {
    asset: string;
    side: "long" | "short" | "none";
    size: number;
    entryPrice: number;
  } | null;
  lastUpdate: number;
  priority: "high" | "medium" | "low";
  copyMode: "signal" | "mirror" | "ignore";
}

interface WhaleSignal {
  address: string;
  asset: string;
  chain: "hyperliquid" | "solana";
  action:
    | "opened_long"
    | "opened_short"
    | "closed"
    | "increased"
    | "decreased"
    | "increased_long"
    | "increased_short"
    | "bought"
    | "sold";
  size: number;
  timestamp: number;
  traderName?: string;
}

interface SolanaSwap {
  signature: string;
  tokenIn: { symbol: string; amount: number };
  tokenOut: { symbol: string; amount: number };
  timestamp: number;
}

interface WalletsFileData {
  version: string;
  wallets: Array<{
    address: string;
    name: string;
    chain: string;
    type: string;
    copyMode: string;
    priority: string;
    notes?: string;
  }>;
  hyperliquid?: Array<{
    address: string;
    name: string;
    type: string;
    copyMode: string;
    priority: string;
    notes?: string;
  }>;
}

// Default Hyperliquid addresses (fallback if wallets.json not found)
const DEFAULT_WHALE_ADDRESSES = [
  "0x1234567890abcdef1234567890abcdef12345678",
  "0xabcdef1234567890abcdef1234567890abcdef12",
];

export class VinceTopTradersService extends Service {
  static serviceType = "VINCE_TOP_TRADERS_SERVICE";
  capabilityDescription = "Tracks whale wallets on Hyperliquid and Solana";

  private trackedTraders: Map<string, TrackedTrader> = new Map();
  private solanaTraders: Map<string, TrackedTrader> = new Map();
  private recentSignals: WhaleSignal[] = [];
  private solanaSwapHistory: Map<string, SolanaSwap[]> = new Map();
  private readonly CACHE_TTL_MS = 30 * 1000; // 30 seconds
  private readonly SOLANA_CACHE_TTL_MS = 60 * 1000; // 1 minute for Solana
  private lastUpdate = 0;
  private lastSolanaUpdate = 0;
  private walletsPath: string;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.walletsPath = path.join(
      process.cwd(),
      "knowledge",
      "trading",
      "wallets.json",
    );
  }

  static async start(runtime: IAgentRuntime): Promise<VinceTopTradersService> {
    const service = new VinceTopTradersService(runtime);
    try {
      await service.initialize();
    } catch (error) {
      logger.warn(
        `[VinceTopTraders] Initialization error (service still available): ${error}`,
      );
    }
    if (isVinceAgent(runtime)) {
      service.printDashboard();
    }
    logger.info("[VinceTopTraders] ✅ Service started");
    return service;
  }

  /**
   * Print Whale Tracker dashboard (same box style as paper trade-opened banner).
   */
  private printDashboard(): void {
    startBox();
    logLine("🐋 WHALE TRACKER DASHBOARD");
    logEmpty();
    sep();
    logEmpty();

    const status = this.getStatus();
    const hasWallets = status.trackedCount > 0;

    if (hasWallets) {
      const hlStr = `Hyperliquid: ${status.hyperliquidCount}`;
      const solStr = `Solana: ${status.solanaCount}`;
      logLine(`🔍 Tracking: ${hlStr} │ ${solStr}`);
      logEmpty();
      sep();
      logEmpty();
      const signals = this.getRecentSignals(3);
      if (signals.length > 0) {
        logLine("📡 RECENT SIGNALS:");
        for (const sig of signals) {
          const emoji =
            sig.action.includes("long") || sig.action === "bought"
              ? "🟢"
              : sig.action.includes("short") || sig.action === "sold"
                ? "🔴"
                : "⚪";
          const name = sig.traderName || sig.address.slice(0, 8);
          const action = sig.action.replace("_", " ").toUpperCase();
          logLine(`${emoji} ${name}: ${action} ${sig.asset}`);
        }
      } else {
        logLine("📡 No moves yet - watching for whale activity");
      }
      logEmpty();
      sep();
      logEmpty();
      const tldr = this.getTLDR();
      const tldrEmoji =
        tldr.includes("BUYING") || tldr.includes("LONG")
          ? "💡"
          : tldr.includes("SELLING") || tldr.includes("SHORT")
            ? "⚠️"
            : "📋";
      logLine(`${tldrEmoji} ${tldr}`);
    } else {
      logLine("📊 FREE DATA SOURCES:");
      logLine("   • Hyperliquid Leaderboard (built-in, FREE)");
      logLine("   • Coinglass Whale Alerts (built-in, FREE)");
      logLine("   • Arkham Intel (manual, FREE tier)");
      logEmpty();
      sep();
      logEmpty();
      logLine("💡 Add wallets to knowledge/trading/wallets.json to track");
    }
    endBox();
  }

  /**
   * Generate actionable TLDR for dashboard
   */
  getTLDR(): string {
    const signals = this.getRecentSignals(20);
    if (signals.length === 0) {
      return "WHALES QUIET: No significant moves, wait for signal";
    }

    // Count by action type
    let longOpens = 0;
    let shortOpens = 0;
    let buys = 0;
    let sells = 0;

    for (const sig of signals) {
      if (sig.action === "opened_long" || sig.action === "increased")
        longOpens++;
      if (sig.action === "opened_short") shortOpens++;
      if (sig.action === "bought") buys++;
      if (sig.action === "sold") sells++;
    }

    // High priority signals
    const highPriority = this.getHighPrioritySignals(5);
    if (highPriority.length > 0) {
      const hp = highPriority[0];
      const hpName = hp.traderName || hp.address.slice(0, 6);
      if (hp.action === "opened_long") {
        return `${hpName} OPENED LONG ${hp.asset} - follow the smart money`;
      }
      if (hp.action === "opened_short") {
        return `${hpName} OPENED SHORT ${hp.asset} - caution advised`;
      }
      if (hp.action === "bought") {
        return `${hpName} BUYING ${hp.asset} - whale accumulation`;
      }
    }

    // Aggregate sentiment
    if (longOpens > shortOpens * 2 && longOpens >= 2) {
      return `WHALES LONG: ${longOpens} long opens vs ${shortOpens} shorts`;
    }
    if (shortOpens > longOpens * 2 && shortOpens >= 2) {
      return `WHALES SHORT: ${shortOpens} short opens - risk off`;
    }
    if (buys > sells * 2 && buys >= 2) {
      return `WHALES BUYING: ${buys} buys on Solana - accumulation`;
    }

    // Default
    return `WHALES MIXED: ${signals.length} moves, no clear direction`;
  }

  async stop(): Promise<void> {
    logger.info("[VinceTopTraders] Service stopped");
  }

  private async initialize(): Promise<void> {
    // Load wallets from JSON file
    await this.loadWalletsFromFile();

    // Fallback to defaults if no wallets loaded
    if (this.trackedTraders.size === 0) {
      for (const address of DEFAULT_WHALE_ADDRESSES) {
        this.trackedTraders.set(address, {
          address,
          label: null,
          chain: "hyperliquid",
          accountValue: 0,
          lastPosition: null,
          lastUpdate: 0,
          priority: "medium",
          copyMode: "signal",
        });
      }
    }

    const hlCount = this.trackedTraders.size;
    const solCount = this.solanaTraders.size;
    logger.debug(
      `[VinceTopTraders] Tracking ${hlCount} Hyperliquid + ${solCount} Solana wallets`,
    );

    // Initial refresh
    await this.refreshData();
  }

  private async loadWalletsFromFile(): Promise<void> {
    try {
      if (!fs.existsSync(this.walletsPath)) {
        logger.debug(
          `[VinceTopTraders] Wallets file not found at ${this.walletsPath}`,
        );
        return;
      }

      const content = fs.readFileSync(this.walletsPath, "utf-8");
      const data = JSON.parse(content) as WalletsFileData;

      // Load Solana wallets
      if (data.wallets && Array.isArray(data.wallets)) {
        for (const wallet of data.wallets) {
          if (wallet.chain === "solana" && wallet.address) {
            this.solanaTraders.set(wallet.address, {
              address: wallet.address,
              label: wallet.name || null,
              chain: "solana",
              accountValue: 0,
              lastPosition: null,
              lastUpdate: 0,
              priority:
                (wallet.priority as "high" | "medium" | "low") || "medium",
              copyMode:
                (wallet.copyMode as "signal" | "mirror" | "ignore") || "signal",
            });
          }
        }
      }

      // Load Hyperliquid wallets
      if (data.hyperliquid && Array.isArray(data.hyperliquid)) {
        for (const wallet of data.hyperliquid) {
          if (wallet.address) {
            this.trackedTraders.set(wallet.address, {
              address: wallet.address,
              label: wallet.name || null,
              chain: "hyperliquid",
              accountValue: 0,
              lastPosition: null,
              lastUpdate: 0,
              priority:
                (wallet.priority as "high" | "medium" | "low") || "medium",
              copyMode:
                (wallet.copyMode as "signal" | "mirror" | "ignore") || "signal",
            });
          }
        }
      }

      logger.info(
        `[VinceTopTraders] Loaded ${this.solanaTraders.size} Solana + ${this.trackedTraders.size} Hyperliquid wallets from file`,
      );
    } catch (error) {
      logger.error(`[VinceTopTraders] Failed to load wallets file: ${error}`);
    }
  }

  async refreshData(): Promise<void> {
    const now = Date.now();

    // Refresh Hyperliquid data
    if (now - this.lastUpdate >= this.CACHE_TTL_MS) {
      for (const [address] of this.trackedTraders) {
        try {
          await this.fetchTraderData(address);
        } catch (error) {
          logger.debug(
            `[VinceTopTraders] Error fetching HL ${address}: ${error}`,
          );
        }
      }
      this.lastUpdate = now;
    }

    // Refresh Solana data
    if (now - this.lastSolanaUpdate >= this.SOLANA_CACHE_TTL_MS) {
      for (const [address, trader] of this.solanaTraders) {
        if (trader.copyMode !== "ignore") {
          try {
            await this.fetchSolanaWalletActivity(address);
          } catch (error) {
            logger.debug(
              `[VinceTopTraders] Error fetching SOL ${address}: ${error}`,
            );
          }
        }
      }
      this.lastSolanaUpdate = now;
    }
  }

  /**
   * Fetch Solana wallet activity using Birdeye API (free tier)
   */
  private async fetchSolanaWalletActivity(address: string): Promise<void> {
    try {
      // Birdeye has a free tier for basic wallet info
      // For full transaction history, you'd need the paid tier
      // This is a simplified version that checks for recent swaps

      const apiKey = String(this.runtime.getSetting("BIRDEYE_API_KEY") || "");
      if (!apiKey) {
        // Without API key, we can still use DexScreener for token discovery
        // but can't track specific wallet transactions
        logger.debug(
          "[VinceTopTraders] No BIRDEYE_API_KEY, skipping Solana wallet tracking",
        );
        return;
      }

      const res = await fetch(
        `https://public-api.birdeye.so/v1/wallet/tx_list?wallet=${address}&limit=20`,
        {
          headers: {
            "X-API-KEY": apiKey,
            "x-chain": "solana",
          },
        },
      );

      if (!res.ok) {
        if (res.status === 401) {
          logger.debug(
            "[VinceTopTraders] Birdeye API key invalid or rate limited",
          );
        }
        return;
      }

      const data = await res.json();
      const trader = this.solanaTraders.get(address);
      if (!trader) return;

      // Process transactions for swap detection
      if (data.data?.items && Array.isArray(data.data.items)) {
        const previousSwaps = this.solanaSwapHistory.get(address) || [];
        const previousSigs = new Set(previousSwaps.map((s) => s.signature));

        for (const tx of data.data.items) {
          // Skip if we've already seen this transaction
          if (previousSigs.has(tx.txHash)) continue;

          // Detect swap transactions
          if (tx.txType === "swap" || tx.txType === "unknown") {
            const tokenIn = tx.from?.symbol || "UNKNOWN";
            const tokenOut = tx.to?.symbol || "UNKNOWN";
            const amountIn = tx.from?.amount || 0;
            const amountOut = tx.to?.amount || 0;

            // Create signal if it's a significant swap
            if (tokenIn !== tokenOut) {
              const action =
                tokenIn === "SOL" || tokenIn === "USDC" ? "bought" : "sold";
              const asset = action === "bought" ? tokenOut : tokenIn;

              this.recentSignals.push({
                address,
                asset,
                chain: "solana",
                action,
                size: action === "bought" ? amountOut : amountIn,
                timestamp: tx.blockTime * 1000 || Date.now(),
                traderName: trader.label || undefined,
              });

              logger.info(
                `[VinceTopTraders] ${trader.label || address.slice(0, 8)} ${action} ${asset}`,
              );
            }
          }
        }

        // Update swap history
        const newSwaps: SolanaSwap[] = data.data.items
          .filter((tx: any) => tx.txType === "swap")
          .map((tx: any) => ({
            signature: tx.txHash,
            tokenIn: {
              symbol: tx.from?.symbol || "",
              amount: tx.from?.amount || 0,
            },
            tokenOut: {
              symbol: tx.to?.symbol || "",
              amount: tx.to?.amount || 0,
            },
            timestamp: tx.blockTime * 1000 || Date.now(),
          }));

        this.solanaSwapHistory.set(
          address,
          [...newSwaps, ...previousSwaps].slice(0, 50),
        );
      }

      trader.lastUpdate = Date.now();
    } catch (error) {
      logger.debug(
        `[VinceTopTraders] Solana fetch error for ${address}: ${error}`,
      );
    }
  }

  private async fetchTraderData(address: string): Promise<void> {
    try {
      // Hyperliquid Info API - get user state
      const res = await fetch("https://api.hyperliquid.xyz/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "clearinghouseState",
          user: address,
        }),
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json();
      const trader = this.trackedTraders.get(address);
      if (!trader) return;

      // Update account value
      if (data.marginSummary) {
        trader.accountValue = parseFloat(data.marginSummary.accountValue) || 0;
      }

      // Check positions for changes
      if (data.assetPositions && Array.isArray(data.assetPositions)) {
        for (const pos of data.assetPositions) {
          const asset = pos.position?.coin;
          const size = parseFloat(pos.position?.szi) || 0;
          const side: "long" | "short" | "none" =
            size > 0 ? "long" : size < 0 ? "short" : "none";

          // Detect position changes
          if (trader.lastPosition && trader.lastPosition.asset === asset) {
            const prevSide = trader.lastPosition.side;
            const prevSize = trader.lastPosition.size;

            if (prevSide === "none" && side !== "none") {
              // New position opened
              this.recentSignals.push({
                address,
                asset,
                chain: "hyperliquid",
                action: side === "long" ? "opened_long" : "opened_short",
                size: Math.abs(size),
                timestamp: Date.now(),
                traderName: trader.label || undefined,
              });
            } else if (prevSide !== "none" && side === "none") {
              // Position closed
              this.recentSignals.push({
                address,
                asset,
                chain: "hyperliquid",
                action: "closed",
                size: 0,
                timestamp: Date.now(),
                traderName: trader.label || undefined,
              });
            } else if (Math.abs(size) > Math.abs(prevSize) * 1.1) {
              // Position increased
              this.recentSignals.push({
                address,
                asset,
                chain: "hyperliquid",
                action: "increased",
                size: Math.abs(size),
                timestamp: Date.now(),
                traderName: trader.label || undefined,
              });
            } else if (Math.abs(size) < Math.abs(prevSize) * 0.9) {
              // Position decreased
              this.recentSignals.push({
                address,
                asset,
                chain: "hyperliquid",
                action: "decreased",
                size: Math.abs(size),
                timestamp: Date.now(),
                traderName: trader.label || undefined,
              });
            }
          }

          // Update last position
          if (size !== 0) {
            trader.lastPosition = {
              asset,
              side,
              size: Math.abs(size),
              entryPrice: parseFloat(pos.position?.entryPx) || 0,
            };
          }
        }
      }

      trader.lastUpdate = Date.now();

      // Keep only recent signals (last hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      this.recentSignals = this.recentSignals.filter(
        (s) => s.timestamp > oneHourAgo,
      );
    } catch (error) {
      logger.debug(`[VinceTopTraders] Fetch error for ${address}: ${error}`);
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  getStatus(): {
    trackedCount: number;
    hyperliquidCount: number;
    solanaCount: number;
    signalCount: number;
    lastUpdate: number;
    lastSolanaUpdate: number;
  } {
    return {
      trackedCount: this.trackedTraders.size + this.solanaTraders.size,
      hyperliquidCount: this.trackedTraders.size,
      solanaCount: this.solanaTraders.size,
      signalCount: this.recentSignals.length,
      lastUpdate: this.lastUpdate,
      lastSolanaUpdate: this.lastSolanaUpdate,
    };
  }

  getRecentSignals(limit: number = 10): WhaleSignal[] {
    return this.recentSignals
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get signals by chain
   */
  getSignalsByChain(
    chain: "hyperliquid" | "solana",
    limit: number = 10,
  ): WhaleSignal[] {
    return this.recentSignals
      .filter((s) => s.chain === chain)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get high priority wallet signals only
   */
  getHighPrioritySignals(limit: number = 10): WhaleSignal[] {
    const highPriorityAddresses = new Set([
      ...Array.from(this.trackedTraders.values())
        .filter((t) => t.priority === "high")
        .map((t) => t.address),
      ...Array.from(this.solanaTraders.values())
        .filter((t) => t.priority === "high")
        .map((t) => t.address),
    ]);

    return this.recentSignals
      .filter((s) => highPriorityAddresses.has(s.address))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getTraderPositions(): TrackedTrader[] {
    return Array.from(this.trackedTraders.values()).filter(
      (t) => t.lastPosition !== null,
    );
  }

  /**
   * Get all tracked Solana wallets
   */
  getSolanaWallets(): TrackedTrader[] {
    return Array.from(this.solanaTraders.values());
  }

  /**
   * Check if a specific token was recently bought by tracked wallets
   */
  wasRecentlyBoughtByWhales(tokenSymbol: string): {
    bought: boolean;
    buyers: string[];
  } {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const buySignals = this.recentSignals.filter(
      (s) =>
        s.asset.toUpperCase() === tokenSymbol.toUpperCase() &&
        s.action === "bought" &&
        s.timestamp > oneHourAgo,
    );

    return {
      bought: buySignals.length > 0,
      buyers: buySignals.map((s) => s.traderName || s.address.slice(0, 8)),
    };
  }

  /**
   * Reload wallets from file
   */
  async reloadWallets(): Promise<void> {
    this.trackedTraders.clear();
    this.solanaTraders.clear();
    await this.loadWalletsFromFile();
    logger.info("[VinceTopTraders] Wallets reloaded from file");
  }

  /**
   * Generate aggregated signal from whale activity
   */
  generateSignal(asset: string): MarketSignal | null {
    const assetSignals = this.recentSignals.filter((s) => s.asset === asset);
    if (assetSignals.length === 0) return null;

    let longWeight = 0;
    let shortWeight = 0;
    const factors: string[] = [];

    for (const signal of assetSignals) {
      if (
        signal.action === "opened_long" ||
        (signal.action === "increased" &&
          this.getTraderPosition(signal.address, asset)?.side === "long")
      ) {
        longWeight += signal.size;
        factors.push(`Whale opened/increased LONG`);
      } else if (
        signal.action === "opened_short" ||
        (signal.action === "increased" &&
          this.getTraderPosition(signal.address, asset)?.side === "short")
      ) {
        shortWeight += signal.size;
        factors.push(`Whale opened/increased SHORT`);
      }
    }

    if (longWeight === 0 && shortWeight === 0) return null;

    const direction =
      longWeight > shortWeight
        ? "long"
        : shortWeight > longWeight
          ? "short"
          : "neutral";
    const strength = Math.min(
      100,
      50 + (Math.abs(longWeight - shortWeight) / 1000000) * 50,
    );

    return {
      asset,
      direction,
      strength,
      confidence: assetSignals.length * 20,
      source: "VinceTopTraders",
      factors,
      timestamp: Date.now(),
    };
  }

  private getTraderPosition(
    address: string,
    asset: string,
  ): TrackedTrader["lastPosition"] {
    const trader = this.trackedTraders.get(address);
    if (trader?.lastPosition?.asset === asset) {
      return trader.lastPosition;
    }
    return null;
  }
}
