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
}

export interface SolusMarketContext {
  assets: Record<string, SolusPerAssetMarketContext>;
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

  for (const asset of ASSETS) {
    try {
      const ctx = await svc.getEnrichedContext(asset);
      const atrPct = await svc.getATRPercent(asset);
      const dvol = await svc.getDVOL(asset);
      out[asset] = {
        asset,
        price: ctx?.currentPrice ?? null,
        change24h: ctx?.priceChange24h ?? null,
        marketRegime: ctx?.marketRegime ?? null,
        volume24h: ctx?.volume24h ?? null,
        volumeRatio: ctx?.volumeRatio ?? null,
        atrPct: Number.isFinite(atrPct) ? atrPct : null,
        dvol: Number.isFinite(dvol ?? NaN) ? dvol : null,
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

  return { assets: out };
}

function formatMarketContextText(ctx: SolusMarketContext): string {
  const lines: string[] = ["[Solus market context]"];
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
    "VINCE market context for Solus sizing: spot, 24h move, regime, volume, ATR, DVOL for BTC/ETH/SOL/HYPE.",
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
