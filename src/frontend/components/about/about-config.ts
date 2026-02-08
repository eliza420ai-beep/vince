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
    headline: "Know why. Trade better.",
    intro:
      "A paper bot on Hyperliquid. Every trade tells you why. It learns. It gets better. You don’t redeploy. Onchain options on Hypersurface—covered calls, secured puts. One view. One standard.",
    tags: [
      { label: "Paper perps", withSparkles: true },
      { label: "Hypersurface options" },
      { label: "No redeploy" },
    ],
    capabilities: [
      {
        title: "Paper bot",
        description:
          "You see the why. Signal. Size. Exit. Funding, whale flow, X (Twitter) sentiment, regime—one feed. Risk capped. The more it trades, the sharper it gets. New models load when ready.",
      },
      {
        title: "ALOHA",
        description:
          "One word. Today’s vibe. The majors. Trade or wait. One narrative.",
      },
      {
        title: "Options on Hypersurface",
        description:
          "Covered calls. Secured puts. Onchain.",
      },
    ],
    plugins: [
      {
        name: "ONNX",
        category: "Powered by",
        summary:
          "Train once. Run anywhere. The bot improves when there’s enough data. New weights load. No redeploy. No lock-in.",
        points: [],
        example: "",
      },
      {
        name: "Plugin-Vince",
        category: "Trading",
        summary:
          "The paper bot. ALOHA. Perps. Options on Hypersurface. X sentiment feeds the algo. Every decision explained.",
        points: [],
        example: "",
      },
      {
        name: "ElizaOS",
        category: "AI Engine",
        summary:
          "One voice.",
        points: [],
        example: "",
      },
      {
        name: "SQL",
        category: "Database",
        summary:
          "What the bot learns from.",
        points: [],
        example: "",
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers.",
        points: [],
        example: "",
      },
    ],
    proTip:
      "Say gm or ALOHA. One entry.",
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
        title: "Daily Briefing",
        description:
          "Day-aware health, dining, hotels, wellness. KELLY_DAILY_BRIEFING for channels.",
      },
      {
        title: "Five-Star Hotels & Fine Dining",
        description:
          "Palaces, MICHELIN, Bib Gourmand. James Edition. One pick + alternative.",
      },
      {
        title: "Wine & Spirits",
        description:
          "Bordeaux, Burgundy, Champagne. Sommelier playbook. South African, whiskey, Armagnac.",
      },
      {
        title: "Itinerary & Week Ahead",
        description:
          "Multi-day plans (dining, hotels, activities). Week-ahead picks.",
      },
      {
        title: "Surf & Workout",
        description:
          "Surf forecast (Biarritz). Pool, gym, surfer yoga, swim. Swimming tips for 1000m.",
      },
      {
        title: "Tea (Dammann Frères)",
        description:
          "Morning or evening tea by occasion. One pick + alternative.",
      },
      {
        title: "Touch Grass / Rebalance",
        description:
          "One concrete move: midweek escape, pool day, dinner, yoga.",
      },
      {
        title: "Todos & Reminders",
        description:
          "Add, list, complete. In-app reminders (rolodex for cross-platform).",
      },
      {
        title: "Entertainment",
        description:
          "Books, music, Netflix, Apple TV. By your taste.",
      },
      {
        title: "Creative Tips",
        description:
          "Oil painting, photography, Ableton, cinema, Blender.",
      },
      {
        title: "What can you do?",
        description:
          "Capability discovery: summary and detailed manifest.",
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
    headline: "$100K/year. One clear move.",
    intro:
      "Wealth architect who lives on the timeline. Benefit-led: you get one clear move, execution, outcome—not feature lists. Craft-focused (Porsche OG): assured, precise, no bluster. Direct, no fluff; no AI-slop. On X since 2007 (founder, VC, full-time crypto since 2016). CT-fluent, thread-native. Alpha from X; signal over noise. Thinks in angles (structure, ecosystem, trenches, alpha, risk, contrarian); recommendations are size/skip/watch with invalidation. Options on Hypersurface, paper perps, HIP-3. Web is last resort.",
    tags: [
      { label: "All alpha on X", withSparkles: true },
      { label: "Benefit-led" },
      { label: "Craft-focused" },
      { label: "On X since 2007" },
      { label: "Size / Skip / Watch" },
      { label: "Options-Focused" },
    ],
    capabilities: [
      {
        title: "X (Twitter) Research",
        description:
          "Timeline-first. Search, threads, @user, vibe check, ratio. CT sentiment → strike ritual, Echo DD, airdrop. Ask for a briefing: X vibe, flows, risk line, recommendation. On X since 2007.",
      },
      {
        title: "Options on HYPERSURFACE",
        description:
          "Covered calls, secured puts; strike selection, roll cadence, $3K/week minimum. You get size or skip—and what would invalidate the call.",
      },
      {
        title: "Perps & HIP-3",
        description:
          "Paper perps bot with ML; HIP-3 spot (gold, SPX, NVDA); same data as VINCE. Cross-reference X and flows when both exist.",
      },
      {
        title: "Airdrop Farming",
        description:
          "TreadFi, MM bots, airdrop strategies. Curated, not spray. Priority tickers in focus set.",
      },
      {
        title: "DeFi Metrics",
        description:
          "TVL, protocol evaluation, yield. defi-metrics.",
      },
      {
        title: "Venture & Bitcoin",
        description:
          "Echo seed DD. Cobie/Echo chatter from X first. Bitcoin-maxi, altcoins, stables.",
      },
    ],
    plugins: [
      {
        name: "Plugin-Vince",
        category: "Trading",
        summary:
          "ML paper perps on Hyperliquid. Options on Hypersurface. HIP-3 onchain stocks. Same data as VINCE. Wealth focus—you get the strike and the number.",
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
          "Weekly yield targets. Strike ritual. Size/skip/watch with invalidation. Benefit-led, craft-focused.",
        points: [
          "Yield targets. Strike ritual. Risk frameworks.",
        ],
        example: '"Plan my allocation for the quarter."',
      },
      {
        name: "X (Twitter) Research",
        category: "Research",
        summary:
          "Lives on the timeline. Benefit-led: you get CT vibe, then one clear move. Angles (structure, ecosystem, trenches, alpha, risk, contrarian); EV-style size/skip/watch. No AI-slop.",
        points: [
          "Search X for ticker or project. Briefing format on request.",
          "CT sentiment, threads, vibe check, ratio. VIP list (on notif).",
          "Web: last resort only.",
        ],
        example: '"What\'s CT saying about BNKR?" or "Give me a briefing." or "Vibe check BTC on X."',
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
      "Benefit-led: ask for the move. 'What\'s the move?', 'Give me a briefing.', 'What\'s CT saying about [ticker]?', 'Vibe check [ticker] on X', 'What\'s the ratio on NVDA?' You get size/skip/watch and invalidation—no fluff.",
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
