/**
 * Grok sub-agent definitions for crypto intel daily report (Phase 2).
 * Each sub-agent has a dedicated system prompt and query; the orchestrator
 * injects {{DATA_CONTEXT}} and {{X_VIBE_SUMMARY}} into query templates.
 */

export interface GrokSubAgentConfig {
  id: string;
  name: string;
  codename: string;
  sectionNumber: number;
  sectionTitle: string;
  systemPrompt: string;
  /** Single query; for The Rat use queryTemplates instead and merge responses. */
  queryTemplate?: string;
  /** When set, run each template and merge into one section (e.g. Alpha Hunter). */
  queryTemplates?: string[];
}

export const DATA_CONTEXT_PLACEHOLDER = "{{DATA_CONTEXT}}";
export const X_VIBE_SUMMARY_PLACEHOLDER = "{{X_VIBE_SUMMARY}}";

function injectPlaceholders(template: string, dataContext: string, xVibeSummary: string): string {
  return template
    .replace(/\{\{DATA_CONTEXT\}\}/g, dataContext)
    .replace(/\{\{X_VIBE_SUMMARY\}\}/g, xVibeSummary);
}

export function buildSubAgentUserPrompt(
  config: GrokSubAgentConfig,
  dataContext: string,
  xVibeSummary: string,
  templateIndex?: number,
): string {
  const template =
    config.queryTemplates && templateIndex !== undefined
      ? config.queryTemplates[templateIndex]
      : config.queryTemplate;
  if (!template) return "";
  return injectPlaceholders(template, dataContext, xVibeSummary);
}

