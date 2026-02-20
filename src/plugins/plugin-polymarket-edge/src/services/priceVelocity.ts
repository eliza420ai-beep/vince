/**
 * Rolling price window per token and velocity calculation.
 * Used by OverreactionStrategy to detect crowd overreaction spikes.
 */

import type { PriceVelocity } from "../strategies/types";

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 min

interface PricePoint {
  t: number;
  p: number;
}

/**
 * Tracks mid-price history per token and computes velocity (price change % over window).
 */
export class PriceVelocityTracker {
  private readonly windowMs: number;
  private readonly history = new Map<string, PricePoint[]>();

  constructor(windowMs: number = DEFAULT_WINDOW_MS) {
    this.windowMs = windowMs;
  }

  /**
   * Record a price observation for a token. Call from engine tick using CLOB book state.
   */
  pushPrice(tokenId: string, price: number, timestampMs: number): void {
    if (!Number.isFinite(price) || !Number.isFinite(timestampMs)) return;
    const list = this.history.get(tokenId) ?? [];
    list.push({ t: timestampMs, p: price });
    const cutoff = timestampMs - this.windowMs;
    const kept = list.filter((pt) => pt.t >= cutoff);
    this.history.set(tokenId, kept);
  }

  /**
   * Get velocity for a token over the configured window.
   * velocityPct = (currentPrice - priceNMinAgo) / priceNMinAgo * 100 (or 0 if no history).
   */
  getPriceVelocity(
    tokenId: string,
    currentPrice: number,
    nowMs: number = Date.now(),
  ): PriceVelocity | null {
    const list = this.history.get(tokenId);
    if (!list || list.length < 2) return null;
    const cutoff = nowMs - this.windowMs;
    const inWindow = list.filter((pt) => pt.t >= cutoff);
    if (inWindow.length < 1) return null;
    const oldest = inWindow[0];
    const newest = inWindow[inWindow.length - 1];
    const priceNMinAgo = oldest.p;
    const windowMin = this.windowMs / (60 * 1000);
    const velocityPct =
      windowMin > 0 && priceNMinAgo > 0
        ? ((currentPrice - priceNMinAgo) / priceNMinAgo) * 100
        : 0;

    return {
      tokenId,
      currentPrice,
      priceNMinAgo,
      windowMs: this.windowMs,
      velocityPct,
      lastUpdateMs: newest.t,
    };
  }

  /** Clear history for a token or all. */
  clear(tokenId?: string): void {
    if (tokenId) this.history.delete(tokenId);
    else this.history.clear();
  }
}
