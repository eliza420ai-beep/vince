import { logger, type IAgentRuntime } from "@elizaos/core";
import { YesNoMarketService } from "../services/yesNoMarketService";

export type YesNoMode = "swing" | "day";
export type YesNoDecision = "YES" | "CAUTION" | "NO";

export type YesNoCategoryKey =
  | "volatility"
  | "momentum"
  | "trend"
  | "breadth"
  | "macro";

export type YesNoCategoryWeights = Record<YesNoCategoryKey, number>;
export type YesNoCategoryScores = Record<YesNoCategoryKey, number>;

export interface YesNoExecutionWindowPayload {
  score: number;
  breakoutsHolding?: boolean | null;
  leadingFollowThrough?: boolean | null;
  pullbacksBought?: boolean | null;
}

export interface YesNoResponse {
  updatedAt: number;
  mode: YesNoMode;
  decision: YesNoDecision;
  marketQualityScore: number;
  executionWindowScore: number;
  summary: string;
  terminalAnalysis?: string;
  regime?: "uptrend" | "downtrend" | "chop";
  categoryWeights: YesNoCategoryWeights;
  categoryScores: YesNoCategoryScores;
  executionWindow?: YesNoExecutionWindowPayload;
  volatility?: {
    vixLevel?: number | null;
    vixPercentile1y?: number | null;
    vixSlope5d?: number | null;
  };
  trend?: {
    spyPrice?: number | null;
    spyMa20?: number | null;
    spyMa50?: number | null;
    spyMa200?: number | null;
    qqqMa50?: number | null;
    spyRsi14?: number | null;
  };
  breadth?: {
    proxyUsed?: boolean;
    scoreNote?: string | null;
  };
  momentum?: {
    leaders?: Array<{
      symbol: string;
      name?: string;
      relStrengthScore?: number;
    }>;
    laggards?: Array<{
      symbol: string;
      name?: string;
      relStrengthScore?: number;
    }>;
    topBottomSpread?: number | null;
  };
  macro?: {
    tnx10y?: number | null;
    dxy?: number | null;
    fedStance?: "hawkish" | "neutral" | "dovish" | null;
  };
  sectorHeatmap?: {
    sectors: Array<{
      symbol: string;
      name?: string;
      valueText?: string;
      relStrengthScore?: number;
    }>;
  };
  alert?: {
    title: string;
    message: string;
    etaSeconds?: number | null;
  } | null;
  tickers?: Array<{ label: string; valueText?: string }>;
  directions?: Partial<
    Record<
      "volatility" | "trend" | "breadth" | "momentum" | "macro",
      "up" | "down" | "flat"
    >
  >;
}

interface YesNoCachePayload {
  data: YesNoResponse;
  fetchedAt: number;
}

const CACHE_TTL_MS = 30_000;
const CACHE_PREFIX = "vince:yesno:v1";

function parseMode(raw: unknown): YesNoMode {
  const s = String(raw ?? "").toLowerCase();
  return s === "day" ? "day" : "swing";
}

export async function buildYesNoResponse(
  runtime: IAgentRuntime,
  opts: { mode?: unknown } = {},
): Promise<YesNoResponse> {
  const mode = parseMode(opts.mode);
  const cacheKey = `${CACHE_PREFIX}:${mode}`;
  const now = Date.now();

  try {
    const cached = await runtime.getCache<YesNoCachePayload>(cacheKey);
    if (
      cached?.data &&
      typeof cached.fetchedAt === "number" &&
      now - cached.fetchedAt < CACHE_TTL_MS
    ) {
      return cached.data;
    }

    const svc = new YesNoMarketService(runtime);
    const payload = await svc.getYesNoDecision({ mode });
    const toCache: YesNoCachePayload = { data: payload, fetchedAt: now };
    await runtime.setCache(cacheKey, toCache);
    return payload;
  } catch (err) {
    logger.warn(`[VINCE] YES/NO route compute error: ${err}`);
    // If cache exists, return stale payload rather than failing the UI.
    const cached = await runtime.getCache<YesNoCachePayload>(cacheKey);
    if (cached?.data) return cached.data;

    // Last resort: safe decision gate.
    return {
      updatedAt: now,
      mode,
      decision: "NO",
      marketQualityScore: 0,
      executionWindowScore: 0,
      summary: "Market data unavailable; preserving capital.",
      terminalAnalysis:
        "No reliable market signals were fetched. Decision is set to NO to avoid trading without confirmation.",
      categoryWeights: {
        volatility: 25,
        momentum: 25,
        trend: 20,
        breadth: 20,
        macro: 10,
      },
      categoryScores: {
        volatility: 0,
        momentum: 0,
        trend: 0,
        breadth: 0,
        macro: 0,
      },
      alert: null,
      sectorHeatmap: { sectors: [] },
      directions: {},
    };
  }
}
