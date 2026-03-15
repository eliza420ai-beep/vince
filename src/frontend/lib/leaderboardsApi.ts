/**
 * Leaderboards API – "who's doing best" market data for the leaderboard page.
 * GET /api/agents/:agentId/plugins/vince/leaderboards
 *
 * Data sources: Markets / Memes / News / More / Digital Art from plugin-vince;
 * Polymarket from plugin-polymarket-discovery (Oracle agent only, separate tab).
 */

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
  allTickers?: LeaderboardRow[];
  openInterestLeaders?: LeaderboardRow[];
  crowdedLongs?: LeaderboardRow[];
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
  id?: string;
}

export interface MeteoraLeaderboardSection {
  title: string;
  topPools: MeteoraPoolRow[];
  memePools?: MeteoraPoolRow[];
  /** All pools ranked by APY desc, with category label */
  allPoolsByApy?: Array<MeteoraPoolRow & { category: string }>;
  oneLiner: string;
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

export interface DigitalArtLeaderboardSection {
  title: string;
  collections: DigitalArtCollectionRow[];
  /** All collections by volume (7d > 0), same shape as collections */
  volumeLeaders?: DigitalArtCollectionRow[];
  oneLiner: string;
  /** X of 12 curated collections meet strict criteria */
  criteriaNote?: string;
}

export interface XSentimentAssetRow {
  asset: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  hasHighRiskEvent: boolean;
  /** Unix ms; show "Updated X min ago" in UI */
  updatedAt?: number;
}

export interface NewsLeaderboardSection {
  title: string;
  headlines: { text: string; sentiment?: string; url?: string }[];
  sentiment: string;
  oneLiner: string;
  /** X (Twitter) vibe check for BTC, ETH, SOL, HYPE (cached, same as trading algo). */
  xSentiment?: {
    assets: XSentimentAssetRow[];
    /** When set and > Date.now(), show "Retry in Xs" (rate limit cooldown). */
    rateLimitedUntil?: number | null;
    /** Overall CT bias: majority or "mixed". */
    overall?: "bullish" | "bearish" | "neutral" | "mixed";
    /** One-line summary, e.g. "Bullish · BTC/ETH/SOL positive". */
    oneLiner?: string;
    /** Oldest/newest updatedAt (ms) across assets for cache summary. */
    oldestUpdatedAt?: number | null;
    newestUpdatedAt?: number | null;
  };
  /** Curated list sentiment when X_LIST_ID set (same scoring as per-asset). */
  listSentiment?: {
    sentiment: string;
    confidence: number;
    hasHighRiskEvent: boolean;
    updatedAt?: number;
  };
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
    assets: {
      coin: string;
      hlFunding?: number;
      cexFunding?: number;
      arb?: string;
    }[];
    arbOpportunities: string[];
  } | null;
  oiCap: string[] | null;
  alerts: {
    total: number;
    unread: number;
    highPriority: number;
    items: {
      type: string;
      title: string;
      message: string;
      timestamp: number;
    }[];
  } | null;
  watchlist: {
    tokens: {
      symbol: string;
      chain?: string;
      priority?: string;
      targetMcap?: number;
    }[];
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
    tokens: {
      symbol: string;
      chain: string;
      netFlow: number;
      buyVolume: number;
      priceChange24h: number;
    }[];
    creditRemaining: number | null;
  } | null;
  /** 24h volume vs 7d average (BTC, ETH, SOL, HYPE). Same logic as paper bot sizing. */
  volumeInsights: {
    assets: Array<{
      asset: string;
      volumeRatio: number | null;
      volume24h: number | null;
      volume24hFormatted: string | null;
      interpretation: "spike" | "elevated" | "normal" | "low" | "dead_session";
    }>;
  } | null;
}

