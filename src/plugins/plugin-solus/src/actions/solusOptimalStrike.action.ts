/**
 * SOLUS_OPTIMAL_STRIKE — When user has pasted context, give strike call: asset, OTM %, size/skip, invalidation. If no data, ask for VINCE options output.
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
import { isSolus } from "../utils/solus";

const TRIGGERS = [
  "optimal strike",
  "what strike for btc",
  "best strike this week",
  "strike for covered calls",
  "what's the optimal strike",
  "strike call",
  "which strike",
  "size or skip",
  "what's your call",
  "bull or bear this week",
  "weekly view",
  "weekly view for btc",
  "weekly view for eth",
  "weekly view for sol",
  "weekly view for hype",
];

function wantsOptimalStrike(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const solusOptimalStrikeAction: Action = {
  name: "SOLUS_OPTIMAL_STRIKE",
  similes: ["OPTIMAL_STRIKE", "STRIKE_CALL"],
  description:
    "When user has pasted context (or state has it), gives strike call: asset, OTM %, size/skip, invalidation. If no data, tells user to paste VINCE options output and ask again.",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsOptimalStrike(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SOLUS_OPTIMAL_STRIKE] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Solus, the on-chain options expert. The user wants an optimal strike call. We don't have live sentiment or funding; we can't feel where price lands by Friday without pasted data. Use current spot prices from context when present (e.g. "[Hypersurface spot USD]"). Frame the call as weekly bull/bear (next 7 days to expiry), not intraday. With only spot + mechanics, give strike/structure and invalidation; if no pasted IV/sentiment, one line: get VINCE's options output and paste here for direction. Using the context below (including any pasted VINCE options view or market data), give: (1) asset (BTC/ETH/SOL/HYPE), (2) OTM % and strike guidance, (3) size/skip/watch, (4) invalidation in one phrase. If the context has no live data (IV, funding, pasted view), say we can't feel where price lands by Friday without pasted data — say "options" to VINCE, paste his output here, and ask again. Be direct; one clear call.

Context:
${contextBlock}

User: ${userText}

Reply with strike call or one line asking for VINCE data. Reply in flowing prose; no bullet lists unless listing strike/asset/invalidation.`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      const out = "Here's the strike call—\n\n" + text.trim();
      await callback({ text: out, actions: ["SOLUS_OPTIMAL_STRIKE"] });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_OPTIMAL_STRIKE] Failed:", error);
      await callback({
        text: "We don't have a pulse on where price lands by Friday—say 'options' to VINCE, paste his output here, and I'll give you the strike call (asset, OTM %, size/skip, invalidation).",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "What's the optimal strike for BTC covered calls this week?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Need VINCE's options view — say 'options' to him and paste it here. With that I'll give you OTM %, strike, and invalidation.",
          actions: ["SOLUS_OPTIMAL_STRIKE"],
        },
      },
    ],
  ],
};
