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
      "Chief Data Officer (CDO): data and intel only—no marketing or GTM. Our signal from X (Twitter) is our most important source of insights, news, alpha, and sentiment, and that indicator has a big impact on the paper trading bot—our flagship product. Every trade tells you why. It learns. It gets better. You don't redeploy. Onchain options on Hypersurface—covered calls, secured puts. One view. One standard.",
    tags: [
      { label: "CDO", withSparkles: true },
      { label: "X-first" },
      { label: "Paper perps" },
      { label: "Hypersurface options" },
      { label: "No redeploy" },
    ],
    capabilities: [
      {
        title: "Paper bot",
        description:
          "Flagship product. X (Twitter) sentiment is our #1 signal source and feeds the algo alongside funding, whale flow, and regime. You see the why—signal, size, exit. Risk capped. The more it trades, the sharper it gets. New models load when ready.",
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
          "Flagship paper trading bot powered by X sentiment—our #1 source of insights, news, alpha, and sentiment—plus ALOHA, perps, options on Hypersurface. Every decision explained.",
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
      "Chief Operating Officer (COO): DeFi ops executor. On-chain data (Nansen, DexScreener). CDP wallet and Relay. Research, plan, act—one conversation.",
    tags: [
      { label: "COO", withSparkles: true },
      { label: "Self-Directed" },
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
      "Chief Vibes Officer (CVO): people and balance guardian. Kelly picks hotels and restaurants from the-good-life: MICHELIN, James Edition, France palaces. Wine, health, fitness. Occasion, season, budget—she adjusts. Touch grass; no burnout.",
    tags: [
      { label: "CVO", withSparkles: true },
      { label: "Lifestyle Only" },
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
          "Palaces, MICHELIN, Bib Gourmand. James Edition. One pick + alternative. Default: within 2h of home (Landes, Hossegor, Magescq, Basque coast, Saint-Émilion).",
      },
      {
        title: "Wine & Spirits",
        description:
          "French wine & Champagne (Bordeaux, Burgundy, Rhône, Loire, Alsace, etc.). Sommelier playbook. South African, whiskey, Armagnac.",
      },
      {
        title: "Itinerary & Week Ahead",
        description:
          "Multi-day plans (dining, hotels, activities). Week-ahead picks.",
      },
      {
        title: "Something Special",
        description:
          "Wine tasting, spa day, cooking class, guided tour. One pick + alternative.",
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
    headline: "Plan and call. Data is VINCE.",
    intro:
      "Chief Financial Officer (CFO): fiscal strategist. Solus is the execution architect for a $100K/year stack. He does not pull live data—VINCE does. You get the plan, the process, and the call: $100K breakdown, how to run strike ritual, size/skip/watch when you paste context, Echo DD process, rebalance. Get options or CT from VINCE; paste here; Solus gives one clear move and invalidation. Benefit-led, craft-focused, no fluff. Architect in the room—calm, decisive, three steps ahead.",
    tags: [
      { label: "CFO", withSparkles: true },
      { label: "Execution Architect" },
      { label: "Plan & Call Only" },
      { label: "Size / Skip / Watch" },
      { label: "VINCE's Partner" },
      { label: "$100K Stack" },
      { label: "No Data Duplication" },
    ],
    capabilities: [
      {
        title: "$100K Plan",
        description:
          "Full seven-pillar stack: HYPERSURFACE options ($3K/week min), yield, sats, Echo DD, paper perps, HIP-3, airdrops. Allocations, weekly targets, execution system. You get the plan—not the live chain.",
      },
      {
        title: "This Week's Targets",
        description:
          "Strike ritual output: size, expiry, invalidation. You bring VINCE's options view (or Grok daily from internal-docs); Solus gives the call. 'Strike ritual:' or 'This week's targets:'—never 'My call.'",
      },
      {
        title: "Size or Skip?",
        description:
          "Paste any context (VINCE's aloha, options, CT take, or your own). Solus returns size, skip, or watch—and one short invalidation (what would change his mind). One clear move.",
      },
      {
        title: "Echo DD",
        description:
          "Process for seed-stage due diligence via Echo (Coinbase, Cobie). How to run it, what to check—not FOMO. Craft-focused.",
      },
      {
        title: "Rebalance",
        description:
          "How to rebalance across the seven pillars. Allocation, risk, next step. From internal-docs and what you paste.",
      },
      {
        title: "What's Your Call?",
        description:
          "Explicit ask for the architect's decision. Clear buy/sell/watch with invalidation. EV-style in prose when context is enough (e.g. bull/base/bear % and outcome).",
      },
      {
        title: "Handoff to VINCE",
        description:
          "For live data—aloha, options chains, perps, memes, news, X/CT research, bot status, yield—Solus says: 'That's VINCE. Get his take, paste it here, I'll give you the call.' No duplicate lanes.",
      },
    ],
    plugins: [
      {
        name: "Plugin-Vince (knowledge only)",
        category: "Context",
        summary:
          "Solus uses internal-docs (Grok daily, treasury) and whatever you paste. He does not call VINCE's data APIs—you get options/CT from VINCE and bring it here for the call.",
        points: [
          "Knowledge: internal-docs. Strike ritual process, seven pillars.",
          "Plan and call from pasted context or internal-docs.",
        ],
        example: '"full $100K plan" or paste VINCE output and ask "size or skip?"',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "One clear call. Size/skip/watch + invalidation. Benefit-led (you get the move), craft-focused (Porsche OG), no AI-slop.",
        points: [
          "Recommendation style: size, skip, or watch; invalidation in one phrase.",
          "EV lens in prose when context allows.",
        ],
        example: '"what\'s your call?" or "rebalance my stack"',
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers goals and past context. Progress toward $100K/year.",
        points: [
          "Goals. Past allocations. What was recommended.",
        ],
        example: "Consistent handoff and call style across sessions.",
      },
    ],
    proTip:
      "Plan and call only. Say 'full $100K plan', 'this week\'s targets', 'size or skip?' (then paste VINCE's output), 'Echo DD', 'rebalance', 'what\'s your call?' For live data—options, yield, CT—ask VINCE first, then paste here for the call.",
  },

  Sentinel: {
    headline: "Core dev. Ops. Architecture. 24/7.",
    intro:
      "Chief Technology Officer (CTO): tech infra, ops, cost, ONNX, clawdbot. Sentinel is the project's core dev agent: ops and runbook, architecture steward, cost steward (TREASURY, burn rate, breakeven), and proactive partner for Claude Code / Cursor. North star: coding 24/7, self-improving, ML/ONNX obsessed, ART (elizaOS examples/art), clawdbot for knowledge research, best settings. No trading—VINCE and Solus own that lane.",
    tags: [
      { label: "CTO", withSparkles: true },
      { label: "Core Dev" },
      { label: "Cost Steward" },
      { label: "Architecture" },
      { label: "ONNX / Feature Store" },
      { label: "ART & Examples" },
      { label: "No Trading" },
    ],
    capabilities: [
      {
        title: "Task Brief for Claude 4.6",
        description:
          "Pasteable block for Claude Code or Cursor: task + architecture rules + 'keep the architecture as good as it gets.' Work never stalls.",
      },
      {
        title: "Cost Status",
        description:
          "Burn rate, breakeven, 100K target. TREASURY + Usage tab. LLM choice, Cursor Max, data API tiers. Cost steward for every suggestion.",
      },
      {
        title: "ONNX & Feature Store",
        description:
          "Feature-store state, training readiness (90+ rows), next step (train_models, Supabase). ML pipeline health.",
      },
      {
        title: "ART Gems",
        description:
          "3–5 concrete patterns from elizaOS/examples, especially art. Meridian, QQL, Ringers, Fidenza. Reuse here.",
      },
      {
        title: "Clawdbot Guide",
        description:
          "Knowledge research without X API cost: curated X follows + Birdy → threads/URLs → knowledge pipeline.",
      },
      {
        title: "What's Next?",
        description:
          "Prioritized suggestions: architecture, ops, ONNX, clawdbot, ART, settings, benchmarks, plugins. Numbered, with refs.",
      },
      {
        title: "Improve Docs",
        description:
          "Suggest improvements to internal-docs, sentinel-docs, teammate. Consolidate progress.txt (plugin-vince, plugin-kelly, frontend).",
      },
      {
        title: "PRD for Cursor",
        description:
          "World-class PRDs for Cursor/Claude Code: north star alignment, acceptance criteria, architecture rules, implementation guide.",
      },
      {
        title: "What to Ship?",
        description:
          "Ship priorities from Project Radar + Impact Scorer. What's most impactful to ship next.",
      },
      {
        title: "VC / Angel Pitch",
        description:
          "No slides—demos that blow them away. Elevator pitch and TLDR of the big vision. 90% core dev; 10% gen art.",
      },
    ],
    plugins: [
      {
        name: "Plugin-Sentinel",
        category: "Core Dev",
        summary:
          "Task brief, cost status, ONNX status, ART gems, clawdbot guide, doc improve, settings suggest. Weekly/daily tasks to sentinel/ops channels.",
        points: [
          "SENTINEL_SUGGEST, SENTINEL_COST_STATUS, SENTINEL_ONNX_STATUS.",
          "SENTINEL_ART_GEMS, SENTINEL_CLAWDBOT_GUIDE, SENTINEL_DOC_IMPROVE.",
          "Knowledge: internal-docs, sentinel-docs, teammate.",
        ],
        example: '"task brief for Claude 4.6" or "cost status" or "what should we do next"',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "Architecture steward. Keeps plugin boundaries, agents thin, no duplicate lanes. Benefit-led, no AI-slop.",
        points: [
          "Pasteable briefs for Claude Code.",
          "Cost-aware suggestions.",
        ],
        example: '"Give me a task brief for Cursor"',
      },
      {
        name: "SQL",
        category: "Database",
        summary:
          "Memories and state. Progress, logs.",
        points: [
          "Persistent state for suggestions and outcomes.",
        ],
        example: "Remembers what was suggested and accepted.",
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers. Learns from suggestion outcomes.",
        points: [
          "High-accept categories. Avoid repeating rejected ideas.",
        ],
        example: "Refines next suggestions from feedback.",
      },
    ],
    proTip:
      "Core dev only. Say 'task brief for Claude 4.6', 'cost status', 'ONNX status', 'art gems', 'clawdbot setup', 'what should we do next', 'improve docs'. For trading or wealth plan, use VINCE or Solus.",
  },

  ECHO: {
    headline: "Your ears on Crypto Twitter.",
    intro:
      "Chief Sentiment Officer (CSO): captures and communicates what CT is saying. Pulse, vibe, threads, account analysis, watchlist, news from X. Subjective sentiment only—VINCE owns the numbers. Whale and alpha accounts weighted; contrarian warnings when sentiment gets extreme. No content audit—that's Eliza.",
    tags: [
      { label: "CSO", withSparkles: true },
      { label: "X / CT" },
      { label: "Pulse & Vibe" },
      { label: "Threads" },
      { label: "Watchlist" },
      { label: "Sentiment only" },
    ],
    capabilities: [
      {
        title: "Pulse",
        description:
          "ALOHA-style briefing: what's CT saying, confidence, whale alignment, breaking content. Full or quick. Last 24h.",
      },
      {
        title: "Vibe",
        description:
          "Sentiment check for a topic (BTC, ETH, SOL, etc.). Quick read.",
      },
      {
        title: "Threads & Accounts",
        description:
          "Thread discovery and summarization. Account analysis and reputation tiers. \"What did @user say about X?\"",
      },
      {
        title: "Watchlist",
        description:
          "Recent tweets from your watchlist accounts. Add/remove via CLI.",
      },
      {
        title: "News from X",
        description:
          "X News API. Headlines and context.",
      },
      {
        title: "Save that",
        description:
          "X_SAVE_RESEARCH saves last pulse, vibe, or news to a markdown file.",
      },
      {
        title: "Contrarian warnings",
        description:
          "Flags when sentiment is extreme. Not all opinions equal—whale/alpha weighted.",
      },
    ],
    plugins: [
      {
        name: "Plugin-X-Research",
        category: "X / CT",
        summary:
          "X_PULSE, X_VIBE, X_THREAD, X_ACCOUNT, X_MENTIONS, X_NEWS, X_WATCHLIST, X_SAVE_RESEARCH. Official X API v2. Sentiment and alpha only—no content audit (Eliza).",
        points: [
          "Pulse and vibe from last 24h. Quality/whale filter when asked.",
          "Watchlist read-only in chat; add/remove via CLI.",
        ],
        example: '"What\'s CT saying about BTC?" or "check my watchlist"',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "One voice. Casual, data-backed. Cites sources; flags confidence.",
        points: [
          "Lead with the vibe, then details.",
          "Defers price/data to VINCE.",
        ],
        example: '"Quick pulse on SOL" or "who should I follow for alpha?"',
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers context.",
        points: [],
        example: "",
      },
    ],
    proTip:
      "Say \"What's CT saying about BTC?\" or \"quick pulse\". For content audit or top posts playbook, ask Eliza.",
  },

  Clawterm: {
    headline: "OpenClaw research terminal.",
    intro:
      "Multi-agent crypto research: alpha (X sentiment, KOL), market (prices, volume, funding, OI), onchain (whale flows, DEX), news. Gateway status, setup guide, watchlist, portfolio, alerts, analytics, insights, backtest, correlation, reporting, governance, webhooks. Lead with the outcome. Benefit-led, no AI-slop. In-process or via Gateway when OPENCLAW_GATEWAY_URL is set.",
    tags: [
      { label: "OpenClaw Terminal", withSparkles: true },
      { label: "Research" },
      { label: "Gateway Status" },
      { label: "Setup Guide" },
      { label: "Watchlist & Portfolio" },
      { label: "Alerts & Analytics" },
    ],
    capabilities: [
      {
        title: "Run Research",
        description:
          "Alpha (X sentiment, KOL), market (prices, volume, funding, OI), onchain (whale flows, DEX), news, or all in parallel. Default tokens from OPENCLAW_DEFAULT_TOKENS or SOL BTC ETH.",
      },
      {
        title: "Gateway Status",
        description:
          "Check OpenClaw Gateway health when OPENCLAW_GATEWAY_URL is set. One-line status.",
      },
      {
        title: "Setup Guide",
        description:
          "Step-by-step OpenClaw install and configuration.",
      },
      {
        title: "Watchlist, Portfolio, History",
        description:
          "Organization: add tokens, track positions, scheduler.",
      },
      {
        title: "Compare, Alerts, Analytics, Insights",
        description:
          "Analytics, alerts, advanced metrics, AI signals, market overview.",
      },
      {
        title: "Backtest, Correlation, Reporting",
        description:
          "Strategy backtest, cross-token correlation, professional reports, governance, webhooks.",
      },
    ],
    plugins: [
      {
        name: "Plugin-OpenClaw",
        category: "Research",
        summary:
          "Multi-agent research (alpha, market, onchain, news), gateway status, setup guide, watchlist, portfolio, alerts, analytics, insights, backtest, correlation, reporting, governance, webhooks.",
        points: [
          "RUN_OPENCLAW_RESEARCH: alpha, market, onchain, news, or all.",
          "OPENCLAW_GATEWAY_STATUS, OPENCLAW_SETUP_GUIDE.",
          "In-process or via Gateway when OPENCLAW_GATEWAY_URL is set.",
        ],
        example: '"research SOL BTC" or "gateway status" or "openclaw setup"',
      },
      {
        name: "Knowledge",
        category: "Context",
        summary:
          "clawdbot, OPENCLAW_VISION, setup-guides, branding.",
        points: [
          "ClawdBot curated follows, OpenClaw practical tips, one-click install plans.",
          "Vision and lore. Benefit-led, no AI-slop.",
        ],
        example: "Answers from clawdbot and OpenClaw vision docs.",
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "One voice. Lead with the outcome. Run research or status when asked; report the result directly.",
        points: [],
        example: "",
      },
      {
        name: "SQL",
        category: "Database",
        summary:
          "Memories and state.",
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
      "Say 'research SOL BTC', 'gateway status', or 'openclaw setup'. For paper bot or VINCE data, ask VINCE.",
  },

  Oracle: {
    headline: "A palantir into what the market thinks.",
    intro:
      "Prediction-markets specialist (Polymarket-first). Read-only discovery, odds, orderbooks, portfolio. Priority markets are a palantir into market belief; signals feed the paper bot (perps on Hyperliquid), Hypersurface strike selection (weekly predictions most important), and a macro vibe check. No trading—handoffs: live perps/paper bot → VINCE, strike/execution → Solus, DeFi/wallet → Otaku.",
    tags: [
      { label: "Polymarket", withSparkles: true },
      { label: "Palantir" },
      { label: "Paper bot signals" },
      { label: "Hypersurface strikes" },
      { label: "Vibe check" },
      { label: "Read-only" },
    ],
    capabilities: [
      {
        title: "VINCE-priority markets",
        description:
          "Markets that matter for us: crypto (Bitcoin, ETH, SOL, ETF, weekly/monthly), finance (stocks, fed rates, treasuries), geopolitics, economy. GET_VINCE_POLYMARKET_MARKETS. Signals feed paper bot, Hypersurface strike choice, and vibe check.",
      },
      {
        title: "Discovery & search",
        description:
          "Trending markets, search by keyword or category, market detail, real-time prices, price history, categories, events.",
      },
      {
        title: "Orderbooks & analytics",
        description:
          "Orderbook depth, open interest, live volume, spreads. Condition_id and token_id for follow-ups.",
      },
      {
        title: "Portfolio (wallet)",
        description:
          "Positions, balance, trade history, closed positions, user activity, top holders—when a wallet address is provided.",
      },
      {
        title: "Why we care",
        description:
          "Odds are a palantir. Short-term predictions improve the paper bot (perps). Weekly predictions help pick the right strike on Hypersurface—by far the most important. Plus macro vibe check.",
      },
    ],
    plugins: [
      {
        name: "Plugin-Polymarket-Discovery",
        category: "Prediction markets",
        summary:
          "Read-only Polymarket: priority markets, search, detail, prices, orderbooks, events, portfolio. Signals feed paper bot, Hypersurface strikes (weekly key), vibe check.",
        points: [
          "GET_VINCE_POLYMARKET_MARKETS for focus topics.",
          "SEARCH_POLYMARKETS, GET_POLYMARKET_DETAIL, orderbooks, spreads.",
        ],
        example: '"What Polymarket markets matter for us?" or "trending predictions"',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "One clear answer. Cite condition_id and token_id. Benefit-led, no AI-slop.",
        points: [],
        example: "",
      },
      {
        name: "Bootstrap",
        category: "Memory",
        summary:
          "Remembers. Recent activity context for discovery.",
        points: [],
        example: "",
      },
    ],
    proTip:
      "Ask \"What Polymarket markets matter for us?\" or \"Show our focus markets\". For live perps or paper bot ask VINCE; for strike/execution ask Solus.",
  },

  Eliza: {
    headline: "24/7 research & knowledge expansion.",
    intro:
      "CEO for vision, knowledge, research, and GTM. Eliza runs the corpus: upload, ingest (URLs, YouTube), knowledge status, audit knowledge, fill gaps. She drafts Substack essays (WRITE_ESSAY) and tweets (DRAFT_TWEETS), and answers legal/compliance and positioning from knowledge. She does not provide live data—that's VINCE.",
    tags: [
      { label: "CEO", withSparkles: true },
      { label: "Corpus" },
      { label: "Upload" },
      { label: "Audit" },
      { label: "Knowledge" },
      { label: "Research" },
      { label: "GTM" },
      { label: "Substack" },
    ],
    capabilities: [
      {
        title: "Upload & Ingest",
        description:
          "URLs, YouTube, text into knowledge/.",
      },
      {
        title: "Knowledge Status & Audit",
        description:
          "Health, coverage, missing subtopics.",
      },
      {
        title: "Fill Gaps & Research Agenda",
        description:
          "Generate topics, queue, research session.",
      },
      {
        title: "Draft Essay",
        description:
          "Substack essays from knowledge (voice-aware).",
      },
      {
        title: "Draft Tweets",
        description:
          "Tweet suggestions for @ikigaistudioxyz.",
      },
      {
        title: "Legal & GTM",
        description:
          "Disclaimers, positioning, how we describe ourselves (from knowledge).",
      },
      {
        title: "Explore & Brainstorm",
        description:
          "Open-ended research and ideation from corpus.",
      },
      {
        title: "Web Search",
        description:
          "When the knowledge base has gaps.",
      },
    ],
    plugins: [
      {
        name: "Plugin-Eliza",
        category: "Corpus & Research",
        summary:
          "UPLOAD, KNOWLEDGE_STATUS, audit knowledge, fill gaps, WRITE_ESSAY, DRAFT_TWEETS, ADD_MICHELIN for #knowledge. Corpus health, research queue, Substack and tweet drafts.",
        points: [
          "Upload/ingest, knowledge status, audit, fill gaps.",
          "WRITE_ESSAY (Substack), DRAFT_TWEETS.",
        ],
        example: '"knowledge status", "audit knowledge", "write an essay", "draft tweets"',
      },
      {
        name: "Powered by ElizaOS",
        category: "AI Engine",
        summary:
          "One voice across corpus, research, and content. RAG over knowledge; no live data.",
        points: [
          "Corpus-first. Research and GTM from knowledge.",
        ],
        example: '"explore our knowledge", "what\'s our positioning?"',
      },
      {
        name: "SQL",
        category: "Database",
        summary:
          "Remembers context. Semantic search over past convos and knowledge.",
        points: [
          "Remembers context across sessions.",
          "Semantic search over past conversations and corpus.",
        ],
        example: "Eliza recalls what you discussed and what's in the corpus.",
      },
      {
        name: "Web Search",
        category: "Research",
        summary:
          "When the knowledge base has gaps.",
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
          "Remembers. Learns from conversations.",
        points: [
          "Facts. Understanding. Preferences.",
        ],
        example: "Consistent context for research and drafts.",
      },
    ],
    proTip:
      "Upload a link or YouTube. Ask 'knowledge status' or 'audit knowledge'. Request a Substack draft or tweet draft. For live data, ask VINCE.",
  },
};

export function getAboutConfig(agentName?: string | null): AboutConfig {
  const key = agentName?.trim() || DEFAULT_AGENT;
  return ABOUT_CONFIG[key] ?? ABOUT_CONFIG[DEFAULT_AGENT];
}

export function getAboutAgentDisplayName(agentName?: string | null): string {
  return agentName?.trim() || DEFAULT_AGENT;
}
