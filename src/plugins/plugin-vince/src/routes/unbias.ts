import { logger, type IAgentRuntime } from "@elizaos/core";

const UNBIAS_BASE_URL = "https://unbias.fyi/api/v1";
const UNBIAS_API_KEY = process.env.UNBIAS_API_KEY;

/**
 * Cache keys + TTLs chosen to stay well under the 100 req/day free tier:
 *
 * - Consensus summary (BTC + ETH): refresh at most every 45 minutes
 *   → 24h / 0.75h = 32 refreshes × 2 assets = ~64 calls/day
 * - Analyst details: per-asset/day combination cached for 6h
 *   → even with a few manual refreshes, we stay below 100/day.
 */
const SUMMARY_CACHE_KEY = "vince:unbias:summary:v1";
const SUMMARY_TTL_MS = 45 * 60 * 1000; // 45 minutes

const ANALYSTS_CACHE_PREFIX = "vince:unbias:analysts:v1";
const ANALYSTS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

type UnbiasPlan = "free" | "pro" | string;

export interface UnbiasAssetSummary {
  asset: "BTC" | "ETH";
  consensusIndex: number;
  consensusIndex30dMA: number | null;
  zScore: number | null;
  avgSentimentScore: number | null;
  bullishAnalysts: number;
  bearishAnalysts: number;
  totalAnalysts: number;
  bullishOpinions: number;
  bearishOpinions: number;
  totalOpinions: number;
  lastUpdated: string;
  sourcePlan: UnbiasPlan;
}

export interface UnbiasSummaryMeta {
  dailyLimit: number | null;
  dailyUsed: number | null;
  rateLimitLimit: number | null;
  rateLimitRemaining: number | null;
  rateLimitWindow: "minute" | "unknown";
  lastRefreshedAt: string;
}

export interface UnbiasSummaryResponse {
  assets: UnbiasAssetSummary[];
  meta: UnbiasSummaryMeta;
}

export interface UnbiasAnalystItem {
  handle: string;
  name: string | null;
  avgSentimentScore: number;
  label: "bullish" | "bearish" | "neutral";
  contentCount: number;
  lastSeen: string;
}

export interface UnbiasAnalystsResponse {
  asset: "BTC" | "ETH";
  period: {
    start: string;
    end: string;
  };
  count: number;
  analysts: UnbiasAnalystItem[];
}

interface UnbiasSummaryCache {
  data: UnbiasSummaryResponse;
  fetchedAt: number;
}

interface UnbiasAnalystsCache {
  data: UnbiasAnalystsResponse;
  fetchedAt: number;
}

function ensureApiKey(): string {
  if (!UNBIAS_API_KEY) {
    throw new Error(
      "UNBIAS_API_KEY is not set. Add it to your .env to enable the Unbias leaderboard tab.",
    );
  }
  return UNBIAS_API_KEY;
}

async function unbiasFetch(
  path: string,
  params?: URLSearchParams,
): Promise<{ json: any; headers: Headers }> {
  const apiKey = ensureApiKey();
  const url =
    UNBIAS_BASE_URL + path + (params ? `?${params.toString()}` : "");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
    },
    // Keep a conservative timeout; we have our own caching on top.
    signal: (AbortSignal as any).timeout
      ? (AbortSignal as any).timeout(8000)
      : undefined,
  });

  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    const base = `Unbias API error ${res.status}`;
    const detail =
      body && typeof body === "object"
        ? body.error ?? body.message ?? JSON.stringify(body)
        : "";
    throw new Error(detail ? `${base}: ${detail}` : base);
  }

  const json = await res.json();
  return { json, headers: res.headers };
}

