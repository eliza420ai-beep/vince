import { Tool } from "@/frontend/components/action-tool";
import { ToolGroup } from "@/frontend/components/action-tool-group";
import { AnimatedResponse } from "@/frontend/components/chat/animated-response";
import { ChatPriceChart } from "@/frontend/components/chat/chat-price-chart";
import { MarketPulseCard } from "@/frontend/components/chat/market-pulse-card";
import ArrowRightIcon from "@/frontend/components/icons/arrow-right";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardContent } from "@/frontend/components/ui/card";
import {
  convertActionMessageToToolPart,
  isActionMessage,
} from "@/frontend/lib/action-message-utils";
import { elizaClient } from "@/frontend/lib/elizaClient";
import { socketManager } from "@/frontend/lib/socketManager";
import { cn } from "@/frontend/lib/utils";
import type { Agent, UUID } from "@elizaos/core";
import {
  Loader2,
  ArrowLeft,
  Wallet,
  TrendingUp,
  Search,
  Repeat,
  Database,
  CheckCircle2,
  BarChart2,
  Newspaper,
  Flame,
  Building2,
  ImageIcon,
  Upload,
  BookOpen,
  Lightbulb,
  Video,
  Briefcase,
  Target,
  Calendar,
  Users,
  FileCode,
  Tag,
  Coins,
  Zap,
  Sun,
  UtensilsCrossed,
  Wine,
  MapPin,
  Waves,
  Dumbbell,
  CalendarDays,
  Activity,
  CupSoda,
  TreePine,
  HelpCircle,
  Palette,
  Sparkles,
  ClipboardList,
  ListTodo,
  PenLine,
  MessageSquare,
  Megaphone,
  Shield,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "@/frontend/components/ui/textarea";

// Plugin definitions with metadata and sample prompts
const PLUGIN_ACTIONS = {
  cdp: {
    name: "CDP Wallet",
    icon: Wallet,
    description: "Manage your wallet and assets",
    prompts: [
      "Show my wallet portfolio",
      "Transfer 0.01 ETH to 0x...",
      "Swap 100 USDC for ETH",
      "Transfer NFT #123 from collection 0x...",
    ],
  },
  coingecko: {
    name: "Price & Market Data",
    icon: TrendingUp,
    description: "Token prices and market trends",
    prompts: [
      "Get ETH price chart and insights",
      "What's trending on Base?",
      "Show me trending NFT collections",
      "Get Bitcoin price",
    ],
  },
  webSearch: {
    name: "Web & News",
    icon: Search,
    description: "Search the web and crypto news",
    prompts: [
      "Latest DeFi news",
      "Search for Ethereum upgrades",
      "Crypto market news today",
    ],
  },
  defillama: {
    name: "DeFi Analytics",
    icon: Database,
    description: "Protocol TVL and DeFi metrics",
    prompts: [
      "Compare Aave vs Uniswap TVL",
      "Get Uniswap TVL",
      "Compare Eigen vs Morpho",
    ],
  },
  relay: {
    name: "Cross-Chain Bridge",
    icon: Repeat,
    description: "Bridge assets across chains",
    prompts: [
      "Bridge USDC from Base to Arbitrum",
      "Get bridge quote for 100 USDC from Base to Ethereum",
      "Check bridge status for tx 0x...",
    ],
  },
  etherscan: {
    name: "Transaction Checker",
    icon: CheckCircle2,
    description: "Verify transaction confirmations",
    prompts: [
      "Check confirmation for tx 0x...",
      "Verify transaction status 0x...",
      "How many confirmations for 0x...",
    ],
  },
};

// Quick actions per agent: each agent shows prompts that match what they do best
const QUICK_ACTIONS_BY_AGENT: Record<
  string,
  { label: string; message: string }[]
> = {
  // VINCE (CDO): Locked in on data and flagship actions (ALOHA, report, perps, options, paper bot, news, HIP3, memes, intel). X research is on Echo.
  vince: [
    { label: "What can the CDO do?", message: "What can you do?" },
    { label: "ALOHA", message: "aloha" },
    { label: "Report of the day", message: "report of the day" },
    { label: "Options", message: "options" },
    { label: "Perps", message: "perps" },
    { label: "Trading Bot", message: "bot status" },
    { label: "News", message: "news" },
    { label: "HIP3", message: "hip3" },
    { label: "Memes", message: "meme scanner" },
    { label: "NFT Floor", message: "nft floor" },
    { label: "Intel", message: "intel" },
  ],
  // Eliza (CEO): vision, knowledge, research, GTM, Substack.
  eliza: [
    { label: "What can the CEO do?", message: "What can you do?" },
    { label: "Upload", message: "upload" },
    { label: "Ingest video", message: "ingest this video" },
    { label: "Knowledge status", message: "knowledge status" },
    { label: "Audit knowledge", message: "audit knowledge" },
    { label: "Our research", message: "what does our research say" },
    { label: "Brainstorm", message: "let's brainstorm" },
    { label: "Explore knowledge", message: "explore our knowledge" },
    { label: "Draft essay", message: "write an essay" },
    { label: "Draft tweets", message: "draft tweets" },
    { label: "Positioning", message: "what's our positioning?" },
    { label: "Research agenda", message: "research agenda" },
  ],
  // Kelly (CVO): lifestyle concierge — benefit-led, concrete, evocative. Live the life.
  kelly: [
    { label: "Live the life", message: "What can you do?" },
    { label: "Today's move", message: "What should I do today?" },
    {
      label: "Best table",
      message: "Where should I eat? Somewhere within 2 hours of home.",
    },
    { label: "Where to stay", message: "Where should I stay this weekend?" },
    { label: "Open something good", message: "Recommend a wine for tonight" },
    {
      label: "Cook tonight",
      message: "What should I cook for dinner tonight?",
    },
    { label: "The ocean", message: "How's the surf in Biarritz?" },
    { label: "Pool or rower?", message: "Recommend a workout for today" },
    {
      label: "Week ahead",
      message: "What's the week ahead? This week's picks",
    },
    { label: "Coast road", message: "Plan me a road trip this week" },
    { label: "The 1000m", message: "Tips for my daily 1000m" },
    { label: "Dammann Frères", message: "What tea for this evening?" },
    { label: "Touch grass", message: "I've been grinding—need to rebalance" },
    {
      label: "Make something",
      message: "Creative tips—what should I work on?",
    },
    { label: "Ask me something", message: "Ask me an interesting question" },
  ],
  // Solus (CFO): on-chain options expert, Hypersurface mechanics, strike ritual, plan and call.
  solus: [
    { label: "What can the CFO do?", message: "What can you do?" },
    { label: "How Hypersurface works", message: "How does Hypersurface work?" },
    {
      label: "Optimal strike this week",
      message:
        "What's the optimal strike for BTC this week? I'll paste VINCE's options view.",
    },
    {
      label: "Strike ritual",
      message:
        "Walk me through strike ritual for Friday — covered calls vs secured puts",
    },
    {
      label: "Secured puts vs calls",
      message: "When do I sell secured puts vs covered calls on Hypersurface?",
    },
    {
      label: "Assess my position",
      message:
        "I have a Hypersurface position — here are the details: [paste strike, notional, premium, expiry]",
    },
    {
      label: "Size or Skip?",
      message:
        "Give me size, skip, or watch and invalidation — I'll paste context",
    },
    { label: "$100K Plan", message: "full $100K plan" },
    { label: "What's Your Call?", message: "what's your call?" },
  ],
  // Sentinel (CTO): core dev, ops, cost, ONNX, clawdbot.
  sentinel: [
    { label: "What can the CTO do?", message: "What can you do?" },
    { label: "Task Brief", message: "task brief for Claude 4.6" },
    { label: "Cost Status", message: "cost status" },
    { label: "ONNX Status", message: "ONNX status" },
    { label: "ART Gems", message: "art gems" },
    { label: "Clawdbot Guide", message: "clawdbot setup" },
    { label: "What's Next?", message: "what should we do next" },
    { label: "Improve Docs", message: "improve docs" },
    { label: "PRD for Cursor", message: "prd for cursor" },
    { label: "What to Ship?", message: "what should we ship" },
    { label: "Security Checklist", message: "security checklist" },
    { label: "Investor Report", message: "investor report" },
  ],
  // Otaku (COO): DeFi ops executor, token discovery, Morpho, yield, CDP wallet, Bankr (balance/swap/token launch/orders).
  otaku: [
    { label: "What can the COO do?", message: "What can you do?" },
    { label: "Smart Money", message: "smart money flows" },
    { label: "Token Discovery", message: "token discovery screener" },
    { label: "Morpho", message: "Morpho vault APY" },
    { label: "PnL Leaderboard", message: "PnL leaderboard" },
    { label: "Yield Rates", message: "best DeFi yield rates" },
    { label: "Token Flows", message: "token flows" },
    { label: "Portfolio", message: "Show my portfolio" },
    {
      label: "Bankr: Balance",
      message: "Ask Bankr: what is my ETH balance on Base?",
    },
    {
      label: "Bankr: Swap",
      message: "Ask Bankr to swap 10 USDC for ETH on Base",
    },
    {
      label: "Launch Token",
      message:
        "Ask Bankr to deploy a token called MyAgent with symbol AGENT on base",
    },
    {
      label: "Limit Order Quote",
      message: "Get a limit buy quote for ETH on Base via Bankr",
    },
  ],
  // ECHO (CSO): CT sentiment, X pulse, vibe, threads, account analysis, news (plugin-x-research). What's the trade = belief-router (thesis → one expression).
  echo: [
    { label: "What can you do?", message: "What can you do?" },
    { label: "What's the trade", message: "What's the trade today?" },
    { label: "X Pulse", message: "What's CT saying today?" },
    { label: "Vibe: BTC", message: "What's the vibe on BTC?" },
    { label: "Vibe: ETH", message: "Sentiment on ETH" },
    { label: "Vibe: SOL", message: "What's the sentiment on SOL?" },
    {
      label: "Summarize thread",
      message:
        "Summarize a thread — paste a tweet URL in your next message (e.g. https://x.com/user/status/123).",
    },
    { label: "Who is @user?", message: "Who is @crediblecrypto?" },
    { label: "X News", message: "What's the crypto news on X?" },
    { label: "CT Headlines", message: "Headlines from crypto Twitter" },
  ],
  // Oracle: Polymarket discovery, priority markets (palantir → paper bot, Hypersurface strikes, vibe check).
  oracle: [
    { label: "What can you do?", message: "What can you do?" },
    {
      label: "Our focus markets",
      message: "What Polymarket markets matter for us?",
    },
    {
      label: "Trending predictions",
      message: "What are the trending polymarket predictions?",
    },
    {
      label: "Search: Bitcoin",
      message: "Search polymarket for bitcoin predictions",
    },
    {
      label: "Why we care",
      message: "Why do we care about these Polymarket markets?",
    },
    {
      label: "Categories",
      message: "What categories are available on polymarket?",
    },
  ],
  // Naval: on-topic, on-brand (push not pull, thesis first, one team one dream, signal not hype, paper before live, one command, size/skip/watch, why this trade, one terminal, agents as leverage, touch grass, cover costs). Paste context after clicking.
  naval: [
    { label: "What can you do?", message: "What can you do?" },
    { label: "Push Not Pull", message: "push not pull" },
    { label: "One Team One Dream", message: "one team one dream" },
    { label: "Thesis First", message: "thesis first" },
    { label: "Signal Not Hype", message: "signal not hype" },
    { label: "Paper Before Live", message: "paper before live" },
    { label: "One Command", message: "one command" },
    { label: "Size / Skip / Watch", message: "size skip watch" },
    { label: "Why This Trade", message: "why this trade" },
    { label: "One Terminal", message: "one terminal" },
    { label: "Agents as Leverage", message: "agents as leverage" },
    { label: "Touch Grass", message: "touch grass" },
    { label: "Cover Costs Then Profit", message: "cover costs then profit" },
    { label: "Specific Knowledge Audit", message: "specific knowledge audit" },
    { label: "Expected Value", message: "expected value" },
  ],
  // Clawterm: AI terminal, OpenClaw expert — AI 2027, AGI, setup, gateway, openclaw-agents, tips, use cases, HIP-3 AI assets. For crypto data—VINCE.
  clawterm: [
    { label: "What can you do?", message: "What can you do?" },
    { label: "AI 2027", message: "What's AI 2027?" },
    { label: "AGI timeline", message: "Tell me about the AGI timeline" },
    { label: "Research agents", message: "What are research agents?" },
    { label: "Gateway Status", message: "gateway status" },
    { label: "OpenClaw Setup", message: "openclaw setup" },
    { label: "OpenClaw security", message: "OpenClaw security guide" },
    { label: "OpenClaw agents", message: "openclaw agents" },
    { label: "Workspace sync", message: "workspace sync" },
    { label: "OpenClaw tips", message: "tips for OpenClaw" },
    { label: "Use cases", message: "What are OpenClaw use cases?" },
    { label: "HIP-3 AI assets", message: "HIP-3 AI assets on Hyperliquid?" },
    { label: "Search X: AGI", message: "Search X for AGI timeline" },
    { label: "Search X: OpenClaw", message: "Search X for OpenClaw" },
  ],
};

function getQuickActionsForAgent(
  agentName: string,
): { label: string; message: string }[] {
  const key = (agentName || "").toLowerCase().trim();
  return QUICK_ACTIONS_BY_AGENT[key] ?? QUICK_ACTIONS_BY_AGENT.vince;
}

// Limitations for quick actions (shown under the Quick: buttons when present). Keep short and clear.
const QUICK_ACTIONS_LIMITATIONS: Record<string, string> = {
  vince:
    "Objective data and paper bot. For X/CT sentiment and threads, ask Echo.",
  eliza:
    "Knowledge and research only. For live data, bot status, or execution, ask VINCE.",
  kelly:
    "Hotels, dining, wine, surf, wellness, creative. No trading advice—Kelly asks the team for you.",
  echo: "Requires X_BEARER_TOKEN. Subject to X API rate limits and 7-day window.",
  sentinel: "Core dev and ops only. No trading—ask VINCE or Solus.",
  oracle:
    "Read-only. For live perps or paper bot ask VINCE; for strike/execution ask Solus.",
  clawterm:
    "AI terminal, OpenClaw expert. For crypto research, prices, watchlist, portfolio—ask VINCE.",
  naval:
    "Frameworks only (push not pull, thesis first, size/skip/watch, etc.). Paste context after the prompt. No trading—ask VINCE or Solus.",
};

// Alpha at a glance: terminal dashboards as TLDR cards (same style as Quick Start)
const ALPHA_CATEGORIES: Record<
  string,
  { title: string; icon: typeof Wallet; promptToAsk: string }
> = {
  perps: { title: "PERPS / PRICES", icon: BarChart2, promptToAsk: "aloha" },
  options: { title: "OPTIONS", icon: TrendingUp, promptToAsk: "options" },
  nft: { title: "NFT FLOOR", icon: ImageIcon, promptToAsk: "nft floor" },
  memes: { title: "MEMES", icon: Flame, promptToAsk: "meme scanner" },
  tradfi: { title: "TRADFI", icon: Building2, promptToAsk: "tradfi" },
  paper: { title: "PAPER", icon: Wallet, promptToAsk: "bot status" },
  news: { title: "NEWS", icon: Newspaper, promptToAsk: "mando minutes" },
};

// Eliza: research & knowledge expansion — ingest, brainstorm, explore corpus
const ELIZA_CATEGORIES: Record<
  string,
  {
    title: string;
    icon: typeof Wallet;
    promptToAsk: string;
    description: string;
  }
> = {
  upload: {
    title: "Upload",
    icon: Upload,
    promptToAsk: "upload",
    description: "Paste a URL or content to ingest into the knowledge base",
  },
  ingestVideo: {
    title: "Ingest Video",
    icon: Video,
    promptToAsk: "ingest this video",
    description: "Send a YouTube or video URL to summarize and save",
  },
  knowledgeStatus: {
    title: "Knowledge Status",
    icon: Activity,
    promptToAsk: "knowledge status",
    description: "Health and coverage of the knowledge base",
  },
  auditKnowledge: {
    title: "Audit Knowledge",
    icon: ClipboardList,
    promptToAsk: "audit knowledge",
    description: "Coverage gaps and missing subtopics",
  },
  researchAgenda: {
    title: "Research Agenda",
    icon: ListTodo,
    promptToAsk: "research agenda",
    description: "Current priorities and research queue",
  },
  fillGaps: {
    title: "Fill Gaps",
    icon: Target,
    promptToAsk: "fill gaps",
    description: "Generate research topics from audit gaps",
  },
  research: {
    title: "Our Research",
    icon: BookOpen,
    promptToAsk: "what does our research say",
    description: "Query the knowledge base for frameworks and insights",
  },
  brainstorm: {
    title: "Brainstorm",
    icon: Lightbulb,
    promptToAsk: "let's brainstorm",
    description: "Ideate and explore ideas with Eliza",
  },
  explore: {
    title: "Explore Knowledge",
    icon: Search,
    promptToAsk: "explore our knowledge",
    description: "Browse and search the corpus",
  },
  draftEssay: {
    title: "Draft Essay",
    icon: PenLine,
    promptToAsk: "write an essay",
    description: "Substack essay from knowledge (voice-aware)",
  },
  draftTweets: {
    title: "Draft Tweets",
    icon: MessageSquare,
    promptToAsk: "draft tweets",
    description: "Tweet suggestions for @ikigaistudioxyz",
  },
  positioning: {
    title: "Positioning / GTM",
    icon: Megaphone,
    promptToAsk: "what's our positioning?",
    description: "How we describe ourselves (marketing-gtm)",
  },
};

// Solus: execution architect — plan, process, call only. Data (yield, options chains, bot, X) = VINCE.
const SOLUS_CATEGORIES: Record<
  string,
  {
    title: string;
    icon: typeof Wallet;
    promptToAsk: string;
    description: string;
  }
> = {
  stack: {
    title: "$100K Stack Plan",
    icon: Target,
    promptToAsk: "full $100K plan",
    description:
      "Seven pillars: sats, yield, Echo DD, options, paper perps, HIP-3, airdrops",
  },
  targets: {
    title: "This Week's Targets",
    icon: TrendingUp,
    promptToAsk: "this week's targets",
    description:
      "Strike ritual output — size, expiry, invalidation (get options data from VINCE first)",
  },
  sizeSkip: {
    title: "Size or Skip?",
    icon: Target,
    promptToAsk:
      "Give me size, skip, or watch and invalidation — I'll paste context",
    description: "Paste VINCE's (or any) context; Solus gives the call",
  },
  echo: {
    title: "Echo DD",
    icon: BookOpen,
    promptToAsk: "Echo seed due diligence",
    description: "Seed-stage DD via Echo (Coinbase, Cobie) — process, not FOMO",
  },
  rebalance: {
    title: "Rebalance",
    icon: Wallet,
    promptToAsk: "how should I rebalance my stack?",
    description: "Allocation across pillars and risk",
  },
  call: {
    title: "What's Your Call?",
    icon: TrendingUp,
    promptToAsk: "what's your call?",
    description:
      "Clear buy/sell/watch with invalidation — architect's decision",
  },
};

// Sentinel: core dev — task brief, cost, ONNX, ART, clawdbot, suggestions, docs. No trading.
const SENTINEL_CATEGORIES: Record<
  string,
  {
    title: string;
    icon: typeof Wallet;
    promptToAsk: string;
    description: string;
  }
> = {
  taskBrief: {
    title: "Task Brief",
    icon: FileCode,
    promptToAsk: "task brief for Claude 4.6",
    description:
      "Pasteable block for Claude Code / Cursor — task + architecture rules",
  },
  costStatus: {
    title: "Cost Status",
    icon: BarChart2,
    promptToAsk: "cost status",
    description: "Burn rate, breakeven, 100K target — TREASURY + Usage tab",
  },
  onnxStatus: {
    title: "ONNX Status",
    icon: Zap,
    promptToAsk: "ONNX status",
    description:
      "Feature-store, training readiness, next step (train_models, Supabase)",
  },
  artGems: {
    title: "ART Gems",
    icon: Palette,
    promptToAsk: "art gems",
    description: "3–5 reusable patterns from elizaOS examples/art",
  },
  clawdbot: {
    title: "Clawdbot Guide",
    icon: BookOpen,
    promptToAsk: "clawdbot setup",
    description:
      "Knowledge research without X API — curated X + Birdy → pipeline",
  },
  whatsNext: {
    title: "What's Next?",
    icon: Target,
    promptToAsk: "what should we do next",
    description: "Prioritized suggestions: architecture, ops, ONNX, plugins",
  },
  improveDocs: {
    title: "Improve Docs",
    icon: FileCode,
    promptToAsk: "improve docs",
    description: "Suggest doc improvements and consolidate progress.txt",
  },
  prd: {
    title: "PRD for Cursor",
    icon: FileCode,
    promptToAsk: "prd for cursor",
    description:
      "World-class PRDs for Cursor/Claude Code — north star, acceptance criteria, architecture rules",
  },
  ship: {
    title: "What to Ship?",
    icon: Target,
    promptToAsk: "what should we ship",
    description: "Ship priorities and impact — Project Radar + Impact Scorer",
  },
  securityChecklist: {
    title: "Security Checklist",
    icon: Shield,
    promptToAsk: "security checklist",
    description: "Pre-release security checks and hardening",
  },
  investorReport: {
    title: "Investor Report",
    icon: BarChart2,
    promptToAsk: "investor report",
    description: "VC/angel summary — elevator pitch, TLDR, demos; no slides",
  },
  multiAgent: {
    title: "Multi-Agent",
    icon: Users,
    promptToAsk: "multi-agent status",
    description: "Multi-agent orchestration and ASK_AGENT flow",
  },
  tradingIntel: {
    title: "Trading Intel",
    icon: TrendingUp,
    promptToAsk: "trading intel",
    description: "Summary of trading context; execution is VINCE/Solus",
  },
};

// Clawterm: OpenClaw research terminal — research, gateway status, setup, watchlist, portfolio, alerts, analytics
const CLAWTERM_CATEGORIES: Record<
  string,
  {
    title: string;
    icon: typeof Wallet;
    promptToAsk: string;
    description: string;
  }
> = {
  research: {
    title: "Run Research",
    icon: Search,
    promptToAsk: "research SOL BTC",
    description:
      "Alpha, market, onchain, news—or all in parallel. Default tokens or specify.",
  },
  gateway: {
    title: "Gateway Status",
    icon: Zap,
    promptToAsk: "gateway status",
    description:
      "Check OpenClaw Gateway health when OPENCLAW_GATEWAY_URL is set.",
  },
  setup: {
    title: "OpenClaw Setup",
    icon: BookOpen,
    promptToAsk: "openclaw setup",
    description: "Step-by-step install and configuration.",
  },
  watchlist: {
    title: "Watchlist",
    icon: Activity,
    promptToAsk: "show my watchlist",
    description: "Add tokens, track positions, manage list.",
  },
  portfolio: {
    title: "Portfolio",
    icon: Wallet,
    promptToAsk: "show my portfolio",
    description: "Positions, balance, history.",
  },
  alerts: {
    title: "Alerts",
    icon: Shield,
    promptToAsk: "show my alerts",
    description: "Price, sentiment, whale, volume triggers.",
  },
  analytics: {
    title: "Analytics",
    icon: BarChart2,
    promptToAsk: "analytics",
    description: "Compare, trends, risk analysis, stats.",
  },
  insights: {
    title: "Insights",
    icon: Lightbulb,
    promptToAsk: "insights",
    description: "AI signals, market overview, screener.",
  },
};

// Kelly: lifestyle concierge — benefit-led, concrete, evocative. No filler. Live the life.
const KELLY_CATEGORIES: Record<
  string,
  {
    title: string;
    icon: typeof Wallet;
    promptToAsk: string;
    description: string;
  }
> = {
  daily: {
    title: "Today's Move",
    icon: Sun,
    promptToAsk: "What should I do today?",
    description: "Your day, laid out. One swim, one table, one concrete move.",
  },
  place: {
    title: "Best Table",
    icon: UtensilsCrossed,
    promptToAsk: "Where should I eat? Somewhere within 2 hours of home.",
    description:
      "One Michelin spot open today. Landes, Basque coast, Saint-Émilion.",
  },
  hotel: {
    title: "Where to Stay",
    icon: Building2,
    promptToAsk: "Where should I stay this weekend?",
    description: "One palace or relais, one reason. Within the 2h corridor.",
  },
  wine: {
    title: "Open Something Good",
    icon: Wine,
    promptToAsk: "Recommend a wine for tonight",
    description: "One bottle, one pairing, service notes. French by default.",
  },
  homeCooking: {
    title: "Cook Tonight",
    icon: Flame,
    promptToAsk: "What should I cook for dinner tonight?",
    description:
      "Green Egg, Thermomix, or long oven cook. Wine pairing included.",
  },
  surf: {
    title: "The Ocean",
    icon: Waves,
    promptToAsk: "How's the surf in Biarritz?",
    description:
      "Wave height, period, direction, water temp. When it's on, you'll know.",
  },
  workout: {
    title: "Pool or Rower?",
    icon: Dumbbell,
    promptToAsk: "Recommend a workout for today",
    description:
      "One session: pool, rower, surfer yoga, or swim. Season-aware.",
  },
  swimming: {
    title: "The 1000m",
    icon: Activity,
    promptToAsk: "Tips for my daily 1000m",
    description:
      "When and where to swim. Palace pools in winter, backyard in summer.",
  },
  weekAhead: {
    title: "Week Ahead",
    icon: CalendarDays,
    promptToAsk: "What's the week ahead? This week's picks",
    description:
      "3–5 picks across dining, stay, and wellness. Your week, sorted.",
  },
  itinerary: {
    title: "Coast Road",
    icon: MapPin,
    promptToAsk: "Plan me 2 days in Bordeaux",
    description:
      "Hotel, lunch, activities—day by day. Burmester on, no agenda required.",
  },
  experience: {
    title: "Something Special",
    icon: Sparkles,
    promptToAsk:
      "Recommend something special—wine tasting, spa, or cooking class",
    description: "One experience you'll remember. Tasting, spa, or tour.",
  },
  tea: {
    title: "Dammann Frères",
    icon: CupSoda,
    promptToAsk: "What tea for this evening?",
    description:
      "Morning or evening, by occasion. One pick, no caffeine after dark.",
  },
  rebalance: {
    title: "Touch Grass",
    icon: TreePine,
    promptToAsk: "I've been grinding—need to rebalance",
    description:
      "One concrete move: escape, pool, wine and a great meal. No screens.",
  },
  entertainment: {
    title: "What to Watch",
    icon: BookOpen,
    promptToAsk: "Recommend a book or something to watch",
    description:
      "One book, series, or album. By your taste, no scrolling required.",
  },
  creative: {
    title: "Make Something",
    icon: Palette,
    promptToAsk: "Creative tips—what should I work on?",
    description:
      "Oil painting, Hasselblad, Ableton, Blackmagic, Blender. Hands on.",
  },
  question: {
    title: "Ask Me Something",
    icon: MessageSquare,
    promptToAsk: "Ask me an interesting question",
    description: "One thought-provoking question to deepen the conversation.",
  },
};

const ALPHA_PATTERNS: {
  key: keyof typeof ALPHA_CATEGORIES;
  patterns: RegExp[];
}[] = [
  { key: "perps", patterns: [/BINANCE INTELLIGENCE/i, /COINGECKO MARKET/i] },
  { key: "options", patterns: [/DERIBIT OPTIONS/i] },
  { key: "nft", patterns: [/NFT FLOOR/i] },
  { key: "memes", patterns: [/DEXSCREENER.*MEME/i, /MEME SCANNER/i] },
  { key: "tradfi", patterns: [/HIP-3 TRADFI/i, /TRADFI DASHBOARD/i] },
  { key: "paper", patterns: [/PAPER TRADE OPENED/i] },
  { key: "news", patterns: [/MANDOMINUTES/i] },
];

function extractAlphaSummary(content: string, maxLen: number = 100): string {
  const trimmed = content.replace(/\s+/g, " ").trim();
  return trimmed.length <= maxLen ? trimmed : trimmed.slice(0, maxLen) + "…";
}

// Helper function to extract chart data from a message
const extractChartData = (message: Message): any => {
  if (message.rawMessage?.actionResult?.values?.data_points) {
    return message.rawMessage.actionResult.values;
  }

  if (message.rawMessage?.actionResult?.data?.data_points) {
    return message.rawMessage.actionResult.data;
  }

  return null;
};

// Helper function to find all chart data in an action group
const findAllChartDataInGroup = (actionGroup: Message[]): any[] => {
  const charts: any[] = [];
  for (const message of actionGroup) {
    const chartData = extractChartData(message);
    if (chartData) {
      charts.push(chartData);
    }
  }
  return charts;
};

interface Message {
  id: string;
  content: string;
  authorId: string;
  createdAt: number;
  isAgent: boolean;
  senderName?: string;
  sourceType?: string;
  type?: string;
  rawMessage?: any;
  metadata?: any;
  thought?: string;
}

interface ChatInterfaceProps {
  agent: Agent;
  userId: string;
  serverId: string;
  channelId: string | null;
  isNewChatMode?: boolean;
  connected?: boolean;
  onChannelCreated?: (channelId: string, channelName: string) => void;
  onActionCompleted?: () => void; // Callback when agent completes an action
}

const AnimatedDots = () => {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return <span>{".".repeat(dotCount)}</span>;
};

export function ChatInterface({
  agent,
  userId,
  serverId,
  channelId,
  isNewChatMode = false,
  connected = false,
  onChannelCreated,
  onActionCompleted,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<
    keyof typeof PLUGIN_ACTIONS | null
  >(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionCheck, setConnectionCheck] = useState<
    "idle" | "checking" | "ok" | "fail"
  >("idle");
  const [showDummyToolGroup, setShowDummyToolGroup] = useState(false);
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [lastAlphaByCategory, setLastAlphaByCategory] = useState<
    Record<string, { summary: string; updatedAt: number }>
  >({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false); // Track if user is actively scrolling
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_TEXTAREA_HEIGHT = 160;

  // Stabilize agent.id and agent.name to prevent unnecessary re-renders
  // Use refs to store stable values that don't trigger re-renders
  const agentIdRef = useRef(agent.id);
  const agentNameRef = useRef(agent.name);

  // Update refs when agent changes, but don't trigger re-renders
  useEffect(() => {
    agentIdRef.current = agent.id;
    agentNameRef.current = agent.name;
  }, [agent.id, agent.name]);

  // Helper function to check if user is near bottom of the chat
  const checkIfNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const threshold = 200; // pixels from bottom to consider "near bottom"
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < threshold;
  };

  // Helper function to scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Helper function to resize textarea based on content
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height =
        Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT) + "px";
    }
  }, [MAX_TEXTAREA_HEIGHT]);

  // Track scroll position - detect when user is actively scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // User is actively scrolling - disable auto-scroll
      isUserScrollingRef.current = true;

      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // After user stops scrolling for 150ms, check position
      scrollTimeoutRef.current = setTimeout(() => {
        const nearBottom = checkIfNearBottom();
        // User stopped scrolling - enable auto-scroll only if near bottom
        isUserScrollingRef.current = !nearBottom;
      }, 150);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Resize textarea when input value changes
  useEffect(() => {
    resizeTextarea();
  }, [inputValue, resizeTextarea]);

  // Clear messages when entering new chat mode
  useEffect(() => {
    if (isNewChatMode && !channelId) {
      console.log(" Entering new chat mode - clearing messages");
      setMessages([]);
    }
  }, [isNewChatMode, channelId]);

  // Load messages when channel changes
  // Only depend on channelId - using agent values directly in the function
  useEffect(() => {
    if (!channelId) return;

    async function loadMessages() {
      try {
        setIsLoadingMessages(true);
        console.log(" Loading messages for channel:", channelId);
        const messagesResponse = await elizaClient.messaging.getChannelMessages(
          channelId as UUID,
          {
            limit: 50,
          },
        );

        const formattedMessages: Message[] = messagesResponse.messages.map(
          (msg) => {
            let timestamp: number;
            if (msg.createdAt instanceof Date) {
              timestamp = msg.createdAt.getTime();
            } else if (typeof msg.createdAt === "number") {
              timestamp = msg.createdAt;
            } else if (typeof msg.createdAt === "string") {
              timestamp = Date.parse(msg.createdAt);
            } else {
              timestamp = Date.now();
            }

            return {
              id: msg.id,
              content: msg.content,
              authorId: msg.authorId,
              createdAt: timestamp,
              isAgent: msg.authorId === agentIdRef.current,
              senderName:
                msg.metadata?.authorDisplayName ||
                (msg.authorId === agentIdRef.current
                  ? agentNameRef.current
                  : "User"),
              sourceType: msg.sourceType,
              type: msg.sourceType,
              rawMessage: msg.rawMessage,
              metadata: msg.metadata,
              thought: (msg as any).thought,
            };
          },
        );

        const sortedMessages = formattedMessages.sort(
          (a, b) => a.createdAt - b.createdAt,
        );
        setMessages(sortedMessages);
        setIsLoadingMessages(false);
        isUserScrollingRef.current = false; // User is not scrolling when loading messages
        setTimeout(() => scrollToBottom("smooth"), 0);
        console.log(` Loaded ${sortedMessages.length} messages`);
      } catch (error: any) {
        console.error(" Failed to load messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    loadMessages();
  }, [channelId]);

  // Extract alpha TLDR from agent messages (Option A: reuse last agent reply)
  useEffect(() => {
    const agentMessages = [...messages]
      .filter((m) => m.isAgent && m.content?.trim())
      .sort((a, b) => b.createdAt - a.createdAt);
    const updates: Record<string, { summary: string; updatedAt: number }> = {};
    for (const msg of agentMessages) {
      const content = msg.content;
      for (const { key, patterns } of ALPHA_PATTERNS) {
        if (updates[key]) continue;
        for (const re of patterns) {
          if (re.test(content)) {
            updates[key] = {
              summary: extractAlphaSummary(content),
              updatedAt: msg.createdAt,
            };
            break;
          }
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      setLastAlphaByCategory((prev) => ({ ...prev, ...updates }));
    }
  }, [messages]);

  // Listen for new messages (channel joining is handled in App.tsx)
  // Only depend on channelId to avoid re-subscribing when agent object changes
  useEffect(() => {
    if (!channelId) return undefined;

    const handleNewMessage = (data: any) => {
      const payloadChannelId =
        data.channelId ?? data.roomId ?? data.channel_id ?? data.room_id;
      if (payloadChannelId && payloadChannelId !== channelId) {
        console.log("[Chat] Ignoring message for different channel", {
          payloadChannelId,
          currentChannelId: channelId,
        });
        return;
      }
      console.log("[Chat] New message received", {
        id: data.id,
        hasContent: !!(data.content ?? data.text ?? data.message),
        senderId: data.senderId,
        channelId: payloadChannelId || "(none in payload)",
      });

      const messageId = data.id || crypto.randomUUID();
      const newMessage: Message = {
        id: messageId,
        content: data.content || data.text || data.message || "",
        authorId: data.senderId,
        createdAt:
          typeof data.createdAt === "number"
            ? data.createdAt
            : Date.parse(data.createdAt as string),
        isAgent: data.senderId === agentIdRef.current,
        senderName:
          data.senderName ||
          (data.senderId === agentIdRef.current
            ? agentNameRef.current
            : "User"),
        sourceType: data.sourceType || data.source,
        type: data.type || data.sourceType || data.source,
        rawMessage: data.rawMessage || data,
        metadata: data.metadata,
      };

      // Show dummy tool group when user message arrives
      if (!newMessage.isAgent) {
        setShowDummyToolGroup(true);
        isUserScrollingRef.current = false; // User is not scrolling when sending message
        // Wait for DOM to update before scrolling
        setTimeout(() => scrollToBottom("smooth"), 0);
      }

      setMessages((prev) => {
        // Check if message exists - if so, update it (for action status changes)
        const existingIndex = prev.findIndex((m) => m.id === messageId);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = newMessage;
          return updated.sort((a, b) => a.createdAt - b.createdAt);
        }
        // Add new message and sort by timestamp
        const updated = [...prev, newMessage];
        return updated.sort((a, b) => a.createdAt - b.createdAt);
      });

      // Stop typing indicator when we receive any agent reply (single-step e.g. VINCE_BOT_STATUS, or multi-step summary)
      if (newMessage.isAgent) {
        // Hide dummy tool group when agent message arrives
        setShowDummyToolGroup(false);
        setIsTyping(false);
        setTimeout(() => scrollToBottom("smooth"), 0);

        const actions =
          newMessage.rawMessage?.actions || newMessage.metadata?.actions || [];
        const isSummaryMessage = actions.includes("MULTI_STEP_SUMMARY");
        const isErrorMessage = newMessage.content.startsWith(" Error:");

        if (isSummaryMessage && onActionCompleted) {
          onActionCompleted();
        }
        if (isErrorMessage) {
          setError(null);
        }
      }
    };

    // Only subscribe if socket is available - prevents errors during reconnection
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = socketManager.onMessage(handleNewMessage);
    } catch (error) {
      console.warn(
        " Failed to subscribe to messages (socket not ready):",
        error,
      );
      return undefined;
    }

    return () => {
      unsubscribe?.();
    };
  }, [channelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isCreatingChannel) return;

    // Clear any previous errors
    setError(null);

    // If in new chat mode, create channel first with generated title
    if (isNewChatMode && !channelId) {
      console.log(
        " [ChatInterface] First message in new chat mode, creating channel...",
      );
      setIsCreatingChannel(true);
      setIsTyping(true);

      try {
        // STEP 1: Try to generate title from user's message (server may not have this endpoint)
        const fallbackTitle = inputValue.trim().substring(0, 50) || "New chat";
        let generatedTitle = fallbackTitle;
        try {
          const titleResponse =
            await elizaClient.messaging.generateChannelTitle(
              inputValue,
              agent.id as UUID,
            );
          if (titleResponse?.title?.trim())
            generatedTitle = titleResponse.title.trim();
        } catch (titleErr: any) {
          // 404 / "API endpoint not found" is expected when server has no POST /generate-title
          console.log(
            " Title API unavailable, using message preview:",
            titleErr?.message ?? "",
          );
        }
        console.log(" Using title:", generatedTitle);

        // STEP 2: Create channel in DB with the generated title
        console.log(" Creating channel with title:", generatedTitle);
        const now = Date.now();
        const newChannel = await elizaClient.messaging.createGroupChannel({
          name: generatedTitle,
          participantIds: [userId as UUID, agent.id as UUID],
          metadata: {
            server_id: serverId,
            type: "DM",
            isDm: true,
            user1: userId,
            user2: agent.id,
            forAgent: agent.id,
            createdAt: new Date(now).toISOString(),
          },
        });
        console.log(" Channel created:", newChannel.id);

        // STEP 3: Notify parent component
        onChannelCreated?.(newChannel.id, generatedTitle);

        // STEP 4: Send the message (channel is now created and will be set as active)
        // The socket join will happen automatically via App.tsx's useEffect
        // Wait a brief moment for the channel to be set as active
        setTimeout(() => {
          console.log(
            " Sending initial message to new channel:",
            newChannel.id,
          );
          socketManager.sendMessage(newChannel.id, inputValue, serverId, {
            userId,
            isDm: true,
            targetUserId: agent.id,
          });
        }, 100);

        setInputValue("");
      } catch (error: any) {
        console.error(" Failed to create channel:", error);
        const errorMessage =
          error?.message || "Failed to create chat. Please try again.";
        setError(errorMessage);
        setIsTyping(false);
      } finally {
        setIsCreatingChannel(false);
      }
      return;
    }

    // Normal message sending (channel already exists)
    if (!channelId) {
      console.warn(" Cannot send message: No channel ID");
      return;
    }

    const defaultServerId = "00000000-0000-0000-0000-000000000000";
    const isDefaultServer = serverId === defaultServerId;
    console.log(" [ChatInterface] Sending message:", {
      channelId,
      text: inputValue,
      serverId,
      isDefaultServer: isDefaultServer
        ? "YES (replies should work)"
        : "NO (replies may not reach UI)",
      userId,
      agentId: agent.id,
    });
    if (!isDefaultServer) {
      console.warn(
        " [ChatInterface] serverId is not the default message server — set messageServerId/DEFAULT_MESSAGE_SERVER_ID so replies reach the UI.",
      );
    }

    // Send via socket (don't add optimistically - server will broadcast back)
    socketManager.sendMessage(channelId, inputValue, serverId, {
      userId,
      isDm: true,
      targetUserId: agent.id,
    });

    setInputValue("");
    setIsTyping(true);
  };

  // Callback for when animated text updates - auto-scroll only if user is not scrolling
  const handleAnimationTextUpdate = useCallback(() => {
    // Only auto-scroll if user is not actively scrolling and is near bottom
    if (!isUserScrollingRef.current && checkIfNearBottom()) {
      scrollToBottom("auto");
    }
  }, []); // Empty deps - scrollToBottom and isUserScrollingRef are stable

  // Handle prompt click - populate input instead of auto-sending
  const handlePromptClick = (message: string) => {
    if (!message.trim()) return;

    // Close modal if open
    setShowPromptsModal(false);

    // Populate input field with the prompt
    setInputValue(message);

    // Focus the input field
    const inputElement = document.querySelector("textarea");
    if (inputElement) {
      inputElement.focus();
    }
  };

  // Legacy function for backward compatibility (if needed elsewhere)
  const handleQuickPrompt = async (message: string) => {
    if (isTyping || !message.trim() || isCreatingChannel) return;

    // Close modal if open
    setShowPromptsModal(false);

    // Clear any previous errors
    setError(null);

    // If in new chat mode, create channel first with generated title
    if (isNewChatMode && !channelId) {
      console.log(
        " [ChatInterface] Quick prompt in new chat mode, creating channel...",
      );
      setIsCreatingChannel(true);
      setIsTyping(true);

      try {
        // STEP 1: Try to generate title (server may not have POST /generate-title)
        const fallbackTitle = message.trim().substring(0, 50) || "New chat";
        let generatedTitle = fallbackTitle;
        try {
          const titleResponse =
            await elizaClient.messaging.generateChannelTitle(
              message,
              agent.id as UUID,
            );
          if (titleResponse?.title?.trim())
            generatedTitle = titleResponse.title.trim();
        } catch (titleErr: any) {
          console.log(
            " Title API unavailable, using message preview:",
            titleErr?.message ?? "",
          );
        }

        // STEP 2: Create channel in DB with the generated title
        const now = Date.now();
        const newChannel = await elizaClient.messaging.createGroupChannel({
          name: generatedTitle,
          participantIds: [userId as UUID, agent.id as UUID],
          metadata: {
            server_id: serverId,
            type: "DM",
            isDm: true,
            user1: userId,
            user2: agent.id,
            forAgent: agent.id,
            createdAt: new Date(now).toISOString(),
          },
        });
        console.log(" Channel created:", newChannel.id);

        // STEP 3: Notify parent component
        onChannelCreated?.(newChannel.id, generatedTitle);

        // STEP 4: Send the message (channel is now created and will be set as active)
        setTimeout(() => {
          socketManager.sendMessage(newChannel.id, message, serverId, {
            userId,
            isDm: true,
            targetUserId: agent.id,
          });
        }, 100);
      } catch (error: any) {
        console.error(" Failed to create channel:", error);
        const errorMessage =
          error?.message || "Failed to create chat. Please try again.";
        setError(errorMessage);
        setIsTyping(false);
      } finally {
        setIsCreatingChannel(false);
      }
      return;
    }

    // Normal quick prompt (channel already exists)
    if (!channelId) {
      console.warn(" Cannot send message: No channel ID");
      return;
    }

    console.log(" [ChatInterface] Sending quick prompt:", {
      channelId,
      text: message,
      serverId,
      userId,
      agentId: agent.id,
    });

    // Send via socket directly
    socketManager.sendMessage(channelId, message, serverId, {
      userId,
      isDm: true,
      targetUserId: agent.id,
    });

    setIsTyping(true);
  };

  // Group consecutive action messages together
  const groupedMessages = messages.reduce<Array<Message | Message[]>>(
    (acc, message, index) => {
      const isAction = isActionMessage(message);
      const prevItem = acc[acc.length - 1];

      // If this is an action message and the previous item is an array of actions, add to that array
      if (
        isAction &&
        Array.isArray(prevItem) &&
        prevItem.length > 0 &&
        isActionMessage(prevItem[0])
      ) {
        prevItem.push(message);
      }
      // If this is an action message but previous was not, start a new array
      else if (isAction) {
        acc.push([message]);
      }
      // If this is not an action message, add it as a single message
      else {
        acc.push(message);
      }

      return acc;
    },
    [],
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-0">
      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full p-0">
          <div
            ref={messagesContainerRef}
            className="h-full overflow-y-auto p-6 pb-2"
          >
            <div className="space-y-4 h-full flex flex-col">
              {/* Market Pulse: LLM insight from terminal dashboard data */}
              <MarketPulseCard agentId={agent.id} />
              {/* Quick actions: agent-specific prompts (VINCE = markets/trading, Eliza = research/knowledge) */}
              {agent?.id && (
                <div className="mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mr-1">
                      Quick:
                    </span>
                    {getQuickActionsForAgent(agent.name ?? "").map(
                      ({ label, message }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleQuickPrompt(message)}
                          disabled={isTyping || isCreatingChannel}
                          className={cn(
                            "px-2.5 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-accent/80 text-foreground transition-colors",
                            (isTyping || isCreatingChannel) &&
                              "opacity-50 pointer-events-none",
                          )}
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                  {agent.name &&
                    QUICK_ACTIONS_LIMITATIONS[
                      (agent.name as string).toLowerCase()
                    ] && (
                      <p className="text-[10px] text-muted-foreground mt-1.5 max-w-2xl">
                        {
                          QUICK_ACTIONS_LIMITATIONS[
                            (agent.name as string).toLowerCase()
                          ]
                        }
                      </p>
                    )}
                </div>
              )}
              {/* Connection status: only show "Connecting…" when socket isn't connected and we're not already showing API error */}
              {!connected &&
                (!error ||
                  !error.toLowerCase().includes("endpoint not found")) && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Connecting…
                  </p>
                )}
              {/* Messages */}
              <div className="flex-1 space-y-4">
                {groupedMessages.map((item, groupIndex) => {
                  // Handle grouped action messages
                  if (Array.isArray(item)) {
                    const actionGroup = item;
                    const firstAction = actionGroup[0];
                    const isLastGroup =
                      groupIndex === groupedMessages.length - 1;
                    // Find all chart data in this action group
                    const chartDataArray = findAllChartDataInGroup(actionGroup);

                    // Get the latest action's status and name for label
                    const latestAction = actionGroup[actionGroup.length - 1];
                    const latestActionStatus =
                      latestAction.metadata?.actionStatus ||
                      latestAction.rawMessage?.actionStatus;
                    const latestActionName =
                      latestAction.metadata?.actions?.[0] ||
                      latestAction.rawMessage?.actions?.[0] ||
                      "action";
                    // Determine label based on state
                    const baseClasses =
                      "px-2 py-1 rounded-md text-xs font-medium border";
                    let groupLabel = (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1">
                          See execution steps
                        </div>
                        <div
                          className={cn(
                            baseClasses,
                            "bg-green-100 text-green-700 border-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-400 uppercase",
                          )}
                        >
                          Completed
                        </div>
                      </div>
                    );

                    if (isLastGroup && isTyping) {
                      if (
                        latestActionStatus === "executing" &&
                        latestActionName
                      ) {
                        groupLabel = (
                          <div className="flex items-center w-full">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500 mr-2" />
                            <div className="flex items-center gap-1">
                              executing {latestActionName} action
                              <AnimatedDots />
                            </div>
                          </div>
                        );
                      } else if (isTyping) {
                        groupLabel = (
                          <div className="flex items-center w-full">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500 mr-2" />
                            <div className="flex items-center gap-1">
                              OTAKU is thinking
                              <AnimatedDots />
                            </div>
                          </div>
                        );
                      }
                    }

                    return (
                      <div
                        key={`action-group-${groupIndex}-${firstAction.id}`}
                        className="flex flex-col gap-2 items-start"
                      >
                        <div className="max-w-[85%] w-full">
                          <ToolGroup defaultOpen={false} label={groupLabel}>
                            {actionGroup.map((message) => {
                              // Extract thought from rawMessage
                              const thought =
                                message.thought ||
                                message.rawMessage?.thought ||
                                message.metadata?.thought;

                              return (
                                <div key={message.id} className="space-y-2">
                                  {thought && (
                                    <div className="text-sm text-muted-foreground italic px-2">
                                      {thought}
                                    </div>
                                  )}
                                  <Tool
                                    toolPart={convertActionMessageToToolPart(
                                      message,
                                    )}
                                    defaultOpen={false}
                                  />
                                </div>
                              );
                            })}
                          </ToolGroup>
                        </div>

                        {/* Render all charts from this action group */}
                        {chartDataArray.length > 0 &&
                          chartDataArray.map((chartData, chartIndex) => (
                            <div
                              key={`chart-${groupIndex}-${chartIndex}`}
                              className="max-w-[85%] w-full bg-card rounded-lg border border-border p-4"
                            >
                              <ChatPriceChart data={chartData} />
                            </div>
                          ))}
                      </div>
                    );
                  }

                  // Handle single messages (user or agent text messages)
                  const message = item;
                  const messageIndex = messages.indexOf(message);
                  const isLastMessage = messageIndex === messages.length - 1;
                  const messageAge = Date.now() - message.createdAt;
                  const isRecent = messageAge < 10000; // Less than 10 seconds
                  const shouldAnimate =
                    message.isAgent && isLastMessage && isRecent;

                  // Check if this is an error message from the agent
                  const isErrorMessage =
                    message.isAgent && message.content.startsWith(" Error:");

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex flex-col gap-1",
                        message.isAgent ? "items-start" : "items-end",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2 text-base font-medium break-words whitespace-pre-wrap",
                          isErrorMessage
                            ? "bg-destructive/10 border border-destructive/20 text-destructive"
                            : message.isAgent
                              ? "bg-accent text-foreground"
                              : "bg-primary text-primary-foreground",
                        )}
                      >
                        <AnimatedResponse
                          className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          shouldAnimate={shouldAnimate && !isErrorMessage}
                          messageId={message.id}
                          maxDurationMs={10000}
                          onTextUpdate={handleAnimationTextUpdate}
                        >
                          {message.content}
                        </AnimatedResponse>
                        <span className="text-xs opacity-50 mt-1 block">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Dummy Tool Group - Shows while waiting for agent actions */}
                {isTyping && showDummyToolGroup && (
                  <div className="flex flex-col gap-1 items-start">
                    <div className="max-w-[85%] w-full">
                      <ToolGroup
                        defaultOpen={false}
                        animate={true}
                        label={
                          <div className="flex items-center w-full">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500 mr-2" />
                            <div className="flex items-center gap-1">
                              Analyzing your request
                              <AnimatedDots />
                            </div>
                          </div>
                        }
                      >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                          <span>
                            Processing your request
                            <AnimatedDots />
                          </span>
                        </div>
                      </ToolGroup>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex flex-col gap-1 items-center">
                    <div className="max-w-[90%] rounded-lg px-4 py-3 bg-destructive/10 border border-destructive/20 text-destructive break-words whitespace-pre-wrap">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium"> {error}</span>
                        {error.toLowerCase().includes("endpoint not found") && (
                          <>
                            <ol className="mt-2 text-xs text-muted-foreground list-decimal list-inside space-y-1">
                              <li>
                                From the project root, run:{" "}
                                <code className="px-1 rounded bg-muted">
                                  bun start
                                </code>
                              </li>
                              <li>
                                Wait until the terminal prints a URL (e.g.{" "}
                                <code className="px-1 rounded bg-muted">
                                  http://localhost:5173
                                </code>
                                ).
                              </li>
                              <li>
                                Open <strong>that exact URL</strong> in your
                                browser (not only port 3000).
                              </li>
                              <li>
                                If it still fails, run{" "}
                                <code className="px-1 rounded bg-muted">
                                  bun run build
                                </code>{" "}
                                once, then{" "}
                                <code className="px-1 rounded bg-muted">
                                  bun start
                                </code>{" "}
                                again.
                              </li>
                            </ol>
                            <p className="text-xs text-muted-foreground mt-1">
                              You're on:{" "}
                              <code className="px-1 rounded bg-muted">
                                {typeof window !== "undefined"
                                  ? window.location.origin
                                  : "?"}
                              </code>
                            </p>
                            {connectionCheck === "idle" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  setConnectionCheck("checking");
                                  try {
                                    await elizaClient.server.checkHealth();
                                    setConnectionCheck("ok");
                                  } catch {
                                    setConnectionCheck("fail");
                                  }
                                }}
                                className="mt-2 text-xs underline hover:no-underline text-left"
                              >
                                Check if backend is reachable
                              </button>
                            )}
                            {connectionCheck === "checking" && (
                              <span className="mt-2 text-xs text-muted-foreground">
                                Checking…
                              </span>
                            )}
                            {connectionCheck === "ok" && (
                              <span className="mt-2 text-xs text-green-600 dark:text-green-400">
                                Backend is reachable. If the error persists,
                                check the browser Network tab for the failing
                                request.
                              </span>
                            )}
                            {connectionCheck === "fail" && (
                              <span className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                Backend not reachable. Start it with{" "}
                                <code className="px-1 rounded bg-muted">
                                  bun start
                                </code>{" "}
                                from the project root.
                              </span>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => {
                            setError(null);
                            setConnectionCheck("idle");
                          }}
                          className="mt-2 text-xs underline hover:no-underline self-start"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Plugin-Based Quick Actions - Only show when no messages and not creating/typing */}
              {messages.length === 0 &&
                !isCreatingChannel &&
                !isTyping &&
                !isLoadingMessages && (
                  <div className="pt-3 md:pt-4 border-t border-border">
                    {/* Alpha at a glance - VINCE only: TLDR from terminal dashboards */}
                    {(agent.name || "").toLowerCase().trim() === "vince" && (
                      <div className="mb-4">
                        <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-mono mb-2 md:mb-3">
                          Alpha at a glance
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                          {(
                            Object.keys(ALPHA_CATEGORIES) as Array<
                              keyof typeof ALPHA_CATEGORIES
                            >
                          ).map((alphaKey) => {
                            const alpha = ALPHA_CATEGORIES[alphaKey];
                            const Icon = alpha.icon;
                            const stored = lastAlphaByCategory[alphaKey];
                            return (
                              <button
                                key={alphaKey}
                                type="button"
                                onClick={() =>
                                  handlePromptClick(alpha.promptToAsk)
                                }
                                className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-card/80 hover:bg-card rounded-lg md:rounded-xl border border-border/40 transition-all group hover:border-primary/40 text-left"
                              >
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                  <Icon
                                    className="size-3 md:size-3.5 text-primary shrink-0"
                                    strokeWidth={2}
                                  />
                                  <span className="text-foreground">
                                    {alpha.title}
                                  </span>
                                </div>
                                <p className="text-[11px] md:text-sm text-muted-foreground/80 leading-snug md:leading-relaxed line-clamp-2">
                                  {stored?.summary ??
                                    `Ask "${alpha.promptToAsk}" for live alpha`}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Knowledge & Research - Eliza only: upload, ingest, brainstorm, explore */}
                    {(agent.name || "").toLowerCase().trim() === "eliza" && (
                      <div className="mb-4">
                        <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-mono mb-2 md:mb-3">
                          Knowledge & Research
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                          {(
                            Object.keys(ELIZA_CATEGORIES) as Array<
                              keyof typeof ELIZA_CATEGORIES
                            >
                          ).map((key) => {
                            const item = ELIZA_CATEGORIES[key];
                            const Icon = item.icon;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  handlePromptClick(item.promptToAsk)
                                }
                                className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-card/80 hover:bg-card rounded-lg md:rounded-xl border border-border/40 transition-all group hover:border-primary/40 text-left"
                              >
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                  <Icon
                                    className="size-3 md:size-3.5 text-primary shrink-0"
                                    strokeWidth={2}
                                  />
                                  <span className="text-foreground">
                                    {item.title}
                                  </span>
                                </div>
                                <p className="text-[11px] md:text-sm text-muted-foreground/80 leading-snug md:leading-relaxed line-clamp-2">
                                  {item.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* $100K Stack - Solus only: options, paper bot, perps, HIP-3, airdrops */}
                    {(agent.name || "").toLowerCase().trim() === "solus" && (
                      <div className="mb-4">
                        <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-mono mb-2 md:mb-3">
                          $100K Stack
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                          {(
                            Object.keys(SOLUS_CATEGORIES) as Array<
                              keyof typeof SOLUS_CATEGORIES
                            >
                          ).map((key) => {
                            const item = SOLUS_CATEGORIES[key];
                            const Icon = item.icon;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  handlePromptClick(item.promptToAsk)
                                }
                                className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-card/80 hover:bg-card rounded-lg md:rounded-xl border border-border/40 transition-all group hover:border-primary/40 text-left"
                              >
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                  <Icon
                                    className="size-3 md:size-3.5 text-primary shrink-0"
                                    strokeWidth={2}
                                  />
                                  <span className="text-foreground">
                                    {item.title}
                                  </span>
                                </div>
                                <p className="text-[11px] md:text-sm text-muted-foreground/80 leading-snug md:leading-relaxed line-clamp-2">
                                  {item.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Lifestyle & Concierge - Kelly only: daily briefing, dining, wine, itinerary, surf, workout */}
                    {(agent.name || "").toLowerCase().trim() === "kelly" && (
                      <div className="mb-4">
                        <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-mono mb-2 md:mb-3">
                          Lifestyle & Concierge
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                          {(
                            Object.keys(KELLY_CATEGORIES) as Array<
                              keyof typeof KELLY_CATEGORIES
                            >
                          ).map((key) => {
                            const item = KELLY_CATEGORIES[key];
                            const Icon = item.icon;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  handlePromptClick(item.promptToAsk)
                                }
                                className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-card/80 hover:bg-card rounded-lg md:rounded-xl border border-border/40 transition-all group hover:border-primary/40 text-left"
                              >
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                  <Icon
                                    className="size-3 md:size-3.5 text-primary shrink-0"
                                    strokeWidth={2}
                                  />
                                  <span className="text-foreground">
                                    {item.title}
                                  </span>
                                </div>
                                <p className="text-[11px] md:text-sm text-muted-foreground/80 leading-snug md:leading-relaxed line-clamp-2">
                                  {item.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Core Dev & Ops - Sentinel only: task brief, cost, ONNX, ART, clawdbot, docs */}
                    {(agent.name || "").toLowerCase().trim() === "sentinel" && (
                      <div className="mb-4">
                        <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-mono mb-2 md:mb-3">
                          Core Dev & Ops
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                          {(
                            Object.keys(SENTINEL_CATEGORIES) as Array<
                              keyof typeof SENTINEL_CATEGORIES
                            >
                          ).map((key) => {
                            const item = SENTINEL_CATEGORIES[key];
                            const Icon = item.icon;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  handlePromptClick(item.promptToAsk)
                                }
                                className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-card/80 hover:bg-card rounded-lg md:rounded-xl border border-border/40 transition-all group hover:border-primary/40 text-left"
                              >
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                  <Icon
                                    className="size-3 md:size-3.5 text-primary shrink-0"
                                    strokeWidth={2}
                                  />
                                  <span className="text-foreground">
                                    {item.title}
                                  </span>
                                </div>
                                <p className="text-[11px] md:text-sm text-muted-foreground/80 leading-snug md:leading-relaxed line-clamp-2">
                                  {item.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* OpenClaw Research - Clawterm only: research, gateway, setup, watchlist, portfolio, alerts, analytics */}
                    {(agent.name || "").toLowerCase().trim() === "clawterm" && (
                      <div className="mb-4">
                        <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-mono mb-2 md:mb-3">
                          OpenClaw Research
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                          {(
                            Object.keys(CLAWTERM_CATEGORIES) as Array<
                              keyof typeof CLAWTERM_CATEGORIES
                            >
                          ).map((key) => {
                            const item = CLAWTERM_CATEGORIES[key];
                            const Icon = item.icon;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  handlePromptClick(item.promptToAsk)
                                }
                                className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-card/80 hover:bg-card rounded-lg md:rounded-xl border border-border/40 transition-all group hover:border-primary/40 text-left"
                              >
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                  <Icon
                                    className="size-3 md:size-3.5 text-primary shrink-0"
                                    strokeWidth={2}
                                  />
                                  <span className="text-foreground">
                                    {item.title}
                                  </span>
                                </div>
                                <p className="text-[11px] md:text-sm text-muted-foreground/80 leading-snug md:leading-relaxed line-clamp-2">
                                  {item.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {/* Quick Start - Otaku only: CDP, Price, DeFi, Bridge, etc. */}
                    {(agent.name || "").toLowerCase().trim() === "otaku" && (
                      <>
                        <div className="flex items-center gap-2 mb-2 md:mb-3">
                          {selectedPlugin && (
                            <button
                              onClick={() => setSelectedPlugin(null)}
                              className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ArrowLeft className="size-3" />
                              <span className="uppercase tracking-wider font-mono">
                                Back
                              </span>
                            </button>
                          )}
                          <p className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-mono">
                            {selectedPlugin
                              ? PLUGIN_ACTIONS[selectedPlugin].name
                              : "Quick Start"}
                          </p>
                        </div>

                        {/* Show plugins or plugin-specific prompts */}
                        {!selectedPlugin ? (
                          // Plugin Grid
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                            {(
                              Object.keys(PLUGIN_ACTIONS) as Array<
                                keyof typeof PLUGIN_ACTIONS
                              >
                            ).map((pluginKey) => {
                              const plugin = PLUGIN_ACTIONS[pluginKey];
                              const Icon = plugin.icon;
                              return (
                                <button
                                  key={pluginKey}
                                  onClick={() => setSelectedPlugin(pluginKey)}
                                  className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 bg-card/80 hover:bg-card rounded-lg md:rounded-xl border border-border/40 transition-all group hover:border-primary/40 text-left"
                                >
                                  <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                    <Icon
                                      className="size-3 md:size-3.5 text-primary shrink-0"
                                      strokeWidth={2}
                                    />
                                    <span className="text-foreground">
                                      {plugin.name}
                                    </span>
                                  </div>
                                  <p className="text-[11px] md:text-sm text-muted-foreground/80 leading-snug md:leading-relaxed">
                                    {plugin.description}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          // Plugin-specific prompts
                          <div className="flex flex-col gap-1.5 md:gap-2">
                            {PLUGIN_ACTIONS[selectedPlugin].prompts.map(
                              (prompt, index) => (
                                <button
                                  key={index}
                                  onClick={() => handlePromptClick(prompt)}
                                  className="px-2.5 md:px-3 py-2 text-xs md:text-sm bg-accent hover:bg-accent/80 text-foreground rounded border border-border transition-colors text-left"
                                >
                                  {prompt}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sticky Input Container */}
      <div className="sticky bottom-0 bg-background">
        <div className="border-t-2 border-muted bg-secondary min-h-12 p-1 relative">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isTyping || isCreatingChannel}
            className={cn(
              "flex-1 rounded-none border-none text-foreground placeholder-foreground/40 text-sm font-mono resize-none overflow-y-auto min-h-10 py-2.5",
              "focus-visible:outline-none focus-visible:ring-0",
            )}
            style={{ maxHeight: `${MAX_TEXTAREA_HEIGHT}px` }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
              // Shift+Enter will insert a newline (default behavior)
            }}
          />
          <Button
            variant={inputValue.trim() ? "default" : "outline"}
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isTyping || isCreatingChannel}
            className="absolute right-1.5 top-1.5 h-8 w-12 p-0"
          >
            {isTyping || isCreatingChannel ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRightIcon className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* ElizaOS Attribution Badge */}
        <div className="px-3 pb-4 pt-3 flex items-center gap-3">
          <img
            src="/assets/elizaos_badge.svg"
            alt="Powered by ElizaOS"
            className="h-10"
          />
          <div className="ml-auto text-[10px] text-muted-foreground text-right max-w-xs">
            {agent.name} is in beta. We recommend starting with smaller amounts
            for testing.
          </div>
        </div>
      </div>
    </div>
  );
}
