/**
 * X Trends Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { XTrendsService, getXTrendsService } from '../services/xTrends.service';

const mockClient = {
  getTrends: vi.fn(),
  getCounts: vi.fn(),
};

vi.mock('../services/xClient.service', () => ({
  getXClient: () => mockClient,
}));

describe('XTrendsService', () => {
  let service: XTrendsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new XTrendsService(mockClient as any);
  });

  describe('getTrends', () => {
    it('fetches and caches trends', async () => {
      const trends = [
        { trendName: 'Bitcoin', tweetVolume: 10000 },
        { trendName: 'Ethereum', tweetVolume: 5000 },
      ];
      mockClient.getTrends.mockResolvedValue({ data: trends });
      const result = await service.getTrends();
      expect(result).toEqual(trends);
      expect(mockClient.getTrends).toHaveBeenCalledTimes(1);
      const cached = await service.getTrends();
      expect(cached).toEqual(trends);
      expect(mockClient.getTrends).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCryptoTrends', () => {
    it('filters by crypto category', async () => {
      mockClient.getTrends.mockResolvedValue({
        data: [
          { trendName: 'Crypto', category: 'Crypto' },
          { trendName: 'Sports', category: 'Sports' },
        ],
      });
      const result = await service.getCryptoTrends();
      expect(result.length).toBe(1);
      expect(result[0].trendName).toBe('Crypto');
    });

    it('filters by keyword match', async () => {
      mockClient.getTrends.mockResolvedValue({
        data: [
          { trendName: 'Bitcoin ETF' },
          { trendName: 'Weather' },
        ],
      });
      const result = await service.getCryptoTrends();
      expect(result.length).toBe(1);
      expect(result[0].trendName).toBe('Bitcoin ETF');
    });
  });

  describe('getOurTopicsTrending', () => {
    it('returns trending status for topics', async () => {
      mockClient.getTrends.mockResolvedValue({
        data: [
          { trendName: 'bitcoin' },
          { trendName: 'ethereum' },
        ],
      });
      const result = await service.getOurTopicsTrending();
      expect(Array.isArray(result)).toBe(true);
      const btc = result.find((r) => r.topic === 'btc');
      expect(btc?.isTrending).toBe(true);
    });
  });

  describe('getTrendVolume', () => {
    it('returns null for unknown topic', async () => {
      const result = await service.getTrendVolume('unknown_xyz');
      expect(result).toBeNull();
    });

    it('returns volume for valid topic', async () => {
      mockClient.getCounts.mockResolvedValue({
        data: [
          { start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z', tweetCount: 100 },
          { start: '2024-01-01T01:00:00Z', end: '2024-01-01T02:00:00Z', tweetCount: 120 },
          { start: '2024-01-01T02:00:00Z', end: '2024-01-01T03:00:00Z', tweetCount: 110 },
          { start: '2024-01-01T03:00:00Z', end: '2024-01-01T04:00:00Z', tweetCount: 115 },
          { start: '2024-01-01T04:00:00Z', end: '2024-01-01T05:00:00Z', tweetCount: 105 },
          { start: '2024-01-01T05:00:00Z', end: '2024-01-01T06:00:00Z', tweetCount: 130 },
        ],
      });
      const result = await service.getTrendVolume('btc');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('topic', 'btc');
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('avg24h');
      expect(result).toHaveProperty('percentChange');
    });
  });

  describe('getTrendingSummary', () => {
    it('returns trending, cryptoTrends, volumeSpikes', async () => {
      mockClient.getTrends.mockResolvedValue({
        data: [{ trendName: 'bitcoin' }],
      });
      mockClient.getCounts.mockResolvedValue({
        data: Array.from({ length: 6 }, (_, i) => ({
          start: `2024-01-01T0${i}:00:00Z`,
          end: `2024-01-01T0${i + 1}:00:00Z`,
          tweetCount: 100,
        })),
      });
      const result = await service.getTrendingSummary();
      expect(result).toHaveProperty('trending');
      expect(result).toHaveProperty('cryptoTrends');
      expect(result).toHaveProperty('volumeSpikes');
    });
  });
});

describe('getXTrendsService', () => {
  it('returns singleton instance', () => {
    const a = getXTrendsService();
    const b = getXTrendsService();
    expect(a).toBe(b);
  });
});
