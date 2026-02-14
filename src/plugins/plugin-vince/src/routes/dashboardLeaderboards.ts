/**
 * Dashboard Leaderboards API – "who's doing best" data for the leaderboard page.
 * Aggregates HIP-3, HL Crypto, Memes, Meteora, News into rankable sections.
 *
 * Polymarket priority markets are intentionally not included here; they are served
 * by plugin-polymarket-discovery via the Oracle agent and the leaderboard "Polymarket" tab.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VinceHIP3Service } from "../services/hip3.service";
import type { HIP3Pulse } from "../services/hip3.service";
import type { VinceDexScreenerService } from "../services/dexscreener.service";
import type { VinceMeteoraService } from "../services/meteora.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import type { VinceXSentimentService } from "../services/xSentiment.service";
import { CORE_ASSETS } from "../constants/targetAssets";
import { getOrCreateHyperliquidService } from "../services/fallbacks";
import { HyperliquidFallbackService } from "../services/fallbacks/hyperliquid.fallback";
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
  verdict?: "APE" | "WATCH" | "AVOID";
  volumeLiquidityRatio?: number;
  marketCap?: number;
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
  /** Full list of HL crypto perp tickers with funding and OI in extra */
  allTickers?: LeaderboardRow[];
  /** Top 10 by open interest */
  openInterestLeaders?: LeaderboardRow[];
  /** Assets with crowded long positioning (extreme_long / long) */
  crowdedLongs?: LeaderboardRow[];
  /** Assets with crowded short positioning (extreme_short / short) */
  crowdedShorts?: LeaderboardRow[];
}

export interface MemesLeaderboardSection {
  title: string;
  hot: LeaderboardRow[];
  ape: LeaderboardRow[];
  watch?: LeaderboardRow[];
  avoid?: LeaderboardRow[];
  leftcurve?: { title: string; headlines: { text: string; url?: string }[] };
  mood: string;
  moodSummary: string;
}

export interface MeteoraPoolRow {
  name: string;
  tvl: number;
  tvlFormatted: string;
  apy?: number;
  binWidth?: number;
  volume24h?: number;
  /** Unique pool id (address) for React keys when same pair appears multiple times */
  id?: string;
}

export interface MeteoraLeaderboardSection {
  title: string;
  topPools: MeteoraPoolRow[];
  memePools?: MeteoraPoolRow[];
  /** All pools ranked by APY desc, with category (Top pools by TVL | Meme LP opportunities) */
  allPoolsByApy?: Array<MeteoraPoolRow & { category: string }>;
  oneLiner: string;
}

/** Per-asset X (Twitter) vibe check from cached sentiment (staggered refresh). */
export interface XSentimentAssetRow {
  asset: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  hasHighRiskEvent: boolean;
  /** Unix ms; for UI "Updated X min ago". */
  updatedAt?: number;
}

export interface NewsLeaderboardSection {
  title: string;
  /** All MandoMinutes headlines for the News tab (with optional deep-dive url) */
  headlines: { text: string; sentiment?: string; url?: string }[];
  sentiment: string;
  /** TLDR / one-liner summary for the News tab */
  oneLiner: string;
  /** X (Twitter) vibe check for BTC, ETH, SOL, HYPE (from cached sentiment, same as trading algo). */
  xSentiment?: {
    assets: XSentimentAssetRow[];
    /** When set and > Date.now(), UI can show "Retry in Xs" (rate limit cooldown). */
    rateLimitedUntil?: number | null;
    /** Overall CT bias from per-asset data: majority or "mixed". */
    overall?: "bullish" | "bearish" | "neutral" | "mixed";
    /** One-line summary for the card, e.g. "Bullish · BTC/ETH/SOL positive". */
    oneLiner?: string;
    /** Oldest/newest updatedAt (ms) across assets for cache summary. */
    oldestUpdatedAt?: number | null;
    newestUpdatedAt?: number | null;
  };
  /** Curated list sentiment when X_LIST_ID set (same scoring as per-asset). */
  listSentiment?: { sentiment: string; confidence: number; hasHighRiskEvent: boolean; updatedAt?: number };
}

export interface DigitalArtCollectionRow {
  name: string;
  slug: string;
  floorPrice: number;
  floorPriceUsd?: number;
  floorThickness: string;
  category?: string;
  volume7d?: number;
  nftsNearFloor?: number;
  gapPctTo2nd?: number;
  /** Recent sale prices (ETH). Max pain: all below floor = floor may not hold. */
  recentSalesPrices?: number[];
  allSalesBelowFloor?: boolean;
  maxRecentSaleEth?: number;
  gaps: {
    to2nd: number;
    to3rd: number;
    to4th: number;
    to5th: number;
    to6th: number;
  };
}

const CURATED_COLLECTIONS_COUNT = 12;

export interface DigitalArtLeaderboardSection {
  title: string;
  collections: DigitalArtCollectionRow[];
  /** All curated collections with non-zero 7d volume, sorted by volume desc (no strict gem criteria) */
  volumeLeaders?: DigitalArtCollectionRow[];
  oneLiner: string;
  /** X of 12 curated collections meet strict criteria */
  criteriaNote?: string;
}

