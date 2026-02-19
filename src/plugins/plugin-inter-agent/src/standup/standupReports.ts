/**
 * Standup Reports — Each agent's domain-specific daily report
 *
 * Reports are generated before/during standup and shared with the team.
 * The report structure is tailored to each agent's role.
 */

import { type IAgentRuntime, type Memory, logger } from "@elizaos/core";
import { getStandupHumanName } from "./standup.constants";

/**
 * Agent roles and their report focus areas
 */
export const AGENT_ROLES = {
  Eliza: {
    title: "CEO",
    focus: "Knowledge & Research",
    reportSections: [
      "research_highlights",
      "knowledge_gaps",
      "content_pipeline",
      "strategic_patterns",
    ],
  },
  VINCE: {
    title: "CDO",
    focus: "Market Intelligence",
    reportSections: [
      "market_snapshot",
      "paper_bot",
      "options_context",
      "signals",
    ],
  },
  ECHO: {
    title: "CSO",
    focus: "CT Sentiment",
    reportSections: [
      "sentiment_pulse",
      "trending_topics",
      "influencer_takes",
      "narrative_shifts",
    ],
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
    reportSections: [
      "standup_facilitation",
      "daily_rhythm",
      "health_check",
      "team_energy",
      "action_synthesis",
    ],
    isStandupFacilitator: true,
  },
  Sentinel: {
    title: "CTO",
    focus: "Ops & Infrastructure",
    reportSections: [
      "next",
      "pushed",
      "in_progress",
      "blocked",
      "openclaw_task",
    ],
  },
  Clawterm: {
    title: "AI Terminal",
    focus: "OpenClaw Skills, Setup & Trending",
    reportSections: [
      "openclaw_skills_trending",
      "setup_tips",
      "gateway_status",
    ],
  },
  Naval: {
    title: "Philosophy & Synthesis",
    focus: "Standup conclusion",
    reportSections: ["thesis", "signal_to_watch", "one_team_one_dream"],
  },
} as const;

export type AgentName = keyof typeof AGENT_ROLES;

/** Hard constraints so agents stay in their lane and do not parrot other agents. */
export const STANDUP_CONSTRAINTS = `
RULES:
- ONLY report on your assigned sections. Do NOT repeat other agents' data.
- Do NOT write a "Day Report" — that is generated at the end.
- No filler ("Would you like...", "Ship it", "Let me...", "I'll synthesize...").
- Under 120 words total (excluding the JSON block). One ACTION line at the end.
- Reference others by name if needed (e.g. "Per VINCE's data") but do NOT restate.
- Do not output any JSON except the single required line at the end (signals or call). No system_status, steps, task, cost_tracking, security_alerts, or other structured blocks.`;

/**
 * Extract one agent's section from the shared daily insights markdown.
 * Sections are headed by ## AgentName (e.g. ## VINCE, ## Eliza). Returns content from that heading until the next ## or end.
 */
export function extractAgentSection(
  sharedInsights: string,
  agentName: string,
): string {
  if (!sharedInsights?.trim()) return "(No shared insights loaded.)";
  const normalized = agentName.trim();
  const heading = `## ${normalized}`;
  let idx = sharedInsights.indexOf(heading);
  if (idx === -1) {
    const re = new RegExp(
      `\\n##\\s+${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`,
      "i",
    );
    const match = sharedInsights.match(re);
    idx = match?.index !== undefined ? match.index : -1;
  }
  if (idx === -1) return "(No section for this agent in shared insights.)";
  const afterHeading = sharedInsights.slice(idx);
  const nextH2 = afterHeading.indexOf("\n## ", 1);
  const section = nextH2 > 0 ? afterHeading.slice(0, nextH2) : afterHeading;
  return section.trim() || "(Empty section.)";
}

/**
 * Build the domain-locked standup prompt for one agent.
 * Naval gets the full transcript to synthesize; all others get only their own section from shared insights.
 */
