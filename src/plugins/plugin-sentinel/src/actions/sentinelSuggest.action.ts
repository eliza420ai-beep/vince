/**
 * SENTINEL_SUGGEST — Proactive, Impact-Scored Improvement Suggestions
 *
 * The heart of Sentinel: intelligent suggestions powered by:
 * - Project Radar (what's the current state?)
 * - Impact Scorer (what moves the needle?)
 * - OpenClaw Knowledge (how does OpenClaw fit?)
 * - Docs Analysis (what do the docs say?)
 *
 * North star: 24/7 market research is TOP PRIORITY.
 * OpenClaw (formerly openclaw/MoltBot) matters A LOT.
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
import { 
  scanProject, 
  getProjectSummary, 
  getAllTodos,
  getLessons,
  type ProjectState 
} from "../services/projectRadar.service";
import { 
  autoScore, 
  rankWorkItems, 
  getLearnings,
  formatScore,
  type WorkItem 
} from "../services/impactScorer.service";
import { generateTaskBrief } from "../services/prdGenerator.service";
import { 
  suggestOpenClawUsage,
  getOpenclawResearchSetup,
  getIntegrationPatterns,
} from "../services/openclawKnowledge.service";
import { NO_AI_SLOP } from "../utils/alohaStyle";

const SUGGEST_TRIGGERS = [
  "suggest",
  "suggestions",
  "what should we improve",
  "what to improve",
  "what should we do next",
  "what's next",
  "improve the project",
  "what matters",
  "priorities",
  "what to work on",
  "next steps",
  "roadmap",
];

const TASK_BRIEF_TRIGGERS = [
  "task brief for claude",
  "task brief for claude 4.6",
  "instructions for claude",
  "instructions for claude code",
  "brief for cursor",
  "claude code brief",
];

const INTEGRATION_TRIGGERS = [
  "milaidy",
  "openclaw",
  "openclaw",
  "integration instructions",
  "how to run milaidy",
  "how to run openclaw",
  "how to set up openclaw",
  "knowledge research setup",
];

function wantsSuggest(text: string): boolean {
  const lower = text.toLowerCase();
  return SUGGEST_TRIGGERS.some(t => lower.includes(t));
}

function wantsTaskBrief(text: string): boolean {
  const lower = text.toLowerCase();
  return TASK_BRIEF_TRIGGERS.some(t => lower.includes(t));
}

function wantsIntegration(text: string): boolean {
  const lower = text.toLowerCase();
  return INTEGRATION_TRIGGERS.some(t => lower.includes(t));
}

/**
 * Generate intelligent suggestions based on project state
 */
function generateIntelligentSuggestions(state: ProjectState): WorkItem[] {
  const suggestions: WorkItem[] = [];
  const now = new Date().toISOString();

  // TOP PRIORITY: 24/7 Market Research
  // Check if market research infra is healthy
  const vincePlugin = state.plugins.find(p => p.name === "plugin-vince");
  if (vincePlugin && vincePlugin.healthScore < 80) {
    suggestions.push({
      id: "market-research-health",
      title: "Improve plugin-vince health score",
      description: `plugin-vince health is ${vincePlugin.healthScore}/100. Add tests, improve services. 24/7 market research is TOP PRIORITY.`,
      category: "infra",
      plugin: "plugin-vince",
      createdAt: now,
    });
  }

  // Check for X research gaps
  if (state.knowledgeGaps.some(g => g.toLowerCase().includes("x") || g.toLowerCase().includes("research"))) {
    suggestions.push({
      id: "x-research-gaps",
      title: "Set up openclaw for knowledge research",
      description: "24/7 knowledge ingestion: dedicated X account + curated follows + Birdy → knowledge pipeline. No X API cost.",
      category: "research",
      createdAt: now,
    });
  }

  // Critical blockers are highest priority
  for (const blocker of state.criticalBlockers.slice(0, 2)) {
    suggestions.push({
      id: `blocker-${Math.random().toString(36).slice(2)}`,
      title: `Unblock: ${blocker.slice(0, 60)}`,
      description: blocker,
      category: "fix",
      createdAt: now,
    });
  }

  // High-priority todos from docs
  const highTodos = state.allTodos.filter(t => t.priority === "high");
  for (const todo of highTodos.slice(0, 2)) {
    suggestions.push({
      id: `todo-${Math.random().toString(36).slice(2)}`,
      title: todo.text.slice(0, 60),
      description: `From ${todo.source}: ${todo.text}`,
      category: "feature",
      createdAt: now,
    });
  }

  // North star deliverables that are stale or missing
  const staleDeliverables = state.northStarDeliverables.filter(d => d.status === "stale" || d.status === "missing");
  for (const del of staleDeliverables.slice(0, 2)) {
    suggestions.push({
      id: `northstar-${del.deliverable.toLowerCase().replace(/\s+/g, "-")}`,
      title: `Produce: ${del.deliverable}`,
      description: `North star deliverable is ${del.status}. Owner: ${del.owner}. Generate and save to standup-deliverables/.`,
      category: "content",
      createdAt: now,
    });
  }

  // Plugins without tests
  const untested = state.plugins.filter(p => !p.hasTests && p.actionCount > 0);
  for (const plugin of untested.slice(0, 1)) {
    suggestions.push({
      id: `tests-${plugin.name}`,
      title: `Add tests for ${plugin.name}`,
      description: `${plugin.name} has ${plugin.actionCount} actions but no tests. Add unit tests in __tests__/.`,
      category: "infra",
      plugin: plugin.name,
      createdAt: now,
    });
  }

  // In-progress items that might need attention
  const staleInProgress = state.inProgress.filter(i => {
    // If no date, consider potentially stale
    return !i.date;
  });
  for (const item of staleInProgress.slice(0, 1)) {
    suggestions.push({
      id: `progress-${item.version}`,
      title: `Complete: ${item.title}`,
      description: `${item.version} has been in progress. Either complete it or move to blocked/planned.`,
      category: "feature",
      plugin: item.plugin,
      createdAt: now,
    });
  }

  // OpenClaw integration suggestions
  suggestions.push({
    id: "openclaw-adapter",
    title: "Evaluate openclaw-adapter for wallet plugins",
    description: "The openclaw-adapter bridges Eliza plugins to OpenClaw. Consider for plugin-evm, plugin-solana, or Otaku wallet logic.",
    category: "infra",
    createdAt: now,
  });

  return suggestions;
}

