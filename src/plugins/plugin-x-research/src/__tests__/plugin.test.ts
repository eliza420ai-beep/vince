/**
 * Plugin Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { xResearchPlugin } from '../index';

describe('xResearchPlugin', () => {
  it('should export a valid plugin', () => {
    expect(xResearchPlugin).toBeDefined();
    expect(xResearchPlugin.name).toBe('plugin-x-research');
  });

  it('should have all expected actions', () => {
    const actionNames = xResearchPlugin.actions.map(a => a.name);
    
    expect(actionNames).toContain('X_PULSE');
    expect(actionNames).toContain('X_VIBE');
    expect(actionNames).toContain('X_THREAD');
    expect(actionNames).toContain('X_ACCOUNT');
    expect(actionNames).toContain('X_NEWS');
    expect(actionNames).toContain('X_WATCHLIST');
    expect(actionNames).toContain('X_SAVE_RESEARCH');
  });

  it('should have 7 total actions (pulse, vibe, thread, account, news, watchlist, save)', () => {
    expect(xResearchPlugin.actions.length).toBe(7);
  });

  describe('X_PULSE action', () => {
    const xPulse = xResearchPlugin.actions.find(a => a.name === 'X_PULSE');

    it('should exist', () => {
      expect(xPulse).toBeDefined();
    });

    it('should have description', () => {
      expect(xPulse?.description).toBeDefined();
      expect(xPulse?.description.length).toBeGreaterThan(0);
    });

    it('should have examples', () => {
      expect(xPulse?.examples).toBeDefined();
      expect(xPulse?.examples?.length).toBeGreaterThan(0);
    });

    it('should have similes', () => {
      expect(xPulse?.similes).toBeDefined();
      expect(xPulse?.similes?.length).toBeGreaterThan(0);
    });
  });

  describe('X_VIBE action', () => {
    const xVibe = xResearchPlugin.actions.find(a => a.name === 'X_VIBE');

    it('should exist', () => {
      expect(xVibe).toBeDefined();
    });

    it('should have description mentioning quick sentiment', () => {
      expect(xVibe?.description?.toLowerCase()).toContain('sentiment');
    });
  });

  describe('X_THREAD action', () => {
    const xThread = xResearchPlugin.actions.find(a => a.name === 'X_THREAD');

    it('should exist', () => {
      expect(xThread).toBeDefined();
    });

    it('should have description mentioning thread', () => {
      expect(xThread?.description?.toLowerCase()).toContain('thread');
    });
  });

  describe('X_ACCOUNT action', () => {
    const xAccount = xResearchPlugin.actions.find(a => a.name === 'X_ACCOUNT');

    it('should exist', () => {
      expect(xAccount).toBeDefined();
    });

    it('should have description mentioning account', () => {
      expect(xAccount?.description?.toLowerCase()).toContain('account');
    });
  });

  describe('X_NEWS action', () => {
    const xNews = xResearchPlugin.actions.find(a => a.name === 'X_NEWS');

    it('should exist', () => {
      expect(xNews).toBeDefined();
    });

    it('should have description mentioning news', () => {
      expect(xNews?.description?.toLowerCase()).toContain('news');
    });
  });
});

describe('Plugin exports', () => {
  it('should export types', async () => {
    const exports = await import('../types');
    expect(exports).toBeDefined();
  });

  it('should export constants', async () => {
    const exports = await import('../constants');
    expect(exports.ALL_TOPICS).toBeDefined();
    expect(exports.KEYWORD_MAP).toBeDefined();
    expect(exports.ALL_QUALITY_ACCOUNTS).toBeDefined();
  });

  it('should export services', async () => {
    const exports = await import('../services');
    expect(exports.XClientService).toBeDefined();
    expect(exports.XSentimentService).toBeDefined();
    expect(exports.XSearchService).toBeDefined();
  });
});
