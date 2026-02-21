/**
 * Binance Spot WebSocket Service
 *
 * Connects to BTCUSDT bookTicker stream. Maintains price state and rolling volatility.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { BtcPriceState } from "../types";
import {
  BINANCE_SPOT_WS_URL,
  WS_RECONNECT_DELAY_MS,
  VOLATILITY_WINDOW_MS,
} from "../constants";

interface BinanceBookTickerMessage {
  u?: number;
  s: string;
  b: string;
  B: string;
  a: string;
  A: string;
}

export class BinanceSpotWsService extends Service {
  static serviceType = "POLYMARKET_EDGE_BINANCE_SPOT_WS";
  capabilityDescription =
    "Real-time Binance spot BTC price and rolling volatility for edge engine";

  declare protected runtime: IAgentRuntime;
  private ws: WebSocket | null = null;
  private state: BtcPriceState = {
    bestBid: 0,
    bestAsk: 0,
    lastPrice: 0,
    lastUpdateMs: 0,
    priceHistory: [],
  };
  private isConnected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
  }

  static async start(runtime: IAgentRuntime): Promise<BinanceSpotWsService> {
    const service = new BinanceSpotWsService(runtime);
    try {
      service.connect();
    } catch (err) {
      logger.warn(`[BinanceSpotWs] Failed to connect (will retry): ${err}`);
    }
    return service;
  }

  async stop(): Promise<void> {
    this.disconnect();
    logger.info("[BinanceSpotWs] Service stopped");
  }

  getPriceState(): BtcPriceState {
    return { ...this.state };
  }

  getVolatility(): number {
    const hist = this.state.priceHistory;
    if (hist.length < 2) return 0;
    const now = Date.now();
    const cutoff = now - VOLATILITY_WINDOW_MS;
    const inWindow = hist.filter((p) => p.t >= cutoff);
    if (inWindow.length < 2) return 0;
    let sumSq = 0;
    for (let i = 1; i < inWindow.length; i++) {
      const ret = Math.log(inWindow[i].p / inWindow[i - 1].p);
      sumSq += ret * ret;
    }
    const variance = sumSq / (inWindow.length - 1);
    const annualized = Math.sqrt(variance * (365 * 24 * 60));
    return Math.min(annualized, 2);
  }

  private disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.isConnected = false;
  }

  private connect(): void {
    if (this.ws) {
      this.disconnect();
    }
    try {
      this.ws = new WebSocket(BINANCE_SPOT_WS_URL);

      this.ws.onopen = () => {
        this.isConnected = true;
        logger.info("[BinanceSpotWs] Connected to Binance spot bookTicker");
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(
            typeof event.data === "string" ? event.data : String(event.data),
          ) as BinanceBookTickerMessage;
          if (data.s !== "BTCUSDT") return;
          const bid = parseFloat(data.b);
          const ask = parseFloat(data.a);
          const mid = (bid + ask) / 2;
          const t = Date.now();
          this.state = {
            bestBid: bid,
            bestAsk: ask,
            lastPrice: mid,
            lastUpdateMs: t,
            priceHistory: [
              ...this.state.priceHistory.filter(
                (p) => p.t >= t - VOLATILITY_WINDOW_MS,
              ),
              { t, p: mid },
            ],
          };
        } catch (e) {
          logger.debug("[BinanceSpotWs] Parse error: " + e);
        }
      };

      this.ws.onerror = (err: Event) => {
        const msg = err instanceof ErrorEvent ? err.message : String(err);
        logger.warn("[BinanceSpotWs] WebSocket error: " + msg);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        logger.info(
          "[BinanceSpotWs] Disconnected, reconnecting in " +
            WS_RECONNECT_DELAY_MS +
            "ms",
        );
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect();
        }, WS_RECONNECT_DELAY_MS);
      };
    } catch (err) {
      logger.warn("[BinanceSpotWs] Connect failed: " + err);
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, WS_RECONNECT_DELAY_MS);
    }
  }
}
