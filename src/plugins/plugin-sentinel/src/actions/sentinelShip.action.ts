/**
 * SENTINEL_SHIP — What to ship next for maximum impact
 *
 * Uses Project Radar + Impact Scorer to suggest the most
 * impactful work to push the project forward.
 *
 * TRIGGERS:
 * - "what should we ship"
 * - "ship priorities"
 * - "what's most impactful"
 * - "project radar"
 * - "impact score <idea>"
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

import { scanProject, getProjectSummary, type ProjectState } from "../services/projectRadar.service";
import {
  autoScore,
  rankWorkItems,
  recordSuggestion,
  getLearnings,
  formatScore,
  type WorkItem,
} from "../services/impactScorer.service";

const SHIP_TRIGGERS = [
  "what should we ship",
  "what to ship",
  "ship priorities",
  "ship next",
  "most impactful",
  "highest impact",
  "project radar",
  "radar",
  "impact score",
  "score this",
  "prioritize",
];

function wantsShip(text: string): boolean {
  const lower = text.toLowerCase();
  return SHIP_TRIGGERS.some((t) => lower.includes(t));
}

function isRadarOnly(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("radar") && !lower.includes("ship") && !lower.includes("impact");
}

function isScoreRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("impact score") || lower.includes("score this");
}

/**
 * Generate ship priorities from project state
 */
async function generateShipPriorities(
  runtime: IAgentRuntime,
  state: ProjectState,
  userContext: string
): Promise<string> {
  // Build context from project state
  let context = `**Project State:**\n`;
  context += `• ${state.plugins.length} plugins, ${state.totalActions} actions, ${state.totalServices} services\n`;
  context += `• ${state.completed.length} completed, ${state.inProgress.length} in progress, ${state.blocked.length} blocked\n\n`;
  
  // North star status
  const staleOrMissing = state.northStarDeliverables.filter(d => d.status !== "active");
  if (staleOrMissing.length > 0) {
    context += `**North Star Gaps:**\n`;
    for (const d of staleOrMissing) {
      context += `• ${d.deliverable} (${d.owner}): ${d.status}\n`;
    }
    context += `\n`;
  }
  
  // Blocked items
  if (state.blocked.length > 0) {
    context += `**Blocked:**\n`;
    for (const b of state.blocked.slice(0, 5)) {
      context += `• ${b.title} (${b.plugin})\n`;
    }
    context += `\n`;
  }
  
  // In progress
  if (state.inProgress.length > 0) {
    context += `**In Progress:**\n`;
    for (const ip of state.inProgress.slice(0, 5)) {
      context += `• ${ip.version} ${ip.title} (${ip.plugin})\n`;
    }
    context += `\n`;
  }
  
  // Knowledge gaps
  if (state.knowledgeGaps.length > 0) {
    context += `**Knowledge Gaps:**\n`;
    for (const gap of state.knowledgeGaps) {
      context += `• ${gap}\n`;
    }
    context += `\n`;
  }
  
  // Recent activity
  if (state.recentChanges.length > 0) {
    const todayChanges = state.recentChanges.filter(c => c.daysAgo === 0);
    context += `**Recent Activity:** ${todayChanges.length} files changed today, ${state.recentChanges.length} this week\n\n`;
  }
  
  // Get learnings from past suggestions
  const learnings = getLearnings();
  if (learnings.length > 0) {
    context += `**Learnings from past suggestions:**\n`;
    for (const l of learnings) {
      context += `${l}\n`;
    }
    context += `\n`;
  }
  
  // Compose RAG state for additional context
  const ragState = await runtime.composeState({ content: { text: userContext } } as Memory);
  const ragContext = typeof ragState.text === "string" ? ragState.text.slice(0, 3000) : "";
  
  const prompt = `You are Sentinel, the core dev agent. Your job: suggest the MOST IMPACTFUL things to ship to push the project forward.

**PRIORITIES (in order):**
1. 24/7 market research — Vince push, X research, signals (TOP PRIORITY)
2. Unblock blocked items
3. Complete in-progress work
4. Fill north star gaps
5. Revenue-generating features
6. User-facing improvements
7. Tech debt (only if blocking something)

**PROJECT STATE:**
${context}

**KNOWLEDGE CONTEXT:**
${ragContext.slice(0, 2000)}

**RULES:**
- Max 5 suggestions, numbered
- Each suggestion: one line, specific action, owner/plugin if relevant
- Prioritize by impact on revenue and north star
- If something is blocked, suggest how to unblock
- No fluff, no preamble — just the prioritized list
- End with "🎯 Top pick: [your #1 recommendation and why in 1 sentence]"

**User question:** ${userContext}

Output the prioritized ship list:`;

  const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  const text = typeof response === "string" ? response : (response as any)?.text ?? String(response);
  
  return text.trim();
}

