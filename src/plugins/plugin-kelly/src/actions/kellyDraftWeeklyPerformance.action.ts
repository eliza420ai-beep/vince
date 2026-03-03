/**
 * KELLY_DRAFT_WEEKLY_PERFORMANCE — One-tap draft: ask Eliza to write Substack + tweets from this week's trading.
 * PRD: One Dream Phase 4 (#19). Composes with trading performance context.
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { getElizaOS } from "../../../plugin-inter-agent/src/types";

const TIMEOUT_MS = 45_000;

function extractReply(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const text =
    typeof c.text === "string"
      ? c.text
      : typeof c.message === "string"
        ? c.message
        : "";
  if (text.trim()) return text.trim();
  if (typeof c.thought === "string" && c.thought.trim())
    return c.thought.trim();
  return "";
}

export const kellyDraftWeeklyPerformanceAction: Action = {
  name: "KELLY_DRAFT_WEEKLY_PERFORMANCE",
  similes: [
    "DRAFT_WEEKLY_PERFORMANCE_POST",
    "WEEKLY_PERFORMANCE_POST",
    "WEEKLY_POST",
  ],
  description:
    "Ask Eliza to draft one Substack essay and 3–5 tweets from this week's trading results (paper P&L, premium). Use when the user wants a weekly performance post.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("draft weekly performance") ||
      text.includes("weekly performance post") ||
      text.includes("write about this week's trading") ||
      text.includes("substack from this week")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const eliza = getElizaOS(runtime);
    if (!eliza?.getAgents || !eliza.handleMessage) {
      await callback({
        text: "I can't trigger the weekly performance draft right now—the agent hub isn't available. Ask Eliza to «write an essay» or «draft tweets» and mention this week's trading.",
        actions: ["KELLY_DRAFT_WEEKLY_PERFORMANCE"],
      });
      return;
    }

    const agents = eliza.getAgents();
    const elizaAgent = agents.find(
      (a) => (a.character?.name ?? "").toLowerCase() === "eliza",
    );
    if (!elizaAgent?.agentId) {
      await callback({
        text: "Eliza isn't available to draft the post. Try asking Eliza directly: «Write an essay about this week's trading results» with trading data in context.",
        actions: ["KELLY_DRAFT_WEEKLY_PERFORMANCE"],
      });
      return;
    }

    const roomId = message.roomId;
    const entityId = message.entityId ?? runtime.agentId;

    const prompt =
      "Using the trading performance data in your context (Vince paper bot P&L and Solus premium income this week), draft: (1) One short Substack essay (2–3 paragraphs) about this week's results—real numbers, no hypotheticals. (2) Three to five tweet-length posts (under 280 chars each) that could go on X. Lead with concrete outcomes (e.g. «We made $X in premium this week»). If you don't have numbers in context, say so and suggest the user run Weekly Scorecard first.";

    const content = `[To Eliza — you are being asked.][From Kelly]: ${prompt}`;
    const userMsg = {
      id: crypto.randomUUID(),
      entityId,
      roomId,
      content: { text: content, source: "kelly_draft_weekly_performance" },
      createdAt: Date.now(),
    };

    return new Promise<ActionResult | undefined>((resolve) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        callback({
          text: "Eliza didn't respond in time. Try asking Eliza directly: «Draft tweets about this week's trading» after running Weekly Scorecard.",
          actions: ["KELLY_DRAFT_WEEKLY_PERFORMANCE"],
        }).then(() => resolve(undefined));
      }, TIMEOUT_MS);

      const onResponse = async (resp: unknown) => {
        if (settled) return;
        const reply = extractReply(resp);
        if (reply) {
          settled = true;
          clearTimeout(timeoutId);
          await callback({
            text: `**Weekly performance draft (from Eliza)**\n\n${reply}`,
            actions: ["KELLY_DRAFT_WEEKLY_PERFORMANCE"],
          });
          resolve(undefined);
        }
      };

      eliza
        .handleMessage(elizaAgent.agentId, userMsg, {
          onResponse,
          onComplete: () => {},
          onError: () => {},
        })
        .then(async () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            await callback({
              text: "Eliza finished but didn't return a draft. Try: «Eliza, write an essay about this week's trading results» with Weekly Scorecard data in context.",
              actions: ["KELLY_DRAFT_WEEKLY_PERFORMANCE"],
            });
            resolve(undefined);
          }
        })
        .catch(async (e) => {
          logger.debug("[KELLY_DRAFT_WEEKLY_PERFORMANCE] Error:", e);
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            await callback({
              text: "Couldn't get a draft from Eliza right now. Ask Eliza directly for a weekly performance post.",
              actions: ["KELLY_DRAFT_WEEKLY_PERFORMANCE"],
            });
            resolve(undefined);
          }
        });
    });
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Draft weekly performance post" },
      },
      {
        name: "Kelly",
        content: {
          text: "**Weekly performance draft (from Eliza)**\n\n…",
          actions: ["KELLY_DRAFT_WEEKLY_PERFORMANCE"],
        },
      },
    ],
  ],
};
