/**
 * SOLUS_MARKET_CONTEXT — Light wrapper around VinceMarketDataService
 * so Solus can see spot, 24h move, regime, volume, and basic vol anchors
 * for BTC, ETH, SOL, and HYPE.
 *
 * This stays in-lane for Solus: mechanics and sizing only.
 * Direction / conviction still comes from Vince or pasted context.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VinceMarketDataService } from "../../../plugin-vince/src/services/marketData.service";

const ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;

export interface SolusPerAssetMarketContext {
  asset: string;
  price: number | null;
  change24h: number | null;
  marketRegime: string | null;
  volume24h: number | null;
  volumeRatio: number | null;
  atrPct: number | null;
  dvol: number | null;
  /** Perp funding rate (decimal, e.g. 0.0001 = 0.01%). From CoinGlass; options-relevant. */
  fundingRate: number | null;
  /** Long/short ratio; >1 = more longs. From CoinGlass; crowd positioning for strike width. */
  longShortRatio: number | null;
}

/** Global Fear & Greed (one index for the market); from CoinGlass. Extreme fear = puts rich; extreme greed = consider wider calls. */
export interface SolusFearGreed {
  value: number;
  label: string | null;
}

export interface SolusMarketContext {
  assets: Record<string, SolusPerAssetMarketContext>;
  /** Market-wide Fear & Greed (from CoinGlass); null if unavailable. */
  fearGreed: SolusFearGreed | null;
}

async function buildMarketContext(
  runtime: IAgentRuntime,
): Promise<SolusMarketContext | null> {
  const svc = runtime.getService<VinceMarketDataService>(
    "VINCE_MARKET_DATA_SERVICE",
  );
  if (!svc) {
    return null;
  }

  const out: Record<string, SolusPerAssetMarketContext> = {};
  let fearGreed: SolusMarketContext["fearGreed"] = null;

  for (const asset of ASSETS) {
    try {
      const ctx = await svc.getEnrichedContext(asset);
      const atrPct = await svc.getATRPercent(asset);
      const dvol = await svc.getDVOL(asset);
      if (ctx?.fearGreedValue != null && fearGreed === null) {
        fearGreed = {
          value: ctx.fearGreedValue,
          label: ctx.fearGreedLabel ?? null,
        };
      }
      out[asset] = {
        asset,
        price: ctx?.currentPrice ?? null,
        change24h: ctx?.priceChange24h ?? null,
        marketRegime: ctx?.marketRegime ?? null,
        volume24h: ctx?.volume24h ?? null,
        volumeRatio: ctx?.volumeRatio ?? null,
        atrPct: Number.isFinite(atrPct) ? atrPct : null,
        dvol: Number.isFinite(dvol ?? NaN) ? dvol : null,
        fundingRate: ctx?.fundingRate != null ? ctx.fundingRate : null,
        longShortRatio: ctx?.longShortRatio != null ? ctx.longShortRatio : null,
      };
    } catch (error) {
      logger.debug(
        `[Solus] Market context fetch failed for ${asset}: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  if (Object.keys(out).length === 0) {
    return null;
  }

  return { assets: out, fearGreed };
}

function formatMarketContextText(ctx: SolusMarketContext): string {
  const lines: string[] = ["[Solus market context]"];
  if (ctx.fearGreed != null) {
    lines.push(
      `Fear & Greed: ${ctx.fearGreed.value}${ctx.fearGreed.label ? ` (${ctx.fearGreed.label})` : ""} — extreme fear = puts rich; extreme greed = consider wider calls.`,
    );
  }
  for (const asset of ASSETS) {
    const entry = ctx.assets[asset];
    if (!entry) continue;
    const parts: string[] = [];
    if (entry.price != null && entry.price > 0) {
      parts.push(
        `${asset} $${entry.price.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`,
      );
    } else {
      parts.push(asset);
    }
    if (entry.change24h != null) {
      parts.push(
        `24h ${entry.change24h >= 0 ? "+" : ""}${entry.change24h.toFixed(2)}%`,
      );
    }
    if (entry.marketRegime) {
      parts.push(`regime ${entry.marketRegime}`);
    }
    if (entry.fundingRate != null) {
      parts.push(`F:${(entry.fundingRate * 100).toFixed(3)}%`);
    }
    if (entry.longShortRatio != null) {
      parts.push(`L/S:${entry.longShortRatio.toFixed(2)}`);
    }
    if (entry.atrPct != null) {
      parts.push(`ATR≈${entry.atrPct.toFixed(1)}%`);
    }
    if (entry.dvol != null) {
      parts.push(`DVOL≈${entry.dvol.toFixed(0)}`);
    }
    lines.push(`- ${parts.join(", ")}`);
  }
  return lines.join("\n");
}

export const solusMarketContextProvider: Provider = {
  name: "SOLUS_MARKET_CONTEXT",
  description:
    "VINCE market context for Solus: spot, 24h move, regime, funding, L/S, Fear & Greed, ATR, DVOL for BTC/ETH/SOL/HYPE (options-relevant).",
  position: -4,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    try {
      const ctx = await buildMarketContext(runtime);
      if (!ctx) {
        return {};
      }
      const text = formatMarketContextText(ctx);
      return {
        text,
        values: {
          solusMarketContext: ctx,
        },
      };
    } catch (error) {
      logger.debug(
        "[Solus] SOLUS_MARKET_CONTEXT failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
      return {};
    }
  },
};
