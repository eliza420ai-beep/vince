/**
 * Crypto intel watchlist (Phase 5).
 * File: watchlist.json
 */

import * as fs from "fs";
import * as path from "path";
import type { WatchlistEntry, WatchlistFile } from "../types/cryptoIntelMemory";

const WATCHLIST_FILE = "watchlist.json";

export async function readWatchlist(
  memoryDir: string,
): Promise<WatchlistFile | null> {
  const filepath = path.join(memoryDir, WATCHLIST_FILE);
  if (!fs.existsSync(filepath)) return null;
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    const obj = JSON.parse(raw) as WatchlistFile;
    if (!obj || !Array.isArray(obj.items)) return null;
    return obj;
  } catch {
    return null;
  }
}

export async function writeWatchlist(
  memoryDir: string,
  data: WatchlistFile,
): Promise<void> {
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  const filepath = path.join(memoryDir, WATCHLIST_FILE);
  const payload: WatchlistFile = {
    version: data.version ?? 1,
    lastUpdated: new Date().toISOString(),
    items: data.items ?? [],
  };
  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), "utf-8");
}
