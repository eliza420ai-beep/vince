/**
 * MandoMinutes context for X-Research.
 * When available (same runtime or shared cache), pulse/vibe can frame output with "today's news".
 */

import fs from 'node:fs';
import path from 'node:path';
import type { IAgentRuntime } from '@elizaos/core';

const MANDO_RAW_CACHE_KEY = 'mando_minutes:latest:v9';

const MANDO_SHARED_CACHE_MAX_AGE_MS =
  Number(process.env.MANDO_SHARED_CACHE_MAX_AGE_MS) || 86400000; // 24h

export interface MandoContextForX {
  vibeCheck: string;
  headlines: string[];
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
      const vibeCheck = typeof news.getVibeCheck === 'function' ? news.getVibeCheck() : '';
      const topHeadlines = typeof news.getTopHeadlines === 'function' ? news.getTopHeadlines(8) : [];
      if (!vibeCheck || vibeCheck === 'No news data yet.' || topHeadlines.length === 0) {
        return null;
      }
      return {
        vibeCheck,
        headlines: topHeadlines.map((n) => n.title ?? '').filter(Boolean),
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
      const headlines = raw.articles.map((a) => a.title ?? '').filter(Boolean);
      const vibeCheck =
        'Headlines: ' +
        raw.articles
          .slice(0, 5)
          .map((a) => a.title)
          .join('; ')
          .slice(0, 150);
      return { vibeCheck, headlines };
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
    const headlines = raw.articles.map((a) => a.title ?? '').filter(Boolean);
    const vibeCheck =
      'Headlines: ' +
      raw.articles
        .slice(0, 5)
        .map((a) => a.title)
        .join('; ')
        .slice(0, 150);
    return { vibeCheck, headlines };
  } catch {
    return null;
  }
}
