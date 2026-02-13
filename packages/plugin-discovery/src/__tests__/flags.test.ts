import { describe, it, expect } from 'vitest';
import {
  FLAG_CATEGORIES,
  STANDARD_FLAGS,
  getStandardFlagNames,
  getFlagsByCategory,
  isStandardFlag,
  getStandardFlagInfo,
} from '../flags.ts';

describe('Feature Flags', () => {
  describe('FLAG_CATEGORIES', () => {
    it('should have all expected categories', () => {
      expect(FLAG_CATEGORIES.TRADING).toBe('trading');
      expect(FLAG_CATEGORIES.BLOCKCHAIN).toBe('blockchain');
      expect(FLAG_CATEGORIES.SOCIAL).toBe('social');
      expect(FLAG_CATEGORIES.COMMERCE).toBe('commerce');
      expect(FLAG_CATEGORIES.MEMORY).toBe('memory');
      expect(FLAG_CATEGORIES.MEDIA).toBe('media');
      expect(FLAG_CATEGORIES.UTILITY).toBe('utility');
    });
  });

  describe('STANDARD_FLAGS', () => {
    it('should have trading flags', () => {
      expect(STANDARD_FLAGS.CAN_TRADE.flag).toBe('can-trade');
      expect(STANDARD_FLAGS.CAN_SWAP.flag).toBe('can-swap');
      expect(STANDARD_FLAGS.CAN_STAKE.flag).toBe('can-stake');
    });

    it('should have blockchain flags', () => {
      expect(STANDARD_FLAGS.SUPPORTS_SOLANA.flag).toBe('supports-solana');
      expect(STANDARD_FLAGS.SUPPORTS_ETHEREUM.flag).toBe('supports-ethereum');
      expect(STANDARD_FLAGS.HAS_WALLET.flag).toBe('has-wallet');
    });

    it('should have social flags', () => {
      expect(STANDARD_FLAGS.HAS_TWITTER.flag).toBe('has-twitter');
      expect(STANDARD_FLAGS.HAS_DISCORD.flag).toBe('has-discord');
      expect(STANDARD_FLAGS.CAN_POST.flag).toBe('can-post');
    });

    it('should have commerce flags', () => {
      expect(STANDARD_FLAGS.ACCEPTS_PAYMENTS.flag).toBe('accepts-payments');
      expect(STANDARD_FLAGS.HAS_COMMERCE.flag).toBe('has-commerce');
    });

    it('all flags should have descriptions', () => {
      for (const flag of Object.values(STANDARD_FLAGS)) {
        expect(flag.description).toBeTruthy();
        expect(typeof flag.description).toBe('string');
      }
    });

    it('all flags should have categories', () => {
      for (const flag of Object.values(STANDARD_FLAGS)) {
        expect(flag.category).toBeTruthy();
        expect(Object.values(FLAG_CATEGORIES)).toContain(flag.category);
      }
    });
  });

  describe('getStandardFlagNames', () => {
    it('should return all flag names', () => {
      const names = getStandardFlagNames();
      
      expect(names).toContain('can-trade');
      expect(names).toContain('supports-solana');
      expect(names).toContain('has-twitter');
      expect(names).toContain('accepts-payments');
      expect(names.length).toBeGreaterThan(20);
    });

    it('should return kebab-case names', () => {
      const names = getStandardFlagNames();
      
      for (const name of names) {
        expect(name).toMatch(/^[a-z]+(-[a-z]+)*$/);
      }
    });
  });

  describe('getFlagsByCategory', () => {
    it('should return trading flags', () => {
      const flags = getFlagsByCategory(FLAG_CATEGORIES.TRADING);
      
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.every((f) => f.category === 'trading')).toBe(true);
    });

    it('should return blockchain flags', () => {
      const flags = getFlagsByCategory(FLAG_CATEGORIES.BLOCKCHAIN);
      
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.every((f) => f.category === 'blockchain')).toBe(true);
    });

    it('should return empty for unknown category', () => {
      const flags = getFlagsByCategory('unknown-category');
      expect(flags.length).toBe(0);
    });
  });

  describe('isStandardFlag', () => {
    it('should return true for standard flags', () => {
      expect(isStandardFlag('can-trade')).toBe(true);
      expect(isStandardFlag('supports-solana')).toBe(true);
      expect(isStandardFlag('has-twitter')).toBe(true);
    });

    it('should return false for custom flags', () => {
      expect(isStandardFlag('custom-flag')).toBe(false);
      expect(isStandardFlag('my-special-ability')).toBe(false);
    });
  });

  describe('getStandardFlagInfo', () => {
    it('should return info for standard flags', () => {
      const info = getStandardFlagInfo('can-trade');
      
      expect(info).toBeDefined();
      expect(info?.flag).toBe('can-trade');
      expect(info?.description).toBe('Can execute trades on supported exchanges');
      expect(info?.category).toBe('trading');
    });

    it('should return undefined for unknown flags', () => {
      const info = getStandardFlagInfo('unknown-flag');
      expect(info).toBeUndefined();
    });
  });
});

