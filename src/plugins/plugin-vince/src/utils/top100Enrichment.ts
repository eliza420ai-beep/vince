import type { HIP3LeaderboardSection } from "../routes/dashboardLeaderboards";
import {
  loadPortfolioUniverse,
  type Top100Meta,
  type Top100Rituals,
  type Top100StockRow,
} from "./top100Stocks";
import { readProfileFromCache } from "./top100ProfileCache";
import { readYahooQuoteFromCache } from "./yahooQuotesCache";
import {
  getPreviousBarReturn1d,
  getRecentFdSparkline,
  getTrailingReturnDays,
  summarizeFdCachedHistory,
} from "./financialDatasetsCache";
import { readFdSnapshot } from "./fdFactorBuilder";
import { computeVinceContext } from "./top100Scoring";
import { readLatestTop100Snapshot } from "./top100History";
import { readCompanyFactsFromCache } from "./top100CompanyFactsCache";
import { sectorToCategory, TICKER_CATEGORY_OVERRIDE } from "./top100SectorMap";
import { computeSyntheticScore } from "./top100SyntheticScorecard";
import { getPriceTargetSeed } from "./top100PriceTargetSeed";
import { getEditorialScorecard } from "./top100EditorialScorecard";
import { getStrategicLayer } from "./top100StrategicLayer";
import { loadDexterScorecard } from "./dexterScorecard";

export type Top100SectionStatus = "loading" | "ok" | "stale" | "error";

const SCORE_STALE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days (Dexter cadence is weekly)
const FD_SNAPSHOT_STALE_MS = 36 * 60 * 60 * 1000; // 36 hours

export interface Top100StocksSection {
  rows: Top100StockRow[];
  meta: Top100Meta;
}

interface Top100MetaPatch {
  liveTop10Entrants?: string[];
  liveTop10Exits?: string[];
  liveTop25Entrants?: string[];
  liveTop25Exits?: string[];
  rituals?: Top100Rituals;
}

function computeDerivedMeta(
  rows: Top100StockRow[],
): Pick<
  Top100Meta,
  "total" | "byCategory" | "topByComposite" | "highestUpside" | "sleeveAverages"
> {
  const total = rows.length;

  const byCategoryMap = new Map<Top100StockRow["category"], number>();
  for (const r of rows) {
    byCategoryMap.set(r.category, (byCategoryMap.get(r.category) ?? 0) + 1);
  }
  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const topByComposite = [...rows]
    .filter(
      (r) => typeof r.composite === "number" && Number.isFinite(r.composite),
    )
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0))
    .slice(0, 10);

  const highestUpside = [...rows]
    .map((r) => {
      const upside = parsePctText(r.upsidePct);
      if (upside == null) return null;
      return {
        ticker: r.ticker,
        upside: r.upsidePct ?? `${upside.toFixed(0)}%`,
        sector: r.category === "Unknown" ? "Unknown" : r.category,
        upsideNum: upside,
      };
    })
    .filter(Boolean) as Array<{
    ticker: string;
    upside: string;
    sector: string;
    upsideNum: number;
  }>;
  highestUpside.sort((a, b) => b.upsideNum - a.upsideNum);

  const bySleeve = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.sleeve) continue;
    if (typeof r.composite !== "number" || !Number.isFinite(r.composite))
      continue;
    const arr = bySleeve.get(r.sleeve) ?? [];
    arr.push(r.composite);
    bySleeve.set(r.sleeve, arr);
  }
  const sleeveAverages: NonNullable<Top100Meta["sleeveAverages"]> = {};
  bySleeve.forEach((vals, sleeve) => {
    if (!vals.length) return;
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    sleeveAverages[sleeve as keyof typeof sleeveAverages] = avg;
  });

  return {
    total,
    byCategory,
    topByComposite,
    highestUpside: highestUpside
      .slice(0, 25)
      .map(({ upsideNum, ...rest }) => rest),
    sleeveAverages: Object.keys(sleeveAverages).length
      ? sleeveAverages
      : undefined,
  };
}

function pct(n: number, d: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0;
  return (n / d) * 100;
}