export function buildStandupPrompt(
  agentName: string,
  sharedInsights: string,
  transcript: string,
  dateStr: string,
): string {
  const role = getAgentRole(agentName);
  const template = (getReportTemplate(agentName) || "").replace(
    /\{\{date\}\}/g,
    dateStr,
  );
  const isConclusionTurn = agentName.toLowerCase() === "naval";

  if (isConclusionTurn) {
    return `You are ${agentName} (${role?.title ?? "Synthesis"} - ${role?.focus ?? "Standup conclusion"}).
Daily standup conclusion. Read the full transcript below and write 2–4 short sentences only. No bullets, no fluff.

Include:
1. One thesis: what today's data and sentiment add up to.
2. One signal to watch: the one thing that would confirm or invalidate that thesis.
3. One team one dream: one line that ties the room together.

Do NOT repeat other agents' reports verbatim. Synthesize.

FULL TRANSCRIPT:
${transcript}`;
  }

  const sectionsList = role?.reportSections?.join(", ") ?? "your domain";
  const yourData = extractAgentSection(sharedInsights, agentName);

  const hasStructuredOutput =
    template.includes("signals") || template.includes('"call"');
  const noJsonLine = !hasStructuredOutput
    ? "\nDo not output any JSON or code blocks."
    : "";

  return `You are ${agentName} (${role?.title ?? ""} - ${role?.focus ?? ""}).
Daily standup report. Fill in YOUR template below with real data.
Use the date in your section header as given in the template (e.g. ${dateStr}). Do not use 2024.

Focus ONLY on: ${sectionsList}
${STANDUP_CONSTRAINTS}

TEMPLATE (fill this in):
${template}

YOUR DATA (from shared insights):
${yourData}
${noJsonLine}

Output your report now. Concise.`;
}

/** Instruction to append so agents output a machine-parseable JSON block for cross-agent validation. One line only. */
export const STRUCTURED_SIGNAL_INSTRUCTION = `

End with one line of JSON (no extra keys): \`{"signals":[{"asset":"BTC","direction":"bullish","confidence_pct":70}]}\` — asset: BTC|SOL|HYPE, direction: bullish|bearish|neutral, confidence_pct: 0-100.`;

/** For Solus only: structured call block for prediction tracking. One line. */
export const STRUCTURED_CALL_INSTRUCTION = `

End with one line of JSON: \`{"call":{"asset":"BTC","direction":"above","strike":70000,"confidence_pct":70,"expiry":"2026-02-21T08:00:00Z","invalidation":68000}}\` — direction: above|below, strike, confidence_pct, expiry ISO, invalidation optional.`;

/**
 * Report template for each agent
 */
export const REPORT_TEMPLATES: Record<AgentName, string> = {
  Eliza: `## Eliza — Research — {{date}}
**Gaps:** [1 line] **Essay idea:** [1 line] **Research to add:** [1 line]
**Action:** [One recommendation]`,

  VINCE: `## VINCE — Data — {{date}}
| Asset | Price | 24h | Funding | OI Δ | Signal |
|-------|-------|-----|---------|------|--------|
| BTC | $X | ±X% | X% | ±X% | 🟢/🟡/🔴 |
| SOL | $X | ±X% | X% | ±X% | 🟢/🟡/🔴 |
| HYPE | $X | ±X% | X% | ±X% | 🟢/🟡/🔴 |
**BTC focus:** [1 line] **Paper bot:** XW/XL | PnL: $X **Action:** [1 line]
${STRUCTURED_SIGNAL_INSTRUCTION}`,

  ECHO: `## ECHO — CT Sentiment — {{date}}
| Asset | CT Mood | Key Voice |
|-------|---------|-----------|
| BTC | 📈/📉/😐 | @handle: "[short quote]" |
| SOL | 📈/📉/😐 | @handle: "[short quote]" |
**Narrative:** [1 sentence] **Contrarian?** Yes/No **Action:** [1 line]
${STRUCTURED_SIGNAL_INSTRUCTION}`,

  Oracle: `## Oracle — {{date}}
| Market | YES% | condition_id |
(Use LIVE DATA) **Key insight:** [1 line] **Action:** [1 line]
${STRUCTURED_SIGNAL_INSTRUCTION}`,

  Solus: `## Solus — Hypersurface — {{date}}
**Essential Q:** Will BTC be above $70K by Friday? Answer: Above/Below/Uncertain + one sentence.
| Strike | Type | Expiry | Thesis |
| $Xk | Call/Put | Fri 08:00 UTC | [1 line] |
**View:** Bull/Bear/Neutral. **Invalidation:** [level] **Action:** [Size/Skip + strike]
${STRUCTURED_CALL_INSTRUCTION}`,

  Otaku: `## Otaku — {{date}}
**Status:** [1 line] **Today:** [1 line] **Blocked:** [or "Nothing"]
No JSON. Only the three lines (Status, Today, Blocked).`,

  Kelly: `Good morning team. {{date}} standup. @VINCE — market data, go.`,

  Sentinel: `## Sentinel — Tech — {{date}}
**Next:** [1 line] **Pushed:** [1 line] **In progress:** [1 line] **Blocked:** [or None]
| Agents | APIs |
| 🟢/🟡/🔴 | 🟢/🟡/🔴 |
**OpenClaw task:** [1 line] **Action:** [1 line]
No JSON. Only the template lines and the status table.`,

  Clawterm: `## Clawterm — AI Terminal — {{date}}
[2-3 sentences: what's trending on OpenClaw, one setup or gateway note. No bullet dumps.]
**Action:** [1 line]`,

  Naval: `## Naval — {{date}}
Conclusion only. Exactly 2-4 short sentences. No bullets, no paragraphs.
1. Thesis: what today's data adds up to. 2. Signal to watch. 3. One team one dream (one line).
Speak as Naval: clear, benefit-led.`,
};

