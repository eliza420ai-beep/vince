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
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

import { NO_AI_SLOP } from "../utils/alohaStyle";
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
  // Build rich context from project state
  let context = `**Project State:**\n`;
  context += `• ${state.plugins.length} plugins, ${state.totalActions} actions, ${state.totalServices} services\n`;
  context += `• ${state.completed.length} completed, ${state.inProgress.length} in progress, ${state.blocked.length} blocked\n`;
  context += `• ${state.docInsights.length} docs analyzed, ${state.allTodos.length} open TODOs\n\n`;
  
  // Top priorities from docs (most important!)
  if (state.topPriorities.length > 0) {
    context += `**🎯 Top Priorities (extracted from docs):**\n`;
    for (const p of state.topPriorities.slice(0, 7)) {
      context += `• ${p}\n`;
    }
    context += `\n`;
  }
  
  // Critical blockers
  if (state.criticalBlockers.length > 0) {
    context += `**🚫 Blockers (from docs):**\n`;
    for (const b of state.criticalBlockers.slice(0, 5)) {
      context += `• ${b}\n`;
    }
    context += `\n`;
  }
  
  // High priority TODOs
  const highTodos = state.allTodos.filter(t => t.priority === "high");
  if (highTodos.length > 0) {
    context += `**🔴 High Priority TODOs:**\n`;
    for (const t of highTodos.slice(0, 5)) {
      context += `• ${t.text} (${t.source})\n`;
    }
    context += `\n`;
  }
  
  // North star status
  const staleOrMissing = state.northStarDeliverables.filter(d => d.status !== "active");
  if (staleOrMissing.length > 0) {
    context += `**North Star Gaps:**\n`;
    for (const d of staleOrMissing) {
      context += `• ${d.deliverable} (${d.owner}): ${d.status}\n`;
    }
    context += `\n`;
  }
  
  // Blocked items from progress files
  if (state.blocked.length > 0) {
    context += `**Blocked (progress.txt):**\n`;
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
  
  // Roadmap items
  if (state.roadmapItems.length > 0) {
    context += `**Roadmap (from docs):**\n`;
    for (const r of state.roadmapItems.slice(0, 3)) {
      context += `• ${r.title}\n`;
    }
    context += `\n`;
  }
  
  // Lessons learned
  if (state.lessonsLearned.length > 0) {
    context += `**Lessons Learned:**\n`;
    for (const l of state.lessonsLearned.slice(0, 3)) {
      context += `• ${l.pattern}: ${l.action}\n`;
    }
    context += `\n`;
  }
  
  // Recent activity
  if (state.recentChanges.length > 0) {
    const todayChanges = state.recentChanges.filter(c => c.daysAgo === 0);
    context += `**Recent Activity:** ${todayChanges.length} files today, ${state.recentChanges.length} this week\n\n`;
  }
  
  // Get learnings from past Sentinel suggestions
  const sentinelLearnings = getLearnings();
  if (sentinelLearnings.length > 0) {
    context += `**Sentinel suggestion history:**\n`;
    for (const l of sentinelLearnings) {
      context += `${l}\n`;
    }
    context += `\n`;
  }
  
  // Compose RAG state for additional knowledge context
  const ragState = await runtime.composeState({ content: { text: userContext } } as Memory);
  const ragContext = typeof ragState.text === "string" ? ragState.text.slice(0, 2500) : "";
  
  const prompt = `You are Sentinel, the core dev agent. Your job: suggest the MOST IMPACTFUL things to ship to push the project forward. You have analyzed ALL the project docs (${state.docInsights.length} docs) and extracted priorities, TODOs, blockers, and roadmap items.

**PRIORITY ORDER:**
1. 🔴 24/7 market research — Vince push, X research, signals (TOP PRIORITY per north star)
2. 🚫 Unblock blockers — Nothing else moves until blockers are cleared
3. 📋 High-priority TODOs from docs — These were marked important by the team
4. 🔄 Complete in-progress work — Finish what's started before new work
5. ⭐ Fill north star gaps — Missing deliverables hurt the mission
6. 💰 Revenue-generating features — Money enables everything else
7. 🔧 Tech debt — Only if it's blocking other work

**PROJECT STATE (from scanning all docs):**
${context}

**ADDITIONAL KNOWLEDGE:**
${ragContext.slice(0, 2000)}

**OUTPUT RULES:**
- Write in flowing prose for the summary; if you list priorities, keep the list short (max 5) and follow with one sentence on the top pick.
- Each suggestion: specific action, owner/plugin, and why it matters.
- USE THE PRIORITIES AND TODOS FROM THE DOCS — don't invent new ideas when docs have clear priorities.
- If something is blocked, suggest how to unblock it specifically. Reference the source doc when relevant (e.g. "per TREASURY.md").
- End with "🎯 Top pick: [your #1 and ONE sentence why]"

${NO_AI_SLOP}

**User question:** ${userContext}

Output the ship priorities (flowing prose, then short list + top pick):`;

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
  ): Promise<void | ActionResult> => {
    const userText = (message.content?.text ?? "").trim();
    
    logger.info("[SENTINEL_SHIP] Analyzing project for ship priorities");

    try {
      // Handle radar-only request
      if (isRadarOnly(userText)) {
        const summary = getProjectSummary();
        await callback({ text: summary });
        return { success: true };
      }
      
      // Handle impact score request
      if (isScoreRequest(userText)) {
        const ideaMatch = userText.match(/(?:impact score|score this)[:\s]+(.+)/i);
        const idea = ideaMatch?.[1]?.trim() || userText.replace(/impact score|score this/gi, "").trim();
        
        if (!idea || idea.length < 10) {
          await callback({
            text: "Please provide an idea to score:\n`impact score <your idea here>`",
          });
          return { success: true };
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
        return { success: true };
      }
      
      // Full ship priorities
      const projectState = scanProject();
      
      // Generate summary header
      let response = `🚀 **Ship Priorities**\n\n`;
      
      // Rich state summary
      const activeNS = projectState.northStarDeliverables.filter(d => d.status === "active").length;
      const totalNS = projectState.northStarDeliverables.length;
      const highTodos = projectState.allTodos.filter(t => t.priority === "high").length;
      
      response += `*Scanned ${projectState.docInsights.length} docs | ${projectState.plugins.length} plugins, ${projectState.totalActions} actions | `;
      response += `${highTodos} high-priority TODOs | North Star: ${activeNS}/${totalNS} | `;
      response += `${projectState.blocked.length + projectState.criticalBlockers.length} blockers*\n\n`;
      
      // Show blockers first if any
      if (projectState.criticalBlockers.length > 0) {
        response += `**🚫 Blockers to clear first:**\n`;
        for (const b of projectState.criticalBlockers.slice(0, 3)) {
          response += `• ${b}\n`;
        }
        response += `\n`;
      }
      
      // Generate AI-powered priorities
      const priorities = await generateShipPriorities(runtime, projectState, userText);
      response += priorities;
      
      // Record suggestions for learning
      const suggestionLines = priorities.match(/^\d+\..+$/gm) || [];
      for (const line of suggestionLines.slice(0, 5)) {
        recordSuggestion(line, "ship-priority");
      }
      
      const out = "Here's what to ship—\n\n" + response;
      await callback({ text: out });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_SHIP] Failed:", error);
      await callback({
        text: "Couldn't analyze ship priorities. Try `project radar` for a state overview, or ask about a specific area.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "What should we ship?" } },
      {
        name: "{{agent}}",
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
      { name: "{{user}}", content: { text: "impact score: add a leaderboard for paper trading results" } },
      {
        name: "{{agent}}",
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
