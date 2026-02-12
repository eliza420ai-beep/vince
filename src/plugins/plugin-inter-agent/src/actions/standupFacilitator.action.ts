/**
 * STANDUP_FACILITATE Action (Kelly only)
 *
 * Kelly kicks off the daily standup, calls on each agent in order,
 * and wraps up with the actionable Day Report.
 *
 * Phases:
 * 1. KICKOFF — Kelly opens, sets context, calls first agent
 * 2. NEXT — Kelly calls on next agent after each report
 * 3. WRAPUP — Kelly synthesizes into actionable Day Report
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  ModelType,
} from "@elizaos/core";
import { AGENT_ROLES, formatReportDate, getDayOfWeek } from "../standup/standupReports";

/** Standup order — Kelly facilitates, calls each in turn */
const STANDUP_ORDER = [
  "VINCE",    // Market data first
  "Eliza",    // Research context
  "ECHO",     // Sentiment layer
  "Oracle",   // Prediction markets
  "Solus",    // Trading strategy
  "Otaku",    // Execution status
  "Sentinel", // System health
  // Yves jumps in whenever — human priority
  // Kelly wraps up at the end
];

const KICKOFF_TRIGGERS = [
  "start standup",
  "kick off standup",
  "begin standup",
  "daily standup",
  "morning standup",
  "let's do standup",
  "team standup",
  "standup time",
];

const WRAPUP_TRIGGERS = [
  "wrap up",
  "let's wrap",
  "summarize",
  "day report",
  "action plan",
  "what's the plan",
  "final report",
];

/**
 * Build kickoff message
 */
function buildKickoffMessage(): string {
  const date = formatReportDate();
  const day = getDayOfWeek();
  
  return `## 🎯 Daily Standup — ${date} (${day})

*One Team, One Dream — Let's align and take action.*

---

Good ${getTimeOfDay()} team! Time for our daily sync.

**Today's agenda:**
1. Quick reports from each agent (data first, insights second)
2. Cross-check — anyone see conflicts or alignments?
3. Synthesize into today's action plan
4. Decisions for @Yves

**The rules:**
- Lead with numbers, not vibes
- Name your sources
- End with ACTION or DECISION items
- Keep it under 2 minutes each

---

@VINCE, you're up first. What's the market telling us?`;
}

/**
 * Get next agent in order
 */
function getNextAgent(currentAgent: string): string | null {
  const currentIndex = STANDUP_ORDER.findIndex(
    (a) => a.toLowerCase() === currentAgent.toLowerCase()
  );
  
  if (currentIndex === -1 || currentIndex === STANDUP_ORDER.length - 1) {
    return null; // Last agent or not found
  }
  
  return STANDUP_ORDER[currentIndex + 1];
}

/**
 * Build "next agent" prompt
 */
function buildNextAgentMessage(completedAgent: string): string {
  const next = getNextAgent(completedAgent);
  
  if (!next) {
    return `Thanks ${completedAgent}. That's everyone — let me synthesize the action plan.`;
  }
  
  const role = AGENT_ROLES[next as keyof typeof AGENT_ROLES];
  return `Thanks ${completedAgent}. @${next}, you're up — ${role?.focus || "your update"}.`;
}

/**
 * Build wrap-up Day Report prompt
 */
function buildWrapupPrompt(conversationContext: string): string {
  return `You are Kelly, the Chief Vibes Officer and Standup Facilitator.

Based on today's standup conversation, create the **Actionable Day Report**.

CONVERSATION CONTEXT:
${conversationContext}

Generate the Day Report with this EXACT structure:

## 📋 Day Report — ${formatReportDate()}

### TL;DR (2 sentences max)
[What's the main focus today and why]

### 🎬 Action Plan

| WHAT | HOW | WHY | OWNER | 
|------|-----|-----|-------|
[Extract 3-5 concrete actions from the standup. Be specific.]

### ⚡ Decisions for @Yves

| Decision | Rec | Confidence | Why Now |
|----------|-----|------------|---------|
[Any decisions that need Yves's input. Include recommendation.]

### 🚨 Blockers / Risks
[Any blockers or risks mentioned. "None" if clear.]

### 🎯 North Star Alignment
**The Dream:** [Current team goal]
**Today's Step:** [How today moves us forward]

---
*One team, one dream. Let's make it happen.*

RULES:
- Be SPECIFIC — "Size SOL long at $198" not "Consider SOL"
- Include WHO owns each action
- If something needs Yves, say WHY it's urgent
- Keep it actionable, not informational`;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export const standupFacilitatorAction: Action = {
  name: "STANDUP_FACILITATE",
  description:
    "Kelly facilitates the daily standup — kicks off, calls on agents, and wraps up with actionable Day Report. Only Kelly should use this.",
  similes: [
    "start standup",
    "kick off",
    "wrap up standup",
    "day report",
    "facilitate standup",
    "next agent",
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Only Kelly can facilitate
    const agentName = (runtime.character?.name || "").toLowerCase();
    if (agentName !== "kelly") {
      return false;
    }

    const text = (message.content?.text || "").toLowerCase();
    
    // Check for kickoff or wrapup triggers
    const isKickoff = KICKOFF_TRIGGERS.some((t) => text.includes(t));
    const isWrapup = WRAPUP_TRIGGERS.some((t) => text.includes(t));
    
    return isKickoff || isWrapup;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();
    const isWrapup = WRAPUP_TRIGGERS.some((t) => text.includes(t));

    logger.info(`[STANDUP_FACILITATE] Kelly ${isWrapup ? "wrapping up" : "kicking off"} standup`);

    if (isWrapup) {
      // Generate Day Report from conversation context
      const recentContext = state?.recentMessages || 
        "No recent messages available. Generate a template Day Report.";
      
      const prompt = buildWrapupPrompt(String(recentContext));
      
      try {
        const dayReport = await runtime.useModel(ModelType.TEXT_LARGE, {
          prompt,
          maxTokens: 1000,
          temperature: 0.7,
        });

        if (callback && dayReport) {
          await callback({
            text: String(dayReport).trim(),
            action: "STANDUP_FACILITATE",
            source: "Kelly",
          });
        }
      } catch (error) {
        logger.error({ error }, "[STANDUP_FACILITATE] Failed to generate Day Report");
        if (callback) {
          await callback({
            text: "Let me summarize: Check the thread above for action items. @Yves, any decisions you need to make?",
            action: "STANDUP_FACILITATE",
            source: "Kelly",
          });
        }
      }
    } else {
      // Kickoff
      if (callback) {
        await callback({
          text: buildKickoffMessage(),
          action: "STANDUP_FACILITATE",
          source: "Kelly",
        });
      }
    }

    return true;
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Kelly, start the daily standup" },
      },
      {
        name: "Kelly",
        content: {
          text: "## 🎯 Daily Standup — 2026-02-12 (Wednesday)\n\n*One Team, One Dream — Let's align and take action.*\n\n@VINCE, you're up first...",
          action: "STANDUP_FACILITATE",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Kelly, wrap up and give us the day report" },
      },
      {
        name: "Kelly",
        content: {
          text: "## 📋 Day Report — 2026-02-12\n\n### TL;DR\nSOL setup is high conviction. Main action is sizing the position.\n\n### 🎬 Action Plan...",
          action: "STANDUP_FACILITATE",
        },
      },
    ],
  ],
};

export default standupFacilitatorAction;
