/**
 * SENTINEL_ALPHA_MEMO — Weekly Alpha Memo
 *
 * Aggregates intel from Vince, Echo, and Solus into a structured weekly memo.
 * Uses the ASK_AGENT pattern (same as kellyWeeklyReview.action.ts).
 *
 * PRD Phase 8, Task #47.
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

const TIMEOUT_MS = 28_000;
const CACHE_KEY = "sentinel:alpha_memo";
const CACHE_TTL_MS = 120_000; // 2 min

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
  const content = `[To ${agentName} — you are being asked. Answer directly as yourself.][From Sentinel, on behalf of the user]: ${question}`;
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "sentinel_alpha_memo" },
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

function formatMemo(
  vince: string,
  echo: string,
  solus: string,
  weekLabel: string,
): string {
  return `## Weekly Alpha Memo — Week of ${weekLabel}

### What Worked
${vince || "— Vince unavailable"}

### Narrative Intelligence
${echo || "— Echo unavailable"}

### Options Desk (Solus)
${solus || "— Solus unavailable"}

### Signal Source Rankings
${vince ? "_(see Vince top trades above for signal source context)_" : "—"}

### Next Week Setup
${vince ? "_(regime + genome generation details in Vince bot status)_" : "—"}`;
}

export const sentinelAlphaMemoAction: Action = {
  name: "SENTINEL_ALPHA_MEMO",
  similes: [
    "ALPHA_MEMO",
    "WEEKLY_ALPHA",
    "WEEKLY_REPORT_DRAFT",
    "WHAT_WORKED_THIS_WEEK",
    "ALPHA_REPORT",
  ],
  description:
    "Generate this week's alpha memo: top trades, narrative intel, options desk, signal source rankings.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("alpha memo") ||
      text.includes("weekly alpha") ||
      text.includes("alpha report") ||
      text.includes("what worked this week") ||
      text.includes("weekly report draft")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.debug("[SENTINEL_ALPHA_MEMO] Building weekly alpha memo");

    const eliza = getElizaOS(runtime);
    if (!eliza?.getAgents || !eliza.getAgentByName || !eliza.handleMessage) {
      await callback({
        text: "The alpha memo needs the full agent network to be online. Try again when the app is fully up.",
        actions: ["SENTINEL_ALPHA_MEMO"],
      });
      return;
    }

    // Check cache
    const cached = await runtime.getCache<{ markdown: string; ts: number }>(
      CACHE_KEY,
    );
    if (cached && cached.markdown && Date.now() - cached.ts < CACHE_TTL_MS) {
      await callback({
        text: cached.markdown,
        actions: ["SENTINEL_ALPHA_MEMO"],
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

    // Call Vince, Echo, Solus in parallel
    const [vinceResult, echoResult, solusResult] = await Promise.allSettled([
      (async () => {
        const agentId = byName.get("vince");
        if (!agentId) return "";
        return askAgent(
          eliza,
          agentId,
          "Vince",
          "Summarize this week: top 3 trades with PnL, current win rate, genome generation, signal source rankings",
          roomId,
          entityId,
        );
      })(),
      (async () => {
        const agentId = byName.get("echo");
        if (!agentId) return "";
        return askAgent(
          eliza,
          agentId,
          "Echo",
          "Top 2 predictive X accounts this week and dominant narrative phase per asset (BTC/SOL/ETH/HYPE)",
          roomId,
          entityId,
        );
      })(),
      (async () => {
        const agentId = byName.get("solus");
        if (!agentId) return "";
        return askAgent(
          eliza,
          agentId,
          "Solus",
          "This week: premium collected, current open positions",
          roomId,
          entityId,
        );
      })(),
    ]);

    const vince = vinceResult.status === "fulfilled" ? vinceResult.value : "";
    const echo = echoResult.status === "fulfilled" ? echoResult.value : "";
    const solus = solusResult.status === "fulfilled" ? solusResult.value : "";

    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekLabel = monday.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const markdown = formatMemo(vince, echo, solus, weekLabel);
    await runtime.setCache(CACHE_KEY, { markdown, ts: Date.now() });

    await callback({ text: markdown, actions: ["SENTINEL_ALPHA_MEMO"] });
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Generate this week's alpha memo" },
      },
      {
        name: "Sentinel",
        content: {
          text: "## Weekly Alpha Memo — Week of Feb 24, 2026\n\n### What Worked\n...",
          actions: ["SENTINEL_ALPHA_MEMO"],
        },
      },
    ],
  ],
};