function parseIntHeader(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

async function fetchConsensusForAsset(
  asset: "BTC" | "ETH",
): Promise<UnbiasAssetSummary> {
  const params = new URLSearchParams({ asset });
  const { json, headers } = await unbiasFetch("/consensus", params);

  return {
    asset,
    consensusIndex: Number(json.consensus_index ?? 0),
    consensusIndex30dMA:
      json.consensus_index_30d_ma != null
        ? Number(json.consensus_index_30d_ma)
        : null,
    zScore: json.z_score != null ? Number(json.z_score) : null,
    avgSentimentScore:
      json.avg_sentiment_score != null
        ? Number(json.avg_sentiment_score)
        : null,
    bullishAnalysts: Number(json.bullish_analysts ?? 0),
    bearishAnalysts: Number(json.bearish_analysts ?? 0),
    totalAnalysts: Number(json.total_analysts ?? 0),
    bullishOpinions: Number(json.bullish_opinions ?? 0),
    bearishOpinions: Number(json.bearish_opinions ?? 0),
    totalOpinions: Number(json.total_opinions ?? 0),
    lastUpdated: String(json.date ?? new Date().toISOString().slice(0, 10)),
    sourcePlan: String(json.plan ?? "free") as UnbiasPlan,
  };
}

/**
 * Build (or return cached) Unbias summary for BTC + ETH.
 */
export async function buildUnbiasSummaryResponse(
  runtime: IAgentRuntime,
): Promise<UnbiasSummaryResponse> {
  const now = Date.now();

  // Try cache first
  const cached = await runtime.getCache<UnbiasSummaryCache>(SUMMARY_CACHE_KEY);
  if (cached && now - cached.fetchedAt < SUMMARY_TTL_MS) {
    return cached.data;
  }

  try {
    // Fetch BTC then ETH; rate-limit headers can come from either.
    const btc = await fetchConsensusForAsset("BTC");
    const { headers: ethHeaders, json: ethJson } = await (async () => {
      const params = new URLSearchParams({ asset: "ETH" });
      const { json, headers } = await unbiasFetch("/consensus", params);
      return { json, headers };
    })();

    const eth: UnbiasAssetSummary = {
      asset: "ETH",
      consensusIndex: Number(ethJson.consensus_index ?? 0),
      consensusIndex30dMA:
        ethJson.consensus_index_30d_ma != null
          ? Number(ethJson.consensus_index_30d_ma)
          : null,
      zScore: ethJson.z_score != null ? Number(ethJson.z_score) : null,
      avgSentimentScore:
        ethJson.avg_sentiment_score != null
          ? Number(ethJson.avg_sentiment_score)
          : null,
      bullishAnalysts: Number(ethJson.bullish_analysts ?? 0),
      bearishAnalysts: Number(ethJson.bearish_analysts ?? 0),
      totalAnalysts: Number(ethJson.total_analysts ?? 0),
      bullishOpinions: Number(ethJson.bullish_opinions ?? 0),
      bearishOpinions: Number(ethJson.bearish_opinions ?? 0),
      totalOpinions: Number(ethJson.total_opinions ?? 0),
      lastUpdated: String(
        ethJson.date ?? new Date().toISOString().slice(0, 10),
      ),
      sourcePlan: String(ethJson.plan ?? "free") as UnbiasPlan,
    };

    const dailyLimit = parseIntHeader(ethHeaders, "X-Daily-Limit");
    const dailyUsed = parseIntHeader(ethHeaders, "X-Daily-Used");
    const rateLimitLimit = parseIntHeader(ethHeaders, "X-RateLimit-Limit");
    const rateLimitRemaining = parseIntHeader(
      ethHeaders,
      "X-RateLimit-Remaining",
    );

    const data: UnbiasSummaryResponse = {
      assets: [btc, eth],
      meta: {
        dailyLimit,
        dailyUsed,
        rateLimitLimit,
        rateLimitRemaining,
        rateLimitWindow: "minute",
        lastRefreshedAt: new Date(now).toISOString(),
      },
    };

    await runtime.setCache<UnbiasSummaryCache>(SUMMARY_CACHE_KEY, {
      data,
      fetchedAt: now,
    });

    return data;
  } catch (err) {
    logger.warn(`[VINCE] Unbias summary fetch failed: ${String(err)}`);

    // If we have stale cache, return it instead of hard failing.
    const stale = await runtime.getCache<UnbiasSummaryCache>(SUMMARY_CACHE_KEY);
    if (stale) {
      return stale.data;
    }

    throw err;
  }
}

/**
 * Build (or return cached) analyst-level sentiment summary for a given asset.
 */
export async function buildUnbiasAnalystsResponse(
  runtime: IAgentRuntime,
  asset: "BTC" | "ETH",
  days: number,
): Promise<UnbiasAnalystsResponse> {
  const clampedDays = Math.max(1, Math.min(30, Math.floor(days || 7)));
  const cacheKey = `${ANALYSTS_CACHE_PREFIX}:${asset}:${clampedDays}`;
  const now = Date.now();

  const cached = await runtime.getCache<UnbiasAnalystsCache>(cacheKey);
  if (cached && now - cached.fetchedAt < ANALYSTS_TTL_MS) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({
      asset,
      days: String(clampedDays),
    });
    const { json } = await unbiasFetch("/sentiment", params);

    const items = Array.isArray(json.data) ? json.data : [];

    type Agg = {
      handle: string;
      name: string | null;
      sum: number;
      count: number;
      contentCount: number;
      lastSeen: string;
    };

    const byHandle = new Map<string, Agg>();

    for (const row of items) {
      const handle: string = row.analyst ?? row.handle ?? "unknown";
      const name: string | null =
        row.analyst_name != null ? String(row.analyst_name) : null;
      const score: number = Number(row.sentiment_score ?? 0);
      const date: string = String(row.date ?? json.period?.end ?? "");
      const cnt: number = Number(row.content_count ?? 0);

      const prev = byHandle.get(handle) ?? {
        handle,
        name,
        sum: 0,
        count: 0,
        contentCount: 0,
        lastSeen: date,
      };
      prev.sum += score;
      prev.count += 1;
      prev.contentCount += cnt;
      if (!prev.lastSeen || date > prev.lastSeen) {
        prev.lastSeen = date;
      }
      byHandle.set(handle, prev);
    }

    const analysts: UnbiasAnalystItem[] = [];
    for (const agg of byHandle.values()) {
      const avg = agg.count > 0 ? agg.sum / agg.count : 0;
      let label: "bullish" | "bearish" | "neutral" = "neutral";
      if (avg >= 0.6) label = "bullish";
      else if (avg <= 0.4) label = "bearish";

      analysts.push({
        handle: agg.handle,
        name: agg.name,
        avgSentimentScore: avg,
        label,
        contentCount: agg.contentCount,
        lastSeen: agg.lastSeen,
      });
    }

    // Sort by activity then recency
    analysts.sort((a, b) => {
      if (b.contentCount !== a.contentCount) {
        return b.contentCount - a.contentCount;
      }
      return a.lastSeen < b.lastSeen ? 1 : -1;
    });

    const data: UnbiasAnalystsResponse = {
      asset,
      period: {
        start: String(json.period?.start ?? ""),
        end: String(json.period?.end ?? ""),
      },
      count: analysts.length,
      analysts,
    };

    await runtime.setCache<UnbiasAnalystsCache>(cacheKey, {
      data,
      fetchedAt: now,
    });

    return data;
  } catch (err) {
    logger.warn(
      `[VINCE] Unbias analysts fetch failed for ${asset}: ${String(err)}`,
    );

    const stale = await runtime.getCache<UnbiasAnalystsCache>(cacheKey);
    if (stale) {
      return stale.data;
    }

    throw err;
  }
}

