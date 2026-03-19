import { logger, type IAgentRuntime } from "@elizaos/core";
import YahooFinance from "yahoo-finance2";
import {
  computeExecutionWindowScore,
  computeRSI,
  computeSlope5d,
  computeWeightedMarketQualityScore,
  classifyTrendRegime,
  marketQualityDecision,
  movingAverageSMA,
  percentileRank,
  scoreBreadthProxy,
  scoreMacroFromTrends,
  scoreMomentumFromSpread,
  scoreTrend,
  scoreVolatility,
  type TrendRegime,
  type YesNoDecision,
  type YesNoMode,
} from "../utils/stockIndicators";
import type {
  YesNoCategoryKey,
  YesNoResponse,
  YesNoCategoryWeights,
  YesNoCategoryScores,
} from "../routes/dashboardYesNo";

const SECTOR_ETFS: Array<{ symbol: string; name?: string }> = [
  { symbol: "XLK", name: "Technology" },
  { symbol: "XLF", name: "Financials" },
  { symbol: "XLE", name: "Energy" },
  { symbol: "XLV", name: "Healthcare" },
  { symbol: "XLI", name: "Industrials" },
  { symbol: "XLY", name: "Consumer Discretionary" },
  { symbol: "XLP", name: "Consumer Staples" },
  { symbol: "XLU", name: "Utilities" },
  { symbol: "XLB", name: "Materials" },
  { symbol: "XLRE", name: "Real Estate" },
  { symbol: "XLC", name: "Communication Services" },
];

const QUALITY_WEIGHTS: YesNoCategoryWeights = {
  volatility: 25,
  momentum: 25,
  trend: 20,
  breadth: 20,
  macro: 10,
};

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function toDecimalReturn(pct: number): number {
  // Helper for readability; returns should be decimal fractions already.
  return pct;
}

type YahooFinanceInstance = InstanceType<typeof YahooFinance>;

function buildTerminalAnalysis(payload: {
  decision: YesNoDecision;
  marketQualityScore: number;
  executionWindowScore: number;
  regime?: TrendRegime;
  summaryParts?: string[];
}): string {
  const { decision, marketQualityScore, executionWindowScore, regime } =
    payload;

  const regimeStr = regime ? ` Regime is ${regime}.` : "";

  if (decision === "YES") {
    return `Market quality is ${marketQualityScore.toFixed(
      0,
    )}%, and the execution window is ${executionWindowScore.toFixed(
      0,
    )}%.${regimeStr} Volatility is contained and momentum is supporting selective swing trades. Keep risk tight and demand confirmation on breakouts.`;
  }
  if (decision === "CAUTION") {
    return `Market quality is ${marketQualityScore.toFixed(
      0,
    )}%, with execution at ${executionWindowScore.toFixed(0)}%.${regimeStr} The setup looks mixed: some areas are working, but participation or volatility may be unstable. Trade smaller, wait for follow-through, and protect capital first.`;
  }
  return `Market quality is ${marketQualityScore.toFixed(
    0,
  )}%, with an execution window of ${executionWindowScore.toFixed(
    0,
  )}%.${regimeStr} Conditions do not justify new swing risk. Preserve capital and wait for breadth and trend alignment.`;
}

