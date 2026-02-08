/**
 * Agent-specific About modal configuration.
 * Content is selected by agent name; falls back to VINCE for unknown agents.
 */

export interface AboutCapability {
  title: string;
  description: string;
}

export interface AboutPlugin {
  name: string;
  category: string;
  summary: string;
  points: string[];
  example: string;
}

export interface AboutConfig {
  headline: string;
  intro: string;
  tags: { label: string; withSparkles?: boolean }[];
  capabilities: AboutCapability[];
  plugins: AboutPlugin[];
  proTip: string;
}

const DEFAULT_AGENT = "VINCE";

export const ABOUT_CONFIG: Record<string, AboutConfig> = {
  VINCE: {
    headline: "Push, not pull.",
    intro:
      "VINCE pushes. Options, perps, TradFi, memes, lifestyle, art—one feed instead of fifteen tabs. At the core: a machine-learning paper trading algo for perps on Hyperliquid. Onchain options on Hypersurface. Gold, SPX, NVDA via HIP-3 onchain stocks. He pings you. No redeploy to improve.",
    tags: [
      { label: "ML Paper Perps", withSparkles: true },
      { label: "HIP-3 Onchain Stocks" },
      { label: "Push" },
    ],
    capabilities: [
      {
        title: "ALOHA Day Report",
        description:
          "Say gm. One feed: options skew, perps funding, memes, lifestyle, NFT floors. Not a dashboard—one narrative.",
      },
      {
        title: "ML Paper Trading Bot",
        description:
          "Machine-learning paper trading for perps on Hyperliquid. Thompson Sampling. ONNX. WHY THIS TRADE—every factor logged. Kelly sizing, circuit breakers. Day 1 rules, 90+ days full ML. Trains in prod. No redeploy.",
      },
      {
        title: "Onchain Options on Hypersurface",
        description:
          "Covered calls, secured puts on Hypersurface. Deribit IV, Greeks, DVOL. HIP-3: gold, SPX, NVDA—onchain stocks.",
      },
      {
        title: "Meme Scanner",
        description:
          "DexScreener + Meteora. $1M–$20M mcap sweet spot. Traction, liquidity.",
      },
      {
        title: "Market Intelligence",
        description:
          "MandoMinutes sentiment, funding extremes, OI cap, NASDAQ 24h. Why BTC matters—macro, regime, narrative.",
      },
      {
        title: "Leaderboard Dashboard",
        description:
          "Markets, Memetics, News, Art, Trading Bot. No chat required. Open the page, data is there.",
      },
      {
        title: "Lifestyle & Art",
        description:
          "Day-of-week suggestions. NFT floors (CryptoPunks, Meridian).",
      },
    ],
    plugins: [
      {
        name: "Plugin-Vince",
        category: "Trading",
        summary:
          "Machine-learning paper trading for perps on Hyperliquid. 15 signal sources. WHY THIS TRADE. Options on Hypersurface. HIP-3 onchain stocks. Six domains.",
        points: [
          "ALOHA, VINCE_PERPS, VINCE_OPTIONS, VINCE_MEMES, VINCE_BOT_*.",
          "Self-improving ML: Thompson Sampling, ONNX inference, improvement report.",
        ],
        example: '"ALOHA" or "bot status"',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "Numbers become narrative. Why, not just what. One voice across options, perps, memes, lifestyle, art.",
        points: [
          "Narrative on top of the numbers.",
        ],
        example: '"Perps pulse for BTC?"',
      },
      {
        name: "SQL",
        category: "Database",
        summary:
          "Trades, logs, memories. Feature store for ML.",
        points: [
          "Portfolio summaries and transaction histories.",
          "Feature store for ML training.",
        ],
        example: '"Summarize my paper trades."',
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers. Stays on task.",
        points: [
          "Past trades. Stays on task.",
        ],
        example: "Past trades.",
      },
    ],
    proTip:
      "Say gm or ALOHA. Bot status. Why does BTC matter? Free first. Paid APIs optional.",
  },

  Otaku: {
    headline: "DeFi in one conversation.",
    intro:
      "On-chain data (Nansen, DexScreener). CDP wallet and Relay. Research, plan, act—one conversation.",
    tags: [
      { label: "Self-Directed", withSparkles: true },
      { label: "DeFi stack" },
      { label: "Just ask" },
    ],
    capabilities: [
      {
        title: "Token Analysis & Comparisons",
        description:
          "Compare assets. Liquidity depth, volume, odd moves before they move the market.",
      },
      {
        title: "Yield Strategy Discovery",
        description:
          "Morpho, Aave. Compare APRs, pick strongest risk-adjusted yield.",
      },
      {
        title: "Cross-Chain Execution",
        description:
          "Bridge, swap (Relay, Biconomy). Stays in chat.",
      },
      {
        title: "Wallet Operations",
        description:
          "CDP smart wallets. Balances, sends, approvals.",
      },
      {
        title: "Portfolio Risk Monitoring",
        description:
          "Stress-test exposure. Track drawdowns. Warnings when concentration or vol spikes.",
      },
      {
        title: "Market Intelligence",
        description:
          "Macro, protocol updates, on-chain flows. Summarized.",
      },
      {
        title: "DeFi Education",
        description:
          "Perps, restaking, vaults—explained. Matched to level.",
      },
    ],
    plugins: [
      {
        name: "CoinGecko",
        category: "Market Data",
        summary:
          "Live token prices, market caps, volume trends, and relative strength comparisons.",
        points: [
          "Call up intraday performance and liquidity snapshots.",
          "Benchmark tokens. Spot outperformers and laggards.",
        ],
        example: '"What\'s the 24h volume for AAVE and LINK?"',
      },
      {
        name: "DeFiLlama",
        category: "Analytics",
        summary:
          "Total value locked, ecosystem growth, and category-level flows across chains.",
        points: [
          "Identify which sectors are expanding fastest by TVL shift.",
          "Spot emerging protocols before capital concentration peaks.",
        ],
        example: '"Show me the top 5 lending protocols by TVL this week."',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "DeFi in plain language. Hedging, farming.",
        points: [
          "Draft hedging or farming strategies.",
        ],
        example: '"Explain the risks of staking ETH on Lido vs. RocketPool."',
      },
      {
        name: "Coinbase CDP",
        category: "Execution",
        summary:
          "Smart wallets. Balances, sends, approvals. Sign in chat.",
        points: [
          "Wallets linked to session.",
          "Sign and broadcast transfers without leaving chat.",
        ],
        example: '"Send 0.1 ETH to my friend on Base."',
      },
      {
        name: "Morpho",
        category: "Yield Markets",
        summary:
          "Morpho Blue rates. Supply/borrow APRs. Positions, rebalancing.",
        points: [
          "Compare supply and borrow APRs across markets before entering.",
          "Manage open positions and rebalance collateral in-line.",
        ],
        example: '"Compare ETH lending yields on Morpho and Aave."',
      },
      {
        name: "Web Search",
        category: "News",
        summary:
          "News, governance, on-chain narratives. Tavily.",
        points: [
          "Sentiment scans.",
          "Cross-check on-chain moves against breaking headlines.",
        ],
        example: '"What is the latest on EigenLayer restaking yields?"',
      },
      {
        name: "SQL",
        category: "Database",
        summary:
          "Query structured data for trades, logs, and historical data.",
        points: [
          "Pull portfolio summaries or transaction histories.",
          "Validate trade ideas with custom metrics or cohort analysis.",
        ],
        example: '"Summarize my recent swaps and profits."',
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers. Stays on task.",
        points: [
          "Past trades. Risk appetite.",
        ],
        example:
          "Past trades. Risk appetite.",
      },
    ],
    proTip:
      "Ask: 'Bridge 2 ETH to Arbitrum, swap half to USDC.' She confirms before sending.",
  },

  Kelly: {
    headline: "Live the life.",
    intro:
      "Kelly picks hotels and restaurants from the-good-life: MICHELIN, James Edition, France palaces. Wine, health, fitness. Occasion, season, budget—she adjusts.",
    tags: [
      { label: "Lifestyle Only", withSparkles: true },
      { label: "No Trading" },
      { label: "Picks for the moment" },
    ],
    capabilities: [
      {
        title: "Five-Star Hotels",
        description:
          "Palaces, city, coast, countryside. James Edition. France methodology.",
      },
      {
        title: "Fine Dining",
        description:
          "MICHELIN stars, Bib Gourmand. Seasonal. New openings.",
      },
      {
        title: "Wine & Spirits",
        description:
          "Bordeaux, Burgundy, Champagne. Sommelier playbook. South African, whiskey, Armagnac.",
      },
      {
        title: "Health & Fitness",
        description:
          "Wellness, yoga, pool vs gym. Day-of-week.",
      },
      {
        title: "Daily Briefing",
        description:
          "KELLY_DAILY_BRIEFING pushes to channels with 'kelly' or 'lifestyle' in the name.",
      },
    ],
    plugins: [
      {
        name: "Plugin-Kelly",
        category: "Lifestyle",
        summary:
          "Hotels, dining, wine, health, fitness. Uses the-good-life.",
        points: [
          "KELLY_DAILY_BRIEFING for scheduled push.",
          "Day-of-week suggestions.",
        ],
        example: '"Recommend a Michelin spot in Biarritz."',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "Wine pairings from sommelier playbook. Picks for occasion and budget.",
        points: [
          "Sommelier playbook.",
          "Occasion, season, budget.",
        ],
        example: '"What wine pairs with duck confit?"',
      },
      {
        name: "Web Search",
        category: "News",
        summary:
          "Latest openings. Current MICHELIN stars.",
        points: [
          "Find new restaurants and hotel openings.",
          "Verify current awards and ratings.",
        ],
        example: '"What\'s new in Paris fine dining this year?"',
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers what worked and what didn't. Refines picks from feedback.",
        points: [
          "Past picks. Feedback.",
        ],
        example: "Past picks. Feedback.",
      },
    ],
    proTip:
      "Michelin in Biarritz. Five-star on the Côte d'Azur. Sommelier for wine. James Edition for stays.",
  },

  Solus: {
    headline: "$100K/year, systematized.",
    intro:
      "Wealth architect. Options on Hypersurface, ML paper perps on Hyperliquid, HIP-3 onchain stocks. Strike ritual, roll cadence, allocation. Airdrops, yield, DeFi. Systematic.",
    tags: [
      { label: "Wealth Architect", withSparkles: true },
      { label: "Options-Focused" },
      { label: "Systematic" },
    ],
    capabilities: [
      {
        title: "Options on HYPERSURFACE",
        description:
          "Covered calls, secured puts; strike selection, roll cadence, $3K/week minimum target.",
      },
      {
        title: "Perps & HIP-3",
        description:
          "Paper perps bot with ML; HIP-3 spot (gold, SPX, NVDA); same data sources as VINCE.",
      },
      {
        title: "Airdrop Farming",
        description:
          "TreadFi, MM bots, airdrop strategies. Frameworks from airdrops knowledge.",
      },
      {
        title: "DeFi Metrics",
        description:
          "TVL, protocol evaluation, yield. defi-metrics.",
      },
      {
        title: "Venture & Bitcoin",
        description:
          "Echo seed DD. Bitcoin-maxi, altcoins, stables.",
      },
    ],
    plugins: [
      {
        name: "Plugin-Vince",
        category: "Trading",
        summary:
          "ML paper perps on Hyperliquid. Options on Hypersurface. HIP-3 onchain stocks. Same data as VINCE. Wealth focus.",
        points: [
          "Options, perps, paper bot, market data.",
          "Knowledge: options, perps-trading, airdrops, defi-metrics.",
        ],
        example: '"What\'s my strike for this week\'s covered call?"',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "Weekly yield targets. Strike ritual. Allocation and risk.",
        points: [
          "Yield targets. Strike ritual. Risk frameworks.",
        ],
        example: '"Plan my allocation for the quarter."',
      },
      {
        name: "Web Search",
        category: "Research",
        summary:
          "Market data, governance, protocol updates.",
        points: [
          "Cross-check on-chain moves.",
          "Governance and protocol news.",
        ],
        example: '"Latest Echo / Cobie due diligence."',
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers goals. Past allocations.",
        points: [
          "Goals. Past allocations.",
        ],
        example: "Progress toward $100K/year.",
      },
    ],
    proTip:
      "Ask: 'Strike for this week\'s covered call?' or 'Airdrop strategy.'",
  },

  Eliza: {
    headline: "Ask anything.",
    intro:
      "Chat when you ask. Eliza connects to VINCE's stack—machine-learning paper perps on Hyperliquid, onchain options on Hypersurface, HIP-3 onchain stocks. Options, perps, macro, why BTC. No push. You ask.",
    tags: [
      { label: "ML Paper Perps", withSparkles: true },
      { label: "HIP-3 Onchain" },
      { label: "On-demand" },
    ],
    capabilities: [
      {
        title: "Chat",
        description:
          "Open-ended. Trading, macro, lifestyle, art. One voice across domains.",
      },
      {
        title: "Research",
        description:
          "Substack, macro, the-good-life. Why BTC matters—macro, regime, narrative.",
      },
      {
        title: "Knowledge Retrieval",
        description:
          "700+ files. Trading, lifestyle, art. RAG.",
      },
      {
        title: "Web Search",
        description:
          "When knowledge base gaps.",
      },
      {
        title: "Leaderboard Dashboard",
        description:
          "Markets, Memetics, News, Art, Trading Bot. No chat required. Open the page, data is there.",
      },
    ],
    plugins: [
      {
        name: "Plugin-Vince",
        category: "Trading",
        summary:
          "Machine-learning paper trading for perps on Hyperliquid. WHY THIS TRADE. Options on Hypersurface. HIP-3 onchain stocks. Six domains.",
        points: ["ALOHA, VINCE_PERPS, VINCE_OPTIONS, Leaderboard."],
        example: '"ALOHA" or "Why does BTC matter?"',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "Why, not just what. One voice across options, perps, memes, lifestyle, art.",
        points: [
          "Cross-domain.",
        ],
        example: '"Explain Benner cycles in plain language."',
      },
      {
        name: "SQL",
        category: "Database",
        summary:
          "Remembers context. Semantic search over past convos.",
        points: [
          "Remembers context across sessions.",
          "Semantic search over past conversations.",
        ],
        example: "Eliza recalls what you discussed last week.",
      },
      {
        name: "Web Search",
        category: "Research",
        summary:
          "When the base doesn't have it.",
        points: [
          "Fills gaps in the knowledge base.",
          "Time-range and topic filters.",
        ],
        example: '"What\'s the latest on AI regulation?"',
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers. Learns.",
        points: [
          "Facts. Understanding.",
        ],
        example: "Preferences. Interests.",
      },
    ],
    proTip:
      "Say gm or ALOHA. Why does BTC matter? Free first. Paid APIs optional.",
  },
};

export function getAboutConfig(agentName?: string | null): AboutConfig {
  const key = agentName?.trim() || DEFAULT_AGENT;
  return ABOUT_CONFIG[key] ?? ABOUT_CONFIG[DEFAULT_AGENT];
}

export function getAboutAgentDisplayName(agentName?: string | null): string {
  return agentName?.trim() || DEFAULT_AGENT;
}