export const sentinelShipAction: Action = {
  name: "SENTINEL_SHIP",
  similes: ["SHIP_PRIORITIES", "WHAT_TO_SHIP", "PROJECT_RADAR", "IMPACT_SCORE"],
  description: `Suggests the most impactful things to ship based on project state analysis.

TRIGGERS:
- "what should we ship" — Full ship priorities
- "project radar" — Project state overview
- "impact score <idea>" — Score a specific idea
- "ship priorities" — Same as what to ship

Uses Project Radar (scans plugins, progress, knowledge) and Impact Scorer (RICE + strategic scoring) for intelligent suggestions.`,

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsShip(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    const userText = (message.content?.text ?? "").trim();
    
    logger.info("[SENTINEL_SHIP] Analyzing project for ship priorities");

    try {
      // Handle radar-only request
      if (isRadarOnly(userText)) {
        const summary = getProjectSummary();
        await callback({ text: summary });
        return true;
      }
      
      // Handle impact score request
      if (isScoreRequest(userText)) {
        const ideaMatch = userText.match(/(?:impact score|score this)[:\s]+(.+)/i);
        const idea = ideaMatch?.[1]?.trim() || userText.replace(/impact score|score this/gi, "").trim();
        
        if (!idea || idea.length < 10) {
          await callback({
            text: "Please provide an idea to score:\n`impact score <your idea here>`",
          });
          return true;
        }
        
        const workItem: WorkItem = {
          id: `user-${Date.now()}`,
          title: idea.slice(0, 100),
          description: idea,
          category: "feature",
          suggestedBy: "user",
          createdAt: new Date().toISOString(),
        };
        
        const score = autoScore(workItem);
        const formatted = formatScore(score);
        
        await callback({
          text: `📊 **Impact Score: "${idea.slice(0, 50)}${idea.length > 50 ? "..." : ""}"**\n\n${formatted}`,
        });
        return true;
      }
      
      // Full ship priorities
      const projectState = scanProject();
      
      // Generate summary header
      let response = `🚀 **Ship Priorities**\n\n`;
      
      // Quick state summary
      const activeNS = projectState.northStarDeliverables.filter(d => d.status === "active").length;
      const totalNS = projectState.northStarDeliverables.length;
      response += `*State: ${projectState.plugins.length} plugins, ${projectState.totalActions} actions | North Star: ${activeNS}/${totalNS} active | ${projectState.blocked.length} blocked*\n\n`;
      
      // Generate AI-powered priorities
      const priorities = await generateShipPriorities(runtime, projectState, userText);
      response += priorities;
      
      // Record suggestions for learning
      const suggestionLines = priorities.match(/^\d+\..+$/gm) || [];
      for (const line of suggestionLines.slice(0, 5)) {
        recordSuggestion(line, "ship-priority");
      }
      
      await callback({ text: response });
      return true;
    } catch (error) {
      logger.error("[SENTINEL_SHIP] Failed:", error);
      await callback({
        text: "Couldn't analyze ship priorities. Try `project radar` for a state overview, or ask about a specific area.",
      });
      return false;
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What should we ship?" } },
      {
        name: "Sentinel",
        content: {
          text: `🚀 **Ship Priorities**

*State: 22 plugins, 89 actions | North Star: 5/7 active | 2 blocked*

1. **Unblock X research rate limiting** (plugin-vince) — 24/7 market research is top priority, this is blocking it
2. **Ship daily report V2** (plugin-vince) — In progress, close to done, high user value
3. **Activate suggested trades deliverable** (VINCE) — North star gap, missing output
4. **Add plugin-eliza tests** — Health score 65%, needs test coverage
5. **Update stale sentinel-docs** — 12 files >30 days old

🎯 Top pick: Unblock X research — 24/7 market research is THE priority and this is the bottleneck.`,
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "impact score: add a leaderboard for paper trading results" } },
      {
        name: "Sentinel",
        content: {
          text: `📊 **Impact Score: "add a leaderboard for paper trading results"**

🟢 **Score: 35.2** (RICE: 44, Strategic: 8)
• Reach: 7/10, Impact: 8/10, Confidence: 7/10, Effort: 5/10
• Revenue: 6/10, North Star: 7/10, Tech Debt: 2/10

Good idea — high user value, moderate effort. Consider after 24/7 market research priorities are solid.`,
        },
      },
    ],
  ],
};

export default sentinelShipAction;
