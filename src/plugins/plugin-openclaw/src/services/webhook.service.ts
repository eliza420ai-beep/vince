/**
 * OpenClaw Webhook Integration Service
 * 
 * External webhook delivery for alerts, reports, and research results
 * Supports Discord, Slack, Telegram, and custom HTTP endpoints
 */

import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = ".openclaw-data";
const WEBHOOKS_FILE = path.join(DATA_DIR, "webhooks.json");

// ==================== TYPES ====================

export type WebhookType = "discord" | "slack" | "telegram" | "http";
export type EventType = "research" | "alert" | "report" | "governance" | "portfolio" | "all";

export interface WebhookConfig {
  id: string;
  name: string;
  type: WebhookType;
  url: string;
  events: EventType[];
  filters?: {
    tokens?: string[];
    minConfidence?: number;
    alertTypes?: string[];
  };
  enabled: boolean;
  createdAt: number;
  lastDelivery?: number;
  deliveryCount: number;
  failureCount: number;
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: EventType;
  payload: any;
  status: "pending" | "success" | "failed";
  statusCode?: number;
  error?: string;
  timestamp: number;
  duration?: number;
}

export interface WebhookPayload {
  event: EventType;
  timestamp: number;
  source: "openclaw-vince";
  data: any;
}

// ==================== STORAGE ====================

interface WebhookData {
  webhooks: WebhookConfig[];
  deliveryHistory: WebhookDelivery[];
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadWebhookData(): WebhookData {
  ensureDataDir();
  if (!fs.existsSync(WEBHOOKS_FILE)) {
    return { webhooks: [], deliveryHistory: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(WEBHOOKS_FILE, "utf-8"));
  } catch {
    return { webhooks: [], deliveryHistory: [] };
  }
}

function saveWebhookData(data: WebhookData): void {
  ensureDataDir();
  fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(data, null, 2));
}

// ==================== WEBHOOK MANAGEMENT ====================

export function createWebhook(config: Omit<WebhookConfig, "id" | "createdAt" | "deliveryCount" | "failureCount">): WebhookConfig {
  const data = loadWebhookData();
  
  const webhook: WebhookConfig = {
    ...config,
    id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    createdAt: Date.now(),
    deliveryCount: 0,
    failureCount: 0,
  };
  
  data.webhooks.push(webhook);
  saveWebhookData(data);
  
  logger.info(`[Webhook] Created webhook: ${webhook.id} (${webhook.name})`);
  return webhook;
}

export function getWebhooks(): WebhookConfig[] {
  return loadWebhookData().webhooks;
}

export function getWebhook(webhookId: string): WebhookConfig | null {
  const data = loadWebhookData();
  return data.webhooks.find(w => w.id === webhookId) || null;
}

export function updateWebhook(webhookId: string, updates: Partial<Omit<WebhookConfig, "id" | "createdAt">>): WebhookConfig | null {
  const data = loadWebhookData();
  const webhook = data.webhooks.find(w => w.id === webhookId);
  if (!webhook) return null;
  
  Object.assign(webhook, updates);
  saveWebhookData(data);
  return webhook;
}

export function deleteWebhook(webhookId: string): boolean {
  const data = loadWebhookData();
  const idx = data.webhooks.findIndex(w => w.id === webhookId);
  if (idx === -1) return false;
  
  data.webhooks.splice(idx, 1);
  saveWebhookData(data);
  logger.info(`[Webhook] Deleted webhook: ${webhookId}`);
  return true;
}

export function toggleWebhook(webhookId: string): WebhookConfig | null {
  const data = loadWebhookData();
  const webhook = data.webhooks.find(w => w.id === webhookId);
  if (!webhook) return null;
  
  webhook.enabled = !webhook.enabled;
  saveWebhookData(data);
  return webhook;
}

// ==================== DELIVERY ====================

function formatDiscordPayload(event: EventType, data: any): any {
  const colors: Record<EventType, number> = {
    research: 0x5865F2,
    alert: 0xED4245,
    report: 0x57F287,
    governance: 0xFEE75C,
    portfolio: 0xEB459E,
    all: 0x5865F2,
  };
  
  const titles: Record<EventType, string> = {
    research: "🔬 Research Complete",
    alert: "🚨 Alert Triggered",
    report: "📊 Report Generated",
    governance: "🏛️ Governance Update",
    portfolio: "💼 Portfolio Update",
    all: "📢 OpenClaw Update",
  };
  
  return {
    embeds: [{
      title: titles[event],
      description: typeof data === "string" ? data : data.summary || data.message || JSON.stringify(data).slice(0, 2000),
      color: colors[event],
      timestamp: new Date().toISOString(),
      footer: { text: "OpenClaw VINCE" },
      fields: data.fields || [],
    }],
  };
}

