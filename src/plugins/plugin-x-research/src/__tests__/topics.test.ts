/**
 * Topics & Constants Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  ALL_TOPICS, 
  TOPIC_BY_ID, 
  FOCUS_TICKERS,
  CORE_ASSETS,
  TRADING_TOPICS,
  ECOSYSTEM_TOPICS,
  META_TOPICS,
} from '../constants/topics';
import { 
  BULLISH_KEYWORDS, 
  BEARISH_KEYWORDS, 
  KEYWORD_MAP,
  ALL_KEYWORDS,
} from '../constants/sentimentKeywords';
import { 
  ALL_QUALITY_ACCOUNTS, 
  getAccountTier, 
  getAccountReliability,
  ACCOUNT_BY_USERNAME,
} from '../constants/qualityAccounts';

describe('Topics', () => {
  it('should have all required topic categories', () => {
    expect(CORE_ASSETS.length).toBeGreaterThan(0);
    expect(TRADING_TOPICS.length).toBeGreaterThan(0);
    expect(ECOSYSTEM_TOPICS.length).toBeGreaterThan(0);
    expect(META_TOPICS.length).toBeGreaterThan(0);
  });

  it('should include BTC, ETH, SOL in focus tickers', () => {
    expect(FOCUS_TICKERS).toContain('BTC');
    expect(FOCUS_TICKERS).toContain('ETH');
    expect(FOCUS_TICKERS).toContain('SOL');
  });

  it('should have unique topic IDs', () => {
    const ids = ALL_TOPICS.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have TOPIC_BY_ID for all topics', () => {
    for (const topic of ALL_TOPICS) {
      expect(TOPIC_BY_ID[topic.id]).toBeDefined();
      expect(TOPIC_BY_ID[topic.id].name).toBe(topic.name);
    }
  });

  it('should have search terms for all topics', () => {
    for (const topic of ALL_TOPICS) {
      expect(topic.searchTerms.length).toBeGreaterThan(0);
    }
  });

  it('should have priority set for all topics', () => {
    for (const topic of ALL_TOPICS) {
      expect(['high', 'medium', 'low']).toContain(topic.priority);
    }
  });
});

describe('Sentiment Keywords', () => {
  it('should have bullish keywords with positive weights', () => {
    for (const kw of BULLISH_KEYWORDS) {
      expect(kw.weight).toBeGreaterThan(0);
    }
  });

  it('should have bearish keywords with negative weights', () => {
    for (const kw of BEARISH_KEYWORDS) {
      expect(kw.weight).toBeLessThan(0);
    }
  });

  it('should have KEYWORD_MAP for quick lookup', () => {
    expect(KEYWORD_MAP.get('moon')).toBeDefined();
    expect(KEYWORD_MAP.get('moon')?.weight).toBeGreaterThan(0);
    
    expect(KEYWORD_MAP.get('crash')).toBeDefined();
    expect(KEYWORD_MAP.get('crash')?.weight).toBeLessThan(0);
  });

  it('should include common trading terms', () => {
    const terms = ALL_KEYWORDS.map(k => k.word.toLowerCase());
    
    expect(terms).toContain('bullish');
    expect(terms).toContain('bearish');
    expect(terms).toContain('pump');
    expect(terms).toContain('dump');
    expect(terms).toContain('rekt');
  });
});

describe('Quality Accounts', () => {
  it('should have quality accounts defined', () => {
    expect(ALL_QUALITY_ACCOUNTS.length).toBeGreaterThan(0);
  });

  it('should have unique usernames', () => {
    const usernames = ALL_QUALITY_ACCOUNTS.map(a => a.username.toLowerCase());
    const uniqueUsernames = new Set(usernames);
    expect(uniqueUsernames.size).toBe(usernames.length);
  });

  it('should return correct tier for known accounts', () => {
    // caboronto is in our whale list
    expect(getAccountTier('caboronto')).toBe('whale');
    
    // Unknown account should be standard
    expect(getAccountTier('random_unknown_user')).toBe('standard');
  });

  it('should return reliability scores', () => {
    // Known account
    const knownReliability = getAccountReliability('caboronto');
    expect(knownReliability).toBeGreaterThan(50);
    
    // Unknown account gets default 50
    const unknownReliability = getAccountReliability('random_unknown_user');
    expect(unknownReliability).toBe(50);
  });

  it('should have ACCOUNT_BY_USERNAME map', () => {
    expect(ACCOUNT_BY_USERNAME.size).toBe(ALL_QUALITY_ACCOUNTS.length);
  });

  it('should have focus areas for all accounts', () => {
    for (const account of ALL_QUALITY_ACCOUNTS) {
      expect(account.focus.length).toBeGreaterThan(0);
    }
  });
});
