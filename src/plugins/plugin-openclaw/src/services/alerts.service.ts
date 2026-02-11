/**
 * OpenClaw Alerts Service
 * 
 * Real-time alerts for price, sentiment, whale activity
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { logger } from "@elizaos/core";
import { EventEmitter } from "events";

const DATA_DIR = path.resolve(process.cwd(), ".openclaw-data");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");

export const alertEmitter = new EventEmitter();

type AlertType = "price" | "sentiment" | "whale" | "volume" | "news";
type AlertCondition = "above" | "below" | "change";

interface Alert {
  id: string;
  token: string;
  type: AlertType;
  condition: AlertCondition;
  value: number;
  enabled: boolean;
  triggered: boolean;
  triggeredAt?: number;
  createdAt: number;
  message?: string;
}

interface TriggeredAlert {
  alert: Alert;
  currentValue: number;
  message: string;
  timestamp: number;
}

// Initialize
function initDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Get all alerts
export function getAlerts(): Alert[] {
  initDataDir();
  if (!existsSync(ALERTS_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(ALERTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

// Save alerts
export function saveAlerts(alerts: Alert[]): void {
  initDataDir();
  writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

// Create alert
export function createAlert(
  token: string,
  type: AlertType,
  condition: AlertCondition,
  value: number,
  message?: string
): Alert {
  const alerts = getAlerts();
  
  const alert: Alert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    token: token.toUpperCase(),
    type,
    condition,
    value,
    enabled: true,
    triggered: false,
    createdAt: Date.now(),
    message,
  };
  
  alerts.push(alert);
  saveAlerts(alerts);
  
  logger.info(`[Alerts] Created: ${alert.id} for ${token} (${type} ${condition} ${value})`);
  return alert;
}

// Delete alert
export function deleteAlert(id: string): boolean {
  const alerts = getAlerts();
  const index = alerts.findIndex(a => a.id === id);
  
  if (index === -1) return false;
  
  alerts.splice(index, 1);
  saveAlerts(alerts);
  
  logger.info(`[Alerts] Deleted: ${id}`);
  return true;
}

// Toggle alert
export function toggleAlert(id: string): Alert | null {
  const alerts = getAlerts();
  const alert = alerts.find(a => a.id === id);
  
  if (!alert) return null;
  
  alert.enabled = !alert.enabled;
  saveAlerts(alerts);
  
  return alert;
}

// Check alerts against current values
export function checkAlerts(token: string, values: { price?: number; sentiment?: number; volume?: number }): TriggeredAlert[] {
  const alerts = getAlerts();
  const triggered: TriggeredAlert[] = [];
  
  const tokenAlerts = alerts.filter(a => 
    a.enabled && 
    !a.triggered && 
    a.token.toLowerCase() === token.toLowerCase()
  );
  
  for (const alert of tokenAlerts) {
    let currentValue: number | undefined;
    
    switch (alert.type) {
      case "price":
        currentValue = values.price;
        break;
      case "sentiment":
        currentValue = values.sentiment;
        break;
      case "volume":
        currentValue = values.volume;
        break;
    }
    
    if (currentValue === undefined) continue;
    
    let shouldTrigger = false;
    
    switch (alert.condition) {
      case "above":
        shouldTrigger = currentValue >= alert.value;
        break;
      case "below":
        shouldTrigger = currentValue <= alert.value;
        break;
      case "change":
        // Percentage change (simplified)
        shouldTrigger = Math.abs(currentValue) >= alert.value;
        break;
    }
    
    if (shouldTrigger) {
      alert.triggered = true;
      alert.triggeredAt = Date.now();
      
      const msg = alert.message || `${alert.token} ${alert.type} is ${alert.condition} ${alert.value}`;
      
      triggered.push({
        alert,
        currentValue,
        message: msg,
        timestamp: Date.now(),
      });
      
      // Emit event
      alertEmitter.emit("triggered", { alert, currentValue, message: msg });
    }
  }
  
  if (triggered.length > 0) {
    saveAlerts(alerts);
  }
  
  return triggered;
}

// Format alerts
export function formatAlerts(alerts: Alert[]): string {
  if (alerts.length === 0) {
    return `🔔 **No alerts set**

Create one: \`@VINCE alert SOL price above 100\``;
  }
  
  const active = alerts.filter(a => a.enabled && !a.triggered);
  const triggered = alerts.filter(a => a.triggered);
  
  let text = `🔔 **Alerts** (${alerts.length})

`;
  
  if (active.length > 0) {
    text += `**Active (${active.length}):**\n`;
    active.forEach((a, i) => {
      text += `${i + 1}. **${a.token}** - ${a.type} ${a.condition} ${a.value}
   ID: \`${a.id}\`\n`;
    });
  }
  
  if (triggered.length > 0) {
    text += `\n**Triggered (${triggered.length}):**\n`;
    triggered.forEach((a, i) => {
      const time = a.triggeredAt ? new Date(a.triggeredAt).toLocaleString() : "Unknown";
      text += `${i + 1}. ✅ **${a.token}** - ${a.type} ${a.condition} ${a.value} (${time})\n`;
    });
  }
  
  text += `
---
Commands:
• \`alert <token> <type> <condition> <value>\`
• \`delete alert <id>\`
• Types: price, sentiment, whale, volume`;
  
  return text;
}

// Get alert type icon
export function getAlertIcon(type: AlertType): string {
  const icons: Record<AlertType, string> = {
    price: "💰",
    sentiment: "🎭",
    whale: "🐋",
    volume: "📊",
    news: "📰",
  };
  return icons[type] || "🔔";
}

// Format triggered alert
export function formatTriggeredAlert(triggered: TriggeredAlert): string {
  const icon = getAlertIcon(triggered.alert.type);
  return `${icon} **ALERT: ${triggered.alert.token}**

${triggered.message}

Current value: ${triggered.currentValue}
Triggered: ${new Date(triggered.timestamp).toLocaleString()}`;
}

export default {
  getAlerts,
  createAlert,
  deleteAlert,
  toggleAlert,
  checkAlerts,
  formatAlerts,
  formatTriggeredAlert,
  alertEmitter,
};
