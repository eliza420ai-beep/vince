/**
 * FEEDBACK — Send user feedback to Sentinel for a PRD or Eliza task.
 *
 * When the user says e.g. "FEEDBACK: Kelly should recommend Biarritz restaurants",
 * the tested agent (e.g. Kelly) runs this action: it asks Sentinel via handleMessage
 * with a structured request. Sentinel triages (PRD vs Eliza task) and returns
 * a one-line confirmation (e.g. "PRD written to …" or "Eliza task written to …").
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
import { getElizaOS } from "../types";

const FEEDBACK_PREFIX = /FEEDBACK\s*:\s*/i;
const FEEDBACK_DELIVERABLE_REQUEST_PREFIX = "[FEEDBACK_DELIVERABLE_REQUEST]";
const SENTINEL_AGENT_NAME = "Sentinel";
const IN_PROCESS_TIMEOUT_MS = 95_000;

function wantsFeedback(text: string): boolean {
  return FEEDBACK_PREFIX.test(text);
}

function extractFeedbackText(text: string): string {
  const match = text.match(FEEDBACK_PREFIX);
  if (!match) return text.trim();
  return text.slice(match.index! + match[0].length).trim();
}

function buildStructuredRequest(agentTested: string, feedback: string, context?: string): string {
  let body = `${FEEDBACK_DELIVERABLE_REQUEST_PREFIX}\nagentTested: ${agentTested}\nfeedback: ${feedback}`;
  if (context && context.length > 0) {
    body += `\ncontext: ${context.slice(0, 1500)}`;
  }
  return body;
}

export const feedbackAction: Action = {
  name: "FEEDBACK",
  similes: ["FEEDBACK_TO_IMPROVEMENT", "SEND_FEEDBACK_TO_SENTINEL"],
  description:
    "Sends user feedback to Sentinel to produce a PRD (code/behavior fix) or Eliza task (knowledge gap). Use when the user says FEEDBACK: ... to improve an agent's behavior.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").trim();
    return wantsFeedback(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | void> => {
    const fromName = runtime.character?.name ?? "I";
    const userText = (message.content?.text ?? "").trim();
    const feedbackText = extractFeedbackText(userText);
    if (!feedbackText) {
      await callback({
        text: "I didn't catch the feedback. Try: FEEDBACK: <what should change>",
        actions: ["FEEDBACK"],
      });
      return { success: false };
    }

    const eliza = getElizaOS(runtime);
    if (!eliza?.getAgentByName || !eliza?.handleMessage) {
      await callback({
        text: "I can't reach Sentinel right now (in-process registry not available). Try again or paste your feedback in a channel where Sentinel is present.",
        actions: ["FEEDBACK"],
      });
      return { success: false };
    }

    const sentinel = eliza.getAgentByName(SENTINEL_AGENT_NAME);
    const sentinelId = sentinel?.agentId ?? (sentinel as { id?: string })?.id;
    if (!sentinelId) {
      await callback({
        text: "Sentinel isn't available. Make sure the project is running with all agents (including Sentinel) so I can route your feedback.",
        actions: ["FEEDBACK"],
      });
      return { success: false };
    }

    let context: string | undefined;
    try {
      const recent = await runtime.getMemories({
        roomId: message.roomId,
        count: 5,
        tableName: "messages",
      });
      if (recent.length > 0) {
        context = recent
          .slice(0, 3)
          .map(
            (m) =>
              `${(m.content?.text ?? "").slice(0, 300)}`,
          )
          .filter(Boolean)
          .join("\n---\n");
      }
    } catch {
      // optional context
    }

    const structuredRequest = buildStructuredRequest(fromName, feedbackText, context);
    const userMsg = {
      id: (message as { id?: string }).id ?? crypto.randomUUID(),
      entityId: message.entityId,
      roomId: message.roomId,
      content: {
        text: structuredRequest,
        source: message.content?.source ?? "ask_agent",
      },
      createdAt: message.createdAt ?? Date.now(),
    };

    let reply: string | null = null;
    try {
      reply = await new Promise<string | null>((resolve) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve(null);
        }, IN_PROCESS_TIMEOUT_MS);
        const opts = {
          onResponse: (resp: unknown) => {
            const c = resp as { text?: string; message?: string };
            const t = (c?.text ?? c?.message ?? "").trim();
            if (t.length > 0 && !settled) {
              settled = true;
              clearTimeout(timeoutId);
              resolve(t);
            }
          },
          onComplete: () => {},
          onError: () => {
            if (!settled) {
              settled = true;
              clearTimeout(timeoutId);
              resolve(null);
            }
          },
        };
        eliza.handleMessage(sentinelId, userMsg, opts).catch(() => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            resolve(null);
          }
        });
      });
    } catch (err) {
      logger.debug("[FEEDBACK] handleMessage error:", String(err));
    }

    if (reply) {
      await callback({
        text: `**Sentinel:** ${reply}`,
        actions: ["FEEDBACK"],
      });
      return { success: true };
    }

    await callback({
      text: "Sentinel didn't respond in time. Your feedback wasn't delivered. Try again or message Sentinel directly.",
      actions: ["FEEDBACK"],
    });
    return { success: false };
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "FEEDBACK: Kelly should recommend Biarritz restaurants when I ask for Biarritz" },
      },
      {
        name: "Kelly",
        content: {
          text: "**Sentinel:** Eliza task written to `docs/standup/eliza-tasks/2026-02-18-eliza-task-kelly-biarritz.md`.",
          actions: ["FEEDBACK"],
        },
      },
    ],
  ],
};
