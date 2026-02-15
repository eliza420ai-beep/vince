/**
 * NAVAL_LEARN_WHILE_YOU_SLEEP — Systems that improve without you. ML loop, agents, automation. "Earn while you sleep" meets "learn while you sleep."
 * On-topic: Self-improving paper bot, training in prod, no redeploy to improve.
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
import { ALOHA_STYLE_RULES, BRAND_VOICE, NAVAL_STRUCTURED_NOTE, NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "learn while you sleep",
  "improve without me",
  "system gets better",
  "self improving",
  "ml loop",
  "trains in prod",
  "no redeploy",
  "automation that learns",
  "compound without me",
  "set it and forget it",
  "improves while i sleep",
];

function wantsLearnWhileYouSleep(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — what they run: trading, content, ops, or side projects]

Learn-while-you-sleep lens:
- Earn while you sleep = assets that pay you when you're not there. Learn while you sleep = systems that get better when you're not tuning them.
- Stored decisions, feedback loop, retrain when ready — the machine learns from outcomes. You don't redeploy every time; the model updates.
- Benefit: your edge compounds without you grinding 24/7.

Analyze:
1. What do they do that's still "I have to be in the loop for it to improve"? (Manual tuning, one-off fixes, no feedback storage.)
2. One concrete step: what could store outcomes (trades, clicks, decisions) and feed back into the system so it learns?
3. One rule: e.g. "Every [X] we retrain" or "We don't ship a new model manually; the pipeline does when ready."

Direct. Benefit-led: what they get is compounding without constant attention.`;

export const navalLearnWhileYouSleepAction: Action = {
  name: "NAVAL_LEARN_WHILE_YOU_SLEEP",
  similes: ["LEARN_WHILE_YOU_SLEEP", "SELF_IMPROVING_SYSTEM", "ML_LOOP", "IMPROVE_WITHOUT_ME"],
  description:
    "Systems that improve without you: store outcomes, retrain when ready, no redeploy to improve. One step so the system learns while you sleep.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsLearnWhileYouSleep(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_LEARN_WHILE_YOU_SLEEP] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userContext = (message.content?.text ?? "").trim();
      const prompt = `${PROMPT_TEMPLATE}

User context:
${userContext}

${BRAND_VOICE}

${ALOHA_STYLE_RULES}

${NAVAL_STRUCTURED_NOTE}

${NO_AI_SLOP}

Answer in the requested structure. Be direct.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_LEARN_WHILE_YOU_SLEEP] Failed:", error);
      await callback({
        text: "Learn while you sleep: store every decision and outcome. Retrain when you have enough data. The system gets better without you redeploying. One rule: the pipeline updates the model when ready; you don't push by hand.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "I want my trading setup to improve without me tweaking it every week." } },
      { name: "{{agent}}", content: { text: "Right now you're the tuner. Step: store every trade — entry, exit, WHY, outcome — in a feature store. When you hit 90+ trades, run the training pipeline; new model loads without redeploy. Rule: we don't change weights manually; the improvement report does. The system learns while you sleep." } },
    ],
  ],
};
