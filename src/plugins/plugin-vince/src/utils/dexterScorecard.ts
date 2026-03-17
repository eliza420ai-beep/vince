import * as fs from "node:fs";
import * as path from "node:path";

export type DexterSleeve = "tastytrade" | "hyperliquid" | "watchlist";

export interface DexterScorecardTicker {
  symbol: string;
  sleeve?: DexterSleeve;
  sector?: string;
  industry?: string;
  composite?: number;
  factors?: Record<
    string,
    { score?: number; metrics?: Record<string, unknown> }
  >;
  flags?: string[];
}

export interface DexterScorecardFile {
  generatedAt?: string;
  tickerCount?: number;
  weights?: Record<string, number>;
  tickers?: DexterScorecardTicker[];
}

export interface DexterScorecardIndex {
  generatedAtMs: number | null;
  tickerCount: number;
  weights?: Record<string, number>;
  bySymbol: Map<string, DexterScorecardTicker & { rank?: number }>;
}

let cache: {
  mtimeMs: number;
  index: DexterScorecardIndex;
} | null = null;

function safeParseGeneratedAtMs(input?: string): number | null {
  if (!input) return null;
  const ms = Date.parse(input);
  return Number.isFinite(ms) ? ms : null;
}

function normalizeSymbol(sym: string): string {
  return sym.toUpperCase().trim();
}

export function loadDexterScorecard(
  projectRoot: string = process.cwd(),
): DexterScorecardIndex | null {
  const filePath = path.join(path.resolve(projectRoot), "scorecard.json");
  if (!fs.existsSync(filePath)) return null;

  const stat = fs.statSync(filePath);
  if (cache && cache.mtimeMs === stat.mtimeMs) return cache.index;

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as DexterScorecardFile;
  const tickers = Array.isArray(parsed.tickers) ? parsed.tickers : [];

  const generatedAtMs = safeParseGeneratedAtMs(parsed.generatedAt);
  const tickerCount =
    typeof parsed.tickerCount === "number" &&
    Number.isFinite(parsed.tickerCount)
      ? parsed.tickerCount
      : tickers.length;

  const bySymbol = new Map<string, DexterScorecardTicker & { rank?: number }>();
  const ranked = [...tickers]
    .filter((t) => t && typeof t.symbol === "string" && t.symbol.trim() !== "")
    .map((t) => ({
      ...t,
      symbol: normalizeSymbol(t.symbol),
      composite:
        typeof t.composite === "number" && Number.isFinite(t.composite)
          ? t.composite
          : undefined,
      flags: Array.isArray(t.flags) ? t.flags : undefined,
    }))
    .sort((a, b) => (b.composite ?? -Infinity) - (a.composite ?? -Infinity));

  ranked.forEach((t, idx) => {
    bySymbol.set(t.symbol, { ...t, rank: idx + 1 });
  });

  const index: DexterScorecardIndex = {
    generatedAtMs,
    tickerCount,
    weights:
      parsed.weights && typeof parsed.weights === "object"
        ? parsed.weights
        : undefined,
    bySymbol,
  };

  cache = { mtimeMs: stat.mtimeMs, index };
  return index;
}
