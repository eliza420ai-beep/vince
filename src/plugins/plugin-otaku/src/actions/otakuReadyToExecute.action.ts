/**
 * OTAKU_READY_TO_EXECUTE — Go-live readiness checklist before executing Vince signal with real money.
 * PRD: One Dream Phase 4 (#21). Aggregates paper bot stats + sentiment; user confirms to execute.
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
import { VINCE_SIGNAL_CACHE_KEY } from "../providers/vinceSignal.provider";

const TIMEOUT_MS = 18_000;

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

async function askAgent(
  eliza: NonNullable<ReturnType<typeof getElizaOS>>,
  agentId: string,
  agentName: string,
  question: string,
  roomId: string,
  entityId: string,
): Promise<string> {
  const content = `[To ${agentName} — answer briefly.][From Otaku]: ${question}`;
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "otaku_ready_to_execute" },
    createdAt: Date.now(),
  };

  return new Promise<string>((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve("");
    }, TIMEOUT_MS);

    const onResponse = (resp: unknown) => {
      if (settled) return;
      const reply = extractReply(resp);
      if (reply) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(reply);
      }
    };

    eliza
      .handleMessage(agentId, userMsg, {
        onResponse,
        onComplete: () => {},
        onError: () => {},
      })
      .then(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("");
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve("");
        }
      });
  });
}

export const otakuReadyToExecuteAction: Action = {
  name: "OTAKU_READY_TO_EXECUTE",
  similes: ["READY_TO_EXECUTE", "SHOULD_I_EXECUTE", "EXECUTE_CHECKLIST"],
  description:
    "Shows go-live checklist: paper bot win rate, current sentiment, and Vince signal summary. Use when the user asks if they should execute or if it's ready to execute.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("ready to execute") ||
      text.includes("should i execute") ||
      text.includes("execute checklist") ||
      text.includes("can i execute vince")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const signal = await runtime.getCache<Record<string, unknown>>(
      VINCE_SIGNAL_CACHE_KEY,
    );
    const hasSignal =
      signal &&
      typeof signal === "object" &&
      signal.action &&
      (signal.action === "swap" || signal.action === "bridge");

    const eliza = getElizaOS(runtime);
    let vinceLine = "—";
    let echoLine = "—";

    if (eliza?.getAgents) {
      const agents = eliza.getAgents();
      const byName = new Map(
        agents.map((a) => [
          (a.character?.name ?? "").trim().toLowerCase(),
          a.agentId,
        ]),
      );
      const roomId = message.roomId;
      const entityId = message.entityId ?? runtime.agentId;

      const [vinceReply, echoReply] = await Promise.all([
        byName.get("vince")
          ? askAgent(
              eliza,
              byName.get("vince")!,
              "Vince",
              "In one short line: What's the paper bot win rate (e.g. 55%) and last 7 days P&L (e.g. +$200)?",
              roomId,
              entityId,
            )
          : Promise.resolve(""),
        byName.get("echo")
          ? askAgent(
              eliza,
              byName.get("echo")!,
              "Echo",
              "In one short line: What's CT sentiment right now (bullish/bearish/neutral) and any caution?",
              roomId,
              entityId,
            )
          : Promise.resolve(""),
      ]);

      if (vinceReply) vinceLine = vinceReply;
      if (echoReply) echoLine = echoReply;
    }

    const lines: string[] = [
      "**Ready to execute?**",
      "",
      "**Checklist:**",
      `• **Paper bot:** ${vinceLine}`,
      `• **Sentiment:** ${echoLine}`,
      hasSignal
        ? `• **Vince signal:** ${String(signal!.action)} — say "execute Vince's suggestion" then "confirm" to run.`
        : "• **Vince signal:** No swap/bridge in the loop. Ask Vince for a trade idea first.",
      "",
      "Confirm only when you're comfortable. I'll execute after you say «execute Vince's suggestion» and «confirm».",
    ];

    await callback({
      text: lines.join("\n"),
      actions: ["OTAKU_READY_TO_EXECUTE"],
    });
    return undefined;
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Ready to execute?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Ready to execute?**\n\nChecklist: paper bot, sentiment, Vince signal. Confirm to execute.",
          actions: ["OTAKU_READY_TO_EXECUTE"],
        },
      },
    ],
  ],
};
