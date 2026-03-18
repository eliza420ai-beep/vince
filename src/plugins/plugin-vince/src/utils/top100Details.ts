import {
  buildTop100StocksSection,
  type Top100StocksSection,
} from "./top100Enrichment";
import { getLatestFdCacheForTicker } from "./financialDatasetsCache";
import {
  readYahooQuoteFromCache,
  type YahooQuoteEnvelope,
} from "./yahooQuotesCache";
import { readCompanyFactsFromCache } from "./top100CompanyFactsCache";

export interface Top100SparkPoint {
  date: string;
  close: number;
}

export interface Top100DetailsResponse {
  ticker: string;
  row: any; // serialized Top100StockRow (route owns the concrete type)
  quote: YahooQuoteEnvelope | null;
  fdCache?: {
    fetchedAt?: string;
    startDate?: string;
    endDate?: string;
    rowCount?: number;
    spark30d?: Top100SparkPoint[];
  } | null;
  peers: any[]; // serialized Top100StockRow[]
  /** Wave2: drawer-only; from dedicated cache when available. */
  analystEstimatesSummary?: string | null;
  companyFactsSnapshot?: string | null;
  newsSummary?: string | null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function normalizeTicker(t: string): string {
  return t.toUpperCase().trim();
}

function fmtMcap(v?: number): string | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  return `${(v / 1e9).toFixed(1)}B`;
}

function buildCompanyFactsSnapshot(
  projectRoot: string,
  ticker: string,
): string | null {
  const facts = readCompanyFactsFromCache(projectRoot, ticker);
  if (!facts) return null;
  const lines: string[] = [];
  if (facts.name) lines.push(`Name: ${facts.name}`);
  if (facts.exchange) lines.push(`Exchange: ${facts.exchange}`);
  if (facts.sector) lines.push(`Sector: ${facts.sector}`);
  if (facts.industry) lines.push(`Industry: ${facts.industry}`);
  const mcap = fmtMcap(facts.market_cap);
  if (mcap) lines.push(`Market cap: ${mcap}`);
  if (
    typeof facts.employee_count === "number" &&
    Number.isFinite(facts.employee_count)
  ) {
    lines.push(`Employees: ${facts.employee_count.toLocaleString("en-US")}`);
  }
  if (facts.fetchedAt) lines.push(`Fetched: ${facts.fetchedAt}`);
  return lines.length ? lines.join("\n") : null;
}

function buildAnalystEstimatesSummary(row: any): string | null {
  // Minimal, deterministic “street frame” using the annex seed already surfaced on rows.
  const avgPt =
    typeof row?.avgPriceTarget === "string" ? row.avgPriceTarget : null;
  const upside = typeof row?.upsidePct === "string" ? row.upsidePct : null;
  const offAth = typeof row?.offAthPct === "string" ? row.offAthPct : null;
  const parts = [
    avgPt ? `Avg PT: ${avgPt}` : null,
    upside ? `Upside: ${upside}` : null,
    offAth ? `Off ATH: ${offAth}` : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts.join("\n") : null;
}

function buildNewsSummary(row: any): string | null {
  // Deterministic “what happened recently” summary from FD snapshot fields.
  const parts: string[] = [];
  if (row?.recent8k === true) parts.push("Recent 8-K");
  if (row?.recent10q === true) parts.push("Recent 10-Q");
  if (row?.recent10k === true) parts.push("Recent 10-K");
  if (
    typeof row?.daysSinceEarnings === "number" &&
    Number.isFinite(row.daysSinceEarnings)
  ) {
    parts.push(`Earnings: ${row.daysSinceEarnings}d ago`);
  }
  if (
    typeof row?.earningsSurprisePct === "number" &&
    Number.isFinite(row.earningsSurprisePct)
  ) {
    parts.push(`Surprise: ${row.earningsSurprisePct.toFixed(1)}%`);
  }
  if (
    typeof row?.insiderBuySellSkew === "number" &&
    Number.isFinite(row.insiderBuySellSkew)
  ) {
    parts.push(`Insiders skew: ${row.insiderBuySellSkew.toFixed(2)}`);
  }
  return parts.length ? parts.join("\n") : null;
}

function buildSpark30dFromFdCache(
  projectRoot: string,
  ticker: string,
): {
  fetchedAt?: string;
  startDate?: string;
  endDate?: string;
  rowCount?: number;
  spark30d?: Top100SparkPoint[];
} | null {
  const payload = getLatestFdCacheForTicker(projectRoot, ticker);
  if (!payload?.rows?.length) return null;

  const points: Top100SparkPoint[] = [];
  for (const row of payload.rows.slice(-45)) {
    const date = (row.date as string) ?? (row.time as string);
    const close = row.close;
    if (!date || !isFiniteNumber(close)) continue;
    points.push({ date: String(date).slice(0, 10), close });
  }

  const spark30d = points.slice(-30);
  return {
    fetchedAt: payload.fetchedAt,
    startDate: payload.startDate,
    endDate: payload.endDate,
    rowCount: payload.rowCount,
    spark30d: spark30d.length ? spark30d : undefined,
  };
}

export async function buildTop100Details(params: {
  ticker?: string;
  id?: string;
  section?: Top100StocksSection | null;
}): Promise<Top100DetailsResponse | null> {
  const ticker = normalizeTicker(params.ticker ?? "");
  const id = String(params.id ?? "").trim();
  const section =
    params.section ??
    buildTop100StocksSection({
      projectRoot: process.cwd(),
      hip3: null,
    }).section;
  if (!section) return null;

  const row = section.rows.find((r) => {
    if (id && r.id === id) return true;
    if (ticker && normalizeTicker(r.ticker) === ticker) return true;
    return false;
  });
  if (!row) return null;

  const peers = section.rows
    .filter((r) => r.category === row.category && r.id !== row.id)
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0))
    .slice(0, 8);

  const projectRoot = process.cwd();
  const resolvedTicker = normalizeTicker(row.ticker);
  const quote = readYahooQuoteFromCache(projectRoot, resolvedTicker);
  const fdCache = buildSpark30dFromFdCache(projectRoot, resolvedTicker);
  const analystEstimatesSummary = buildAnalystEstimatesSummary(row);
  const companyFactsSnapshot = buildCompanyFactsSnapshot(
    projectRoot,
    resolvedTicker,
  );
  const newsSummary = buildNewsSummary(row);

  return {
    ticker: resolvedTicker,
    row,
    quote,
    fdCache,
    peers,
    analystEstimatesSummary,
    companyFactsSnapshot,
    newsSummary,
  };
}
