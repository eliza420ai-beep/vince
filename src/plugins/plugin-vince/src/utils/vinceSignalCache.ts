/**
 * Helpers for Vince → Otaku signal cache. PRD: One Dream Phase 4 (#18).
 * When Vince (or report) suggests a swap/bridge, set the cache with optional confidence (0–100)
 * so Otaku's auto-execute notification can fire when OTAKU_AUTO_EXECUTE_MIN_CONFIDENCE is met.
 *
 * Cache key must match plugin-otaku: vince:latest_trade_signal
 */

import type { IAgentRuntime } from "@elizaos/core";

export const VINCE_SIGNAL_CACHE_KEY = "vince:latest_trade_signal";

export type VinceSignalPayload =
  | {
      action: "swap";
      sellToken: string;
      buyToken: string;
      amount: string;
      chain?: string;
      confidence?: number;
      strength?: number;
    }
  | {
      action: "bridge";
      token: string;
      amount: string;
      fromChain: string;
      toChain: string;
      confidence?: number;
      strength?: number;
    };

/**
 * Set the latest trade signal for Otaku. Include confidence (0–100) or strength
 * when you want Otaku's auto-execute notification to fire (OTAKU_AUTO_EXECUTE_ENABLED=true).
 */
export async function setVinceSignalCache(
  runtime: IAgentRuntime,
  payload: VinceSignalPayload,
): Promise<void> {
  await runtime.setCache(VINCE_SIGNAL_CACHE_KEY, payload);
}