export interface LeaderboardsResponse {
  updatedAt: number;
  hip3: HIP3LeaderboardSection | null;
  hlCrypto: HLCryptoLeaderboardSection | null;
  memes: MemesLeaderboardSection | null;
  memesBase?: MemesLeaderboardSection | null;
  meteora: MeteoraLeaderboardSection | null;
  news: NewsLeaderboardSection | null;
  digitalArt: DigitalArtLeaderboardSection | null;
  more: MoreLeaderboardSection | null;
  chartTickers?: {
    hyperliquid: string[];
    watchlist: string[];
    tastytrade: string[];
  };
  fdCache?: {
    generatedAt?: number | null;
    fileCount?: number;
    status?: "ready" | "missing" | "stale";
  };
  /** FD sleeve discovery: PromoteNow / ResearchNext / Avoid; optional newCandidates, existingSleeve, calibration */
  fdDiscovery?: FdDiscoverySection | null;
  fdDiscoveryStatus?: {
    state:
      | "ready"
      | "missing_candidates_file"
      | "missing_replay_rows"
      | "error";
    candidatesFileExists: boolean;
    historyRuns: number;
    replayRows: number;
    message: string;
    lastGeneratedAt?: string | null;
    error?: string | null;
  };
  /** From last discovery run: screened → enriched → ranked (when two-stage used). */
  fdDiscoveryMetrics?: {
    screenedCount?: number;
    enrichedCount: number;
    rankedCount: number;
    generatedAt: string;
  } | null;
  hip3Status?: "loading" | "ok" | "stale" | "error";
  hlCryptoStatus?: "loading" | "ok" | "stale" | "error";
  /** Forge Ops: replay gates and metrics for the Leaderboard card */
  forgeOps?: ForgeOpsSection | null;
  forgeOpsStatus?: "loading" | "ok" | "stale" | "error";
}

/** Resolved outcome row for FD discovery diagnostics */
export interface FdDiscoveryResolvedRow {
  runId: string;
  ticker: string;
  horizon: "1m" | "3m";
  entryBarDate: string;
  entryClose: number;
  targetBarDate: string;
  targetClose: number;
  returnPct: number;
  outcome: 0 | 1;
  resolvedAt: number;
  bucket?: string;
  candidateSource?: string;
}

/** Open FD discovery prediction row */
export interface FdDiscoveryOpenRow {
  id: string;
  ticker: string;
  horizonLabel?: string;
  dueAt: number;
  bucket?: string;
  discoveryRunId?: string;
}

/** Bucket-level hit rate and return metrics */
export interface FdDiscoveryBucketMetrics {
  promoteNowHitRate: number | null;
  researchNextHitRate: number | null;
  avoidSaveRate: number | null;
  avgReturnByBucket: Record<string, number>;
  resolvedCountByBucket: Record<string, number>;
}

/** FD discovery: ranked sleeve candidates; optional net-new, calibration, and diagnostics */
/** Structured explanation for operator decision surface. */
export interface FdDiscoveryExplanation {
  momentum?: string;
  quality?: string;
  event?: string;
  liquidity?: string;
  portfolioFit?: string;
}

/** One FD discovery candidate item (promoteNow, researchNext, avoid, newCandidates, existingSleeve). */
export interface FdDiscoveryCandidateItem {
  ticker: string;
  sleeve: string;
  score: number;
  reason: string;
  explanation?: FdDiscoveryExplanation;
  /** Tags aligning with tastytrade preset watchlists (Earnings catalyst, Liquid Symbols style, Sector: X). */
  tastytradeTags?: string[];
}

export interface FdDiscoverySection {
  title: string;
  oneLiner: string;
  promoteNow: FdDiscoveryCandidateItem[];
  researchNext: FdDiscoveryCandidateItem[];
  avoid: FdDiscoveryCandidateItem[];
  generatedAt: string;
  newCandidates?: FdDiscoveryCandidateItem[];
  existingSleeve?: FdDiscoveryCandidateItem[];
  calibration?: {
    windowDays: number;
    overallMeanBrier: number | null;
    overallCount: number;
    byAgent: Array<{ agent: string; count: number; meanBrier: number }>;
  };
  resolved?: FdDiscoveryResolvedRow[];
  open?: FdDiscoveryOpenRow[];
  falsePositives?: FdDiscoveryResolvedRow[];
  bucketMetrics?: FdDiscoveryBucketMetrics;
  fdStatus?: "ready" | "stale" | "missing";
  fdFreshness?: string;
  promotionVerdicts?: Array<{
    ticker: string;
    bucket: string;
    score: number;
    eligibleForPromotion: boolean;
    requiresHumanReview: boolean;
    blockedByPolicy: string | null;
  }>;
}

export interface ForgeOpsSection {
  title: string;
  oneLiner: string;
  gates: {
    holdout: { pass: boolean; current: number; required: number };
    trigger: { pass: boolean; current: number; required: number };
    winRate: { pass: boolean; current: number; required: number };
  };
  metrics: {
    holdoutLabeled: number;
    totalCacheRecords: number;
    withOutcome: number;
    winRate: number;
    sharpe: number;
    brierScore: number;
    avgPnlPct: number;
    maxDrawdown: number;
  };
  runtime: {
    branch: string;
    latestForgeBranch: string;
    policyHash: string;
  };
  lastUpdatedAt: number;
}

