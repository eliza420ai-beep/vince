/**
 * Dashboard Leaderboards API – "who's doing best" data for the leaderboard page.
 * Aggregates HIP-3, HL Crypto, Memes, Meteora, News into rankable sections.
 *
 * Polymarket priority markets are intentionally not included here; they are served
 * by plugin-polymarket-discovery via the Oracle agent and the leaderboard "Polymarket" tab.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "node:fs";
import * as path from "node:path";
import type { HIP3Pulse } from "../services/hip3.service";
import { VinceHIP3Service } from "../services/hip3.service";
import type { VinceHLCryptoSnapshotService } from "../services/hlCryptoSnapshot.service";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import type { VinceXSentimentService } from "../services/xSentiment.service";
import { CORE_ASSETS } from "../constants/targetAssets";
import { loadDexterPortfolios } from "../utils/dexterPortfolio";
import { getOrCreateHyperliquidService } from "../services/fallbacks";
import { HyperliquidFallbackService } from "../services/fallbacks/hyperliquid.fallback";
import type { IHyperliquidCryptoPulse } from "../types/external-services";
import { createHash } from "node:crypto";
import {
  loadForgeSignalCache,
  replayWithWeights,
  splitHoldout,
  type ForgeSignalRecord,
  type ReplayThresholdsConfig,
} from "../forge/forgeSignalCache";
import { getCurrentSleeveTickers } from "../utils/fdCandidateUniverse";
import {
  readDiscoveryRunHistory,
  readResolvedOutcomes,
  type DiscoveryResolvedOutcome,
} from "../utils/fdDiscoveryOutcomes";
import {
  getFdReplayRows,
  getFdReplayRowsForUniverse,
} from "../utils/fdReplayImporter";
import { rankDiscoveryCandidates } from "../utils/fdDiscoveryRanker";
import type { PredictionTrackerService } from "../services/predictionTracker.service";
import type {
  DiscoveryUniverseSelector,
  VinceTickerDiscoveryService,
} from "../services/vinceTickerDiscovery.service";

// Section-level timeouts for leaderboards. HIP-3 and HL Crypto can take
// longer when upstream APIs are slow, so we keep this reasonably high to
// avoid dropping sections that are otherwise healthy.
const SECTION_TIMEOUT_MS = 20000;

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
  listSentiment?: {
    sentiment: string;
    confidence: number;
    hasHighRiskEvent: boolean;
    updatedAt?: number;
  };
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

export type SectionStatus = "loading" | "ok" | "stale" | "error";

/** Forge Ops: deterministic replay gates and metrics for the Leaderboard card. */
export interface ForgeOpsSection {
  title: string;
  oneLiner: string;
  /** Gate pass/fail for promotion checks */
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

/** Resolved outcome row for FD discovery diagnostics. */
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

/** Open FD discovery prediction row. */
export interface FdDiscoveryOpenRow {
  id: string;
  ticker: string;
  horizonLabel?: string;
  dueAt: number;
  bucket?: string;
  discoveryRunId?: string;
}

/** Bucket-level hit rate and return metrics. */
export interface FdDiscoveryBucketMetrics {
  promoteNowHitRate: number | null;
  researchNextHitRate: number | null;
  avoidSaveRate: number | null;
  avgReturnByBucket: Record<string, number>;
  resolvedCountByBucket: Record<string, number>;
}

/** FD sleeve discovery: ranked candidates for watchlist/tastytrade. */
export interface FdDiscoverySection {
  title: string;
  oneLiner: string;
  promoteNow: Array<{
    ticker: string;
    sleeve: string;
    score: number;
    reason: string;
  }>;
  researchNext: Array<{
    ticker: string;
    sleeve: string;
    score: number;
    reason: string;
  }>;
  avoid: Array<{
    ticker: string;
    sleeve: string;
    score: number;
    reason: string;
  }>;
  generatedAt: string;
  /** From last full-universe run when available (net-new candidates). */
  newCandidates?: Array<{
    ticker: string;
    sleeve: string;
    score: number;
    reason: string;
  }>;
  /** From last full-universe run when available (re-ranks of current sleeve). */
  existingSleeve?: Array<{
    ticker: string;
    sleeve: string;
    score: number;
    reason: string;
  }>;
  /** Prediction calibration (Brier) for discovery/FD projections. */
  calibration?: {
    windowDays: number;
    overallMeanBrier: number | null;
    overallCount: number;
    byAgent: Array<{ agent: string; count: number; meanBrier: number }>;
  };
  /** Resolved outcomes from discovery-resolved-outcomes.jsonl (and tracker). */
  resolved?: FdDiscoveryResolvedRow[];
  /** Open fd_discovery predictions. */
  open?: FdDiscoveryOpenRow[];
  /** Resolved with outcome 0 (wrong direction). */
  falsePositives?: FdDiscoveryResolvedRow[];
  /** Bucket hit rates and avg return by bucket. */
  bucketMetrics?: FdDiscoveryBucketMetrics;
  /** FD cache/run status for discovery. */
  fdStatus?: "ready" | "stale" | "missing";
  /** Human-readable freshness (e.g. last run time). */
  fdFreshness?: string;
  /** Promotion policy verdicts: eligibleForPromotion, requiresHumanReview, blockedByPolicy (separate from ranking). */
  promotionVerdicts?: Array<{
    ticker: string;
    bucket: string;
    score: number;
    eligibleForPromotion: boolean;
    requiresHumanReview: boolean;
    blockedByPolicy: string | null;
  }>;
}

export interface LeaderboardsResponse {
  updatedAt: number;
  hip3: HIP3LeaderboardSection | null;
  hlCrypto: HLCryptoLeaderboardSection | null;
  memes: MemesLeaderboardSection | null;
  memesBase: MemesLeaderboardSection | null;
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
  hip3Status?: SectionStatus;
  hlCryptoStatus?: SectionStatus;
  forgeOps?: ForgeOpsSection | null;
  forgeOpsStatus?: SectionStatus;
}

function buildFdDiscoverySection(
  projectRoot: string = process.cwd(),
  universe: DiscoveryUniverseSelector = "sleeve",
): FdDiscoverySection {
  const rows =
    universe === "full"
      ? getFdReplayRowsForUniverse(projectRoot)
      : getFdReplayRows(projectRoot);
  const sleeveTickers = new Set(getCurrentSleeveTickers(projectRoot));
  const ranked = rankDiscoveryCandidates(rows, { sleeveTickers });
  const promoteNow = ranked
    .filter((r) => r.bucket === "PromoteNow")
    .map((c) => ({
      ticker: c.ticker,
      sleeve: c.sleeve,
      score: c.score,
      reason: c.reason,
    }));
  const researchNext = ranked
    .filter((r) => r.bucket === "ResearchNext")
    .map((c) => ({
      ticker: c.ticker,
      sleeve: c.sleeve,
      score: c.score,
      reason: c.reason,
    }));
  const avoid = ranked
    .filter((r) => r.bucket === "Avoid")
    .map((c) => ({
      ticker: c.ticker,
      sleeve: c.sleeve,
      score: c.score,
      reason: c.reason,
    }));
  const generatedAt =
    ranked.length > 0 && ranked[0]?.snapshotAt
      ? ranked[0].snapshotAt
      : new Date().toISOString();
  const lastRun = readDiscoveryRunHistory(projectRoot, 1)[0];
  const section: FdDiscoverySection = {
    title: "Sleeve discovery",
    oneLiner:
      promoteNow.length > 0
        ? `${promoteNow.length} PromoteNow, ${researchNext.length} ResearchNext, ${avoid.length} Avoid`
        : "Run FD snapshot build to see ranked candidates.",
    promoteNow,
    researchNext,
    avoid,
    generatedAt,
  };
  if (
    universe === "full" &&
    (lastRun?.newCandidates?.length || lastRun?.existingSleeve?.length)
  ) {
    section.newCandidates = lastRun.newCandidates?.map((c) => ({
      ticker: c.ticker,
      sleeve: c.sleeve,
      score: c.score,
      reason: c.reason,
    }));
    section.existingSleeve = lastRun.existingSleeve?.map((c) => ({
      ticker: c.ticker,
      sleeve: c.sleeve,
      score: c.score,
      reason: c.reason,
    }));
  }
  return section;
}

function buildFdDiscoveryStatus(
  projectRoot: string = process.cwd(),
  fdDiscovery: FdDiscoverySection | null,
  universe: DiscoveryUniverseSelector = "sleeve",
  error?: string | null,
): NonNullable<LeaderboardsResponse["fdDiscoveryStatus"]> {
  const replayRows =
    universe === "full"
      ? getFdReplayRowsForUniverse(projectRoot).length
      : getFdReplayRows(projectRoot).length;
  const historyRuns = readDiscoveryRunHistory(projectRoot, 1).length;
  const candidatesFileExists = fs.existsSync(
    path.join(projectRoot, "portfolio_watchlist_candidates.json"),
  );

  if (error) {
    return {
      state: "error",
      candidatesFileExists,
      historyRuns,
      replayRows,
      message: "FD discovery failed to build on the backend.",
      error,
      lastGeneratedAt: fdDiscovery?.generatedAt ?? null,
    };
  }
  if (replayRows === 0) {
    return {
      state: "missing_replay_rows",
      candidatesFileExists,
      historyRuns,
      replayRows,
      message:
        "No FD replay rows yet. Build FD snapshots for sleeve/watchlist tickers first.",
      lastGeneratedAt: fdDiscovery?.generatedAt ?? null,
    };
  }
  if (!candidatesFileExists && historyRuns === 0) {
    return {
      state: "missing_candidates_file",
      candidatesFileExists,
      historyRuns,
      replayRows,
      message:
        "Weekly discovery has not written portfolio_watchlist_candidates.json yet.",
      lastGeneratedAt: fdDiscovery?.generatedAt ?? null,
    };
  }
  return {
    state: "ready",
    candidatesFileExists,
    historyRuns,
    replayRows,
    message: "FD discovery is available.",
    lastGeneratedAt: fdDiscovery?.generatedAt ?? null,
  };
}

function buildFdDiscoveryDiagnostics(
  projectRoot: string,
  tracker: PredictionTrackerService | null,
): Pick<
  FdDiscoverySection,
  | "resolved"
  | "open"
  | "falsePositives"
  | "bucketMetrics"
  | "fdStatus"
  | "fdFreshness"
> {
  const resolved = readResolvedOutcomes(projectRoot, { limit: 200 });
  const resolvedRows: FdDiscoveryResolvedRow[] = resolved.map(
    (r: DiscoveryResolvedOutcome) => ({
      runId: r.runId,
      ticker: r.ticker,
      horizon: r.horizon,
      entryBarDate: r.entryBarDate,
      entryClose: r.entryClose,
      targetBarDate: r.targetBarDate,
      targetClose: r.targetClose,
      returnPct: r.returnPct,
      outcome: r.outcome,
      resolvedAt: r.resolvedAt,
      bucket: r.bucket,
      candidateSource: r.candidateSource,
    }),
  );
  const falsePositives = resolvedRows.filter((r) => r.outcome === 0);

  let openRows: FdDiscoveryOpenRow[] = [];
  if (tracker?.getOpenPredictions) {
    const open = tracker
      .getOpenPredictions()
      .filter((p) => p.kind === "fd_discovery");
    openRows = open.map((p) => ({
      id: p.id,
      ticker: (p.asset ?? "").toString(),
      horizonLabel: (p.metadata?.horizonLabel as string) ?? undefined,
      dueAt: p.dueAt,
      bucket: (p.metadata?.bucket as string) ?? undefined,
      discoveryRunId: (p.metadata?.discoveryRunId as string) ?? undefined,
    }));
  }

  const byBucket = new Map<
    string,
    { hits: number; total: number; returnSum: number }
  >();
  for (const r of resolved) {
    const b = r.bucket ?? "unknown";
    const cur = byBucket.get(b) ?? { hits: 0, total: 0, returnSum: 0 };
    cur.total += 1;
    if (r.outcome === 1) cur.hits += 1;
    cur.returnSum += r.returnPct;
    byBucket.set(b, cur);
  }
  const avgReturnByBucket: Record<string, number> = {};
  const resolvedCountByBucket: Record<string, number> = {};
  for (const [b, v] of byBucket) {
    resolvedCountByBucket[b] = v.total;
    avgReturnByBucket[b] = v.total > 0 ? v.returnSum / v.total : 0;
  }
  const promoteNow = byBucket.get("PromoteNow");
  const researchNext = byBucket.get("ResearchNext");
  const avoid = byBucket.get("Avoid");
  const bucketMetrics: FdDiscoveryBucketMetrics = {
    promoteNowHitRate:
      promoteNow && promoteNow.total > 0
        ? promoteNow.hits / promoteNow.total
        : null,
    researchNextHitRate:
      researchNext && researchNext.total > 0
        ? researchNext.hits / researchNext.total
        : null,
    avoidSaveRate: avoid && avoid.total > 0 ? avoid.hits / avoid.total : null,
    avgReturnByBucket,
    resolvedCountByBucket,
  };

  const fdCache = getFdCacheFreshness();
  const fdStatus = fdCache.status ?? "missing";
  const lastRun = readDiscoveryRunHistory(projectRoot, 1)[0];
  const fdFreshness = lastRun?.generatedAt
    ? `Last run: ${lastRun.generatedAt.slice(0, 10)}`
    : fdCache.generatedAt != null
      ? `Cache: ${new Date(fdCache.generatedAt).toISOString().slice(0, 10)}`
      : undefined;

  return {
    resolved: resolvedRows.length > 0 ? resolvedRows : undefined,
    open: openRows.length > 0 ? openRows : undefined,
    falsePositives: falsePositives.length > 0 ? falsePositives : undefined,
    bucketMetrics,
    fdStatus,
    fdFreshness,
  };
}

function getFdCacheFreshness(): {
  generatedAt?: number | null;
  fileCount?: number;
  status?: "ready" | "missing" | "stale";
} {
  try {
    const manifestPath = path.join(
      process.cwd(),
      ".elizadb",
      "financialdatasets-cache",
      "manifest.json",
    );
    if (!fs.existsSync(manifestPath)) {
      return { generatedAt: null, fileCount: 0, status: "missing" };
    }
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw) as {
      generatedAt?: string;
      files?: Array<{ ticker?: string }>;
    };
    const generatedAt =
      parsed.generatedAt != null
        ? new Date(parsed.generatedAt).getTime()
        : null;
    const fileCount = Array.isArray(parsed.files) ? parsed.files.length : 0;
    const stale =
      generatedAt != null && Date.now() - generatedAt > 7 * 24 * 60 * 60 * 1000;
    return {
      generatedAt,
      fileCount,
      status: stale ? "stale" : "ready",
    };
  } catch {
    return { generatedAt: null, fileCount: 0, status: "missing" };
  }
}

