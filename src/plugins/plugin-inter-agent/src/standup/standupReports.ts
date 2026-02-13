/**
 * Standup Reports — Each agent's domain-specific daily report
 *
 * Reports are generated before/during standup and shared with the team.
 * The report structure is tailored to each agent's role.
 */

import { type IAgentRuntime, type Memory, logger } from "@elizaos/core";

/**
 * Agent roles and their report focus areas
 */
export const AGENT_ROLES = {
  Eliza: {
    title: "CEO",
    focus: "Knowledge & Research",
    reportSections: ["research_highlights", "knowledge_gaps", "content_pipeline", "strategic_patterns"],
  },
  VINCE: {
    title: "CDO",
    focus: "Market Intelligence",
    reportSections: ["market_snapshot", "paper_bot", "options_context", "signals", "meme_watch"],
  },
  ECHO: {
    title: "CSO",
    focus: "CT Sentiment",
    reportSections: ["sentiment_pulse", "trending_topics", "influencer_takes", "narrative_shifts"],
  },
  Oracle: {
    title: "CPO",
    focus: "Prediction Markets",
    reportSections: ["priority_markets", "odds_snapshot", "action"],
  },
  Solus: {
    title: "CFO",
    focus: "Hypersurface Options (BTC-first)",
    reportSections: ["weekly_strikes", "btc_thesis", "risk_assessment"],
  },
  Otaku: {
    title: "COO",
    focus: "DeFi Operations",
    reportSections: ["status_update"],
    isUnderConstruction: true, // No wallet configured yet
  },
  Kelly: {
    title: "CVO",
    focus: "Chief Vibes Officer & Standup Facilitator",
    reportSections: ["standup_facilitation", "daily_rhythm", "health_check", "team_energy", "action_synthesis"],
    isStandupFacilitator: true,
  },
  Sentinel: {
    title: "CTO",
    focus: "Ops & Infrastructure",
    reportSections: ["system_status", "cost_tracking", "security_alerts", "pending_updates"],
  },
} as const;

export type AgentName = keyof typeof AGENT_ROLES;

/**
 * Report template for each agent
 */
export const REPORT_TEMPLATES: Record<AgentName, string> = {
  Eliza: `## Eliza — Research (Listening) — {{date}}

**Knowledge gaps spotted:** [What we don't know yet that would help]
**Essay idea (Ikigai Studio Substack):** [One topic worth a long-form piece]
**Research to upload to knowledge/:** [What to ingest or add to knowledge base]

**Action:** [One specific recommendation inspired by what you heard]`,

  VINCE: `## VINCE — Data — {{date}}

| Asset | Price | 24h | Funding | OI Δ | Signal |
|-------|-------|-----|---------|------|--------|
| BTC | $X | ±X% | X% | ±X% | 🟢/🟡/🔴 |
| SOL | $X | ±X% | X% | ±X% | 🟢/🟡/🔴 |
| HYPE | $X | ±X% | X% | ±X% | 🟢/🟡/🔴 |

**BTC focus:** [Key level or setup for Hypersurface strike selection]
**Paper bot:** XW/XL | PnL: $X
**Action:** [One specific trade signal]`,

  ECHO: `## ECHO — CT Sentiment (X insights) — {{date}}

Show insights from X (plugin-x-research): sentiment, key voices, narrative.

| Asset | CT Mood | Key Voice |
|-------|---------|-----------|
| BTC | 📈/📉/😐 (+/-X) | @handle: "[quote]" |
| SOL | 📈/📉/😐 (+/-X) | @handle: "[quote]" |

**Narrative:** [What's driving CT today in one sentence]
**Contrarian?** [Yes/No — if extreme, flag it]

**Action:** [One sentiment-based trade implication]`,

  Oracle: `## Oracle — {{date}}

Use the LIVE DATA below (Priority markets table). Report one line per market or a short summary; cite condition_id for follow-ups.

| Priority market | YES% | condition_id |
(Use LIVE DATA table from fetcher)

**Action:** [One prediction-market implication for paper bot or Hypersurface strike — 10 words or less]`,

  Solus: `## Solus — Hypersurface — {{date}}

Answer the essential question (e.g. "Will BTC be above $70K by next Friday?") in Grok-style: current data, sentiment, Polymarket/options, clear Yes/No, short-term path.

**BTC Options (Core Income)**
| Strike | Type | Expiry | Thesis |
|--------|------|--------|--------|
| $Xk | Call/Put | Fri 08:00 UTC | [one sentence] |

**Weekly View:** Bull/Bear/Neutral — [why in 10 words]
**Invalidation:** [specific level or event]

**My take:** [Yes/No] — [one sentence path]. Then **Action:** [Size/Skip + strike recommendation]`,

  Otaku: `## Otaku — {{date}}

You are the agent with wallet (Bankr, Coinbase) and DeFi skills; currently under construction — no execution yet.

🔧 **Wallet integration in progress.**
Observing team reports — no execution capability yet.

*Watching for: DeFi opportunities to act on once wallet is live.*`,

  Kelly: `Good morning team. {{date}} standup.

**Focus:** BTC options (Hypersurface) + perps (Hyperliquid)

@VINCE — market data, go.`,

  Sentinel: `## Sentinel — Tech — {{date}}

**What's next in coding:** [What still needs to be done]
**What's been pushed to the repo:** [Recent commits/PRs or "Nothing new"]

**In Progress:** [Current dev work]
**Blocked:** [Blockers or "None"]

| System | Status |
|--------|--------|
| Agents | 🟢/🟡/🔴 |
| APIs | 🟢/🟡/🔴 |

**Action:** [One tech recommendation]`,
};

