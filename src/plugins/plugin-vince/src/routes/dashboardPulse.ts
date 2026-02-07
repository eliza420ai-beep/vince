/**
 * Dashboard Pulse – structured snapshot of all terminal dashboard data
 * plus an LLM-generated insight/TLDR for the frontend.
 *
 * Used by GET /vince/pulse to surface the same data we log at startup
 * with a human-readable summary instead of dry numbers only.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VinceBinanceService } from "../services/binance.service";
import type { VinceCoinGlassService } from "../services/coinglass.service";
import type { VinceCoinGeckoService } from "../services/coingecko.service";
import type { VinceDeribitService } from "../services/deribit.service";
import type { VinceHIP3Service } from "../services/hip3.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import type { VinceDexScreenerService } from "../services/dexscreener.service";
import type { VinceNFTFloorService } from "../services/nftFloor.service";
import type { VinceMeteoraService } from "../services/meteora.service";
import type { VinceMarketRegimeService } from "../services/marketRegime.service";
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { VincePositionManagerService } from "../services/vincePositionManager.service";

export interface PulseSection {
  label: string;
  summary: string;
  data?: Record<string, unknown>;
}

export interface DashboardPulseSnapshot {
  sections: Record<string, PulseSection>;
  updatedAt: number;
}

const SECTION_TIMEOUT_MS = 5000;

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await Promise.race([
      fn(),
      new Promise<null>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timeout`)),
          SECTION_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (e) {
    logger.debug(`[DashboardPulse] ${label}: ${e}`);
    return null;
  }
}

/**
 * Build a JSON snapshot from all dashboard services (same data we print to terminal).
 */
