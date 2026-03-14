/**
 * Dexter portfolio loader — single source of truth for monitored tickers.
 *
 * Reads the three portfolio JSONs (HL, tastytrade, watchlist) from repo root
 * so VINCE context and monitoring are scoped to Dexter's sleeves.
 * Core crypto is fixed: BTC, SOL, HYPE (see BTC.md, SOL.md, HYPE.md).
 */

import fs from "node:fs";
import path from "node:path";

export interface DexterPortfolioAsset {
  symbol: string;
  target_weight_pct: number;
}

export interface DexterPortfolioFile {
  sleeve: string;
  assets: DexterPortfolioAsset[];
  [key: string]: unknown;
}

export interface DexterPortfolios {
  hyperliquid: string[];
  tastytrade: string[];
  watchlist: string[];
  coreCrypto: ["BTC", "SOL", "HYPE"];
}

const PORTFOLIO_FILES = [
  "portfolio_hyperliquid.json",
  "portfolio_tastytrade.json",
  "portfolio_watchlist.json",
] as const;

const CORE_CRYPTO: ["BTC", "SOL", "HYPE"] = ["BTC", "SOL", "HYPE"];

/**
 * Resolve repo root: prefer process.cwd() (ElizaOS start dir), fallback to plugin dir parent chain.
 */
function resolveRootDir(): string {
  const cwd = process.cwd();
  for (const name of PORTFOLIO_FILES) {
    if (fs.existsSync(path.join(cwd, name))) return cwd;
  }
  return cwd;
}

/**
 * Load one portfolio file; return list of symbols or empty array on error.
 */
function loadSleeveSymbols(rootDir: string, filename: string): string[] {
  const filepath = path.join(rootDir, filename);
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    const data = JSON.parse(raw) as DexterPortfolioFile;
    if (Array.isArray(data?.assets)) {
      return data.assets
        .map((a) => (a && typeof a.symbol === "string" ? a.symbol.trim() : ""))
        .filter(Boolean);
    }
  } catch {
    // missing or invalid — return []
  }
  return [];
}

/**
 * Load all three Dexter portfolio JSONs and return ticker lists per sleeve.
 * Core crypto is always BTC, SOL, HYPE. Does not throw; missing files yield empty arrays.
 */
export function loadDexterPortfolios(rootDir?: string): DexterPortfolios {
  const root = rootDir ?? resolveRootDir();

  const hyperliquid = loadSleeveSymbols(root, "portfolio_hyperliquid.json");
  const tastytrade = loadSleeveSymbols(root, "portfolio_tastytrade.json");
  const watchlist = loadSleeveSymbols(root, "portfolio_watchlist.json");

  return {
    hyperliquid,
    tastytrade,
    watchlist,
    coreCrypto: [...CORE_CRYPTO],
  };
}

/**
 * Format for context: one line per sleeve + core crypto.
 */
export function formatDexterUniverseForContext(
  portfolios: DexterPortfolios,
): string {
  const lines: string[] = ["**Dexter universe (monitor these)**"];
  if (portfolios.hyperliquid.length > 0) {
    lines.push(`HL sleeve: ${portfolios.hyperliquid.join(", ")}`);
  }
  if (portfolios.tastytrade.length > 0) {
    lines.push(`Tastytrade sleeve: ${portfolios.tastytrade.join(", ")}`);
  }
  if (portfolios.watchlist.length > 0) {
    lines.push(`Watchlist: ${portfolios.watchlist.join(", ")}`);
  }
  lines.push(
    `Core crypto: ${portfolios.coreCrypto.join(", ")} (see BTC.md, SOL.md, HYPE.md).`,
  );
  return lines.join("\n");
}

/** Set of all tickers we monitor (HL + tastytrade + watchlist + core crypto). Uppercase. */
export function getDexterUniverseSet(
  portfolios?: DexterPortfolios,
): Set<string> {
  const p = portfolios ?? loadDexterPortfolios();
  const all = [
    ...p.hyperliquid,
    ...p.tastytrade,
    ...p.watchlist,
    ...p.coreCrypto,
  ].map((s) => s.toUpperCase().trim());
  return new Set(all);
}

/** True if asset (e.g. BTC, NVDA) is in the Dexter monitoring universe. */
export function isInDexterUniverse(
  asset: string,
  portfolios?: DexterPortfolios,
): boolean {
  return getDexterUniverseSet(portfolios).has(asset.toUpperCase().trim());
}

/** One-line summary for standup: paper vs Dexter universe. */
export function getDexterDriftSummary(
  portfolios: DexterPortfolios,
  openAssets: string[],
): string {
  const set = getDexterUniverseSet(portfolios);
  const inUniverse = openAssets.filter((a) => set.has(a.toUpperCase()));
  const watchlistNoPaper = portfolios.watchlist.filter(
    (s) => !openAssets.some((a) => a.toUpperCase() === s.toUpperCase()),
  );
  const parts: string[] = [];
  parts.push(`${openAssets.length} paper open`);
  parts.push(`${inUniverse.length} in Dexter universe`);
  if (watchlistNoPaper.length > 0) {
    parts.push(`${watchlistNoPaper.length} watchlist names with no paper`);
  }
  return `Dexter drift: ${parts.join("; ")}.`;
}
