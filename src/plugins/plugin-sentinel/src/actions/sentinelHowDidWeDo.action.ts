/**
 * SENTINEL_HOW_DID_WE_DO — Single textual report: cost vs budget, paper bot pointer, main metrics, one-line takeaway.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

const HOW_DID_WE_DO_TRIGGERS = [
  "how did we do",
  "how are we doing",
  "exec summary",
  "executive summary",
  "weekly summary",
  "status report",
];

function wantsHowDidWeDo(text: string): boolean {
  const lower = text.toLowerCase();
  return HOW_DID_WE_DO_TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelHowDidWeDoAction: Action = {
  name: "SENTINEL_HOW_DID_WE_DO",
  similes: ["SENTINEL_EXEC_SUMMARY", "HOW_DID_WE_DO"],
  description:
    "Produces a short 'How did we do?' report: cost vs budget/burn, paper bot (Leaderboard → Trading Bot), usage (Leaderboard → Usage tab), one-line takeaway.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsHowDidWeDo(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    logger.debug("[SENTINEL_HOW_DID_WE_DO] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";

      const prompt = `You are Sentinel. From the context below, write a short **How did we do?** report: (1) Cost vs budget / burn. (2) Paper bot: see Leaderboard → Trading Bot tab for PnL and trades. (3) Usage: see Leaderboard → Usage tab. (4) One-line takeaway. Do not fabricate—use TREASURY and sentinel-docs only.\n\nContext:\n${contextBlock}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text = (typeof response === "string"
        ? response
        : (response as { text?: string })?.text ?? String(response)
      ).trim();
      await callback({ text });
      return true;
    } catch (error) {
      logger.error("[SENTINEL_HOW_DID_WE_DO] Failed:", error);
      await callback({
        text: "Report couldn't be generated. Check TREASURY for cost vs budget; Leaderboard → Trading Bot for paper PnL; Leaderboard → Usage for usage. Ask for cost status for details.",
      });
      return false;
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "How did we do this week?" },
      },
      {
        name: "Sentinel",
        content: {
          text: "Cost vs budget: [from TREASURY]. Paper bot: Leaderboard → Trading Bot. Usage: Leaderboard → Usage. Takeaway: [one line].",
        },
      },
    ],
  ],
};
