/**
 * SENTINEL_SETTINGS_SUGGEST — Suggest best settings by domain.
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

const TRIGGERS = [
  "best settings",
  "recommended settings",
  "env for",
  "discord channels",
  "slack channels",
  "supabase for ml",
  "settings for",
];

function wantsSettings(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelSettingsSuggestAction: Action = {
  name: "SENTINEL_SETTINGS_SUGGEST",
  similes: ["BEST_SETTINGS", "RECOMMENDED_SETTINGS"],
  description:
    "Suggests settings by domain: env, channel naming, feature-store/Supabase, ONNX, Claude Code controller.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsSettings(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_SETTINGS_SUGGEST] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const prompt = `You are Sentinel. The user asked for best or recommended settings. Using the context below, suggest settings by domain: (1) Env e.g. SUPABASE_SERVICE_ROLE_KEY for ML and DISCORD/SENTINEL_DISCORD for agents. (2) Channel naming: daily, news, research, sentinel, ops. (3) Feature-store/Supabase dual-write, table vince_paper_bot_features. (4) ONNX: 90+ rows, train_models.py. (5) Claude Code: task briefs, architecture rules. Short numbered list. Refs: FEATURE-STORE.md, DEPLOY.md. No preamble.

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
      logger.error("[SENTINEL_SETTINGS_SUGGEST] Failed:", error);
      await callback({
        text: "Settings: 1) Env: SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL for ML. 2) Channels: daily, news, research, sentinel, ops. 3) Feature-store: dual-write to Supabase vince_paper_bot_features. 4) ONNX: 90+ rows then train_models.py. 5) Claude Code: paste task briefs with architecture rules. Refs: FEATURE-STORE.md, DEPLOY.md.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Best settings for Discord and Supabase?" } },
      {
        name: "Sentinel",
        content: {
          text: "Discord: channel names with daily, news, research, sentinel, ops get pushes. Supabase: SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL for feature-store dual-write. Refs: FEATURE-STORE.md, DEPLOY.md.",
        },
      },
    ],
  ],
};
