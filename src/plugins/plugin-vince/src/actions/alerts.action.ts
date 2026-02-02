/**
 * VINCE Alerts Action
 *
 * View and manage alerts from the early detection system:
 * - Show unread alerts
 * - Filter by type (wallet, watchlist, new tokens)
 * - Mark alerts as read
 * - Clear old alerts
 *
 * Triggers: "alerts", "notifications", "whale moves", "wallet activity"
 * NOT triggered by: "gm", "memes", general greetings
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { VinceAlertService, AlertType, Alert } from "../services/alert.service";

// ==========================================
// Parse Commands
// ==========================================

interface AlertCommand {
  action: "list" | "filter" | "read" | "clear";
  filterType?: AlertType;
  alertId?: string;
}

function parseAlertCommand(text: string): AlertCommand {
  const lowerText = text.toLowerCase().trim();

  // Mark all read: "mark read", "mark all read", "dismiss alerts"
  if (lowerText.includes("mark") && lowerText.includes("read") || lowerText.includes("dismiss")) {
    return { action: "read" };
  }

  // Clear old: "clear alerts", "clear old", "delete alerts"
  if (lowerText.includes("clear") || (lowerText.includes("delete") && lowerText.includes("alert"))) {
    return { action: "clear" };
  }

  // Filter by type
  if (lowerText.includes("wallet") || lowerText.includes("whale")) {
    return { action: "filter", filterType: "WALLET_BUY" };
  }
  if (lowerText.includes("watchlist")) {
    return { action: "filter", filterType: "WATCHLIST_PUMP" };
  }
  if (lowerText.includes("new token") || lowerText.includes("discovery")) {
    return { action: "filter", filterType: "NEW_TOKEN" };
  }

  // Default: show all
  return { action: "list" };
}

// ==========================================
// Format Helpers
// ==========================================

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getAlertEmoji(type: AlertType): string {
  switch (type) {
    case "WATCHLIST_PUMP": return "🚀";
    case "WATCHLIST_ENTRY": return "🎯";
    case "WATCHLIST_STOPLOSS": return "⚠️";
    case "WATCHLIST_TAKEPROFIT": return "💰";
    case "WALLET_BUY": return "🐋";
    case "WALLET_SELL": return "📉";
    case "NEW_TOKEN": return "✨";
    default: return "🔔";
  }
}

function formatAlertForDisplay(alert: Alert): string {
  const emoji = getAlertEmoji(alert.type);
  const readMarker = alert.read ? "" : "🔴 ";
  const timeAgo = getTimeAgo(alert.timestamp);
  
  return `${readMarker}${emoji} **${alert.title}** (${timeAgo})\n   ${alert.message}`;
}

// ==========================================
// Action
// ==========================================

export const vinceAlertsAction: Action = {
  name: "VINCE_ALERTS",
  similes: ["ALERTS", "NOTIFICATIONS", "MOVES", "ACTIVITY"],
  description: "View and manage alerts from watchlist, wallet tracking, and token discovery",

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    // Only trigger on explicit alert commands - not general greetings
    return (
      text.includes("alert") ||
      text.includes("notification") ||
      (text.includes("whale") && text.includes("move")) ||
      (text.includes("wallet") && text.includes("activity")) ||
      text.includes("mark read") ||
      text.includes("clear alert") ||
      text.includes("dismiss alert")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ): Promise<void> => {
    try {
      const alertService = runtime.getService("VINCE_ALERT_SERVICE") as VinceAlertService | null;

      if (!alertService) {
        await callback({
          text: "Alert service not available. Make sure it's registered in the plugin.",
          actions: ["VINCE_ALERTS"],
        });
        return;
      }

      const text = message.content.text || "";
      const command = parseAlertCommand(text);
      logger.info(`[VINCE_ALERTS] Command: ${command.action}`);

      switch (command.action) {
        case "read": {
          const count = alertService.markAllAsRead();
          await callback({
            text: `✅ Marked ${count} alerts as read.`,
            actions: ["VINCE_ALERTS"],
          });
          break;
        }

        case "clear": {
          const cleared = alertService.clearOldAlerts(24 * 60 * 60 * 1000); // 24 hours
          await callback({
            text: `🗑️ Cleared ${cleared} old alerts (older than 24h).`,
            actions: ["VINCE_ALERTS"],
          });
          break;
        }

        case "filter": {
          let alerts: Alert[];
          let filterLabel: string;

          switch (command.filterType) {
            case "WALLET_BUY":
              alerts = [
                ...alertService.getAlerts({ type: "WALLET_BUY", limit: 10 }),
                ...alertService.getAlerts({ type: "WALLET_SELL", limit: 10 }),
              ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
              filterLabel = "Wallet Activity";
              break;
            case "WATCHLIST_PUMP":
              alerts = [
                ...alertService.getAlerts({ type: "WATCHLIST_PUMP", limit: 10 }),
                ...alertService.getAlerts({ type: "WATCHLIST_ENTRY", limit: 10 }),
                ...alertService.getAlerts({ type: "WATCHLIST_STOPLOSS", limit: 10 }),
                ...alertService.getAlerts({ type: "WATCHLIST_TAKEPROFIT", limit: 10 }),
              ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
              filterLabel = "Watchlist";
              break;
            case "NEW_TOKEN":
              alerts = alertService.getAlerts({ type: "NEW_TOKEN", limit: 10 });
              filterLabel = "New Token Discoveries";
              break;
            default:
              alerts = alertService.getAlerts({ limit: 10 });
              filterLabel = "All Alerts";
          }

          if (alerts.length === 0) {
            await callback({
              text: `No ${filterLabel.toLowerCase()} alerts to show.`,
              actions: ["VINCE_ALERTS"],
            });
            return;
          }

          const lines: string[] = [
            `🔔 **${filterLabel}** (${alerts.length} alerts)`,
            "",
          ];

          for (const alert of alerts) {
            lines.push(formatAlertForDisplay(alert));
            lines.push("");
          }

          lines.push("*Commands: 'mark read', 'clear alerts', 'wallet alerts', 'watchlist alerts'*");

          await callback({
            text: lines.join("\n"),
            actions: ["VINCE_ALERTS"],
          });
          break;
        }

        case "list":
        default: {
          const summary = alertService.getSummary();
          const unreadAlerts = alertService.getUnreadAlerts().slice(0, 10);

          if (summary.total === 0) {
            await callback({
              text: "🔔 **No Alerts**\n\nAlerts will appear when:\n• Watchlist tokens pump or hit targets\n• Tracked wallets make moves\n• New AI tokens enter sweet spot range\n\nMake sure to set up your watchlist and wallet tracking.",
              actions: ["VINCE_ALERTS"],
            });
            return;
          }

          const lines: string[] = [];

          // Header with summary
          if (summary.unread > 0) {
            lines.push(`🔔 **${summary.unread} Unread Alerts**`);
          } else {
            lines.push(`🔔 **Alerts** (${summary.total} total, all read)`);
          }
          lines.push("");

          // High priority alerts first
          const highPriority = alertService.getHighPriorityAlerts().slice(0, 5);
          if (highPriority.length > 0) {
            lines.push("**🔴 High Priority**");
            for (const alert of highPriority) {
              lines.push(formatAlertForDisplay(alert));
              lines.push("");
            }
          }

          // Other unread alerts
          const otherUnread = unreadAlerts.filter(a => a.priority !== "high").slice(0, 5);
          if (otherUnread.length > 0) {
            lines.push("**Other Alerts**");
            for (const alert of otherUnread) {
              lines.push(formatAlertForDisplay(alert));
              lines.push("");
            }
          }

          // Summary by type
          const typeSummary: string[] = [];
          if (summary.byType.WALLET_BUY > 0 || summary.byType.WALLET_SELL > 0) {
            typeSummary.push(`🐋 ${summary.byType.WALLET_BUY + summary.byType.WALLET_SELL} wallet`);
          }
          if (summary.byType.WATCHLIST_PUMP > 0 || summary.byType.WATCHLIST_ENTRY > 0) {
            const watchlistTotal = summary.byType.WATCHLIST_PUMP + summary.byType.WATCHLIST_ENTRY + 
                                   summary.byType.WATCHLIST_STOPLOSS + summary.byType.WATCHLIST_TAKEPROFIT;
            typeSummary.push(`📋 ${watchlistTotal} watchlist`);
          }
          if (summary.byType.NEW_TOKEN > 0) {
            typeSummary.push(`✨ ${summary.byType.NEW_TOKEN} discoveries`);
          }

          if (typeSummary.length > 0) {
            lines.push(`*Summary: ${typeSummary.join(", ")}*`);
          }

          lines.push("");
          lines.push("*Commands: 'mark read', 'clear alerts', 'wallet alerts', 'watchlist alerts'*");

          await callback({
            text: lines.join("\n"),
            actions: ["VINCE_ALERTS"],
          });
          break;
        }
      }
    } catch (error) {
      logger.error(`[VINCE_ALERTS] Error: ${error}`);
      await callback({
        text: "Failed to fetch alerts. Try again.",
        actions: ["VINCE_ALERTS"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "any alerts?" } },
      {
        name: "VINCE",
        content: {
          text: "🔔 **3 Unread Alerts**\n\n**🔴 High Priority**\n🔴 🐋 **FrankDeGods Bought MOLT** (15m ago)\n   FrankDeGods bought MOLT on solana\n\n🔴 🚀 **AGENT Pumping!** (1h ago)\n   AGENT is up 45.2% in 24h. Current mcap: $4.50M\n\n**Other Alerts**\n✨ **New AI Token: CLAUDE** (2h ago)\n   CLAUDE spotted in sweet spot. Mcap: $2.10M, Vol/Liq: 5.2x\n\n*Summary: 🐋 1 wallet, 📋 1 watchlist, ✨ 1 discoveries*\n\n*Commands: 'mark read', 'clear alerts', 'wallet alerts', 'watchlist alerts'*",
          actions: ["VINCE_ALERTS"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "whale moves?" } },
      {
        name: "VINCE",
        content: {
          text: "🔔 **Wallet Activity** (2 alerts)\n\n🔴 🐋 **FrankDeGods Bought MOLT** (15m ago)\n   FrankDeGods bought MOLT on solana\n\n📉 **SmartMoney1 Sold WIF** (3h ago)\n   SmartMoney1 sold WIF on solana\n\n*Commands: 'mark read', 'clear alerts', 'wallet alerts', 'watchlist alerts'*",
          actions: ["VINCE_ALERTS"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "mark all alerts read" } },
      {
        name: "VINCE",
        content: {
          text: "✅ Marked 3 alerts as read.",
          actions: ["VINCE_ALERTS"],
        },
      },
    ],
  ],
};
