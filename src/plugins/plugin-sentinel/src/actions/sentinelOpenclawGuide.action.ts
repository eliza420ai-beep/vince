/**
 * SENTINEL_OPENCLAW_GUIDE — Short actionable guide: OpenClaw / knowledge research (curated X + Birdy → knowledge pipeline, no X API cost).
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
  "openclaw",
  "openclaw setup",
  "knowledge research",
  "spin up openclaw",
  "x without api",
  "x research setup",
  "knowledge pipeline",
  "clawdbot", // legacy trigger
];

function wantsGuide(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelOpenclawGuideAction: Action = {
  name: "SENTINEL_OPENCLAW_GUIDE",
  similes: ["OPENCLAW_SETUP", "KNOWLEDGE_RESEARCH_GUIDE", "CLAWDBOT_GUIDE"],
  description:
    "Returns a short actionable guide to spin up OpenClaw for knowledge research: curated X follows, Birdy, pipeline into knowledge; refs to PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH, internal-docs. Suggests one next step.",

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
    logger.debug("[SENTINEL_OPENCLAW_GUIDE] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const prompt = `You are Sentinel. The user asked about spinning up OpenClaw (formerly ClawdBot) for knowledge research. Using the context below (internal-docs, PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH, plugin-vince-progress, todo-michelin-crawlee if present), output a short actionable guide:
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
      logger.error("[SENTINEL_OPENCLAW_GUIDE] Failed:", error);
      await callback({
        text: "OpenClaw guide: dedicated X account + curated follows, Birdy → threads/URLs → knowledge pipeline (no X API). See PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md. Next step: create #vince-research and use roomNameContains: research for pushes.",
      });
      return false;
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "How do we spin up OpenClaw for knowledge research?" } },
      {
        name: "Sentinel",
        content: {
          text: "OpenClaw: dedicated X account + curated follows, Birdy → threads/URLs → VINCE knowledge pipeline (no X API cost). See PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md. Next step: create #vince-research channel, add roomNameContains: research for pushes.",
        },
      },
    ],
  ],
};
