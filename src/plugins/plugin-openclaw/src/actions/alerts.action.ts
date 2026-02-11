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
  getAlerts,
  createAlert,
  deleteAlert,
  formatAlerts,
} from "../services/alerts.service";

interface AlertsActionParams {
  action?: "list" | "create" | "delete";
  token?: string;
  type?: "price" | "sentiment" | "whale" | "volume";
  condition?: "above" | "below";
  value?: number;
  alertId?: string;
}

export const alertsAction: Action = {
  name: "MANAGE_ALERTS",
  similes: [
    "ALERTS",
    "ALERT",
    "NOTIFY",
    "NOTIFICATION",
    "PRICE_ALERT",
    "WHALE_ALERT",
  ],
  description: `Set up price, sentiment, and whale alerts for tokens.

Commands:
- alerts - View all alerts
- alert SOL price above 100 - Price alert
- alert ETH sentiment below 5 - Sentiment alert
- alert BTC whale above 10 - Whale activity alert
- delete alert <id> - Remove alert

Types: price, sentiment, whale, volume
Conditions: above, below`,

  parameters: {
    action: {
      type: "string",
      description: "Action: list, create, delete",
      required: false,
    },
    token: {
      type: "string",
      description: "Token symbol",
      required: false,
    },
    type: {
      type: "string",
      description: "Alert type: price, sentiment, whale, volume",
      required: false,
    },
    condition: {
      type: "string",
      description: "Condition: above, below",
      required: false,
    },
    value: {
      type: "number",
      description: "Threshold value",
      required: false,
    },
    alertId: {
      type: "string",
      description: "Alert ID for deletion",
      required: false,
    },
  },

  validate: async (): Promise<boolean> => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: AlertsActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as AlertsActionParams;

      const action = params.action || "list";
      let text = "";

      switch (action) {
        case "create": {
          const { token, type, condition, value } = params;
          
          if (!token || !type || !condition || value === undefined) {
            text = `❌ **Missing parameters**

Example: \`@VINCE alert SOL price above 100\`

Required:
• Token (e.g., SOL)
• Type: price, sentiment, whale, volume
• Condition: above, below
• Value (number)`;
            break;
          }
          
          const validTypes = ["price", "sentiment", "whale", "volume"];
          const validConditions = ["above", "below"];
          
          if (!validTypes.includes(type)) {
            text = `❌ **Invalid type:** ${type}\n\nValid: ${validTypes.join(", ")}`;
            break;
          }
          
          if (!validConditions.includes(condition)) {
            text = `❌ **Invalid condition:** ${condition}\n\nValid: ${validConditions.join(", ")}`;
            break;
          }
          
          const alert = createAlert(token, type as any, condition as any, value);
          const typeIcon = { price: "💰", sentiment: "🎭", whale: "🐋", volume: "📊" }[type] || "🔔";
          
          text = `✅ **Alert Created**

${typeIcon} **${alert.token}** - ${type} ${condition} ${value}

🆔 ID: \`${alert.id}\`

---
View all: \`@VINCE alerts\``;
          break;
        }

        case "delete": {
          const id = params.alertId;
          if (!id) {
            text = `❌ **Specify alert ID**

Example: \`@VINCE delete alert alert-123456\`

View IDs: \`@VINCE alerts\``;
            break;
          }
          
          const deleted = deleteAlert(id);
          text = deleted
            ? `✅ **Deleted alert** \`${id}\``
            : `❌ **Alert not found:** \`${id}\``;
          break;
        }

        case "list":
        default: {
          const alerts = getAlerts();
          text = formatAlerts(alerts);
          break;
        }
      }

      if (callback) {
        await callback({
          text,
          content: { action, token: params.token, type: params.type },
          actions: ["MANAGE_ALERTS"],
          source: message.content.source,
        });
      }

      return { text, success: true, data: { action } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[MANAGE_ALERTS] Failed: ${msg}`);

      const errorText = `❌ Alerts error: ${msg}`;
      if (callback) {
        await callback({ text: errorText, content: { error: msg } });
      }
      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Alert me when SOL is above 100" } },
      { name: "{{agent}}", content: { text: "✅ **Alert Created**\n\n💰 **SOL** - price above 100...", actions: ["MANAGE_ALERTS"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Show my alerts" } },
      { name: "{{agent}}", content: { text: "🔔 **Alerts** (3)...", actions: ["MANAGE_ALERTS"] } },
    ],
  ],
};
