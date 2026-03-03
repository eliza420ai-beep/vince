/**
 * KELLY_100K_PACE — $100K/year pace at a glance. PRD: One Dream Phase 4 (#16).
 * Asks Vince (paper P&L) and Solus (premium) for this week; computes target $1,923/wk and on-track yes/no.
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

const TARGET_WEEKLY_USD = 1_923; // $100K / 52
const CACHE_KEY = "kelly:100k_pace";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 min
const TIMEOUT_MS = 20_000;

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
  const content = `[To ${agentName} — answer with numbers only when possible.][From Kelly]: ${question}`;
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "kelly_100k_pace" },
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

/** Naive parse: look for a number like 1234.56 or -100 (dollars). */
function parseDollarsFromText(text: string): number | null {
  const match =
    text
      .replace(/,/g, "")
      .match(/(?:^|[^\d.])(-?\d+\.?\d*)\s*(?:USD|\$|dollars?)/i) ??
    text.replace(/,/g, "").match(/(-?\d+\.?\d*)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

export const kelly100kPaceAction: Action = {
  name: "KELLY_100K_PACE",
  similes: ["100K_PACE", "ON_TRACK", "ARE_WE_ON_TRACK", "PACE_TO_100K"],
  description:
    "Are we on track for $100K/year? Target $1,923/wk. Shows this week's paper P&L + premium and on-track yes/no.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("100k pace") ||
      text.includes("$100k pace") ||
      text.includes("on track") ||
      text.includes("are we on track") ||
      text.includes("pace to 100k")
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
        text: "I can't check the $100K pace right now—the agent hub isn't available. Try «Weekly Scorecard» or ask Vince and Solus directly.",
        actions: ["KELLY_100K_PACE"],
      });
      return;
    }

    const cached = await runtime.getCache<{ text: string; ts: number }>(
      CACHE_KEY,
    );
    if (cached?.text && Date.now() - cached.ts < CACHE_TTL_MS) {
      await callback({
        text: cached.text,
        actions: ["KELLY_100K_PACE"],
      });
      return;
    }

    const agents = eliza.getAgents();
    const byName = new Map(
      agents.map((a) => [
        (a.character?.name ?? "").trim().toLowerCase(),
        a.agentId,
      ]),
    );
    const roomId = message.roomId;
    const entityId = message.entityId ?? runtime.agentId;

    const [vinceReply, solusReply] = await Promise.all([
      byName.get("vince")
        ? askAgent(
            eliza,
            byName.get("vince")!,
            "Vince",
            "This week only: What is the paper bot realized P&L in dollars? Reply with one number, e.g. +420 or -100.",
            roomId,
            entityId,
          )
        : Promise.resolve(""),
      byName.get("solus")
        ? askAgent(
            eliza,
            byName.get("solus")!,
            "Solus",
            "This week only: What is the premium income collected in dollars? Reply with one number, e.g. 500 or 0.",
            roomId,
            entityId,
          )
        : Promise.resolve(""),
    ]);

    const paperPnl = parseDollarsFromText(vinceReply) ?? 0;
    const premium = parseDollarsFromText(solusReply) ?? 0;
    const thisWeek = paperPnl + premium;
    const onTrack = thisWeek >= TARGET_WEEKLY_USD;
    const shortfall = Math.max(0, TARGET_WEEKLY_USD - thisWeek);

    const weekLabel = (() => {
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return monday.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    })();

    const lines: string[] = [
      `**$100K pace — week of ${weekLabel}**`,
      "",
      `Target: **$${TARGET_WEEKLY_USD.toLocaleString()}/wk**`,
      `This week: **$${thisWeek.toFixed(0)}** (paper $${paperPnl.toFixed(0)} + premium $${premium.toFixed(0)})`,
      "",
      onTrack
        ? "**On track** — keep it up."
        : `**Behind** — $${shortfall.toFixed(0)} short of this week's target.`,
    ];

    const text = lines.join("\n");
    await runtime.setCache(CACHE_KEY, { text, ts: Date.now() });
    await callback({
      text,
      actions: ["KELLY_100K_PACE"],
    });
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Are we on track for $100K?" },
      },
      {
        name: "Kelly",
        content: {
          text: "**$100K pace** — Target $1,923/wk. This week: $X. On track / Behind.",
          actions: ["KELLY_100K_PACE"],
        },
      },
    ],
  ],
};
