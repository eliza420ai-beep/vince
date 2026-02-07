/**
 * Nansen Fallback Service
 *
 * Provides graceful degradation when Nansen API is unavailable or fails.
 * Returns empty data sets instead of null to prevent cascading failures.
 *
 * Unlike other fallbacks that call alternative APIs, this is a "null object" pattern
 * that allows the MEMES action to continue functioning with DexScreener data only.
 *
 * Use cases:
 * - Nansen API key not configured
 * - Nansen API returns 404 or other errors
 * - Rate limits exceeded
 */

import { logger } from "@elizaos/core";
import type {
  INansenService,
  INansenSmartMoneyToken,
  INansenSmartMoneyTrade,
  INansenWhoBoughtSold,
  INansenCreditUsage,
  INansenAccumulationResult,
  NansenChain,
} from "../../types/external-services";

export class NansenFallbackService implements INansenService {
  private warningLogged = false;

  constructor() {
    logger.debug("[NansenFallback] Fallback service initialized");
  }

  /**
   * Log a warning once that Nansen data is unavailable
   */
  private logWarningOnce(): void {
    if (!this.warningLogged) {
      logger.warn(
        "[NansenFallback] Nansen API unavailable - smart money data will not be included",
      );
      this.warningLogged = true;
    }
  }

  /**
   * Get smart money tokens - returns empty array in fallback mode
   */
  async getSmartMoneyTokens(
    _chains?: NansenChain[],
    _timeframe?: string,
  ): Promise<INansenSmartMoneyToken[]> {
    this.logWarningOnce();
    return [];
  }

  /**
   * Get smart money trades - returns empty array in fallback mode
   */
  async getSmartMoneyTrades(
    _chain: NansenChain,
    _tokenAddress: string,
  ): Promise<INansenSmartMoneyTrade[]> {
    this.logWarningOnce();
    return [];
  }

  /**
   * Get who bought/sold - returns empty array in fallback mode
   */
  async getWhoBoughtSold(
    _chain: NansenChain,
    _tokenAddress: string,
    _side?: "BUY" | "SELL",
  ): Promise<INansenWhoBoughtSold[]> {
    this.logWarningOnce();
    return [];
  }

  /**
   * Check smart money accumulation - returns negative result in fallback mode
   */
  async isSmartMoneyAccumulating(
    _chain: NansenChain,
    _tokenAddress: string,
  ): Promise<INansenAccumulationResult> {
    this.logWarningOnce();
    return {
      accumulating: false,
      netFlow: 0,
      topBuyers: [],
      confidence: "low",
    };
  }

  /**
   * Get hot meme tokens - returns empty array in fallback mode
   */
  async getHotMemeTokens(): Promise<INansenSmartMoneyToken[]> {
    this.logWarningOnce();
    return [];
  }

  /**
   * Get credit usage - returns empty/unavailable status in fallback mode
   */
  getCreditUsage(): INansenCreditUsage {
    return {
      used: 0,
      remaining: 0,
      total: 0,
      warningLevel: "empty",
    };
  }

  /**
   * Check if the service is in fallback mode (always true for this implementation)
   */
  isFallback(): boolean {
    return true;
  }
}

export default NansenFallbackService;
