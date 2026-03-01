/**
 * Shared watchlist path and loaders.
 * Same file as X_WATCHLIST action and skills/x-research CLI.
 * Used so sentiment can weight "people we care about" (watchlist) higher in pulse/vibe.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface WatchlistAccount {
  username: string;
  note?: string;
  addedAt: string;
}

interface WatchlistFile {
  accounts: WatchlistAccount[];
}

export function getWatchlistPath(): string {
  const envPath = process.env.X_WATCHLIST_PATH;
  if (envPath) return envPath;
  return join(process.cwd(), "skills", "x-research", "data", "watchlist.json");
}

export function loadWatchlist(): WatchlistAccount[] {
  const path = getWatchlistPath();
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw) as WatchlistFile;
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

/** Usernames from watchlist (lowercase) for tier override in sentiment. */
export function loadWatchlistUsernames(): string[] {
  return loadWatchlist().map((a) => a.username.trim().toLowerCase());
}
