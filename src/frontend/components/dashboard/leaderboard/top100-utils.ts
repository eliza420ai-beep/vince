import type {
  Top100Category,
  Top100StockRow,
} from "@/frontend/lib/leaderboardsApi";

export type Top100QuoteSource = NonNullable<Top100StockRow["quoteSource"]>;

export type Top100SortMode =
  | "rank"
  | "composite"
  | "change1d"
  | "change7d"
  | "change30d"
  | "marketCap"
  | "upside"
  | "offAth"
  | "rankDrift"
  | "historyDrift"
  | "earningsSurprise"
  | "insiderSkew";

export type Top100SortDir = "asc" | "desc";

export function parsePctText(p?: string | null): number | null {
  if (!p) return null;
  const m = `${p}`.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const v = Number(m[0]);
  return Number.isFinite(v) ? v : null;
}

export function uniqSorted(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function computeTop100ToolbarOptions(rows: Top100StockRow[]) {
  const categories = uniqSorted(
    rows.map((r) => r.category),
  ) as Array<Top100Category>;
  const sleeves = uniqSorted(
    rows.map((r) => r.sleeve ?? "").filter(Boolean),
  ) as string[];
  const flags = uniqSorted(
    rows.flatMap((r) => (Array.isArray(r.flags) ? r.flags : [])),
  );
  const sources = uniqSorted(
    rows.map((r) => r.quoteSource ?? "").filter(Boolean),
  ) as Top100QuoteSource[];

  return { categories, sleeves, flags, sources };
}

/** Compact catalyst/risk badges derived from FD snapshot fields. */
export function getFdBadges(row: Top100StockRow): string[] {
  const badges: string[] = [];
  if (
    typeof row.earningsSurprisePct === "number" &&
    row.earningsSurprisePct > 0
  ) {
    badges.push("earnings beat");
  }
  if (row.recent8k === true) {
    badges.push("fresh filing");
  }
  if (
    typeof row.insiderBuySellSkew === "number" &&
    row.insiderBuySellSkew > 0
  ) {
    badges.push("insider buy");
  }
  if (typeof row.volRealized20d === "number" && row.volRealized20d > 0.4) {
    badges.push("high vol");
  }
  if (
    typeof row.revenueGrowthYoyPct === "number" &&
    row.revenueGrowthYoyPct >= 15
  ) {
    badges.push("strong growth");
  }
  if (
    typeof row.dollarVolumeAvg === "number" &&
    row.dollarVolumeAvg < 5_000_000
  ) {
    badges.push("thin liquidity");
  }
  return badges;
}

export function filterAndSortTop100Rows(params: {
  rows: Top100StockRow[];
  search: string;
  category: Top100Category | "ALL";
  sleeve: string | "ALL";
  flag: string | "ALL";
  source: Top100QuoteSource | "ALL";
  freshOnly: boolean;
  scoredOnly: boolean;
  liveOnly: boolean;
  fdRecent8k?: boolean;
  fdInsiderBuy?: boolean;
  sortMode: Top100SortMode;
  sortDir: Top100SortDir;
}): Top100StockRow[] {
  const q = params.search.trim().toLowerCase();
  let out = params.rows;

  if (q) {
    out = out.filter((r) => {
      const hay = `${r.ticker} ${r.company ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (params.category !== "ALL") {
    out = out.filter((r) => r.category === params.category);
  }

  if (params.sleeve !== "ALL") {
    out = out.filter((r) => (r.sleeve ?? "Unknown") === params.sleeve);
  }

  if (params.source !== "ALL") {
    out = out.filter((r) => r.quoteSource === params.source);
  }

  if (params.freshOnly) {
    out = out.filter((r) => r.quoteSource && !r.quoteStale);
  }

  if (params.scoredOnly) {
    out = out.filter((r) => typeof r.composite === "number");
  }

  if (params.liveOnly) {
    out = out.filter(
      (r) =>
        typeof r.priceLive === "number" || typeof r.change1dPct === "number",
    );
  }

  if (params.flag !== "ALL") {
    out = out.filter((r) => r.flags?.includes(params.flag));
  }

  if (params.fdRecent8k === true) {
    out = out.filter((r) => r.recent8k === true);
  }

  if (params.fdInsiderBuy === true) {
    out = out.filter(
      (r) =>
        typeof r.insiderBuySellSkew === "number" && r.insiderBuySellSkew > 0,
    );
  }

  const dir = params.sortDir === "asc" ? 1 : -1;

  const getSortVal = (r: Top100StockRow): number => {
    switch (params.sortMode) {
      case "rank":
        return r.rank ?? Number.POSITIVE_INFINITY;
      case "composite":
        return r.composite ?? Number.NEGATIVE_INFINITY;
      case "change1d":
        return r.change1dPct ?? Number.NEGATIVE_INFINITY;
      case "change7d":
        return r.change7dPct ?? Number.NEGATIVE_INFINITY;
      case "change30d":
        return r.change30dPct ?? Number.NEGATIVE_INFINITY;
      case "marketCap":
        return r.marketCap ?? Number.NEGATIVE_INFINITY;
      case "upside":
        return parsePctText(r.upsidePct) ?? Number.NEGATIVE_INFINITY;
      case "offAth":
        return parsePctText(r.offAthPct) ?? Number.NEGATIVE_INFINITY;
      case "rankDrift":
        return r.rankDrift ?? Number.NEGATIVE_INFINITY;
      case "historyDrift":
        return r.historyRankDrift ?? Number.NEGATIVE_INFINITY;
      case "earningsSurprise":
        return r.earningsSurprisePct ?? Number.NEGATIVE_INFINITY;
      case "insiderSkew":
        return r.insiderBuySellSkew ?? Number.NEGATIVE_INFINITY;
      default:
        return r.rank ?? Number.POSITIVE_INFINITY;
    }
  };

  return [...out].sort((a, b) => {
    const av = getSortVal(a);
    const bv = getSortVal(b);
    if (av !== bv) return (av < bv ? -1 : 1) * dir;

    // Stable-ish tie breaks.
    const ar = a.rank ?? Number.POSITIVE_INFINITY;
    const br = b.rank ?? Number.POSITIVE_INFINITY;
    if (ar !== br) return ar - br;
    return a.ticker.localeCompare(b.ticker);
  });
}
