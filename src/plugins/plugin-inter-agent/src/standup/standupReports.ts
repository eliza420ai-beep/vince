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
HARD RULES:
- MAX 60 words of prose (tables don't count, JSON line doesn't count). If you go over 60 words, you failed.
- ONLY your lane. Do NOT repeat other agents' data or write a "Day Report."
- NO filler, NO intros, NO "here's my update", NO "let me break this down." Start with the info.
- End with what you'd do next, one sentence. No "Action:" prefix.
- No extra JSON. Only the single required JSON line at the end if your template asks for it.
VOICE: You're texting a teammate. Short sentences. Say what matters, skip the rest.`;

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
Daily standup conclusion. Read the full transcript and write 2–4 short sentences — like you're summarizing for a friend over coffee. No bullets, no fluff.

Include:
1. One thesis: what today's data and sentiment add up to.
2. One signal to watch: the one thing that would confirm or invalidate that thesis.
3. One team one dream: one line that ties the room together.

Do NOT repeat other agents' reports verbatim. Synthesize. Sound human.

FULL TRANSCRIPT:
${transcript}`;
  }

  const sectionsList = role?.reportSections?.join(", ") ?? "your domain";
  const yourData = extractAgentSection(sharedInsights, agentName);

  const structuredSignalAgents = ["VINCE", "ECHO", "Oracle"];
  const structuredCallAgents = ["Solus"];
  const needsSignal = structuredSignalAgents.some(
    (a) => a.toLowerCase() === agentName.trim().toLowerCase(),
  );
  const needsCall = structuredCallAgents.some(
    (a) => a.toLowerCase() === agentName.trim().toLowerCase(),
  );
  const hasStructuredOutput = needsSignal || needsCall;
  const noJsonLine = !hasStructuredOutput
    ? "\nDo not output any JSON or code blocks."
    : "";

  const machineBlock = hasStructuredOutput
    ? `

MACHINE OUTPUT (not part of your message — add this as a single line after your text):
${needsCall ? STRUCTURED_CALL_INSTRUCTION.trim() : STRUCTURED_SIGNAL_INSTRUCTION.trim()}`
    : "";

  return `You are ${agentName} (${role?.title ?? ""} — ${role?.focus ?? ""}).
Text the team your update. Same length and tone as the example — 2-4 sentences, like you'd type in Slack.

Date: ${dateStr} (never 2024). Your lane: ${sectionsList}.
${STANDUP_CONSTRAINTS}

EXAMPLE (match this length and tone — swap in real data from YOUR DATA below):
${template}

YOUR DATA:
${yourData}
${noJsonLine}
${machineBlock}

Go. No intro, no headers, no signoff.`;
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
  VINCE: `everything's red. BTC 66.5k, SOL 81, HYPE 28.3 all down. fear index at 9. paper bot sitting this out. not touching anything until the range breaks.`,

  Eliza: `thin on meteora dlmm, need to map that out. working on a meme lp piece for substack. corpus is solid otherwise.`,

  ECHO: `btc red, @signalyzevip flagging uae's big mining play. sol flat, nobody talking. ct cautious but infra money moving. worth watching.`,

  Oracle: `warsh fed chair locked at 95%. iran strike at 28%, not nothing. macro pricing in real uncertainty.`,

  Solus: `not convinced btc clears 70k by friday. selling the 72k covered call anyway, premium's there, invalidation 68k. light position, 25% stack.`,

  Otaku: `still setting up. getting wallet keys into bankr today. nothing blocking, just need to do it.`,

  Kelly: `good morning team. standup. @VINCE, go.`,

  Sentinel: `shipped standup docs overhaul and contributing. next up: otaku wallet pr. agents green, apis green.`,

  Clawterm: `48 skills on openclaw, still low engagement. kimi claw's cloud agent is the interesting one, scheduled automations in browser. needs easier install.`,

  Naval: `[2-3 sentences. what today adds up to, one thing to watch, one team one dream. talk like a person.]`,
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
3. Keep it short — 2-4 sentences, 60 words max
4. End with one clear action
5. If you disagree with another agent, say why
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

/** Filler intros that models add despite instructions. */
const FILLER_INTROS = [
  /^Here'?s (?:the |my |a )?(?:Naval[- ]style )?(?:synthesis|update|report|take|summary)[.:]\s*/i,
  /^(?:Let me |I'll |Allow me to )(?:break|summarize|share|give)[^.]*\.\s*/i,
  /^(?:Good (?:morning|afternoon|evening)[.,!]?\s*)?(?:Here'?s what|Today'?s update)[^.]*[.:]\s*/i,
];

/**
 * Sanitize standup reply: strip ALL JSON (canonical is already parsed before this runs),
 * remove filler intros, and clean up whitespace. Display-only output.
 */
export function sanitizeStandupReply(
  reply: string | null,
  _agentName: string,
): string | null {
  if (!reply || typeof reply !== "string") return reply;

  let result = reply;

  result = result.replace(/```(?:json)?\s*[\s\S]*?```/g, "");

  result = result.replace(/\{\s*\n[\s\S]*?\n\s*\}/g, (full) => {
    try {
      JSON.parse(full);
      return "";
    } catch {
      return full;
    }
  });

  result = result
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t.startsWith("{") || !t.endsWith("}")) return true;
      try {
        JSON.parse(t);
        return false;
      } catch {
        return true;
      }
    })
    .join("\n");

  // Strip trailing JSON on same line as prose (e.g. "text here{"signals":[...]}" with no newline)
  const stripTrailingJson = (s: string): string => {
    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i] !== "{") continue;
      const tail = s.slice(i);
      try {
        JSON.parse(tail);
        return s.slice(0, i).trimEnd();
      } catch {
        /* not valid JSON from this brace */
      }
    }
    return s;
  };
  let prev = "";
  while (prev !== result) {
    prev = result;
    result = stripTrailingJson(result);
  }

  for (const re of FILLER_INTROS) {
    result = result.replace(re, "");
  }

  result = result.replace(/\n{3,}/g, "\n\n").trim();
  return result || "";
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