/**
 * Get the report template for an agent
 */
export function getReportTemplate(agentName: string): string | null {
  const normalized = agentName.trim();
  const key = Object.keys(AGENT_ROLES).find(
    (k) => k.toLowerCase() === normalized.toLowerCase()
  ) as AgentName | undefined;
  
  if (!key) return null;
  return REPORT_TEMPLATES[key];
}

/**
 * Get agent role info
 */
export function getAgentRole(agentName: string): typeof AGENT_ROLES[AgentName] | null {
  const normalized = agentName.trim();
  const key = Object.keys(AGENT_ROLES).find(
    (k) => k.toLowerCase() === normalized.toLowerCase()
  ) as AgentName | undefined;
  
  if (!key) return null;
  return AGENT_ROLES[key];
}

/**
 * Check if a message is from a human (not an agent)
 */
export function isHumanMessage(memory: Memory): boolean {
  const senderName = (
    memory.content?.name ||
    memory.content?.userName ||
    ""
  ).toLowerCase();

  // Check if sender is a known agent
  const isKnownAgent = Object.keys(AGENT_ROLES).some(
    (agent) => senderName.includes(agent.toLowerCase())
  );

  // Check metadata for bot flag
  const metadata = memory.content?.metadata as Record<string, unknown> | undefined;
  const isBot = metadata?.isBot === true || metadata?.fromBot === true;

  return !isKnownAgent && !isBot;
}

/**
 * Standup context that includes human participation awareness
 */
export function buildStandupContext(
  agentName: string,
  isHumanPresent: boolean,
  humanName: string = "Yves"
): string {
  const role = getAgentRole(agentName);
  if (!role) return "";

  const baseContext = `
## Standup Context

You are **${agentName}** (${role.title} - ${role.focus}).
This is the daily standup in #daily-standup with the full team.

### Your Role
Focus on: ${role.reportSections.join(", ")}

### Standup Rules
1. Lead with DATA, not pleasantries
2. Name your sources
3. Keep it concise (under 300 words)
4. End with: ACTION items or DECISION items for ${humanName}
5. If you disagree with another agent, explain why with evidence
`;

  const humanContext = isHumanPresent ? `
### ⭐ HUMAN IN CHANNEL
**${humanName} (Co-Founder) is present.**
- If ${humanName} asks you something, respond IMMEDIATELY with priority
- If ${humanName} gives feedback, acknowledge and adapt
- ${humanName}'s messages override agent-to-agent loop limits
- When ${humanName} speaks, other agents should pause and listen
` : "";

  return baseContext + humanContext;
}

/**
 * Format today's date for reports
 */
export function formatReportDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get day of week for Kelly's rhythm reports
 */
export function getDayOfWeek(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}
