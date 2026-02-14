/**
 * Standup Orchestrator
 * 
 * Handles the actual mechanics of standup progression:
 * - Real delays between agent calls
 * - Automatic skip for stuck agents
 * - Health monitoring
 * - Recovery from stalls
 * 
 * This is the "engine" that drives the standup forward.
 */

import { logger } from "@elizaos/core";
import {
  isStandupActive,
  getNextUnreportedAgent,
  haveAllAgentsReported,
  markAgentReported,
  shouldSkipCurrentAgent,
  getTimeSinceLastActivity,
  markWrappingUp,
  isWrappingUp,
  touchActivity,
  getSessionStats,
} from "./standupState";
import { getStandupResponseDelay, getStandupDiscordMentionId } from "./standup.constants";

/** Standup turn order with display names */
const AGENT_ORDER: Array<{ id: string; display: string }> = [
  { id: "vince", display: "VINCE" },
  { id: "eliza", display: "Eliza" },
  { id: "echo", display: "ECHO" },
  { id: "oracle", display: "Oracle" },
  { id: "solus", display: "Solus" },
  { id: "otaku", display: "Otaku" },
  { id: "sentinel", display: "Sentinel" },
  { id: "clawterm", display: "Clawterm" },
];

/** Skip timeout: 3 minutes of no response = skip */
const SKIP_TIMEOUT_MS = 3 * 60 * 1000;

/** Max standup duration: 20 minutes */
const MAX_STANDUP_DURATION_MS = 20 * 60 * 1000;

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get the display name for an agent
 */
export function getAgentDisplayName(agentId: string): string {
  const agent = AGENT_ORDER.find((a) => a.id === agentId.toLowerCase());
  return agent?.display || agentId;
}

/**
 * Get the progression message for calling the next agent.
 * Includes ACTUAL delay, not just a prompt.
 */
export async function getProgressionMessage(): Promise<{
  message: string;
  action: "call_next" | "wrap_up" | "skip" | "wait" | "done";
  nextAgent?: string;
}> {
  // Check if standup is active
  if (!isStandupActive()) {
    return { message: "", action: "done" };
  }

  // Check if wrapping up
  if (isWrappingUp()) {
    return { message: "", action: "done" };
  }

  // Check if all agents reported
  if (haveAllAgentsReported()) {
    markWrappingUp();
    return {
      message: "All agents reported. Generating Day Report...",
      action: "wrap_up",
    };
  }

  // Check for stuck agent (no activity for SKIP_TIMEOUT_MS)
  const timeSinceActivity = getTimeSinceLastActivity();
  if (timeSinceActivity > SKIP_TIMEOUT_MS) {
    const stuckAgent = getNextUnreportedAgent();
    if (stuckAgent) {
      // Mark as reported (skipped) and move on
      markAgentReported(stuckAgent);
      logger.warn(`[STANDUP_ORCHESTRATOR] Skipping ${stuckAgent} after ${Math.round(timeSinceActivity / 1000)}s of inactivity`);
      
      const nextAgent = getNextUnreportedAgent();
      if (nextAgent) {
        const discordId = getStandupDiscordMentionId(nextAgent);
        const nextDisplay = getAgentDisplayName(nextAgent);
        const callMsg = discordId ? `<@${discordId}> go.` : `@${nextDisplay}, go.`;
        return {
          message: `⚠️ ${getAgentDisplayName(stuckAgent)} timed out. ${callMsg}`,
          action: "skip",
          nextAgent,
        };
      } else {
        markWrappingUp();
        return {
          message: `⚠️ ${getAgentDisplayName(stuckAgent)} timed out. That was the last agent. Generating Day Report...`,
          action: "wrap_up",
        };
      }
    }
  }

  // Get next agent
  const nextAgent = getNextUnreportedAgent();
  if (!nextAgent) {
    markWrappingUp();
    return {
      message: "All agents reported. Generating Day Report...",
      action: "wrap_up",
    };
  }

  // Apply ACTUAL delay
  const delay = getStandupResponseDelay();
  if (delay > 0) {
    logger.info(`[STANDUP_ORCHESTRATOR] Waiting ${delay}ms before calling ${nextAgent}`);
    await sleep(delay);
  }

  const discordId = getStandupDiscordMentionId(nextAgent);
  const nextDisplay = getAgentDisplayName(nextAgent);
  const message = discordId ? `<@${discordId}> go.` : `@${nextDisplay}, go.`;
  return {
    message,
    action: "call_next",
    nextAgent,
  };
}

/**
 * Check standup health and return status
 */
export function checkStandupHealth(): {
  healthy: boolean;
  issues: string[];
  stats: ReturnType<typeof getSessionStats>;
} {
  const stats = getSessionStats();
  const issues: string[] = [];

  if (!stats.active) {
    return { healthy: true, issues: [], stats };
  }

  // Check duration
  if (stats.durationSec > MAX_STANDUP_DURATION_MS / 1000) {
    issues.push(`Standup running too long (${Math.round(stats.durationSec / 60)} min)`);
  }

  // Check for stuck agent
  const timeSinceActivity = getTimeSinceLastActivity();
  if (timeSinceActivity > SKIP_TIMEOUT_MS) {
    issues.push(`No activity for ${Math.round(timeSinceActivity / 1000)}s`);
  }

  // Check progress
  if (stats.durationSec > 300 && stats.reported.length < 2) {
    issues.push(`Slow progress: only ${stats.reported.length} agents after 5 min`);
  }

  return {
    healthy: issues.length === 0,
    issues,
    stats,
  };
}

/**
 * Format a health report for logging/display
 */
export function formatHealthReport(): string {
  const { healthy, issues, stats } = checkStandupHealth();

  if (!stats.active) {
    return "No active standup session.";
  }

  const lines = [
    `**Standup Health:** ${healthy ? "✅ Healthy" : "⚠️ Issues"}`,
    `**Duration:** ${Math.round(stats.durationSec / 60)} min`,
    `**Reported:** ${stats.reported.join(", ") || "none"}`,
    `**Remaining:** ${stats.remaining.join(", ") || "none"}`,
  ];

  if (issues.length > 0) {
    lines.push(`**Issues:** ${issues.join("; ")}`);
  }

  return lines.join("\n");
}

/**
 * Build the agent call message with proper formatting.
 * Uses Discord mention <@ID> when getStandupDiscordMentionId(agentId) is set.
 */
export function buildAgentCallMessage(agentId: string): string {
  const discordId = getStandupDiscordMentionId(agentId);
  if (discordId) return `<@${discordId}> go.`;
  const display = getAgentDisplayName(agentId);
  return `@${display}, go.`;
}

/**
 * Build the wrap-up trigger message
 */
export function buildWrapUpMessage(): string {
  return "All agents reported. Generating Day Report...";
}

/**
 * Build the skip message for a timed-out agent.
 * Uses Discord mention for next agent when configured.
 */
export function buildSkipMessage(skippedAgent: string, nextAgent: string | null): string {
  const skippedDisplay = getAgentDisplayName(skippedAgent);
  
  if (nextAgent) {
    const discordId = getStandupDiscordMentionId(nextAgent);
    const callMsg = discordId ? `<@${discordId}> go.` : `@${getAgentDisplayName(nextAgent)}, go.`;
    return `⚠️ ${skippedDisplay} timed out (3 min). Skipping. ${callMsg}`;
  } else {
    return `⚠️ ${skippedDisplay} timed out (3 min). That was the last agent. Generating Day Report...`;
  }
}
