/**
 * MandoMinutes context for X-Research.
 * When available (same runtime or shared cache), pulse/vibe can frame output with "today's news".
 */

import type { IAgentRuntime } from '@elizaos/core';

const MANDO_RAW_CACHE_KEY = 'mando_minutes:latest:v9';

export interface MandoContextForX {
  vibeCheck: string;
  headlines: string[];
}

/**
 * Get MandoMinutes context for X research when available.
 * 1. Prefer VinceNewsSentimentService (getVibeCheck + getTopHeadlines).
 * 2. Fallback: runtime cache mando_minutes:latest:v9 (raw articles).
 * Returns null if neither source has data (e.g. ECHO-only, cache empty).
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
    const raw = await runtime.getCache<{ articles?: Array<{ title: string; url?: string }> }>(MANDO_RAW_CACHE_KEY);
    if (!raw?.articles?.length) {
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
