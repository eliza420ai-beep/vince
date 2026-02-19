/**
 * Polymarket CLOB WebSocket Service
 *
 * Connects to market channel (no auth). Subscribes to token IDs from contract discovery.
 * Maintains local orderbook state per token (best bid/ask/mid). Ping every 10s.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { ContractBookState } from "../types";
import {
  POLYMARKET_CLOB_WS_URL,
  WS_RECONNECT_DELAY_MS,
  POLYMARKET_PING_INTERVAL_MS,
} from "../constants";

type WsMessage =
  | {
      event_type: "book";
      asset_id: string;
      bids: Array<{ price: string; size: string }>;
      asks: Array<{ price: string; size: string }>;
      timestamp: string;
    }
  | {
      event_type: "price_change";
      price_changes: Array<{
        asset_id: string;
        best_bid: string;
        best_ask: string;
      }>;
      timestamp: string;
    }
  | {
      event_type: "best_bid_ask";
      asset_id: string;
      best_bid: string;
      best_ask: string;
      timestamp: string;
    }
  | { event_type: string };

function parsePrice(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export class PolymarketClobWsService extends Service {
  static serviceType = "POLYMARKET_ARB_CLOB_WS";
  capabilityDescription =
    "Real-time Polymarket CLOB orderbook per token for latency arb";

  declare protected runtime: IAgentRuntime;
  private ws: WebSocket | null = null;
  private bookState = new Map<string, ContractBookState>();
  private subscribedTokenIds = new Set<string>();
  private isConnected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
  }

  static async start(runtime: IAgentRuntime): Promise<PolymarketClobWsService> {
    const service = new PolymarketClobWsService(runtime);
    service.connect();
    return service;
  }

  async stop(): Promise<void> {
    this.disconnect();
    logger.info("[PolymarketClobWs] Service stopped");
  }

  /** Subscribe to token IDs (sends subscription message; safe to call when connected or after reconnect) */
  setSubscribedTokenIds(tokenIds: string[]): void {
    this.subscribedTokenIds = new Set(tokenIds);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(Array.from(this.subscribedTokenIds));
    }
  }

  getBookState(tokenId: string): ContractBookState | null {
    return this.bookState.get(tokenId) ?? null;
  }

  getAllBookStates(): Map<string, ContractBookState> {
    return new Map(this.bookState);
  }

  private sendSubscribe(assetIds: string[]): void {
    if (
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN ||
      assetIds.length === 0
    )
      return;
    const msg = JSON.stringify({
      assets_ids: assetIds,
      type: "market",
      custom_feature_enabled: true,
    });
    this.ws.send(msg);
    logger.debug(
      "[PolymarketClobWs] Subscribed to " + assetIds.length + " tokens",
    );
  }

  private disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
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
    if (this.ws) this.disconnect();
    try {
      this.ws = new WebSocket(POLYMARKET_CLOB_WS_URL);

      this.ws.onopen = () => {
        this.isConnected = true;
        logger.info(
          "[PolymarketClobWs] Connected to Polymarket CLOB market channel",
        );
        this.sendSubscribe(Array.from(this.subscribedTokenIds));
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) this.ws.send("PING");
        }, POLYMARKET_PING_INTERVAL_MS);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const raw =
          typeof event.data === "string" ? event.data : String(event.data);
        if (raw === "PONG") return;
        try {
          const data = JSON.parse(raw) as WsMessage;
          const t = Date.now();
          if (data.event_type === "book" && "asset_id" in data) {
            const bid =
              data.bids?.[0]?.price != null
                ? parsePrice(data.bids[0].price)
                : 0;
            const ask =
              data.asks?.[0]?.price != null
                ? parsePrice(data.asks[0].price)
                : 1;
            const mid =
              bid > 0 && ask > 0 ? (bid + ask) / 2 : ask > 0 ? ask : bid;
            const bidSize =
              data.bids?.[0]?.size != null
                ? parseFloat(data.bids[0].size)
                : undefined;
            const askSize =
              data.asks?.[0]?.size != null
                ? parseFloat(data.asks[0].size)
                : undefined;
            this.bookState.set(data.asset_id, {
              tokenId: data.asset_id,
              bestBid: bid,
              bestAsk: ask,
              midPrice: mid,
              lastUpdateMs: t,
              bidSizeUsd: bidSize,
              askSizeUsd: askSize,
            });
            return;
          }
          if (data.event_type === "price_change" && "price_changes" in data) {
            for (const pc of data.price_changes) {
              const bid = parsePrice(pc.best_bid);
              const ask = parsePrice(pc.best_ask);
              const mid =
                bid > 0 && ask > 0 ? (bid + ask) / 2 : ask > 0 ? ask : bid;
              const prev = this.bookState.get(pc.asset_id);
              this.bookState.set(pc.asset_id, {
                tokenId: pc.asset_id,
                bestBid: bid,
                bestAsk: ask,
                midPrice: mid,
                lastUpdateMs: t,
                bidSizeUsd: prev?.bidSizeUsd,
                askSizeUsd: prev?.askSizeUsd,
              });
            }
            return;
          }
          if (data.event_type === "best_bid_ask" && "asset_id" in data) {
            const bid = parsePrice((data as { best_bid: string }).best_bid);
            const ask = parsePrice((data as { best_ask: string }).best_ask);
            const mid =
              bid > 0 && ask > 0 ? (bid + ask) / 2 : ask > 0 ? ask : bid;
            const prev = this.bookState.get(data.asset_id);
            this.bookState.set(data.asset_id, {
              tokenId: data.asset_id,
              bestBid: bid,
              bestAsk: ask,
              midPrice: mid,
              lastUpdateMs: t,
              bidSizeUsd: prev?.bidSizeUsd,
              askSizeUsd: prev?.askSizeUsd,
            });
          }
        } catch (e) {
          logger.debug("[PolymarketClobWs] Parse error: " + e);
        }
      };

      this.ws.onerror = (err: Event) => {
        const msg = err instanceof ErrorEvent ? err.message : String(err);
        logger.warn("[PolymarketClobWs] WebSocket error: " + msg);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        logger.info(
          "[PolymarketClobWs] Disconnected, reconnecting in " +
            WS_RECONNECT_DELAY_MS +
            "ms",
        );
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect();
        }, WS_RECONNECT_DELAY_MS);
      };
    } catch (err) {
      logger.warn("[PolymarketClobWs] Connect failed: " + err);
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, WS_RECONNECT_DELAY_MS);
    }
  }
}
