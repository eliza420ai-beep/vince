/**
 * SENTINEL_CLAWDBOT_GUIDE — Short actionable guide: clawdbot / knowledge research (curated X + Birdy → knowledge pipeline, no X API cost).
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

const TRIGGERS = [
  "clawdbot",
  "clawdbot setup",
  "knowledge research",
  "spin up clawdbot",
  "x without api",
  "x research",
  "knowledge pipeline",
];

function wantsGuide(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelClawdbotGuideAction: Action = {
  name: "SENTINEL_CLAWDBOT_GUIDE",
  similes: ["CLAWDBOT_SETUP", "KNOWLEDGE_RESEARCH_GUIDE"],
  description:
    "Returns a short actionable guide to spin up clawdbot for knowledge research: curated X follows, Birdy, pipeline into knowledge; refs to PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH, internal-docs. Suggests one next step.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsGuide(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    logger.debug("[SENTINEL_CLAWDBOT_GUIDE] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const prompt = `You are Sentinel. The user asked about spinning up clawdbot (or equivalent) for knowledge research. Using the context below (internal-docs, PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH, plugin-vince-progress, todo-michelin-crawlee if present), output a short actionable guide:
1) Curated X follows + Birdy → threads/URLs → VINCE knowledge pipeline (no X API cost).
2) One concrete next step (e.g. create #vince-research channel, add roomNameContains: research, or add research queue).
Keep it to a few short paragraphs or a numbered list. Refs: PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md, internal-docs. No preamble—just the guide.

Context:\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return true;
    } catch (error) {
      logger.error("[SENTINEL_CLAWDBOT_GUIDE] Failed:", error);
      await callback({
        text: "Clawdbot guide: dedicated X account + curated follows, Birdy → threads/URLs → knowledge pipeline (no X API). See PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md. Next step: create #vince-research and use roomNameContains: research for pushes.",
      });
      return false;
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "How do we spin up clawdbot for knowledge research?" } },
      {
        name: "Sentinel",
        content: {
          text: "Clawdbot: dedicated X account + curated follows, Birdy → threads/URLs → VINCE knowledge pipeline (no X API cost). See PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md. Next step: create #vince-research channel, add roomNameContains: research for pushes.",
        },
      },
    ],
  ],
};
