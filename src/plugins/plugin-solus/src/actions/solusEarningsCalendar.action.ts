/**
 * Solus Earnings Calendar Action — Upcoming earnings for watchlist stocks.
 * Output: LLM-generated prose narrative via callback (matches VINCE output quality).
 */

import {
  type Action,
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  ModelType,
} from "@elizaos/core";
import { SOLUS_OFFCHAIN_STOCKS } from "../constants/solusStockWatchlist";
import { FMPService } from "../services/fmp.service";
import { isSolus } from "../utils/solus";

function buildEarningsDataContext(
  earnings: any[],
  specificTicker: string | null,
): string {
  const now = new Date();
  const lines: string[] = [];

  if (specificTicker) {
    const filtered = earnings.filter((e: any) => e.symbol === specificTicker);
    if (filtered.length === 0)
      return `No upcoming earnings found for ${specificTicker}.`;
    lines.push(`=== ${specificTicker} EARNINGS ===`);
    filtered.forEach((e: any) => {
      const isPast = new Date(e.date) <= now;
      const epsActual = e.eps?.toFixed(2) || "?";
      const epsEst = e.epsEstimate?.toFixed(2) || "?";
      const revActual = e.revenue ? `$${(e.revenue / 1e9).toFixed(1)}B` : "?";
      const revEst = e.revenueEstimate
        ? `$${(e.revenueEstimate / 1e9).toFixed(1)}B`
        : "?";
      lines.push(
        `${e.date} (${isPast ? "reported" : "upcoming"}): EPS $${epsActual} vs est $${epsEst} | Rev ${revActual} vs est ${revEst}`,
      );
    });
    return lines.join("\n");
  }

  const watchlistSymbols = SOLUS_OFFCHAIN_STOCKS.map((s) => s.ticker);
  const watchlistEarnings = earnings
    .filter((e: any) => watchlistSymbols.includes(e.symbol))
    .sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

  if (watchlistEarnings.length === 0)
    return "No upcoming earnings from watchlist stocks in the next 30 days.";

  const thisWeek: any[] = [];
  const nextWeek: any[] = [];
  const later: any[] = [];

  watchlistEarnings.forEach((e: any) => {
    const daysDiff = Math.floor(
      (new Date(e.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff <= 7) thisWeek.push(e);
    else if (daysDiff <= 14) nextWeek.push(e);
    else later.push(e);
  });

  const formatEntry = (e: any) => {
    const isPast = new Date(e.date) <= now;
    const epsEst = e.epsEstimate?.toFixed(2) || "?";
    const epsActual = e.eps?.toFixed(2);
    return `${e.symbol} — ${e.date}${isPast ? " (reported)" : ""}: EPS est $${epsEst}${epsActual ? `, actual $${epsActual}` : ""}`;
  };

  if (thisWeek.length > 0) {
    lines.push("THIS WEEK:");
    thisWeek.forEach((e) => lines.push(formatEntry(e)));
  }
  if (nextWeek.length > 0) {
    lines.push("\nNEXT WEEK:");
    nextWeek.forEach((e) => lines.push(formatEntry(e)));
  }
  if (later.length > 0) {
    lines.push("\nLATER:");
    later.forEach((e) => lines.push(formatEntry(e)));
  }

  return lines.join("\n");
}

async function generateEarningsNarrative(
  runtime: IAgentRuntime,
  dataContext: string,
  specificTicker: string | null,
): Promise<string> {
  const prompt = `You are Solus, the stock specialist. ${specificTicker ? `Give an earnings briefing for ${specificTicker}.` : "Give an earnings calendar briefing for the offchain watchlist."}

DATA:
${dataContext}

Write an earnings briefing that covers:
1. What's reporting soon and why it matters for the watchlist thesis
2. Any recent beats or misses and what they signal
3. Which names to watch most closely and why
${specificTicker ? "4. What the earnings setup means for the thesis on this name" : "4. The overall earnings season read — are watchlist names delivering or disappointing?"}

STYLE RULES:
- Write like a sharp analyst giving a quick earnings rundown, not a calendar dump
- Weave dates and estimates naturally — "NVDA reports March 26 with Street at $0.89" not "Date: March 26, EPS Est: $0.89"
- No bullet points or section headers. Flow between names.
- Have an opinion on which reports matter most.
- Around 100-200 words. Dense, no padding.

AVOID:
- Emoji headers or markdown section headers (##)
- "Interestingly", "notably", "it's worth noting", "delve"
- Bullet-point data dumps
- "Not financial advice" disclaimers

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(
      `[SOLUS_EARNINGS_CALENDAR] Failed to generate narrative: ${error}`,
    );
    return "Earnings data pulled but couldn't get the narrative to click. Try again in a moment.";
  }
}

export const solusEarningsCalendarAction: Action = {
  name: "SOLUS_EARNINGS_CALENDAR",
  description:
    "Upcoming earnings dates for watchlist stocks — delivered as flowing prose",
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "What earnings are coming up this week?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Earnings Calendar** _Friday, Feb 20_\n\nBig week ahead. NVDA reports Wednesday after close with Street expecting $0.89 EPS. This is the print that sets the tone for the entire AI Infra sector on our watchlist: AMD, AVGO, and SMCI all trade in NVDA's wake. Any guidance on Blackwell ramp or data center capex matters more than the beat itself.\n\nOKLO and IONQ are both reporting next week. OKLO is still pre-revenue so the focus is on the NRC licensing timeline and any new LOIs. IONQ needs to show bookings growth to justify the quantum premium — last quarter's 40% beat on revenue was the only thing keeping the stock from retesting $8.\n\nLEU reported last week and beat estimates by 12%, which is quiet validation for the nuclear thesis. Uranium spot is still firm and the enrichment capacity story hasn't changed.\n\nOverall read: the names that matter are the AI picks. If NVDA delivers, the sector rallies and our watchlist benefits. If it misses, expect a broad pullback in anything growth-adjacent.\n\n*Source: FMP*\n\n---\n_Next steps_: `ANALYZE NVDA` (deep dive) · `STRIKE RITUAL` (options) · Ask VINCE for live data",
          actions: ["SOLUS_EARNINGS_CALENDAR"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("earnings") || text.includes("calendar");
  },

  suppressInitialMessage: true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback?: HandlerCallback,
  ): Promise<void> => {
    const text = message.content?.text || "";
    const tickerMatch = text.match(/\b([A-Z]{2,5})\b/);
    const specificTicker = tickerMatch ? tickerMatch[1] : null;

    const fmp = runtime.getService<FMPService>("FMP_SERVICE");

    if (!fmp || !fmp.isConfigured()) {
      if (callback) {
        await callback({
          text: "Earnings calendar needs FMP. Set FMP_API_KEY and I'll have dates, estimates, and beats for the full watchlist.",
          actions: ["SOLUS_EARNINGS_CALENDAR"],
        });
      }
      return;
    }

    try {
      const allEarnings = await fmp.getEarningsCalendar();
      const dataContext = buildEarningsDataContext(allEarnings, specificTicker);
      const narrative = await generateEarningsNarrative(
        runtime,
        dataContext,
        specificTicker,
      );

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      const title = specificTicker
        ? `${specificTicker} Earnings`
        : "Earnings Calendar";

      const output = [
        `**${title}** _${dateStr}_`,
        "",
        narrative,
        "",
        "*Source: FMP*",
        "",
        "---",
        "_Next steps_: `ANALYZE <ticker>` (deep dive) · `STRIKE RITUAL` (options) · Ask VINCE for live data",
      ].join("\n");

      if (callback) {
        await callback({
          text: output,
          actions: ["SOLUS_EARNINGS_CALENDAR"],
        });
      }

      logger.info("[SolusEarningsCalendar] Briefing complete");
    } catch (e) {
      logger.error("[SolusEarningsCalendar] Error: " + (e as Error).message);
      if (callback) {
        await callback({
          text: "Earnings calendar hit a snag pulling data from FMP. Give it another shot.",
          actions: ["SOLUS_EARNINGS_CALENDAR"],
        });
      }
    }
  },

  similes: ["EARNINGS_CALENDAR", "EARNINGS", "REPORTING_DATES"],
};
