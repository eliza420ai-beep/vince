/**
 * NAVAL_AGENTS_AS_LEVERAGE — Code, media, labor, capital. Agents are leverage: they do the job without you. Who does what.
 * On-topic: Multi-agent, Eliza/VINCE/Solus/Otaku/Kelly/Sentinel — leverage through delegation and automation.
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
  "agents as leverage",
  "agents are leverage",
  "automation leverage",
  "who does what without me",
  "delegate to agents",
  "code media labor capital",
  "leverage through agents",
  "agents do the work",
  "scale without me",
  "automation that scales",
  "naval leverage agents",
];

function wantsAgentsAsLeverage(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — what they do manually vs what could be done by agents, scripts, or tools]

Agents-as-leverage lens (Naval: code, media, labor, capital):
- Leverage = something does the job without you. Agents (data, intel, execution, lifestyle) are leverage when they run without you in the loop.
- You want more output per unit of your time. That means: assign clear jobs (push intel, size/skip/watch, DeFi ops, lifestyle brief) to agents or systems. You get the summary; they do the grind.
- Benefit: you're the architect, not the executor. One conversation, full team.

Analyze:
1. What are they still doing by hand that an agent or script could do? (Checking, aggregating, reminding, drafting.)
2. One concrete shift: assign one job to an agent or automation. Name the job and the output they'd get (e.g. "Daily intel push," "Size/skip/watch once a week").
3. One rule: e.g. "I don't do [X]; the agent does. I only read the result."

Direct. Benefit-led: what they get is leverage — more output without more hours.`;

export const navalAgentsAsLeverageAction: Action = {
  name: "NAVAL_AGENTS_AS_LEVERAGE",
  similes: ["AGENTS_AS_LEVERAGE", "AGENTS_ARE_LEVERAGE", "LEVERAGE_THROUGH_AGENTS", "WHO_DOES_WHAT_WITHOUT_ME"],
  description:
    "Agents are leverage: they do the job without you. One job to assign and one rule so they get more output per unit of their time.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsAgentsAsLeverage(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_AGENTS_AS_LEVERAGE] Action fired");
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
      logger.error("[NAVAL_AGENTS_AS_LEVERAGE] Failed:", error);
      await callback({
        text: "Agents are leverage. One job: assign something you do by hand to an agent or script (intel push, size/skip/watch, brief). Rule: I don't do that job; I read the result. You get more output without more hours.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "I want to use agents as leverage but I'm not sure what to hand off." } },
      { name: "{{agent}}", content: { text: "What do you do every day that's repeatable? Daily intel, weekly plan, lifestyle digest — pick one. Shift: that job goes to an agent; you get the push or the summary. Rule: I don't check raw data; the agent does. I read the result. That's leverage." } },
    ],
  ],
};
