/**
 * SENTINEL_OPENCLAW_GUIDE — Short actionable guide: OpenClaw / knowledge research using official X API (TOS compliant).
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "openclaw",
  "openclaw setup",
  "knowledge research",
  "spin up openclaw",
  "x research setup",
  "knowledge pipeline",
  "daily research",
  "clawdbot", // legacy trigger
];

function wantsGuide(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelOpenclawGuideAction: Action = {
  name: "SENTINEL_OPENCLAW_GUIDE",
  similes: ["OPENCLAW_SETUP", "KNOWLEDGE_RESEARCH_GUIDE"],
  description:
    "Returns a short actionable guide to spin up OpenClaw for knowledge research: daily cron job using official X API (pay-as-you-go, TOS compliant), targeted searches, pipeline into knowledge/. Suggests one next step.",

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
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_OPENCLAW_GUIDE] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const prompt = `You are Sentinel. The user asked about spinning up OpenClaw for knowledge research. Reply in flowing prose where possible; avoid bullet dumps unless listing steps or config. Using ONLY the official X API (pay-as-you-go, TOS compliant), cover: set up X API (developer.x.com, Bearer Token, credits); set X_BEARER_TOKEN in env; daily cron with 5-6 targeted searches (ElizaOS, "$BTC alpha", "AI agents crypto"); x-research skill or VINCE_X_RESEARCH; save to knowledge/research-daily/. Do NOT mention Birdy, scraping, or TOS-violating methods. End with one concrete next step.

${NO_AI_SLOP}

Context:\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_OPENCLAW_GUIDE] Failed:", error);
      await callback({
        text: `**OpenClaw Knowledge Research Setup** (official X API, TOS compliant)

1. **X API setup:** developer.x.com → create app → Bearer Token → add credits (pay-as-you-go)
2. **Set token:** export X_BEARER_TOKEN="your-token"
3. **Daily cron:** 5-6 targeted searches ("ElizaOS", "$BTC alpha", "AI agents crypto")
4. **Pipeline:** x-research skill → knowledge/research-daily/

**Next step:** Get your X_BEARER_TOKEN from developer.x.com and set spending limit.`,
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "How do we spin up OpenClaw for knowledge research?" } },
      {
        name: "Sentinel",
        content: {
          text: "OpenClaw knowledge research: 1) Get X API Bearer Token from developer.x.com, 2) Set X_BEARER_TOKEN in env, 3) Create daily cron with targeted searches (5-6 queries), 4) Save to knowledge/research-daily/. Next step: set up X API app and add credits with a spending limit.",
        },
      },
    ],
  ],
};
