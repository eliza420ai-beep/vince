/**
 * SENTINEL_OPENCLAW_GUIDE — Short actionable guide: OpenClaw / knowledge research using official X API (TOS compliant).
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
  ): Promise<boolean> => {
    logger.debug("[SENTINEL_OPENCLAW_GUIDE] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const prompt = `You are Sentinel. The user asked about spinning up OpenClaw for knowledge research. Output a short actionable guide using ONLY the official X API (pay-as-you-go, TOS compliant):

1) Set up X API: developer.x.com → create app → get Bearer Token → add credits with spending limit
2) Configure OpenClaw: set X_BEARER_TOKEN in env
3) Create daily cron job with targeted searches (5-6 queries max to control costs):
   - "ElizaOS" ecosystem news
   - "$BTC alpha -is:retweet" high-signal threads
   - "AI agents crypto" developments
4) Use x-research skill or VINCE_X_RESEARCH action
5) Save results to knowledge/research-daily/

IMPORTANT: Do NOT mention Birdy, scraping, or any TOS-violating methods. Official X API only.

One concrete next step for the user.

Keep it to a few short paragraphs or a numbered list. No preamble—just the guide.

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
        text: `**OpenClaw Knowledge Research Setup** (official X API, TOS compliant)

1. **X API setup:** developer.x.com → create app → Bearer Token → add credits (pay-as-you-go)
2. **Set token:** export X_BEARER_TOKEN="your-token"
3. **Daily cron:** 5-6 targeted searches ("ElizaOS", "$BTC alpha", "AI agents crypto")
4. **Pipeline:** x-research skill → knowledge/research-daily/

**Next step:** Get your X_BEARER_TOKEN from developer.x.com and set spending limit.`,
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
          text: "OpenClaw knowledge research: 1) Get X API Bearer Token from developer.x.com, 2) Set X_BEARER_TOKEN in env, 3) Create daily cron with targeted searches (5-6 queries), 4) Save to knowledge/research-daily/. Next step: set up X API app and add credits with a spending limit.",
        },
      },
    ],
  ],
};
