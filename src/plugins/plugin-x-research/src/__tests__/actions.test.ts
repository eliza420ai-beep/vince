/**
 * Action Validation Tests
 * 
 * Tests the validate functions of each action to ensure
 * proper trigger detection.
 */

import { describe, it, expect, vi } from 'vitest';
import { xPulseAction } from '../actions/xPulse.action';
import { xVibeAction } from '../actions/xVibe.action';
import { xThreadAction } from '../actions/xThread.action';
import { xAccountAction } from '../actions/xAccount.action';
import { xNewsAction, truncateSummary } from '../actions/xNews.action';
import type { Memory, IAgentRuntime } from '@elizaos/core';

// Mock runtime
const mockRuntime = {} as IAgentRuntime;

// Helper to create a mock memory with text
function createMemory(text: string): Memory {
  return {
    content: { text },
    userId: 'test-user',
    agentId: 'test-agent',
    roomId: 'test-room',
  } as Memory;
}

describe('X_PULSE Action', () => {
  describe('validate', () => {
    it('should trigger on "x pulse"', async () => {
      const result = await xPulseAction.validate!(mockRuntime, createMemory('x pulse'));
      expect(result).toBe(true);
    });

    it('should trigger on "what\'s ct saying"', async () => {
      const result = await xPulseAction.validate!(mockRuntime, createMemory("what's ct saying about btc"));
      expect(result).toBe(true);
    });

    it('should trigger on "crypto twitter"', async () => {
      const result = await xPulseAction.validate!(mockRuntime, createMemory('crypto twitter sentiment'));
      expect(result).toBe(true);
    });

    it('should trigger on "vibe check x"', async () => {
      const result = await xPulseAction.validate!(mockRuntime, createMemory('vibe check x'));
      expect(result).toBe(true);
    });

    it('should not trigger on unrelated message', async () => {
      const result = await xPulseAction.validate!(mockRuntime, createMemory('what is the price of btc'));
      expect(result).toBe(false);
    });
  });

  it('should have proper metadata', () => {
    expect(xPulseAction.name).toBe('X_PULSE');
    expect(xPulseAction.description).toBeDefined();
    expect(xPulseAction.examples?.length).toBeGreaterThan(0);
    expect(xPulseAction.similes?.length).toBeGreaterThan(0);
  });
});

describe('X_VIBE Action', () => {
  describe('validate', () => {
    it('should trigger on "vibe on ETH"', async () => {
      const result = await xVibeAction.validate!(mockRuntime, createMemory("what's the vibe on ETH"));
      expect(result).toBe(true);
    });

    it('should trigger on "BTC sentiment"', async () => {
      const result = await xVibeAction.validate!(mockRuntime, createMemory('BTC sentiment check'));
      expect(result).toBe(true);
    });

    it('should trigger on topic + mood keyword', async () => {
      const result = await xVibeAction.validate!(mockRuntime, createMemory('feeling about solana'));
      expect(result).toBe(true);
    });

    it('should not trigger without topic', async () => {
      const result = await xVibeAction.validate!(mockRuntime, createMemory('what is the vibe'));
      expect(result).toBe(false);
    });

    it('should not trigger without vibe keyword', async () => {
      const result = await xVibeAction.validate!(mockRuntime, createMemory('tell me about BTC'));
      expect(result).toBe(false);
    });
  });

  it('should have proper metadata', () => {
    expect(xVibeAction.name).toBe('X_VIBE');
    expect(xVibeAction.description).toBeDefined();
  });
});

describe('X_THREAD Action', () => {
  describe('validate', () => {
    it('should trigger on x.com URL', async () => {
      const result = await xThreadAction.validate!(
        mockRuntime, 
        createMemory('summarize this thread: https://x.com/user/status/123456789')
      );
      expect(result).toBe(true);
    });

    it('should trigger on twitter.com URL', async () => {
      const result = await xThreadAction.validate!(
        mockRuntime, 
        createMemory('get thread https://twitter.com/user/status/123456789')
      );
      expect(result).toBe(true);
    });

    it('should trigger on thread + tweet ID', async () => {
      const result = await xThreadAction.validate!(
        mockRuntime, 
        createMemory('summarize thread 1234567890123456789')
      );
      expect(result).toBe(true);
    });

    it('should trigger on tldr request with ID', async () => {
      const result = await xThreadAction.validate!(
        mockRuntime, 
        createMemory('tldr 1234567890123456789')
      );
      expect(result).toBe(true);
    });

    it('should not trigger without URL or ID', async () => {
      const result = await xThreadAction.validate!(
        mockRuntime, 
        createMemory('tell me about threads')
      );
      expect(result).toBe(false);
    });
  });

  it('should have proper metadata', () => {
    expect(xThreadAction.name).toBe('X_THREAD');
    expect(xThreadAction.description).toContain('thread');
  });
});

