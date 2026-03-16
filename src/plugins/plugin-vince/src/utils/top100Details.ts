import { buildTop100StocksSection } from "./top100Enrichment";
import { getLatestFdCacheForTicker } from "./financialDatasetsCache";
import {
  readYahooQuoteFromCache,
  type YahooQuoteEnvelope,
} from "./yahooQuotesCache";

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
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function normalizeTicker(t: string): string {
  return t.toUpperCase().trim();
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

export async function buildTop100Details(
  tickerRaw: string,
): Promise<Top100DetailsResponse | null> {
  const ticker = normalizeTicker(tickerRaw);
  if (!ticker) return null;

  const built = buildTop100StocksSection({
    projectRoot: process.cwd(),
    hip3: null,
  });
  const section = built.section;
  if (!section) return null;

  const row = section.rows.find((r) => normalizeTicker(r.ticker) === ticker);
  if (!row) return null;

  const peers = section.rows
    .filter(
      (r) =>
        r.category === row.category && normalizeTicker(r.ticker) !== ticker,
    )
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0))
    .slice(0, 8);

  const projectRoot = process.cwd();
  const quote = readYahooQuoteFromCache(projectRoot, ticker);
  const fdCache = buildSpark30dFromFdCache(projectRoot, ticker);

  return {
    ticker,
    row,
    quote,
    fdCache,
    peers,
  };
}
