/**
 * getMandoContextForX unit tests.
 * When MandoMinutes data is unavailable (no service, no cache), returns null.
 * With mock service or mock cache, returns expected shape.
 */

import { describe, it, expect, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

  it('returns null when news service has empty vibeCheck or empty headlines', async () => {
    const runtime = {
      getService: vi.fn(() => ({
        hasData: () => true,
        getVibeCheck: () => '',
        getTopHeadlines: () => [{ title: 'A' }],
      })),
      getCache: vi.fn(() => Promise.resolve(undefined)),
    } as unknown as IAgentRuntime;

    const result = await getMandoContextForX(runtime);
    expect(result).toBeNull();
  });

  it('returns null when news service throws', async () => {
    const runtime = {
      getService: vi.fn(() => ({
        hasData: () => true,
        getVibeCheck: () => {
          throw new Error('Service error');
        },
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

  it('filters headlines with empty/undefined title from news service', async () => {
    const runtime = {
      getService: vi.fn(() => ({
        hasData: () => true,
        getVibeCheck: () => 'Vibe',
        getTopHeadlines: () => [{ title: '' }, { title: 'Headline A' }, { title: undefined }],
      })),
      getCache: vi.fn(() => Promise.resolve(undefined)),
    } as unknown as IAgentRuntime;

    const result = await getMandoContextForX(runtime);
    expect(result).not.toBeNull();
    expect(result!.headlines).toEqual(['Headline A']);
  });

  it('falls through to file when cache throws', async () => {
    const testDir = join(tmpdir(), `mando-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const filePath = join(testDir, 'mando.json');
    writeFileSync(
      filePath,
      JSON.stringify({
        articles: [{ title: 'File headline' }],
        timestamp: Date.now(),
      }),
      'utf-8'
    );
    const orig = process.env.MANDO_SHARED_CACHE_PATH;
    process.env.MANDO_SHARED_CACHE_PATH = filePath;
    try {
      const runtime = {
        getService: vi.fn(() => null),
        getCache: vi.fn(() => Promise.reject(new Error('Cache error'))),
      } as unknown as IAgentRuntime;

      const result = await getMandoContextForX(runtime);
      expect(result).not.toBeNull();
      expect(result!.headlines).toContain('File headline');
    } finally {
      if (orig !== undefined) process.env.MANDO_SHARED_CACHE_PATH = orig;
      else delete process.env.MANDO_SHARED_CACHE_PATH;
    }
  });

  it('returns expected shape from file fallback when valid', async () => {
    const testDir = join(tmpdir(), `mando-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const filePath = join(testDir, 'mando_valid.json');
    writeFileSync(
      filePath,
      JSON.stringify({
        articles: [{ title: 'A' }, { title: 'B' }],
        timestamp: Date.now(),
      }),
      'utf-8'
    );
    const orig = process.env.MANDO_SHARED_CACHE_PATH;
    process.env.MANDO_SHARED_CACHE_PATH = filePath;
    try {
      const runtime = {
        getService: vi.fn(() => null),
        getCache: vi.fn(() => Promise.resolve(undefined)),
      } as unknown as IAgentRuntime;

      const result = await getMandoContextForX(runtime);
      expect(result).not.toBeNull();
      expect(result!.vibeCheck).toContain('Headlines:');
      expect(result!.headlines).toEqual(['A', 'B']);
    } finally {
      if (orig !== undefined) process.env.MANDO_SHARED_CACHE_PATH = orig;
      else delete process.env.MANDO_SHARED_CACHE_PATH;
    }
  });

  it('returns null when file has invalid JSON', async () => {
    const testDir = join(tmpdir(), `mando-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const filePath = join(testDir, 'mando_invalid.json');
    writeFileSync(filePath, 'not valid json {', 'utf-8');
    const orig = process.env.MANDO_SHARED_CACHE_PATH;
    process.env.MANDO_SHARED_CACHE_PATH = filePath;
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

  it('returns null from file when timestamp is expired', async () => {
    const testDir = join(tmpdir(), `mando-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const filePath = join(testDir, 'mando_expired.json');
    const origMaxAge = process.env.MANDO_SHARED_CACHE_MAX_AGE_MS;
    process.env.MANDO_SHARED_CACHE_MAX_AGE_MS = '1000'; // 1 second
    writeFileSync(
      filePath,
      JSON.stringify({
        articles: [{ title: 'Old' }],
        timestamp: Date.now() - 86400000 * 2, // 2 days ago
      }),
      'utf-8'
    );
    const orig = process.env.MANDO_SHARED_CACHE_PATH;
    process.env.MANDO_SHARED_CACHE_PATH = filePath;
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
      if (origMaxAge !== undefined) process.env.MANDO_SHARED_CACHE_MAX_AGE_MS = origMaxAge;
      else delete process.env.MANDO_SHARED_CACHE_MAX_AGE_MS;
    }
  });
});
