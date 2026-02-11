/**
 * OpenClaw Webhook Action
 * 
 * Commands:
 * - webhook list - View configured webhooks
 * - webhook create <name> <type> <url> - Create webhook
 * - webhook delete <id> - Delete webhook
 * - webhook toggle <id> - Enable/disable webhook
 * - webhook info <id> - View webhook details
 * - webhook test <id> - Send test delivery
 * - webhook history [id] - View delivery history
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import {
  createWebhook,
  getWebhooks,
  getWebhook,
  deleteWebhook,
  toggleWebhook,
  getDeliveryHistory,
  formatWebhookList,
  formatWebhookDetails,
  formatDeliveryHistory,
  testWebhook,
  type WebhookType,
  type EventType,
} from "../services/webhook.service";

const WEBHOOK_TYPES: WebhookType[] = ["discord", "slack", "telegram", "http"];
const EVENT_TYPES: EventType[] = ["research", "alert", "report", "governance", "portfolio", "all"];

export const webhookAction: Action = {
  name: "OPENCLAW_WEBHOOK",
  description: `Webhook management for external integrations.
Commands:
- "webhook list" - View configured webhooks
- "webhook create alerts discord https://..." - Create Discord webhook
- "webhook delete wh_xxx" - Delete webhook
- "webhook toggle wh_xxx" - Enable/disable
- "webhook info wh_xxx" - View details
- "webhook test wh_xxx" - Send test
- "webhook history" - View delivery history`,
  similes: [
    "webhook",
    "webhooks",
    "webhook create",
    "webhook delete",
    "webhook list",
    "integration",
    "integrations",
    "discord webhook",
    "slack webhook",
  ],
  examples: [
    [
      { user: "user1", content: { text: "list webhooks" } },
      { user: "assistant", content: { text: "Here are your configured webhooks..." } },
    ],
    [
      { user: "user1", content: { text: "webhook create alerts discord https://discord.com/api/webhooks/xxx" } },
      { user: "assistant", content: { text: "Created Discord webhook for alerts..." } },
    ],
    [
      { user: "user1", content: { text: "test webhook wh_abc123" } },
      { user: "assistant", content: { text: "Sending test delivery..." } },
    ],
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("webhook") ||
      (text.includes("integration") && (text.includes("create") || text.includes("list") || text.includes("delete")))
    );
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    const originalText = message.content?.text || "";
    
    try {
      const words = originalText.split(/\s+/);
      const wordsLower = text.split(/\s+/);
      
      // Find webhook ID
      const webhookId = words.find(w => w.startsWith("wh_"));
      
      // List webhooks
      if (text.includes("list") || (text.includes("webhook") && wordsLower.length <= 2 && !text.includes("create"))) {
        const webhooks = getWebhooks();
        const response = formatWebhookList(webhooks);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Create webhook
      if (text.includes("create")) {
        // Parse: webhook create <name> <type> <url>
        // URL detection
        const urlMatch = originalText.match(/(https?:\/\/[^\s]+)/i);
        if (!urlMatch) {
          if (callback) {
            callback({ text: `⚠️ Please provide a webhook URL:

\`webhook create <name> <type> <url>\`

**Types:** ${WEBHOOK_TYPES.join(", ")}

**Examples:**
\`webhook create alerts discord https://discord.com/api/webhooks/...\`
\`webhook create research slack https://hooks.slack.com/...\`
\`webhook create all http https://myserver.com/webhook\`` });
          }
          return true;
        }
        
        const url = urlMatch[1];
        
        // Detect type from URL or explicit
        let type: WebhookType = "http";
        if (url.includes("discord.com")) type = "discord";
        else if (url.includes("slack.com") || url.includes("hooks.slack")) type = "slack";
        else if (url.includes("telegram") || url.includes("t.me")) type = "telegram";
        else if (wordsLower.includes("discord")) type = "discord";
        else if (wordsLower.includes("slack")) type = "slack";
        else if (wordsLower.includes("telegram")) type = "telegram";
        
        // Get name (first word that's not a command, type, or URL)
        const skipWords = ["webhook", "create", ...WEBHOOK_TYPES, ...EVENT_TYPES];
        const name = wordsLower.find(w => !skipWords.includes(w) && !w.startsWith("http")) || "webhook";
        
        // Get events (any matching event types)
        const events: EventType[] = wordsLower.filter(w => EVENT_TYPES.includes(w as EventType)) as EventType[];
        if (events.length === 0) events.push("all");
        
        const webhook = createWebhook({
          name,
          type,
          url,
          events,
          enabled: true,
        });
        
        const response = `✅ **Webhook Created**

**Name:** ${webhook.name}
**Type:** ${webhook.type}
**Events:** ${webhook.events.join(", ")}
**ID:** \`${webhook.id}\`

Test it: \`webhook test ${webhook.id}\`
View: \`webhook info ${webhook.id}\``;
        
        if (callback) callback({ text: response });
        return true;
      }
      
      // Delete webhook
      if (text.includes("delete") || text.includes("remove")) {
        if (!webhookId) {
          if (callback) callback({ text: "⚠️ Please specify webhook ID:\n`webhook delete <webhook_id>`" });
          return true;
        }
        
        const deleted = deleteWebhook(webhookId);
        if (callback) {
          callback({ text: deleted 
            ? `✅ Webhook deleted: ${webhookId}`
            : `❌ Webhook not found: ${webhookId}` 
          });
        }
        return true;
      }
      
      // Toggle webhook
      if (text.includes("toggle") || text.includes("enable") || text.includes("disable")) {
        if (!webhookId) {
          if (callback) callback({ text: "⚠️ Please specify webhook ID:\n`webhook toggle <webhook_id>`" });
          return true;
        }
        
        const toggled = toggleWebhook(webhookId);
        if (callback) {
          callback({ text: toggled 
            ? `✅ Webhook ${toggled.enabled ? "enabled" : "disabled"}: ${toggled.name}`
            : `❌ Webhook not found: ${webhookId}` 
          });
        }
        return true;
      }
      
      // Test webhook
      if (text.includes("test")) {
        if (!webhookId) {
          if (callback) callback({ text: "⚠️ Please specify webhook ID:\n`webhook test <webhook_id>`" });
          return true;
        }
        
        if (callback) callback({ text: `🔄 Sending test delivery to ${webhookId}...` });
        
        const delivery = await testWebhook(webhookId);
        
        if (callback) {
          callback({ text: delivery.status === "success"
            ? `✅ Test delivery successful!\n\nStatus: ${delivery.statusCode}\nDuration: ${delivery.duration}ms`
            : `❌ Test delivery failed: ${delivery.error}` 
          });
        }
        return true;
      }
      
      // Webhook info/details
      if (text.includes("info") || text.includes("detail")) {
        if (!webhookId) {
          if (callback) callback({ text: "⚠️ Please specify webhook ID:\n`webhook info <webhook_id>`" });
          return true;
        }
        
        const webhook = getWebhook(webhookId);
        if (!webhook) {
          if (callback) callback({ text: `❌ Webhook not found: ${webhookId}` });
          return true;
        }
        
        const response = formatWebhookDetails(webhook);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Delivery history
      if (text.includes("history") || text.includes("deliveries")) {
        const history = getDeliveryHistory(webhookId);
        const response = formatDeliveryHistory(history);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Default help
      const response = `🔗 **Webhook Integrations**

**Commands:**
• \`webhook list\` - View webhooks
• \`webhook create <name> <type> <url>\` - Create
• \`webhook delete <id>\` - Delete
• \`webhook toggle <id>\` - Enable/disable
• \`webhook info <id>\` - Details
• \`webhook test <id>\` - Send test
• \`webhook history\` - Delivery history

**Types:** ${WEBHOOK_TYPES.join(", ")}
**Events:** ${EVENT_TYPES.join(", ")}

**Examples:**
\`webhook create alerts discord https://discord.com/...\`
\`webhook create research slack https://hooks.slack.com/...\``;
      
      if (callback) callback({ text: response });
      return true;
      
    } catch (error) {
      logger.error("[Webhook] Error:", error);
      if (callback) {
        callback({ text: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}` });
      }
      return false;
    }
  },
};

export default webhookAction;