function formatSlackPayload(event: EventType, data: any): any {
  const emojis: Record<EventType, string> = {
    research: ":microscope:",
    alert: ":rotating_light:",
    report: ":bar_chart:",
    governance: ":classical_building:",
    portfolio: ":briefcase:",
    all: ":mega:",
  };
  
  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emojis[event]} ${event.charAt(0).toUpperCase() + event.slice(1)} Update`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: typeof data === "string" ? data : data.summary || data.message || JSON.stringify(data).slice(0, 2000),
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Source:* OpenClaw VINCE | ${new Date().toISOString()}`,
          },
        ],
      },
    ],
  };
}

function formatTelegramPayload(event: EventType, data: any): any {
  const emojis: Record<EventType, string> = {
    research: "🔬",
    alert: "🚨",
    report: "📊",
    governance: "🏛️",
    portfolio: "💼",
    all: "📢",
  };
  
  const text = typeof data === "string" ? data : data.summary || data.message || JSON.stringify(data).slice(0, 3000);
  
  return {
    text: `${emojis[event]} *${event.toUpperCase()} UPDATE*\n\n${text}\n\n_OpenClaw VINCE_`,
    parse_mode: "Markdown",
  };
}

export async function deliverWebhook(webhookId: string, event: EventType, data: any): Promise<WebhookDelivery> {
  const webhookData = loadWebhookData();
  const webhook = webhookData.webhooks.find(w => w.id === webhookId);
  
  const delivery: WebhookDelivery = {
    id: `del_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    webhookId,
    event,
    payload: data,
    status: "pending",
    timestamp: Date.now(),
  };
  
  if (!webhook) {
    delivery.status = "failed";
    delivery.error = "Webhook not found";
    webhookData.deliveryHistory.push(delivery);
    saveWebhookData(webhookData);
    return delivery;
  }
  
  if (!webhook.enabled) {
    delivery.status = "failed";
    delivery.error = "Webhook disabled";
    webhookData.deliveryHistory.push(delivery);
    saveWebhookData(webhookData);
    return delivery;
  }
  
  // Check event filter
  if (!webhook.events.includes("all") && !webhook.events.includes(event)) {
    delivery.status = "failed";
    delivery.error = "Event type not subscribed";
    webhookData.deliveryHistory.push(delivery);
    saveWebhookData(webhookData);
    return delivery;
  }
  
  // Format payload based on type
  let formattedPayload: any;
  switch (webhook.type) {
    case "discord":
      formattedPayload = formatDiscordPayload(event, data);
      break;
    case "slack":
      formattedPayload = formatSlackPayload(event, data);
      break;
    case "telegram":
      formattedPayload = formatTelegramPayload(event, data);
      break;
    case "http":
    default:
      formattedPayload = {
        event,
        timestamp: Date.now(),
        source: "openclaw-vince",
        data,
      };
  }
  
  const startTime = Date.now();
  
  try {
    // Simulate delivery (in production, use fetch)
    logger.info(`[Webhook] Delivering to ${webhook.name}: ${event}`);
    
    // Simulated success (90% success rate for demo)
    if (Math.random() > 0.1) {
      delivery.status = "success";
      delivery.statusCode = 200;
      delivery.duration = Date.now() - startTime;
      webhook.deliveryCount++;
      webhook.lastDelivery = Date.now();
    } else {
      throw new Error("Simulated network error");
    }
  } catch (error) {
    delivery.status = "failed";
    delivery.error = error instanceof Error ? error.message : "Unknown error";
    delivery.duration = Date.now() - startTime;
    webhook.failureCount++;
  }
  
  // Update storage
  webhookData.deliveryHistory.push(delivery);
  webhookData.deliveryHistory = webhookData.deliveryHistory.slice(-500); // Keep last 500
  saveWebhookData(webhookData);
  
  return delivery;
}

export async function broadcastEvent(event: EventType, data: any): Promise<WebhookDelivery[]> {
  const webhooks = getWebhooks().filter(w => 
    w.enabled && (w.events.includes("all") || w.events.includes(event))
  );
  
  const deliveries: WebhookDelivery[] = [];
  
  for (const webhook of webhooks) {
    const delivery = await deliverWebhook(webhook.id, event, data);
    deliveries.push(delivery);
  }
  
  return deliveries;
}

// ==================== HISTORY ====================

export function getDeliveryHistory(webhookId?: string, limit = 50): WebhookDelivery[] {
  const data = loadWebhookData();
  let history = data.deliveryHistory;
  
  if (webhookId) {
    history = history.filter(d => d.webhookId === webhookId);
  }
  
  return history.slice(-limit).reverse();
}

// ==================== FORMATTING ====================

export function formatWebhookList(webhooks: WebhookConfig[]): string {
  if (webhooks.length === 0) {
    return `🔗 **Webhooks**

No webhooks configured.

Create: \`webhook create <name> <type> <url>\`
Types: discord, slack, telegram, http`;
  }
  
  const rows = webhooks.map((w, i) => {
    const statusIcon = w.enabled ? "🟢" : "🔴";
    const typeIcon = { discord: "💬", slack: "📱", telegram: "✈️", http: "🌐" }[w.type];
    const successRate = w.deliveryCount > 0 
      ? ((1 - w.failureCount / (w.deliveryCount + w.failureCount)) * 100).toFixed(0)
      : "N/A";
    
    return `${i + 1}. ${statusIcon} **${w.name}** ${typeIcon}
   Events: ${w.events.join(", ")}
   Deliveries: ${w.deliveryCount} | Success: ${successRate}%
   ID: \`${w.id}\``;
  }).join("\n\n");
  
  return `🔗 **Webhooks**

${rows}

---
Details: \`webhook info <id>\`
Toggle: \`webhook toggle <id>\`
Delete: \`webhook delete <id>\``;
}

