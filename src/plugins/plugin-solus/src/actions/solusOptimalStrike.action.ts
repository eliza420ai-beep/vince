/**
 * SOLUS_OPTIMAL_STRIKE — Give strike call from options context (Deribit): asset, OTM %, size/skip, invalidation. Solus is the options expert; uses [Solus options context] and sizing state.
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
  "what strike for sol",
  "what strike for hype",
  "good strike for btc",
  "good strike for sol",
  "good strike for hype",
  "good strike for",
  "best strike this week",
  "strike for covered calls",
  "what's the optimal strike",
  "strike call",
  "which strike",
  "size or skip",
  "size, skip",
  "size skip watch",
  "what's your call",
  "bull or bear this week",
  "weekly view",
  "weekly view for btc",
  "weekly view for eth",
  "weekly view for sol",
  "weekly view for hype",
  "full $100k plan",
  "100k plan",
];

function wantsOptimalStrike(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const solusOptimalStrikeAction: Action = {
  name: "SOLUS_OPTIMAL_STRIKE",
  similes: ["OPTIMAL_STRIKE", "STRIKE_CALL"],
  description:
    "Gives strike call from [Solus options context] (Deribit) and sizing state: asset, OTM %, size/skip, invalidation. Solus is the options expert; answers from his own data.",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
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
      const state = await runtime.composeState(
        message,
        [
          "SOLUS_SIZING_STATE",
          "SOLUS_MARKET_CONTEXT",
          "SOLUS_HYPERSURFACE_SPOT_PRICES",
          "SOLUS_OPTIONS_CONTEXT",
          "VINCE_STRIKE_SUGGESTION",
        ],
        true,
      );
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Solus, the on-chain options expert. The user wants an optimal strike call. You have: (1) [Solus sizing state] (weekly premium targets, assigned wheels, spot stacks), (2) [Solus market context] (spot, 24h move, regime), (3) [Solus options context — Deribit] (spot, DVOL, ATM IV, skew, best CC/CSP strikes for BTC/ETH/SOL). Use this data to give one clear call. Never tell the user to go ask VINCE or paste someone else's output — you have the options data.

Use current spot from [Hypersurface spot USD] or [Solus market context]. Frame the call as weekly (next 7 days to expiry). If [Solus sizing state] states we hold the asset (covered calls) or have a CSP wheel, anchor size/skip/watch and strike to that plan. When [Solus options context] is present, use IV and best strikes; when missing, give strike/structure and invalidation from sizing + spot and note you could refine with live IV.

Using the context below, give: (1) asset (BTC/ETH/SOL/HYPE), (2) OTM % and strike guidance, (3) size/skip/watch, (4) invalidation in one phrase. Be direct; one clear call.

Context:
${contextBlock}

User: ${userText}

Reply with strike call only. Reply in flowing prose; no bullet lists unless listing strike/asset/invalidation.`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      const sections = [
        `**Strike Call** _${dateStr}_`,
        "",
        text.trim(),
        "",
        "*Source: Hypersurface mechanics, CoinGecko spot, Deribit options context*",
        "",
        "---",
        "_Next steps_: `STRIKE RITUAL` (full process) · `POSITION ASSESS` (review position)",
      ];
      await callback({
        text: sections.join("\n"),
        actions: ["SOLUS_OPTIMAL_STRIKE"],
      });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_OPTIMAL_STRIKE] Failed:", error);
      await callback({
        text: "Give me a moment — I'll pull spot and options context and give you the strike call (asset, OTM %, size/skip, invalidation).",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: "What's the optimal strike for BTC covered calls this week?",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "From sizing state and Deribit: OTM %, strike, and invalidation for this week.",
          actions: ["SOLUS_OPTIMAL_STRIKE"],
        },
      },
    ],
  ],
};
