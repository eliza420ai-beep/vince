/**
 * SOLUS_POSITION_ASSESS — Interpret position from message; state invalidation and hold/roll/adjust; ask for details if missing.
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
      ]);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Solus, the on-chain options expert. The user is asking you to assess their Hypersurface position. You have: (1) mechanics in [Hypersurface context], (2) wheel and sizing state in [Solus sizing state], and (3) spot/regime/vol context in [Solus market context] plus any pasted VINCE view.

We do not have live sentiment beyond what Vince gives us; if they need direction (where price lands by Friday), they paste VINCE's view or bring their own. Use spot prices and regime from context when present (e.g. "[Hypersurface spot USD]" or [Solus market context]) for level reference. Frame hold/roll/adjust in terms of weekly outcome (expiry Friday).

Using the context below and the user message, (1) Interpret what they have: notional, premium, collateral (e.g. USDT0), expiry, strike if mentioned, and how it lines up with the wheel plan in [Solus sizing state] (oversized, under-earning vs weekly premium target, underwater vs entry). (2) State invalidation (what would change your mind). (3) Give one clear call: hold, roll, or adjust. If key details are missing (strike, notional, premium, expiry) or the sizing doc looks stale for this asset, ask for them in one short line. Be direct; benefit-led. Reply in flowing prose; no bullet lists unless listing hold/roll/adjust.

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
      const sections = [
        `**Position Assessment** _${dateStr}_`,
        "",
        text.trim(),
        "",
        "*Source: Hypersurface mechanics, CoinGecko spot*",
        "",
        "---",
        "_Next steps_: `OPTIMAL STRIKE` (new strike) · `STRIKE RITUAL` (Friday process) · `OPTIONS` → VINCE (IV data)",
      ];
      await callback({
        text: sections.join("\n"),
        actions: ["SOLUS_POSITION_ASSESS"],
        providers: ["SOLUS_SIZING_STATE"],
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