export async function buildDashboardSnapshot(
  runtime: IAgentRuntime,
): Promise<DashboardPulseSnapshot> {
  const sections: Record<string, PulseSection> = {};
  const now = Date.now();

  const binance = runtime.getService(
    "VINCE_BINANCE_SERVICE",
  ) as VinceBinanceService | null;
  if (binance) {
    const out = await safe("Binance", async () => {
      const intel = await binance.getIntelligence("BTC");
      const tldr = (binance as any).getTLDR?.(intel) ?? "Binance intel loaded.";
      return {
        label: "Binance Intelligence",
        summary: tldr,
        data: {
          topTraderRatio: intel?.topTraderPositions?.longShortRatio,
          takerRatio: intel?.takerVolume?.buySellRatio,
        },
      };
    });
    if (out) sections.binance = out;
  }

  const coinglass = runtime.getService(
    "VINCE_COINGLASS_SERVICE",
  ) as VinceCoinGlassService | null;
  if (coinglass) {
    const out = await safe("CoinGlass", async () => {
      const fg = coinglass.getFearGreed();
      const status = coinglass.getStatus();
      const funding = coinglass.getAllFunding();
      const ls = coinglass.getAllLongShortRatios();
      const summary = fg
        ? `Fear/Greed ${fg.value}/100 (${fg.classification}). ${status.source}.`
        : status.source;
      return {
        label: "CoinGlass",
        summary,
        data: {
          fearGreed: fg?.value ?? null,
          fundingCount: funding.length,
          longShortCount: ls.length,
        },
      };
    });
    if (out) sections.coinglass = out;
  }

  const coingecko = runtime.getService(
    "VINCE_COINGECKO_SERVICE",
  ) as VinceCoinGeckoService | null;
  if (coingecko) {
    const out = await safe("CoinGecko", async () => {
      const tldr = coingecko.getTLDR();
      const status = coingecko.getStatus();
      return {
        label: "CoinGecko",
        summary: tldr,
        data: { available: status.available },
      };
    });
    if (out) sections.coingecko = out;
  }

  const deribit = runtime.getService(
    "VINCE_DERIBIT_SERVICE",
  ) as VinceDeribitService | null;
  if (deribit) {
    const out = await safe("Deribit", async () => {
      const ctx = await deribit.getOptionsContext("BTC");
      const tldr = ctx ? deribit.getTLDR(ctx) : "Options context loading.";
      return {
        label: "Deribit Options",
        summary: tldr,
        data: ctx ? { spot: ctx.spotPrice, dvol: ctx.dvol } : undefined,
      };
    });
    if (out) sections.deribit = out;
  }

  const hip3 = runtime.getService(
    "VINCE_HIP3_SERVICE",
  ) as VinceHIP3Service | null;
  if (hip3) {
    const out = await safe("HIP3", async () => {
      const status = hip3.getStatus();
      const pulse = await (hip3 as any).getHIP3Pulse?.();
      const summary = pulse?.summary
        ? `Bias: ${pulse.summary.overallBias}. ${pulse.summary.tradFiVsCrypto ?? ""}`
        : `TradFi: ${status.assetCount} assets.`;
      return {
        label: "HIP-3 TradFi",
        summary,
        data: { assetCount: status.assetCount },
      };
    });
    if (out) sections.hip3 = out;
  }

  const news = runtime.getService(
    "VINCE_NEWS_SENTIMENT_SERVICE",
  ) as VinceNewsSentimentService | null;
  if (news) {
    const out = await safe("News", async () => {
      const tldr = news.getTLDR();
      const status = news.getStatus();
      return {
        label: "MandoMinutes",
        summary: tldr,
        data: { articles: status.newsCount, riskEvents: status.riskEventCount },
      };
    });
    if (out) sections.news = out;
  }

  const dexscreener = runtime.getService(
    "VINCE_DEXSCREENER_SERVICE",
  ) as VinceDexScreenerService | null;
  if (dexscreener) {
    const out = await safe("DexScreener", async () => {
      const status = dexscreener.getStatus();
      const { mood, summary: moodSummary } = dexscreener.getMarketMood();
      const hot = dexscreener
        .getTrendingTokens(3)
        .filter((t: { priceChange24h: number }) => t.priceChange24h >= 21);
      const ape = dexscreener.getApeTokens().slice(0, 3);
      const hotSymbols = hot
        .map((t: { symbol: string }) => t.symbol)
        .join(", ");
      const apeSymbols = ape
        .map((t: { symbol: string }) => t.symbol)
        .join(", ");
      const extra =
        hotSymbols || apeSymbols
          ? ` Hot: ${hotSymbols || "—"}. Ape: ${apeSymbols || "—"}.`
          : "";
      const summary = `${moodSummary}.${extra}`.trim();
      const hotCount = dexscreener
        .getTrendingTokens(50)
        .filter(
          (t: { volumeLiquidityRatio: number; priceChange24h: number }) =>
            t.volumeLiquidityRatio >= 5 || t.priceChange24h >= 50,
        ).length;
      return {
        label: "DexScreener Memes",
        summary:
          summary ||
          `${status.tokenCount} tokens tracked. Meme scanner active.`,
        data: {
          tokenCount: status.tokenCount,
          mood,
          hotCount,
          apeCount: ape.length,
        },
      };
    });
    if (out) sections.dexscreener = out;
  }

  const nftFloor = runtime.getService(
    "VINCE_NFT_FLOOR_SERVICE",
  ) as VinceNFTFloorService | null;
  if (nftFloor) {
    const out = await safe("NFT Floor", async () => {
      const tldr = nftFloor.getTLDR();
      const status = nftFloor.getStatus();
      return {
        label: "NFT Floors",
        summary: tldr,
        data: { collectionCount: status.collectionCount },
      };
    });
    if (out) sections.nft = out;
  }

  const positionManager = runtime.getService(
    "VINCE_POSITION_MANAGER_SERVICE",
  ) as VincePositionManagerService | null;
  if (positionManager) {
    const out = await safe("Paper trades", async () => {
      const positions = positionManager.getOpenPositions();
      const formatUsd = (usd: number) =>
        usd >= 1000
          ? `$${(usd / 1000).toFixed(usd >= 10000 ? 0 : 1)}K`
          : `$${Math.round(usd)}`;
      if (positions.length === 0) {
        return {
          label: "Paper trades",
          summary: "No open paper positions.",
          data: { openCount: 0 },
        };
      }
      const lines = positions.map(
        (p: {
          asset: string;
          direction: string;
          entryPrice: number;
          sizeUsd: number;
          leverage: number;
        }) =>
          `${p.direction.toUpperCase()} ${p.asset} @ $${typeof p.entryPrice === "number" ? p.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 0 }) : p.entryPrice} · ${formatUsd(p.sizeUsd)} · ${p.leverage}x`,
      );
      const summary = `${lines.join(". ")}. ${positions.length} open.`;
      return {
        label: "Paper trades",
        summary,
        data: { openCount: positions.length },
      };
    });
    if (out) sections.paper = out;
  }

  const meteora = runtime.getService(
    "VINCE_METEORA_SERVICE",
  ) as VinceMeteoraService | null;
  if (meteora) {
    const out = await safe("Meteora", async () => {
      const tldr = meteora.getTLDR();
      const status = meteora.getStatus();
      return {
        label: "Meteora LP",
        summary: tldr,
        data: { poolCount: status.poolCount },
      };
    });
    if (out) sections.meteora = out;
  }

  const regime = runtime.getService(
    "VINCE_MARKET_REGIME_SERVICE",
  ) as VinceMarketRegimeService | null;
  if (regime) {
    const out = await safe("Regime", async (): Promise<PulseSection> => {
      const r = await (regime as any).getRegime?.("BTC");
      const tldr = regime.getTLDR(r ? [r] : []);
      return { label: "Market Regime", summary: tldr };
    });
    if (out) sections.regime = out;
  }

  const aggregator = runtime.getService(
    "VINCE_SIGNAL_AGGREGATOR_SERVICE",
  ) as VinceSignalAggregatorService | null;
  if (aggregator) {
    const out = await safe("SignalAggregator", async () => {
      const status = aggregator.getStatus();
      const summary = status
        ? `Signals: ${status.signalCount}. Sources: ${status.dataSources?.length ?? 0}. Updated: ${status.lastUpdate ? new Date(status.lastUpdate).toISOString() : "N/A"}.`
        : "Signal aggregator active.";
      return { label: "Signal Aggregator", summary, data: status ?? undefined };
    });
    if (out) sections.aggregator = out;
  }

  return { sections, updatedAt: now };
}