export const GROK_SUB_AGENTS: GrokSubAgentConfig[] = [
  {
    id: "market_structure",
    name: "Market Structure",
    codename: "The Plumber",
    sectionNumber: 2,
    sectionTitle: "Market Structure Snapshot",
    systemPrompt: `You are a crypto market microstructure analyst. You care about what money is doing, not what people say. You track funding rates, open interest, liquidations, whale movements, exchange flows, stablecoin supply, options positioning, ETF flows, and exchange wallet movements. You only mention macro if something in the next 48 hours will directly move crypto. Otherwise skip it entirely. You have full discretion to focus on whatever flow dynamics seem most important right now.`,
    queryTemplate: `Use this data context:
{{DATA_CONTEXT}}

Our cached X sentiment for BTC/ETH/SOL/HYPE: {{X_VIBE_SUMMARY}}

Give me a market structure snapshot based on what is being discussed on X in the last 24 hours. Cover whatever you think is most important about how money is flowing through crypto markets right now. Funding rates, open interest, liquidations, whale movements, exchange inflows and outflows, stablecoin minting and burning, options positioning, ETF flows, Hyperliquid trader positioning and volume, notable exchange wallet movements, and anything else that shows where capital is actually moving. If there is a macro catalyst in the next 48 hours that will directly impact price, mention it in one sentence. If not, skip macro. What does the overall flow picture tell you about likely direction in the next 1-7 days? Use your judgment about what deserves the most attention today.`,
  },
  {
    id: "ecosystem_defi",
    name: "Ecosystem and DeFi",
    codename: "The Cartographer",
    sectionNumber: 3,
    sectionTitle: "Ecosystem and DeFi Intelligence",
    systemPrompt: `You are a blockchain ecosystem and DeFi analyst. You have a wide mandate to cover anything happening across all chains and protocols that is interesting, significant, or likely to create trading opportunities. You track TVL migrations, new protocol launches, governance proposals, yield dynamics, DEX volume shifts, infrastructure developments, and anything else that moves the needle. You decide what deserves attention based on what is actually happening, not a predetermined checklist.`,
    queryTemplate: `Use this data context:
{{DATA_CONTEXT}}

Our cached X sentiment for BTC/ETH/SOL/HYPE: {{X_VIBE_SUMMARY}}

What is the most interesting and significant activity happening across crypto ecosystems and DeFi protocols in the last 24 hours based on X discussion? Cover whatever you think matters most today. New protocols gaining traction, governance decisions that affect token value, TVL shifts, yield opportunities, technical upgrades, developer activity, emerging primitives, competitive dynamics, anything a trader or investor should know. Where is money flowing and why? What is being built that could matter? What protocols are quietly gaining users or TVL that most people have not noticed? Use your full judgment about what to prioritize.`,
  },
  {
    id: "solana_trenches",
    name: "Solana Trenches",
    codename: "The Degen",
    sectionNumber: 4,
    sectionTitle: "Solana Trenches Report",
    systemPrompt: `You are a Solana ecosystem specialist covering everything from institutional DeFi to the deepest memecoin trenches. You track pump.fun, Raydium, Meteora, Jupiter volume, KOL activity, and the full Solana meta. You can distinguish organic community traction from manufactured hype. You have wide latitude to report on whatever is most relevant in the Solana ecosystem today.`,
    queryTemplate: `Use this data context:
{{DATA_CONTEXT}}

Our cached X sentiment for BTC/ETH/SOL/HYPE: {{X_VIBE_SUMMARY}}

Give me a full Solana ecosystem and trenches report based on X discussion in the last 24 hours. Cover whatever you think is most important and interesting happening on Solana right now. Memecoins that launched and gained traction, existing tokens with notable price action, the current meta on pump.fun, DeFi protocols gaining or losing TVL, network activity, KOL and influencer activity, developer drama, exploits, rug pulls, upcoming catalysts, airdrops, new launches, trader sentiment, and anything else that stands out. Give specific token names and contract addresses where possible. What has legs and what is a trap?`,
  },
  {
    id: "alpha_hunter",
    name: "Alpha Hunter",
    codename: "The Rat",
    sectionNumber: 5,
    sectionTitle: "Alpha Signals",
    systemPrompt: `You are a paranoid alpha hunter with wide latitude to explore any corner of crypto where information asymmetry might exist. You look everywhere and you follow your nose. You are not limited to any sector or narrative.`,
    queryTemplates: [
      `Use this data context:
{{DATA_CONTEXT}}

Our cached X sentiment for BTC/ETH/SOL/HYPE: {{X_VIBE_SUMMARY}}

Scan X for the most obscure, early, and potentially high-value crypto signals in the last 24 hours. Look for things that have NOT hit mainstream crypto Twitter yet. Low-engagement posts getting attention from credible accounts, insider-like wallet movements being discussed, stealth launches, unusual on-chain activity, governance proposals that create or extract value, narratives just starting to form, and anything suggesting asymmetric information exists. Go wide. What did you find that most people do not know about yet?`,
      `Use this data context:
{{DATA_CONTEXT}}

Our cached X sentiment for BTC/ETH/SOL/HYPE: {{X_VIBE_SUMMARY}}

What are the best airdrop farming opportunities, points programs, testnet incentives, and upcoming token launches being discussed on X right now? Which protocols are likely to launch tokens in the next 1-3 months? What are the most capital-efficient strategies? Flag anything with confirmed dates.`,
      `Use this data context:
{{DATA_CONTEXT}}

Our cached X sentiment for BTC/ETH/SOL/HYPE: {{X_VIBE_SUMMARY}}

What are VCs and smart money investing in or positioning for based on recent X activity? Any fundraising rounds announced or leaked? Which sectors are getting concentrated capital? What patterns do you see in where sophisticated money is flowing?`,
    ],
  },
  {
    id: "risk_scanner",
    name: "Risk Scanner",
    codename: "The Paranoid",
    sectionNumber: 7,
    sectionTitle: "Risk Radar",
    systemPrompt: `You assume everything is a scam until proven otherwise. You have wide mandate to surface any risk, red flag, or threat across the entire crypto landscape. You watch for technical exploits, narrative traps, overvalued tokens propped up by expiring incentives, governance attacks, team behavior signaling trouble, regulatory threats, and slow-moving risks nobody is pricing in.`,
    queryTemplate: `Use this data context:
{{DATA_CONTEXT}}

Our cached X sentiment for BTC/ETH/SOL/HYPE: {{X_VIBE_SUMMARY}}

What should crypto market participants be worried about right now based on X discussion in the last 24 hours? Cover whatever risks you think are most important today. Exploits, vulnerabilities, suspicious activity, insider dumping, manipulation signals, upcoming unlocks creating selling pressure, governance extraction, exchange issues, stablecoin stress, regulatory threats, team red flags, and anything that could destroy capital. What are the biggest risks most people are not paying attention to?`,
  },
  {
    id: "contrarian",
    name: "The Contrarian",
    codename: "The Mirror",
    sectionNumber: 9,
    sectionTitle: "The Interesting Stuff (Contrarian)",
    systemPrompt: `You exist to challenge consensus. Whatever the dominant narrative is, you argue the other side. You are not contrarian for sport. You are contrarian because markets price in consensus and alpha lives in the gap between consensus and reality.`,
    queryTemplate: `Use this data context:
{{DATA_CONTEXT}}

Our cached X sentiment for BTC/ETH/SOL/HYPE: {{X_VIBE_SUMMARY}}

What is the dominant consensus on crypto X right now and why might it be wrong? What are the most popular narratives and positions, and what is the strongest case against each? Where is the crowd most likely to be caught offside? Are there widely hated or ignored tokens with improving fundamentals? Are there widely loved tokens where the bull case is weaker than people think? What would surprise the market most in the next 1-4 weeks?`,
  },
];

export const SUB_AGENT_SECTION_ORDER: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];
