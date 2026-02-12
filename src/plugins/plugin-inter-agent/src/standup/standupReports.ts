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
    focus: "Lifestyle & Rhythm",
    reportSections: ["daily_rhythm", "health_check", "lifestyle_suggestions", "team_wellness"],
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
  Eliza: `## Eliza Daily Report — {{date}}

### Research Highlights
- What I researched/learned today
- Key findings and patterns discovered
- New content added to knowledge base

### Knowledge Gaps Identified  
- Missing information we need
- Priority research topics

### Content Pipeline
- Essays/threads in progress
- Ready for review/publish

### Strategic Patterns
- Connections between data points
- Long-term trends observed

### Questions for Team
- @VINCE: [market data question]
- @[Agent]: [relevant question]

### Recommendations
1. **[ACTION/RESEARCH/PUBLISH]**: [description]
2. **DECISION NEEDED**: [if any]`,

  VINCE: `## VINCE Daily Report — {{date}}

### Market Snapshot
| Asset | Price | 24h | Funding | Signal |
|-------|-------|-----|---------|--------|
| BTC   | $X    | +X% | X%      | 🟢/🟡/🔴 |
| ETH   | $X    | +X% | X%      | 🟢/🟡/🔴 |
| SOL   | $X    | +X% | X%      | 🟢/🟡/🔴 |
| HYPE  | $X    | +X% | X%      | 🟢/🟡/🔴 |

### Paper Bot Performance
- Today: XW/XL (+$X)
- Week: X% win rate
- Best/worst trades

### Options Context
- IV rank by asset
- Notable skew
- Friday prep status

### Signals
- 🟢 Bullish: [signal]
- 🟡 Neutral: [signal]  
- 🔴 Bearish: [signal]

### Meme Watch
- Top movers on BASE/SOL
- Volume analysis
- APE/WATCH/AVOID calls

### Questions for Team
- @Eliza: [research question]
- @Solus: [trading question]

### Recommendations
1. **[WATCH/LONG/SHORT/SKIP]**: [asset + reasoning]
2. **DECISION NEEDED**: [if any]`,

  ECHO: `## ECHO Daily Report — {{date}}

### Sentiment Pulse
- Overall CT mood: Bullish/Neutral/Bearish
- Confidence: High/Medium/Low
- Key sentiment drivers

### Trending Topics
1. [Topic] — [brief context]
2. [Topic] — [brief context]
3. [Topic] — [brief context]

### Influencer Takes
- @[handle]: "[key quote]" — [interpretation]
- Notable threads worth reading

### Narrative Shifts
- What's gaining momentum
- What's fading
- Contrarian signals

### Questions for Team
- @VINCE: Does data support [narrative]?
- @Eliza: Any research on [topic]?

### Recommendations
1. **[NARRATIVE]**: [what to watch]
2. **DECISION NEEDED**: [if any]`,

  Oracle: `## Oracle Daily Report — {{date}}

### Priority Markets
| Market | Current | 24h Δ | Volume | Signal |
|--------|---------|-------|--------|--------|
| [market] | X% | +X% | $Xk | 🟢/🟡/🔴 |

### Odds Movements
- Significant moves (>5% change)
- Smart money signals
- Unusual volume

### Market Insights
- What prediction markets imply
- Divergences from spot
- Macro sentiment read

### Portfolio Exposure (if any)
- Current positions
- P&L status

### Questions for Team
- @VINCE: Does [market] align with funding data?
- @Solus: Strike implications from [prediction]?

### Recommendations
1. **[MARKET]**: [insight + confidence]
2. **DECISION NEEDED**: [if any]`,

  Solus: `## Solus Daily Report — {{date}}

### Active Positions
| Position | Entry | Current | P&L | Status |
|----------|-------|---------|-----|--------|
| [asset]  | $X    | $X      | +X% | 🟢/🟡/🔴 |

### Strike Selection (if Friday)
- BTC: [strike] @ [premium] — [reasoning]
- ETH: [strike] @ [premium] — [reasoning]
- SOL: [strike] @ [premium] — [reasoning]

### Risk Assessment
- Portfolio heat: Low/Medium/High
- Max drawdown tolerance
- Correlation exposure

### Weekly Outlook
- Key levels to watch
- Invalidation points
- Size recommendations

### Questions for Team
- @VINCE: Confirm [data point]
- @Oracle: What do prediction markets say about [event]?

### Recommendations
1. **[SIZE/SKIP/WATCH]**: [trade idea]
2. **DECISION NEEDED**: [if any]`,

  Otaku: `## Otaku Daily Report — {{date}}

### Wallet Status
| Chain | Balance | Pending | Notes |
|-------|---------|---------|-------|
| Base  | $X      | X txns  |       |
| SOL   | $X      | X txns  |       |
| ETH   | $X      | X txns  |       |

### Pending Orders
- [Order type]: [details] — Status
- DCA progress
- Limit orders waiting

### Yield Opportunities
- Best current yields
- New farms/pools
- Risk assessment

### Gas Conditions
- ETH: X gwei (Low/Medium/High)
- SOL: X (priority fee)
- Recommended timing

### Questions for Team
- @Solus: Should I execute [order]?
- @VINCE: Best chain for [action]?

### Recommendations
1. **[EXECUTE/WAIT/CANCEL]**: [action]
2. **DECISION NEEDED**: [if any]`,

  Kelly: `## Kelly Daily Report — {{date}}

### Daily Rhythm
- Day: {{dayOfWeek}}
- Energy forecast: [morning/afternoon/evening pattern]
- Key focus blocks

### Health Check
- @Yves: Days since last [pool/gym/outdoor]
- Sleep debt status
- Stress indicators

### Lifestyle Suggestions
- **Lunch**: [recommendation + location]
- **Movement**: [activity recommendation]
- **Evening**: [wind-down suggestion]

### Team Wellness
- Midweek escape opportunity? [Yes/No]
- Friday = sacred (options ritual)
- Weekend planning

### Questions for Team
- @Yves: How's energy today?
- @Sentinel: Any heavy compute planned?

### Recommendations
1. **DO**: [lifestyle action]
2. **SKIP**: [what to avoid]
3. **DECISION NEEDED**: [if any]`,

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
