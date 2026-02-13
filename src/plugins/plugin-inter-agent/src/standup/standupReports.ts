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
    reportSections: ["priority_markets", "odds_movements", "market_insights", "portfolio_exposure"],
  },
  Solus: {
    title: "CFO",
    focus: "Trading Strategy",
    reportSections: ["active_positions", "strike_selection", "risk_assessment", "weekly_outlook"],
  },
  Otaku: {
    title: "COO",
    focus: "DeFi Operations",
    reportSections: ["wallet_status", "pending_orders", "yield_opportunities", "gas_conditions"],
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
  Eliza: `## Eliza — Research — {{date}}

| Asset | Pattern | Confidence |
|-------|---------|------------|
| BTC | [pattern] | H/M/L |
| SOL | [pattern] | H/M/L |

**Key insight:** [One sentence connecting data to action]
**Action:** [One specific recommendation]`,

  VINCE: `## VINCE — Data — {{date}}

| Asset | Price | Funding | Signal |
|-------|-------|---------|--------|
| BTC | $X | X% | 🟢/🟡/🔴 |
| SOL | $X | X% | 🟢/🟡/🔴 |
| HYPE | $X | X% | 🟢/🟡/🔴 |

**Paper bot:** XW/XL | **Best setup:** [asset + direction]
**Action:** [One specific trade]`,

  ECHO: `## ECHO — CT Sentiment — {{date}}

### Vibes
| Asset | Mood | Driver |
|-------|------|--------|
| BTC | Bull/Bear/Flat | [one phrase] |
| SOL | Bull/Bear/Flat | [one phrase] |
| HYPE | Bull/Bear/Flat | [one phrase] |

### Hot Take
- @[handle]: "[key quote]" — [implication]

### vs VINCE Data
[Aligned/Divergent] — [one sentence why]

### Action
1. **[SENTIMENT SIGNAL]**: [one specific trade implication]`,

  Oracle: `## Oracle — Polymarket — {{date}}

### Key Markets (BTC/SOL focus)
| Market | Odds | Δ24h | Signal |
|--------|------|------|--------|
| [most relevant] | X% | ±X% | Bull/Bear |

### Smart Money
- [One notable position or divergence]

### Bottom Line
**Signal**: Bull/Bear/Neutral — Confidence: H/M/L
**Why**: [One sentence]

### Action
1. **[PREDICTION SIGNAL]**: [one specific implication]`,

  Solus: `## Solus — Risk — {{date}}

| Asset | Call | Size | Entry | Invalidation |
|-------|------|------|-------|--------------|
| BTC | Long/Short/Skip | $Xk | $X | $X |
| SOL | Long/Short/Skip | $Xk | $X | $X |

**Portfolio heat:** Low/Med/High
**Action:** [One specific sizing decision]`,

  Otaku: `## Otaku — Execution — {{date}}

| Venue | Ready | Balance |
|-------|-------|---------|
| Hyperliquid | ✅/❌ | $X |
| Base/BANKR | ✅/❌ | $X |

**Pending:** [Orders waiting or "None"]
**Action:** [Ready to execute X or blocker]`,

  Kelly: `## 🎯 Trading Standup — {{date}} ({{dayOfWeek}})

*Facilitated by Kelly | One Team, One Dream*

---

### Focus: BTC, SOL, HYPE + Hyperliquid Alpha

**Core Assets:** BTC, SOL, HYPE, HIP-3 tokens
**Products:** Perps (Hyperliquid), Options (Hypersurface), Spot/1x leverage
**Intel:** X sentiment, Polymarket odds

---

### Agent Reports (in order)

1. **@VINCE** — BTC/SOL/HYPE market data, funding, paper bot
2. **@Eliza** — Research patterns, knowledge connections
3. **@ECHO** — X/CT sentiment on our assets
4. **@Oracle** — Polymarket odds, prediction signals
5. **@Solus** — Strike selection, position sizing, risk
6. **@Otaku** — Wallet status, pending orders, execution readiness
7. **@Sentinel** — System health, costs

*(Yves may or may not be present — proceed autonomously)*

---

### 🎬 Action Plan

| WHAT | HOW | WHY | OWNER | URGENCY |
|------|-----|-----|-------|---------|
| [Action] | [Method] | [Reason] | @Agent | Now/Today/This Week |

---

### ⚡ Decisions (if Yves present, flag for input)

| Decision | Team Recommendation | Confidence | 
|----------|---------------------|------------|
| [Decision] | [Rec] | High/Med/Low |

*If Yves not present: Proceed with HIGH confidence items. Flag MEDIUM/LOW for async review.*

---

### 🎯 North Star
**The Dream:** Consistent alpha on BTC, SOL, HYPE via perps + options
**Today's Edge:** [What makes today actionable]

---

@VINCE, market data — go.`,

  Sentinel: `## Sentinel — Ops — {{date}}

| System | Status | Cost 24h |
|--------|--------|----------|
| Agents | 🟢/🟡/🔴 | $X |
| APIs | 🟢/🟡/🔴 | $X |

**Alerts:** [Any or "None"]
**Action:** [One specific ops recommendation]`,
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
