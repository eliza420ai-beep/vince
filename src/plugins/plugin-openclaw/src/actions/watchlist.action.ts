import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from "@elizaos/core";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  formatWatchlist,
} from "../services/watchlist.service";

interface WatchlistActionParams {
  action?: "list" | "add" | "remove";
  token?: string;
  notes?: string;
}

export const watchlistAction: Action = {
  name: "MANAGE_WATCHLIST",
  similes: [
    "WATCHLIST",
    "WATCH",
    "UNWATCH",
    "TRACK",
    "FOLLOW",
    "MONITOR",
  ],
  description: `Manage your token watchlist for automated tracking and alerts.

Commands:
- watch <token> - Add token to watchlist
- unwatch <token> - Remove token from watchlist
- watchlist - View your watchlist

Features:
- Track multiple tokens
- Get alerts on significant changes
- Auto-research watchlist tokens`,

  parameters: {
    action: {
      type: "string",
      description: "Action: list, add, remove",
      required: false,
    },
    token: {
      type: "string",
      description: "Token symbol (e.g., SOL, BTC)",
      required: false,
    },
    notes: {
      type: "string",
      description: "Optional notes about the token",
      required: false,
    },
  },

  validate: async (): Promise<boolean> => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: WatchlistActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as WatchlistActionParams;

      const action = params.action || "list";
      const token = params.token?.toUpperCase();

      let text = "";

      switch (action) {
        case "add":
          if (!token) {
            text = "❌ Please specify a token to watch.\n\nExample: `@VINCE watch SOL`";
          } else {
            const item = addToWatchlist(token, params.notes);
            text = `✅ **Added ${item.token} to watchlist**

📋 Alerts enabled:
• Sentiment changes
• Whale activity
• News updates

${params.notes ? `📝 Notes: ${params.notes}` : ""}

---
View watchlist: \`@VINCE watchlist\``;
          }
          break;

        case "remove":
          if (!token) {
            text = "❌ Please specify a token to remove.\n\nExample: `@VINCE unwatch SOL`";
          } else {
            const removed = removeFromWatchlist(token);
            text = removed
              ? `✅ **Removed ${token} from watchlist**`
              : `❌ **${token} not found in watchlist**`;
          }
          break;

        case "list":
        default:
          const watchlist = getWatchlist();
          text = formatWatchlist(watchlist);
          break;
      }

      if (callback) {
        await callback({
          text,
          content: { action, token },
          actions: ["MANAGE_WATCHLIST"],
          source: message.content.source,
        });
      }

      return { text, success: true, data: { action, token } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[MANAGE_WATCHLIST] Failed: ${msg}`);

      const errorText = `❌ Watchlist error: ${msg}`;
      if (callback) {
        await callback({ text: errorText, content: { error: msg } });
      }
      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Watch SOL" } },
      { name: "{{agent}}", content: { text: "✅ **Added SOL to watchlist**", actions: ["MANAGE_WATCHLIST"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Show my watchlist" } },
      { name: "{{agent}}", content: { text: "📋 **Watchlist** (3 tokens)...", actions: ["MANAGE_WATCHLIST"] } },
    ],
  ],
};
