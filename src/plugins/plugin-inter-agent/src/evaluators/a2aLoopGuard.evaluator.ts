/**
 * A2A Loop Guard Evaluator
 *
 * Prevents infinite loops when agents chat with each other in Discord.
 * Allows symmetric A2A (both agents can respond to bots) with safeguards:
 *
 * 1. Max exchanges per conversation — stops after N back-and-forth messages
 * 2. Cooldown — won't respond if already replied to this bot recently
 * 3. Reply chain detection — won't respond to a reply to own message (ping-pong)
 *
 * Configure via env:
 * - A2A_MAX_EXCHANGES: Max responses to same bot in recent history (default: 3)
 * - A2A_LOOKBACK_MESSAGES: How many messages to look back (default: 10)
 * - A2A_ENABLED: Set to "false" to disable this guard (default: true)
 */

import {
  type IAgentRuntime,
  type Memory,
  type Evaluator,
  logger,
} from "@elizaos/core";

/** Known agent names for A2A detection */
const KNOWN_AGENTS = ["vince", "eliza", "kelly", "solus", "otaku", "sentinel", "echo", "oracle"];

/** Check if a message is from a known agent (case-insensitive) */
function isFromKnownAgent(memory: Memory): boolean {
  const senderName = (
    memory.content?.name ||
    memory.content?.userName ||
    (memory.content?.source as string) ||
    ""
  ).toLowerCase();

  // Check if sender name matches a known agent
  if (KNOWN_AGENTS.some((agent) => senderName.includes(agent))) {
    return true;
  }

  // Check metadata for bot flag (Discord sets this)
  const metadata = memory.content?.metadata as Record<string, unknown> | undefined;
  if (metadata?.isBot === true || metadata?.fromBot === true) {
    return true;
  }

  return false;
}

/** Check if this message is a reply to our own message */
function isReplyToSelf(memory: Memory, agentId: string): boolean {
  const metadata = memory.content?.metadata as Record<string, unknown> | undefined;
  const replyTo = metadata?.replyTo as Record<string, unknown> | undefined;

  if (!replyTo) return false;

  // Check if the replied-to message was from us
  const replyAuthorId = replyTo.authorId as string | undefined;
  const replyIsBot = replyTo.isBot as boolean | undefined;

  // If replying to a bot message with our agent ID, it's a reply to self
  if (replyAuthorId === agentId) return true;
  if (replyIsBot && replyTo.authorName) {
    const replyAuthorName = (replyTo.authorName as string).toLowerCase();
    // This is a heuristic — if the reply is to a bot with a name matching ours
    const agentName = agentId.slice(0, 8).toLowerCase(); // Rough match
    if (replyAuthorName.includes(agentName)) return true;
  }

  return false;
}

/** Count how many times we've responded to this sender recently */
function countRecentResponsesToSender(
  recentMessages: Memory[],
  agentId: string,
  senderEntityId: string,
  lookback: number
): number {
  let count = 0;
  const relevantMessages = recentMessages.slice(-lookback);

  for (let i = 0; i < relevantMessages.length; i++) {
    const msg = relevantMessages[i];
    const isOurMessage = msg.agentId === agentId || msg.entityId === agentId;
    
    if (isOurMessage) {
      // Check if the previous message was from the sender we're tracking
      const prevMsg = relevantMessages[i - 1];
      if (prevMsg && (prevMsg.entityId === senderEntityId || prevMsg.agentId === senderEntityId)) {
        count++;
      }
    }
  }

  return count;
}

export const a2aLoopGuardEvaluator: Evaluator = {
  name: "A2A_LOOP_GUARD",
  description:
    "Prevents infinite loops in agent-to-agent Discord conversations by limiting exchanges",
  similes: ["loop guard", "a2a guard", "bot loop prevention"],
  alwaysRun: true,

  validate: async (runtime: IAgentRuntime, memory: Memory): Promise<boolean> => {
    // Only run for messages from other agents/bots
    return isFromKnownAgent(memory);
  },

  handler: async (
    runtime: IAgentRuntime,
    memory: Memory
  ): Promise<{ shouldRespond: boolean; reason: string }> => {
    const enabled = process.env.A2A_ENABLED !== "false";
    if (!enabled) {
      return { shouldRespond: true, reason: "A2A guard disabled" };
    }

    const maxExchanges = parseInt(process.env.A2A_MAX_EXCHANGES || "3", 10);
    const lookback = parseInt(process.env.A2A_LOOKBACK_MESSAGES || "10", 10);
    const agentId = runtime.agentId;
    const agentName = runtime.character?.name || "Agent";

    // Check 1: Is this a reply to our own message? (ping-pong prevention)
    if (isReplyToSelf(memory, agentId)) {
      logger.info(
        `[A2A_LOOP_GUARD] ${agentName}: Skipping reply to own message (ping-pong prevention)`
      );
      return {
        shouldRespond: false,
        reason: "Message is a reply to own previous message",
      };
    }

    // Check 2: Have we already responded too many times to this sender?
    try {
      const recentMessages = await runtime.getMemories({
        roomId: memory.roomId,
        count: lookback,
      });

      const senderEntityId = memory.entityId || memory.agentId || "";
      const responseCount = countRecentResponsesToSender(
        recentMessages,
        agentId,
        senderEntityId,
        lookback
      );

      if (responseCount >= maxExchanges) {
        logger.info(
          `[A2A_LOOP_GUARD] ${agentName}: Max exchanges (${maxExchanges}) reached with sender, stopping`
        );
        return {
          shouldRespond: false,
          reason: `Already responded ${responseCount} times to this agent (max: ${maxExchanges})`,
        };
      }

      logger.debug(
        `[A2A_LOOP_GUARD] ${agentName}: ${responseCount}/${maxExchanges} exchanges with sender, allowing response`
      );
    } catch (err) {
      logger.warn({ err }, "[A2A_LOOP_GUARD] Failed to check message history");
    }

    return { shouldRespond: true, reason: "A2A exchange allowed" };
  },
};

export default a2aLoopGuardEvaluator;
