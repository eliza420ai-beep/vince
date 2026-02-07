/**
 * Dashboard Leaderboards API – "who's doing best" data for the leaderboard page.
 * Aggregates HIP-3, HL Crypto, Memes, Meteora, News into rankable sections.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VinceHIP3Service } from "../services/hip3.service";
import type { VinceDexScreenerService } from "../services/dexscreener.service";
import type { VinceMeteoraService } from "../services/meteora.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import { getOrCreateHyperliquidService } from "../services/fallbacks";
import type { IHyperliquidCryptoPulse } from "../types/external-services";

const SECTION_TIMEOUT_MS = 6000;

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await Promise.race([
      fn(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout`)), SECTION_TIMEOUT_MS),
      ),
    ]);
  } catch (e) {
    logger.debug(`[Leaderboards] ${label}: ${e}`);
    return null;
  }
}

function formatVol(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Response types for frontend
// ---------------------------------------------------------------------------

export interface LeaderboardRow {
  rank?: number;
  symbol: string;
  price?: number;
  change24h?: number;
  volume?: number;
  volumeFormatted?: string;
  extra?: string;
}

export interface HIP3LeaderboardSection {
  title: string;
  topMovers: LeaderboardRow[];
  volumeLeaders: LeaderboardRow[];
  oneLiner: string;
  bias: string;
  rotation: string;
  hottestSector: string;
  coldestSector: string;
  categories: {
    commodities: LeaderboardRow[];
    indices: LeaderboardRow[];
    stocks: LeaderboardRow[];
    aiTech: LeaderboardRow[];
  };
}

export interface HLCryptoLeaderboardSection {
  title: string;
  topMovers: LeaderboardRow[];
  volumeLeaders: LeaderboardRow[];
  oneLiner: string;
  bias: string;
  hottestAvg: number;
  coldestAvg: number;
}

export interface MemesLeaderboardSection {
  title: string;
  hot: LeaderboardRow[];
  ape: LeaderboardRow[];
  mood: string;
  moodSummary: string;
}

export interface MeteoraLeaderboardSection {
  title: string;
  topPools: { name: string; tvl: number; tvlFormatted: string; apy?: number }[];
  oneLiner: string;
}

export interface NewsLeaderboardSection {
  title: string;
  /** All MandoMinutes headlines for the News tab (with optional deep-dive url) */
  headlines: { text: string; sentiment?: string; url?: string }[];
  sentiment: string;
  /** TLDR / one-liner summary for the News tab */
  oneLiner: string;
}

export interface LeaderboardsResponse {
  updatedAt: number;
  hip3: HIP3LeaderboardSection | null;
  hlCrypto: HLCryptoLeaderboardSection | null;
  memes: MemesLeaderboardSection | null;
  meteora: MeteoraLeaderboardSection | null;
  news: NewsLeaderboardSection | null;
}

// ---------------------------------------------------------------------------
// Build sections from services
// ---------------------------------------------------------------------------

