/**
 * ELIZA_SKILL_CONTENT Action
 *
 * Skill-to-Content Pipeline: runs X research via Echo and formats the result
 * as a content brief ready for Substack or tweet threads.
 *
 * Flow:
 * 1. Extract topic from user message
 * 2. Call ASK_AGENT on Echo to run x-research on the topic
 * 3. Format result as a structured content brief
 * 4. Record via ContentPerformanceService (fire-and-forget)
 *
 * PRD: One Dream Phase 9 — Skills OS, Task #55
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { getContentPerformance } from "../services/contentPerformance.service";

const ACTION_NAME = "ELIZA_SKILL_CONTENT";

/**
 * Extract the topic/asset from a user message.
 * Looks for patterns like "BTC x research to content", "ETH skill brief", etc.
 */
function extractTopic(text: string): string | null {
  const lower = text.toLowerCase();

  // Patterns: "[TOPIC] x research to content", "[TOPIC] to substack", etc.
  const patterns = [
    /^([a-z0-9$][a-z0-9\s$-]*?)\s+(?:x research|x-research|research)\s+(?:to content|to substack|brief|skill brief)/i,
    /^([a-z0-9$][a-z0-9\s$-]*?)\s+(?:skill content brief|content from research|research to substack)/i,
    /(?:x research|research|skill brief)\s+(?:for|on|about)\s+([a-z0-9$][a-z0-9\s$-]+)/i,
    /^([a-z0-9$][a-z0-9\s$-]+?)\s+content brief/i,
    /content brief.*?(?:for|on|about)\s+([a-z0-9$][a-z0-9\s$-]+)/i,
    // Fallback: take the first 1-4 word token as topic if it looks like a ticker or asset
    /^(\$?[A-Z]{2,10}(?:\s+[A-Z]{2,10})?)/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const topic = match[1].trim();
      if (topic.length > 1 && topic.length < 50) return topic;
    }
  }

  // If no pattern matched, extract the most prominent word (likely a ticker)
  const words = text.split(/\s+/).filter((w) => w.length > 1);
  const ticker = words.find((w) => /^\$?[A-Z]{2,10}$/.test(w));
  if (ticker) return ticker;

  // Return the first few significant words
  const meaningful = words
    .filter(
      (w) =>
        !["x", "research", "to", "content", "for", "on", "about", "skill", "brief", "run"].includes(
          w.toLowerCase(),
        ),
    )
    .slice(0, 3)
    .join(" ");
  return meaningful || null;
}

function isSkillContentRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const triggers = [
    "skill content brief",
    "x research to content",
    "research to substack",
    "content from research",
    "skill brief",
    "x-research to content",
    "research brief for",
    "to substack",
  ];
  return triggers.some((t) => lower.includes(t));
}

/**
 * Call ASK_AGENT on Echo via the elizaOS in-process API.
 * Returns the response text or null if unavailable.
 */
async function callEchoForResearch(
  runtime: IAgentRuntime,
  topic: string,
): Promise<string | null> {
  const eliza = (runtime as any).elizaOS ?? null;
  if (!eliza?.handleMessage) return null;

  const echoTarget = eliza.getAgentByName?.("ECHO") ?? eliza.getAgentByName?.("Echo");
  if (!echoTarget?.agentId) {
    logger.debug("[ELIZA_SKILL_CONTENT] Echo agent not found in-process");
    return null;
  }

  const question = `Run x research on "${topic}" and give me the top signal account quote, dominant narrative, and confidence level. Format: Signal Account: @handle "quote" | Narrative: [text] | Confidence: [0-100]`;

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 25000);

    const msg = {
      id: crypto.randomUUID(),
      entityId: runtime.agentId,
      roomId: runtime.agentId,
      content: {
        text: `[From Eliza, skill-to-content pipeline]: ${question}`,
        source: "eliza_skill_content",
      },
      createdAt: Date.now(),
    };

    eliza
      .handleMessage(echoTarget.agentId, msg, {
        onResponse: (resp: any) => {
          if (settled) return;
          const text =
            typeof resp?.text === "string"
              ? resp.text
              : typeof resp?.message === "string"
                ? resp.message
                : "";
          if (text.trim()) {
            settled = true;
            clearTimeout(timeout);
            resolve(text.trim());
          }
        },
        onComplete: () => {},
        onError: () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve(null);
          }
        },
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(null);
        }
      });
  });
}