async function fetchHistoricalCloses(
  yahoo: YahooFinanceInstance,
  ticker: string,
  lookbackDays: number,
  interval: "1d" | "1wk" = "1d",
): Promise<number[] | null> {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = Math.floor((Date.now() - lookbackDays * 86400000) / 1000);
  try {
    const chart = await yahoo.chart(ticker, {
      period1,
      period2,
      interval,
    } as any);
    const quotes = Array.isArray((chart as any)?.quotes)
      ? ((chart as any).quotes as any[])
      : [];
    const closes = quotes
      .map((r: any) => {
        const c =
          typeof r?.adjclose === "number"
            ? r.adjclose
            : typeof r?.adjClose === "number"
              ? r.adjClose
              : typeof r?.close === "number"
                ? r.close
                : null;
        return c;
      })
      .filter((x: unknown): x is number => typeof x === "number");
    if (!closes.length) return null;
    return closes;
  } catch (e) {
    logger.debug(
      `[VINCE][YESNO] chart fetch failed for ${ticker}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return null;
  }
}

async function fetchQuotePrice(
  yahoo: YahooFinanceInstance,
  ticker: string,
): Promise<number | null> {
  try {
    const q = await yahoo.quote(ticker);
    const price = (q as any)?.regularMarketPrice;
    if (typeof price === "number") return price;
    // Some symbols may use other fields; fall back.
    const alt =
      typeof (q as any)?.lastPrice === "number"
        ? (q as any).lastPrice
        : typeof (q as any)?.bid === "number"
          ? (q as any).bid
          : null;
    return alt;
  } catch (e) {
    logger.debug(
      `[VINCE][YESNO] quote fetch failed for ${ticker}: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return null;
  }
}

function computeRelStrengthScores(
  returnsBySymbol: Array<{ symbol: string; ret: number | null }>,
): Array<{ symbol: string; relStrengthScore: number | null }> {
  const clean = returnsBySymbol
    .filter((x) => x.ret != null)
    .map((x) => ({ symbol: x.symbol, ret: x.ret as number }));

  if (clean.length < 3) {
    return returnsBySymbol.map((x) => ({
      symbol: x.symbol,
      relStrengthScore: x.ret == null ? null : 50,
    }));
  }

  const sorted = [...clean].sort((a, b) => (a.ret ?? 0) - (b.ret ?? 0));
  const n = sorted.length;
  return returnsBySymbol.map((x) => {
    const found = clean.find((c) => c.symbol === x.symbol);
    if (!found || found.ret == null)
      return { symbol: x.symbol, relStrengthScore: null };
    const idx = sorted.findIndex((s) => s.symbol === x.symbol);
    const pct = idx <= 0 ? 0 : (idx / Math.max(1, n - 1)) * 100;
    return { symbol: x.symbol, relStrengthScore: clampPercent(pct) };
  });
}

function computeReturnFromCloses(
  closes: number[],
  lookbackDays: number,
): number | null {
  if (!closes.length) return null;
  const n = closes.length;
  const startIdx = Math.max(0, n - lookbackDays);
  if (n - startIdx < 2) return null;
  const start = closes[startIdx];
  const end = closes[n - 1];
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0)
    return null;
  return toDecimalReturn(end / start - 1);
}

function maxOf(arr: number[]): number {
  return arr.reduce((m, v) => (v > m ? v : m), -Infinity);
}

function minOf(arr: number[]): number {
  return arr.reduce((m, v) => (v < m ? v : m), Infinity);
}

function computePivotHigh(
  closes: number[],
  pivotLookbackDays: number,
  excludeLastDays: number,
): number | null {
  if (!closes.length) return null;
  const n = closes.length;
  const end = n - excludeLastDays;
  if (end <= 0) return null;
  const start = Math.max(0, end - pivotLookbackDays);
  if (end - start < 2) return null;
  return maxOf(closes.slice(start, end));
}

function computeBreakoutHolding(
  closes: number[],
  pivotLookbackDays: number,
  excludeLastDays: number,
  holdCheckDays: number,
): boolean {
  if (!closes?.length) return false;
  const pivot = computePivotHigh(closes, pivotLookbackDays, excludeLastDays);
  if (pivot == null) return false;
  const current = closes[closes.length - 1];
  if (!Number.isFinite(current) || current <= pivot) return false;
  const last = closes.slice(-Math.max(1, holdCheckDays));
  return last.every((x) => Number.isFinite(x) && x > pivot);
}

