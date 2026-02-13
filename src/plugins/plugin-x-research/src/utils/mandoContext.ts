/**
 * MandoMinutes context for X-Research.
 * When available (same runtime or shared cache), pulse/vibe can frame output with "today's news".
 * Price-snapshot lines are filtered out so ECHO never displays stale prices.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { IAgentRuntime } from '@elizaos/core';

const MANDO_RAW_CACHE_KEY = 'mando_minutes:latest:v9';

const MANDO_SHARED_CACHE_MAX_AGE_MS =
  Number(process.env.MANDO_SHARED_CACHE_MAX_AGE_MS) || 86400000; // 24h

/** Pattern: ASSET: $?number[kKmMbB]? (optional % change). Avoids surfacing stale prices in ECHO. */
const PRICE_SNAPSHOT_REGEX =
  /\b(BTC|ETH|SOL|BNB|BTC\.D):\s*\$?[\d,.]+[kmb]?\s*(\([+-]?\d+\.?\d*%?\))?/gi;
const CRYPTO_PRICES_LABEL = /Cryptocurrency\s+Prices|^Prices:\s*/i;
const PRICE_PLACEHOLDER = 'Market snapshot omitted; ask VINCE for prices.';

export interface MandoContextForX {
  vibeCheck: string;
  headlines: string[];
}

/**
 * Returns true if the line looks like a price snapshot or a "Cryptocurrency Prices" block,
 * so we can filter it from headlines and sanitize vibeCheck (avoid stale prices in ECHO).
 */
export function isPriceLikeHeadline(title: string): boolean {
  if (!title || typeof title !== 'string') return false;
  const t = title.trim();
  if (CRYPTO_PRICES_LABEL.test(t)) return true;
  PRICE_SNAPSHOT_REGEX.lastIndex = 0;
  return PRICE_SNAPSHOT_REGEX.test(t);
}

/**
 * Remove price-snapshot segments from a vibe string. If the whole string is price-like, return placeholder.
 */
function sanitizeVibeCheck(vibe: string): string {
  if (!vibe || typeof vibe !== 'string') return vibe;
  if (isPriceLikeHeadline(vibe)) return PRICE_PLACEHOLDER;
  const priceRe = new RegExp(PRICE_SNAPSHOT_REGEX.source, 'gi');
  let out = vibe.replace(priceRe, '').replace(CRYPTO_PRICES_LABEL, '');
  out = out.replace(/\s*;\s*;\s*/g, '; ').replace(/^\s*;\s*|;\s*$/g, '').trim();
  if (!out || out.length < 10) return PRICE_PLACEHOLDER;
  return out.slice(0, 150);
}

/**
 * Get MandoMinutes context for X research when available.
 * 1. Prefer VinceNewsSentimentService (getVibeCheck + getTopHeadlines).
 * 2. Fallback: runtime cache mando_minutes:latest:v9 (raw articles).
 * 3. Fallback: shared file at .elizadb/shared/mando_minutes_latest_v9.json (for ECHO-only runs).
 * Returns null if no source has data.
 */
export async function getMandoContextForX(
  runtime: IAgentRuntime
): Promise<MandoContextForX | null> {
  const news = runtime.getService('VINCE_NEWS_SENTIMENT_SERVICE') as
    | { getVibeCheck?: () => string; getTopHeadlines?: (limit: number) => Array<{ title: string }>; hasData?: () => boolean }
    | null;

  if (news) {
    try {
      if (typeof news.hasData === 'function' && !news.hasData()) {
        return null;
      }
      const rawVibe = typeof news.getVibeCheck === 'function' ? news.getVibeCheck() : '';
      const topHeadlines = typeof news.getTopHeadlines === 'function' ? news.getTopHeadlines(8) : [];
      const headlines = topHeadlines
        .map((n) => n.title ?? '')
        .filter((t) => Boolean(t) && !isPriceLikeHeadline(t));
      if (!rawVibe || rawVibe === 'No news data yet.' || headlines.length === 0) {
        return null;
      }
      return {
        vibeCheck: sanitizeVibeCheck(rawVibe),
        headlines,
      };
    } catch {
      return null;
    }
  }

  try {
    const raw = await runtime.getCache<{
      articles?: Array<{ title: string; url?: string }>;
      timestamp?: number;
    }>(MANDO_RAW_CACHE_KEY);
    if (raw?.articles?.length) {
      const headlines = raw.articles
        .map((a) => a.title ?? '')
        .filter((t) => Boolean(t) && !isPriceLikeHeadline(t));
      const rawVibe =
        'Headlines: ' +
        raw.articles
          .slice(0, 5)
          .map((a) => a.title)
          .join('; ')
          .slice(0, 150);
      return { vibeCheck: sanitizeVibeCheck(rawVibe), headlines };
    }
  } catch {
    // ignore
  }

  const sharedPath =
    process.env.MANDO_SHARED_CACHE_PATH ||
    path.join(process.cwd(), '.elizadb', 'shared', 'mando_minutes_latest_v9.json');
  if (!fs.existsSync(sharedPath)) return null;
  try {
    const content = fs.readFileSync(sharedPath, 'utf-8');
    const raw = JSON.parse(content) as {
      articles?: Array<{ title: string; url?: string }>;
      timestamp?: number;
    };
    if (!Array.isArray(raw?.articles) || raw.articles.length === 0) return null;
    if (
      typeof raw.timestamp === 'number' &&
      Date.now() - raw.timestamp > MANDO_SHARED_CACHE_MAX_AGE_MS
    ) {
      return null;
    }
    const headlines = raw.articles
      .map((a) => a.title ?? '')
      .filter((t) => Boolean(t) && !isPriceLikeHeadline(t));
    const rawVibe =
      'Headlines: ' +
      raw.articles
        .slice(0, 5)
        .map((a) => a.title)
        .join('; ')
        .slice(0, 150);
    return { vibeCheck: sanitizeVibeCheck(rawVibe), headlines };
  } catch {
    return null;
  }
}
