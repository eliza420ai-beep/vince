#!/usr/bin/env bun
/**
 * Prewarm Financial Datasets historical cache for Dexter sleeves.
 *
 * Reads tickers from:
 * - portfolio_tastytrade.json
 * - portfolio_watchlist.json
 *
 * Fetches OHLCV history once and writes per-ticker cache files under:
 * .elizadb/financialdatasets-cache/prices/
 *
 * Usage:
 *   bun run scripts/cache-fd-portfolio-history.ts
 *   bun run scripts/cache-fd-portfolio-history.ts --years=5
 *   bun run scripts/cache-fd-portfolio-history.ts --start=2020-01-01 --end=2026-12-31
 *   bun run scripts/cache-fd-portfolio-history.ts --force
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadDexterPortfolios } from "../src/plugins/plugin-vince/src/utils/dexterPortfolio";

const PROJECT_ROOT = process.cwd();
const CACHE_DIR = path.join(
  PROJECT_ROOT,
  ".elizadb",
  "financialdatasets-cache",
  "prices",
);
const MANIFEST_PATH = path.join(
  PROJECT_ROOT,
  ".elizadb",
  "financialdatasets-cache",
  "manifest.json",
);

type PriceRow = {
  time?: string;
  date?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  [k: string]: unknown;
};

type CacheEnvelope = {
  ticker: string;
  source: "financialdatasets";
  endpoint: string;
  interval: "day";
  startDate: string;
  endDate: string;
  fetchedAt: string;
  rowCount: number;
  rows: PriceRow[];
};

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseArgs(): {
  years: number;
  startDate?: string;
  endDate?: string;
  force: boolean;
} {
  const args = process.argv.slice(2);
  let years = 5;
  let startDate: string | undefined;
  let endDate: string | undefined;
  let force = false;

  for (const arg of args) {
    if (arg.startsWith("--years=")) {
      const n = Number(arg.split("=")[1]);
      if (Number.isFinite(n) && n > 0) years = Math.floor(n);
    } else if (arg.startsWith("--start=")) {
      startDate = arg.split("=")[1];
    } else if (arg.startsWith("--end=")) {
      endDate = arg.split("=")[1];
    } else if (arg === "--force") {
      force = true;
    }
  }

  return { years, startDate, endDate, force };
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

function getTickersFromPortfolios(): string[] {
  const p = loadDexterPortfolios(PROJECT_ROOT);
  const all = [...p.tastytrade, ...p.watchlist]
    .map((s) => s.toUpperCase().trim())
    .filter(Boolean);
  return [...new Set(all)];
}

function cachePathFor(ticker: string, startDate: string, endDate: string): string {
  return path.join(CACHE_DIR, `${ticker}_${startDate}_${endDate}_day.json`);
}

async function requestJson(
  url: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(url, {
    headers: {
      "X-API-KEY": apiKey,
      Accept: "application/json",
    },
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

function extractRows(json: any): PriceRow[] {
  if (!json || typeof json !== "object") return [];
  if (Array.isArray(json.prices)) return json.prices;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.results)) return json.results;
  return [];
}

async function fetchHistorical(
  ticker: string,
  startDate: string,
  endDate: string,
  apiKey: string,
): Promise<{ endpoint: string; rows: PriceRow[] }> {
  const q = new URLSearchParams({
    ticker,
    interval: "day",
    interval_multiplier: "1",
    start_date: startDate,
    end_date: endDate,
  }).toString();

  // Try several endpoint variants to be robust across FD API versions.
  const endpoints = [
    `https://api.financialdatasets.ai/prices?${q}`,
    `https://api.financialdatasets.ai/prices/?${q}`,
    `https://api.financialdatasets.ai/prices/historical?${q}`,
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

function writeCache(filePath: string, payload: CacheEnvelope): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

function updateManifest(rows: Array<{ ticker: string; file: string; rowCount: number }>): void {
  ensureDir(path.dirname(MANIFEST_PATH));
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "financialdatasets",
    files: rows,
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

async function main(): Promise<void> {
  const { years, startDate: startOverride, endDate: endOverride, force } = parseArgs();
  const apiKey = process.env.FINANCIAL_DATASETS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "FINANCIAL_DATASETS_API_KEY is required. Set it in .env before running this cache prewarm.",
    );
  }

  const { startDate, endDate } = getDateRange(years, startOverride, endOverride);
  const tickers = getTickersFromPortfolios();

  if (tickers.length === 0) {
    console.log(
      "[fd-cache] No tickers found in portfolio_tastytrade.json / portfolio_watchlist.json",
    );
    return;
  }

  console.log(
    `[fd-cache] Prewarming ${tickers.length} tickers (${startDate} → ${endDate}), force=${force}`,
  );

  const manifestRows: Array<{ ticker: string; file: string; rowCount: number }> = [];
  let hit = 0;
  let miss = 0;

  for (const ticker of tickers) {
    const file = cachePathFor(ticker, startDate, endDate);
    if (!force && fs.existsSync(file)) {
      hit++;
      const text = fs.readFileSync(file, "utf-8");
      try {
        const parsed = JSON.parse(text) as CacheEnvelope;
        manifestRows.push({ ticker, file: path.relative(PROJECT_ROOT, file), rowCount: parsed.rowCount ?? 0 });
      } catch {
        manifestRows.push({ ticker, file: path.relative(PROJECT_ROOT, file), rowCount: 0 });
      }
      console.log(`[fd-cache] hit ${ticker}`);
      continue;
    }

    miss++;
    const { endpoint, rows } = await fetchHistorical(ticker, startDate, endDate, apiKey);
    const payload: CacheEnvelope = {
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
    writeCache(file, payload);
    manifestRows.push({ ticker, file: path.relative(PROJECT_ROOT, file), rowCount: rows.length });
    console.log(`[fd-cache] miss ${ticker} -> cached ${rows.length} rows`);
  }

  updateManifest(manifestRows);
  console.log(
    `[fd-cache] done | hits=${hit} misses=${miss} | manifest=${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`,
  );
}

main().catch((err) => {
  console.error(`[fd-cache] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

