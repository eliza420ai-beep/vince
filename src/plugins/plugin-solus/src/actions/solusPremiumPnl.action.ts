/**
 * SOLUS_PREMIUM_PNL — Weekly premium income tracker. Shows P&L from Hypersurface options
 * (covered calls + secured puts), tracks progress toward the $100K/yr target, surfaces
 * what worked and what to adjust. The handoff from plan to proof.
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
import { isSolus } from "../utils/solus";

const TRIGGERS = [
  "premium p&l",
  "premium pnl",
  "weekly premium",
  "options p&l",
  "options pnl",
  "premium income",
  "premium tracker",
  "how much premium",
  "premium this week",
  "weekly income",
  "options income",
  "premium report",
  "p&l report",
  "pnl report",
  "track premium",
  "premium progress",
  "100k progress",
  "$100k progress",
  "income tracker",
];

function wantsPremiumPnl(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const solusPremiumPnlAction: Action = {
  name: "SOLUS_PREMIUM_PNL",
  similes: ["PREMIUM_PNL", "WEEKLY_PREMIUM", "OPTIONS_INCOME"],
  description:
    "Weekly premium P&L tracker for Hypersurface options. Shows income from covered calls and secured puts, tracks progress toward $100K/yr, and surfaces adjustment opportunities.",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsPremiumPnl(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.debug("[SOLUS_PREMIUM_PNL] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Solus, the on-chain options expert and CFO. The user wants a weekly premium P&L report.

Using all available context (portfolio, positions, recent trades, Hypersurface spot prices), produce:

1. **This Week's Premium** — total premium collected from covered calls and secured puts (or state what data you'd need if none is pasted).
2. **YTD Premium Income** — running total if available, otherwise estimate based on weekly run rate.
3. **$100K/yr Pace** — are we on track? Show weekly target ($1,923/wk) vs actual. If ahead, say so; if behind, say what to adjust.
4. **What Worked** — which strikes, assets, or structures generated the most premium.
5. **Adjustment** — one concrete suggestion for next week (tighter strikes, different asset, skip a week, size up).

If no position data is in context, ask the user to paste their Hypersurface positions or recent trade confirmations, and explain exactly what you need.

Be direct, benefit-led, no AI slop. Numbers first, story second.

Context:
${contextBlock}

User: ${userText}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.4,
      });

      const text =
        typeof response === "string"
          ? response
          : ((response as any)?.text ?? String(response));

      await callback({
        text: text.trim(),
        actions: ["SOLUS_PREMIUM_PNL"],
      });

      return { success: true };
    } catch (err) {
      logger.error("[SOLUS_PREMIUM_PNL] Error:", err);
      await callback({
        text: "Couldn't pull the premium P&L right now. Paste your Hypersurface positions and I'll break it down.",
        actions: ["SOLUS_PREMIUM_PNL"],
      });
      return { success: false, error: String(err) };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Weekly premium P&L" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "This week: $2,140 in premium from 2 BTC covered calls (106K strike) and 1 ETH secured put (2,800). YTD run rate: $111K annualized — ahead of the $100K target. The BTC 106K calls printed cleanly; ETH put was marginal. Next week: keep BTC calls at same OTM %, skip ETH unless IV spikes above 60.",
          actions: ["SOLUS_PREMIUM_PNL"],
        },
      },
    ],
  ],
};
