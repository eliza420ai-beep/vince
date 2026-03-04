/**
 * Topics We Care About
 *
 * From VINCE README — these are our focus areas for X research.
 * Keep this ticker mirror aligned with plugin-vince target assets.
 */

// Mirrored from plugin-vince/src/constants/targetAssets.ts
const VINCE_TARGET_CORE_ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;
const VINCE_TARGET_PRIORITY_ASSETS = [
  "BTC",
  "ETH",
  "SOL",
  "HYPE",
  "XMR",
  "ZEC",
  "ONDO",
  "ENA",
  "AAVE",
  "UNI",
  "MORPHO",
  "PENDLE",
  "SYRUP",
  "LINK",
  "FIL",
  "TAO",
  "AIXBT",
  "ZEREBRO",
  "FARTCOIN",
  "JUP",
  "AVNT",
  "ZORA",
  "SUI",
] as const;
const VINCE_TARGET_HIP3_ASSETS = [
  "GOLD",
  "SILVER",
  "COPPER",
  "NATGAS",
  "OIL",
  "USOIL",
  "XYZ100",
  "US500",
  "SMALL2000",
  "MAG7",
  "SEMIS",
  "INFOTECH",
  "ROBOT",
  "NVDA",
  "TSLA",
  "AAPL",
  "AMZN",
  "GOOGL",
  "META",
  "MSFT",
  "PLTR",
  "COIN",
  "HOOD",
  "NFLX",
  "MSTR",
  "AMD",
  "INTC",
  "ORCL",
  "MU",
  "SNDK",
  "CRCL",
  "RIVN",
  "OPENAI",
  "ANTHROPIC",
  "SPACEX",
] as const;
const VINCE_TARGET_AI_INFRA_ASSETS = ["FIL", "TAO"] as const;

export interface Topic {
  id: string;
  name: string;
  searchTerms: string[]; // X search queries
  hashtags: string[];
  cashtags?: string[];
  category: TopicCategory;
  priority: "high" | "medium" | "low";
}

export type TopicCategory = "core_assets" | "trading" | "ecosystem" | "meta";

// Core Assets (Paper Trading)
export const CORE_ASSETS: Topic[] = [
  {
    id: "btc",
    name: "Bitcoin",
    searchTerms: ["bitcoin", "BTC", "#bitcoin"],
    hashtags: ["bitcoin", "btc"],
    cashtags: ["BTC"],
    category: "core_assets",
    priority: "high",
  },
  {
    id: "eth",
    name: "Ethereum",
    searchTerms: ["ethereum", "ETH", "#ethereum", "L2"],
    hashtags: ["ethereum", "eth"],
    cashtags: ["ETH"],
    category: "core_assets",
    priority: "high",
  },
  {
    id: "sol",
    name: "Solana",
    searchTerms: ["solana", "SOL", "#solana"],
    hashtags: ["solana", "sol"],
    cashtags: ["SOL"],
    category: "core_assets",
    priority: "high",
  },
  {
    id: "hype",
    name: "HYPE",
    searchTerms: ["$HYPE", "HYPE token", "hyperliquid"],
    hashtags: ["hype", "hyperliquid"],
    cashtags: ["HYPE"],
    category: "core_assets",
    priority: "high",
  },
];

// Trading Intelligence
export const TRADING_TOPICS: Topic[] = [
  {
    id: "perps",
    name: "Perps & Funding",
    searchTerms: [
      "funding rate",
      "perps",
      "perpetual",
      "crowded long",
      "crowded short",
      "liquidation cascade",
    ],
    hashtags: ["perps", "funding"],
    category: "trading",
    priority: "high",
  },
  {
    id: "options",
    name: "Options & DVOL",
    searchTerms: [
      "crypto options",
      "DVOL",
      "implied volatility",
      "put call ratio",
      "max pain",
    ],
    hashtags: ["options", "dvol"],
    category: "trading",
    priority: "high",
  },
  {
    id: "whales",
    name: "Whale Moves",
    searchTerms: [
      "whale alert",
      "large transfer",
      "whale moved",
      "smart money",
    ],
    hashtags: ["whalealert", "whales"],
    category: "trading",
    priority: "medium",
  },
  {
    id: "liquidations",
    name: "Liquidations",
    searchTerms: ["liquidated", "liquidation", "rekt", "cascade"],
    hashtags: ["liquidations", "rekt"],
    category: "trading",
    priority: "high",
  },
];

