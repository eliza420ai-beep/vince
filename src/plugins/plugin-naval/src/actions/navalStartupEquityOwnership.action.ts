/**
 * NAVAL_STARTUP_EQUITY_OWNERSHIP — Equity vs salary, when to raise vs bootstrap, ownership mindset, "take accountability to earn equity."
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
import { ALOHA_STYLE_RULES, NAVAL_STRUCTURED_NOTE, NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "equity vs salary",
  "raise vs bootstrap",
  "naval equity",
  "startup ownership",
  "take accountability earn equity",
  "when to raise funding naval",
];

function wantsEquityOwnership(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - role (founder/early employee), stage, or "should I take more equity or more salary?"]

Naval's lens:
- "Take accountability to earn equity" — equity follows responsibility and upside
- Pick a business model with leverage (code, media scale; labor/capital have limits)
- Long-term games: does raising fit a long-term game or create bad incentives?

Analyze:
1. Are they optimizing for ownership or cash? Which aligns with their stage and goals?
2. Does raising (VC) fit a long-term game for them, or create pressure that kills it?
3. What would "take accountability to earn equity" mean in their situation?
4. One concrete recommendation (e.g. take more equity if early and you believe; bootstrap if you want control and slow build; raise only if you need leverage that cash can't buy).

Reference nav.al "Take Accountability to Earn Equity" and "Pick a Business Model With Leverage" where relevant.`;

export const navalStartupEquityOwnershipAction: Action = {
  name: "NAVAL_STARTUP_EQUITY_OWNERSHIP",
  similes: ["EQUITY_VS_SALARY", "RAISE_VS_BOOTSTRAP", "TAKE_ACCOUNTABILITY_EARN_EQUITY"],
  description:
    "Equity vs salary, when to raise vs bootstrap, ownership mindset. Take accountability to earn equity. One concrete recommendation.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsEquityOwnership(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_STARTUP_EQUITY_OWNERSHIP] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userContext = (message.content?.text ?? "").trim();
      const prompt = `${PROMPT_TEMPLATE}

User context:
${userContext}

${ALOHA_STYLE_RULES}

${NAVAL_STRUCTURED_NOTE}

${NO_AI_SLOP}

Answer in the requested structure. One concrete recommendation.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_STARTUP_EQUITY_OWNERSHIP] Failed:", error);
      await callback({
        text: "Take accountability to earn equity — ownership follows responsibility. Equity vs salary: early and you believe in the outcome, lean equity. Raise vs bootstrap: raise when you need leverage (scale, distribution) that cash can buy; bootstrap when you want control and a long-term game without investor pressure.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Equity vs salary: offer from seed startup, below-market salary but 0.5% equity. I'm 28, can afford the cut." } },
      { name: "{{agent}}", content: { text: "You're optimizing for ownership at a stage where 0.5% could matter if they win. Take accountability to earn equity means: if you're going to own the outcome (e.g. lead a critical area), push for a bit more equity or a clear path. One recommendation: take the deal if you believe in the team and product, but get clarity on vesting and what 'earn more' looks like if you deliver." } },
    ],
  ],
};
