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
  headlines: { text: string; sentiment?: string; url?: string }[];
  sentiment: string;
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

export interface PaperResponse {
  openPositions: Position[];
  portfolio: PaperPortfolio;
  recentNoTrades: NoTradeEvaluation[];
  recentMLInfluences: MLInfluenceEvent[];
  mlStatus: MLStatus | null;
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
// Knowledge overview (Knowledge tab)
// ---------------------------------------------------------------------------

export interface KnowledgeFileEntry {
  path: string;
  name: string;
  mtime: number;
  relativePath: string;
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
