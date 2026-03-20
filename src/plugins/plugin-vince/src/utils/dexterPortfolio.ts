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

/** Rich sleeve asset for FD ingestion and analytics: preserves provenance and target weight. */
export interface SleeveAssetRow {
  ticker: string;
  sleeve: string;
  targetWeightPct: number;
  paramsProfile?: string;
  snapshotAt: number;
}

export interface DexterPortfolioFile {
  sleeve: string;
  assets: DexterPortfolioAsset[];
  params_profile?: string;
  [key: string]: unknown;
}

export interface DexterPortfolios {
  hyperliquid: string[];
  tastytrade: string[];
  watchlist: string[];
  coreCrypto: ["BTC", "SOL", "HYPE"];
}

export const DEXTER_PORTFOLIO_FILENAMES = [
  "portfolio_hyperliquid.json",
  "portfolio_tastytrade.json",
  "portfolio_watchlist.json",
] as const;

const PORTFOLIO_FILES = DEXTER_PORTFOLIO_FILENAMES;

const CORE_CRYPTO: ["BTC", "SOL", "HYPE"] = ["BTC", "SOL", "HYPE"];

let dexterArtifactStartupLogged = false;

/**
 * Root directory for Dexter artifacts: portfolio JSONs, optional `.dexter/scorecard.json`, cache.
 *
 * Precedence:
 * 1. `DEXTER_ARTIFACT_ROOT` when set (absolute or relative path, trimmed) — use for Railway/deploy when
 *    files are synced or mounted outside repo root.
 * 2. Else `process.cwd()` if any `portfolio_*.json` exists there (local dev with files in vince root).
 * 3. Else `process.cwd()` (empty universe until files appear or env is set).
 */
export function resolveDexterArtifactRoot(): string {
  const fromEnv = process.env.DEXTER_ARTIFACT_ROOT?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  const cwd = process.cwd();
  for (const name of PORTFOLIO_FILES) {
    if (fs.existsSync(path.join(cwd, name))) return cwd;
  }
  return cwd;
}

export interface DexterArtifactLogSink {
  info: (msg: string) => void;
}

/**
 * One startup line: resolved root, source (env vs cwd), portfolio files present, scorecard present.
 * Safe to call from every agent that loads plugin-vince; logs at most once per process.
 */
export function logDexterArtifactResolutionOnce(
  log: DexterArtifactLogSink,
): void {
  if (dexterArtifactStartupLogged) return;
  dexterArtifactStartupLogged = true;

  const root = resolveDexterArtifactRoot();
  const envSet = Boolean(process.env.DEXTER_ARTIFACT_ROOT?.trim());
  const src = envSet ? "DEXTER_ARTIFACT_ROOT" : "cwd";

  const portfolioParts = PORTFOLIO_FILES.map((name) => {
    const ok = fs.existsSync(path.join(root, name));
    return `${name.replace(".json", "")}:${ok ? "ok" : "missing"}`;
  });

  const scoreDexter = path.join(root, ".dexter", "scorecard.json");
  const scoreRoot = path.join(root, "scorecard.json");
  const scoreOk = fs.existsSync(scoreDexter) || fs.existsSync(scoreRoot);
  const scoreWhich = fs.existsSync(scoreDexter)
    ? ".dexter/scorecard.json"
    : fs.existsSync(scoreRoot)
      ? "scorecard.json"
      : null;

  log.info(
    `[plugin-vince] Dexter artifacts (${src}) root=${root} | ${portfolioParts.join(" ")} | scorecard:${scoreOk ? `ok (${scoreWhich})` : "missing"}`,
  );
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
 * Load one portfolio file as rich sleeve assets (ticker, sleeve, target weight, params profile).
 * Returns [] on missing/invalid file. snapshotAt is set to current time for reproducibility.
 */
function loadSleeveAssets(
  rootDir: string,
  filename: string,
  snapshotAt: number = Date.now(),
): SleeveAssetRow[] {
  const filepath = path.join(rootDir, filename);
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    const data = JSON.parse(raw) as DexterPortfolioFile;
    const sleeve =
      data?.sleeve ??
      path.basename(filename, ".json").replace("portfolio_", "");
    const paramsProfile =
      typeof data?.params_profile === "string"
        ? data.params_profile
        : undefined;
    if (!Array.isArray(data?.assets)) return [];
    return data.assets
      .filter(
        (a) => a && typeof a.symbol === "string" && a.symbol.trim() !== "",
      )
      .map((a) => ({
        ticker: (a.symbol as string).trim().toUpperCase(),
        sleeve,
        targetWeightPct:
          typeof a.target_weight_pct === "number" &&
          Number.isFinite(a.target_weight_pct)
            ? a.target_weight_pct
            : 0,
        paramsProfile,
        snapshotAt,
      }));
  } catch {
    return [];
  }
}

/**
 * Load all sleeve assets from the three portfolio JSONs with full metadata.
 * Use this for FD ingestion and any analytics that must keep ticker, sleeve, and target weight together.
 * Core crypto (BTC, SOL, HYPE) are not included; they are fixed in code.
 */
export function loadDexterPortfolioAssets(rootDir?: string): SleeveAssetRow[] {
  const root = rootDir ?? resolveDexterArtifactRoot();
  const snapshotAt = Date.now();
  const hl = loadSleeveAssets(root, "portfolio_hyperliquid.json", snapshotAt);
  const tt = loadSleeveAssets(root, "portfolio_tastytrade.json", snapshotAt);
  const wl = loadSleeveAssets(root, "portfolio_watchlist.json", snapshotAt);
  return [...hl, ...tt, ...wl];
}

/** Tickers from tastytrade + watchlist only (for FD cache prewarm). Deduplicated, uppercase. */
export function getFdSleeveTickers(rootDir?: string): string[] {
  const assets = loadDexterPortfolioAssets(rootDir);
  const fdSleeves = new Set(["tastytrade", "watchlist"]);
  const tickers = assets
    .filter((a) => fdSleeves.has(a.sleeve))
    .map((a) => a.ticker);
  return [...new Set(tickers)];
}

/**
 * Load all three Dexter portfolio JSONs and return ticker lists per sleeve.
 * Core crypto is always BTC, SOL, HYPE. Does not throw; missing files yield empty arrays.
 */
export function loadDexterPortfolios(rootDir?: string): DexterPortfolios {
  const root = rootDir ?? resolveDexterArtifactRoot();

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
