/**
 * Response guards for knowledge-grounded recommendations.
 * - extractRecommendationNames: parse **Name** and "Name—" from text
 * - loadPlacesAllowlist: load allowed place names from knowledge/the-good-life/allowlist-places.txt
 * Used by recommendPlace (and tests) to ensure we never surface invented venue names.
 */

import * as fs from "fs";
import * as path from "path";

/** Extract recommendation names from text: **Name** or "Name—" pattern. */
export function extractRecommendationNames(text: string): string[] {
  const bold = text.match(/\*\*([^*]+)\*\*/g);
  const names = (bold ?? []).map((s) => s.replace(/\*\*/g, "").trim());
  const dash = text.match(/([A-Za-zÀ-ÿ0-9\s'-]+)\s*—/g);
  const fromDash = (dash ?? []).map((s) => s.replace(/\s*—\s*$/, "").trim()).filter(Boolean);
  const combined = [...new Set([...names, ...fromDash])];
  return combined.filter((n) => n.length > 2);
}

const ALLOWLIST_PLACES_PATH = "knowledge/the-good-life/allowlist-places.txt";

/** Cached allowlist: loaded once and reused. */
let allowlistCache: { list: string[]; at: number } | null = null;
const ALLOWLIST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

/** Load allowed place names from project knowledge. Cached 5 min. Returns empty array if file missing. */
export function loadPlacesAllowlist(): string[] {
  const now = Date.now();
  if (allowlistCache && now - allowlistCache.at < ALLOWLIST_CACHE_TTL_MS) {
    return allowlistCache.list;
  }
  const fullPath = path.join(process.cwd(), ALLOWLIST_PLACES_PATH);
  if (!fs.existsSync(fullPath)) {
    allowlistCache = { list: [], at: now };
    return [];
  }
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    const list = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    allowlistCache = { list, at: now };
    return list;
  } catch {
    allowlistCache = { list: [], at: now };
    return [];
  }
}

/** True if every extracted name is on the allowlist (or allowlist is empty / guard disabled). */
export function allNamesOnAllowlist(text: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  const names = extractRecommendationNames(text);
  const lowerList = allowlist.map((a) => a.toLowerCase());
  return names.every((n) => {
    const lower = n.toLowerCase();
    return lowerList.some((a) => a.includes(lower) || lower.includes(a));
  });
}
