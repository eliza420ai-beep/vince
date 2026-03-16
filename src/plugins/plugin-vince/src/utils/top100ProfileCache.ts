import * as fs from "node:fs";
import * as path from "node:path";

export interface Top100ProfileEnvelope {
  ticker: string;
  marketCap?: number;
  currency?: string;
  avgVolume?: number;
  updatedAt: string;
}

function getProfileCacheDir(projectRoot: string = process.cwd()): string {
  return path.join(projectRoot, ".elizadb", "top100-profiles");
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readProfileFromCache(
  projectRootOrTicker: string,
  maybeTicker?: string,
): Top100ProfileEnvelope | null {
  const projectRoot =
    maybeTicker !== undefined ? projectRootOrTicker : process.cwd();
  const ticker = (maybeTicker ?? projectRootOrTicker).toUpperCase().trim();
  const dir = getProfileCacheDir(projectRoot);
  if (!fs.existsSync(dir)) return null;
  const filePath = path.join(dir, `${ticker}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Top100ProfileEnvelope;
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

export function writeProfileToCache(
  projectRoot: string,
  envelope: Top100ProfileEnvelope,
): void {
  const dir = getProfileCacheDir(projectRoot);
  ensureDir(dir);
  const ticker = envelope.ticker.toUpperCase().trim();
  const filePath = path.join(dir, `${ticker}.json`);
  const payload: Top100ProfileEnvelope = {
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
