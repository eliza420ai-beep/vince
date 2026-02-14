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
import { saveDayReport, updateDayReportManifest, getRecentReportsContext } from "../standup/dayReportPersistence";
import { getActionItemsContext, parseActionItemsFromReport, addActionItem } from "../standup/actionItemTracker";
import { extractSignalsFromReport, validateAllAssets, buildValidationContext, type AgentSignal } from "../standup/crossAgentValidation";
import { getStandupConfig, formatSchedule } from "../standup/standupScheduler";
import { startStandupSession, endStandupSession, getSessionStats, isStandupActive } from "../standup/standupState";
import { STANDUP_REPORT_ORDER, isStandupKickoffRequest } from "../standup/standup.constants";
import { buildDayReportPrompt } from "../standup/standupDayReport";
import { getElizaOS } from "../types";
import { buildAndSaveSharedDailyInsights, persistStandupLessons, persistStandupDisagreements, createActionItemTasks } from "../standup/standup.tasks";
import { loadSharedDailyInsights } from "../standup/dayReportPersistence";
import { buildKickoffWithSharedInsights } from "../standup/standup.context";
import { parseStandupTranscript, countCrossAgentLinks } from "../standup/standup.parse";

/** Focus areas for this standup (not lifestyle/NFTs/memes) */
const STANDUP_FOCUS = {
  assets: ["BTC", "SOL", "HYPE", "HIP-3"],
  products: ["Perps (Hyperliquid)", "Options (Hypersurface)", "Spot/1x leverage"],
  intel: ["X sentiment", "Polymarket"],
  excluded: ["NFTs", "Memetics", "Lifestyle"], // These are for other meetings
};

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
 * Build kickoff message — SHORT, calls VINCE immediately
 * Keep it brief to avoid rate limits and get to the data fast.
 */
function buildKickoffMessage(): string {
  const date = formatReportDate();
  const day = getDayOfWeek();
  
  // ULTRA SHORT kickoff — gets to VINCE immediately
  return `## 🎯 Standup ${date} (${day})

BTC · SOL · HYPE · HIP-3 — Numbers only, no fluff.

@VINCE, market data — go.`;
}

/**
 * Get next agent in order
 */
function getNextAgent(currentAgent: string): string | null {
  const currentIndex = STANDUP_REPORT_ORDER.findIndex(
    (a) => a.toLowerCase() === currentAgent.toLowerCase()
  );
  
  if (currentIndex === -1 || currentIndex === STANDUP_REPORT_ORDER.length - 1) {
    return null; // Last agent or not found
  }
  
  return STANDUP_REPORT_ORDER[currentIndex + 1];
}

/**
 * Build "next agent" prompt — SHORT, just calls the next agent
 */