async function buildHIP3Section(runtime: IAgentRuntime): Promise<HIP3LeaderboardSection | null> {
  const hip3 = runtime.getService("VINCE_HIP3_SERVICE") as VinceHIP3Service | null;
  if (!hip3) return null;

  const pulse = await safe("HIP3", () => (hip3 as any).getHIP3Pulse?.());
  if (!pulse) return null;

  const allAssets = [
    ...pulse.commodities,
    ...pulse.indices,
    ...pulse.stocks,
    ...pulse.aiPlays,
  ];
  const byChange = [...allAssets].sort((a, b) => b.change24h - a.change24h);
  const topMovers: LeaderboardRow[] = byChange.slice(0, 10).map((a, i) => ({
    rank: i + 1,
    symbol: a.symbol,
    price: a.price,
    change24h: a.change24h,
    volume: a.volume24h,
    volumeFormatted: formatVol(a.volume24h),
  }));

  const volumeLeaders: LeaderboardRow[] = (pulse.leaders?.volumeLeaders ?? []).slice(0, 5).map((l, i) => ({
    rank: i + 1,
    symbol: l.symbol,
    volume: l.volume,
    volumeFormatted: formatVol(l.volume),
  }));

  const sectorNames: Record<string, string> = {
    commodities: "Commodities",
    indices: "Indices",
    stocks: "Stocks",
    ai_tech: "AI/Tech",
  };
  const sectorAvgs = [
    { key: "commodities", avg: pulse.sectorStats?.commodities?.avgChange ?? 0 },
    { key: "indices", avg: pulse.sectorStats?.indices?.avgChange ?? 0 },
    { key: "stocks", avg: pulse.sectorStats?.stocks?.avgChange ?? 0 },
    { key: "ai_tech", avg: pulse.sectorStats?.aiPlays?.avgChange ?? 0 },
  ].sort((a, b) => b.avg - a.avg);
  const hottestSector = sectorNames[sectorAvgs[0]?.key ?? ""] ?? "—";
  const coldestSector = sectorNames[sectorAvgs[sectorAvgs.length - 1]?.key ?? ""] ?? "—";

  const toRow = (a: { symbol: string; price: number; change24h: number; volume24h: number }): LeaderboardRow => ({
    symbol: a.symbol,
    price: a.price,
    change24h: a.change24h,
    volume: a.volume24h,
    volumeFormatted: formatVol(a.volume24h),
  });

  return {
    title: "HIP-3 TradFi",
    topMovers,
    volumeLeaders,
    oneLiner: pulse.summary?.overallBias
      ? `${pulse.summary.overallBias.toUpperCase()} · ${hottestSector} +${sectorAvgs[0]?.avg?.toFixed(1) ?? "0"}%`
      : "TradFi assets on Hyperliquid",
    bias: pulse.summary?.overallBias ?? "mixed",
    rotation: pulse.summary?.tradFiVsCrypto === "tradfi_outperforming"
      ? "TradFi > Crypto"
      : pulse.summary?.tradFiVsCrypto === "crypto_outperforming"
        ? "Crypto > TradFi"
        : "Neutral",
    hottestSector,
    coldestSector,
    categories: {
      commodities: pulse.commodities.map(toRow),
      indices: pulse.indices.map(toRow),
      stocks: pulse.stocks.map(toRow),
      aiTech: pulse.aiPlays.map(toRow),
    },
  };
}

async function buildHLCryptoSection(runtime: IAgentRuntime): Promise<HLCryptoLeaderboardSection | null> {
  const hl = getOrCreateHyperliquidService(runtime);
  const pulse = await safe("HL Crypto", () => hl.getAllCryptoPulse?.() ?? Promise.resolve(null));
  if (!pulse || !(pulse as IHyperliquidCryptoPulse).topMovers) return null;

  const p = pulse as IHyperliquidCryptoPulse;
  const topMovers: LeaderboardRow[] = p.topMovers.slice(0, 10).map((m, i) => ({
    rank: i + 1,
    symbol: m.symbol,
    change24h: m.change24h,
    volume: m.volume24h,
    volumeFormatted: formatVol(m.volume24h),
  }));

  const volumeLeaders: LeaderboardRow[] = p.volumeLeaders.slice(0, 5).map((l, i) => ({
    rank: i + 1,
    symbol: l.symbol,
    volume: l.volume24h,
    volumeFormatted: formatVol(l.volume24h),
    extra: `OI: ${formatVol(l.openInterest)} · Fund: ${(l.funding8h * 100).toFixed(4)}%`,
  }));

  return {
    title: "HL Crypto (Perps)",
    topMovers,
    volumeLeaders,
    oneLiner: `Bias: ${p.overallBias?.toUpperCase() ?? "NEUTRAL"} · Hottest avg: ${(p.hottestAvg ?? 0) >= 0 ? "+" : ""}${(p.hottestAvg ?? 0).toFixed(2)}%`,
    bias: p.overallBias ?? "neutral",
    hottestAvg: p.hottestAvg ?? 0,
    coldestAvg: p.coldestAvg ?? 0,
  };
}

