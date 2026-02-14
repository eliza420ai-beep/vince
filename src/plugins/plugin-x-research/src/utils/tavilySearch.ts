/**
 * Optional web search via Tavily API for Clawterm day report.
 * When TAVILY_API_KEY is set, returns snippet strings; otherwise returns [].
 * Same pattern as plugin-vince/src/utils/webSearch.ts.
 */

import type { IAgentRuntime } from '@elizaos/core';
import { logger } from '@elizaos/core';

const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const DEFAULT_MAX_SNIPPETS = 3;

function getTavilyApiKey(runtime?: IAgentRuntime): string | null {
  const fromRuntime = runtime?.getSetting?.('TAVILY_API_KEY');
  if (typeof fromRuntime === 'string' && fromRuntime.trim()) return fromRuntime.trim();
  const fromEnv = process.env.TAVILY_API_KEY;
  if (typeof fromEnv === 'string' && fromEnv.trim()) return fromEnv.trim();
  return null;
}

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
  answer?: string;
}

/**
 * Run a Tavily search and return content snippets for report context.
 * Returns [] if TAVILY_API_KEY is not set or the request fails.
 */
export async function tavilySearch(
  query: string,
  runtime?: IAgentRuntime,
  maxResults: number = DEFAULT_MAX_SNIPPETS
): Promise<string[]> {
  const apiKey = getTavilyApiKey(runtime);
  if (!apiKey) return [];

  const limit = Math.min(Math.max(1, maxResults), 5);
  try {
    const res = await fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: limit,
        search_depth: 'basic',
        include_answer: false,
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status, query }, 'Tavily search request failed');
      return [];
    }

    const data = (await res.json()) as TavilyResponse;
    const results = data.results ?? [];
    const snippets: string[] = [];
    for (const r of results) {
      if (r.content && r.content.trim()) {
        snippets.push(r.content.trim());
        if (snippets.length >= maxResults) break;
      }
    }
    return snippets;
  } catch (err) {
    logger.warn({ err, query }, 'Tavily search error');
    return [];
  }
}
