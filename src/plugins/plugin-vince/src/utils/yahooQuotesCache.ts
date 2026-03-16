import * as fs from "node:fs";
import * as path from "node:path";

export interface YahooQuoteEnvelope {
  ticker: string;
  price?: number;
  change1dPct?: number;
  marketCap?: number;
  currency?: string;
  avgVolume?: number;
  updatedAt: string;
}

function getYahooCacheDir(projectRoot: string = process.cwd()): string {
  return path.join(projectRoot, ".elizadb", "yahoo-quotes");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readYahooQuoteFromCache(
  projectRootOrTicker: string,
  maybeTicker?: string,
): YahooQuoteEnvelope | null {
  const projectRoot =
    maybeTicker !== undefined ? projectRootOrTicker : process.cwd();
  const ticker = (maybeTicker ?? projectRootOrTicker).toUpperCase().trim();
  const dir = getYahooCacheDir(projectRoot);
  if (!fs.existsSync(dir)) return null;
  const filePath = path.join(dir, `${ticker}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as YahooQuoteEnvelope;
    if (!parsed || typeof parsed !== "object") return null;
    if (
      typeof parsed.ticker !== "string" ||
      parsed.ticker.toUpperCase().trim() !== ticker
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeYahooQuoteToCache(
  projectRoot: string,
  envelope: YahooQuoteEnvelope,
): void {
  const dir = getYahooCacheDir(projectRoot);
  ensureDir(dir);
  const ticker = envelope.ticker.toUpperCase().trim();
  const filePath = path.join(dir, `${ticker}.json`);
  const payload: YahooQuoteEnvelope = {
    ...envelope,
    ticker,
    updatedAt: envelope.updatedAt ?? new Date().toISOString(),
  };
  try {
    fs.writeFileSync(filePath, JSON.stringify(payload));
  } catch {
    // best-effort cache write; ignore filesystem errors
  }
}