/**
 * Parse Echo's response to extract structured fields.
 */
interface ResearchData {
  signalAccount: string;
  narrative: string;
  confidence: string;
}

function parseEchoResponse(response: string): ResearchData {
  const accountMatch =
    /Signal Account[:\s]+(@[\w]+(?:\s+"[^"]*")?)/i.exec(response) ??
    /(@[\w]+)\s+"([^"]+)"/i.exec(response);
  const narrativeMatch = /Narrative[:\s]+([^\n|]+)/i.exec(response);
  const confidenceMatch = /Confidence[:\s]+(\d+)/i.exec(response);

  return {
    signalAccount: accountMatch
      ? accountMatch[1].trim()
      : "(no signal account found)",
    narrative: narrativeMatch
      ? narrativeMatch[1].trim()
      : response.slice(0, 200),
    confidence: confidenceMatch ? confidenceMatch[1] : "n/a",
  };
}

/**
 * Generate a content brief from research data using the LLM.
 */
async function generateContentBrief(
  runtime: IAgentRuntime,
  topic: string,
  research: ResearchData | null,
  rawEchoResponse: string | null,
): Promise<string> {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (!research || !rawEchoResponse) {
    // Generate without live research data
    const prompt = `Generate a content brief for the topic "${topic}". Include: Dominant Narrative, Top Signal, Confidence, Substack Angle (one sentence hook), Tweet Thread Hook (punchy opener). Keep it sharp and actionable.`;
    try {
      const generated = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof generated === "string"
          ? generated
          : ((generated as { text?: string })?.text ?? String(generated));
      return [
        `## Content Brief — ${topic}`,
        `**Source:** X Research via Echo (no live data available)`,
        "",
        text.trim(),
        "",
        `**Provenance:** Echo x-research, ${date}`,
      ].join("\n");
    } catch {
      return [
        `## Content Brief — ${topic}`,
        `**Source:** X Research via Echo`,
        `**Dominant Narrative:** (Echo unavailable — run manually: \`bun run x-search.ts search "${topic}"\`)`,
        `**Top Signal:** n/a`,
        `**Confidence:** n/a`,
        `**Substack Angle:** [Research ${topic} narrative manually and draft hook]`,
        `**Tweet Thread Hook:** [Derive from x-research results]`,
        `**Provenance:** Echo x-research (unavailable), ${date}`,
      ].join("\n");
    }
  }

  // Use LLM to generate Substack angle and tweet hook from research data
  const hookPrompt = `Given this X research result for "${topic}":
Signal Account: ${research.signalAccount}
Narrative: ${research.narrative}
Confidence: ${research.confidence}

Generate:
1. Substack Angle: One punchy sentence hook for a Substack essay angle
2. Tweet Thread Hook: One punchy opener for a tweet thread

Reply in exactly this format:
Substack Angle: [one sentence]
Tweet Thread Hook: [one sentence]`;

  let substackAngle = `[Derive from: "${research.narrative.slice(0, 60)}..."]`;
  let tweetHook = "[See narrative above for thread opener]";

  try {
    const generated = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt: hookPrompt,
    });
    const text =
      typeof generated === "string"
        ? generated
        : ((generated as { text?: string })?.text ?? String(generated));
    const substackMatch = /Substack Angle[:\s]+([^\n]+)/i.exec(text);
    const tweetMatch = /Tweet Thread Hook[:\s]+([^\n]+)/i.exec(text);
    if (substackMatch) substackAngle = substackMatch[1].trim();
    if (tweetMatch) tweetHook = tweetMatch[1].trim();
  } catch (err) {
    logger.debug("[ELIZA_SKILL_CONTENT] Hook generation failed:", err);
  }

  return [
    `## Content Brief — ${topic}`,
    `**Source:** X Research via Echo`,
    `**Dominant Narrative:** ${research.narrative}`,
    `**Top Signal:** ${research.signalAccount}`,
    `**Confidence:** ${research.confidence}`,
    `**Substack Angle:** ${substackAngle}`,
    `**Tweet Thread Hook:** ${tweetHook}`,
    `**Provenance:** Echo x-research, ${date}`,
  ].join("\n");
}