describe('X_ACCOUNT Action', () => {
  describe('validate', () => {
    it('should trigger on "who is @user"', async () => {
      const result = await xAccountAction.validate!(
        mockRuntime, 
        createMemory('who is @crediblecrypto')
      );
      expect(result).toBe(true);
    });

    it('should trigger on "tell me about @user"', async () => {
      const result = await xAccountAction.validate!(
        mockRuntime, 
        createMemory('tell me about @DegenSpartan')
      );
      expect(result).toBe(true);
    });

    it('should trigger on "analyze @user"', async () => {
      const result = await xAccountAction.validate!(
        mockRuntime, 
        createMemory('analyze @Tetranode')
      );
      expect(result).toBe(true);
    });

    it('should not trigger without @username', async () => {
      const result = await xAccountAction.validate!(
        mockRuntime, 
        createMemory('who is crediblecrypto')
      );
      expect(result).toBe(false);
    });

    it('should not trigger without account query', async () => {
      const result = await xAccountAction.validate!(
        mockRuntime, 
        createMemory('@crediblecrypto posted something')
      );
      expect(result).toBe(false);
    });
  });

  it('should have proper metadata', () => {
    expect(xAccountAction.name).toBe('X_ACCOUNT');
    expect(xAccountAction.description).toContain('account');
  });
});

describe('X_NEWS Action', () => {
  describe('validate', () => {
    it('should trigger on "crypto news"', async () => {
      const result = await xNewsAction.validate!(
        mockRuntime, 
        createMemory('crypto news')
      );
      expect(result).toBe(true);
    });

    it('should trigger on "x news"', async () => {
      const result = await xNewsAction.validate!(
        mockRuntime, 
        createMemory('x news')
      );
      expect(result).toBe(true);
    });

    it('should trigger on "what\'s happening"', async () => {
      const result = await xNewsAction.validate!(
        mockRuntime, 
        createMemory("what's happening in crypto")
      );
      expect(result).toBe(true);
    });

    it('should trigger on "ct news"', async () => {
      const result = await xNewsAction.validate!(
        mockRuntime, 
        createMemory('ct news')
      );
      expect(result).toBe(true);
    });

    it('should not trigger on unrelated message', async () => {
      const result = await xNewsAction.validate!(
        mockRuntime, 
        createMemory('what is the price')
      );
      expect(result).toBe(false);
    });
  });

  it('should have proper metadata', () => {
    expect(xNewsAction.name).toBe('X_NEWS');
    expect(xNewsAction.description).toContain('news');
  });

  describe('truncateSummary', () => {
    it('truncates long summary at word boundary and appends ...', () => {
      const longSummary =
        'Prominent analyst Benjamin Cowen argued Thursday that fading memecoin hype signals crypto maturation with capital shifting to stronger assets like Bitcoin and Ethereum.';
      const out = truncateSummary(longSummary, 100);
      expect(out).toEndWith('...');
      expect(out.length).toBeLessThanOrEqual(103);
      const beforeEllipsis = out.slice(0, -3).trim();
      expect(beforeEllipsis.length).toBeLessThanOrEqual(100);
      expect(beforeEllipsis).toMatch(/\w$/);
    });

    it('returns full summary when under limit', () => {
      const short = 'BTC ETF sees record inflows.';
      expect(truncateSummary(short, 420)).toBe(short);
    });

    it('when over limit, does not cut mid-word', () => {
      const threeHundred =
        'A'.repeat(200) + ' word ' + 'B'.repeat(100);
      const out = truncateSummary(threeHundred, 250);
      expect(out).toEndWith('...');
      const idx = out.lastIndexOf(' ');
      expect(idx).toBeGreaterThan(0);
      expect(out.slice(0, idx).trim().length).toBeLessThanOrEqual(250);
    });
  });
});
