/**
 * Quality Accounts — VIP handles for X sentiment tier weighting (paper-bot).
 * Aligned with plugin-x-research concept; kept in plugin-vince so no cross-plugin dependency.
 * Whales/alphas count more in sentiment aggregation.
 */

export type AccountTier =
  | "whale"
  | "alpha"
  | "quality"
  | "verified"
  | "standard";

export interface QualityAccount {
  username: string;
  tier: AccountTier;
  focus: string[];
  reliability?: number;
}

const WHALE_ACCOUNTS: QualityAccount[] = [
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

const ALPHA_ACCOUNTS: QualityAccount[] = [
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

const DATA_ACCOUNTS: QualityAccount[] = [
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

const ALL_QUALITY_ACCOUNTS: QualityAccount[] = [
  ...WHALE_ACCOUNTS,
  ...ALPHA_ACCOUNTS,
  ...DATA_ACCOUNTS,
];

const ACCOUNT_BY_USERNAME = new Map<string, QualityAccount>(
  ALL_QUALITY_ACCOUNTS.map((a) => [a.username.toLowerCase(), a]),
);

export function getAccountTier(username: string): AccountTier {
  const account = ACCOUNT_BY_USERNAME.get(
    (username || "").trim().toLowerCase(),
  );
  return account?.tier ?? "standard";
}

/** Tier weight for weighted average (whale 3, alpha 2.5, quality 2, verified 1.5, standard 1). */
export function getTierWeight(username: string): number {
  const tier = getAccountTier(username);
  switch (tier) {
    case "whale":
      return 3.0;
    case "alpha":
      return 2.5;
    case "quality":
      return 2.0;
    case "verified":
      return 1.5;
    default:
      return 1.0;
  }
}