export const elizaSkillContentAction: Action = {
  name: ACTION_NAME,
  similes: [
    "SKILL_CONTENT_BRIEF",
    "X_RESEARCH_TO_CONTENT",
    "RESEARCH_TO_SUBSTACK",
    "CONTENT_FROM_RESEARCH",
    "SKILL_BRIEF",
  ],
  description:
    "Skill-to-Content Pipeline: run X research via Echo on a topic or asset, then format the result as a structured content brief for Substack or tweet threads. Use when: user asks for 'skill content brief', 'x research to content', 'research to substack', 'content from research', or 'skill brief'.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").trim();
    return isSkillContentRequest(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | void> => {
    const text = (message.content?.text ?? "").trim();
    const topic = extractTopic(text);

    if (!topic) {
      await callback({
        text: "I need a topic or asset to research. Try: 'BTC x research to content' or 'SOL skill content brief'.",
        actions: [ACTION_NAME],
      });
      return { success: false };
    }

    logger.info(`[ELIZA_SKILL_CONTENT] Running skill-to-content pipeline for topic: ${topic}`);

    // Step 1: Call Echo for x-research
    let rawEchoResponse: string | null = null;
    let parsedResearch: ResearchData | null = null;

    try {
      rawEchoResponse = await callEchoForResearch(runtime, topic);
      if (rawEchoResponse) {
        parsedResearch = parseEchoResponse(rawEchoResponse);
        logger.debug(
          `[ELIZA_SKILL_CONTENT] Echo response received (${rawEchoResponse.length} chars)`,
        );
      } else {
        logger.debug("[ELIZA_SKILL_CONTENT] Echo not available — generating brief without live data");
      }
    } catch (err) {
      logger.warn("[ELIZA_SKILL_CONTENT] Echo call failed:", err);
    }

    // Step 2: Format as content brief
    let brief: string;
    try {
      brief = await generateContentBrief(runtime, topic, parsedResearch, rawEchoResponse);
    } catch (err) {
      logger.error("[ELIZA_SKILL_CONTENT] Content brief generation failed:", err);
      await callback({
        text: `Failed to generate content brief for "${topic}". Try again or run x-research manually.`,
        actions: [ACTION_NAME],
      });
      return { success: false };
    }

    // Step 3: Record via ContentPerformanceService (fire-and-forget)
    try {
      const perf = getContentPerformance();
      perf.recordDraft("substack", topic, ["x-research", "echo"]);
    } catch (err) {
      logger.debug("[ELIZA_SKILL_CONTENT] ContentPerformance record failed:", err);
    }

    await callback({ text: brief, actions: [ACTION_NAME] });
    return { success: true };
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "BTC x research to content" },
      },
      {
        name: "Eliza",
        content: {
          text: "## Content Brief — BTC\n**Source:** X Research via Echo\n**Dominant Narrative:** [narrative]\n**Top Signal:** [@handle — quote]\n**Confidence:** [score]\n**Substack Angle:** [one sentence hook]\n**Tweet Thread Hook:** [one punchy opener]\n**Provenance:** Echo x-research, [date]",
          actions: ["ELIZA_SKILL_CONTENT"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "SOL skill content brief" },
      },
      {
        name: "Eliza",
        content: {
          text: "## Content Brief — SOL\n**Source:** X Research via Echo\n...",
          actions: ["ELIZA_SKILL_CONTENT"],
        },
      },
    ],
  ],
};
