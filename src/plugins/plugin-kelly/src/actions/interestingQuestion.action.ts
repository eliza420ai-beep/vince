/**
 * KELLY_INTERESTING_QUESTION — ask a thought-provoking question to deepen
 * the conversation. Uses lifestyle/interesting-questions knowledge.
 *
 * Triggered when the user says "ask me something", "interesting question",
 * "what should we talk about", or Kelly wants to deepen a conversation.
 * Picks one or two questions that fit the moment.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { getVoiceAvoidPromptFragment } from "../constants/voice";

const QUESTION_TRIGGERS = [
  "ask me something",
  "ask me a question",
  "interesting question",
  "what should we talk about",
  "deep question",
  "thought provoking",
  "make me think",
  "surprise me",
  "tell me something interesting",
  "conversation starter",
];

function wantsQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return QUESTION_TRIGGERS.some((t) => lower.includes(t));
}

export const kellyInterestingQuestionAction: Action = {
  name: "KELLY_INTERESTING_QUESTION",
  similes: [
    "ASK_ME_SOMETHING",
    "INTERESTING_QUESTION",
    "DEEP_QUESTION",
    "CONVERSATION_STARTER",
  ],
  description:
    "Ask a thought-provoking question to deepen the conversation. Picks one or two questions from lifestyle/interesting-questions that fit the moment.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsQuestion(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_INTERESTING_QUESTION] Action fired");
    try {
      const userAsk = (message.content?.text ?? "").trim();
      const state = await runtime.composeState(message);

      const contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      const knowledgeSnippet = contextBlock.slice(0, 8000);

      // Get recent conversation for context-fitting
      let recentContext = "";
      if (message.roomId) {
        try {
          const recent = await runtime.getMemories({
            tableName: "messages",
            roomId: message.roomId,
            count: 5,
            unique: false,
          });
          recentContext = recent
            .map((m) => m.content?.text ?? "")
            .filter(Boolean)
            .join(" ")
            .slice(0, 500);
        } catch {
          // ignore
        }
      }

      const prompt = `You are Kelly, a concierge and thoughtful conversationalist. The user wants you to ask them something interesting.

"${userAsk}"

${recentContext ? `Recent conversation context: ${recentContext}\n` : ""}
Use the following question list (lifestyle/interesting-questions) to pick ONE question that fits the moment — their interests, mood, or what you've been talking about. Do not list multiple questions. Ask it in your own voice, naturally, as if you're genuinely curious.

<context>
${knowledgeSnippet}
</context>

Rules:
- Pick ONE question that fits right now. If you've been talking about surf, ask about the ocean. If creative work, ask about that. If nothing specific, pick something that opens up.
- Ask it naturally — not "Here's a question:" but just ask. Like a friend at dinner.
- After the question, add one short sentence of why you're asking or what made you think of it.
- Do NOT list the whole set. One question, your voice.
- No filler, no "Great question!" — just ask.

Output only the question and your one-line reason. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      const out = text || "What's the one thing you'd do differently if you could start over tomorrow — not career, not money, just how you spend a Tuesday?";
      await callback({
        text: out,
        actions: ["KELLY_INTERESTING_QUESTION"],
      });

      logger.info("[KELLY_INTERESTING_QUESTION] Question sent");
    } catch (error) {
      logger.error(`[KELLY_INTERESTING_QUESTION] Error: ${error}`);
      await callback({
        text: "If you could live anywhere for a month — not vacation, actually live there — where would it be and why?",
        actions: ["KELLY_INTERESTING_QUESTION"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Ask me something interesting" } },
      {
        name: "{{agent}}",
        content: {
          text: "What's the last thing you made with your hands that you were genuinely proud of? I ask because the creative stuff — painting, music, the camera — it seems like that's where you come alive.",
          actions: ["KELLY_INTERESTING_QUESTION"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "What should we talk about?" } },
      {
        name: "{{agent}}",
        content: {
          text: "If you had to pick one wine region to live in for a year — not visit, live — which one? I'm curious whether it's the wine or the life around it that pulls you.",
          actions: ["KELLY_INTERESTING_QUESTION"],
        },
      },
    ],
  ],
};