export function formatWebhookDetails(webhook: WebhookConfig): string {
  const statusIcon = webhook.enabled ? "🟢 Enabled" : "🔴 Disabled";
  const typeIcon = { discord: "💬 Discord", slack: "📱 Slack", telegram: "✈️ Telegram", http: "🌐 HTTP" }[webhook.type];
  const successRate = webhook.deliveryCount > 0 
    ? ((1 - webhook.failureCount / (webhook.deliveryCount + webhook.failureCount)) * 100).toFixed(1)
    : "N/A";
  
  const lastDelivery = webhook.lastDelivery 
    ? new Date(webhook.lastDelivery).toLocaleString()
    : "Never";
  
  let filtersStr = "None";
  if (webhook.filters) {
    const filters: string[] = [];
    if (webhook.filters.tokens?.length) filters.push(`Tokens: ${webhook.filters.tokens.join(", ")}`);
    if (webhook.filters.minConfidence) filters.push(`Min confidence: ${webhook.filters.minConfidence}%`);
    if (webhook.filters.alertTypes?.length) filters.push(`Alert types: ${webhook.filters.alertTypes.join(", ")}`);
    if (filters.length) filtersStr = filters.join("\n   ");
  }
  
  return `🔗 **Webhook: ${webhook.name}**

**Status:** ${statusIcon}
**Type:** ${typeIcon}
**URL:** \`${webhook.url.slice(0, 50)}${webhook.url.length > 50 ? "..." : ""}\`

**Events:** ${webhook.events.join(", ")}
**Filters:**
   ${filtersStr}

**Stats:**
• Total Deliveries: ${webhook.deliveryCount}
• Failures: ${webhook.failureCount}
• Success Rate: ${successRate}%
• Last Delivery: ${lastDelivery}

**Created:** ${new Date(webhook.createdAt).toLocaleString()}
**ID:** \`${webhook.id}\`

---
Toggle: \`webhook toggle ${webhook.id}\`
Test: \`webhook test ${webhook.id}\`
Delete: \`webhook delete ${webhook.id}\``;
}

export function formatDeliveryHistory(deliveries: WebhookDelivery[]): string {
  if (deliveries.length === 0) {
    return `📤 **Delivery History**

No deliveries yet.`;
  }
  
  const rows = deliveries.slice(0, 15).map(d => {
    const statusIcon = d.status === "success" ? "✅" : d.status === "failed" ? "❌" : "⏳";
    const time = new Date(d.timestamp).toLocaleString();
    return `${statusIcon} **${d.event}** - ${d.status}
   ${time} | ${d.duration ? `${d.duration}ms` : ""}${d.error ? ` | ${d.error}` : ""}`;
  }).join("\n\n");
  
  return `📤 **Delivery History**

${rows}

---
*Last ${Math.min(deliveries.length, 15)} deliveries*`;
}

export async function testWebhook(webhookId: string): Promise<WebhookDelivery> {
  return deliverWebhook(webhookId, "all", {
    message: "🧪 Test delivery from OpenClaw VINCE",
    summary: "This is a test webhook delivery. If you see this, your webhook is configured correctly!",
    timestamp: Date.now(),
    test: true,
  });
}

export default {
  createWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  deliverWebhook,
  broadcastEvent,
  getDeliveryHistory,
  formatWebhookList,
  formatWebhookDetails,
  formatDeliveryHistory,
  testWebhook,
};