/**
 * Get the report template for an agent
 */
export function getReportTemplate(agentName: string): string | null {
  const normalized = agentName.trim();
  const key = Object.keys(AGENT_ROLES).find(
    (k) => k.toLowerCase() === normalized.toLowerCase(),
  ) as AgentName | undefined;

  if (!key) return null;
  return REPORT_TEMPLATES[key];
}

/**
 * Get agent role info
 */
export function getAgentRole(
  agentName: string,
): (typeof AGENT_ROLES)[AgentName] | null {
  const normalized = agentName.trim();
  const key = Object.keys(AGENT_ROLES).find(
    (k) => k.toLowerCase() === normalized.toLowerCase(),
  ) as AgentName | undefined;

  if (!key) return null;
  return AGENT_ROLES[key];
}

/**
 * Check if a message is from a human (not an agent)
 */
export function isHumanMessage(memory: Memory): boolean {
  const senderName = (
    (memory.content?.name || memory.content?.userName || "") as string
  ).toLowerCase();

  // Check if sender is a known agent
  const isKnownAgent = Object.keys(AGENT_ROLES).some((agent) =>
    senderName.includes(agent.toLowerCase()),
  );

  // Check metadata for bot flag
  const metadata = memory.content?.metadata as
    | Record<string, unknown>
    | undefined;
  const isBot = metadata?.isBot === true || metadata?.fromBot === true;

  return !isKnownAgent && !isBot;
}

/**
 * Standup context that includes human participation awareness
 */
export function buildStandupContext(
  agentName: string,
  isHumanPresent: boolean,
  humanName: string = getStandupHumanName(),
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

  const humanContext = isHumanPresent
    ? `
### ⭐ HUMAN IN CHANNEL
**${humanName} (Co-Founder) is present.**
- If ${humanName} asks you something, respond IMMEDIATELY with priority
- If ${humanName} gives feedback, acknowledge and adapt
- ${humanName}'s messages override agent-to-agent loop limits
- When ${humanName} speaks, other agents should pause and listen
`
    : "";

  return baseContext + humanContext;
}

/** Agents that may output exactly one canonical JSON block: signals (VINCE, ECHO, Oracle) or call (Solus). */
const AGENTS_WITH_CANONICAL_JSON = new Set([
  "vince",
  "echo",
  "oracle",
  "solus",
]);

/**
 * Return true if parsed object is the canonical structured block (only signals array or only call object).
 */
function isCanonicalStructuredBlock(parsed: Record<string, unknown>): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const keys = Object.keys(parsed);
  if (keys.length === 0) return false;
  if (keys.length === 1 && keys[0] === "signals")
    return Array.isArray(parsed.signals);
  if (keys.length === 1 && keys[0] === "call")
    return parsed.call != null && typeof parsed.call === "object";
  return false;
}

/**
 * Sanitize standup reply: keep only template prose and at most one canonical JSON block (signals or call).
 * Strips non-canonical fenced ```json``` blocks and multiline raw JSON (e.g. system_status, steps, task).
 */
export function sanitizeStandupReply(
  reply: string | null,
  agentName: string,
): string | null {
  if (!reply || typeof reply !== "string") return reply;
  const name = agentName.trim().toLowerCase();
  const allowCanonical = AGENTS_WITH_CANONICAL_JSON.has(name);

  const fencedRe = /```(?:json)?\s*([\s\S]*?)```/g;
  let keptCanonical = false;
  let result = reply;

  result = result.replace(fencedRe, (fullMatch, inner) => {
    try {
      const parsed = JSON.parse(inner.trim()) as Record<string, unknown>;
      if (
        isCanonicalStructuredBlock(parsed) &&
        allowCanonical &&
        !keptCanonical
      ) {
        keptCanonical = true;
        return fullMatch;
      }
    } catch {
      /* not valid JSON */
    }
    return "";
  });

  result = result.replace(/\n{3,}/g, "\n\n").trim();

  const multilineJsonRe =
    /\{\s*\n\s*"(?:steps|task|system_status|cost_tracking|security_alerts|pending_updates|optimization_potential|monthly_infra_spend|projected_quarterly|open_vulnerabilities|last_scan|typescript_version|runtime_patches)"[\s\S]*?\n\s*\}/g;
  result = result
    .replace(multilineJsonRe, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return result || null;
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
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date().getDay()];
}
