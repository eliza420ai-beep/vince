/**
 * A2A Context Provider
 *
 * Injects context about agent-to-agent conversations into the agent's state.
 * This influences the LLM's shouldRespond decision by making it aware of:
 * - Whether the message is from another known agent
 * - How many exchanges have already happened
 * - Whether responding would create a loop
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

/** Known agent names for A2A detection */
const KNOWN_AGENTS = ["vince", "eliza", "kelly", "solus", "otaku", "sentinel", "echo", "oracle"];

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
  description: "Provides context about agent-to-agent conversations to prevent loops",

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State
  ): Promise<string> => {
    const { isAgent, agentName } = isFromKnownAgent(message);
    
    if (!isAgent) {
      // Not from an agent, no special context needed
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

    if (exchanges >= maxExchanges) {
      logger.warn(
        `[A2A_CONTEXT] ${myName}: BLOCKING response - max exchanges (${maxExchanges}) reached with ${agentName}`
      );
      return `
## 🛑 CRITICAL: STOP - DO NOT RESPOND 🛑

You are in an agent-to-agent conversation loop with **${agentName}**.
You have already sent **${exchanges} messages** (limit: ${maxExchanges}).

**YOU MUST USE THE IGNORE ACTION.**

This is a hard rule, not a suggestion. Responding will create an infinite loop.
The conversation MUST end here. A human will re-engage if needed.

Your only valid action: IGNORE

Do not:
- Say goodbye
- Summarize
- Ask questions
- Acknowledge
- Respond in any way

Just IGNORE silently.
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