function computePullbackBought(
  closes: number[],
  drawdownThreshold: number,
  recoveryThreshold: number,
): boolean {
  if (!closes?.length || closes.length < 8) return false;
  const window = closes.slice(-8);
  const maxC = maxOf(window);
  const minC = minOf(window);
  if (!Number.isFinite(maxC) || maxC <= 0) return false;

  const drawdown = (maxC - minC) / maxC;
  if (drawdown < drawdownThreshold) return false;

  const last = window[window.length - 1];
  if (!Number.isFinite(last)) return false;
  // "Bought" means the last close has reclaimed a meaningful portion.
  return last >= minC * (1 + recoveryThreshold);
}

function buildSummaryAndDecisionExplanation(params: {
  mode: YesNoMode;
  decision: YesNoDecision;
  marketQualityScore: number;
  executionWindowScore: number;
  regime?: TrendRegime;
}): string {
  const { decision, marketQualityScore, executionWindowScore, regime } = params;
  const regimeStr = regime ? ` Regime is ${regime}.` : "";
  if (decision === "YES") {
    return `Risk gate: YES. Market quality is ${marketQualityScore.toFixed(
      0,
    )}% with an execution window at ${executionWindowScore.toFixed(0)}%.${regimeStr} Volatility is manageable and trend/breadth are aligned.`;
  }
  if (decision === "CAUTION") {
    return `Risk gate: CAUTION. Market quality is ${marketQualityScore.toFixed(
      0,
    )}%, execution at ${executionWindowScore.toFixed(0)}%.${regimeStr} Conditions are workable but uneven—wait for confirmation and size smaller.`;
  }
  return `Risk gate: NO. Market quality is ${marketQualityScore.toFixed(
    0,
  )}%, execution at ${executionWindowScore.toFixed(0)}%.${regimeStr} Expect chop or risk-off behavior—preserve capital.`;
}

function buildDataQualitySummary(params: {
  decision: YesNoDecision;
  marketQualityScore: number;
  executionWindowScore: number;
  missingInputs: string[];
  sectorCoverageCount: number;
  sectorCoverageRequired: number;
  regime?: TrendRegime;
}): string {
  const {
    decision,
    marketQualityScore,
    executionWindowScore,
    missingInputs,
    sectorCoverageCount,
    sectorCoverageRequired,
    regime,
  } = params;

  const regimeStr = regime ? ` Regime is ${regime}.` : "";
  const missingStr =
    missingInputs.length > 0 ? missingInputs.slice(0, 6).join(", ") : "unknown";

  return `Risk gate: ${decision}. Data quality failed: missing/insufficient inputs: ${missingStr}. Market quality computed as ${marketQualityScore.toFixed(
    0,
  )}% and execution computed as ${executionWindowScore.toFixed(
    0,
  )}% but the permission is blocked. Sector coverage ${sectorCoverageCount}/${sectorCoverageRequired}.${regimeStr}`;
}

export class YesNoMarketService {
  constructor(private runtime: IAgentRuntime) {}