/**
 * Build a single text block from the snapshot for the LLM.
 */
function buildSnapshotText(snapshot: DashboardPulseSnapshot): string {
  const lines: string[] = [];
  for (const [, section] of Object.entries(snapshot.sections)) {
    if (section && "label" in section && "summary" in section) {
      lines.push(`[${section.label}] ${section.summary}`);
    }
  }
  return lines.join("\n");
}

/**
 * Generate a 2–3 sentence LLM insight/TLDR from the dashboard snapshot.
 */
export async function generatePulseInsight(
  runtime: IAgentRuntime,
  snapshot: DashboardPulseSnapshot,
): Promise<string> {
  const text = buildSnapshotText(snapshot);
  const prompt = `You are VINCE, a quantitative trading assistant. Below is a live snapshot of market data from multiple sources (Binance, CoinGlass, Deribit, HIP-3, news, memes, etc.).

DATA:
${text}

Write a short market insight in 2–3 sentences: what matters most right now and what you'd watch or do. Be specific (mention assets or regimes if relevant). No fluff, no disclaimers.`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
    return String(response ?? "").trim();
  } catch (error) {
    logger.warn(`[DashboardPulse] LLM insight failed: ${error}`);
    return "Market data is loaded; ask me 'gm' or 'perps' for a full take.";
  }
}

export interface PulseResponse {
  sections: Record<string, PulseSection>;
  insight: string;
  updatedAt: number;
}

/**
 * Build full pulse (snapshot + LLM insight) for the API.
 */
export async function buildPulseResponse(
  runtime: IAgentRuntime,
): Promise<PulseResponse> {
  const snapshot = await buildDashboardSnapshot(runtime);
  const insight = await generatePulseInsight(runtime, snapshot);
  return {
    sections: snapshot.sections,
    insight,
    updatedAt: snapshot.updatedAt,
  };
}
