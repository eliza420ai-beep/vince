import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from "@elizaos/core";
import { getHistory, formatHistory, exportToMarkdown, exportToJSON } from "../services/watchlist.service";

interface HistoryActionParams {
  action?: "view" | "export";
  format?: "markdown" | "json";
  limit?: number;
}

export const historyAction: Action = {
  name: "VIEW_HISTORY",
  similes: [
    "HISTORY",
    "PAST_RESEARCH",
    "PREVIOUS",
    "RECENT",
    "LAST_QUERIES",
  ],
  description: `View your research history and export past results.

Commands:
- history - View recent research
- history 20 - View last 20 queries
- export history - Export to markdown

Shows past queries, costs, and allows re-running research.`,

  parameters: {
    action: {
      type: "string",
      description: "Action: view or export",
      required: false,
    },
    format: {
      type: "string",
      description: "Export format: markdown or json",
      required: false,
    },
    limit: {
      type: "number",
      description: "Number of items to show (default: 10)",
      required: false,
    },
  },

  validate: async (): Promise<boolean> => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: HistoryActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as HistoryActionParams;

      const action = params.action || "view";
      const limit = params.limit || 10;
      const format = params.format || "markdown";

      const history = getHistory(500);
      let text = "";

      switch (action) {
        case "export":
          if (history.length === 0) {
            text = "📜 **No history to export**\n\nRun some research first: `@VINCE research SOL`";
          } else {
            const latest = history[history.length - 1];
            if (format === "json") {
              const json = exportToJSON(
                latest.agent,
                latest.tokens,
                latest.result,
                latest.cost,
                latest.timestamp
              );
              text = `📤 **Exported to JSON**

\`\`\`json
${json}
\`\`\``;
            } else {
              const md = exportToMarkdown(
                latest.agent,
                latest.tokens,
                latest.result,
                { estimatedCost: latest.cost.estimatedCost },
                latest.timestamp
              );
              text = `📤 **Exported to Markdown**

\`\`\`markdown
${md}
\`\`\``;
            }
          }
          break;

        case "view":
        default:
          text = formatHistory(history, limit);
          break;
      }

      if (callback) {
        await callback({
          text,
          content: { action, limit, historyCount: history.length },
          actions: ["VIEW_HISTORY"],
          source: message.content.source,
        });
      }

      return { text, success: true, data: { action, limit, historyCount: history.length } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[VIEW_HISTORY] Failed: ${msg}`);

      const errorText = `❌ History error: ${msg}`;
      if (callback) {
        await callback({ text: errorText, content: { error: msg } });
      }
      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Show my research history" } },
      { name: "{{agent}}", content: { text: "📜 **Research History** (Last 10 of 25)...", actions: ["VIEW_HISTORY"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Export last research to markdown" } },
      { name: "{{agent}}", content: { text: "📤 **Exported to Markdown**...", actions: ["VIEW_HISTORY"] } },
    ],
  ],
};
