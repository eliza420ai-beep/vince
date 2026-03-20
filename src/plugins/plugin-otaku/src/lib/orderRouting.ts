/**
 * BANKR prompts are natural-language; we append explicit routing intent so the
 * backend prefers maker/post-only when appropriate (Hyperliquid-style ALO discipline).
 */

import type { IAgentRuntime } from "@elizaos/core";

export type SwapOrderRouting = "default" | "post_only_preferred" | "aggressive";

export type LimitOrderRouting = "default" | "post_only_first" | "allow_taker";

export function inferSwapRoutingFromText(text: string): SwapOrderRouting {
  const t = text.toLowerCase();
  if (/\b(post[- ]?only|maker only|maker-only|alo)\b/i.test(text)) {
    return "post_only_preferred";
  }
  if (
    /\b(taker|aggressive|immediate|ioc)\b/i.test(t) ||
    /\bmarket\s+(swap|buy|sell)\b/i.test(t)
  ) {
    return "aggressive";
  }
  return "default";
}

export function swapPromptRoutingClause(
  routing: SwapOrderRouting | undefined,
): string {
  const r = routing ?? "default";
  switch (r) {
    case "post_only_preferred":
      return " Prefer maker/post-only execution if the venue supports it; only take liquidity if needed to complete the trade.";
    case "aggressive":
      return " Prioritize immediate fill (taker / IOC acceptable).";
    default:
      return " Use sensible routing: prefer maker/post-only when resting liquidity is appropriate; otherwise minimize unnecessary slippage.";
  }
}

export function inferLimitRoutingFromText(text: string): LimitOrderRouting {
  const t = text.toLowerCase();
  if (/\b(post[- ]?only|maker|alo)\b/i.test(text)) {
    return "post_only_first";
  }
  if (/\b(taker|ioc)\b/i.test(t) || /\bcross\s+the\s+spread\b/i.test(t)) {
    return "allow_taker";
  }
  return "default";
}

export function limitOrderPromptRoutingClause(
  routing: LimitOrderRouting | undefined,
): string {
  const r = routing ?? "default";
  switch (r) {
    case "post_only_first":
      return " Use post-only / maker (ALO-style) so the order rests on the book where supported.";
    case "allow_taker":
      return " If post-only is rejected, use venue-appropriate limit or IOC per rules.";
    default:
      return " Prefer post-only for new resting liquidity when the venue supports it; exits may use IOC.";
  }
}

/**
 * Ask BANKR / venue for exchange-resting trigger stops (Hyperliquid-style),
 * not only bot-local or UI-only alerts.
 */
export function stopLossExchangeNativePrefix(
  runtime: IAgentRuntime,
  userText: string,
): string {
  const nativeOff =
    String(
      runtime.getSetting("OTAKU_EXCHANGE_NATIVE_STOPS") ?? "true",
    ).toLowerCase() === "false";
  if (nativeOff) return "";

  const always =
    String(
      runtime.getSetting("OTAKU_EXCHANGE_NATIVE_STOPS_ALWAYS") ?? "false",
    ).toLowerCase() === "true";
  const perpCue = /\b(perp|perpetual|hyperliquid|\bhl\b|hip[- ]?3)\b/i.test(
    userText,
  );
  if (!always && !perpCue) return "";

  return "Place exchange-native trigger/stop orders on the venue (survive disconnects), not only in-app alerts: ";
}
