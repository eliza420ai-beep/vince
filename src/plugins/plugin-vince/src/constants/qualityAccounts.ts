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
  { username: "elonmusk", tier: "whale", focus: ["macro", "trading"] },
  { username: "X", tier: "whale", focus: ["macro", "trading"] },
  { username: "joerogan", tier: "whale", focus: ["macro", "trading"] },
  { username: "cz_binance", tier: "whale", focus: ["macro", "trading"] },
  { username: "Bitcoin", tier: "whale", focus: ["macro", "trading"] },
  { username: "CoinMarketCap", tier: "whale", focus: ["macro", "trading"] },
  { username: "coinbase", tier: "whale", focus: ["macro", "trading"] },
  { username: "jack", tier: "whale", focus: ["macro", "trading"] },
  { username: "saylor", tier: "whale", focus: ["macro", "trading"] },
  { username: "OpenAI", tier: "whale", focus: ["macro", "trading"] },
  { username: "lexfridman", tier: "whale", focus: ["macro", "trading"] },
  { username: "sama", tier: "whale", focus: ["macro", "trading"] },
  { username: "BitcoinMagazine", tier: "whale", focus: ["macro", "trading"] },
  { username: "solana", tier: "whale", focus: ["macro", "trading"] },
  { username: "CoinDesk", tier: "whale", focus: ["macro", "trading"] },
];

const ALPHA_ACCOUNTS: QualityAccount[] = [
  { username: "zachxbt", tier: "alpha", focus: ["trading", "research"] },
  { username: "AnthropicAI", tier: "alpha", focus: ["trading", "research"] },
  { username: "gdb", tier: "alpha", focus: ["trading", "research"] },
  { username: "cdixon", tier: "alpha", focus: ["trading", "research"] },
  {
    username: "LynAldenContact",
    tier: "alpha",
    focus: ["trading", "research"],
  },
  { username: "nikitabier", tier: "alpha", focus: ["trading", "research"] },
  { username: "ErikVoorhees", tier: "alpha", focus: ["trading", "research"] },
  { username: "blknoiz06", tier: "alpha", focus: ["trading", "research"] },
  { username: "CryptoHayes", tier: "alpha", focus: ["trading", "research"] },
  { username: "CryptoCred", tier: "alpha", focus: ["trading", "research"] },
  { username: "IncomeSharks", tier: "alpha", focus: ["trading", "research"] },
  { username: "DonAlt", tier: "alpha", focus: ["trading", "research"] },
  { username: "aave", tier: "alpha", focus: ["trading", "research"] },
  { username: "claudeai", tier: "alpha", focus: ["trading", "research"] },
  { username: "huggingface", tier: "alpha", focus: ["trading", "research"] },
  { username: "fchollet", tier: "alpha", focus: ["trading", "research"] },
  { username: "gregisenberg", tier: "alpha", focus: ["trading", "research"] },
  { username: "PeterMcCormack", tier: "alpha", focus: ["trading", "research"] },
  { username: "ilyasut", tier: "alpha", focus: ["trading", "research"] },
  { username: "glassnode", tier: "alpha", focus: ["trading", "research"] },
];

const DATA_ACCOUNTS: QualityAccount[] = [
  { username: "unusual_whales", tier: "quality", focus: ["data", "news"] },
  { username: "coingecko", tier: "quality", focus: ["data", "news"] },
  { username: "BSCNews", tier: "quality", focus: ["data", "news"] },
  { username: "TheBlockCo", tier: "quality", focus: ["data", "news"] },
  { username: "MessariCrypto", tier: "quality", focus: ["data", "news"] },
  { username: "nansen_ai", tier: "quality", focus: ["data", "news"] },
  { username: "artblocks_io", tier: "quality", focus: ["data", "news"] },
  { username: "ArtOnBlockchain", tier: "quality", focus: ["data", "news"] },
  { username: "K33Research", tier: "quality", focus: ["data", "news"] },
  { username: "ConwayResearch", tier: "quality", focus: ["data", "news"] },
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
