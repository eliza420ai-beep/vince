/**
 * Parse standup transcript: extract action items, lessons per agent, and disagreements.
 */

import { type IAgentRuntime, logger, ModelType } from "@elizaos/core";

export type StandupActionItemType =
  | "build"
  | "remind"
  | "essay"
  | "tweets"
  | "x_article"
  | "trades"
  | "good_life"
  | "prd"
  | "integration_instructions";

export interface StandupActionItem {
  assigneeAgentName: string;
  description: string;
  type?: StandupActionItemType;
}

export interface ParsedStandup {
  actionItems: StandupActionItem[];
  lessonsByAgentName: Record<string, string>;
  disagreements: { agentA: string; agentB: string }[];
  suggestions?: string[];
}

const PARSE_PROMPT = `You are parsing a standup transcript between AI agents. Extract the following in valid JSON only, no markdown or explanation.

Output format (strict JSON):
{
  "actionItems": [ { "assigneeAgentName": "AgentName", "description": "what to do", "type": "build" or "remind" or "essay" or "tweets" or "x_article" or "trades" or "good_life" or "prd" or "integration_instructions" } ],
  "lessonsByAgentName": { "AgentName": "one short lesson learned sentence" },
  "disagreements": [ { "agentA": "Name1", "agentB": "Name2" } ],
  "suggestions": [ "optional: one short sentence per agent-proposed improvement" ]
}

Rules:
- assigneeAgentName must be one of the agent names that spoke in the transcript.
- For each action item, set "type" as follows. Use "build" only if the description clearly asks to build, write, implement, or ship a feature, script, or code. Use "essay" if it asks for a long-form essay for Substack or Ikigai Studio. Use "tweets" if it asks for banger tweets or viral tweet suggestions. Use "x_article" if it asks for a long-form story or article to publish on X. Use "trades" if it asks for suggested trades, perps (Hyperliquid), or options (HypeSurface) for BTC, SOL, ETH, or HYPE. Use "good_life" if it asks for founder lifestyle suggestions, things to do to live well, travel, dining, wine, health, fitness, or Kelly-style good-life advice. Use "prd" if it asks for a PRD, product requirements document, spec for Cursor, or implementation brief for Claude/Cursor. Use "integration_instructions" if it asks for instructions for Milaidy, OpenClaw, or how to integrate/run them with VINCE. Otherwise set "type": "remind".
- lessonsByAgentName: one key per agent that spoke; value is one short sentence.
- disagreements: only include if two agents clearly disagreed or argued.
- suggestions: if agents proposed a new topic for future standups, a new tool, or a change to how they work, list one short sentence per suggestion; otherwise use empty array.
- If nothing to extract, use empty arrays/object.
- Output only the JSON object.`;

/**
 * Call LLM to parse transcript into action items, lessons per agent, and disagreements.
 */
export async function parseStandupTranscript(
  runtime: IAgentRuntime,
  transcript: string,
): Promise<ParsedStandup> {
  const prompt = `${PARSE_PROMPT}\n\nTranscript:\n${transcript.slice(-8000)}`;
  try {
    const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
    const raw = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";
    const jsonStr = raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, "$1").trim();
    const parsed = JSON.parse(jsonStr) as ParsedStandup;
    if (!parsed.actionItems) parsed.actionItems = [];
    const validTypes: StandupActionItemType[] = [
      "build",
      "remind",
      "essay",
      "tweets",
      "x_article",
      "trades",
      "good_life",
      "prd",
      "integration_instructions",
    ];
    parsed.actionItems = parsed.actionItems.map((item) => ({
      assigneeAgentName: item.assigneeAgentName ?? "",
      description: item.description ?? "",
      type: validTypes.includes(item.type as StandupActionItemType)
        ? (item.type as StandupActionItemType)
        : item.type === "build"
          ? "build"
          : "remind",
    }));
    if (!parsed.lessonsByAgentName || typeof parsed.lessonsByAgentName !== "object")
      parsed.lessonsByAgentName = {};
    if (!parsed.disagreements) parsed.disagreements = [];
    if (!Array.isArray(parsed.suggestions)) parsed.suggestions = [];
    return parsed;
  } catch (err) {
    logger.warn({ err }, "[Standup] parseStandupTranscript failed");
    return {
      actionItems: [],
      lessonsByAgentName: {},
      disagreements: [],
      suggestions: [],
    };
  }
}

/** Agent names we look for in cross-agent linking. */
const CROSS_AGENT_NAMES =
  /\b(VINCE|Eliza|ECHO|Oracle|Solus|Otaku|Sentinel|Clawterm|Kelly)\b/g;

/** Phrases that indicate linking across agents. */
const LINKING_PHRASES =
  /aligns?\s+with|contradicts|builds\s+on|lines?\s+up\s+with|which\s+aligns|'s\s+(data|funding|odds|view|take)|links?\s+to|relates?\s+to|connects?\s+to|fact-?check|agrees?\s+with|disagrees?\s+with/gi;

/**
 * Heuristic count of cross-agent links in the transcript (north star KPI).
 * Splits into sentence-like segments and counts those containing both an agent reference and a linking phrase.
 */
export function countCrossAgentLinks(transcript: string): number {
  if (!transcript?.trim()) return 0;
  const segments = transcript.split(/\n\n+|[.!?]\s+/);
  let count = 0;
  for (const seg of segments) {
    const s = seg.trim();
    if (s.length < 20) continue;
    const hasAgent = CROSS_AGENT_NAMES.test(s);
    CROSS_AGENT_NAMES.lastIndex = 0;
    const hasLinking = LINKING_PHRASES.test(s);
    LINKING_PHRASES.lastIndex = 0;
    if (hasAgent && hasLinking) count += 1;
  }
  return count;
}