function formatTickerWarning(tickers: string[], max = 12): string {
  const unique = [
    ...new Set(tickers.map((ticker) => ticker.toUpperCase().trim())),
  ];
  const shown = unique.slice(0, max);
  const extra = unique.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} (+${extra} more)` : shown.join(", ");
}

function computeCoverageMeta(
  rows: Top100StockRow[],
  meta: Top100Meta,
): Top100Meta {
  const total = rows.length || 0;
  const scored = rows.filter((r) => typeof r.composite === "number").length;
  const unscoredTickers = rows
    .filter(
      (r) =>
        typeof r.composite !== "number" ||
        !Number.isFinite(r.composite) ||
        typeof r.rank !== "number" ||
        !Number.isFinite(r.rank),
    )
    .map((r) => r.ticker);
  const quote = rows.filter(
    (r) => typeof r.priceLive === "number" || typeof r.change1dPct === "number",
  ).length;
  const history = rows.filter(
    (r) =>
      typeof r.change7dPct === "number" || typeof r.change30dPct === "number",
  ).length;
  const mcap = rows.filter((r) => typeof r.marketCap === "number").length;

  const missingYahooTickers = rows
    .filter(
      (r) =>
        r.quoteSource !== "yahoo" &&
        (typeof r.priceLive !== "number" || typeof r.change1dPct !== "number"),
    )
    .map((r) => r.ticker);
  const missingFdHistoryTickers = rows
    .filter(
      (r) =>
        typeof r.change7dPct !== "number" || typeof r.change30dPct !== "number",
    )
    .map((r) => r.ticker);
  const missingMarketCapTickers = rows
    .filter((r) => typeof r.marketCap !== "number")
    .map((r) => r.ticker);

  const fdSnapshotRows = rows.filter(
    (r) =>
      typeof r.fdSnapshotAt === "number" && Number.isFinite(r.fdSnapshotAt),
  );
  const fdEarningsRows = rows.filter(
    (r) =>
      typeof r.earningsSurprisePct === "number" ||
      typeof r.daysSinceEarnings === "number",
  );
  const fdInsiderRows = rows.filter(
    (r) =>
      typeof r.insiderBuySellSkew === "number" ||
      typeof r.insiderBuyCount === "number" ||
      typeof r.insiderSellCount === "number",
  );
  const fdFilingRows = rows.filter(
    (r) => r.recent8k === true || r.recent10q === true || r.recent10k === true,
  );
  const now = Date.now();
  const staleFdSnapshotTickers = rows
    .filter(
      (r) =>
        typeof r.fdSnapshotAt === "number" &&
        Number.isFinite(r.fdSnapshotAt) &&
        now - r.fdSnapshotAt > FD_SNAPSHOT_STALE_MS,
    )
    .map((r) => r.ticker);
  const missingFdSnapshotTickers = rows
    .filter(
      (r) =>
        typeof r.fdSnapshotAt !== "number" || !Number.isFinite(r.fdSnapshotAt),
    )
    .map((r) => r.ticker);
  const missingFdEarningsTickers = rows
    .filter(
      (r) =>
        typeof r.earningsSurprisePct !== "number" &&
        typeof r.daysSinceEarnings !== "number",
    )
    .map((r) => r.ticker);
  const missingFdInsiderTickers = rows
    .filter(
      (r) =>
        typeof r.insiderBuySellSkew !== "number" &&
        typeof r.insiderBuyCount !== "number" &&
        typeof r.insiderSellCount !== "number",
    )
    .map((r) => r.ticker);
  const missingFdFilingTickers = rows
    .filter(
      (r) =>
        r.recent8k !== true && r.recent10q !== true && r.recent10k !== true,
    )
    .map((r) => r.ticker);

  const warnings: string[] = [];
  if (total !== 100) warnings.push(`Expected 100 rows; got ${total}.`);
  if (scored < Math.min(50, total))
    warnings.push(`Low score coverage: ${scored}/${total}.`);
  if (unscoredTickers.length) {
    warnings.push(
      `Missing scorecard coverage for: ${formatTickerWarning(unscoredTickers)}.`,
    );
  }
  if (quote < Math.min(70, total))
    warnings.push(`Low quote coverage: ${quote}/${total}.`);
  if (missingYahooTickers.length) {
    warnings.push(
      `Missing Yahoo quote: ${formatTickerWarning(missingYahooTickers)}.`,
    );
  }
  if (missingFdHistoryTickers.length) {
    warnings.push(
      `Missing FD history: ${formatTickerWarning(missingFdHistoryTickers)}.`,
    );
  }
  if (missingMarketCapTickers.length) {
    warnings.push(
      `Missing market cap: ${formatTickerWarning(missingMarketCapTickers)}.`,
    );
  }
  if (missingFdSnapshotTickers.length) {
    warnings.push(
      `Missing FD snapshot: ${formatTickerWarning(missingFdSnapshotTickers)}.`,
    );
  }
  if (missingFdEarningsTickers.length) {
    warnings.push(
      `Missing FD earnings: ${formatTickerWarning(missingFdEarningsTickers)}.`,
    );
  }
  if (missingFdInsiderTickers.length) {
    warnings.push(
      `Missing FD insider: ${formatTickerWarning(missingFdInsiderTickers)}.`,
    );
  }
  if (missingFdFilingTickers.length) {
    warnings.push(
      `Missing FD filing: ${formatTickerWarning(missingFdFilingTickers)}.`,
    );
  }
  if (staleFdSnapshotTickers.length) {
    warnings.push(
      `Stale FD snapshot: ${formatTickerWarning(staleFdSnapshotTickers)}.`,
    );
  }

  return {
    ...meta,
    scoredCoveragePct: pct(scored, total),
    quoteCoveragePct: pct(quote, total),
    historyCoveragePct: pct(history, total),
    marketCapCoveragePct: pct(mcap, total),
    fdSnapshotCoveragePct: pct(fdSnapshotRows.length, total),
    fdEarningsCoveragePct: pct(fdEarningsRows.length, total),
    fdInsiderCoveragePct: pct(fdInsiderRows.length, total),
    fdFilingCoveragePct: pct(fdFilingRows.length, total),
    missingYahooTickers:
      missingYahooTickers.length > 0 ? missingYahooTickers : undefined,
    missingFdHistoryTickers:
      missingFdHistoryTickers.length > 0 ? missingFdHistoryTickers : undefined,
    missingMarketCapTickers:
      missingMarketCapTickers.length > 0 ? missingMarketCapTickers : undefined,
    missingFdSnapshotTickers:
      missingFdSnapshotTickers.length > 0
        ? missingFdSnapshotTickers
        : undefined,
    missingFdEarningsTickers:
      missingFdEarningsTickers.length > 0
        ? missingFdEarningsTickers
        : undefined,
    missingFdInsiderTickers:
      missingFdInsiderTickers.length > 0 ? missingFdInsiderTickers : undefined,
    missingFdFilingTickers:
      missingFdFilingTickers.length > 0 ? missingFdFilingTickers : undefined,
    staleFdSnapshotTickers:
      staleFdSnapshotTickers.length > 0 ? staleFdSnapshotTickers : undefined,
    warnings: warnings.length ? warnings : undefined,
  };
}

function parsePctText(p?: string | null): number | undefined {
  if (!p) return undefined;
  const m = `${p}`.match(/-?\d+(\.\d+)?/);
  if (!m) return undefined;
  const v = Number(m[0]);
  return Number.isFinite(v) ? v : undefined;
}

function tickersOf(rows: Top100StockRow[], count = 5): string[] {
  return rows.slice(0, count).map((row) => row.ticker);
}

function computeRituals(rows: Top100StockRow[]): Top100Rituals {
  const biggestClimbers = [...rows]
    .filter(
      (row) =>
        typeof row.historyRankDrift === "number" && row.historyRankDrift > 0,
    )
    .sort((a, b) => (b.historyRankDrift ?? 0) - (a.historyRankDrift ?? 0));
  const biggestFallers = [...rows]
    .filter(
      (row) =>
        typeof row.historyRankDrift === "number" && row.historyRankDrift < 0,
    )
    .sort((a, b) => (a.historyRankDrift ?? 0) - (b.historyRankDrift ?? 0));
  const biggestMismatches = [...rows]
    .filter((row) => typeof row.rankDrift === "number")
    .sort(
      (a, b) =>
        Math.abs(b.rankDrift ?? 0) - Math.abs(a.rankDrift ?? 0) ||
        (b.composite ?? 0) - (a.composite ?? 0),
    );

  const continuation = [...rows]
    .filter(
      (row) =>
        (row.change1dPct ?? Number.NEGATIVE_INFINITY) > 0 &&
        (row.change7dPct ?? Number.NEGATIVE_INFINITY) > 0 &&
        (row.change30dPct ?? Number.NEGATIVE_INFINITY) > 0 &&
        (row.momentumScore ?? 50) >= 50,
    )
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0));
  const pullbacks = [...rows]
    .filter(
      (row) =>
        (row.change1dPct ?? Number.POSITIVE_INFINITY) < 0 &&
        (row.change7dPct ?? Number.NEGATIVE_INFINITY) > 0 &&
        (row.change30dPct ?? Number.NEGATIVE_INFINITY) > 0 &&
        (row.momentumScore ?? 50) >= 45,
    )
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0));
  const failures = [...rows]
    .filter(
      (row) =>
        (row.change7dPct ?? Number.POSITIVE_INFINITY) < 0 &&
        (row.change30dPct ?? Number.POSITIVE_INFINITY) < 0 &&
        (row.momentumScore ?? 50) <= 55,
    )
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0));

  const flagged = [...rows]
    .filter((row) => (row.flags?.length ?? 0) > 0 || !!row.riskSummary)
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0));
  const clean = [...rows]
    .filter(
      (row) =>
        !(row.flags?.length ?? 0) &&
        !row.quoteStale &&
        (row.change7dPct ?? Number.NEGATIVE_INFINITY) >= 0 &&
        (row.insiderScore ?? 50) >= 50,
    )
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0));

  const confirmed = [...rows]
    .filter((row) => {
      const upside = parsePctText(row.upsidePct);
      return (
        typeof upside === "number" &&
        upside >= 15 &&
        (row.change30dPct ?? Number.NEGATIVE_INFINITY) > 0 &&
        (row.valuationScore ?? 50) >= 35
      );
    })
    .sort(
      (a, b) =>
        (parsePctText(b.upsidePct) ?? 0) - (parsePctText(a.upsidePct) ?? 0),
    );
  const breakingDown = [...rows]
    .filter((row) => {
      const upside = parsePctText(row.upsidePct);
      return (
        typeof upside === "number" &&
        upside >= 15 &&
        (row.change30dPct ?? Number.POSITIVE_INFINITY) < 0 &&
        (row.valuationScore ?? 50) < 60
      );
    })
    .sort(
      (a, b) =>
        (parsePctText(b.upsidePct) ?? 0) - (parsePctText(a.upsidePct) ?? 0),
    );

  return {
    historyDrift: {
      biggestClimbers: tickersOf(biggestClimbers),
      biggestFallers: tickersOf(biggestFallers),
      biggestMismatches: tickersOf(biggestMismatches),
    },
    momentum: {
      continuation: tickersOf(continuation),
      pullbacks: tickersOf(pullbacks),
      failures: tickersOf(failures),
    },
    risk: {
      flagged: tickersOf(flagged),
      clean: tickersOf(clean),
    },
    upsideVsTape: {
      confirmed: tickersOf(confirmed),
      breakingDown: tickersOf(breakingDown),
    },
  };
}

function diffTickers(
  current: Set<string>,
  previous: Set<string>,
): {
  entrants: string[];
  exits: string[];
} {
  const entrants = [...current]
    .filter((ticker) => !previous.has(ticker))
    .sort();
  const exits = [...previous].filter((ticker) => !current.has(ticker)).sort();
  return { entrants, exits };
}

function applyOverlays({
  rows,
  projectRoot,
  hip3,
}: {
  rows: Top100StockRow[];
  projectRoot: string;
  hip3: HIP3LeaderboardSection | null;
}): { rows: Top100StockRow[]; metaPatch: Top100MetaPatch } {
  const dexter = loadDexterScorecard(projectRoot);
  const byTickerHip3 = new Map<
    string,
    { price?: number; change24h?: number; volume?: number; marketCap?: number }
  >();
  if (hip3?.categories?.stocks?.length) {
    for (const row of hip3.categories.stocks) {
      const key = row.symbol.toUpperCase().trim();
      byTickerHip3.set(key, {
        price: row.price,
        change24h: row.change24h,
        volume: row.volume,
        marketCap: row.marketCap,
      });
    }
  }

  const withOverlays = rows.map((row) => {
    const key = row.ticker.toUpperCase().trim();
    let out: Top100StockRow = { ...row };

    // 1. Category override (editorial) — before FD facts
    const categoryOverride = TICKER_CATEGORY_OVERRIDE[key];
    if (categoryOverride) out.category = categoryOverride;

    const companyFacts = readCompanyFactsFromCache(projectRoot, key);
    if (companyFacts) {
      if (companyFacts.name) out.company = companyFacts.name;
      // Only set category from FD if override did not set it
      if (!categoryOverride)
        out.category = sectorToCategory(
          companyFacts.sector,
          companyFacts.industry,
        );
    }

    // 2. Strategic layer seed
    const layerEntry = getStrategicLayer(key);
    if (layerEntry) out.strategicLayer = layerEntry;

    // 3. Price target seed — fill only if blank
    const ptSeed = getPriceTargetSeed(key);
    if (ptSeed) {
      if (!out.price) out.price = ptSeed.price;
      if (!out.avgPriceTarget) out.avgPriceTarget = ptSeed.avgPriceTarget;
      if (!out.upsidePct) out.upsidePct = ptSeed.upsidePct;
      if (!out.offAthPct) out.offAthPct = ptSeed.offAthPct;
    }

    // 3.5 Dexter scorecard (canonical) — composite/sub-scores/flags when available
    const dex = dexter?.bySymbol.get(key);
    if (dex) {
      const growth = dex.factors?.growth?.score;
      const valuation = dex.factors?.valuation?.score;
      const momentum = dex.factors?.momentum?.score;
      const profit = dex.factors?.profitability?.score;
      const earnings = dex.factors?.earnings_quality?.score;
      const balanceSheet = dex.factors?.balance_sheet?.score;
      const insider = dex.factors?.insider_signal?.score;

      out = {
        ...out,
        composite:
          typeof dex.composite === "number" && Number.isFinite(dex.composite)
            ? dex.composite
            : out.composite,
        growthScore:
          typeof growth === "number" && Number.isFinite(growth)
            ? growth
            : out.growthScore,
        valuationScore:
          typeof valuation === "number" && Number.isFinite(valuation)
            ? valuation
            : out.valuationScore,
        momentumScore:
          typeof momentum === "number" && Number.isFinite(momentum)
            ? momentum
            : out.momentumScore,
        profitScore:
          typeof profit === "number" && Number.isFinite(profit)
            ? profit
            : out.profitScore,
        earningsScore:
          typeof earnings === "number" && Number.isFinite(earnings)
            ? earnings
            : out.earningsScore,
        balanceSheetScore:
          typeof balanceSheet === "number" && Number.isFinite(balanceSheet)
            ? balanceSheet
            : out.balanceSheetScore,
        insiderScore:
          typeof insider === "number" && Number.isFinite(insider)
            ? insider
            : out.insiderScore,
        flags:
          Array.isArray(dex.flags) && dex.flags.length ? dex.flags : out.flags,
        scoreSource: "dexter",
        scoreGeneratedAt: dexter?.generatedAtMs ?? undefined,
      };
      if (!out.sleeve && dex.sleeve) out.sleeve = dex.sleeve;
    }

    const yahoo = readYahooQuoteFromCache(projectRoot, key);
    if (yahoo) {
      out = {
        ...out,
        priceLive:
          typeof yahoo.price === "number" ? yahoo.price : out.priceLive,
        change1dPct:
          typeof yahoo.change1dPct === "number"
            ? yahoo.change1dPct
            : out.change1dPct,
        marketCap:
          typeof yahoo.marketCap === "number" ? yahoo.marketCap : out.marketCap,
        marketCapSource:
          typeof yahoo.marketCap === "number" ? "yahoo" : out.marketCapSource,
        avgVolume:
          typeof yahoo.avgVolume === "number" ? yahoo.avgVolume : out.avgVolume,
        quoteSource: "yahoo",
        quoteUpdatedAt: yahoo.updatedAt
          ? new Date(yahoo.updatedAt).getTime()
          : out.quoteUpdatedAt,
      };
    } else {
      const fromHip3 = byTickerHip3.get(key);
      if (fromHip3 && typeof fromHip3.price === "number") {
        out = {
          ...out,
          priceLive: fromHip3.price,
          change1dPct: fromHip3.change24h,
          avgVolume: fromHip3.volume,
          marketCap:
            typeof fromHip3.marketCap === "number"
              ? fromHip3.marketCap
              : out.marketCap,
          marketCapSource:
            typeof fromHip3.marketCap === "number"
              ? "hip3"
              : out.marketCapSource,
          quoteSource: "hip3",
        };
      }
    }

    if (typeof out.marketCap !== "number") {
      const profile = readProfileFromCache(projectRoot, key);
      if (profile && typeof profile.marketCap === "number") {
        out = {
          ...out,
          marketCap: profile.marketCap,
          marketCapSource: "profile_cache",
        };
      }
    }

    if (typeof out.change1dPct !== "number") {
      const fd1d = getPreviousBarReturn1d(projectRoot, key);
      if (fd1d) {
        out = { ...out, change1dPct: fd1d.returnPct };
        if (!out.quoteSource) out.quoteSource = "fd_cache";
      }
    }

    const fdSummary = summarizeFdCachedHistory(key, projectRoot);
    if (fdSummary) {
      const change7 = getTrailingReturnDays(projectRoot, key, 7);
      const change30 = getTrailingReturnDays(projectRoot, key, 30);
      const sparkline7d = getRecentFdSparkline(projectRoot, key, {
        maxPoints: 20,
        lookbackDays: 45,
      });
      out = {
        ...out,
        priceLive:
          out.priceLive ??
          (typeof fdSummary.lastClose === "number"
            ? fdSummary.lastClose
            : undefined),
        change7dPct: change7?.returnPct ?? out.change7dPct,
        change30dPct: change30?.returnPct ?? out.change30dPct,
        sparkline7d: sparkline7d ?? out.sparkline7d,
        avgVolume: out.avgVolume ?? fdSummary.avgVolume ?? undefined,
        dollarVolume:
          out.dollarVolume ??
          (fdSummary.avgVolume && fdSummary.lastClose
            ? fdSummary.avgVolume * fdSummary.lastClose
            : undefined),
        quoteSource: out.quoteSource ?? "fd_cache",
        quoteUpdatedAt:
          out.quoteUpdatedAt ??
          (fdSummary.fetchedAt
            ? new Date(fdSummary.fetchedAt).getTime()
            : undefined),
      };
    }

    const fdSnapshot = readFdSnapshot(key, projectRoot);
    if (fdSnapshot) {
      out = {
        ...out,
        earningsSurprisePct:
          fdSnapshot.earnings_surprise_pct ?? out.earningsSurprisePct,
        daysSinceEarnings:
          fdSnapshot.days_since_earnings ?? out.daysSinceEarnings,
        recent8k: fdSnapshot.recent_8k ?? out.recent8k,
        recent10q: fdSnapshot.recent_10q ?? out.recent10q,
        recent10k: fdSnapshot.recent_10k ?? out.recent10k,
        insiderBuySellSkew:
          fdSnapshot.insider_buy_sell_skew ?? out.insiderBuySellSkew,
        insiderBuyCount: fdSnapshot.insider_buy_count ?? out.insiderBuyCount,
        insiderSellCount: fdSnapshot.insider_sell_count ?? out.insiderSellCount,
        revenueGrowthYoyPct:
          fdSnapshot.revenue_growth_yoy_pct ?? out.revenueGrowthYoyPct,
        operatingMarginPct:
          fdSnapshot.operating_margin_pct ?? out.operatingMarginPct,
        grossMarginPct: fdSnapshot.gross_margin_pct ?? out.grossMarginPct,
        volRealized20d: fdSnapshot.vol_realized_20d ?? out.volRealized20d,
        drawdownPct: fdSnapshot.drawdown_pct ?? out.drawdownPct,
        dollarVolumeAvg: fdSnapshot.dollar_volume_avg ?? out.dollarVolumeAvg,
        fdSnapshotAt: fdSnapshot.snapshotAt
          ? new Date(fdSnapshot.snapshotAt).getTime()
          : out.fdSnapshotAt,
      };
      if (
        typeof out.composite !== "number" ||
        !Number.isFinite(out.composite)
      ) {
        const synthetic = computeSyntheticScore(out, fdSnapshot);
        if (synthetic) {
          out = {
            ...out,
            composite: synthetic.composite,
            growthScore: synthetic.growthScore,
            valuationScore: synthetic.valuationScore,
            momentumScore: synthetic.momentumScore,
            profitScore: synthetic.profitScore,
            earningsScore: synthetic.earningsScore,
            balanceSheetScore: synthetic.balanceSheetScore,
            insiderScore: synthetic.insiderScore,
            scoreSource: "synthetic",
          };
          if (!out.scoreGeneratedAt) out.scoreGeneratedAt = out.fdSnapshotAt;
        }
      }
    }

    // Staleness flags (operator trust)
    if (
      typeof out.scoreGeneratedAt === "number" &&
      Number.isFinite(out.scoreGeneratedAt)
    ) {
      out.scoreStale = Date.now() - out.scoreGeneratedAt > SCORE_STALE_MS;
    }
    if (
      typeof out.fdSnapshotAt === "number" &&
      Number.isFinite(out.fdSnapshotAt)
    ) {
      out.fdSnapshotStale =
        Date.now() - out.fdSnapshotAt > FD_SNAPSHOT_STALE_MS;
    }

    // 5. Editorial scorecard fallback — composite/sub-scores if still null after FD
    if (typeof out.composite !== "number" || !Number.isFinite(out.composite)) {
      const editorial = getEditorialScorecard(key);
      if (editorial) {
        out = {
          ...out,
          composite: editorial.composite,
          growthScore: editorial.growthScore,
          valuationScore: editorial.valuationScore,
          momentumScore: editorial.momentumScore,
          profitScore: editorial.profitScore,
          earningsScore: editorial.earningsScore,
          balanceSheetScore: editorial.balanceSheetScore,
          insiderScore: editorial.insiderScore,
          scoreSource: "editorial",
        };
        if (!out.scoreGeneratedAt) out.scoreGeneratedAt = Date.now();
      }
    }

    // 6. Risk flags from editorial — only if flags still empty
    if (!out.flags?.length) {
      const editorial = getEditorialScorecard(key);
      if (editorial?.flags?.length) out.flags = editorial.flags;
    }

    if (out.quoteUpdatedAt) {
      const ageMs = Date.now() - out.quoteUpdatedAt;
      out.quoteStale = ageMs > 6 * 60 * 60 * 1000;
    }

    const ctx = computeVinceContext(out);
    out.keyStrength = ctx.keyStrength;
    out.whyNow = ctx.whyNow;
    out.convictionTier = ctx.convictionTier;
    out.riskSummary = ctx.riskSummary;
    out.theme = ctx.theme;

    return out;
  });

  const byComposite = [...withOverlays].sort(
    (a, b) => (b.composite ?? -1) - (a.composite ?? -1),
  );
  const rankById = new Map<string, number>();
  byComposite.forEach((row, idx) => rankById.set(row.id, idx + 1));
  const withRank = withOverlays.map((row) => {
    const rank = rankById.get(row.id);
    if (rank == null) return row;
    return { ...row, rank };
  });

  const ranked = [...withRank].filter((r) => typeof r.change1dPct === "number");
  ranked.sort((a, b) => (b.change1dPct ?? 0) - (a.change1dPct ?? 0));
  const liveRankById = new Map<string, number>();
  ranked.forEach((row, idx) => liveRankById.set(row.id, idx + 1));

  const withLiveRank = withRank.map((row) => {
    const liveRank = liveRankById.get(row.id);
    if (!liveRank) return row;
    if (row.rank == null) return { ...row, liveRank };
    return { ...row, liveRank, rankDrift: row.rank - liveRank };
  });

  const latestSnapshot = readLatestTop100Snapshot(projectRoot);
  const previousById = new Map(
    (latestSnapshot?.rows ?? []).map((row) => [row.id, row]),
  );
  const currentTop10 = new Set(
    withLiveRank
      .filter((row) => typeof row.liveRank === "number" && row.liveRank <= 10)
      .map((row) => row.ticker),
  );
  const currentTop25 = new Set(
    withLiveRank
      .filter((row) => typeof row.liveRank === "number" && row.liveRank <= 25)
      .map((row) => row.ticker),
  );
  const previousTop10 = new Set(
    (latestSnapshot?.rows ?? [])
      .filter((row) => typeof row.liveRank === "number" && row.liveRank <= 10)
      .map((row) => row.ticker),
  );
  const previousTop25 = new Set(
    (latestSnapshot?.rows ?? [])
      .filter((row) => typeof row.liveRank === "number" && row.liveRank <= 25)
      .map((row) => row.ticker),
  );
  const top10Diff = diffTickers(currentTop10, previousTop10);
  const top25Diff = diffTickers(currentTop25, previousTop25);

  const rowsWithHistory = withLiveRank.map((row) => {
    const previous = previousById.get(row.id);
    const next: Top100StockRow = {
      ...row,
      enteredTop10:
        currentTop10.has(row.ticker) && !previousTop10.has(row.ticker),
      exitedTop10:
        !currentTop10.has(row.ticker) && previousTop10.has(row.ticker),
      enteredTop25:
        currentTop25.has(row.ticker) && !previousTop25.has(row.ticker),
      exitedTop25:
        !currentTop25.has(row.ticker) && previousTop25.has(row.ticker),
    };
    if (typeof previous?.liveRank === "number") {
      next.prevLiveRank = previous.liveRank;
      if (typeof row.liveRank === "number") {
        next.historyRankDrift = previous.liveRank - row.liveRank;
      }
    }
    return next;
  });

  return {
    rows: rowsWithHistory,
    metaPatch: {
      liveTop10Entrants: top10Diff.entrants,
      liveTop10Exits: top10Diff.exits,
      liveTop25Entrants: top25Diff.entrants,
      liveTop25Exits: top25Diff.exits,
      rituals: computeRituals(rowsWithHistory),
    },
  };
}

export function buildTop100StocksSection(args: {
  projectRoot?: string;
  hip3: HIP3LeaderboardSection | null;
}): { section: Top100StocksSection | null; status: Top100SectionStatus } {
  const projectRoot = args.projectRoot ?? process.cwd();
  try {
    const { rows, meta } = loadPortfolioUniverse(projectRoot);
    if (!rows.length) return { section: null, status: "stale" };
    const { rows: enriched, metaPatch } = applyOverlays({
      rows,
      projectRoot,
      hip3: args.hip3,
    });
    const dexter = loadDexterScorecard(projectRoot);
    const dexterCoveredCount = enriched.filter(
      (r) => r.scoreSource === "dexter",
    ).length;
    const derivedMeta = computeDerivedMeta(enriched);
    const metaWithCoverage = computeCoverageMeta(enriched, {
      ...meta,
      ...derivedMeta,
      ...metaPatch,
      dexterScorecardGeneratedAt: dexter?.generatedAtMs ?? null,
      dexterScorecardTickerCount: dexter?.tickerCount,
      dexterScorecardCoveredCount: dexterCoveredCount || undefined,
      dexterScorecardAgeMs:
        dexter?.generatedAtMs != null
          ? Math.max(0, Date.now() - dexter.generatedAtMs)
          : null,
    });

    // Degrade to stale when coverage is weak.
    const weak =
      (metaWithCoverage.scoredCoveragePct ?? 0) < 50 ||
      (metaWithCoverage.quoteCoveragePct ?? 0) < 60;
    const historyRows = enriched.filter(
      (row) =>
        typeof row.liveRank === "number" &&
        typeof row.prevLiveRank === "number",
    ).length;
    if (historyRows > 0 && historyRows < Math.min(25, enriched.length)) {
      metaWithCoverage.warnings = [
        ...(metaWithCoverage.warnings ?? []),
        `Limited drift coverage: ${historyRows}/${enriched.length}.`,
      ];
    }

    return {
      section: { rows: enriched, meta: metaWithCoverage },
      status: weak ? "stale" : "ok",
    };
  } catch {
    return { section: null, status: "error" };
  }
}