export interface MoreLeaderboardSection {
  fearGreed: { value: number; label: string; classification: string } | null;
  options: {
    btcDvol: number | null;
    ethDvol: number | null;
    btcTldr: string | null;
    ethTldr: string | null;
  } | null;
  crossVenue: {
    assets: { coin: string; hlFunding?: number; cexFunding?: number; arb?: string }[];
    arbOpportunities: string[];
  } | null;
  oiCap: string[] | null;
  alerts: {
    total: number;
    unread: number;
    highPriority: number;
    items: { type: string; title: string; message: string; timestamp: number }[];
  } | null;
  watchlist: {
    tokens: { symbol: string; chain?: string; priority?: string; targetMcap?: number }[];
  } | null;
  regime: { btc?: string; eth?: string } | null;
  binanceIntel: {
    topTraderRatio: number | null;
    takerBuySellRatio: number | null;
    fundingExtreme: boolean;
    fundingDirection: string | null;
    crossExchangeSpread: number | null;
    bestLong: string | null;
    bestShort: string | null;
  } | null;
  coinglassExtended: {
    funding: { asset: string; rate: number }[];
    longShort: { asset: string; ratio: number }[];
    openInterest: { asset: string; value: number; change24h: number | null }[];
  } | null;
  deribitSkew: {
    btc: { skewInterpretation: string } | null;
    eth: { skewInterpretation: string } | null;
  } | null;
  sanbaseOnChain: {
    btc: { flows: string; whales: string; tldr: string } | null;
    eth: { flows: string; whales: string; tldr: string } | null;
  } | null;
  nansenSmartMoney: {
    tokens: { symbol: string; chain: string; netFlow: number; buyVolume: number; priceChange24h: number }[];
    creditRemaining: number | null;
  } | null;
  volumeInsights: {
    assets: Array<{
      asset: string;
      volumeRatio: number | null;
      volume24h: number | null;
      volume24hFormatted: string | null;
      interpretation: string; // "spike" | "elevated" | "normal" | "low" | "dead_session"
    }>;
  } | null;
}

export interface LeaderboardsResponse {
  updatedAt: number;
  hip3: HIP3LeaderboardSection | null;
  hlCrypto: HLCryptoLeaderboardSection | null;
  memes: MemesLeaderboardSection | null;
  meteora: MeteoraLeaderboardSection | null;
  news: NewsLeaderboardSection | null;
  digitalArt: DigitalArtLeaderboardSection | null;
  more: MoreLeaderboardSection | null;
}

// ---------------------------------------------------------------------------
// Build sections from services
// ---------------------------------------------------------------------------