// Ecosystem
export const ECOSYSTEM_TOPICS: Topic[] = [
  {
    id: "elizaos",
    name: "ElizaOS",
    searchTerms: ["ElizaOS", "@elizaOS", "ai16z", "eliza framework"],
    hashtags: ["elizaos", "ai16z"],
    category: "ecosystem",
    priority: "high",
  },
  {
    id: "ai_agents",
    name: "AI Agents",
    searchTerms: [
      "AI agent",
      "autonomous agent",
      "crypto AI",
      "agent framework",
      "openclaw",
      "claude code",
      "claude co work",
      "perplexity computer",
    ],
    hashtags: [
      "aiagents",
      "autonomousagents",
      "openclaw",
      "claudecode",
      "perplexity",
    ],
    category: "ecosystem",
    priority: "medium",
  },
  {
    id: "defi",
    name: "DeFi",
    searchTerms: ["DeFi", "yield", "TVL", "protocol", "DEX"],
    hashtags: ["defi", "yield"],
    category: "ecosystem",
    priority: "medium",
  },
  {
    id: "memes",
    name: "Meme Coins",
    searchTerms: ["memecoin", "meme coin", "degen", "pump.fun"],
    hashtags: ["memecoin", "memeseason"],
    category: "ecosystem",
    priority: "low",
  },
  {
    id: "tokenized_ai",
    name: "Tokenized AI / AI infra",
    searchTerms: [
      "BANKR",
      "BNKR",
      "$BNKR",
      "bankr.bot",
      "tokenized AI agent",
      "agent token",
      "AI infra",
      "tokenized agent",
    ],
    hashtags: ["bankr", "bnkr", "tokenizedai", "agenttoken"],
    cashtags: ["BNKR"],
    category: "ecosystem",
    priority: "high",
  },
];

// Meta Topics
export const META_TOPICS: Topic[] = [
  {
    id: "macro",
    name: "Macro",
    searchTerms: ["FOMC", "CPI", "Fed", "risk on", "risk off", "recession"],
    hashtags: ["fomc", "macro"],
    category: "meta",
    priority: "high",
  },
  {
    id: "geopolitics",
    name: "Geopolitics (crypto-relevant)",
    searchTerms: [
      "crypto geopolitics",
      "Iran crypto",
      "sanctions crypto",
      "war crypto",
      "dollar crypto",
      "risk off crypto",
    ],
    hashtags: ["geopolitics", "crypto"],
    category: "meta",
    priority: "high",
  },
  {
    id: "hip3",
    name: "HIP-3 listed stocks",
    searchTerms: [
      "HIP-3",
      "HIP3",
      "hyperliquid stock",
      "tokenized stock",
      "HL stock perp",
      ...VINCE_TARGET_HIP3_ASSETS.map((t) => `$${t}`),
    ],
    hashtags: ["hip3", "hyperliquid"],
    cashtags: [...VINCE_TARGET_HIP3_ASSETS],
    category: "meta",
    priority: "high",
  },
  {
    id: "regulatory",
    name: "Regulatory",
    searchTerms: [
      "SEC",
      "crypto regulation",
      "Gensler",
      "enforcement",
      "crypto bill",
    ],
    hashtags: ["sec", "regulation"],
    category: "meta",
    priority: "medium",
  },
  {
    id: "hacks",
    name: "Hacks & Exploits",
    searchTerms: [
      "exploit",
      "hacked",
      "drained",
      "security breach",
      "rug pull",
    ],
    hashtags: ["hack", "exploit"],
    category: "meta",
    priority: "high",
  },
];

// All topics combined
export const ALL_TOPICS: Topic[] = [
  ...CORE_ASSETS,
  ...TRADING_TOPICS,
  ...ECOSYSTEM_TOPICS,
  ...META_TOPICS,
];

// Quick lookups
export const TOPIC_BY_ID = Object.fromEntries(ALL_TOPICS.map((t) => [t.id, t]));

/**
 * Focus tickers for X news/pulse relevance:
 * - VINCE core assets
 * - VINCE priority assets
 * - HIP-3 universe
 */
export const FOCUS_TICKERS = Array.from(
  new Set<string>([
    ...VINCE_TARGET_CORE_ASSETS,
    ...VINCE_TARGET_PRIORITY_ASSETS,
    ...VINCE_TARGET_HIP3_ASSETS,
  ]),
);
export const FOCUS_CASHTAGS = FOCUS_TICKERS.map((t) => `$${t}`);

/** Tokenized AI agents and AI infra (e.g. BANKR/BNKR); included in news and pulse. */
export const AI_INFRA_TICKERS = Array.from(
  new Set<string>(["BNKR", ...VINCE_TARGET_AI_INFRA_ASSETS]),
);