  async getYesNoDecision(params: { mode: YesNoMode }): Promise<YesNoResponse> {
    const mode = params.mode;
    const yahoo = new YahooFinance();
    const updatedAt = Date.now();
    const alertNow = updatedAt;
    const sectorCoverageRequired = 9; // 9 of 11 sectors must have returns computed
    const minSpyLen = 200;
    const minQqqLen = 200;
    const minVixHistoryLen = 50;
    const minMacroHistoryLen = 10;

    const vixTicker = "^VIX";
    const spyTicker = "SPY";
    const qqqTicker = "QQQ";
    const dxyTicker = "DX-Y.NYB";
    const tnxTicker = "^TNX";

    const sectorLookbackDays = mode === "day" ? 20 : 40;
    // Calendar days need extra buffer to reliably produce 200+ daily bars.
    const trendLookbackCalendarDays = 320;

    const [
      vixQuote,
      vixHistory,
      spyHistory,
      qqqHistory,
      dxyHistory,
      tnxHistory,
      sectorHistories,
    ] = await Promise.all([
      fetchQuotePrice(yahoo, vixTicker),
      fetchHistoricalCloses(yahoo, vixTicker, 365),
      fetchHistoricalCloses(yahoo, spyTicker, trendLookbackCalendarDays),
      fetchHistoricalCloses(yahoo, qqqTicker, trendLookbackCalendarDays),
      fetchHistoricalCloses(yahoo, dxyTicker, 120),
      fetchHistoricalCloses(yahoo, tnxTicker, 120),
      Promise.all(
        SECTOR_ETFS.map(async (s) => {
          const closes = await fetchHistoricalCloses(yahoo, s.symbol, 120);
          return { symbol: s.symbol, closes };
        }),
      ),
    ]);

    const sectorHistoryMissing = sectorHistories
      .filter((h) => !h.closes || h.closes.length === 0)
      .map((h) => h.symbol);

    const missingInputs: string[] = [];
    if (vixQuote == null) missingInputs.push("vix_quote");
    if (!vixHistory || vixHistory.length < minVixHistoryLen)
      missingInputs.push("vix_history");
    if (!spyHistory || spyHistory.length < minSpyLen)
      missingInputs.push("spy_history");
    if (!qqqHistory || qqqHistory.length < minQqqLen)
      missingInputs.push("qqq_history");
    if (!dxyHistory || dxyHistory.length < minMacroHistoryLen)
      missingInputs.push("dxy_history");
    if (!tnxHistory || tnxHistory.length < minMacroHistoryLen)
      missingInputs.push("tnx_history");

    const vixLevel = vixQuote;
    const vixPercentile1y =
      vixLevel != null && vixHistory
        ? percentileRank(vixLevel, vixHistory)
        : null;
    const vixSlope5d = vixHistory ? computeSlope5d(vixHistory) : null;

    const vixScore = scoreVolatility({
      vixPercentile1y,
      vixSlope5d,
    });

    const spyCloses = spyHistory;
    const qqqCloses = qqqHistory;

    const spyPrice = spyCloses ? spyCloses[spyCloses.length - 1] : null;

    const spyMa20 = spyCloses ? movingAverageSMA(spyCloses, 20) : null;
    const spyMa50 = spyCloses ? movingAverageSMA(spyCloses, 50) : null;
    const spyMa200 = spyCloses ? movingAverageSMA(spyCloses, 200) : null;
    const spyRsi14 = spyCloses ? computeRSI(spyCloses, 14) : null;

    const regime = classifyTrendRegime({
      price: spyPrice,
      sma20: spyMa20,
      sma50: spyMa50,
      sma200: spyMa200,
    });

    const trendScore = scoreTrend({ regime, rsi14: spyRsi14 });

    // Sector momentum + breadth proxy.
    const breadthLookbackDays = mode === "day" ? 10 : 20;
    const sectorReturns = await (async () => {
      const lookback = breadthLookbackDays;
      return sectorHistories.map((h) => {
        if (!h.closes) return { symbol: h.symbol, ret: null as number | null };
        const ret = computeReturnFromCloses(h.closes, lookback);
        return { symbol: h.symbol, ret };
      });
    })();

    const returnsClean = sectorReturns.map((r) => ({
      symbol: r.symbol,
      ret: r.ret,
    }));

    const sectorCoverageCount = returnsClean.filter(
      (x) => x.ret != null,
    ).length;
    if (sectorCoverageCount < sectorCoverageRequired) {
      missingInputs.push("sector_coverage_insufficient");
    }

    const relStrength = computeRelStrengthScores(returnsClean);

    const sortedByRet = [...returnsClean].sort(
      (a, b) => (a.ret ?? 0) - (b.ret ?? 0),
    );
    const top3 = sortedByRet.slice(-3).reverse();
    const bottom3 = sortedByRet.slice(0, 3);

    const avgTop = top3
      .map((x) => x.ret)
      .filter((x): x is number => typeof x === "number")
      .reduce((a, b) => a + b, 0);
    const avgTopDiv = Math.max(1, top3.filter((x) => x.ret != null).length);
    const avgTopReturn = avgTop / avgTopDiv;

    const avgBottom = bottom3
      .map((x) => x.ret)
      .filter((x): x is number => typeof x === "number")
      .reduce((a, b) => a + b, 0);
    const avgBottomDiv = Math.max(
      1,
      bottom3.filter((x) => x.ret != null).length,
    );
    const avgBottomReturn = avgBottom / avgBottomDiv;

    const spread = avgTopReturn - avgBottomReturn;
    const mom = scoreMomentumFromSpread({
      topBottomReturnSpreadPct: Number.isFinite(spread) ? spread : null,
    });

    const positiveSectorCount = returnsClean.filter(
      (x) => (x.ret ?? 0) > 0,
    ).length;
    const breadthPctProxy = (positiveSectorCount / SECTOR_ETFS.length) * 100;
    const breadthScoreRes = scoreBreadthProxy({ breadthPctProxy });

    const macroTnxSlope = tnxHistory ? computeSlope5d(tnxHistory) : null;
    const macroDxySlope = dxyHistory ? computeSlope5d(dxyHistory) : null;
    // TNX is typically yield*10. We'll keep raw and also expose derived.
    const tnx10y =
      tnxHistory && tnxHistory.length
        ? tnxHistory[tnxHistory.length - 1] / 10
        : null;
    const dxy =
      dxyHistory && dxyHistory.length
        ? dxyHistory[dxyHistory.length - 1]
        : null;

    const macroRes = scoreMacroFromTrends({
      tnxSlope: macroTnxSlope,
      dxySlope: macroDxySlope,
    });

    const categoryScores: YesNoCategoryScores = {
      volatility: vixScore.score,
      momentum: mom.score,
      trend: trendScore.score,
      breadth: breadthScoreRes.score,
      macro: macroRes.score,
    };

    const marketQualityScore = computeWeightedMarketQualityScore({
      weights: QUALITY_WEIGHTS,
      categoryScores,
    });

    const envDecision = marketQualityDecision(marketQualityScore);
    const isComplete = missingInputs.length === 0;

    let decision: YesNoDecision = isComplete ? envDecision : "NO";

    // Execution window (breakout holding + follow-through + pullback buy).
    const pivotLookbackDays = mode === "day" ? 10 : 20;
    const excludeLastDays = mode === "day" ? 2 : 5;
    const holdCheckDays = mode === "day" ? 2 : 3;
    const breakSPY = spyCloses
      ? computeBreakoutHolding(
          spyCloses,
          pivotLookbackDays,
          excludeLastDays,
          holdCheckDays,
        )
      : false;
    const breakQQQ = qqqCloses
      ? computeBreakoutHolding(
          qqqCloses,
          pivotLookbackDays,
          excludeLastDays,
          holdCheckDays,
        )
      : false;
    const breakoutsHolding = breakSPY && breakQQQ;

    const leadersReturn = avgTopReturn;
    const laggardsReturn = avgBottomReturn;
    const leadingFollowThrough =
      leadersReturn > 0 && laggardsReturn < 0 && mom.score >= 55;

    const drawdownThreshold = mode === "day" ? 0.015 : 0.025;
    const recoveryThreshold = mode === "day" ? 0.004 : 0.006;
    const pullSPY = spyCloses
      ? computePullbackBought(spyCloses, drawdownThreshold, recoveryThreshold)
      : false;
    const pullQQQ = qqqCloses
      ? computePullbackBought(qqqCloses, drawdownThreshold, recoveryThreshold)
      : false;
    const pullbacksBought = pullSPY && pullQQQ;

    const executionWindowScore = computeExecutionWindowScore({
      mode,
      breakoutsHolding,
      leadingFollowThrough,
      pullbacksBought,
    });

    // Execution matters for discretionary permission. Environment can look fine,
    // but if setups aren't working, the gate blocks.
    if (isComplete) {
      if (executionWindowScore < 55) {
        decision = "NO";
      } else if (executionWindowScore < 70 && envDecision === "YES") {
        decision = "CAUTION";
      }
    }

    // Event risk gate (macro/news/event shock). Reuse headline-derived risk events.
    // Critical blocks discretionary trading; warnings cap at CAUTION.
    const newsSvc = this.runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as {
      getActiveRiskEventsForAsset?: (asset: string) => Array<{
        severity?: string;
        description?: string;
        timestamp?: number;
      }>;
    } | null;

    const marketRiskEvents =
      newsSvc?.getActiveRiskEventsForAsset?.("MARKET") ?? [];
    const criticalEvents = marketRiskEvents.filter(
      (e) => (e?.severity ?? "").toLowerCase() === "critical",
    );
    const warningEvents = marketRiskEvents.filter(
      (e) => (e?.severity ?? "").toLowerCase() === "warning",
    );

    let eventAlert: YesNoResponse["alert"] = null;
    if (criticalEvents.length > 0) {
      decision = "NO";
      const newest = criticalEvents[0];
      const ageMs =
        typeof newest?.timestamp === "number" ? alertNow - newest.timestamp : 0;
      const etaSeconds = Math.max(
        0,
        Math.floor((4 * 3600 * 1000 - ageMs) / 1000),
      );
      eventAlert = {
        title: `Critical event risk`,
        message: `${criticalEvents.length} critical risk event(s) are active for the US market tape. ${newest?.description ?? "Trading is blocked to preserve capital."}`,
        etaSeconds,
      };
    } else if (warningEvents.length > 0) {
      if (decision === "YES") decision = "CAUTION";
      const newest = warningEvents[0];
      const ageMs =
        typeof newest?.timestamp === "number" ? alertNow - newest.timestamp : 0;
      const etaSeconds = Math.max(
        0,
        Math.floor((4 * 3600 * 1000 - ageMs) / 1000),
      );
      eventAlert = {
        title: `Warning event risk`,
        message: `${warningEvents.length} warning risk event(s) are active for the US market tape. ${newest?.description ?? "Use smaller size and wait for confirmation."}`,
        etaSeconds,
      };
    }

    // Category directions for UI.
    const directions = {
      volatility: vixScore.direction,
      trend: trendScore.direction,
      breadth: breadthScoreRes.direction,
      momentum: mom.direction,
      macro: macroRes.direction,
    };

    const summary = isComplete
      ? buildSummaryAndDecisionExplanation({
          mode,
          decision,
          marketQualityScore,
          executionWindowScore,
          regime,
        })
      : buildDataQualitySummary({
          decision: "NO",
          marketQualityScore,
          executionWindowScore,
          missingInputs,
          sectorCoverageCount,
          sectorCoverageRequired,
          regime,
        });

    const terminalAnalysis = isComplete
      ? buildTerminalAnalysis({
          decision,
          marketQualityScore,
          executionWindowScore,
          regime,
        })
      : "Preserving capital: the YES/NO gate is blocked because one or more required market inputs were missing or incomplete.";

    const sectorHeatmap = {
      sectors: SECTOR_ETFS.map((s) => {
        const r = relStrength.find((x) => x.symbol === s.symbol);
        const ret =
          returnsClean.find((x) => x.symbol === s.symbol)?.ret ?? null;
        const valueText =
          ret == null ? undefined : `${(ret * 100).toFixed(1)}%`;
        return {
          symbol: s.symbol,
          name: s.name,
          valueText,
          relStrengthScore: r?.relStrengthScore ?? undefined,
        };
      }),
    };

    const response: YesNoResponse = {
      updatedAt,
      mode,
      decision,
      marketQualityScore,
      executionWindowScore,
      summary,
      terminalAnalysis,
      dataQuality: {
        isFresh: true,
        isComplete,
        missingInputs,
        sectorCoverageCount,
        sectorCoverageRequired,
        fetchDiagnostics: {
          provider: "yahoo_chart",
          quoteChecks: [{ key: "vix_quote", ok: vixQuote != null }],
          historyChecks: [
            {
              key: "vix_history",
              ok: !!vixHistory && vixHistory.length >= minVixHistoryLen,
              points: vixHistory?.length ?? null,
            },
            {
              key: "spy_history",
              ok: !!spyHistory && spyHistory.length >= minSpyLen,
              points: spyHistory?.length ?? null,
            },
            {
              key: "qqq_history",
              ok: !!qqqHistory && qqqHistory.length >= minQqqLen,
              points: qqqHistory?.length ?? null,
            },
            {
              key: "dxy_history",
              ok: !!dxyHistory && dxyHistory.length >= minMacroHistoryLen,
              points: dxyHistory?.length ?? null,
            },
            {
              key: "tnx_history",
              ok: !!tnxHistory && tnxHistory.length >= minMacroHistoryLen,
              points: tnxHistory?.length ?? null,
            },
          ],
          sectorHistoryMissing,
        },
      },
      regime,
      categoryWeights: QUALITY_WEIGHTS,
      categoryScores,
      executionWindow: {
        score: executionWindowScore,
        breakoutsHolding,
        leadingFollowThrough,
        pullbacksBought,
      },
      volatility: {
        vixLevel,
        vixPercentile1y,
        vixSlope5d,
      },
      trend: {
        spyPrice,
        spyMa20,
        spyMa50,
        spyMa200,
        qqqMa50: null,
        spyRsi14,
      },
      breadth: {
        proxyUsed: true,
        proxyType: "sector_positive_return_rate",
        positiveSectorCount,
        totalSectors: SECTOR_ETFS.length,
        breadthLookbackDays,
        breadthStage: 1,
        scoreNote:
          "Breadth uses a sector participation proxy: fraction of sector ETFs with positive returns over the lookback window.",
      },
      momentum: {
        topBottomSpread: spread,
        leaders: top3.map((x) => ({
          symbol: x.symbol,
          relStrengthScore:
            relStrength.find((r) => r.symbol === x.symbol)?.relStrengthScore ??
            undefined,
        })),
        laggards: bottom3.map((x) => ({
          symbol: x.symbol,
          relStrengthScore:
            relStrength.find((r) => r.symbol === x.symbol)?.relStrengthScore ??
            undefined,
        })),
      },
      macro: {
        tnx10y,
        dxy,
        fedStance: macroRes.fedStance,
      },
      sectorHeatmap,
      alert: eventAlert,
      tickers: [
        {
          label: "SPY",
          valueText: spyPrice != null ? `${spyPrice.toFixed(2)}` : undefined,
        },
        {
          label: "QQQ",
          valueText:
            qqqCloses?.[qqqCloses.length - 1] != null
              ? `${qqqCloses![qqqCloses!.length - 1].toFixed(2)}`
              : undefined,
        },
        {
          label: "VIX",
          valueText: vixLevel != null ? `${vixLevel.toFixed(2)}` : undefined,
        },
        {
          label: "DXY",
          valueText: dxy != null ? `${Number(dxy).toFixed(2)}` : undefined,
        },
        {
          label: "TNX",
          valueText:
            tnx10y != null ? `${Number(tnx10y).toFixed(2)}%` : undefined,
        },
        ...SECTOR_ETFS.map((s) => {
          const ret =
            returnsClean.find((x) => x.symbol === s.symbol)?.ret ?? null;
          return {
            label: s.symbol,
            valueText: ret == null ? undefined : `${(ret * 100).toFixed(1)}%`,
          };
        }),
      ].slice(0, 17),
      directions,
    };

    return response;
  }
}