function buildNextAgentMessage(completedAgent: string): string {
  const next = getNextAgent(completedAgent);
  
  if (!next) {
    return `Got it. Synthesizing action plan now...`;
  }
  
  // Ultra short transition — just call the next agent
  return `@${next}, go.`;
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

    const text = message.content?.text || "";

    // Kickoff: use shared helper so "daily stand up" and "let's do a stand up" match
    const isKickoff = isStandupKickoffRequest(text);
    const isWrapup = WRAPUP_TRIGGERS.some((t) => text.toLowerCase().includes(t));

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
      
      // Get additional context
      const actionItemsContext = getActionItemsContext();
      const recentReports = getRecentReportsContext(3);

      // Extract signals from conversation for cross-validation
      const signals: AgentSignal[] = [];
      const contextStr = String(recentContext);
      for (const agent of STANDUP_REPORT_ORDER) {
        const agentSignals = extractSignalsFromReport(agent, contextStr);
        signals.push(...agentSignals);
      }
      const validationContext = buildValidationContext(signals);
      
      const prompt = buildDayReportPrompt(contextStr) + `

## Additional Context

### Previous Action Items
${actionItemsContext}

### Recent Day Reports
${recentReports}

### Cross-Agent Validation
${validationContext}
`;
      
      try {
        const dayReport = await runtime.useModel(ModelType.TEXT_LARGE, {
          prompt,
          maxTokens: 1200,
          temperature: 0.7,
        });

        const reportText = String(dayReport).trim();

        // Save the day report to disk
        const savedPath = saveDayReport(reportText);
        if (savedPath) {
          // Extract TL;DR for manifest
          const tldrMatch = reportText.match(/### TL;DR\n([^\n#]+)/);
          const summary = tldrMatch ? tldrMatch[1].trim() : "Day report generated";
          updateDayReportManifest(savedPath, summary);
        }

        // Parse and track action items
        const date = formatReportDate();
        const parsedItems = parseActionItemsFromReport(reportText, date);
        for (const item of parsedItems) {
          if (item.what && item.owner) {
            addActionItem({
              date,
              what: item.what,
              how: item.how || "",
              why: item.why || "",
              owner: item.owner,
              urgency: item.urgency || "today",
            });
          }
        }

        if (callback) {
          const savedNote = savedPath ? `\n\n*📁 Saved to ${savedPath}*` : "";
          await callback({
            text: reportText + savedNote,
            action: "STANDUP_FACILITATE",
            source: "Kelly",
          });
        }

        // Persist to DB: parse transcript for lessons, disagreements, action item tasks, cross-agent links
        try {
          const parsed = await parseStandupTranscript(runtime, contextStr);
          const crossAgentLinks = countCrossAgentLinks(contextStr);
          if (crossAgentLinks > 0) {
            logger.info(`[STANDUP_FACILITATE] North star: ${crossAgentLinks} cross-agent link(s) detected`);
          }
          await persistStandupLessons(runtime, message.roomId, parsed.lessonsByAgentName);
          await persistStandupDisagreements(runtime, parsed.disagreements);
          await createActionItemTasks(runtime, parsed.actionItems, message.roomId, message.entityId);
          logger.info(
            `[STANDUP_FACILITATE] DB persistence: ${Object.keys(parsed.lessonsByAgentName).length} lessons, ${parsed.actionItems.length} action items, ${parsed.disagreements.length} disagreements`,
          );
        } catch (persistErr) {
          logger.warn({ err: persistErr }, "[STANDUP_FACILITATE] DB persistence failed (non-fatal)");
        }

        // End the standup session
        endStandupSession();
        
        logger.info(`[STANDUP_FACILITATE] Day report saved, ${parsedItems.length} action items tracked`);
      } catch (error) {
        logger.error({ error }, "[STANDUP_FACILITATE] Failed to generate Day Report");
        endStandupSession();
        if (callback) {
          await callback({
            text: "Let me summarize: Check the thread above for action items. @Yves, any decisions you need to make?",
            action: "STANDUP_FACILITATE",
            source: "Kelly",
          });
        }
      }
    } else {
      // Guard: refuse to start if a standup is already running
      if (isStandupActive()) {
        logger.info("[STANDUP_FACILITATE] A standup is already in progress — skipping kickoff");
        if (callback) {
          await callback({
            text: "A standup is already in progress. Wait for it to finish or ask me to wrap up.",
            action: "STANDUP_FACILITATE",
            source: "Kelly",
          });
        }
        return true;
      }

      // Kickoff — start a new standup session
      startStandupSession(message.roomId);

      const config = getStandupConfig(runtime);
      const pendingContext = getActionItemsContext();

      let kickoffText: string;
      const eliza = getElizaOS(runtime);
      if (eliza?.getAgent) {
        try {
          await buildAndSaveSharedDailyInsights(runtime, eliza);
        } catch (err) {
          logger.warn({ err }, "[STANDUP_FACILITATE] buildAndSaveSharedDailyInsights failed; using short kickoff");
        }
      }
      const sharedContent = loadSharedDailyInsights()?.trim();
      if (sharedContent) {
        kickoffText = buildKickoffWithSharedInsights(sharedContent);
      } else {
        kickoffText = buildKickoffMessage();
      }

      if (config.enabled) {
        kickoffText += `\n\n*⏰ Auto-standup: ${formatSchedule(config.schedule)}*`;
      }
      
      // Add pending items reminder
      const pendingMatch = pendingContext.match(/Pending \((\d+)\)/);
      if (pendingMatch && parseInt(pendingMatch[1]) > 0) {
        kickoffText += `\n\n*📋 ${pendingMatch[1]} pending action items from previous standups*`;
      }

      if (callback) {
        await callback({
          text: kickoffText,
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
