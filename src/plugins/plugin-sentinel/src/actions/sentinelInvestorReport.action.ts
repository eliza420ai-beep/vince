/**
 * SENTINEL_INVESTOR_REPORT — On demand or from task: structured investor update block (burn, cost, paper bot line, one-line priorities).
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

const INVESTOR_TRIGGERS = [
  "investor update",
  "investor report",
  "weekly report",
  "burn and priorities",
];

function wantsInvestorReport(text: string): boolean {
  const lower = text.toLowerCase();
  return INVESTOR_TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelInvestorReportAction: Action = {
  name: "SENTINEL_INVESTOR_REPORT",
  similes: ["SENTINEL_INVESTOR_UPDATE", "INVESTOR_REPORT"],
  description:
    "Produces a short structured investor update: burn/run rate, cost summary (tokens, LLM, Cursor, data APIs), paper bot line (See Leaderboard → Trading Bot tab), one-line priorities for the week.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsInvestorReport(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult> => {
    logger.debug("[SENTINEL_INVESTOR_REPORT] Action fired");
    try {
      const block = await generateInvestorBlock(runtime, message);
      const out = "Here's the investor snapshot—\n\n" + block;
      await callback({ text: out });
      return { success: true, text: block };
    } catch (error) {
      logger.error("[SENTINEL_INVESTOR_REPORT] Failed:", error);
      const fallback =
        "Investor update couldn't be generated. Check TREASURY and Usage tab for burn and cost; Leaderboard → Trading Bot for paper bot. Ask for cost status or how did we do for details.";
      await callback({ text: fallback });
      return {
        success: false,
        text: fallback,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Give me the investor update" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Burn: [run rate]. Cost: tokens (Usage tab), LLM, Cursor, data APIs per TREASURY. Paper bot: See Leaderboard → Trading Bot tab. Priorities: [one line].",
        },
      },
    ],
  ],
};

/** Shared with weekly task: generate the investor block text. */
export async function generateInvestorBlock(
  runtime: IAgentRuntime,
  message: Memory,
): Promise<string> {
  const state = await runtime.composeState(message);
  const contextBlock = typeof state.text === "string" ? state.text : "";
  const prompt = `You are Sentinel. From the context below, write a short **investor update** in one paragraph (4–6 sentences, flowing prose, no bullet list): burn/run rate, cost summary (tokens, LLM, Cursor, data APIs), paper bot (say "See Leaderboard → Trading Bot tab" for PnL/trades), and one-line priorities for the week. Do not fabricate—use TREASURY and sentinel-docs only.

${NO_AI_SLOP}

Context:\n${contextBlock}`;
  const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  return (
    typeof response === "string"
      ? response
      : ((response as { text?: string })?.text ?? String(response))
  ).trim();
}
