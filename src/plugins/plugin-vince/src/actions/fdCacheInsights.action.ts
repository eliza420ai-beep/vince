import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { summarizeFdCachedHistory } from "../utils/financialDatasetsCache";

function extractTicker(text: string): string | null {
  const m = text.toUpperCase().match(/\b[A-Z]{1,6}\b/g);
  if (!m || m.length === 0) return null;
  // Prefer last symbol-like token (user often says "... for AMAT")
  return m[m.length - 1] ?? null;
}

export const vinceFdCacheInsightsAction: Action = {
  name: "VINCE_FD_CACHE_INSIGHTS",
  similes: ["FD_CACHE", "CACHED_HISTORY", "HIST_CACHE", "CACHE_INSIGHTS"],
  description:
    "Reads local Financial Datasets historical cache for a ticker and returns quick stats (period, rows, return, avg volume).",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("cached history") ||
      text.includes("fd cache") ||
      text.includes("cache insights")
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const text = message.content?.text ?? "";
    const ticker = extractTicker(text);
    if (!ticker) {
      await callback?.({
        text: "Give me a ticker too, e.g. `cached history AMAT`.",
        actions: ["VINCE_FD_CACHE_INSIGHTS"],
      });
      return;
    }

    const summary = summarizeFdCachedHistory(ticker);
    if (!summary) {
      await callback?.({
        text:
          `No local Financial Datasets cache for ${ticker}. ` +
          `Run \`bun run fd:cache:portfolio\` first (or \`--force\` to refresh).`,
        actions: ["VINCE_FD_CACHE_INSIGHTS"],
      });
      return;
    }

    const ret =
      summary.returnPct == null
        ? "n/a"
        : `${summary.returnPct >= 0 ? "+" : ""}${summary.returnPct.toFixed(2)}%`;
    const avgVol =
      summary.avgVolume == null
        ? "n/a"
        : Math.round(summary.avgVolume).toLocaleString();
    const last =
      summary.lastClose == null ? "n/a" : `$${summary.lastClose.toFixed(2)}`;

    await callback?.({
      text:
        `FD cache ${summary.ticker}: ${summary.startDate} → ${summary.endDate} ` +
        `(${summary.rowCount} rows, fetched ${summary.fetchedAt}). ` +
        `Last close ${last}, return ${ret}, avg volume ${avgVol}.`,
      actions: ["VINCE_FD_CACHE_INSIGHTS"],
    });
    return;
  },
  examples: [
    [
      { name: "{{user1}}", content: { text: "cached history AMAT" } },
      {
        name: "VINCE",
        content: {
          text: "FD cache AMAT: 2021-01-01 → 2026-01-01 (1260 rows, fetched 2026-03-14T..). Last close $213.44, return +42.10%, avg volume 2,345,000.",
          actions: ["VINCE_FD_CACHE_INSIGHTS"],
        },
      },
    ],
  ],
};

export default vinceFdCacheInsightsAction;
