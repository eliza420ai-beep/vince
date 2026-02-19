/**
 * Quality Accounts — Default VIP Handles
 *
 * These accounts get weighted higher in sentiment analysis.
 * Best practice: maintain a curated X list and use that instead.
 * This is a fallback / bootstrap list.
 */

import type { AccountTier } from "../types/tweet.types";

export interface QualityAccount {
  username: string;
  tier: AccountTier;
  focus: string[]; // Topics they're known for
  reliability?: number; // 0-100, historical accuracy
  notes?: string;
}

// Whale Accounts (100k+ followers, market-moving)
export const WHALE_ACCOUNTS: QualityAccount[] = [
  {
    username: "caboronto",
    tier: "whale",
    focus: ["BTC", "macro"],
    reliability: 85,
  },
  {
    username: "VitalikButerin",
    tier: "whale",
    focus: ["ETH", "ecosystem"],
    reliability: 90,
  },
  {
    username: "CryptoHayes",
    tier: "whale",
    focus: ["macro", "perps"],
    reliability: 75,
  },
  {
    username: "AltcoinPsycho",
    tier: "whale",
    focus: ["trading", "perps"],
    reliability: 70,
  },
  {
    username: "Pentosh1",
    tier: "whale",
    focus: ["BTC", "trading"],
    reliability: 80,
  },
  {
    username: "CryptoCred",
    tier: "whale",
    focus: ["trading", "education"],
    reliability: 80,
  },
];

// Alpha Accounts (known for quality insights)
export const ALPHA_ACCOUNTS: QualityAccount[] = [
  {
    username: "DegenSpartan",
    tier: "alpha",
    focus: ["DeFi", "trading"],
    reliability: 75,
  },
  {
    username: "CroissantEth",
    tier: "alpha",
    focus: ["ETH", "DeFi"],
    reliability: 80,
  },
  {
    username: "Tetranode",
    tier: "alpha",
    focus: ["DeFi", "yield"],
    reliability: 85,
  },
  {
    username: "loomdart",
    tier: "alpha",
    focus: ["options", "trading"],
    reliability: 80,
  },
  {
    username: "Hsaka_",
    tier: "alpha",
    focus: ["trading", "BTC"],
    reliability: 75,
  },
  {
    username: "inversebrah",
    tier: "alpha",
    focus: ["trading", "contrarian"],
    reliability: 70,
  },
  {
    username: "cobie",
    tier: "alpha",
    focus: ["crypto", "commentary"],
    reliability: 80,
  },
];

// Quality Data/News Accounts
export const DATA_ACCOUNTS: QualityAccount[] = [
  {
    username: "whale_alert",
    tier: "quality",
    focus: ["whales", "transfers"],
    reliability: 95,
  },
  {
    username: "lookonchain",
    tier: "quality",
    focus: ["whales", "onchain"],
    reliability: 90,
  },
  {
    username: "EmberCN",
    tier: "quality",
    focus: ["whales", "tracking"],
    reliability: 85,
  },
  {
    username: "Defi_Made_Here",
    tier: "quality",
    focus: ["DeFi", "yields"],
    reliability: 85,
  },
  {
    username: "DefiIgnas",
    tier: "quality",
    focus: ["DeFi", "airdrops"],
    reliability: 80,
  },
];

// ElizaOS / AI Agent Ecosystem
export const ECOSYSTEM_ACCOUNTS: QualityAccount[] = [
  {
    username: "elizaOS",
    tier: "quality",
    focus: ["elizaos", "ai_agents"],
    reliability: 95,
  },
  {
    username: "ai16zdao",
    tier: "quality",
    focus: ["elizaos", "ecosystem"],
    reliability: 90,
  },
  {
    username: "shawmakesmagic",
    tier: "alpha",
    focus: ["elizaos", "ai_agents"],
    reliability: 90,
  },
];

// All quality accounts
export const ALL_QUALITY_ACCOUNTS: QualityAccount[] = [
  ...WHALE_ACCOUNTS,
  ...ALPHA_ACCOUNTS,
  ...DATA_ACCOUNTS,
  ...ECOSYSTEM_ACCOUNTS,
];

// Quick lookups
export const ACCOUNT_BY_USERNAME = new Map<string, QualityAccount>(
  ALL_QUALITY_ACCOUNTS.map((a) => [a.username.toLowerCase(), a]),
);

export const USERNAMES_BY_TIER = {
  whale: WHALE_ACCOUNTS.map((a) => a.username),
  alpha: ALPHA_ACCOUNTS.map((a) => a.username),
  quality: [...DATA_ACCOUNTS, ...ECOSYSTEM_ACCOUNTS].map((a) => a.username),
};

/**
 * Get account tier for a username
 */
export function getAccountTier(username: string): AccountTier {
  const account = ACCOUNT_BY_USERNAME.get(username.toLowerCase());
  return account?.tier ?? "standard";
}

/**
 * Get reliability score for a username
 */
export function getAccountReliability(username: string): number {
  const account = ACCOUNT_BY_USERNAME.get(username.toLowerCase());
  return account?.reliability ?? 50; // Default 50 for unknown accounts
}
