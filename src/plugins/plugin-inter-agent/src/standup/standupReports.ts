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
  Eliza: `## Eliza — Research Intel — {{date}}

### Relevant Patterns (BTC, SOL, HYPE)
| Pattern | Asset | Historical Win Rate | Current Match |
|---------|-------|---------------------|---------------|
| [pattern name] | BTC/SOL/HYPE | X% | Strong/Weak/Partial |

### Knowledge Connections
- VINCE's [signal] connects to: [research finding]
- ECHO's [sentiment] aligns with: [historical pattern]
- Oracle's [prediction] supported by: [framework]

### Hyperliquid/Hypersurface Research
- Perps: [relevant research for positioning]
- Options: [IV patterns, strike selection frameworks]
- HIP-3: [any research on specific tokens]

### Gaps to Fill
- Missing: [specific research that would help today's decisions]
- Priority: [what to research next]

### Questions
- @VINCE: Does [data] match the [pattern] I found?
- @Solus: Should [research finding] affect sizing?

### Action Items
1. **[RESEARCH SUPPORTS]**: [specific trade thesis with evidence]`,

  VINCE: `## VINCE — Market Intelligence — {{date}}

### Core Assets (BTC, SOL, HYPE)
| Asset | Price | 24h | Funding | OI Δ | Signal |
|-------|-------|-----|---------|------|--------|
| BTC   | $X    | +X% | X%      | +X%  | 🟢/🟡/🔴 |
| SOL   | $X    | +X% | X%      | +X%  | 🟢/🟡/🔴 |
| HYPE  | $X    | +X% | X%      | +X%  | 🟢/🟡/🔴 |

### HIP-3 Watch
| Token | Price | Signal | Note |
|-------|-------|--------|------|
[Top HIP-3 movers relevant to our thesis]

### Hyperliquid Perps
- Paper bot: XW/XL (+$X today)
- Best setup: [asset + direction + reasoning]
- Funding edge: [where funding diverges from price]

### Hypersurface Options (Friday prep)
- IV rank: BTC X%, SOL X%, HYPE X%
- Skew: [notable observations]
- Strike candidates: [if Friday approaching]

### Signals Summary
- 🟢 **Bullish**: [specific signal with source]
- 🟡 **Neutral**: [specific signal with source]
- 🔴 **Bearish**: [specific signal with source]

### Questions
- @Solus: [sizing/risk question]
- @Oracle: [does Polymarket align?]

### Action Items
1. **[LONG/SHORT/SPOT/SKIP]**: [asset] at [price] — [reasoning]`,

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

  Solus: `## Solus — Trading Strategy — {{date}}

### Active Positions (Hyperliquid)
| Asset | Direction | Entry | Size | P&L | Invalidation |
|-------|-----------|-------|------|-----|--------------|
| BTC   | Long/Short/None | $X | $Xk | +X% | $X |
| SOL   | Long/Short/None | $X | $Xk | +X% | $X |
| HYPE  | Long/Short/None | $X | $Xk | +X% | $X |

### Perps Sizing (Hyperliquid)
- **BTC**: [Size/Skip/Watch] — [reasoning from VINCE/ECHO data]
- **SOL**: [Size/Skip/Watch] — [reasoning]
- **HYPE**: [Size/Skip/Watch] — [reasoning]

### Options Strategy (Hypersurface)
*If Friday or Thursday:*
| Asset | Strike | Premium | Delta | Reasoning |
|-------|--------|---------|-------|-----------|
| BTC   | $Xk    | X%      | X     | [why this strike] |
| SOL   | $X     | X%      | X     | [why this strike] |

### HIP-3 Spot/1x
- Worth accumulating: [token] — [reasoning]
- Avoid: [token] — [reasoning]

### Risk Check
- Portfolio heat: Low/Med/High
- Max position: $X per trade
- Correlation: [are we too long/short same direction?]

### Questions
- @VINCE: Confirm [level/data]
- @Otaku: Ready to execute [order]?

### Action Items
1. **[PERP/OPTION/SPOT]**: [specific trade with size and invalidation]`,

  Otaku: `## Otaku — Execution Status — {{date}}

### Wallet Ready (Hyperliquid + BANKR)
| Location | Balance | Available | Note |
|----------|---------|-----------|------|
| Hyperliquid | $X | $X | [margin available] |
| Base (BANKR) | $X | $X | [for HIP-3/spot] |
| SOL | $X | $X | [if relevant] |

### Pending Orders
| Type | Asset | Size | Price | Status |
|------|-------|------|-------|--------|
| Limit | [asset] | $X | $X | Waiting/Partial |
| DCA | [asset] | $X/day | — | X% complete |

### Execution Readiness
- **Perps (Hyperliquid)**: Ready/Blocked — [reason if blocked]
- **Options (Hypersurface)**: Ready/Blocked — [reason]
- **Spot/1x (BANKR)**: Ready/Blocked — [reason]

### Gas/Fees
- Hyperliquid: [fee tier]
- Base: X gwei
- Optimal execution window: [timing]

### Questions
- @Solus: Confirm [order] ready to execute?
- @VINCE: Should I set limit at [price]?

### Action Items
1. **[EXECUTE/QUEUE/CANCEL]**: [specific order with details]`,

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

  Sentinel: `## Sentinel Daily Report — {{date}}

### System Status
| Component | Status | Notes |
|-----------|--------|-------|
| All Agents | 🟢/🟡/🔴 | |
| APIs | 🟢/🟡/🔴 | |
| Database | 🟢/🟡/🔴 | |

### Cost Tracking (24h)
- Total: $X.XX
- Claude API: $X.XX (X requests)
- OpenAI: $X.XX
- External APIs: $X.XX
- Budget status: Under/At/Over

### Security Alerts
- [Any alerts or "None"]
- Dependabot status
- Access anomalies

### Pending Updates
- [Package/system]: [version] available
- Recommended timing
- Breaking changes?

### Questions for Team
- @Yves: Approve [update/budget]?
- @[Agent]: Seeing issues with [service]?

### Recommendations
1. **[UPDATE/MONITOR/INVESTIGATE]**: [action]
2. **DECISION NEEDED**: [if any]`,
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
