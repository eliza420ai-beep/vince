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

// Whale Accounts (follower-based from @ikigaistudioxyz following; high reach)
export const WHALE_ACCOUNTS: QualityAccount[] = [
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

// Alpha Accounts (follower-based from @ikigaistudioxyz following; strong reach)
export const ALPHA_ACCOUNTS: QualityAccount[] = [
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

// Quality Data/News Accounts (deduped against whale/alpha)
export const DATA_ACCOUNTS: QualityAccount[] = [
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

// Org following (e.g. @ikigaistudioxyz) — populated by scripts/fetch-org-following.ts or manually
export const ORG_FOLLOWING_ACCOUNTS: QualityAccount[] = [
  {
    username: "elonmusk",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "X", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "joerogan",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "cz_binance",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "Bitcoin", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "CoinMarketCap",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "coinbase",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "jack", tier: "quality", focus: ["curated", "org_following"] },
  { username: "saylor", tier: "quality", focus: ["curated", "org_following"] },
  { username: "OpenAI", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "lexfridman",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "sama", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "BitcoinMagazine",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "solana", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "CoinDesk",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "unusual_whales",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "naval", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "zerohedge",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "coingecko",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "paulg", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "100trillionUSD",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "RayDalio",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "chamath", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "APompliano",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "karpathy",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "brian_armstrong",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "michaeljburry",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "DavidSacks",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "KobeissiLetter",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "balajis", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "RaoulGMI",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "BSCNews", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "DeItaone",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "intocryptoverse",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "scottmelker",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "ylecun", tier: "quality", focus: ["curated", "org_following"] },
  { username: "zachxbt", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "AnthropicAI",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "gdb", tier: "quality", focus: ["curated", "org_following"] },
  { username: "cdixon", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "LynAldenContact",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "nikitabier",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ErikVoorhees",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "blknoiz06",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "CryptoHayes",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "CryptoCred",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "IncomeSharks",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "DonAlt", tier: "quality", focus: ["curated", "org_following"] },
  { username: "aave", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "claudeai",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "huggingface",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "fchollet",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "gregisenberg",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "PeterMcCormack",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "ilyasut", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "glassnode",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "fundstrat",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "TheBlockCo",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "rowancheung",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "jackmallers",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "Tradermayne",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "MessariCrypto",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "NotionHQ",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "farokh", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "frankdegods",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "AlexFinn",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "perplexity_ai",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "midjourney",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "openclaw",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "steipete",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "EricBalchunas",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "Zeneca", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "alexandr_wang",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "notthreadguy",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "nansen_ai",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ThePrimeagen",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "mikealfred",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "cburniske",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "andrewchen",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "amitisinvesting",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "emollick",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "cursor_ai",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "gmoneyNFT",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "FinanceLancelot",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "StaniKulechov",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ThinkingUSD",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "XCOPYART",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "MattPRD", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "SimonDixonTwitt",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "LawrenceLepard",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "martypartymusic",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "dotkrueger",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "DecryptMedia",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ChrisCamillo",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "tetsuoai",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ASvanevik",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "GavinSBaker",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "osf_rekt",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "C_Barraud",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "arthur0x",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "TheShortBear",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "KyleSamani",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "0xngmi", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "matthuang",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "JSeyff", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "rektmando",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "artblocks_io",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "goodside",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "rleshner",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "cmsholdings",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "QwQiao", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "shawmakesmagic",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "mattmedved",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "crypto_condom",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "intern", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "pythianism",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "santiagoroel",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "JasonYanowitz",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "_Checkmatey_",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "gametheorizing",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "Axel_bitblaze69",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ArtOnBlockchain",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "Kimi_Moonshot",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "jvisserlabs",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "goodalexander",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "GaryCardone",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "MatthewBerman",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "BritishHodl",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "bankrbot",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "Matt_Hougan",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "CantonNetwork",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "dflow", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "justinaversano",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "tylerxhobbs",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "omooretweets",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "dmitricherniak",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "andyyy", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "TomerStrolight",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "MiniMax_AI",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "kloss_xyz",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "alturax", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "Evan_ss6",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "Zai_org", tier: "quality", focus: ["curated", "org_following"] },
  { username: "btcjvs", tier: "quality", focus: ["curated", "org_following"] },
  { username: "sjdedic", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "cryptopunk7213",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "LH_btc", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "elvissun",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "lmrankhan",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "Only1temmy",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "0xDeployer",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "bensig", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "123skely",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "Jackkk", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "elliotarledge",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "Jacobsklug",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "darkside2030",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ProofOfMoney",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "convex", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "tomyoungjr",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "K33Research",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "piterpasma",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "kilocode",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "clawdbotatg",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "HYPEconomist",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "aashatwt",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "LorenHodl",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "cfosilvia",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "LimitlessFT",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "theempirepod",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ConwayResearch",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "rohunvora",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "AlliumLabs",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "michael_chomsky",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "dmweisberger",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "near_ai", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "intern_cc",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ArchLending",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "dmitry140",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "johann_sath",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "TryNoahAI",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "jamieMiner9",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "Keak_ai", tier: "quality", focus: ["curated", "org_following"] },
  {
    username: "jprice614",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "KamBenbrik",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "ikigailabsETH",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  {
    username: "OrderBookShow",
    tier: "quality",
    focus: ["curated", "org_following"],
  },
  { username: "far0kh_", tier: "quality", focus: ["curated", "org_following"] },
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
// ORG_FOLLOWING first so WHALE/ALPHA/DATA/ECOSYSTEM overwrite in ACCOUNT_BY_USERNAME (preserve higher tiers)
export const ALL_QUALITY_ACCOUNTS: QualityAccount[] = [
  ...ORG_FOLLOWING_ACCOUNTS,
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
  quality: [
    ...DATA_ACCOUNTS,
    ...ORG_FOLLOWING_ACCOUNTS,
    ...ECOSYSTEM_ACCOUNTS,
  ].map((a) => a.username),
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