async function buildMemesSection(runtime: IAgentRuntime): Promise<MemesLeaderboardSection | null> {
  const dexscreener = runtime.getService("VINCE_DEXSCREENER_SERVICE") as VinceDexScreenerService | null;
  if (!dexscreener) return null;

  const hot = await safe("Memes hot", () =>
    Promise.resolve(dexscreener.getTrendingTokens(10).filter((t: { priceChange24h: number }) => t.priceChange24h >= 21)),
  );
  const ape = await safe("Memes ape", () => Promise.resolve(dexscreener.getApeTokens().slice(0, 5)));
  const { mood, summary } = dexscreener.getMarketMood();

  const toRow = (t: { symbol: string; priceUsd?: number; priceChange24h?: number; volume24h?: number; volumeLiquidityRatio?: number }, i: number): LeaderboardRow => ({
    rank: i + 1,
    symbol: t.symbol ?? "—",
    price: t.priceUsd,
    change24h: t.priceChange24h,
    volume: t.volume24h,
    volumeFormatted: t.volume24h != null ? formatVol(t.volume24h) : undefined,
    extra: t.volumeLiquidityRatio != null ? `V/L: ${t.volumeLiquidityRatio.toFixed(1)}x` : undefined,
  });

  return {
    title: "Memes (Solana)",
    hot: (hot ?? []).map((t: any, i: number) => toRow(t, i)),
    ape: (ape ?? []).map((t: any, i: number) => toRow(t, i)),
    mood: mood ?? "unknown",
    moodSummary: summary ?? "Meme scanner active.",
  };
}

async function buildMeteoraSection(runtime: IAgentRuntime): Promise<MeteoraLeaderboardSection | null> {
  const meteora = runtime.getService("VINCE_METEORA_SERVICE") as VinceMeteoraService | null;
  if (!meteora) return null;

  const pools = await safe("Meteora", () => Promise.resolve(meteora.getTopPools(10)));
  const tldr = await safe("Meteora TLDR", () => Promise.resolve(meteora.getTLDR()));

  if (!pools || pools.length === 0) return null;

  return {
    title: "Meteora LP",
    topPools: pools.map((p: { name: string; tvl: number; apy?: number }) => ({
      name: p.name,
      tvl: p.tvl,
      tvlFormatted: formatVol(p.tvl),
      apy: p.apy,
    })),
    oneLiner: tldr ?? "Top pools by TVL.",
  };
}

/** Same key as news service – raw Mando cache so we return the full list the terminal shows */
const MANDO_RAW_CACHE_KEY = "mando_minutes:latest:v9";

async function buildNewsSection(runtime: IAgentRuntime): Promise<NewsLeaderboardSection | null> {
  const news = runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as VinceNewsSentimentService | null;
  if (!news) return null;

  const tldr = await safe("News TLDR", () => Promise.resolve(news.getTLDR()));
  const sentiment = (news as any).getSentimentSummary?.() ?? "—";

  // Prefer raw Mando cache so we return ALL headlines (same 36 the terminal shows), even if newsCache was built with old logic
  const rawCache = await safe("News raw cache", () =>
    runtime.getCache<{ articles: Array<{ title: string; url?: string }> }>(MANDO_RAW_CACHE_KEY),
  );
  let headlines: { text: string; sentiment?: string; url?: string }[];
  if (rawCache?.articles?.length) {
    const byTitle = new Map(
      (await Promise.resolve((news as any).getAllHeadlines?.() ?? [])).map((n: { title: string; sentiment?: string }) => [n.title, n.sentiment]),
    );
    headlines = rawCache.articles.map((a) => ({
      text: a.title,
      sentiment: byTitle.get(a.title),
      ...(a.url && { url: a.url }),
    }));
  } else {
    const allHeadlines = await safe("News headlines", () =>
      Promise.resolve((news as any).getAllHeadlines?.() ?? []),
    );
    headlines = (allHeadlines ?? []).map((a: { title: string; sentiment?: string; url?: string }) => ({
      text: a.title,
      sentiment: a.sentiment,
      ...(a.url && { url: a.url }),
    }));
  }

  return {
    title: "MandoMinutes",
    headlines,
    sentiment,
    oneLiner: tldr ?? "News sentiment loaded.",
  };
}

/**
 * Build full leaderboards payload for the frontend.
 */
export async function buildLeaderboardsResponse(
  runtime: IAgentRuntime,
): Promise<LeaderboardsResponse> {
  const now = Date.now();

  const [hip3, hlCrypto, memes, meteora, news] = await Promise.all([
    buildHIP3Section(runtime),
    buildHLCryptoSection(runtime),
    buildMemesSection(runtime),
    buildMeteoraSection(runtime),
    buildNewsSection(runtime),
  ]);

  return {
    updatedAt: now,
    hip3,
    hlCrypto,
    memes,
    meteora,
    news,
  };
}
