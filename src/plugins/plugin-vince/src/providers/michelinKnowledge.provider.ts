/**
 * Michelin Knowledge Provider
 *
 * When any agent receives a message in a room whose name contains "knowledge"
 * and the message contains a guide.michelin.com URL, injects a strong instruction
 * so the LLM chooses ADD_MICHELIN_RESTAURANT instead of REPLY. Works for both
 * VINCE and Eliza so that whichever bot is in the channel can add the restaurant.
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";

/** Collect all URL-containing text from a message (link-only Discord posts often have URL in embeds, not content.text). */
function getMessageTextForMichelin(message: Memory): string {
  const content = message.content as Record<string, unknown> | undefined;
  if (!content) return "";
  const parts: string[] = [];
  if (typeof content.text === "string" && content.text.trim()) parts.push(content.text.trim());
  const attachments = content.attachments as Array<{ url?: string }> | undefined;
  if (Array.isArray(attachments)) {
    for (const a of attachments) {
      if (a?.url && typeof a.url === "string") parts.push(a.url);
    }
  }
  const embeds = content.embeds as Array<{ url?: string }> | undefined;
  if (Array.isArray(embeds)) {
    for (const e of embeds) {
      if (e?.url && typeof e.url === "string") parts.push(e.url);
    }
  }
  return parts.join(" ");
}

/** Resolve effective room/channel name for "knowledge" detection (matches addMichelin.action logic). */
async function getEffectiveRoomName(
  runtime: IAgentRuntime,
  message: Memory,
): Promise<string> {
  let roomName = "";
  try {
    const room = await runtime.getRoom(message.roomId);
    roomName = (room?.name ?? "").toLowerCase();
  } catch {
    // Room lookup can fail (e.g. per-agent rooms)
  }
  if (roomName) return roomName;
  const meta = (message.metadata ?? {}) as Record<string, unknown>;
  const fromMeta =
    (meta.channelName as string) ??
    (meta.roomName as string) ??
    (meta.channel && typeof meta.channel === "object" && (meta.channel as Record<string, unknown>).name as string);
  if (fromMeta && typeof fromMeta === "string") return fromMeta.toLowerCase();
  const channelIds = process.env.ELIZA_KNOWLEDGE_CHANNEL_IDS?.trim();
  if (channelIds && meta.channelId && channelIds.split(",").some((id) => id.trim() === String(meta.channelId))) {
    return "knowledge";
  }
  if (getMessageTextForMichelin(message).includes("guide.michelin.com")) return "knowledge";
  return "";
}

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
    const text = getMessageTextForMichelin(message);
    if (!text.includes("guide.michelin.com")) {
      return { text: "" };
    }
    const roomName = await getEffectiveRoomName(runtime, message);
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