export const sentinelSuggestAction: Action = {
  name: "SENTINEL_SUGGEST",
  similes: [
    "SUGGEST_IMPROVEMENTS",
    "CORE_DEV_SUGGEST",
    "TASK_BRIEF",
    "WHAT_MATTERS",
    "PRIORITIES",
  ],
  description:
    "Returns prioritized, impact-scored improvement suggestions. Uses Project Radar to understand current state, Impact Scorer to rank by value, and OpenClaw knowledge for integration guidance. Also handles task briefs for Claude Code and integration instructions for Milaidy/OpenClaw.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsSuggest(text) || wantsTaskBrief(text) || wantsIntegration(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult> => {
    logger.debug("[SENTINEL_SUGGEST] Action fired");

    try {
      const userText = (message.content?.text ?? "").trim();
      
      // Handle task brief request
      if (wantsTaskBrief(userText)) {
        // Extract the task from the request
        const taskMatch = userText.match(/(?:brief|instructions)\s+(?:for\s+)?(?:claude\s+)?(?:code\s+)?(?:4\.6\s+)?(?:to\s+)?(.+)/i);
        const task = taskMatch?.[1]?.trim() || "the requested feature";
        
        // Detect plugin from context
        const pluginMatch = userText.match(/(?:in|for)\s+(plugin-[a-z-]+)/i);
        const plugin = pluginMatch?.[1] || "plugin-vince";
        
        const brief = generateTaskBrief(
          task.charAt(0).toUpperCase() + task.slice(1),
          `Implement ${task} as requested`,
          plugin
        );
        
        await callback({
          text: `📝 **Task Brief for Claude Code**\n\nHere's a task brief you can paste into Cursor or the Claude Code controller.\n\n\`\`\`\n${brief}\n\`\`\``,
        });
        return { success: true };
      }

      // Handle integration instructions request
      if (wantsIntegration(userText)) {
        const lower = userText.toLowerCase();
        
        // openclaw/knowledge research setup
        if (lower.includes("openclaw") || lower.includes("knowledge research")) {
          const setup = getOpenclawResearchSetup();
          
          await callback({
            text: `🤖 **openclaw Knowledge Research Setup**

**Purpose:** ${setup.purpose}

**Requirements:**
${setup.requirements.map(r => `• ${r}`).join("\n")}

**Steps:**
${setup.steps.join("\n")}

**Benefits:**
${setup.benefits.map(b => `✅ ${b}`).join("\n")}

---
*24/7 knowledge research without X API cost. OpenClaw matters A LOT.*`,
          });
          return { success: true };
        }

        // General integration instructions
        const patterns = getIntegrationPatterns();
        const patternsText = patterns.map(p => 
          `### ${p.name}\n${p.description}\n\n**When to use:** ${p.whenToUse}\n\n**Implementation:**\n${p.implementation}`
        ).join("\n\n---\n\n");
        
        await callback({
          text: `🔗 **OpenClaw & Milaidy Integration Patterns**

${patternsText}

---

**Links:**
• OpenClaw: https://github.com/openclaw/openclaw
• openclaw-adapter: https://github.com/elizaOS/openclaw-adapter
• Milaidy: https://github.com/milady-ai/milaidy

*OpenClaw (formerly openclaw/MoltBot) matters A LOT.*`,
        });
        return { success: true };
      }

      // Main suggestions flow
      logger.info("[SENTINEL_SUGGEST] Scanning project state...");
      
      // Get current project state
      const projectState = scanProject();
      
      // Generate intelligent suggestions
      const suggestions = generateIntelligentSuggestions(projectState);
      
      // Score and rank suggestions
      const ranked = rankWorkItems(suggestions);
      
      // Get learnings from past suggestions
      const learnings = getLearnings();
      
      // Get OpenClaw suggestions based on context
      const openclawSuggestions = suggestOpenClawUsage(userText);
      
      // Optional narrative lead (ALOHA-style): one paragraph then details
      let narrativeLead = "";
      try {
        const topTitles = ranked.slice(0, 5).map((r, i) => `${i + 1}. ${r.title}: ${r.description.slice(0, 80)}${r.description.length > 80 ? "…" : ""}`).join("\n");
        const stateLine = `${projectState.plugins.length} plugins, ${projectState.inProgress.length} in progress, ${projectState.blocked.length} blocked, ${projectState.allTodos.filter(t => t.priority === "high").length} high-priority TODOs`;
        const narrativePrompt = `You are Sentinel. Given these impact-ranked priorities and project state, write one short narrative paragraph (flowing prose, no bullet list) that tells the user what to focus on and why. North star: 24/7 market research is top priority; OpenClaw matters a lot. Sound like a sharp colleague, not a report.

Top priorities:\n${topTitles}

Project state: ${stateLine}

${NO_AI_SLOP}

One paragraph only, no preamble:`;
        const narrativeResp = await runtime.useModel(ModelType.TEXT_SMALL, { prompt: narrativePrompt });
        const narrativeText = typeof narrativeResp === "string" ? narrativeResp : (narrativeResp as { text?: string })?.text ?? "";
        if (narrativeText?.trim()) narrativeLead = narrativeText.trim() + "\n\n";
      } catch (_) {
        // fallback: no narrative, keep existing structure
      }
      
      // Build the response
      let response = `🎯 **Sentinel Suggestions** (Impact-Scored)\n\n`;
      if (narrativeLead) response += narrativeLead;
      response += `*North star: 24/7 market research is TOP PRIORITY. OpenClaw matters A LOT.*\n\n`;
      
      // Top 5 suggestions with scores
      response += `**Top Priorities:**\n\n`;
      for (let i = 0; i < Math.min(5, ranked.length); i++) {
        const item = ranked[i];
        const scoreEmoji = item.score.totalScore >= 50 ? "🔥" : 
                          item.score.totalScore >= 30 ? "🟢" : 
                          item.score.totalScore >= 15 ? "🟡" : "⚪";
        
        response += `${i + 1}. ${scoreEmoji} **${item.title}** (Score: ${item.score.totalScore})\n`;
        response += `   ${item.description.slice(0, 100)}${item.description.length > 100 ? "..." : ""}\n`;
        if (item.plugin) response += `   *Target: ${item.plugin}*\n`;
        response += `\n`;
      }
      
      // Project state summary
      response += `---\n\n**📡 Project State:**\n`;
      response += `• Plugins: ${projectState.plugins.length} (${projectState.totalActions} actions, ${projectState.totalServices} services)\n`;
      response += `• Progress: ${projectState.completed.length} done, ${projectState.inProgress.length} active, ${projectState.blocked.length} blocked\n`;
      response += `• Open TODOs: ${projectState.allTodos.length} (${projectState.allTodos.filter(t => t.priority === "high").length} high)\n`;
      
      // North star status
      const activeNS = projectState.northStarDeliverables.filter(d => d.status === "active").length;
      const totalNS = projectState.northStarDeliverables.length;
      response += `• North Star: ${activeNS}/${totalNS} active\n`;
      
      // OpenClaw suggestions
      if (openclawSuggestions.length > 0) {
        response += `\n**🦞 OpenClaw Opportunities:**\n`;
        for (const sug of openclawSuggestions.slice(0, 2)) {
          response += `• ${sug}\n`;
        }
      }
      
      // Learnings
      if (learnings.length > 0) {
        response += `\n**📚 Learnings:**\n`;
        for (const learning of learnings.slice(0, 2)) {
          response += `${learning}\n`;
        }
      }
      
      response += `\n---\n*For a full PRD: "PRD for <feature>". For a task brief: "brief for Claude to <task>".*`;
      
      const out = "Here are my suggestions—\n\n" + response;
      await callback({ text: out });
      return { success: true };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[SENTINEL_SUGGEST] Failed:", error);
      await callback({
        text: "Failed to generate suggestions. Check logs and try again.",
      });
      return { success: false, error: err };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "What should we improve next?" } },
      {
        name: "{{agent}}",
        content: {
          text: "🎯 **Sentinel Suggestions** (Impact-Scored)\n\n*North star: 24/7 market research is TOP PRIORITY.*\n\n**Top Priorities:**\n\n1. 🔥 **Improve plugin-vince health** (Score: 65)\n   Add tests, improve services...\n\n2. 🟢 **Set up openclaw** (Score: 45)\n   24/7 knowledge ingestion...",
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Task brief for Claude to refactor options action" } },
      {
        name: "{{agent}}",
        content: {
          text: "📝 **Task Brief for Claude Code**\n\n```\nTask: Refactor options action...\n```\n\n*Paste this into Cursor.*",
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "How do I set up openclaw for knowledge research?" } },
      {
        name: "{{agent}}",
        content: {
          text: "🤖 **openclaw Knowledge Research Setup**\n\n**Purpose:** 24/7 knowledge ingestion without X API cost...",
        },
      },
    ],
  ],
};