const STALE_MS = 2 * 60 * 1000; // 2 minutes

export interface LeaderboardsFetchResult {
  data: LeaderboardsResponse | null;
  error: string | null;
  status: number | null;
}

export async function fetchLeaderboards(
  agentId: string,
): Promise<LeaderboardsResponse | null> {
  const result = await fetchLeaderboardsWithError(agentId);
  return result.data;
}

export async function fetchLeaderboardsWithError(
  agentId: string,
  options?: { refreshNews?: boolean; discoveryUniverse?: "sleeve" | "full" },
): Promise<LeaderboardsFetchResult> {
  const base = window.location.origin;
  // ElizaOS core registers plugin routes as /{plugin.name}{route.path} → plugin-vince/vince/leaderboards
  const params = new URLSearchParams({
    agentId: agentId,
  });
  if (options?.refreshNews) {
    params.set("refreshNews", "1");
  }
  if (options?.discoveryUniverse) {
    params.set("discoveryUniverse", options.discoveryUniverse);
  }
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/leaderboards?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as LeaderboardsResponse,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

export async function runFdDiscoveryWithError(
  agentId: string,
  options?: { discoveryUniverse?: "sleeve" | "full" },
): Promise<{
  success: boolean;
  error: string | null;
  status: number | null;
  result?: {
    file?: string;
    discoveryRunId?: string;
    registeredPredictions?: number;
    candidateCounts?: {
      promoteNow: number;
      researchNext: number;
      avoid: number;
      existingSleeve: number;
      newCandidates: number;
    };
    useFullUniverse: boolean;
    message?: string;
  };
}> {
  const base = window.location.origin;
  const params = new URLSearchParams({
    agentId,
  });
  if (options?.discoveryUniverse) {
    params.set("discoveryUniverse", options.discoveryUniverse);
  }
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/leaderboards/fd-discovery/run?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(120000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { success: false, error: msg, status: res.status };
    }
    return {
      success: Boolean(body?.success),
      error: null,
      status: res.status,
      result: body?.result,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { success: false, error: msg, status: null };
  }
}

export { STALE_MS as LEADERBOARDS_STALE_MS };

// ---------------------------------------------------------------------------
// Polymarket priority markets (Polymarket tab – Oracle agent)
// ---------------------------------------------------------------------------

export type PolymarketPriorityMarketItem = {
  question: string;
  conditionId: string;
  volume?: string;
  liquidity?: string;
  yesTokenId?: string;
  noTokenId?: string;
  slug?: string;
  /** YES outcome probability 0–1 (display as % in UI) */
  yesPrice?: number;
  /** Optional category for grouping (e.g. crypto, finance, other) */
  category?: string;
  /** Optional end date ISO string for weekly/monthly context */
  endDateIso?: string;
  /** Parent event slug for building polymarket.com/event URLs */
  eventSlug?: string;
  /** Parent event id for building polymarket.com/event URLs */
  eventId?: string;
};

export interface PolymarketPriorityMarketsResponse {
  whyWeTrack: string;
  intentSummary: string;
  markets: PolymarketPriorityMarketItem[];
  updatedAt: number;
  /** Weekly crypto odds for Hypersurface vibe check (Polymarket /crypto/weekly) */
  weeklyCrypto?: {
    oneLiner: string;
    link: string;
    markets: PolymarketPriorityMarketItem[];
    updatedAt: number;
  };
  /** Crypto ETF flows and related markets (polymarket.com/crypto/etf) */
  cryptoEtf?: {
    oneLiner: string;
    link: string;
    markets: PolymarketPriorityMarketItem[];
    updatedAt: number;
  };
  /** Per-tag sections (Bitcoin, Ethereum, Solana, etc.) for leaderboard */
  tagSections?: Record<
    string,
    { label: string; markets: PolymarketPriorityMarketItem[] }
  >;
}

export interface PolymarketPriorityMarketsFetchResult {
  data: PolymarketPriorityMarketsResponse | null;
  error: string | null;
  status: number | null;
}

/** Edge engine status for Polymarket tab (plugin-polymarket-edge) */
export interface PolymarketEdgeStatus {
  running: boolean;
  paused: boolean;
  contractsWatched: number;
  btcLastPrice: number | null;
  lastDiscoveryAt?: number | null;
  strategies: Record<string, { lastSignalAt?: number; signalCount: number }>;
  error?: string;
  hint?: string;
}

export interface PolymarketEdgeStatusFetchResult {
  data: PolymarketEdgeStatus | null;
  error: string | null;
  status: number | null;
}

/** One edge signal (emitted by engine, written to desk) */
export interface PolymarketEdgeSignalItem {
  id: string;
  createdAt: string;
  strategy: string;
  source: string;
  marketId: string;
  side: string;
  confidence: number | null;
  edgeBps: number | null;
  forecastProb: number | null;
  marketPrice: number | null;
  deskSignalId: string | null;
  question: string | null;
}

export interface PolymarketEdgeSignalsResponse {
  signals: PolymarketEdgeSignalItem[];
  updatedAt: number;
  hint?: string;
  error?: string;
}

export interface PolymarketEdgeSignalsFetchResult {
  data: PolymarketEdgeSignalsResponse | null;
  error: string | null;
  status: number | null;
}

export async function fetchPolymarketEdgeSignals(
  agentId: string,
  limit?: number,
): Promise<PolymarketEdgeSignalsFetchResult> {
  const base = window.location.origin;
  const params = limit != null ? `?limit=${Math.min(limit, 100)}` : "";
  const url = `${base}/api/agents/${agentId}/plugins/polymarket-edge/edge/signals${params}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as PolymarketEdgeSignalsResponse,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

export async function fetchPolymarketEdgeStatus(
  agentId: string,
): Promise<PolymarketEdgeStatusFetchResult> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/polymarket-edge/edge/status`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as PolymarketEdgeStatus,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

/** POST edge/refresh: run discovery once and return status (same shape as fetchPolymarketEdgeStatus). */
export async function fetchPolymarketEdgeRefresh(
  agentId: string,
): Promise<PolymarketEdgeStatusFetchResult> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/polymarket-edge/edge/refresh`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as PolymarketEdgeStatus,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

/** Desk paper-trading summary (plugin-polymarket-desk) */
export interface PolymarketDeskStatus {
  tradesToday: number;
  volumeTodayUsd: number;
  executionPnlTodayUsd: number;
  pendingSignalsCount: number;
  /** Pending sized orders (open paper positions) from Risk */
  pendingSizedOrdersCount?: number;
  /** Total rows in trade_log (diagnostic for "Recent trades empty?") */
  tradeLogCount?: number;
  /** ISO string of latest trade_log row, or null if empty */
  tradeLogLatestAt?: string | null;
  updatedAt: number;
  error?: string;
  hint?: string;
}

export interface PolymarketDeskStatusFetchResult {
  data: PolymarketDeskStatus | null;
  error: string | null;
  status: number | null;
}

/** One desk fill (trade_log row) with enrichment from edge_signals + discovery */
export interface PolymarketDeskTradeItem {
  id: string;
  createdAt: string;
  marketId: string;
  question?: string;
  eventUrl?: string | null;
  strategy?: string;
  strategyWhy?: string;
  side: string;
  sizeUsd: number;
  arrivalPrice: number | null;
  fillPrice: number;
  executionPnlUsd: number | null;
  mtmPnlUsd?: number | null;
  currentPrice?: number | null;
}

export interface PolymarketDeskTradesResponse {
  trades: PolymarketDeskTradeItem[];
  updatedAt: number;
  hint?: string;
  error?: string;
}

export interface PolymarketDeskTradesFetchResult {
  data: PolymarketDeskTradesResponse | null;
  error: string | null;
  status: number | null;
}

/** One open paper position (pending sized order with live P&L) */
export interface PolymarketPaperPosition {
  id: string;
  signalId: string;
  marketId: string;
  question: string;
  side: "YES" | "NO";
  sizeUsd: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  openedAt: string;
  strategy: string;
  edgeBps: number;
  confidence: number;
  forecastProb: number;
  metadata: Record<string, unknown> | null;
}

export interface PolymarketPaperPositionsResponse {
  positions: PolymarketPaperPosition[];
  /** Total pending sized orders (list may be capped to avoid timeouts) */
  totalPending?: number;
  /** True when list was capped and live Polymarket prices were skipped (P&L ≈ 0) */
  livePricesSkipped?: boolean;
  updatedAt: number;
  error?: string;
  hint?: string;
}

export interface PolymarketPaperPositionsFetchResult {
  data: PolymarketPaperPositionsResponse | null;
  error: string | null;
  status: number | null;
}

export async function fetchPolymarketDeskStatus(
  agentId: string,
): Promise<PolymarketDeskStatusFetchResult> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/polymarket-desk/desk/status`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as PolymarketDeskStatus,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

export async function fetchPolymarketDeskTrades(
  agentId: string,
  limit?: number,
): Promise<PolymarketDeskTradesFetchResult> {
  const base = window.location.origin;
  const params = limit != null ? `?limit=${Math.min(limit, 100)}` : "";
  const url = `${base}/api/agents/${agentId}/plugins/polymarket-desk/desk/trades${params}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as PolymarketDeskTradesResponse,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

export async function fetchPolymarketDeskPositions(
  agentId: string,
): Promise<PolymarketPaperPositionsFetchResult> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/polymarket-desk/desk/positions`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as PolymarketPaperPositionsResponse,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

export async function fetchPolymarketPriorityMarkets(
  agentId: string,
): Promise<PolymarketPriorityMarketsFetchResult> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/polymarket-discovery/polymarket/priority-markets`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as PolymarketPriorityMarketsResponse,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

// ---------------------------------------------------------------------------
// Paper trading (Trading Bot tab)
// ---------------------------------------------------------------------------

export interface Position {
  id: string;
  asset: string;
  direction: string;
  entryPrice: number;
  sizeUsd: number;
  marginUsd?: number;
  leverage: number;
  unrealizedPnl?: number;
  unrealizedPnlPct?: number;
  markPrice?: number;
  stopLossPrice?: number;
  takeProfitPrices?: number[];
  liquidationPrice?: number;
  openedAt: number;
  strategyName?: string;
  triggerSignals?: string[];
  entryATRPct?: number;
  metadata?: {
    entryATRPct?: number;
    contributingSources?: string[];
    conflictingReasons?: string[];
    strength?: number;
    confidence?: number;
    confirmingCount?: number;
    totalSourceCount?: number;
    conflictingCount?: number;
    session?: string;
    slPct?: number;
    tp1Pct?: number;
    slLossUsd?: number;
    tp1ProfitUsd?: number;
    rrRatio?: number;
    rrLabel?: string;
    mlQualityScore?: number;
    banditWeightsUsed?: boolean;
    [key: string]: unknown;
  };
}

export interface PaperPortfolio {
  balance: number;
  initialBalance: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalValue: number;
  returnPct: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  lastUpdate: number;
}

export interface NoTradeEvaluation {
  asset: string;
  direction: string;
  reason: string;
  strength: number;
  confidence: number;
  confirmingCount: number;
  minStrength: number;
  minConfidence: number;
  minConfirming: number;
  timestamp: number;
  /** Sources that contributed to the signal (still below threshold). When XSentiment missing, X was neutral/below 40%. */
  contributingSources?: string[];
}

export interface MLInfluenceEvent {
  type: "reject" | "open";
  asset: string;
  message: string;
  timestamp: number;
}

export interface MLStatus {
  modelsLoaded: string[];
  signalQualityThreshold: number;
  suggestedMinStrength: number | null;
  suggestedMinConfidence: number | null;
  tpLevelIndices: number[];
  tpLevelSkipped: number | null;
  banditReady: boolean;
  banditTradesProcessed: number;
}

export interface KPIProgress {
  daily: {
    target: number;
    current: number;
    pct: number;
    remaining: number;
    trades: number;
    winRate: number;
    pace: "ahead" | "on-track" | "behind";
    paceAmount: number;
  };
  monthly: {
    target: number;
    current: number;
    pct: number;
    remaining: number;
    status: "ahead" | "on-track" | "behind";
    dailyTargetToHitGoal?: number;
  };
}

export interface PaperResponse {
  openPositions: Position[];
  portfolio: PaperPortfolio;
  recentNoTrades: NoTradeEvaluation[];
  recentMLInfluences: MLInfluenceEvent[];
  mlStatus: MLStatus | null;
  goalProgress: KPIProgress | null;
  goalTargets: { daily: number; monthly: number } | null;
  signalStatus: {
    signalCount: number;
    lastUpdate: number;
    dataSources: { name: string; available: boolean }[];
  } | null;
  banditSummary: {
    totalTrades: number;
    topSources: { source: string; winRate: number }[];
    bottomSources: { source: string; winRate: number }[];
  } | null;
  /** Last closed positions (contributingSources only) for "X contributed to N of K" */
  recentClosedTrades: Array<{ contributingSources?: string[] }>;
  /** Recent closed trades with P&L (which trades, how much made) */
  recentTrades: RecentTradeItem[];
  updatedAt: number;
}

export interface RecentTradeItem {
  asset: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  closeReason: string;
  openedAt: number;
  closedAt: number;
}

export type NorthStarStatus = "on_track" | "at_risk" | "blocked";

export interface RecursiveNorthStarPillar {
  score: number;
  status: NorthStarStatus;
  highlights: string[];
  blockers: string[];
}

export interface RecursiveNorthStarResponse {
  scorecard: {
    overallScore: number;
    status: NorthStarStatus;
  };
  pillars: {
    recursion: RecursiveNorthStarPillar;
    ml: RecursiveNorthStarPillar;
    synergy: RecursiveNorthStarPillar;
  };
  metrics: {
    recursion: {
      sufficiencyGrade: "LOW" | "MEDIUM" | "HIGH";
      sufficiencySampleCount: number;
      blockingTaskCount: number;
      allocatorStage: string;
      allocatorMode: string;
      allocatorSummaryAvailable?: boolean;
      allocatorSummaryStale?: boolean;
      allocatorSummaryAgeMs?: number | null;
      allocatorSummarySource?: "live" | "history" | "none";
      coverageVelocity?: {
        missingClosedRowsTo20: number;
        missingDistinctDaysTo7: number;
        missingRegimeDepthTo5: number;
        sprintWindowDays?: number;
        daysCovered?: number;
        daysRemaining?: number;
        closesPerDayNeeded?: number;
        distinctDaysPerDayNeeded?: number;
        regimeDepthPerDayNeeded?: number;
      };
      sufficiencyBlockingReasons?: string[];
      sufficiencyBlockersByDimension?: Record<string, string>;
      sufficiencyActions?: string[];
    };
    ml: {
      modelsLoaded: string[];
      modelCount: number;
      signalQualityThreshold: number;
      completeTrades30d: number;
      avoidedDecisions30d: number;
      banditReady: boolean;
      banditTradesProcessed: number;
      readinessReasons: string[];
      missingModelFiles: string[];
      modelsDir: string;
      onnxRuntimeAvailable: boolean;
      lastLoadError: string | null;
      lastLoadErrorCode?: string | null;
      banditInitError: string | null;
      runtimeProbe?: {
        checkedAt: number;
        importOk: boolean;
        cpuBackendOk: boolean;
        modelSessionOk: boolean;
        modelPathChecked: string | null;
        code: string | null;
        message: string | null;
        providerAttempts: Array<{
          strategy: "cpu_explicit" | "default";
          success: boolean;
          error: string | null;
          code: string | null;
        }>;
      } | null;
      runtimeFingerprint?: {
        capturedAt: number;
        execPath: string;
        releaseName: string;
        nodeVersion: string;
        napiVersion: string | null;
        nodeOptions: string | null;
        nativeAddonsDisabled: boolean;
        recoveryCooldownUntil: number | null;
        onnxModulePath?: string | null;
        onnxLoaderStrategy?: "import" | "require" | "unresolved";
      } | null;
      providerAttemptsByModel?: Record<
        string,
        Array<{
          strategy: "cpu_explicit" | "default";
          success: boolean;
          error: string | null;
          code: string | null;
        }>
      >;
    };
    synergy: {
      upliftDelta: number;
      causalPromotionEligible: boolean;
      causalConfidenceScore: number;
      causalPairCount: number;
      minSamplesPerArm: number;
      nearPassDepthRatio?: number;
      nearPassEffectRatio?: number;
      nearPassBonus?: number;
      coverageVelocity?: {
        stageDeficitTotal: number;
        pairDeficitTotal: number;
        minSamplesPerArmDeficit: number;
        sprintWindowDays?: number;
        daysCovered?: number;
        daysRemaining?: number;
        stageDeficitPerDayNeeded?: number;
        pairDeficitPerDayNeeded?: number;
        minArmPerDayNeeded?: number;
      };
      promotionReasons: string[];
      causalPairs: Array<{
        label: string;
        controlStage: string;
        treatmentStage: string;
        controlCount: number;
        treatmentCount: number;
        upliftDelta: number;
        ciLower: number;
        ciUpper: number;
        confidenceScore: number;
        smoothedUpliftDelta?: number;
        smoothedCiLower?: number;
        smoothedConfidenceScore?: number;
        passed: boolean;
        failureReason?: string;
      }>;
      stageDepth?: {
        minimumSamplesPerArm: number;
        allStagesReady: boolean;
        perStage: Array<{
          stage: string;
          count: number;
          deficitToMin: number;
        }>;
        pairDepth: Array<{
          label: string;
          controlStage: string;
          treatmentStage: string;
          controlCount: number;
          treatmentCount: number;
          minArmSamples: number;
          deficitToMin: number;
        }>;
      };
    };
  };
  northStar: {
    fullRecursionReady: boolean;
    onePlusOneEqThreeReady: boolean;
    why: string[];
  };
  milestones: {
    recursion3d: {
      pass: boolean;
      observedPoints: number;
      target: string;
    };
    ml3d: {
      pass: boolean;
      observedPoints: number;
      target: string;
    };
    synergy7d: {
      pass: boolean;
      observedPoints: number;
      target: string;
    };
  };
  trend?: {
    windows: Array<{
      windowDays: number;
      overallScore: number;
      recursionScore: number;
      mlScore: number;
      synergyScore: number;
    }>;
    deltaVs7d: number;
    history: Array<{
      at: number;
      overallScore: number;
      recursionScore: number;
      mlScore: number;
      synergyScore: number;
    }>;
  };
  lastUpdated: number;
}

export interface RecursiveNorthStarOperatorStatus {
  blockers: {
    recursion: string[];
    ml: string[];
    synergy: string[];
  };
  triage: {
    ml: {
      readinessReasons: string[];
      lastLoadError: string | null;
      lastLoadErrorCode: string | null;
      probe: RecursiveNorthStarResponse["metrics"]["ml"]["runtimeProbe"];
      runtimeFingerprint: RecursiveNorthStarResponse["metrics"]["ml"]["runtimeFingerprint"];
      nextActions: string[];
      prioritizedNextActions?: Array<{
        priority: 1 | 2 | 3;
        label: "P1" | "P2" | "P3";
        reasonCode: string;
        action: string;
      }>;
    };
    recursion: {
      sufficiencyTasks: string[];
      nextActions: string[];
      prioritizedNextActions?: Array<{
        priority: 1 | 2 | 3;
        label: "P1" | "P2" | "P3";
        reasonCode: string;
        action: string;
      }>;
    };
    synergy: {
      promotionReasons: string[];
      stageDeficits: Array<{
        stage: string;
        deficitToMin: number;
      }>;
      pairDeficits: Array<{
        label: string;
        deficitToMin: number;
      }>;
      nextActions: string[];
      prioritizedNextActions?: Array<{
        priority: 1 | 2 | 3;
        label: "P1" | "P2" | "P3";
        reasonCode: string;
        action: string;
      }>;
    };
  };
  weeklySnapshot: {
    available: boolean;
    path: string | null;
    capturedAtMs: number | null;
  };
  generatedAt: number;
}

export async function fetchPaperWithError(agentId: string): Promise<{
  data: PaperResponse | null;
  error: string | null;
  status: number | null;
}> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/paper?agentId=${encodeURIComponent(agentId)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return { data: body as PaperResponse, error: null, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

export async function fetchRecursiveNorthStarWithError(
  agentId: string,
): Promise<{
  data: RecursiveNorthStarResponse | null;
  error: string | null;
  status: number | null;
}> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/recursive-north-star?agentId=${encodeURIComponent(agentId)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as RecursiveNorthStarResponse,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

export async function fetchRecursiveNorthStarOperatorStatusWithError(
  agentId: string,
): Promise<{
  data: RecursiveNorthStarOperatorStatus | null;
  error: string | null;
  status: number | null;
}> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/recursive-north-star/operator-status?agentId=${encodeURIComponent(agentId)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as RecursiveNorthStarOperatorStatus,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

// ---------------------------------------------------------------------------
// Usage / TREASURY (session token cost visibility)
// ---------------------------------------------------------------------------

export interface UsageByDay {
  date: string;
  tokens: number;
  runs: number;
}

export interface UsageResponse {
  byDay: UsageByDay[];
  totalTokens: number;
  period: { from: string; to: string };
  estimatedCostUsd: number;
  /** True when cost used default average; false when VINCE_USAGE_COST_PER_1K_TOKENS was set */
  estimatedCostFromDefault?: boolean;
  /** True when tokens were estimated from run count (run_event logs lacked usage/estimatedTokens) */
  estimatedFromRuns?: boolean;
}

export async function fetchUsageWithError(
  agentId: string,
  from?: string,
  to?: string,
): Promise<{
  data: UsageResponse | null;
  error: string | null;
  status: number | null;
}> {
  const base = window.location.origin;
  const params = new URLSearchParams({ agentId });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/usage?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return { data: body as UsageResponse, error: null, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

// ---------------------------------------------------------------------------
// Knowledge overview (Knowledge tab)
// ---------------------------------------------------------------------------

export interface KnowledgeFileEntry {
  path: string;
  name: string;
  mtime: number;
  relativePath: string;
  folder?: string;
}

export interface KnowledgeGroup {
  count: number;
  files: KnowledgeFileEntry[];
}

export interface KnowledgeResponse {
  weekly: KnowledgeGroup;
  allTime: KnowledgeGroup;
  updatedAt: number;
}

function toDisplayString(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return String(obj.message ?? obj.code ?? obj.error ?? JSON.stringify(raw));
  }
  return String(raw ?? "");
}

// ---------------------------------------------------------------------------
// Substack (News tab — Ikigai Studio recent posts from plugin-eliza)
// ---------------------------------------------------------------------------

export interface SubstackPostItem {
  title: string;
  link: string;
  date: string;
}

export interface SubstackPostsResponse {
  posts: SubstackPostItem[];
  error?: string;
}

export async function fetchSubstackPostsWithError(agentId: string): Promise<{
  data: SubstackPostsResponse | null;
  error: string | null;
  status: number | null;
}> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-eliza/eliza/substack`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    const data = body as SubstackPostsResponse;
    return {
      data: { posts: data?.posts ?? [] },
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

/**
 * Submit text or YouTube URL to the knowledge base.
 * Upload is handled only by Eliza (plugin-eliza). Pass Eliza's agentId; if Eliza isn't loaded, upload will 404.
 */
export async function submitKnowledgeUpload(
  agentId: string,
  payload: { type: "text" | "youtube"; content: string },
): Promise<{ success: boolean; message?: string; error?: string }> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-eliza/eliza/upload?agentId=${encodeURIComponent(agentId)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      return { success: false, error: toDisplayString(raw) };
    }
    return {
      success: Boolean(body?.success),
      message:
        body?.message != null ? toDisplayString(body.message) : undefined,
      error: body?.error != null ? toDisplayString(body.error) : undefined,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Network or timeout error",
    };
  }
}

export async function fetchKnowledgeWithError(agentId: string): Promise<{
  data: KnowledgeResponse | null;
  error: string | null;
  status: number | null;
}> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/knowledge?agentId=${encodeURIComponent(agentId)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return { data: body as KnowledgeResponse, error: null, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

// ---------------------------------------------------------------------------
// Knowledge quality results (from RUN_NETWORK_TESTS=1 bun test knowledgeQuality.e2e.test.ts)
// ---------------------------------------------------------------------------

export interface KnowledgeQualityResult {
  domain: string;
  folder: string;
  improvement: number;
  knowledgeIntegration: number;
  baselineScore: number;
  enhancedScore: number;
  /** Eliza | VINCE | Solus — which agent this domain targets */
  agent?: "eliza" | "vince" | "solus";
}

export interface KnowledgeQualityGap {
  domain: string;
  folder: string;
  improvement: number;
  knowledgeIntegration: number;
  recommendation: string;
}

export interface KnowledgeQualityHistoryEntry {
  ranAt: string;
  avgImprovement: number;
  avgKIImprovement: number;
}

export interface KnowledgeQualityResponse {
  ranAt: string;
  summary: {
    avgBaseline: number;
    avgEnhanced: number;
    avgImprovement: number;
    improvementPercent: string;
    avgKIImprovement: number;
  };
  results: KnowledgeQualityResult[];
  gaps: KnowledgeQualityGap[];
  recommendations: string[];
  note?: string;
  /** Last 3 runs for trend display */
  history?: KnowledgeQualityHistoryEntry[];
}

export async function fetchKnowledgeQualityResults(agentId: string): Promise<{
  data: KnowledgeQualityResponse | null;
  error: string | null;
  status: number | null;
}> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/knowledge-quality-results?agentId=${encodeURIComponent(agentId)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg =
        typeof raw === "string"
          ? raw
          : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return {
      data: body as KnowledgeQualityResponse,
      error: null,
      status: res.status,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}
