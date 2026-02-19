/**
 * Auto-discover BTC price-threshold contracts from Gamma API.
 * Filters by question patterns, extracts strike and expiry.
 */

import { logger } from "@elizaos/core";
import type { ContractMeta } from "../types";
import { DEFAULT_GAMMA_API_URL } from "../constants";
import {
  ARB_DISCOVERY_TAG_SLUGS,
  BTC_THRESHOLD_QUESTION_PATTERNS,
} from "../constants";

const GAMMA_MARKETS_PATH = "/markets";
const REQUEST_TIMEOUT_MS = 15_000;

interface GammaMarketRow {
  conditionId?: string;
  id?: string;
  question?: string;
  slug?: string;
  clobTokenIds?: string | string[];
  outcomes?: string | string[];
  endDate?: string;
  endDateIso?: string;
  active?: boolean;
  closed?: boolean;
  [key: string]: unknown;
}

/** Parse strike from question text: $110,000 or 110k -> 110000 */
function parseStrikeFromQuestion(question: string): number | null {
  for (const pattern of BTC_THRESHOLD_QUESTION_PATTERNS) {
    const m = question.match(pattern);
    if (!m?.[1]) continue;
    let s = m[1].replace(/,/g, "").trim();
    const mult = s.toLowerCase().endsWith("k") ? 1000 : 1;
    if (mult > 1) s = s.slice(0, -1);
    const n = parseFloat(s);
    if (Number.isFinite(n)) return n * mult;
  }
  // Fallback: any $ number or Nk
  const fallback = question.match(/\$?([\d,]+)(?:\.\d+)?\s*(k|K)?/);
  if (fallback?.[1]) {
    const n = parseFloat(fallback[1].replace(/,/g, ""));
    const k = fallback[2] ? 1000 : 1;
    if (Number.isFinite(n)) return n * k;
  }
  return null;
}

/** Parse expiry from endDate/endDateIso (ISO string) */
function parseExpiryMs(row: GammaMarketRow): number | null {
  const raw =
    row.endDate ??
    row.endDateIso ??
    (row as { end_date_iso?: string }).end_date_iso;
  if (!raw || typeof raw !== "string") return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/** Get YES/NO token IDs from Gamma row */
function getTokenIds(row: GammaMarketRow): { yes: string; no: string } | null {
  let ids: string[] = [];
  try {
    const raw = row.clobTokenIds;
    if (typeof raw === "string") ids = JSON.parse(raw);
    else if (Array.isArray(raw)) ids = raw;
    else return null;
  } catch {
    return null;
  }
  if (ids.length < 2) return null;
  const outcomes = (() => {
    try {
      const o = row.outcomes;
      if (typeof o === "string") return JSON.parse(o) as string[];
      if (Array.isArray(o)) return o;
    } catch {
      // ignore
    }
    return ["Yes", "No"];
  })();
  const yesIdx = outcomes.findIndex((x) => x?.toLowerCase() === "yes");
  const noIdx = outcomes.findIndex((x) => x?.toLowerCase() === "no");
  const yesId = yesIdx >= 0 ? ids[yesIdx] : ids[0];
  const noId = noIdx >= 0 ? ids[noIdx] : ids[1];
  return { yes: yesId, no: noId };
}

function isBtcThresholdQuestion(question: string): boolean {
  if (!question || typeof question !== "string") return false;
  const q = question.toLowerCase();
  if (!q.includes("btc") && !q.includes("bitcoin")) return false;
  return BTC_THRESHOLD_QUESTION_PATTERNS.some((p) => p.test(question));
}

/**
 * Fetch markets from Gamma and return BTC threshold contracts with strike and expiry.
 */
export async function discoverBtcContracts(
  gammaApiUrl: string = process.env.POLYMARKET_GAMMA_API_URL ??
    DEFAULT_GAMMA_API_URL,
): Promise<ContractMeta[]> {
  const base = gammaApiUrl.replace(/\/$/, "");
  const results: ContractMeta[] = [];
  const seen = new Set<string>();

  for (const tagSlug of ARB_DISCOVERY_TAG_SLUGS) {
    try {
      const url = `${base}${GAMMA_MARKETS_PATH}?active=true&closed=false&limit=200&tag_slug=${encodeURIComponent(tagSlug)}`;
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(to);
      if (!res.ok) continue;
      const data = (await res.json()) as
        | GammaMarketRow[]
        | { data?: GammaMarketRow[] };
      const rows = Array.isArray(data)
        ? data
        : ((data as { data?: GammaMarketRow[] }).data ?? []);
      for (const row of rows) {
        const conditionId = row.conditionId ?? row.id;
        if (!conditionId || seen.has(conditionId)) continue;
        const question = row.question ?? "";
        if (!isBtcThresholdQuestion(question)) continue;
        const strike = parseStrikeFromQuestion(question);
        const expiryMs = parseExpiryMs(row);
        const tokens = getTokenIds(row);
        if (
          strike == null ||
          expiryMs == null ||
          !tokens ||
          expiryMs <= Date.now()
        )
          continue;
        seen.add(conditionId);
        results.push({
          conditionId: String(conditionId),
          question,
          yesTokenId: tokens.yes,
          noTokenId: tokens.no,
          strikeUsd: strike,
          expiryMs,
          endDateIso: (row.endDate ?? row.endDateIso) as string | undefined,
        });
      }
    } catch (err) {
      logger.debug(`[ContractDiscovery] Tag ${tagSlug}: ${err}`);
    }
  }

  // If tag_slug filtering returns nothing, try single bulk fetch (some Gamma versions use different params)
  if (results.length === 0) {
    try {
      const url = `${base}${GAMMA_MARKETS_PATH}?active=true&closed=false&limit=500`;
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(to);
      if (res.ok) {
        const data = (await res.json()) as
          | GammaMarketRow[]
          | { data?: GammaMarketRow[] };
        const rows = Array.isArray(data)
          ? data
          : ((data as { data?: GammaMarketRow[] }).data ?? []);
        for (const row of rows) {
          const conditionId = row.conditionId ?? row.id;
          if (!conditionId || seen.has(conditionId)) continue;
          const question = row.question ?? "";
          if (!isBtcThresholdQuestion(question)) continue;
          const strike = parseStrikeFromQuestion(question);
          const expiryMs = parseExpiryMs(row);
          const tokens = getTokenIds(row);
          if (
            strike == null ||
            expiryMs == null ||
            !tokens ||
            expiryMs <= Date.now()
          )
            continue;
          seen.add(conditionId);
          results.push({
            conditionId: String(conditionId),
            question,
            yesTokenId: tokens.yes,
            noTokenId: tokens.no,
            strikeUsd: strike,
            expiryMs,
            endDateIso: (row.endDate ?? row.endDateIso) as string | undefined,
          });
        }
      }
    } catch (err) {
      logger.warn("[ContractDiscovery] Bulk fetch failed: " + err);
    }
  }

  logger.info(
    "[ContractDiscovery] Discovered " +
      results.length +
      " BTC threshold contracts",
  );
  return results;
}
