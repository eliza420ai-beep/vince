/**
 * Infer Hyperliquid perps venue + hlPerps from chat text and parsed swap/limit fields.
 * Requires stable-vs-asset legs or explicit long/short. See docs/OTAKU_HL_SIDECAR.md.
 */

import type { IAgentRuntime } from "@elizaos/core";
import type { SwapRequest, LimitOrderRequest } from "../services/otaku.service";
import type { HlSidecarPerpsIntent } from "./hlSidecar";
import { isHlSidecarConfigured } from "./hlSidecar";

const STABLE = new Set([
  "USDC",
  "USDT",
  "DAI",
  "USD",
  "USDBC",
  "BUSD",
  "FDUSD",
]);

export function isStableSymbol(sym: string): boolean {
  return STABLE.has(sym.trim().toUpperCase());
}

/** User text or chain points at HL perps execution. */
export function textTargetsHyperliquid(text: string, chain?: string): boolean {
  const c = (chain ?? "").toLowerCase();
  if (c === "hyperliquid" || c === "hl") return true;
  const t = text.toLowerCase();
  if (/\bhyperliquid\b/.test(t)) return true;
  if (/\bhl\s+perp/.test(t)) return true;
  if (/\b(perp|perps)\b.*\b(on\s+)?hl\b/.test(t)) return true;
  if (/\b(on\s+)?hl\b.*\b(perp|perps)\b/.test(t)) return true;
  if (/\bon\s+hl\b/.test(t) && /\b(perp|perps|long|short|margin)\b/.test(t))
    return true;
  return false;
}

/**
 * Market-style HL perps from swap legs: stable + asset, or explicit long/short + two assets.
 */
export function buildHlPerpsMarketFromSwap(
  text: string,
  sellToken: string,
  buyToken: string,
  amount: string,
): HlSidecarPerpsIntent | null {
  if (!amount || amount === "?") return null;
  const t = text.toLowerCase();
  const explicitShort = /\bshort\b/.test(t);
  const explicitLong = /\blong\b/.test(t);
  const sell = sellToken.toUpperCase();
  const buy = buyToken.toUpperCase();

  if (isStableSymbol(sell) && !isStableSymbol(buy)) {
    if (explicitShort) return null;
    return { coin: buy, isBuy: true, size: amount, orderType: "market" };
  }
  if (!isStableSymbol(sell) && isStableSymbol(buy)) {
    if (explicitLong) return null;
    return { coin: sell, isBuy: false, size: amount, orderType: "market" };
  }
  if (!isStableSymbol(sell) && !isStableSymbol(buy)) {
    if (explicitShort)
      return { coin: sell, isBuy: false, size: amount, orderType: "market" };
    if (explicitLong)
      return { coin: buy, isBuy: true, size: amount, orderType: "market" };
    return { coin: buy, isBuy: true, size: amount, orderType: "market" };
  }
  return null;
}

function buildHlPerpsLimitFromLegs(
  text: string,
  sellToken: string,
  buyToken: string,
  amount: string,
  limitPrice: string,
): HlSidecarPerpsIntent | null {
  if (!amount?.trim() || !limitPrice?.trim()) return null;
  const t = text.toLowerCase();
  const explicitShort = /\bshort\b/.test(t);
  const explicitLong = /\blong\b/.test(t);
  const sell = sellToken.toUpperCase();
  const buy = buyToken.toUpperCase();

  if (isStableSymbol(sell) && !isStableSymbol(buy)) {
    if (explicitShort) return null;
    return {
      coin: buy,
      isBuy: true,
      size: amount,
      orderType: "limit",
      limitPx: limitPrice,
    };
  }
  if (!isStableSymbol(sell) && isStableSymbol(buy)) {
    if (explicitLong) return null;
    return {
      coin: sell,
      isBuy: false,
      size: amount,
      orderType: "limit",
      limitPx: limitPrice,
    };
  }
  if (!isStableSymbol(sell) && !isStableSymbol(buy)) {
    if (explicitShort)
      return {
        coin: sell,
        isBuy: false,
        size: amount,
        orderType: "limit",
        limitPx: limitPrice,
      };
    if (explicitLong)
      return {
        coin: buy,
        isBuy: true,
        size: amount,
        orderType: "limit",
        limitPx: limitPrice,
      };
    return {
      coin: buy,
      isBuy: true,
      size: amount,
      orderType: "limit",
      limitPx: limitPrice,
    };
  }
  return null;
}

/** Attach executionVenue + hlPerps when sidecar is configured and text/chain targets HL. */
export function enrichSwapRequestForHyperliquid(
  runtime: IAgentRuntime,
  text: string,
  request: SwapRequest,
): SwapRequest {
  if (request.executionVenue === "hyperliquid_perps" && request.hlPerps) {
    return {
      ...request,
      chain: request.chain ?? "hyperliquid",
    };
  }
  if (!isHlSidecarConfigured(runtime)) return request;
  if (!textTargetsHyperliquid(text, request.chain)) return request;

  const hlPerps =
    request.hlPerps ??
    buildHlPerpsMarketFromSwap(
      text,
      request.sellToken,
      request.buyToken,
      request.amount,
    );
  if (!hlPerps) {
    return {
      ...request,
      chain: request.chain ?? "hyperliquid",
    };
  }
  return {
    ...request,
    executionVenue: "hyperliquid_perps",
    hlPerps,
    chain: request.chain ?? "hyperliquid",
  };
}

export function enrichLimitOrderRequestForHyperliquid(
  runtime: IAgentRuntime,
  text: string,
  request: LimitOrderRequest,
): LimitOrderRequest {
  if (request.executionVenue === "hyperliquid_perps" && request.hlPerps) {
    return {
      ...request,
      chain: request.chain ?? "hyperliquid",
    };
  }
  if (!isHlSidecarConfigured(runtime)) return request;
  if (!textTargetsHyperliquid(text, request.chain)) return request;

  const hlPerps =
    request.hlPerps ??
    buildHlPerpsLimitFromLegs(
      text,
      request.sellToken,
      request.buyToken,
      request.amount,
      request.limitPrice,
    );
  if (!hlPerps) {
    return {
      ...request,
      chain: request.chain ?? "hyperliquid",
    };
  }
  return {
    ...request,
    executionVenue: "hyperliquid_perps",
    hlPerps,
    chain: request.chain ?? "hyperliquid",
  };
}
