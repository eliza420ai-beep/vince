/**
 * SOLUS_STRIKE_RITUAL — Step-by-step Friday process: use options context (Deribit), pick asset, CC vs CSP, strike width, invalidation.
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
  "strike ritual",
  "friday ritual",
  "walk me through strike",
  "how do i run strike ritual",
  "run strike ritual",
  "strike ritual for friday",
];

function wantsStrikeRitual(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const solusStrikeRitualAction: Action = {
  name: "SOLUS_STRIKE_RITUAL",
  similes: ["STRIKE_RITUAL", "FRIDAY_RITUAL"],
  description:
    "Walks through the Friday strike ritual: use [Solus options context] (spot, IV, best strikes from Deribit), pick asset (BTC/ETH/SOL/HYPE), choose covered calls vs secured puts, strike width, invalidation. Output: short checklist + one clear next step.",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsStrikeRitual(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.debug("[SOLUS_STRIKE_RITUAL] Action fired");
    try {
      const state = await runtime.composeState(
        message,
        [
          "SOLUS_HYPERSURFACE_CONTEXT",
          "SOLUS_SIZING_STATE",
          "SOLUS_MARKET_CONTEXT",
          "SOLUS_HYPERSURFACE_SPOT_PRICES",
          "SOLUS_OPTIONS_CONTEXT",
          "SOLUS_CALIBRATION_CONTEXT",
          "VINCE_STRIKE_SUGGESTION",
        ],
        true,
      );
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Solus, the execution architect and on-chain options expert. The user wants the strike ritual (Friday process). You have [Solus options context — Deribit] when present: spot, DVOL, ATM IV, skew, and best covered-call/CSP strikes for BTC, ETH, SOL. Use it together with [Hypersurface spot USD] and [Solus sizing state]. When [Solus calibration] is present, use it to temper confidence or note past accuracy. Never tell the user to go ask VINCE or paste someone else's output — you have the options data.
If the context states we hold BTC (or another asset) and are in covered-call mode, do not ask to choose CC vs CSP; we are already selling covered calls. Go to: pick strike width and invalidation for this week's covered call.
Using the context below (Hypersurface mechanics, [Solus options context — Deribit], sizing state), give a short step-by-step checklist and one clear next step. Steps: (1) Use options context (spot, IV, best strikes) already in context. (2) Pick asset: BTC, ETH, SOL, or HYPE. (3) Choose covered calls vs secured puts — unless we are in covered-call mode, then skip to strike. (4) Strike width (OTM %, ~20–35% assignment prob for calls). (5) Invalidation (what would change your mind). Be direct; benefit-led; no jargon. End with the single next action they should take. Reply in flowing prose; no bullet lists unless listing steps.

Context:
${contextBlock}

User: ${userText}

Reply with the checklist and one next step only.`;

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
        `**Strike Ritual** _${dateStr}_`,
        "",
        text.trim(),
        "",
        "*Source: Hypersurface mechanics, Deribit options context*",
        "",
        "---",
        "_Next steps_: `OPTIMAL STRIKE` (strike call) · `POSITION ASSESS` (review position) · `ANALYZE <ticker>` (stock deep dive)",
      ];
      await callback({
        text: sections.join("\n"),
        actions: ["SOLUS_STRIKE_RITUAL"],
      });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_STRIKE_RITUAL] Failed:", error);
      await callback({
        text: "Strike ritual: (1) Use options context in state (spot, IV, best strikes). (2) Pick asset — BTC, ETH, SOL, HYPE. (3) CC or CSP. (4) Strike width and invalidation. I'll give you the checklist and next step.",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Walk me through strike ritual" } },
      {
        name: "{{agent}}",
        content: {
          text: "Friday ritual: (1) Use options context (spot, IV, best strikes). (2) Pick asset. (3) CC vs CSP. (4) Strike and invalidation. Next: I'll give you size and strike from sizing state and Deribit data.",
          actions: ["SOLUS_STRIKE_RITUAL"],
        },
      },
    ],
  ],
};