async function buildHIP3Section(runtime: IAgentRuntime): Promise<HIP3LeaderboardSection | null> {
  const hip3 = runtime.getService("VINCE_HIP3_SERVICE") as VinceHIP3Service | null;
  if (!hip3) return null;

  const pulse = await safe("HIP3", (): Promise<HIP3Pulse | null> =>
    (hip3 as VinceHIP3Service).getHIP3Pulse?.() ?? Promise.resolve(null),
  );
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

  const volumeLeaders: LeaderboardRow[] = (pulse.leaders?.volumeLeaders ?? []).slice(0, 5).map((l: { symbol: string; price?: number; volume: number }, i: number) => ({
    rank: i + 1,
    symbol: l.symbol,
    price: l.price,
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
  // Always use our fallback for leaderboards so we get the full asset list (allTickers, OI leaders, crowded).
  // The primary service (external plugin or fallback) may not return assets; using fallback here guarantees full data.
  const fallback = new HyperliquidFallbackService();
  const pulse = await safe("HL Crypto", () => fallback.getAllCryptoPulse());
  if (!pulse || !pulse.topMovers?.length) return null;

  const p = pulse;
  const topMovers: LeaderboardRow[] = p.topMovers.slice(0, 10).map((m, i) => ({
    rank: i + 1,
    symbol: m.symbol,
    price: m.price,
    change24h: m.change24h,
    volume: m.volume24h,
    volumeFormatted: formatVol(m.volume24h),
  }));

  const volumeLeaders: LeaderboardRow[] = p.volumeLeaders.slice(0, 5).map((l, i) => ({
    rank: i + 1,
    symbol: l.symbol,
    price: l.price,
    volume: l.volume24h,
    volumeFormatted: formatVol(l.volume24h),
    extra: `OI: ${formatVol(l.openInterest)} · Fund: ${(l.funding8h * 100).toFixed(4)}%`,
  }));

  const minVolumeUsd = 500_000;
  const sortedByVolume = [...(p.assets ?? [])]
    .filter((a) => a.volume24h >= minVolumeUsd)
    .sort((a, b) => b.volume24h - a.volume24h);
  const allTickers: LeaderboardRow[] = sortedByVolume.map((a, i) => ({
    rank: i + 1,
    symbol: a.symbol,
    price: a.price,
    change24h: a.change24h,
    volume: a.volume24h,
    volumeFormatted: formatVol(a.volume24h),
    extra: `Fund: ${(a.funding8h * 100).toFixed(4)}% · OI: ${formatVol(a.openInterest)}`,
  }));

  const sortedByOi = [...(p.assets ?? [])].sort((a, b) => b.openInterest - a.openInterest);
  const openInterestLeaders: LeaderboardRow[] = sortedByOi.slice(0, 10).map((a, i) => ({
    rank: i + 1,
    symbol: a.symbol,
    price: a.price,
    change24h: a.change24h,
    volume: a.volume24h,
    volumeFormatted: formatVol(a.volume24h),
    extra: `Fund: ${(a.funding8h * 100).toFixed(4)}% · OI: ${formatVol(a.openInterest)}`,
  }));

  const crowdedLongs: LeaderboardRow[] = (p.assets ?? [])
    .filter((a) => a.crowdingLevel === "extreme_long" || a.crowdingLevel === "long")
    .map((a, i) => ({
      rank: i + 1,
      symbol: a.symbol,
      price: a.price,
      change24h: a.change24h,
      volume: a.volume24h,
      volumeFormatted: formatVol(a.volume24h),
      extra: `Fund: ${(a.funding8h * 100).toFixed(4)}% · OI: ${formatVol(a.openInterest)}`,
    }));

  const crowdedShorts: LeaderboardRow[] = (p.assets ?? [])
    .filter((a) => a.crowdingLevel === "extreme_short" || a.crowdingLevel === "short")
    .map((a, i) => ({
      rank: i + 1,
      symbol: a.symbol,
      price: a.price,
      change24h: a.change24h,
      volume: a.volume24h,
      volumeFormatted: formatVol(a.volume24h),
      extra: `Fund: ${(a.funding8h * 100).toFixed(4)}% · OI: ${formatVol(a.openInterest)}`,
    }));

  return {
    title: "HL Crypto (Perps)",
    topMovers,
    volumeLeaders,
    oneLiner: `Bias: ${p.overallBias?.toUpperCase() ?? "NEUTRAL"} · Hottest avg: ${(p.hottestAvg ?? 0) >= 0 ? "+" : ""}${(p.hottestAvg ?? 0).toFixed(2)}%`,
    bias: p.overallBias ?? "neutral",
    hottestAvg: p.hottestAvg ?? 0,
    coldestAvg: p.coldestAvg ?? 0,
    allTickers,
    openInterestLeaders,
    crowdedLongs,
    crowdedShorts,
  };
}

async function buildMemesSection(runtime: IAgentRuntime): Promise<MemesLeaderboardSection | null> {
  const dexscreener = runtime.getService("VINCE_DEXSCREENER_SERVICE") as VinceDexScreenerService | null;
  if (!dexscreener) return null;

  const hot = await safe("Memes hot", () =>
    Promise.resolve(dexscreener.getTrendingTokens(10).filter((t: { priceChange24h: number }) => t.priceChange24h >= 21)),
  );
  const ape = await safe("Memes ape", () => Promise.resolve(dexscreener.getApeTokens().slice(0, 5)));
  const watch = await safe("Memes watch", () =>
    Promise.resolve(dexscreener.getTrendingTokens(50).filter((t: { verdict: string }) => t.verdict === "WATCH").slice(0, 5)),
  );
  const avoid = await safe("Memes avoid", () =>
    Promise.resolve(dexscreener.getTrendingTokens(50).filter((t: { verdict: string }) => t.verdict === "AVOID").slice(0, 5)),
  );
  const { mood, summary } = dexscreener.getMarketMood();

  const news = runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as VinceNewsSentimentService | null;
  const leftcurve =
    news != null
      ? await safe("Memes leftcurve", async () => {
          const items = (news as any).getNewsByCategory?.("leftcurve") ?? [];
          return items.slice(0, 10).map((n: { title: string; url?: string }) => ({
            text: n.title,
            ...(n.url && { url: n.url }),
          }));
        })
      : null;

  const toRow = (
    t: {
      symbol: string;
      price?: number;
      priceUsd?: number;
      priceChange24h?: number;
      volume24h?: number;
      volumeLiquidityRatio?: number;
      verdict?: string;
      marketCap?: number;
    },
    i: number,
  ): LeaderboardRow => ({
    rank: i + 1,
    symbol: t.symbol ?? "—",
    price: t.price ?? t.priceUsd,
    change24h: t.priceChange24h,
    volume: t.volume24h,
    volumeFormatted: t.volume24h != null ? formatVol(t.volume24h) : undefined,
    extra: t.volumeLiquidityRatio != null ? `V/L: ${t.volumeLiquidityRatio.toFixed(1)}x` : undefined,
    verdict: t.verdict as "APE" | "WATCH" | "AVOID" | undefined,
    volumeLiquidityRatio: t.volumeLiquidityRatio,
    marketCap: t.marketCap,
  });

  const result: MemesLeaderboardSection = {
    title: "Memes (Solana)",
    hot: (hot ?? []).map((t: any, i: number) => toRow(t, i)),
    ape: (ape ?? []).map((t: any, i: number) => toRow(t, i)),
    mood: mood ?? "unknown",
    moodSummary: summary ?? "Meme scanner active.",
  };
  if ((watch ?? []).length > 0) result.watch = (watch ?? []).map((t: any, i: number) => toRow(t, i));
  if ((avoid ?? []).length > 0) result.avoid = (avoid ?? []).map((t: any, i: number) => toRow(t, i));
  if (leftcurve && Array.isArray(leftcurve) && leftcurve.length > 0) {
    result.leftcurve = { title: "Left Curve (MandoMinutes)", headlines: leftcurve };
  }
  return result;
}

function toMeteoraPoolRow(
  p: { address?: string; name?: string; tokenA?: string; tokenB?: string; tvl: number; apy?: number; binWidth?: number; volume24h?: number },
  id?: string,
): MeteoraPoolRow {
  return {
    id: id ?? p.address,
    name: p.name ?? (p.tokenA && p.tokenB ? `${p.tokenA}/${p.tokenB}` : "—"),
    tvl: p.tvl,
    tvlFormatted: formatVol(p.tvl),
    apy: p.apy,
    binWidth: p.binWidth,
    ...(p.volume24h != null && { volume24h: p.volume24h }),
  };
}

async function buildMeteoraSection(runtime: IAgentRuntime): Promise<MeteoraLeaderboardSection | null> {
  const meteora = runtime.getService("VINCE_METEORA_SERVICE") as VinceMeteoraService | null;
  if (!meteora) return null;

  const pools = await safe("Meteora", () => Promise.resolve(meteora.getTopPools(10)));
  const memePoolsRaw = await safe("Meteora memePools", () =>
    Promise.resolve(meteora.getMemePoolOpportunities?.() ?? []),
  );
  const allByApy = await safe("Meteora allByApy", () =>
    Promise.resolve(meteora.getAllPoolsRankedByApy?.(25) ?? []),
  );
  const tldr = await safe("Meteora TLDR", () => Promise.resolve(meteora.getTLDR()));

  if (!pools || pools.length === 0) return null;

  const result: MeteoraLeaderboardSection = {
    title: "Meteora LP",
    topPools: pools.map((p: any) => toMeteoraPoolRow(p)),
    oneLiner: tldr ?? "Top pools by TVL.",
  };
  if (memePoolsRaw && memePoolsRaw.length > 0) {
    result.memePools = memePoolsRaw.map((p: any) => toMeteoraPoolRow(p));
  }
  if (allByApy && allByApy.length > 0) {
    result.allPoolsByApy = allByApy.map((p) => ({
      ...toMeteoraPoolRow(p, p.address),
      category: p.category === "meme" ? "Meme LP opportunities" : "Top pools by TVL",
    }));
  }
  return result;
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
    const allHeadlinesRaw = (await Promise.resolve((news as unknown as { getAllHeadlines?: () => Promise<Array<{ title: string; sentiment?: string }>> }).getAllHeadlines?.() ?? [])) as Array<{ title: string; sentiment?: string }>;
    const byTitle = new Map<string, string | undefined>(
      allHeadlinesRaw.map((n) => [n.title, n.sentiment]),
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

  const xSentimentService = runtime.getService("VINCE_X_SENTIMENT_SERVICE") as VinceXSentimentService | null;
  let xSentiment:
    | {
        assets: XSentimentAssetRow[];
        rateLimitedUntil?: number;
        overall?: "bullish" | "bearish" | "neutral" | "mixed";
        oneLiner?: string;
      }
    | undefined;
  let listSentiment: { sentiment: string; confidence: number; hasHighRiskEvent: boolean; updatedAt?: number } | undefined;
  if (xSentimentService?.isConfigured?.()) {
    const assets: XSentimentAssetRow[] = CORE_ASSETS.map((asset) => {
      const s = xSentimentService.getTradingSentiment(asset);
      return {
        asset,
        sentiment: s.sentiment,
        confidence: s.confidence,
        hasHighRiskEvent: s.hasHighRiskEvent,
        ...(s.updatedAt != null && { updatedAt: s.updatedAt }),
      };
    });
    const now = Date.now();
    const rateLimitedUntilMs = xSentimentService.getRateLimitedUntilMs();

    const withData = assets.filter((a) => a.confidence > 0 || (a.updatedAt != null && a.updatedAt !== 0));
    let overall: "bullish" | "bearish" | "neutral" | "mixed" = "neutral";
    let oneLiner: string | undefined;
    if (withData.length > 0) {
      const bull = withData.filter((a) => a.sentiment === "bullish").length;
      const bear = withData.filter((a) => a.sentiment === "bearish").length;
      const neut = withData.filter((a) => a.sentiment === "neutral").length;
      if (bull > bear && bull > neut) overall = "bullish";
      else if (bear > bull && bear > neut) overall = "bearish";
      else if (neut >= bull && neut >= bear) overall = "neutral";
      else overall = "mixed";

      const cap = overall.charAt(0).toUpperCase() + overall.slice(1);
      const positive = withData.filter((a) => a.sentiment === "bullish").map((a) => a.asset);
      const negative = withData.filter((a) => a.sentiment === "bearish").map((a) => a.asset);
      if (overall === "bullish" && positive.length > 0) oneLiner = `${cap} · ${positive.join("/")} positive`;
      else if (overall === "bearish" && negative.length > 0) oneLiner = `${cap} · ${negative.join("/")} negative`;
      else if (overall === "mixed") oneLiner = `${cap} · ${[...new Set(positive.concat(negative))].join("/")} mixed`;
      else oneLiner = `${cap} · per-asset sentiment below`;
    }

    const updatedAts = assets.map((a) => a.updatedAt).filter((t): t is number => t != null && t !== 0);
    const oldestUpdatedAt = updatedAts.length > 0 ? Math.min(...updatedAts) : null;
    const newestUpdatedAt = updatedAts.length > 0 ? Math.max(...updatedAts) : null;
    xSentiment = {
      assets,
      ...(rateLimitedUntilMs > now && { rateLimitedUntil: rateLimitedUntilMs }),
      ...(withData.length > 0 && { overall, oneLiner }),
      ...(oldestUpdatedAt != null && { oldestUpdatedAt, newestUpdatedAt: newestUpdatedAt ?? oldestUpdatedAt }),
    };
    try {
      const listS = await xSentimentService.getListSentiment();
      if (listS.confidence > 0) {
        listSentiment = {
          sentiment: listS.sentiment,
          confidence: listS.confidence,
          hasHighRiskEvent: listS.hasHighRiskEvent,
          ...(listS.updatedAt != null && { updatedAt: listS.updatedAt }),
        };
      }
    } catch {
      // optional: skip list sentiment
    }
  }

  return {
    title: "MandoMinutes",
    headlines,
    sentiment,
    oneLiner: tldr ?? "News sentiment loaded.",
    ...(xSentiment && { xSentiment }),
    ...(listSentiment && { listSentiment }),
  };
}

/** Debug payload: last refresh per asset + rate limited until. GET /vince/debug/x-sentiment */
export interface DebugXSentimentResponse {
  assets: Array<{
    asset: string;
    sentiment: string;
    confidence: number;
    hasHighRiskEvent: boolean;
    updatedAt?: number;
  }>;
  rateLimitedUntil: number | null;
}

export async function buildDebugXSentimentResponse(
  runtime: IAgentRuntime,
): Promise<DebugXSentimentResponse> {
  const xSentimentService = runtime.getService("VINCE_X_SENTIMENT_SERVICE") as VinceXSentimentService | null;
  if (!xSentimentService?.isConfigured?.()) {
    return { assets: [], rateLimitedUntil: null };
  }
  const assets = CORE_ASSETS.map((asset) => {
    const s = xSentimentService.getTradingSentiment(asset);
    return {
      asset,
      sentiment: s.sentiment,
      confidence: s.confidence,
      hasHighRiskEvent: s.hasHighRiskEvent,
      ...(s.updatedAt != null && { updatedAt: s.updatedAt }),
    };
  });
  const now = Date.now();
  const rateLimitedUntilMs = xSentimentService.getRateLimitedUntilMs();
  return {
    assets,
    rateLimitedUntil: rateLimitedUntilMs > now ? rateLimitedUntilMs : null,
  };
}

async function buildDigitalArtSection(runtime: IAgentRuntime): Promise<DigitalArtLeaderboardSection | null> {
  const nftFloor = runtime.getService("VINCE_NFT_FLOOR_SERVICE") as {
    refreshData?: () => Promise<void>;
    getAllFloors?: () => Array<{
      name: string;
      slug: string;
      floorPrice: number;
      floorPriceUsd?: number;
      floorThickness: string;
      category?: string;
      totalVolume?: number;
      volume24h?: number;
      nftsNearFloor?: number;
      recentSalesPrices?: number[];
      allSalesBelowFloor?: boolean;
      maxRecentSaleEth?: number;
      gaps?: {
        to2nd?: number;
        to3rd?: number;
        to4th?: number;
        to5th?: number;
        to6th?: number;
      };
    }>;
    getTLDR?: () => string;
  } | null;
  if (!nftFloor?.getAllFloors) return null;

  await safe("Digital Art refresh", () => Promise.resolve(nftFloor.refreshData?.() ?? Promise.resolve()));
  const floors = await safe("Digital Art floors", () => Promise.resolve(nftFloor.getAllFloors?.() ?? []));
  const tldr = await safe("Digital Art TLDR", () => Promise.resolve(nftFloor.getTLDR?.() ?? "NFT floor data"));

  if (!floors || floors.length === 0) {
    return {
      title: "Digital Art",
      collections: [],
      oneLiner: tldr ?? "NFT: No data yet — set OPENSEA_API_KEY for floor prices.",
    };
  }

  // Gem-on-floor criteria: thin floor + recent sales + at least one sale at/above floor
  const MIN_VOLUME_7D_ETH = 0.001;
  const MIN_GAP_TO_2ND_ETH = 0.21;
  const liquidFloors = floors.filter((c) => {
    const volume7d = c.totalVolume ?? c.volume24h ?? 0;
    const gapTo2nd = c.gaps?.to2nd ?? 0;
    const hasRecentSales = volume7d >= MIN_VOLUME_7D_ETH;
    const hasThinFloor = gapTo2nd >= MIN_GAP_TO_2ND_ETH;
    const salesSupportFloor = c.allSalesBelowFloor !== true; // exclude if all recent sales below floor
    return hasRecentSales && hasThinFloor && salesSupportFloor;
  });

  const collections: DigitalArtCollectionRow[] = liquidFloors
    .map((c) => {
      const to2nd = c.gaps?.to2nd ?? 0;
      const gapPctTo2nd =
        c.floorPrice > 0 && to2nd > 0 ? (to2nd / c.floorPrice) * 100 : undefined;
      return {
        name: c.name,
        slug: c.slug,
        floorPrice: c.floorPrice,
        floorPriceUsd: c.floorPriceUsd,
        floorThickness: c.floorThickness,
        category: c.category,
        volume7d: c.totalVolume,
        nftsNearFloor: c.nftsNearFloor,
        gapPctTo2nd,
        recentSalesPrices: c.recentSalesPrices,
        allSalesBelowFloor: c.allSalesBelowFloor,
        maxRecentSaleEth: c.maxRecentSaleEth,
        gaps: {
          to2nd,
          to3rd: c.gaps?.to3rd ?? 0,
          to4th: c.gaps?.to4th ?? 0,
          to5th: c.gaps?.to5th ?? 0,
          to6th: c.gaps?.to6th ?? 0,
        },
      };
    })
    .sort((a, b) => {
      // Sort by Thickness: Thin → Medium → Thick
      const order = (t: string) => {
        const x = (t || "").toLowerCase();
        if (x === "thin") return 0;
        if (x === "medium") return 1;
        if (x === "thick") return 2;
        return 1;
      };
      return order(a.floorThickness) - order(b.floorThickness);
    });

  const meetCount = liquidFloors.length;
  const criteriaExplanation = [
    `1) Gap to 2nd listing ≥ 0.21 ETH (thin floor)`,
    `2) Recent 7d volume (liquidity)`,
    `3) At least one recent sale at or above floor (price support)`,
  ].join("; ");
  const criteriaNote =
    meetCount > 0
      ? `${meetCount} of ${CURATED_COLLECTIONS_COUNT} curated collections meet gem-on-floor criteria: ${criteriaExplanation}`
      : `0 of ${CURATED_COLLECTIONS_COUNT} curated collections meet criteria. Requirements: ${criteriaExplanation}`;

  // All curated collections with non-zero 7d volume, sorted by volume desc (no strict gem criteria)
  const volumeLeaders: DigitalArtCollectionRow[] = floors
    .filter((c) => {
      const vol = c.totalVolume ?? c.volume24h ?? 0;
      return vol > 0;
    })
    .map((c) => {
      const to2nd = c.gaps?.to2nd ?? 0;
      const gapPctTo2nd =
        c.floorPrice > 0 && to2nd > 0 ? (to2nd / c.floorPrice) * 100 : undefined;
      return {
        name: c.name,
        slug: c.slug,
        floorPrice: c.floorPrice,
        floorPriceUsd: c.floorPriceUsd,
        floorThickness: c.floorThickness,
        category: c.category,
        volume7d: c.totalVolume,
        nftsNearFloor: c.nftsNearFloor,
        gapPctTo2nd,
        recentSalesPrices: c.recentSalesPrices,
        allSalesBelowFloor: c.allSalesBelowFloor,
        maxRecentSaleEth: c.maxRecentSaleEth,
        gaps: {
          to2nd,
          to3rd: c.gaps?.to3rd ?? 0,
          to4th: c.gaps?.to4th ?? 0,
          to5th: c.gaps?.to5th ?? 0,
          to6th: c.gaps?.to6th ?? 0,
        },
      };
    })
    .sort((a, b) => (b.volume7d ?? 0) - (a.volume7d ?? 0));

  return {
    title: "Digital Art",
    collections,
    volumeLeaders,
    oneLiner: tldr ?? "Curated NFT collections — floor prices and thin-floor opportunities.",
    criteriaNote,
  };
}

async function buildMoreSection(runtime: IAgentRuntime): Promise<MoreLeaderboardSection> {
  const coinglass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
    getFearGreed?: () => { value: number; classification: string } | null;
    getAllFunding?: () => { asset: string; rate: number }[];
    getAllLongShortRatios?: () => { asset: string; ratio: number }[];
    getOpenInterest?: (asset: string) => { asset: string; value: number; change24h: number | null } | null;
  } | null;
  const binance = runtime.getService("VINCE_BINANCE_SERVICE") as {
    getFearGreed?: () => Promise<{ value: number; classification: string } | null>;
    getIntelligence?: (asset: string) => Promise<{
      topTraderPositions?: { longShortRatio?: number } | null;
      takerVolume?: { buySellRatio?: number } | null;
      fundingTrend?: { isExtreme?: boolean; extremeDirection?: string } | null;
      crossExchangeFunding?: { spread?: number; bestLong?: string; bestShort?: string } | null;
    }>;
  } | null;
  const deribit = runtime.getService("VINCE_DERIBIT_SERVICE") as {
    getDVOL?: (c: "BTC" | "ETH") => Promise<number | null>;
    getOptionsContext?: (c: "BTC" | "ETH") => Promise<{ ivSurface?: { skewInterpretation?: string } }>;
    getTLDR?: (ctx: unknown) => string;
  } | null;
  const hl = getOrCreateHyperliquidService(runtime);
  const alert = runtime.getService("VINCE_ALERT_SERVICE") as {
    getAlerts?: (opts?: { limit?: number }) => { type: string; title: string; message: string; timestamp: number }[];
    getSummary?: () => { total: number; unread: number; highPriority: number };
  } | null;
  const watchlist = runtime.getService("VINCE_WATCHLIST_SERVICE") as {
    getWatchedTokens?: () => { symbol: string; chain?: string; priority?: string; entryTarget?: number }[];
  } | null;
  const regimeSvc = runtime.getService("VINCE_MARKET_REGIME_SERVICE") as {
    getRegime?: (asset: string) => Promise<{ regime: string }>;
  } | null;
  const sanbase = runtime.getService("VINCE_SANBASE_SERVICE") as {
    getOnChainContext?: (asset: string) => Promise<{
      exchangeFlows?: { sentiment?: string } | null;
      whaleActivity?: { sentiment?: string } | null;
    }>;
    getTLDR?: (ctx: unknown) => string;
  } | null;
  const nansen = runtime.getService("VINCE_NANSEN_SERVICE") as {
    getHotMemeTokens?: () => Promise<{ symbol: string; chain: string; netFlow: number; buyVolume: number; priceChange24h: number }[]>;
    getCreditUsage?: () => { remaining: number };
  } | null;

  const [fearGreedData, btcDvol, ethDvol, btcCtx, ethCtx, crossVenueData, oiCapData, binanceIntelData, coinglassExtData, sanbaseBtcData, sanbaseEthData, nansenData, volumeData] = await Promise.all([
    safe("FearGreed", async () => {
      const cg = coinglass?.getFearGreed?.() ?? null;
      if (cg) return cg;
      const alt = await binance?.getFearGreed?.();
      return alt ? { value: alt.value, classification: alt.classification.replace(/\s+/g, "_").toLowerCase() } : null;
    }),
    safe("Deribit DVOL BTC", () => (deribit?.getDVOL?.("BTC") ?? Promise.resolve(null))),
    safe("Deribit DVOL ETH", () => (deribit?.getDVOL?.("ETH") ?? Promise.resolve(null))),
    safe("Deribit BTC ctx", () => (deribit?.getOptionsContext?.("BTC") ?? Promise.resolve(null))),
    safe("Deribit ETH ctx", () => (deribit?.getOptionsContext?.("ETH") ?? Promise.resolve(null))),
    safe("CrossVenue", () => (hl?.getCrossVenueFunding?.() ?? Promise.resolve(null))),
    safe("OI Cap", () => (hl?.getPerpsAtOpenInterestCap?.() ?? Promise.resolve(null))),
    safe("Binance Intel", () => (binance?.getIntelligence?.("BTC") ?? Promise.resolve(null))),
    safe("CoinGlass Extended", () =>
      Promise.resolve({
        funding: (coinglass?.getAllFunding?.() ?? []).slice(0, 10).map((f: { asset: string; rate: number }) => ({ asset: f.asset, rate: f.rate })),
        longShort: (coinglass?.getAllLongShortRatios?.() ?? []).slice(0, 10).map((ls: { asset: string; ratio: number }) => ({ asset: ls.asset, ratio: ls.ratio })),
        openInterest: ["BTC", "ETH", "SOL"]
          .map((a) => coinglass?.getOpenInterest?.(a))
          .filter(Boolean)
          .map((oi: { asset: string; value: number; change24h: number | null }) => ({ asset: (oi as any).asset, value: (oi as any).value, change24h: (oi as any).change24h })),
      }),
    ),
    safe("Sanbase BTC", async () => {
      const ctx = await sanbase?.getOnChainContext?.("BTC");
      if (!ctx) return null;
      return {
        flows: ctx.exchangeFlows?.sentiment ?? "—",
        whales: ctx.whaleActivity?.sentiment ?? "—",
        tldr: (sanbase as { getTLDR?: (c: unknown) => string }).getTLDR?.(ctx) ?? "—",
      };
    }),
    safe("Sanbase ETH", async () => {
      const ctx = await sanbase?.getOnChainContext?.("ETH");
      if (!ctx) return null;
      return {
        flows: ctx.exchangeFlows?.sentiment ?? "—",
        whales: ctx.whaleActivity?.sentiment ?? "—",
        tldr: (sanbase as { getTLDR?: (c: unknown) => string }).getTLDR?.(ctx) ?? "—",
      };
    }),
    safe("Nansen Smart Money", async () => {
      const tokens = await nansen?.getHotMemeTokens?.() ?? [];
      const credits = nansen?.getCreditUsage?.();
      return { tokens, creditRemaining: credits?.remaining ?? null };
    }),
    safe("VolumeInsights", async () => {
      const md = runtime.getService("VINCE_MARKET_DATA_SERVICE") as {
        getEnrichedContext?: (asset: string) => Promise<{ volumeRatio?: number; volume24h?: number } | null>;
      } | null;
      if (!md?.getEnrichedContext) return null;
      const volAssets = ["BTC", "ETH", "SOL", "HYPE"];
      const results = await Promise.all(
        volAssets.map(async (asset) => {
          const ctx = await md.getEnrichedContext!(asset).catch(() => null);
          return ctx ? { asset, volumeRatio: ctx.volumeRatio ?? null, volume24h: ctx.volume24h ?? null } : null;
        }),
      );
      return results.filter(Boolean) as Array<{ asset: string; volumeRatio: number | null; volume24h: number | null }>;
    }),
  ]);

  const fearGreed =
    fearGreedData != null
      ? {
          value: fearGreedData.value,
          label: fearGreedData.classification.replace(/_/g, " "),
          classification: fearGreedData.classification,
        }
      : null;

  const btcTldr =
    btcCtx && deribit && typeof (deribit as { getTLDR?: (ctx: unknown) => string }).getTLDR === "function"
      ? (deribit as { getTLDR: (ctx: unknown) => string }).getTLDR(btcCtx)
      : null;
  const ethTldr =
    ethCtx && deribit && typeof (deribit as { getTLDR?: (ctx: unknown) => string }).getTLDR === "function"
      ? (deribit as { getTLDR: (ctx: unknown) => string }).getTLDR(ethCtx)
      : null;

  const options =
    btcDvol != null || ethDvol != null || btcTldr != null || ethTldr != null
      ? { btcDvol: btcDvol ?? null, ethDvol: ethDvol ?? null, btcTldr: btcTldr ?? null, ethTldr: ethTldr ?? null }
      : null;

  const crossVenue =
    crossVenueData != null
      ? {
          assets: crossVenueData.assets.slice(0, 10).map((a: { coin: string; hlFunding?: number; cexFunding?: number; arbitrageDirection?: string | null }) => ({
            coin: a.coin,
            hlFunding: a.hlFunding,
            cexFunding: a.cexFunding,
            arb: a.arbitrageDirection ?? undefined,
          })),
          arbOpportunities: crossVenueData.arbitrageOpportunities ?? [],
        }
      : null;

  const oiCap = Array.isArray(oiCapData) ? oiCapData : null;

  const alertItems = alert?.getAlerts?.({ limit: 20 }) ?? [];
  const alertSummary = alert?.getSummary?.();
  const alerts =
    alert != null
      ? {
          total: alertSummary?.total ?? alertItems.length,
          unread: alertSummary?.unread ?? 0,
          highPriority: alertSummary?.highPriority ?? 0,
          items: alertItems.map((a) => ({
            type: a.type,
            title: a.title,
            message: a.message,
            timestamp: a.timestamp,
          })),
        }
      : null;

  const tokens = watchlist?.getWatchedTokens?.() ?? [];
  const watchlistSection =
    tokens.length > 0
      ? {
          tokens: tokens.map((t) => ({
            symbol: t.symbol,
            chain: t.chain,
            priority: t.priority,
            targetMcap: t.entryTarget,
          })),
        }
      : null;

  let regime: { btc?: string; eth?: string } | null = null;
  if (regimeSvc?.getRegime) {
    const [btcRegime, ethRegime] = await Promise.all([
      safe("Regime BTC", () => regimeSvc.getRegime!("BTC")),
      safe("Regime ETH", () => regimeSvc.getRegime!("ETH")),
    ]);
    if (btcRegime || ethRegime) {
      regime = {};
      if (btcRegime) regime.btc = btcRegime.regime;
      if (ethRegime) regime.eth = ethRegime.regime;
    }
  }

  const binanceIntel = binanceIntelData
    ? {
        topTraderRatio: binanceIntelData.topTraderPositions?.longShortRatio ?? null,
        takerBuySellRatio: binanceIntelData.takerVolume?.buySellRatio ?? null,
        fundingExtreme: binanceIntelData.fundingTrend?.isExtreme ?? false,
        fundingDirection: binanceIntelData.fundingTrend?.extremeDirection ?? null,
        crossExchangeSpread: binanceIntelData.crossExchangeFunding?.spread ?? null,
        bestLong: binanceIntelData.crossExchangeFunding?.bestLong ?? null,
        bestShort: binanceIntelData.crossExchangeFunding?.bestShort ?? null,
      }
    : null;

  const coinglassExtended = coinglassExtData
    ? {
        funding: coinglassExtData.funding ?? [],
        longShort: coinglassExtData.longShort ?? [],
        openInterest: (coinglassExtData.openInterest ?? []).filter(
          (oi: { asset?: string; value?: number; change24h?: number | null }) => oi && oi.asset,
        ),
      }
    : null;

  const deribitSkew =
    (btcCtx as { ivSurface?: { skewInterpretation?: string } } | null)?.ivSurface?.skewInterpretation ||
    (ethCtx as { ivSurface?: { skewInterpretation?: string } } | null)?.ivSurface?.skewInterpretation
      ? {
          btc:
            (btcCtx as { ivSurface?: { skewInterpretation?: string } } | null)?.ivSurface?.skewInterpretation != null
              ? { skewInterpretation: (btcCtx as any).ivSurface.skewInterpretation }
              : null,
          eth:
            (ethCtx as { ivSurface?: { skewInterpretation?: string } } | null)?.ivSurface?.skewInterpretation != null
              ? { skewInterpretation: (ethCtx as any).ivSurface.skewInterpretation }
              : null,
        }
      : null;

  const sanbaseOnChain = sanbaseBtcData || sanbaseEthData ? { btc: sanbaseBtcData ?? null, eth: sanbaseEthData ?? null } : null;

  const nansenSmartMoney = nansenData
    ? {
        tokens: (nansenData.tokens ?? []).slice(0, 10).map((t: { symbol: string; chain: string; netFlow: number; buyVolume: number; priceChange24h: number }) => ({
          symbol: t.symbol,
          chain: t.chain,
          netFlow: t.netFlow,
          buyVolume: t.buyVolume,
          priceChange24h: t.priceChange24h,
        })),
        creditRemaining: nansenData.creditRemaining,
      }
    : null;

  const volumeInsights = Array.isArray(volumeData) && volumeData.length > 0
    ? {
        assets: volumeData.map((v: { asset: string; volumeRatio: number | null; volume24h: number | null }) => {
          let interpretation = "normal";
          if (v.volumeRatio != null) {
            if (v.volumeRatio >= 2.0) interpretation = "spike";
            else if (v.volumeRatio >= 1.5) interpretation = "elevated";
            else if (v.volumeRatio < 0.5) interpretation = "dead_session";
            else if (v.volumeRatio < 0.8) interpretation = "low";
          }
          return {
            asset: v.asset,
            volumeRatio: v.volumeRatio,
            volume24h: v.volume24h,
            volume24hFormatted: v.volume24h ? formatVol(v.volume24h) : null,
            interpretation,
          };
        }),
      }
    : null;

  return {
    fearGreed,
    options,
    crossVenue,
    oiCap,
    alerts,
    watchlist: watchlistSection,
    regime,
    binanceIntel,
    coinglassExtended,
    deribitSkew,
    sanbaseOnChain,
    nansenSmartMoney,
    volumeInsights,
  };
}

/**
 * Build full leaderboards payload for the frontend.
 */
export async function buildLeaderboardsResponse(
  runtime: IAgentRuntime,
): Promise<LeaderboardsResponse> {
  const now = Date.now();

  const [hip3, hlCrypto, memes, meteora, news, digitalArt, more] = await Promise.all([
    buildHIP3Section(runtime),
    buildHLCryptoSection(runtime),
    buildMemesSection(runtime),
    buildMeteoraSection(runtime),
    buildNewsSection(runtime),
    buildDigitalArtSection(runtime),
    buildMoreSection(runtime),
  ]);

  return {
    updatedAt: now,
    hip3,
    hlCrypto,
    memes,
    meteora,
    news,
    digitalArt,
    more,
  };
}
