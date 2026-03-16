import type { HIP3LeaderboardSection } from "../routes/dashboardLeaderboards";
import {
  loadTop100FromMarkdown,
  type Top100Meta,
  type Top100StockRow,
} from "./top100Stocks";
import { readYahooQuoteFromCache } from "./yahooQuotesCache";
import {
  getRecentFdSparkline,
  getTrailingReturnDays,
  summarizeFdCachedHistory,
} from "./financialDatasetsCache";
import { computeVinceContext } from "./top100Scoring";

export type Top100SectionStatus = "loading" | "ok" | "stale" | "error";

export interface Top100StocksSection {
  rows: Top100StockRow[];
  meta: Top100Meta;
}

function pct(n: number, d: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0;
  return (n / d) * 100;
}

function computeCoverageMeta(
  rows: Top100StockRow[],
  meta: Top100Meta,
): Top100Meta {
  const total = rows.length || 0;
  const scored = rows.filter((r) => typeof r.composite === "number").length;
  const quote = rows.filter(
    (r) => typeof r.priceLive === "number" || typeof r.change1dPct === "number",
  ).length;
  const history = rows.filter(
    (r) =>
      typeof r.change7dPct === "number" || typeof r.change30dPct === "number",
  ).length;
  const mcap = rows.filter((r) => typeof r.marketCap === "number").length;

  const warnings: string[] = [];
  if (total !== 100) warnings.push(`Expected 100 rows; got ${total}.`);
  if (scored < Math.min(50, total))
    warnings.push(`Low score coverage: ${scored}/${total}.`);
  if (quote < Math.min(70, total))
    warnings.push(`Low quote coverage: ${quote}/${total}.`);

  return {
    ...meta,
    scoredCoveragePct: pct(scored, total),
    quoteCoveragePct: pct(quote, total),
    historyCoveragePct: pct(history, total),
    marketCapCoveragePct: pct(mcap, total),
    warnings: warnings.length ? warnings : undefined,
  };
}

function applyOverlays({
  rows,
  projectRoot,
  hip3,
}: {
  rows: Top100StockRow[];
  projectRoot: string;
  hip3: HIP3LeaderboardSection | null;
}): Top100StockRow[] {
  const byTickerHip3 = new Map<
    string,
    { price?: number; change24h?: number; volume?: number }
  >();
  if (hip3?.categories?.stocks?.length) {
    for (const row of hip3.categories.stocks) {
      const key = row.symbol.toUpperCase().trim();
      byTickerHip3.set(key, {
        price: row.price,
        change24h: row.change24h,
        volume: row.volume,
      });
    }
  }

  const withOverlays = rows.map((row) => {
    const key = row.ticker.toUpperCase().trim();
    let out: Top100StockRow = { ...row };

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
          quoteSource: "hip3",
        };
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

  const ranked = [...withOverlays].filter(
    (r) => typeof r.change1dPct === "number",
  );
  ranked.sort((a, b) => (b.change1dPct ?? 0) - (a.change1dPct ?? 0));
  const liveRankById = new Map<string, number>();
  ranked.forEach((row, idx) => liveRankById.set(row.id, idx + 1));

  return withOverlays.map((row) => {
    const liveRank = liveRankById.get(row.id);
    if (!liveRank) return row;
    if (row.rank == null) return { ...row, liveRank };
    return { ...row, liveRank, rankDrift: row.rank - liveRank };
  });
}

export function buildTop100StocksSection(args: {
  projectRoot?: string;
  hip3: HIP3LeaderboardSection | null;
}): { section: Top100StocksSection | null; status: Top100SectionStatus } {
  const projectRoot = args.projectRoot ?? process.cwd();
  try {
    const { rows, meta } = loadTop100FromMarkdown(projectRoot);
    if (!rows.length) return { section: null, status: "stale" };
    const enriched = applyOverlays({ rows, projectRoot, hip3: args.hip3 });
    const metaWithCoverage = computeCoverageMeta(enriched, meta);

    // Degrade to stale when coverage is weak.
    const weak =
      (metaWithCoverage.scoredCoveragePct ?? 0) < 50 ||
      (metaWithCoverage.quoteCoveragePct ?? 0) < 60;

    return {
      section: { rows: enriched, meta: metaWithCoverage },
      status: weak ? "stale" : "ok",
    };
  } catch {
    return { section: null, status: "error" };
  }
}
