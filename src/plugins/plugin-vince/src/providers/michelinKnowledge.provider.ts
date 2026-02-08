/**
 * Michelin Knowledge Provider
 *
 * When Eliza receives a message in a room whose name contains "knowledge" and
 * the message contains a guide.michelin.com URL, injects a strong instruction
 * so the LLM chooses ADD_MICHELIN_RESTAURANT instead of REPLY. Without this,
 * the model often replies conversationally and never runs the action.
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";

export const michelinKnowledgeProvider: Provider = {
  name: "MICHELIN_KNOWLEDGE",
  description:
    "When the user posts a Michelin Guide restaurant link in the knowledge channel, instruct the agent to use ADD_MICHELIN_RESTAURANT only.",
  position: -15, // Run early so the instruction is in context before action selection

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
  ): Promise<{ text: string; values?: Record<string, unknown>; data?: Record<string, unknown> }> => {
    if (runtime.character?.name !== "Eliza") {
      return { text: "" };
    }
    const text = message.content?.text ?? "";
    if (!text.includes("guide.michelin.com")) {
      return { text: "" };
    }
    let roomName = "";
    try {
      const room = await runtime.getRoom(message.roomId);
      roomName = (room?.name ?? "").toLowerCase();
    } catch {
      // Room lookup can fail (e.g. DB retry, room per-agent). Assume knowledge channel so we still instruct.
      roomName = "knowledge";
    }
    if (!roomName.includes("knowledge")) {
      return { text: "" };
    }

    return {
      text: [
        "",
        "---",
        "## CRITICAL: Michelin Guide link in knowledge channel",
        "The user has posted a **Michelin Guide restaurant link** (guide.michelin.com) in the knowledge channel.",
        "You **MUST** respond with action **ADD_MICHELIN_RESTAURANT** only. Do **NOT** use REPLY or any other action.",
        "Output: <actions>ADD_MICHELIN_RESTAURANT</actions>",
        "---",
        "",
      ].join("\n"),
      values: { michelin_link_in_knowledge: true },
      data: { forceAction: "ADD_MICHELIN_RESTAURANT" },
    };
  },
};

export default michelinKnowledgeProvider;