const FORGE_OPS_MIN_HOLDOUT = 30;
const FORGE_OPS_MIN_TRIGGERED = 5;
const FORGE_OPS_WIN_RATE_GATE = 0.45;

function buildForgeOpsSection(): ForgeOpsSection {
  const repoRoot = process.cwd();
  const policyPath = path.join(repoRoot, "policies", "trading-policy.yaml");

  function readPolicyRaw(): string {
    if (!fs.existsSync(policyPath)) return "";
    return fs.readFileSync(policyPath, "utf-8");
  }
  function policyHash(raw: string): string {
    if (!raw) return "missing";
    return createHash("sha256").update(raw, "utf-8").digest("hex").slice(0, 12);
  }
  function parseThresholdNumber(
    raw: string,
    key: string,
    fallback: number,
  ): number {
    const m = raw.match(new RegExp(`\\b${key}:\\s*([0-9.]+)`, "m"));
    const n = m ? Number(m[1]) : NaN;
    return Number.isFinite(n) ? n : fallback;
  }
  function buildThresholds(raw: string): ReplayThresholdsConfig {
    return {
      minStrength: parseThresholdNumber(raw, "min_strength", 55),
      minConfidence: parseThresholdNumber(raw, "min_confidence", 55),
      minConfirming: parseThresholdNumber(raw, "min_confirming_signals", 2),
    };
  }
  function getBaselineWeights(
    records: ForgeSignalRecord[],
  ): Record<string, number> {
    const latest = [...records]
      .reverse()
      .find(
        (r) => r.weightsSnapshot && Object.keys(r.weightsSnapshot).length > 0,
      );
    return latest?.weightsSnapshot ?? {};
  }
  function currentBranch(): string {
    try {
      const proc = Bun.spawnSync(["git", "branch", "--show-current"], {
        cwd: repoRoot,
        stdout: "pipe",
        stderr: "ignore",
      });
      if (proc.exitCode !== 0) return "unknown";
      return new TextDecoder().decode(proc.stdout).trim() || "unknown";
    } catch {
      return "unknown";
    }
  }
  function latestForgeBranch(): string {
    try {
      const proc = Bun.spawnSync(
        ["git", "branch", "--list", "forge/experiment-*"],
        { cwd: repoRoot, stdout: "pipe", stderr: "ignore" },
      );
      if (proc.exitCode !== 0) return "none";
      const list = new TextDecoder().decode(proc.stdout).trim();
      if (!list) return "none";
      const branches = list
        .split("\n")
        .map((l) => l.trim().replace(/^\*\s*/, ""))
        .filter(Boolean)
        .sort();
      return branches.at(-1) ?? "none";
    } catch {
      return "none";
    }
  }

  const rawPolicy = readPolicyRaw();
  const thresholds = buildThresholds(rawPolicy);
  const hash = policyHash(rawPolicy);
  const holdoutFraction = ((): number => {
    const raw = Number(process.env.FORGE_HOLDOUT_FRACTION ?? "0.2");
    return Number.isFinite(raw) && raw > 0.05 && raw < 0.5 ? raw : 0.2;
  })();

  const all = loadForgeSignalCache().sort(
    (a, b) => a.evaluatedAt - b.evaluatedAt,
  );
  const labeled = all.filter(
    (r) => r.outcome !== undefined && typeof r.pnlPct === "number",
  );
  const { holdout } = splitHoldout(labeled, holdoutFraction);
  const baselineWeights = getBaselineWeights(all);
  const metrics = replayWithWeights(
    holdout,
    { sourceWeights: baselineWeights, defaultWeight: 1.0 },
    thresholds,
  );

  const holdoutPass = holdout.length >= FORGE_OPS_MIN_HOLDOUT;
  const triggerPass = metrics.withOutcome >= FORGE_OPS_MIN_TRIGGERED;
  const winRatePass = metrics.winRate >= FORGE_OPS_WIN_RATE_GATE;

  const oneLiner = [
    `Holdout ${holdout.length}/${FORGE_OPS_MIN_HOLDOUT} ${holdoutPass ? "PASS" : "FAIL"}`,
    `Trig ${metrics.withOutcome}/${FORGE_OPS_MIN_TRIGGERED} ${triggerPass ? "PASS" : "FAIL"}`,
    `WR ${(metrics.winRate * 100).toFixed(1)}% ${winRatePass ? "PASS" : "FAIL"}`,
    `Sharpe ${metrics.sharpe.toFixed(2)}`,
  ].join(" · ");

  return {
    title: "Forge Ops",
    oneLiner,
    gates: {
      holdout: {
        pass: holdoutPass,
        current: holdout.length,
        required: FORGE_OPS_MIN_HOLDOUT,
      },
      trigger: {
        pass: triggerPass,
        current: metrics.withOutcome,
        required: FORGE_OPS_MIN_TRIGGERED,
      },
      winRate: {
        pass: winRatePass,
        current: Math.round(metrics.winRate * 10000) / 100,
        required: FORGE_OPS_WIN_RATE_GATE * 100,
      },
    },
    metrics: {
      holdoutLabeled: holdout.length,
      totalCacheRecords: all.length,
      withOutcome: metrics.withOutcome,
      winRate: metrics.winRate,
      sharpe: metrics.sharpe,
      brierScore: metrics.brierScore,
      avgPnlPct: metrics.avgPnlPct,
      maxDrawdown: metrics.maxDrawdown,
    },
    runtime: {
      branch: currentBranch(),
      latestForgeBranch: latestForgeBranch(),
      policyHash: hash,
    },
    lastUpdatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Build sections from services
// ---------------------------------------------------------------------------

async function buildHIP3Section(
  runtime: IAgentRuntime,
): Promise<HIP3LeaderboardSection | null> {
  logger.info("[Leaderboards] HIP3: building section");
  let hip3 = runtime.getService(
    "VINCE_HIP3_SERVICE",
  ) as VinceHIP3Service | null;
  // In some runtime paths the HIP-3 service may not have been registered on
  // the agent yet (e.g. dashboard-only process). In that case, create a
  // lightweight instance here so the Markets tab can still render HIP-3 data.
  if (!hip3) {
    logger.info(
      "[Leaderboards] HIP3: VINCE_HIP3_SERVICE not registered on runtime, creating ad-hoc instance",
    );
    hip3 = new VinceHIP3Service(runtime);
  }

  const hip3Service = hip3 as VinceHIP3Service;

  // Log current cached status so we can understand why the Markets tab might
  // be empty even when the startup dashboard printed successfully.
  const status =
    typeof hip3Service.getStatus === "function"
      ? hip3Service.getStatus()
      : null;
  if (status) {
    logger.info(
      `[Leaderboards] HIP3: service status available=${status.available} assetCount=${status.assetCount} lastUpdate=${status.lastUpdate}`,
    );
  }

  // Markets endpoint must be fast and non-blocking, even when Hyperliquid is
  // slow. Read strictly from the cached HIP-3 pulse; background refresh and
  // startup verification keep this cache warm.
  const pulse: HIP3Pulse | null =
    typeof hip3Service.getCachedPulse === "function"
      ? hip3Service.getCachedPulse()
      : null;
  if (!pulse) {
    logger.warn(
      "[Leaderboards] HIP3: no pulse available for Markets tab (both live + cache empty)",
    );
    if (status?.available && status.assetCount > 0) {
      logger.warn(
        "[Leaderboards] HIP3: service reports available data but getHIP3Pulse/getCachedPulse returned null – investigate HIP-3 cache wiring",
      );
    }
  } else {
    logger.info(
      "[Leaderboards] HIP3: pulse ready " +
        `commodities=${pulse.commodities.length} ` +
        `indices=${pulse.indices.length} ` +
        `stocks=${pulse.stocks.length} ` +
        `aiPlays=${pulse.aiPlays.length}`,
    );
  }
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

  const volumeLeaders: LeaderboardRow[] = (pulse.leaders?.volumeLeaders ?? [])
    .slice(0, 5)
    .map(
      (l: { symbol: string; price?: number; volume: number }, i: number) => ({
        rank: i + 1,
        symbol: l.symbol,
        price: l.price,
        volume: l.volume,
        volumeFormatted: formatVol(l.volume),
      }),
    );

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
  const coldestSector =
    sectorNames[sectorAvgs[sectorAvgs.length - 1]?.key ?? ""] ?? "—";

  const toRow = (a: {
    symbol: string;
    price: number;
    change24h: number;
    volume24h: number;
  }): LeaderboardRow => ({
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
    rotation:
      pulse.summary?.tradFiVsCrypto === "tradfi_outperforming"
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

async function buildHLCryptoSection(
  runtime: IAgentRuntime,
): Promise<HLCryptoLeaderboardSection | null> {
  const snapshot = runtime.getService(
    "VINCE_HLCRYPTO_SNAPSHOT_SERVICE",
  ) as VinceHLCryptoSnapshotService | null;
  if (!snapshot) return null;

  // Markets endpoint must not block on live Hyperliquid calls. Read strictly
  // from the cached crypto pulse; background refresh keeps it reasonably fresh.
  const pulse = snapshot.getCachedPulse();
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

  const volumeLeaders: LeaderboardRow[] = p.volumeLeaders
    .slice(0, 5)
    .map((l, i) => ({
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

  const sortedByOi = [...(p.assets ?? [])].sort(
    (a, b) => b.openInterest - a.openInterest,
  );
  const openInterestLeaders: LeaderboardRow[] = sortedByOi
    .slice(0, 10)
    .map((a, i) => ({
      rank: i + 1,
      symbol: a.symbol,
      price: a.price,
      change24h: a.change24h,
      volume: a.volume24h,
      volumeFormatted: formatVol(a.volume24h),
      extra: `Fund: ${(a.funding8h * 100).toFixed(4)}% · OI: ${formatVol(a.openInterest)}`,
    }));

  const crowdedLongs: LeaderboardRow[] = (p.assets ?? [])
    .filter(
      (a) => a.crowdingLevel === "extreme_long" || a.crowdingLevel === "long",
    )
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
    .filter(
      (a) => a.crowdingLevel === "extreme_short" || a.crowdingLevel === "short",
    )
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

/** Same key as news service – raw Mando cache so we return the full list the terminal shows */
const MANDO_RAW_CACHE_KEY = "mando_minutes:latest:v9";
const MANDO_NAV_JUNK_RE = /MinutesAffiliate|PodcastsFollow\s*on/i;

async function buildNewsSection(
  runtime: IAgentRuntime,
): Promise<NewsLeaderboardSection | null> {
  const news = runtime.getService(
    "VINCE_NEWS_SENTIMENT_SERVICE",
  ) as VinceNewsSentimentService | null;
  if (!news) return null;

  const tldr = await safe("News TLDR", () => Promise.resolve(news.getTLDR()));
  const sentiment = (news as any).getSentimentSummary?.() ?? "—";
  const getHeadlineSentiment = (
    news as unknown as {
      getSentimentForHeadline?: (
        text: string,
      ) => "bullish" | "bearish" | "neutral";
    }
  ).getSentimentForHeadline;
  let etfDebugLogged = false;
  const resolveHeadlineSentiment = (
    title: string,
    fallback?: string,
  ): string | undefined => {
    // Recompute per-headline sentiment from current logic so stale cache values
    // do not keep old neutral classifications in the News tab.
    const computed = getHeadlineSentiment?.call(news, title);
    const emitted = computed ?? fallback;
    if (
      !etfDebugLogged &&
      /\bbtc\b/i.test(title) &&
      /\beth\b/i.test(title) &&
      /\betfs?\b/i.test(title)
    ) {
      etfDebugLogged = true;
      logger.info(
        `[Leaderboards][ETF_DEBUG] title="${title}" fallback=${String(fallback)} computed=${String(computed)} emitted=${String(emitted)}`,
      );
    }
    return emitted;
  };

  // Prefer raw Mando cache so we return ALL headlines (same 36 the terminal shows), even if newsCache was built with old logic
  const rawCache = await safe("News raw cache", () =>
    runtime.getCache<{ articles: Array<{ title: string; url?: string }> }>(
      MANDO_RAW_CACHE_KEY,
    ),
  );
  let headlines: { text: string; sentiment?: string; url?: string }[];
  if (rawCache?.articles?.length) {
    const allHeadlinesRaw = (await Promise.resolve(
      (
        news as unknown as {
          getAllHeadlines?: () => Promise<
            Array<{ title: string; sentiment?: string }>
          >;
        }
      ).getAllHeadlines?.() ?? [],
    )) as Array<{ title: string; sentiment?: string }>;
    const byTitle = new Map<string, string | undefined>(
      allHeadlinesRaw.map((n) => [n.title, n.sentiment]),
    );
    headlines = rawCache.articles
      .filter((a) => a?.title && !MANDO_NAV_JUNK_RE.test(a.title))
      .map((a) => ({
        text: a.title,
        sentiment: resolveHeadlineSentiment(a.title, byTitle.get(a.title)),
        ...(a.url && { url: a.url }),
      }));
  } else {
    const allHeadlines = await safe("News headlines", () =>
      Promise.resolve((news as any).getAllHeadlines?.() ?? []),
    );
    headlines = (allHeadlines ?? [])
      .filter(
        (a: { title: string; sentiment?: string; url?: string }) =>
          a?.title && !MANDO_NAV_JUNK_RE.test(a.title),
      )
      .map((a: { title: string; sentiment?: string; url?: string }) => ({
        text: a.title,
        sentiment: resolveHeadlineSentiment(a.title, a.sentiment),
        ...(a.url && { url: a.url }),
      }));
  }

  const xSentimentService = runtime.getService(
    "VINCE_X_SENTIMENT_SERVICE",
  ) as VinceXSentimentService | null;
  let xSentiment:
    | {
        assets: XSentimentAssetRow[];
        rateLimitedUntil?: number;
        overall?: "bullish" | "bearish" | "neutral" | "mixed";
        oneLiner?: string;
      }
    | undefined;
  let listSentiment:
    | {
        sentiment: string;
        confidence: number;
        hasHighRiskEvent: boolean;
        updatedAt?: number;
      }
    | undefined;
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

    const withData = assets.filter(
      (a) => a.confidence > 0 || (a.updatedAt != null && a.updatedAt !== 0),
    );
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
      const positive = withData
        .filter((a) => a.sentiment === "bullish")
        .map((a) => a.asset);
      const negative = withData
        .filter((a) => a.sentiment === "bearish")
        .map((a) => a.asset);
      if (overall === "bullish" && positive.length > 0)
        oneLiner = `${cap} · ${positive.join("/")} positive`;
      else if (overall === "bearish" && negative.length > 0)
        oneLiner = `${cap} · ${negative.join("/")} negative`;
      else if (overall === "mixed")
        oneLiner = `${cap} · ${[...new Set(positive.concat(negative))].join("/")} mixed`;
      else oneLiner = `${cap} · per-asset sentiment below`;
    }

    const updatedAts = assets
      .map((a) => a.updatedAt)
      .filter((t): t is number => t != null && t !== 0);
    const oldestUpdatedAt =
      updatedAts.length > 0 ? Math.min(...updatedAts) : null;
    const newestUpdatedAt =
      updatedAts.length > 0 ? Math.max(...updatedAts) : null;
    xSentiment = {
      assets,
      ...(rateLimitedUntilMs > now && { rateLimitedUntil: rateLimitedUntilMs }),
      ...(withData.length > 0 && { overall, oneLiner }),
      ...(oldestUpdatedAt != null && {
        oldestUpdatedAt,
        newestUpdatedAt: newestUpdatedAt ?? oldestUpdatedAt,
      }),
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
  const xSentimentService = runtime.getService(
    "VINCE_X_SENTIMENT_SERVICE",
  ) as VinceXSentimentService | null;
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

async function buildMoreSection(
  runtime: IAgentRuntime,
): Promise<MoreLeaderboardSection> {
  const coinglass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
    getFearGreed?: () => { value: number; classification: string } | null;
    getAllFunding?: () => { asset: string; rate: number }[];
    getAllLongShortRatios?: () => { asset: string; ratio: number }[];
    getOpenInterest?: (
      asset: string,
    ) => { asset: string; value: number; change24h: number | null } | null;
  } | null;
  const binance = runtime.getService("VINCE_BINANCE_SERVICE") as {
    getFearGreed?: () => Promise<{
      value: number;
      classification: string;
    } | null>;
    getIntelligence?: (asset: string) => Promise<{
      topTraderPositions?: { longShortRatio?: number } | null;
      takerVolume?: { buySellRatio?: number } | null;
      fundingTrend?: { isExtreme?: boolean; extremeDirection?: string } | null;
      crossExchangeFunding?: {
        spread?: number;
        bestLong?: string;
        bestShort?: string;
      } | null;
    }>;
  } | null;
  const deribit = runtime.getService("VINCE_DERIBIT_SERVICE") as {
    getDVOL?: (c: "BTC" | "ETH") => Promise<number | null>;
    getOptionsContext?: (
      c: "BTC" | "ETH",
    ) => Promise<{ ivSurface?: { skewInterpretation?: string } }>;
    getTLDR?: (ctx: unknown) => string;
  } | null;
  const hl = getOrCreateHyperliquidService(runtime);
  const alert = runtime.getService("VINCE_ALERT_SERVICE") as {
    getAlerts?: (opts?: {
      limit?: number;
    }) => { type: string; title: string; message: string; timestamp: number }[];
    getSummary?: () => { total: number; unread: number; highPriority: number };
  } | null;
  const watchlist = runtime.getService("VINCE_WATCHLIST_SERVICE") as {
    getWatchedTokens?: () => {
      symbol: string;
      chain?: string;
      priority?: string;
      entryTarget?: number;
    }[];
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
    getHotMemeTokens?: () => Promise<
      {
        symbol: string;
        chain: string;
        netFlow: number;
        buyVolume: number;
        priceChange24h: number;
      }[]
    >;
    getCreditUsage?: () => { remaining: number };
  } | null;

  const [
    fearGreedData,
    btcDvol,
    ethDvol,
    btcCtx,
    ethCtx,
    crossVenueData,
    oiCapData,
    binanceIntelData,
    coinglassExtData,
    sanbaseBtcData,
    sanbaseEthData,
    nansenData,
    volumeData,
  ] = await Promise.all([
    safe("FearGreed", async () => {
      const cg = coinglass?.getFearGreed?.() ?? null;
      if (cg) return cg;
      const alt = await binance?.getFearGreed?.();
      return alt
        ? {
            value: alt.value,
            classification: alt.classification
              .replace(/\s+/g, "_")
              .toLowerCase(),
          }
        : null;
    }),
    safe(
      "Deribit DVOL BTC",
      () => deribit?.getDVOL?.("BTC") ?? Promise.resolve(null),
    ),
    safe(
      "Deribit DVOL ETH",
      () => deribit?.getDVOL?.("ETH") ?? Promise.resolve(null),
    ),
    safe(
      "Deribit BTC ctx",
      () => deribit?.getOptionsContext?.("BTC") ?? Promise.resolve(null),
    ),
    safe(
      "Deribit ETH ctx",
      () => deribit?.getOptionsContext?.("ETH") ?? Promise.resolve(null),
    ),
    safe(
      "CrossVenue",
      () => hl?.getCrossVenueFunding?.() ?? Promise.resolve(null),
    ),
    safe(
      "OI Cap",
      () => hl?.getPerpsAtOpenInterestCap?.() ?? Promise.resolve(null),
    ),
    safe(
      "Binance Intel",
      () => binance?.getIntelligence?.("BTC") ?? Promise.resolve(null),
    ),
    safe("CoinGlass Extended", () =>
      Promise.resolve({
        funding: (coinglass?.getAllFunding?.() ?? [])
          .slice(0, 10)
          .map((f: { asset: string; rate: number }) => ({
            asset: f.asset,
            rate: f.rate,
          })),
        longShort: (coinglass?.getAllLongShortRatios?.() ?? [])
          .slice(0, 10)
          .map((ls: { asset: string; ratio: number }) => ({
            asset: ls.asset,
            ratio: ls.ratio,
          })),
        openInterest: ["BTC", "ETH", "SOL"]
          .map((a) => coinglass?.getOpenInterest?.(a))
          .filter(Boolean)
          .map(
            (oi: {
              asset: string;
              value: number;
              change24h: number | null;
            }) => ({
              asset: (oi as any).asset,
              value: (oi as any).value,
              change24h: (oi as any).change24h,
            }),
          ),
      }),
    ),
    safe("Sanbase BTC", async () => {
      const ctx = await sanbase?.getOnChainContext?.("BTC");
      if (!ctx) return null;
      return {
        flows: ctx.exchangeFlows?.sentiment ?? "—",
        whales: ctx.whaleActivity?.sentiment ?? "—",
        tldr:
          (sanbase as { getTLDR?: (c: unknown) => string }).getTLDR?.(ctx) ??
          "—",
      };
    }),
    safe("Sanbase ETH", async () => {
      const ctx = await sanbase?.getOnChainContext?.("ETH");
      if (!ctx) return null;
      return {
        flows: ctx.exchangeFlows?.sentiment ?? "—",
        whales: ctx.whaleActivity?.sentiment ?? "—",
        tldr:
          (sanbase as { getTLDR?: (c: unknown) => string }).getTLDR?.(ctx) ??
          "—",
      };
    }),
    safe("Nansen Smart Money", async () => {
      const tokens = (await nansen?.getHotMemeTokens?.()) ?? [];
      const credits = nansen?.getCreditUsage?.();
      return { tokens, creditRemaining: credits?.remaining ?? null };
    }),
    safe("VolumeInsights", async () => {
      const md = runtime.getService("VINCE_MARKET_DATA_SERVICE") as {
        getEnrichedContext?: (
          asset: string,
        ) => Promise<{ volumeRatio?: number; volume24h?: number } | null>;
      } | null;
      if (!md?.getEnrichedContext) return null;
      const volAssets = ["BTC", "ETH", "SOL", "HYPE"];
      const results = await Promise.all(
        volAssets.map(async (asset) => {
          const ctx = await md.getEnrichedContext!(asset).catch(() => null);
          return ctx
            ? {
                asset,
                volumeRatio: ctx.volumeRatio ?? null,
                volume24h: ctx.volume24h ?? null,
              }
            : null;
        }),
      );
      return results.filter(Boolean) as Array<{
        asset: string;
        volumeRatio: number | null;
        volume24h: number | null;
      }>;
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
    btcCtx &&
    deribit &&
    typeof (deribit as { getTLDR?: (ctx: unknown) => string }).getTLDR ===
      "function"
      ? (deribit as { getTLDR: (ctx: unknown) => string }).getTLDR(btcCtx)
      : null;
  const ethTldr =
    ethCtx &&
    deribit &&
    typeof (deribit as { getTLDR?: (ctx: unknown) => string }).getTLDR ===
      "function"
      ? (deribit as { getTLDR: (ctx: unknown) => string }).getTLDR(ethCtx)
      : null;

  const options =
    btcDvol != null || ethDvol != null || btcTldr != null || ethTldr != null
      ? {
          btcDvol: btcDvol ?? null,
          ethDvol: ethDvol ?? null,
          btcTldr: btcTldr ?? null,
          ethTldr: ethTldr ?? null,
        }
      : null;

  const crossVenue =
    crossVenueData != null
      ? {
          assets: crossVenueData.assets
            .slice(0, 10)
            .map(
              (a: {
                coin: string;
                hlFunding?: number;
                cexFunding?: number;
                arbitrageDirection?: string | null;
              }) => ({
                coin: a.coin,
                hlFunding: a.hlFunding,
                cexFunding: a.cexFunding,
                arb: a.arbitrageDirection ?? undefined,
              }),
            ),
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
        topTraderRatio:
          binanceIntelData.topTraderPositions?.longShortRatio ?? null,
        takerBuySellRatio: binanceIntelData.takerVolume?.buySellRatio ?? null,
        fundingExtreme: binanceIntelData.fundingTrend?.isExtreme ?? false,
        fundingDirection:
          binanceIntelData.fundingTrend?.extremeDirection ?? null,
        crossExchangeSpread:
          binanceIntelData.crossExchangeFunding?.spread ?? null,
        bestLong: binanceIntelData.crossExchangeFunding?.bestLong ?? null,
        bestShort: binanceIntelData.crossExchangeFunding?.bestShort ?? null,
      }
    : null;

  const coinglassExtended = coinglassExtData
    ? {
        funding: coinglassExtData.funding ?? [],
        longShort: coinglassExtData.longShort ?? [],
        openInterest: (coinglassExtData.openInterest ?? []).filter(
          (oi: { asset?: string; value?: number; change24h?: number | null }) =>
            oi && oi.asset,
        ),
      }
    : null;

  const deribitSkew =
    (btcCtx as { ivSurface?: { skewInterpretation?: string } } | null)
      ?.ivSurface?.skewInterpretation ||
    (ethCtx as { ivSurface?: { skewInterpretation?: string } } | null)
      ?.ivSurface?.skewInterpretation
      ? {
          btc:
            (btcCtx as { ivSurface?: { skewInterpretation?: string } } | null)
              ?.ivSurface?.skewInterpretation != null
              ? {
                  skewInterpretation: (btcCtx as any).ivSurface
                    .skewInterpretation,
                }
              : null,
          eth:
            (ethCtx as { ivSurface?: { skewInterpretation?: string } } | null)
              ?.ivSurface?.skewInterpretation != null
              ? {
                  skewInterpretation: (ethCtx as any).ivSurface
                    .skewInterpretation,
                }
              : null,
        }
      : null;

  const sanbaseOnChain =
    sanbaseBtcData || sanbaseEthData
      ? { btc: sanbaseBtcData ?? null, eth: sanbaseEthData ?? null }
      : null;

  const nansenSmartMoney = nansenData
    ? {
        tokens: (nansenData.tokens ?? [])
          .slice(0, 10)
          .map(
            (t: {
              symbol: string;
              chain: string;
              netFlow: number;
              buyVolume: number;
              priceChange24h: number;
            }) => ({
              symbol: t.symbol,
              chain: t.chain,
              netFlow: t.netFlow,
              buyVolume: t.buyVolume,
              priceChange24h: t.priceChange24h,
            }),
          ),
        creditRemaining: nansenData.creditRemaining,
      }
    : null;

  const volumeInsights =
    Array.isArray(volumeData) && volumeData.length > 0
      ? {
          assets: volumeData.map(
            (v: {
              asset: string;
              volumeRatio: number | null;
              volume24h: number | null;
            }) => {
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
            },
          ),
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
  options?: { discoveryUniverse?: DiscoveryUniverseSelector },
): Promise<LeaderboardsResponse> {
  const now = Date.now();
  const discoveryUniverse = options?.discoveryUniverse ?? "sleeve";

  // Markets first (hip3 + hlCrypto) — keep this isolated so Markets tab is reliable.
  const [hip3, hlCrypto] = await Promise.all([
    buildHIP3Section(runtime),
    buildHLCryptoSection(runtime),
  ]);

  // News (MandoMinutes) built separately so a failure here never breaks Markets.
  const news = await safe("News", () => buildNewsSection(runtime));

  // Forge Ops: deterministic replay gates/metrics from signal cache (no API calls).
  const forgeOps = await safe("ForgeOps", () =>
    Promise.resolve(buildForgeOpsSection()),
  );

  // Other sections left null so Markets stays stable (can be re-enabled per-section later).
  const memes = null as MemesLeaderboardSection | null;
  const memesBase = null as MemesLeaderboardSection | null;
  const meteora = null as MeteoraLeaderboardSection | null;
  const digitalArt = null as DigitalArtLeaderboardSection | null;
  const more = null as MoreLeaderboardSection | null;
  const dexter = loadDexterPortfolios();
  const chartTickers = {
    hyperliquid: [...new Set(dexter.hyperliquid.map((s) => s.toUpperCase()))],
    watchlist: [...new Set(dexter.watchlist.map((s) => s.toUpperCase()))],
    tastytrade: [...new Set(dexter.tastytrade.map((s) => s.toUpperCase()))],
  };
  const fdCache = getFdCacheFreshness();
  const projectRoot = process.cwd();
  let fdDiscovery: FdDiscoverySection | null = null;
  let fdDiscoveryError: string | null = null;
  try {
    fdDiscovery = buildFdDiscoverySection(projectRoot, discoveryUniverse);
  } catch (e) {
    fdDiscoveryError = e instanceof Error ? e.message : String(e);
    logger.debug(`[Leaderboards] FdDiscovery: ${fdDiscoveryError}`);
  }
  const tracker = runtime.getService(
    "VINCE_PREDICTION_TRACKER_SERVICE",
  ) as PredictionTrackerService | null;
  if (fdDiscovery) {
    try {
      if (tracker?.getCalibrationSnapshot) {
        fdDiscovery = {
          ...fdDiscovery,
          calibration: tracker.getCalibrationSnapshot(30),
        };
      }
      const diagnostics = buildFdDiscoveryDiagnostics(projectRoot, tracker);
      fdDiscovery = { ...fdDiscovery, ...diagnostics };
      const discoverySvc = runtime.getService(
        "VINCE_TICKER_DISCOVERY_SERVICE",
      ) as VinceTickerDiscoveryService | null;
      if (discoverySvc?.getPromotionVerdicts && fdDiscovery.bucketMetrics) {
        try {
          const result = discoverySvc.getRankedCandidates(projectRoot, {
            universe: discoveryUniverse,
          });
          const verdicts = discoverySvc.getPromotionVerdicts(
            result,
            projectRoot,
            {
              bucketMetrics: fdDiscovery.bucketMetrics,
            },
          );
          fdDiscovery = {
            ...fdDiscovery,
            promotionVerdicts: verdicts.map((v) => ({
              ticker: v.ticker,
              bucket: v.bucket,
              score: v.score,
              eligibleForPromotion: v.eligibleForPromotion,
              requiresHumanReview: v.requiresHumanReview,
              blockedByPolicy: v.blockedByPolicy,
            })),
          };
        } catch {
          // leave promotionVerdicts undefined on error
        }
      }
    } catch {
      // leave calibration/diagnostics undefined on error
    }
  }

  // Derive simple status flags for UI hints.
  let hip3Status: SectionStatus = "loading";
  const hip3Service = runtime.getService(
    "VINCE_HIP3_SERVICE",
  ) as VinceHIP3Service | null;
  if (hip3Service?.getStatus) {
    const s = hip3Service.getStatus();
    if (!s.available) hip3Status = "loading";
    else if (now - s.lastUpdate > 5 * 60_000) hip3Status = "stale";
    else hip3Status = "ok";
  } else if (hip3) {
    hip3Status = "ok";
  }

  let hlCryptoStatus: SectionStatus = "loading";
  const hlSnapshot = runtime.getService(
    "VINCE_HLCRYPTO_SNAPSHOT_SERVICE",
  ) as VinceHLCryptoSnapshotService | null;
  if (hlSnapshot?.getStatus) {
    const s = hlSnapshot.getStatus();
    if (!s.available) hlCryptoStatus = "loading";
    else if (now - s.lastUpdate > 5 * 60_000) hlCryptoStatus = "stale";
    else hlCryptoStatus = "ok";
  } else if (hlCrypto) {
    hlCryptoStatus = "ok";
  }

  let forgeOpsStatus: SectionStatus = "loading";
  if (forgeOps) forgeOpsStatus = "ok";
  else if (news ?? hip3 ?? hlCrypto) forgeOpsStatus = "stale";

  const fdDiscoveryStatus = buildFdDiscoveryStatus(
    projectRoot,
    fdDiscovery,
    discoveryUniverse,
    fdDiscoveryError,
  );

  return {
    updatedAt: now,
    hip3,
    hlCrypto,
    memes,
    memesBase,
    meteora,
    news,
    digitalArt,
    more,
    chartTickers,
    fdCache,
    fdDiscovery: fdDiscovery ?? null,
    fdDiscoveryStatus,
    hip3Status,
    hlCryptoStatus,
    forgeOps: forgeOps ?? null,
    forgeOpsStatus,
  };
}
