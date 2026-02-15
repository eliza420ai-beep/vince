/**
 * NAVAL_PUSH_NOT_PULL — Proactive beats reactive. Get fed what you need; stop checking. Stay in the game without 12h on screens.
 * On-topic: VINCE = push not pull; ALOHA, daily report, you never have to chat.
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
  "push not pull",
  "push vs pull",
  "proactive agent",
  "stop checking",
  "get fed",
  "don't want to chat",
  "stay in the game",
  "less screen time",
  "12 hours on screens",
  "reactive vs proactive",
  "ping me",
];

function wantsPushNotPull(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — how they get info, check markets, or stay on top of work]

Push-not-pull lens:
- Proactive = the system sends you what you need when it matters. You don't hunt; you're fed.
- Pull = you open 20 tabs, refresh, ask "what's happening?" — reactive, time-consuming.
- Goal: stay in the game without living on screens. One command or one digest; the rest is life.

Analyze:
1. Where are they still "pulling" (checking, refreshing, asking) when a push would work?
2. One concrete shift: what could be pushed to them (daily digest, alert, one command) so they stop pulling?
3. One rule: e.g. "I only open the terminal when I'm pinged" or "One ALOHA in the morning, then close the tab."

Direct. Benefit-led: what they get is time and focus back.`;

export const navalPushNotPullAction: Action = {
  name: "NAVAL_PUSH_NOT_PULL",
  similes: ["PUSH_NOT_PULL", "PROACTIVE_NOT_PULL", "GET_FED_NOT_CHECK", "PING_ME_NOT_CHAT"],
  description:
    "Proactive beats reactive: get fed what you need, stop checking. One shift so they stay in the game without 12h on screens.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsPushNotPull(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_PUSH_NOT_PULL] Action fired");
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
      logger.error("[NAVAL_PUSH_NOT_PULL] Failed:", error);
      await callback({
        text: "Push not pull: have the system send you what you need — one digest, one command — so you're not the one refreshing. One rule: only open the app when you're pinged.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "I'm always checking charts and Discord. How do I get push not pull?" } },
      { name: "{{agent}}", content: { text: "You're pulling. Shift: one daily push — vibe, perps, options, 'trade today?' — at a fixed time. You open once, read, close. Rule: no chart refresh until the push lands. Your edge isn't reaction speed; it's not burning out." } },
    ],
  ],
};
