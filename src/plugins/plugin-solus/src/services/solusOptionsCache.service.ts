/**
 * SolusOptionsCacheService — In-memory cache for SOLUS_OPTIONS_CONTEXT.
 * Used by SOLUS_OPTIONS_REFRESH task and by the options context provider so
 * the first request after idle is fast when the task has run.
 */

import { Service, type IAgentRuntime } from "@elizaos/core";

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 min

export interface CachedOptionsContext {
  text: string;
  optionsByAsset: Record<string, { spot: number; atmIV: number }>;
  fetchedAt: number;
}

export class SolusOptionsCacheService extends Service {
  static serviceType = "SOLUS_OPTIONS_CACHE_SERVICE";
  capabilityDescription =
    "Cache for Solus Deribit options context (warm refresh)";

  private cache: CachedOptionsContext | null = null;
  private ttlMs = DEFAULT_TTL_MS;

  constructor(protected runtime: IAgentRuntime) {
    super();
    const env = process.env.SOLUS_OPTIONS_CACHE_TTL_MS;
    if (env != null) {
      const n = parseInt(env, 10);
      if (!Number.isNaN(n) && n > 0) this.ttlMs = n;
    }
  }

  getCached(): CachedOptionsContext | null {
    if (!this.cache) return null;
    if (Date.now() - this.cache.fetchedAt > this.ttlMs) return null;
    return this.cache;
  }

  setCached(data: Omit<CachedOptionsContext, "fetchedAt">): void {
    this.cache = {
      ...data,
      fetchedAt: Date.now(),
    };
  }

  isFresh(): boolean {
    return this.getCached() != null;
  }

  async stop(): Promise<void> {
    this.cache = null;
  }
}
