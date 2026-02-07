/**
 * Leaderboards API – "who's doing best" market data for the leaderboard page.
 * GET /api/agents/:agentId/plugins/vince/leaderboards
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
  oneLiner: string;
  /** X of 12 curated collections meet strict criteria */
  criteriaNote?: string;
}

export interface NewsLeaderboardSection {
  title: string;
  headlines: { text: string; sentiment?: string; url?: string }[];
  sentiment: string;
  oneLiner: string;
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
): Promise<LeaderboardsFetchResult> {
  const base = window.location.origin;
    // ElizaOS core registers plugin routes as /{plugin.name}{route.path} → plugin-vince/vince/leaderboards
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/leaderboards?agentId=${encodeURIComponent(agentId)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw = body?.error ?? body?.message ?? `HTTP ${res.status}`;
      const msg = typeof raw === "string" ? raw : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return { data: body as LeaderboardsResponse, error: null, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}

export { STALE_MS as LEADERBOARDS_STALE_MS };

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
  updatedAt: number;
}

export async function fetchPaperWithError(
  agentId: string,
): Promise<{ data: PaperResponse | null; error: string | null; status: number | null }> {
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
      const msg = typeof raw === "string" ? raw : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return { data: body as PaperResponse, error: null, status: res.status };
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
  estimatedCostUsd?: number;
}

export async function fetchUsageWithError(
  agentId: string,
  from?: string,
  to?: string,
): Promise<{ data: UsageResponse | null; error: string | null; status: number | null }> {
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
      const msg = typeof raw === "string" ? raw : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
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

export async function submitKnowledgeUpload(
  agentId: string,
  payload: { type: "text" | "youtube"; content: string },
): Promise<{ success: boolean; message?: string; error?: string }> {
  const base = window.location.origin;
  const url = `${base}/api/agents/${agentId}/plugins/plugin-vince/vince/upload?agentId=${encodeURIComponent(agentId)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
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
      message: body?.message != null ? toDisplayString(body.message) : undefined,
      error: body?.error != null ? toDisplayString(body.error) : undefined,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Network or timeout error" };
  }
}

export async function fetchKnowledgeWithError(
  agentId: string,
): Promise<{ data: KnowledgeResponse | null; error: string | null; status: number | null }> {
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
      const msg = typeof raw === "string" ? raw : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
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

export async function fetchKnowledgeQualityResults(
  agentId: string,
): Promise<{ data: KnowledgeQualityResponse | null; error: string | null; status: number | null }> {
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
      const msg = typeof raw === "string" ? raw : (raw?.message ?? raw?.code ?? JSON.stringify(raw));
      return { data: null, error: msg, status: res.status };
    }
    return { data: body as KnowledgeQualityResponse, error: null, status: res.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network or timeout error";
    return { data: null, error: msg, status: null };
  }
}
