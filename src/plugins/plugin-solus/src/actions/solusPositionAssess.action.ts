/**
 * SOLUS_POSITION_ASSESS — Interpret position from message; state invalidation and hold/roll/adjust; ask for details if missing.
 * Solus has his own options data (SOLUS_OPTIONS_CONTEXT from Deribit) so he answers without leaning on VINCE.
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
  "assess my position",
  "i have $70k secured puts",
  "we bought secured puts",
  "review my hypersurface position",
  "we bought $70k secured puts",
  "my position",
  "hypersurface position",
  "secured puts on hypersurface",
  "covered call position",
  "underwater",
  "assigned",
  "being assigned",
  "get assigned",
  "our secured puts",
  "our $70k puts",
  "our $70k secured puts",
  "premium reduces cost basis",
  "cost basis",
  "our btc cost",
  "average entry",
  "entry price",
  "our btc position",
  // Strike / buyback / ITM — so SOLUS_SIZING_STATE (knowledge/private/solus-options-sizing.md) is injected
  "above our strike",
  "above strike",
  "above strike price",
  "hype is above",
  "above the strike",
  "buy back",
  "buy back early",
  "itm",
  "in the money",
  "past our strike",
  "past the strike",
  "our strike",
  "strike price",
  "wheel",
  "options position",
  // SOL / stack / "what about" — so SOLUS_SIZING_STATE is injected and we answer (avoid no-answer hang)
  "our sol",
  "what about sol",
  "sol stack",
  "sol position",
  "the sol",
];

function wantsPositionAssess(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const solusPositionAssessAction: Action = {
  name: "SOLUS_POSITION_ASSESS",
  similes: ["POSITION_ASSESS", "ASSESS_POSITION"],
  description:
    "Interprets Hypersurface position from message (notional, premium, collateral, expiry); states invalidation and hold/roll/adjust; if details missing, asks for strike/notional/premium/expiry.",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsPositionAssess(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SOLUS_POSITION_ASSESS] Action fired");
    try {
      const state = await runtime.composeState(message, [
        "SOLUS_SIZING_STATE",
        "SOLUS_MARKET_CONTEXT",
        "SOLUS_HYPERSURFACE_SPOT_PRICES",
        "SOLUS_OPTIONS_CONTEXT",
        "SOLUS_CALIBRATION_CONTEXT",
      ]);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Solus, the on-chain options expert. You have: (1) mechanics in [Hypersurface context], (2) wheel and sizing state in [Solus sizing state], (3) spot/regime in [Solus market context] and [Hypersurface spot USD], (4) when present [Solus options context — Deribit] with spot, DVOL, ATM IV, and best strikes for BTC/ETH/SOL; (5) [Solus calibration] with Brier and recent outcomes when present. Use this data to give one clear call.

**RULE — you must follow:** Do NOT say you need VINCE, need to ask anyone for IV, or need "VINCE's current SOL IV". If [Solus options context] includes SOL, use that IV and best strikes. If it does not, give your assessment and strike guidance from [Solus sizing state] and spot only (e.g. "SOL spot from context; our stack at $141 cost basis; strikes around $90–95 could collect premium — exact amount depends on current IV"). Never deflect the user to another chat or agent.

Using the context below and the user message, (1) Interpret what they have: notional, premium, collateral (e.g. USDT0), expiry, strike if mentioned, and how it lines up with the wheel plan in [Solus sizing state]. (2) State invalidation (what would change your mind). (3) Give one clear call: hold, roll, or adjust. If key details are missing, ask for them in one short line. Be direct; benefit-led. Reply in flowing prose; no bullet lists unless listing hold/roll/adjust.

Context:
${contextBlock}

User: ${userText}

Reply with assessment and one call only.`;

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
      const hasOptionsContext = contextBlock.includes("[Solus options context");
      const sourceLine = hasOptionsContext
        ? "*Source: Hypersurface mechanics, CoinGecko spot, Deribit IV/strikes*"
        : "*Source: Hypersurface mechanics, CoinGecko spot*";
      const sections = [
        `**Position Assessment** _${dateStr}_`,
        "",
        text.trim(),
        "",
        sourceLine,
        "",
        "---",
        "_Next steps_: `OPTIMAL STRIKE` (new strike) · `STRIKE RITUAL` (Friday process)",
      ];
      await callback({
        text: sections.join("\n"),
        actions: ["SOLUS_POSITION_ASSESS"],
        providers: ["SOLUS_SIZING_STATE", "SOLUS_OPTIONS_CONTEXT"],
      });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_POSITION_ASSESS] Failed:", error);
      await callback({
        text: "Paste your position details: strike, notional, premium, collateral, expiry. Then I'll give you invalidation and hold/roll/adjust.",
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
          text: "We bought $70K secured puts on Hypersurface, expiry next Friday, premium $3800, $150K USDT0. Assess.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "$70K notional CSPs, $3,800 premium (~2.5% on collateral). If spot stays above strike through Friday 08:00 UTC, you keep premium and puts expire worthless. What's your strike? With that I'll give invalidation and hold/roll/adjust.",
          actions: ["SOLUS_POSITION_ASSESS"],
        },
      },
    ],
  ],
};
