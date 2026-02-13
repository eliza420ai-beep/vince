/**
 * Honcho context provider. Injects Honcho memory (recent context and peer representation)
 * when HONCHO_API_KEY is set. Dynamic so it can be included only when needed.
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { getContextForPeer, isHonchoConfigured } from "../services/honchoClient.service";

export const honchoContextProvider: Provider = {
  name: "honchoContext",
  description: "Honcho memory: recent conversation and what we know about this user (when HONCHO_API_KEY is set).",
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<{ text?: string; values?: Record<string, unknown> }> => {
    if (!isHonchoConfigured()) return {};

    const sessionId = message.roomId ?? message.room_id ?? "";
    const peerId = message.entityId ?? message.entity_id ?? "";
    if (!sessionId || !peerId) return {};

    const context = await getContextForPeer(sessionId, peerId, { tokens: 800 });
    if (!context.trim()) return {};

    const text =
      "Honcho memory (recent context and what we know about this user):\n" + context.slice(0, 2000);
    return {
      text,
      values: { honchoContext: context },
    };
  },
};
