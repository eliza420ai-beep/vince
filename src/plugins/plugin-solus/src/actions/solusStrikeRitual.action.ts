/**
 * SOLUS_STRIKE_RITUAL — Step-by-step Friday process: get VINCE options view, pick asset, CC vs CSP, strike width, invalidation.
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
    "Walks through the Friday strike ritual: get VINCE options view, pick asset (BTC/ETH/SOL/HYPE), choose covered calls vs secured puts, strike width, invalidation. Output: short checklist + one clear next step.",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
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
  ): Promise<void | ActionResult> => {
    logger.debug("[SOLUS_STRIKE_RITUAL] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Solus, the execution architect and on-chain options expert. The user wants the strike ritual (Friday process). The call is for the week: good strike + weekly sentiment (not 1h/1d). We don't have live sentiment—when we don't have pasted data, step 1 is: Get VINCE's options view (say "options" to VINCE); paste here so we have a pulse on where price might land by Friday. Spot prices in context (e.g. "[Hypersurface spot USD]") are current reference. Using the context below (Hypersurface mechanics and any pasted data), give a short step-by-step checklist and one clear next step. Steps: (1) Get VINCE's options view (user says "options" to VINCE); paste here for direction. (2) Pick asset: BTC, ETH, SOL, or HYPE. (3) Choose covered calls vs secured puts. (4) Strike width (OTM %, ~20–35% assignment prob for calls). (5) Invalidation (what would change your mind). Be direct; benefit-led; no jargon. End with the single next action they should take. Reply in flowing prose; no bullet lists unless listing steps.

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
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim(), actions: ["SOLUS_STRIKE_RITUAL"] });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_STRIKE_RITUAL] Failed:", error);
      await callback({
        text: "Strike ritual: (1) Say 'options' to VINCE and paste his view here. (2) Pick asset — BTC, ETH, SOL, HYPE. (3) CC or CSP. (4) Strike width and invalidation. Paste VINCE's output and I'll give you the call.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Walk me through strike ritual" } },
      {
        name: "Solus",
        content: {
          text: "Friday ritual: (1) Get VINCE's options view — say 'options' to him, paste here. (2) Pick asset. (3) CC vs CSP. (4) Strike and invalidation. Next: paste his view and I'll give you size and strike.",
          actions: ["SOLUS_STRIKE_RITUAL"],
        },
      },
    ],
  ],
};
