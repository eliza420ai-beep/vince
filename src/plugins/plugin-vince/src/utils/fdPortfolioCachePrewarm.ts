import * as fs from "node:fs";
import * as path from "node:path";
import { getFdSleeveTickers } from "./dexterPortfolio";

export type FdPriceRow = {
  time?: string;
  date?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  [k: string]: unknown;
};

export type FdCacheEnvelope = {
  ticker: string;
  source: "financialdatasets";
  endpoint: string;
  interval: "day";
  startDate: string;
  endDate: string;
  fetchedAt: string;
  rowCount: number;
  rows: FdPriceRow[];
};

export type FdCacheManifest = {
  generatedAt: string;
  source: "financialdatasets";
  files: Array<{ ticker: string; file: string; rowCount: number }>;
};

export type FdPrewarmOptions = {
  projectRoot?: string;
  years?: number;
  startDate?: string;
  endDate?: string;
  force?: boolean;
  apiKey?: string;
  /** When set, use these tickers instead of sleeve tickers from portfolio files. */
  tickers?: string[];
  /** Max concurrent price fetches. Default 8. */
  concurrency?: number;
};

export type FdPrewarmResult = {
  startDate: string;
  endDate: string;
  tickerCount: number;
  hits: number;
  misses: number;
  manifestPath: string;
  files: Array<{ ticker: string; file: string; rowCount: number }>;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function getDateRange(
  years: number,
  startOverride?: string,
  endOverride?: string,
): { startDate: string; endDate: string } {
  const end = endOverride ? new Date(endOverride) : new Date();
  const start = startOverride
    ? new Date(startOverride)
    : new Date(end.getFullYear() - years, end.getMonth(), end.getDate());
  return {
    startDate: isoDate(start),
    endDate: isoDate(end),
  };
}

function requestJson(
  url: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number; json: unknown }> {
  return fetch(url, {
    headers: {
      "X-API-KEY": apiKey,
      Accept: "application/json",
    },
  }).then(async (res) => {
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json };
  });
}

function extractRows(payload: unknown): FdPriceRow[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.prices)) return obj.prices as FdPriceRow[];
  if (Array.isArray(obj.data)) return obj.data as FdPriceRow[];
  if (Array.isArray(obj.results)) return obj.results as FdPriceRow[];
  return [];
}

async function fetchHistorical(
  ticker: string,
  startDate: string,
  endDate: string,
  apiKey: string,
): Promise<{ endpoint: string; rows: FdPriceRow[] }> {
  const query = new URLSearchParams({
    ticker,
    interval: "day",
    interval_multiplier: "1",
    start_date: startDate,
    end_date: endDate,
  }).toString();

  const endpoints = [
    `https://api.financialdatasets.ai/prices?${query}`,
    `https://api.financialdatasets.ai/prices/?${query}`,
    `https://api.financialdatasets.ai/prices/historical?${query}`,
  ];

  let lastErr = "";
  for (const endpoint of endpoints) {
    const out = await requestJson(endpoint, apiKey);
    const rows = extractRows(out.json);
    if (out.ok && rows.length > 0) {
      return { endpoint, rows };
    }
    lastErr = `status=${out.status} body=${JSON.stringify(out.json).slice(0, 300)}`;
  }

  throw new Error(
    `Failed to fetch ${ticker} historical prices from Financial Datasets. ${lastErr}`,
  );
}

function getTickersFromPortfolios(projectRoot: string): string[] {
  return getFdSleeveTickers(projectRoot);
}

function getCacheDir(projectRoot: string): string {
  return path.join(
    projectRoot,
    ".elizadb",
    "financialdatasets-cache",
    "prices",
  );
}

function getManifestPath(projectRoot: string): string {
  return path.join(
    projectRoot,
    ".elizadb",
    "financialdatasets-cache",
    "manifest.json",
  );
}

function cachePathFor(
  projectRoot: string,
  ticker: string,
  startDate: string,
  endDate: string,
): string {
  return path.join(
    getCacheDir(projectRoot),
    `${ticker}_${startDate}_${endDate}_day.json`,
  );
}

export function readFdCacheManifest(
  projectRoot = process.cwd(),
): FdCacheManifest | null {
  const manifestPath = getManifestPath(projectRoot);
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const raw = fs.readFileSync(manifestPath, "utf-8");
    return JSON.parse(raw) as FdCacheManifest;
  } catch {
    return null;
  }
}

export async function prewarmFdPortfolioHistoryCache(
  opts: FdPrewarmOptions = {},
): Promise<FdPrewarmResult> {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const years =
    opts.years && Number.isFinite(opts.years) && opts.years > 0
      ? Math.floor(opts.years)
      : 5;
  const force = opts.force === true;
  const apiKey = (
    opts.apiKey ??
    process.env.FINANCIAL_DATASETS_API_KEY ??
    ""
  ).trim();
  if (!apiKey) {
    throw new Error(
      "FINANCIAL_DATASETS_API_KEY is required. Set it in .env before running cache prewarm.",
    );
  }

  const { startDate, endDate } = getDateRange(
    years,
    opts.startDate,
    opts.endDate,
  );
  const tickers =
    opts.tickers && opts.tickers.length > 0
      ? [...new Set(opts.tickers.map((t) => t.toUpperCase().trim()))]
      : getTickersFromPortfolios(projectRoot);
  if (tickers.length === 0) {
    return {
      startDate,
      endDate,
      tickerCount: 0,
      hits: 0,
      misses: 0,
      manifestPath: getManifestPath(projectRoot),
      files: [],
    };
  }

  const files: Array<{ ticker: string; file: string; rowCount: number }> = [];
  let hits = 0;
  let misses = 0;
  const concurrency = Math.max(1, Math.min(32, opts.concurrency ?? 8));

  async function processOne(ticker: string): Promise<void> {
    const filePath = cachePathFor(projectRoot, ticker, startDate, endDate);
    if (!force && fs.existsSync(filePath)) {
      hits++;
      let rowCount = 0;
      try {
        const parsed = JSON.parse(
          fs.readFileSync(filePath, "utf-8"),
        ) as FdCacheEnvelope;
        rowCount = parsed.rowCount ?? 0;
      } catch {
        rowCount = 0;
      }
      files.push({
        ticker,
        file: path.relative(projectRoot, filePath),
        rowCount,
      });
      return;
    }

    misses++;
    try {
      const { endpoint, rows } = await fetchHistorical(
        ticker,
        startDate,
        endDate,
        apiKey,
      );
      const payload: FdCacheEnvelope = {
        ticker,
        source: "financialdatasets",
        endpoint,
        interval: "day",
        startDate,
        endDate,
        fetchedAt: new Date().toISOString(),
        rowCount: rows.length,
        rows,
      };
      ensureDir(path.dirname(filePath));
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
      files.push({
        ticker,
        file: path.relative(projectRoot, filePath),
        rowCount: rows.length,
      });
    } catch (error) {
      console.warn(
        `[fdPortfolioCachePrewarm] skipping ${ticker}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  for (let i = 0; i < tickers.length; i += concurrency) {
    const chunk = tickers.slice(i, i + concurrency);
    await Promise.all(chunk.map(processOne));
  }

  const manifest: FdCacheManifest = {
    generatedAt: new Date().toISOString(),
    source: "financialdatasets",
    files,
  };
  const manifestPath = getManifestPath(projectRoot);
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  return {
    startDate,
    endDate,
    tickerCount: tickers.length,
    hits,
    misses,
    manifestPath,
    files,
  };
}
