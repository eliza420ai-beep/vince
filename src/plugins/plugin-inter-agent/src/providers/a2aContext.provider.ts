/**
 * A2A Context Provider
 *
 * Injects context about agent-to-agent conversations into the agent's state.
 * This influences the LLM's shouldRespond decision by making it aware of:
 * - Whether the message is from another known agent
 * - How many exchanges have already happened
 * - Whether responding would create a loop
 * - Whether a HUMAN is present (highest priority!)
 *
 * Works WITH the A2A_LOOP_GUARD evaluator for defense in depth.
 */

import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
  logger,
} from "@elizaos/core";
import { isHumanMessage, buildStandupContext, getAgentRole } from "../standup/standupReports";

/** Known agent names for A2A detection */
const KNOWN_AGENTS = ["vince", "eliza", "kelly", "solus", "otaku", "sentinel", "echo", "oracle"];

/** Human names to recognize (co-founders, team members) */
const KNOWN_HUMANS = ["yves", "ikigai"];

/** Check if message is from a known human */
function isFromKnownHuman(memory: Memory): { isHuman: boolean; humanName: string | null } {
  const senderName = (
    memory.content?.name ||
    memory.content?.userName ||
    ""
  ).toLowerCase();

  for (const human of KNOWN_HUMANS) {
    if (senderName.includes(human)) {
      return { isHuman: true, humanName: human.charAt(0).toUpperCase() + human.slice(1) };
    }
  }

  // Not a known agent = probably human
  if (isHumanMessage(memory)) {
    return { isHuman: true, humanName: senderName || "Human" };
  }

  return { isHuman: false, humanName: null };
}

/** Check if a message is from a known agent */
function isFromKnownAgent(memory: Memory): { isAgent: boolean; agentName: string | null } {
  const senderName = (
    memory.content?.name ||
    memory.content?.userName ||
    ""
  ).toLowerCase();

  for (const agent of KNOWN_AGENTS) {
    if (senderName.includes(agent)) {
      return { isAgent: true, agentName: agent };
    }
  }

  // Check metadata for bot flag
  const metadata = memory.content?.metadata as Record<string, unknown> | undefined;
  if (metadata?.isBot === true || metadata?.fromBot === true) {
    return { isAgent: true, agentName: senderName || "unknown-bot" };
  }

  return { isAgent: false, agentName: null };
}

/** Count recent exchanges with a specific sender */
async function countRecentExchanges(
  runtime: IAgentRuntime,
  roomId: string,
  senderName: string,
  lookback: number
): Promise<number> {
  try {
    const memories = await runtime.getMemories({
      roomId: roomId as `${string}-${string}-${string}-${string}-${string}`,
      count: lookback,
    });

    const myName = (runtime.character?.name || "").toLowerCase();
    let myResponses = 0;

    // Count how many times I've responded in this conversation
    // Each response to the other agent counts as an exchange
    for (const mem of memories) {
      const memSender = (mem.content?.name || mem.content?.userName || "").toLowerCase();
      const isMe = memSender.includes(myName) || mem.agentId === runtime.agentId;

      if (isMe) {
        myResponses++;
      }
    }

    return myResponses;
  } catch (err) {
    logger.warn({ err }, "[A2A_CONTEXT] Failed to count exchanges");
    return 0;
  }
}

export const a2aContextProvider: Provider = {
  name: "A2A_CONTEXT",
  description: "Provides context about agent-to-agent and agent-to-human conversations in standups",

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State
  ): Promise<string> => {
    const myName = runtime.character?.name || "Agent";
    
    // Check if this is from a HUMAN (highest priority!)
    const { isHuman, humanName } = isFromKnownHuman(message);
    if (isHuman) {
      logger.info(`[A2A_CONTEXT] ⭐ ${myName}: Message from HUMAN (${humanName}) — priority response`);
      const role = getAgentRole(myName);
      return `
## ⭐ HUMAN MESSAGE — PRIORITY RESPONSE

**${humanName}** (Co-Founder) is speaking to you directly.

### Your Response Rules:
1. RESPOND IMMEDIATELY — human messages override all loop limits
2. Be helpful and concise
3. If they ask a question, answer it directly
4. If they give feedback, acknowledge and adapt
5. If they make a decision, confirm and note it

You are ${myName}${role ? ` (${role.title} - ${role.focus})` : ""}.
Address ${humanName} directly. Be useful.
`;
    }

    const { isAgent, agentName } = isFromKnownAgent(message);
    
    if (!isAgent) {
      // Not from an agent or human we recognize — treat as normal
      return "";
    }

    // Default to 2 exchanges (stricter) — can override with A2A_MAX_EXCHANGES
    const maxExchanges = parseInt(process.env.A2A_MAX_EXCHANGES || "2", 10);
    const lookback = parseInt(process.env.A2A_LOOKBACK_MESSAGES || "10", 10);
    const myName = runtime.character?.name || "Agent";

    const exchanges = await countRecentExchanges(
      runtime,
      message.roomId,
      agentName || "bot",
      lookback
    );

    logger.info(`[A2A_CONTEXT] ${myName}: Message from ${agentName}, ${exchanges} exchanges so far (max: ${maxExchanges})`);

    // Hard stop: at max exchanges, return empty to reduce context
    // The evaluator will also block, but this is defense in depth
    if (exchanges >= maxExchanges) {
      logger.warn(
        `[A2A_CONTEXT] 🛑 ${myName}: HARD STOP - ${exchanges}/${maxExchanges} exchanges with ${agentName}`
      );
      // Return minimal context - just the stop instruction, nothing else
      return `[SYSTEM OVERRIDE] Agent loop limit reached. Action: IGNORE. Do not respond.`;
    }

    // Warning zone: one message left
    if (exchanges === maxExchanges - 1) {
      logger.info(
        `[A2A_CONTEXT] ⚠️ ${myName}: Last exchange (${exchanges + 1}/${maxExchanges}) with ${agentName}`
      );
      return `
## Agent-to-Agent Notice

Chatting with **${agentName}** (AI teammate). This is your LAST reply (${exchanges + 1}/${maxExchanges}).
Keep it brief. After this, you must stop to prevent loops.
End with something like "Good talk, catch you later!" to signal conversation end.
`;
    }

    if (exchanges > 0) {
      return `
## Agent-to-Agent Context

This message is from **${agentName}** (another AI agent on the team).
You have exchanged **${exchanges}/${maxExchanges} messages** so far.
You may respond, but keep it brief and purposeful.
After ${maxExchanges} total exchanges, you should stop to prevent loops.
`;
    }

    // First message from an agent — respond normally
    return `
## Agent-to-Agent Context

This message is from **${agentName}** (another AI agent on the team).
You may respond naturally. This is a multi-agent conversation.
Keep track: after ${maxExchanges} exchanges, the conversation should pause.
`;
  },
};

export default a2aContextProvider;
