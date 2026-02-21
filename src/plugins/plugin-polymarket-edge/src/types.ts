/**
 * Polymarket Edge Plugin – type definitions.
 * Price state, contract metadata, book state. Strategy-specific types live in strategies/types.ts.
 */

/** BTC price state from Binance spot WebSocket */
export interface BtcPriceState {
  bestBid: number;
  bestAsk: number;
  lastPrice: number;
  lastUpdateMs: number;
  priceHistory: Array<{ t: number; p: number }>;
}

/** Per-token orderbook state from Polymarket CLOB WebSocket */
export interface ContractBookState {
  tokenId: string;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  lastUpdateMs: number;
  bidSizeUsd?: number;
  askSizeUsd?: number;
  /** Dynamic taker fee for this market (bps). */
  takerFeeBps?: number;
  /** Estimated maker rebate (bps). */
  makerRebateBps?: number;
}

/** Discovered contract metadata (BTC threshold or generic binary) */
export interface ContractMeta {
  conditionId: string;
  question: string;
  yesTokenId: string;
  noTokenId: string;
  strikeUsd: number;
  expiryMs: number;
  endDateIso?: string;
}
