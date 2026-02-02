/**
 * VINCE Binance Liquidation Service
 *
 * Connects to Binance Futures WebSocket to track real-time liquidations.
 * Uses this data for cascade detection and reversal signals.
 *
 * WebSocket: wss://fstream.binance.com/ws/!forceOrder@arr
 *
 * This is FREE - no API key required!
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { LiquidationPressure, LiquidationCascade } from "../types/index";

// =============================================================================
// TYPES
// =============================================================================

interface BinanceLiquidation {
  symbol: string;
  side: "BUY" | "SELL";  // BUY = short liquidated, SELL = long liquidated
  orderType: string;
  quantity: number;
  price: number;
  averagePrice: number;
  status: string;
  tradeTime: number;
  notionalValue: number;  // USD value
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const BINANCE_WS_URL = "wss://fstream.binance.com/ws/!forceOrder@arr";
const RECONNECT_DELAY_MS = 5000;
const MAX_RECENT_LIQUIDATIONS = 100;
const LIQUIDATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const CASCADE_THRESHOLD_COUNT = 5;  // 5+ liqs in short time
const CASCADE_THRESHOLD_VALUE = 1000000; // $1M+ in short time
const CASCADE_WINDOW_MS = 60 * 1000; // 1 minute for cascade detection

// =============================================================================
// SERVICE
// =============================================================================

export class VinceBinanceLiquidationService extends Service {
  static serviceType = "VINCE_BINANCE_LIQUIDATION_SERVICE";
  capabilityDescription = "Tracks real-time Binance Futures liquidations for cascade detection";

  declare protected runtime: IAgentRuntime;
  private ws: WebSocket | null = null;
  private recentLiquidations: BinanceLiquidation[] = [];
  private isConnected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastCascade: LiquidationCascade | null = null;
  private watchSymbols: Set<string> = new Set(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
  }

  static async start(runtime: IAgentRuntime): Promise<VinceBinanceLiquidationService> {
    const service = new VinceBinanceLiquidationService(runtime);
    try {
      await service.connect();
    } catch (error) {
      logger.warn(`[VinceBinanceLiq] Failed to connect (will retry): ${error}`);
    }
    
    // Dashboard will be printed once connected (in onopen callback)
    logger.debug("[VinceBinanceLiq] Service started, connecting to WebSocket...");
    return service;
  }

  /**
   * Print dashboard - only called when WebSocket is connected
   */
  private printDashboard(): void {
    const status = this.getStatus();
    
    console.log("");
    console.log("  ┌─────────────────────────────────────────────────────────────────┐");
    console.log("  │  💥 BINANCE LIQUIDATION TRACKER                                 │");
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    console.log(`  │  🟢 LIVE │ Watching: ${status.symbols.join(", ")}`.padEnd(66) + "│");
    console.log("  │     Real-time futures liquidations (FREE WebSocket)             │");
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    console.log("  │  📊 SIGNALS:                                                    │");
    console.log("  │     • Long liquidations = shorts squeezing longs (bearish)      │");
    console.log("  │     • Short liquidations = longs squeezing shorts (bullish)     │");
    console.log("  │     • Cascade = 5+ liqs or $1M+ in 1 min = reversal likely      │");
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    console.log("  │  💡 LIQS TRACKING: Stream active, watching for moves            │");
    console.log("  └─────────────────────────────────────────────────────────────────┘");
    console.log("");
  }

  /**
   * Build intensity bar for display
   */
  private buildIntensityBar(intensity: number): string {
    const filled = Math.floor(intensity / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  /**
   * Generate actionable TLDR for dashboard
   */
  getTLDR(): string {
    const cascade = this.getCascade();
    const pressure = this.getLiquidationPressure();
    
    // Priority 1: Active cascade
    if (cascade && cascade.detected) {
      return `CASCADE ACTIVE: ${cascade.direction?.toUpperCase()} $${(cascade.totalValue/1e6).toFixed(1)}M - more coming`;
    }
    
    // Priority 2: Heavy one-sided pressure
    if (pressure.direction === "long_liquidations" && pressure.intensity > 30) {
      return `LONGS WIPED: $${(pressure.longLiqsValue/1e6).toFixed(1)}M in 5min - bounce soon?`;
    }
    if (pressure.direction === "short_liquidations" && pressure.intensity > 30) {
      return `SHORTS SQUEEZED: $${(pressure.shortLiqsValue/1e6).toFixed(1)}M in 5min - fade?`;
    }
    
    // Priority 3: Elevated activity
    if (pressure.intensity > 20) {
      return "LIQS ELEVATED: Watch for cascade trigger";
    }
    
    // Default: Normal
    return "LIQS NORMAL: No unusual activity";
  }

  async stop(): Promise<void> {
    this.disconnect();
    logger.info("[VinceBinanceLiq] Service stopped");
  }

  // =============================================================================
  // WEBSOCKET CONNECTION
  // =============================================================================

  private async connect(): Promise<void> {
    if (this.ws) {
      this.disconnect();
    }

    try {
      logger.info("[VinceBinanceLiq] Connecting to Binance liquidation stream...");
      
      this.ws = new WebSocket(BINANCE_WS_URL);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.printDashboard();
        logger.info("[VinceBinanceLiq] ✅ Connected to Binance liquidation stream");
      };

      this.ws.onmessage = (event) => {
        try {
          this.handleMessage(event.data.toString());
        } catch (error) {
          logger.debug(`[VinceBinanceLiq] Error parsing message: ${error}`);
        }
      };

      this.ws.onerror = (error) => {
        logger.warn(`[VinceBinanceLiq] WebSocket error: ${error}`);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        logger.info("[VinceBinanceLiq] WebSocket closed, reconnecting...");
        this.scheduleReconnect();
      };
    } catch (error) {
      logger.warn(`[VinceBinanceLiq] Failed to connect: ${error}`);
      this.scheduleReconnect();
    }
  }

  private disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }

    this.isConnected = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  // =============================================================================
  // MESSAGE HANDLING
  // =============================================================================

  private handleMessage(data: string): void {
    const msg = JSON.parse(data);
    
    // Handle forceOrder event
    if (msg.e === "forceOrder" && msg.o) {
      const order = msg.o;
      const symbol = order.s;

      // Only track watched symbols
      if (!this.watchSymbols.has(symbol)) return;

      const liquidation: BinanceLiquidation = {
        symbol,
        side: order.S,  // BUY = short liq, SELL = long liq
        orderType: order.o,
        quantity: parseFloat(order.q),
        price: parseFloat(order.p),
        averagePrice: parseFloat(order.ap),
        status: order.X,
        tradeTime: order.T,
        notionalValue: parseFloat(order.q) * parseFloat(order.ap),
      };

      this.addLiquidation(liquidation);
    }
  }

  private addLiquidation(liq: BinanceLiquidation): void {
    this.recentLiquidations.unshift(liq);

    // Keep only recent liquidations
    if (this.recentLiquidations.length > MAX_RECENT_LIQUIDATIONS) {
      this.recentLiquidations = this.recentLiquidations.slice(0, MAX_RECENT_LIQUIDATIONS);
    }

    // Check for cascade
    this.detectCascade();

    // Log significant liquidations
    if (liq.notionalValue > 100000) {
      const direction = liq.side === "SELL" ? "LONG" : "SHORT";
      logger.info(`[VinceBinanceLiq] 💥 ${direction} liquidated: ${liq.symbol} $${(liq.notionalValue / 1000).toFixed(0)}k @ $${liq.averagePrice.toFixed(0)}`);
    }
  }

  // =============================================================================
  // CASCADE DETECTION
  // =============================================================================

  private detectCascade(): void {
    const now = Date.now();
    const cascadeWindow = this.recentLiquidations.filter(
      l => now - l.tradeTime < CASCADE_WINDOW_MS
    );

    if (cascadeWindow.length < CASCADE_THRESHOLD_COUNT) {
      this.lastCascade = null;
      return;
    }

    const longLiqs = cascadeWindow.filter(l => l.side === "SELL");
    const shortLiqs = cascadeWindow.filter(l => l.side === "BUY");

    const longValue = longLiqs.reduce((sum, l) => sum + l.notionalValue, 0);
    const shortValue = shortLiqs.reduce((sum, l) => sum + l.notionalValue, 0);

    // Determine cascade direction
    let direction: "long" | "short" | null = null;
    let totalValue = 0;
    let count = 0;

    if (longValue > shortValue * 2 && longValue > CASCADE_THRESHOLD_VALUE) {
      direction = "long";
      totalValue = longValue;
      count = longLiqs.length;
    } else if (shortValue > longValue * 2 && shortValue > CASCADE_THRESHOLD_VALUE) {
      direction = "short";
      totalValue = shortValue;
      count = shortLiqs.length;
    }

    if (direction) {
      const cascade: LiquidationCascade = {
        detected: true,
        direction,
        intensity: Math.min(100, Math.round((totalValue / 10000000) * 100)), // Scale to 10M = 100%
        totalValue,
        count,
        startTime: cascadeWindow[cascadeWindow.length - 1]?.tradeTime || now,
        lastTime: cascadeWindow[0]?.tradeTime || now,
      };

      if (!this.lastCascade || this.lastCascade.direction !== direction) {
        logger.warn(`[VinceBinanceLiq] 🚨 CASCADE DETECTED: ${direction.toUpperCase()} liquidations - ${count} orders, $${(totalValue / 1000000).toFixed(2)}M`);
      }

      this.lastCascade = cascade;
    }
  }

  // =============================================================================
  // PUBLIC API
  // =============================================================================

  /**
   * Get current liquidation pressure (last 5 minutes)
   */
  getLiquidationPressure(symbol?: string): LiquidationPressure {
    const now = Date.now();
    let liqs = this.recentLiquidations.filter(
      l => now - l.tradeTime < LIQUIDATION_WINDOW_MS
    );

    if (symbol) {
      liqs = liqs.filter(l => l.symbol === symbol);
    }

    const longLiqs = liqs.filter(l => l.side === "SELL");
    const shortLiqs = liqs.filter(l => l.side === "BUY");

    const longLiqsValue = longLiqs.reduce((sum, l) => sum + l.notionalValue, 0);
    const shortLiqsValue = shortLiqs.reduce((sum, l) => sum + l.notionalValue, 0);
    const netPressure = longLiqsValue - shortLiqsValue;

    // Determine direction
    let direction: LiquidationPressure["direction"] = "neutral";
    if (longLiqsValue > shortLiqsValue * 1.5) {
      direction = "long_liquidations";
    } else if (shortLiqsValue > longLiqsValue * 1.5) {
      direction = "short_liquidations";
    }

    // Intensity scales with total value
    const totalValue = longLiqsValue + shortLiqsValue;
    const intensity = Math.min(100, Math.round((totalValue / 5000000) * 100)); // 5M = 100%

    return {
      direction,
      intensity,
      longLiqsCount: longLiqs.length,
      shortLiqsCount: shortLiqs.length,
      longLiqsValue,
      shortLiqsValue,
      netPressure,
      timestamp: now,
    };
  }

  /**
   * Get current cascade status
   */
  getCascade(): LiquidationCascade | null {
    // Check if cascade is still active (within window)
    if (this.lastCascade) {
      const now = Date.now();
      if (now - this.lastCascade.lastTime > CASCADE_WINDOW_MS * 2) {
        this.lastCascade = null;
      }
    }
    return this.lastCascade;
  }

  /**
   * Add a symbol to watch
   */
  addWatchSymbol(symbol: string): void {
    this.watchSymbols.add(symbol.toUpperCase());
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; liqCount: number; symbols: string[] } {
    return {
      connected: this.isConnected,
      liqCount: this.recentLiquidations.length,
      symbols: Array.from(this.watchSymbols),
    };
  }

  /**
   * Format liquidation pressure for display
   */
  formatPressure(pressure: LiquidationPressure): string[] {
    const lines: string[] = [];

    const total = pressure.longLiqsCount + pressure.shortLiqsCount;
    if (total === 0) {
      lines.push("No recent liquidations");
      return lines;
    }

    lines.push(`Liquidations (5m): ${pressure.longLiqsCount} longs ($${(pressure.longLiqsValue / 1000000).toFixed(1)}M) vs ${pressure.shortLiqsCount} shorts ($${(pressure.shortLiqsValue / 1000000).toFixed(1)}M)`);

    if (pressure.direction === "long_liquidations") {
      lines.push("⚠️ Long liquidation pressure detected");
    } else if (pressure.direction === "short_liquidations") {
      lines.push("⚠️ Short liquidation pressure detected");
    }

    return lines;
  }

  /**
   * Format cascade for display
   */
  formatCascade(cascade: LiquidationCascade | null): string | null {
    if (!cascade || !cascade.detected) return null;

    return `🚨 CASCADE: ${cascade.direction?.toUpperCase()} - ${cascade.count} liqs, $${(cascade.totalValue / 1000000).toFixed(1)}M (intensity: ${cascade.intensity}%)`;
  }
}

export default VinceBinanceLiquidationService;
