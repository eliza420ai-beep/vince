/**
 * Strategy interface and signal types for the Polymarket edge engine.
 */

import type { ContractBookState, ContractMeta } from "../types";

/** Rolling price velocity for a token (used by overreaction strategy) */
export interface PriceVelocity {
  tokenId: string;
  currentPrice: number;
  priceNMinAgo: number;
  windowMs: number;
  velocityPct: number;
  lastUpdateMs: number;
}

/** Context passed to each strategy on tick */
export interface TickContext {
  spot: number;
  volatility: number;
  contracts: ContractMeta[];
  getBookState: (tokenId: string) => ContractBookState | null;
  /** Returns velocity for token (current price is taken from book state inside the engine). */
  getPriceVelocity: (tokenId: string) => PriceVelocity | null;
  now: number;
}

/** Signal emitted when a strategy detects edge (written to desk.signals) */
export interface EdgeSignal {
  strategy: string;
  source: string;
  market_id: string;
  side: "YES" | "NO";
  confidence: number;
  edge_bps: number;
  forecast_prob: number;
  market_price: number;
  metadata: Record<string, unknown>;
}

/** Pluggable strategy contract */
export interface EdgeStrategy {
  name: string;
  description: string;
  tickIntervalMs: number;

  tick(ctx: TickContext): Promise<EdgeSignal | null>;
  getConfig(): Record<string, unknown>;
}
