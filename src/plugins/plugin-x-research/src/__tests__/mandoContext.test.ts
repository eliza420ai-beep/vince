/**
 * getMandoContextForX unit tests.
 * When MandoMinutes data is unavailable (no service, no cache), returns null.
 * With mock service or mock cache, returns expected shape.
 */

import { describe, it, expect, vi } from 'vitest';
import { getMandoContextForX } from '../utils/mandoContext';
import type { IAgentRuntime } from '@elizaos/core';

describe('getMandoContextForX', () => {
  it('returns null when runtime has no news service and no cache', async () => {
    const orig = process.env.MANDO_SHARED_CACHE_PATH;
    process.env.MANDO_SHARED_CACHE_PATH = '/tmp/does-not-exist-mando-test-12345.json';
    try {
      const runtime = {
        getService: vi.fn(() => null),
        getCache: vi.fn(() => Promise.resolve(undefined)),
      } as unknown as IAgentRuntime;

      const result = await getMandoContextForX(runtime);
      expect(result).toBeNull();
    } finally {
      if (orig !== undefined) process.env.MANDO_SHARED_CACHE_PATH = orig;
      else delete process.env.MANDO_SHARED_CACHE_PATH;
    }
  });

  it('returns null when news service has no data (hasData false)', async () => {
    const runtime = {
      getService: vi.fn(() => ({
        hasData: () => false,
        getVibeCheck: () => 'No news data yet.',
        getTopHeadlines: () => [],
      })),
      getCache: vi.fn(() => Promise.resolve(undefined)),
    } as unknown as IAgentRuntime;

    const result = await getMandoContextForX(runtime);
    expect(result).toBeNull();
  });

  it('returns expected shape when news service has data', async () => {
    const runtime = {
      getService: vi.fn(() => ({
        hasData: () => true,
        getVibeCheck: () => 'Risk-off: regulatory, Vitalik ETH.',
        getTopHeadlines: (n: number) =>
          Array.from({ length: Math.min(n, 3) }, (_, i) => ({ title: `Headline ${i + 1}` })),
      })),
      getCache: vi.fn(() => Promise.resolve(undefined)),
    } as unknown as IAgentRuntime;

    const result = await getMandoContextForX(runtime);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('vibeCheck', 'Risk-off: regulatory, Vitalik ETH.');
    expect(result).toHaveProperty('headlines');
    expect(Array.isArray(result!.headlines)).toBe(true);
    expect(result!.headlines.length).toBeGreaterThan(0);
    expect(result!.headlines[0]).toBe('Headline 1');
  });

  it('returns expected shape when only cache has data (no news service)', async () => {
    const runtime = {
      getService: vi.fn(() => null),
      getCache: vi.fn((key: string) => {
        if (key === 'mando_minutes:latest:v9') {
          return Promise.resolve({
            articles: [
              { title: 'SEC approves spot ETF' },
              { title: 'Ethereum upgrade live' },
            ],
          });
        }
        return Promise.resolve(undefined);
      }),
    } as unknown as IAgentRuntime;

    const result = await getMandoContextForX(runtime);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('vibeCheck');
    expect(result!.vibeCheck).toContain('Headlines:');
    expect(result).toHaveProperty('headlines');
    expect(result!.headlines).toEqual(['SEC approves spot ETF', 'Ethereum upgrade live']);
  });

  it('returns null when cache has empty articles', async () => {
    const orig = process.env.MANDO_SHARED_CACHE_PATH;
    process.env.MANDO_SHARED_CACHE_PATH = '/tmp/does-not-exist-mando-test-12345.json';
    try {
      const runtime = {
        getService: vi.fn(() => null),
        getCache: vi.fn(() => Promise.resolve({ articles: [] })),
      } as unknown as IAgentRuntime;

      const result = await getMandoContextForX(runtime);
      expect(result).toBeNull();
    } finally {
      if (orig !== undefined) process.env.MANDO_SHARED_CACHE_PATH = orig;
      else delete process.env.MANDO_SHARED_CACHE_PATH;
    }
  });
});
