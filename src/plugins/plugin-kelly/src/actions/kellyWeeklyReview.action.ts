/**
 * KELLY_WEEKLY_REVIEW — Unified weekly scorecard from all agents.
 * Pulls trading P&L, premium, sentiment, Polymarket, execution, content, and engineering via in-process ASK_AGENT.
 * PRD: One Dream — Agent Synergy (§5.2).
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { getElizaOS } from "../../../plugin-inter-agent/src/types";

const AGENT_QUERIES: { name: string; question: string }[] = [
  {
    name: "Vince",
    question:
      "In 2–3 sentences: What's the paper bot P&L and win rate this week? (realized P&L, win count, loss count, win %.)",
  },
  {
    name: "Solus",
    question:
      "In 2–3 sentences: What's the weekly premium income and YTD pace toward $100K? (dollars collected this week, annualized pace if available.)",
  },
  {
    name: "Otaku",
    question:
      "In 1–2 sentences: How many Vince signals did you execute this week, and how many did you skip? (execution summary only.)",
  },
  {
    name: "Echo",
    question:
      "In 1–2 sentences: What was CT sentiment this week (bullish/bearish/mixed) and any accuracy vs price if you track it?",
  },
  {
    name: "Oracle",
    question:
      "In 1–2 sentences: How many Polymarket-related calls or regime views did you provide this week, and were they correct?",
  },
  {
    name: "Eliza",
    question:
      "In 1–2 sentences: How many uploads, Substack essays drafted, and tweets drafted this week? Knowledge base size change?",
  },
  {
    name: "Sentinel",
    question:
      "In 1–2 sentences: How many features shipped, bugs fixed, and PRDs written this week?",
  },
];

const TIMEOUT_MS = 28_000;
const CACHE_KEY = "kelly:weekly_review";
const CACHE_TTL_MS = 60_000; // 1 min so repeated clicks don't re-hit all agents

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
  const content = `[To ${agentName} — you are being asked. Answer directly as yourself.][From Kelly, on behalf of the user]: ${question}`;
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "kelly_weekly_review" },
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

function formatScorecard(
  replies: Map<string, string>,
  weekLabel: string,
): string {
  const vince = replies.get("Vince") || "—";
  const solus = replies.get("Solus") || "—";
  const otaku = replies.get("Otaku") || "—";
  const echo = replies.get("Echo") || "—";
  const oracle = replies.get("Oracle") || "—";
  const eliza = replies.get("Eliza") || "—";
  const sentinel = replies.get("Sentinel") || "—";

  return `## Weekly Scorecard — ${weekLabel}

### Trading ($100K target: ~$1,923/wk)
- **Paper bot:** ${vince}
- **Premium income:** ${solus}
- **Execution:** ${otaku}

### Intelligence
- **Echo (CT sentiment):** ${echo}
- **Oracle (Polymarket):** ${oracle}

### Knowledge & Content
- **Eliza:** ${eliza}

### Engineering
- **Sentinel:** ${sentinel}

### $100K pace
- Use the numbers above to say whether we're on track. If Solus or Vince didn't report, say "Add premium and paper P&L to see pace."`;
}

export const kellyWeeklyReviewAction: Action = {
  name: "KELLY_WEEKLY_REVIEW",
  similes: ["WEEKLY_SCORECARD", "WEEKLY_REVIEW", "HOW_DID_WE_DO", "SCORECARD"],
  description:
    "Unified weekly scorecard: pulls paper bot P&L, premium income, execution, Echo sentiment, Oracle predictions, Eliza content, Sentinel shipping. One command to see how the team did.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("weekly review") ||
      text.includes("weekly scorecard") ||
      text.includes("how did we do this week") ||
      text.includes("scorecard") ||
      text.includes("how did we do")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_WEEKLY_REVIEW] Building weekly scorecard");
    const eliza = getElizaOS(runtime);
    if (!eliza?.getAgents || !eliza.getAgentByName || !eliza.handleMessage) {
      await callback({
        text: "I can't pull the team scorecard right now—the agent hub isn't available. Try again when the app is fully up, or ask each agent individually.",
        actions: ["KELLY_WEEKLY_REVIEW"],
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

    const cached = await runtime.getCache<{ markdown: string; ts: number }>(
      CACHE_KEY,
    );
    if (cached && cached.markdown && Date.now() - cached.ts < CACHE_TTL_MS) {
      await callback({
        text: cached.markdown,
        actions: ["KELLY_WEEKLY_REVIEW"],
      });
      return;
    }

    const roomId = message.roomId;
    const entityId = message.entityId ?? runtime.agentId;

    const results = await Promise.allSettled(
      AGENT_QUERIES.map(async ({ name, question }) => {
        const agentId = byName.get(name.toLowerCase());
        if (!agentId) return { name, reply: "" };
        const reply = await askAgent(
          eliza,
          agentId,
          name,
          question,
          roomId,
          entityId,
        );
        return { name, reply };
      }),
    );

    const replies = new Map<string, string>();
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.reply) {
        replies.set(result.value.name, result.value.reply);
      }
    }

    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekLabel = `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    const markdown = formatScorecard(replies, weekLabel);

    await runtime.setCache(CACHE_KEY, { markdown, ts: Date.now() });
    await callback({
      text: markdown,
      actions: ["KELLY_WEEKLY_REVIEW"],
    });
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Weekly review — how did we do?" },
      },
      {
        name: "Kelly",
        content: {
          text: "## Weekly Scorecard — Week of Feb 24, 2026\n\n### Trading…",
          actions: ["KELLY_WEEKLY_REVIEW"],
        },
      },
    ],
  ],
};
