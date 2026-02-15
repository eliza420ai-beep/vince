/**
 * NAVAL_ONE_TEAM_ONE_DREAM — Clear lanes, no overlap. Data → plan → call → lifestyle → infra. Who does what without you.
 * On-topic: README "One team, one dream" — Eliza, VINCE, Solus, Otaku, Kelly, Sentinel.
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
  "one team one dream",
  "clear lanes",
  "who does what",
  "team lanes",
  "no overlap",
  "delegate to agents",
  "multi-agent",
  "dream team",
  "data then plan then call",
  "each agent has a lane",
];

function wantsOneTeamOneDream(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — how they work: solo vs team, tools, agents, or roles]

One-team-one-dream lens:
- Clear lanes = each role (or agent) has a job. Data. Plan. Call. Lifestyle. Infra. No overlap, no "everyone does everything."
- Compounding = the team gets better when each piece does its job and hands off. You're not the bottleneck.
- Benefit: one conversation, full team — you ask once, the right specialist answers.

Analyze:
1. Are they a one-person band or do they have lanes (people, tools, agents)? Where's the bottleneck?
2. One concrete lane they could assign or automate: e.g. "Intel push daily," "Plan/call once a week," "Lifestyle separate from trading."
3. One rule: "I don't do X; the [lane] does."

Direct. Benefit-led: what they get is focus and handoffs that compound.`;

export const navalOneTeamOneDreamAction: Action = {
  name: "NAVAL_ONE_TEAM_ONE_DREAM",
  similes: ["ONE_TEAM_ONE_DREAM", "CLEAR_LANES", "TEAM_LANES", "DREAM_TEAM_LANES"],
  description:
    "Clear lanes, no overlap: data → plan → call → lifestyle → infra. One lane to assign or automate so the team compounds.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsOneTeamOneDream(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_ONE_TEAM_ONE_DREAM] Action fired");
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
      logger.error("[NAVAL_ONE_TEAM_ONE_DREAM] Failed:", error);
      await callback({
        text: "One team one dream: clear lanes. Data. Plan. Call. Lifestyle. Infra. Assign one lane you're still doing yourself to a person, tool, or agent. Rule: I don't do X; the lane does.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "I'm doing intel, plan, and execution myself. How do I get to one team one dream?" } },
      { name: "{{agent}}", content: { text: "You're the bottleneck. Lane 1: intel — push daily, you just read. Lane 2: plan/call — once a week, size/skip/watch, invalidation. Lane 3: you execute or delegate execution. Rule: I don't refresh for data; the push does. One shift: automate the daily intel first." } },
    ],
  ],
};
