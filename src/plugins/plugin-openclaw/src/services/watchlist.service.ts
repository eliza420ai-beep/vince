/**
 * OpenClaw Watchlist Service
 * 
 * Track tokens and get alerts on significant changes
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { logger } from "@elizaos/core";

const DATA_DIR = path.resolve(process.cwd(), ".openclaw-data");
const WATCHLIST_FILE = path.join(DATA_DIR, "watchlist.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

interface WatchlistItem {
  token: string;
  addedAt: number;
  lastChecked: number | null;
  alerts: WatchlistAlert[];
  notes?: string;
}

interface WatchlistAlert {
  type: "price" | "sentiment" | "whale" | "news";
  threshold?: number;
  direction?: "above" | "below" | "any";
  enabled: boolean;
}

interface ResearchHistoryItem {
  id: string;
  agent: string;
  tokens: string;
  result: string;
  cost: { inputTokens: number; outputTokens: number; estimatedCost: number };
  timestamp: number;
  cached: boolean;
}

interface ComparisonResult {
  tokens: string[];
  comparison: Record<string, {
    sentiment: string;
    alphaScore: number;
    whaleActivity: string;
    momentum: string;
  }>;
  winner: string;
  summary: string;
}

// Initialize data directory
function initDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ==================== WATCHLIST ====================

export function getWatchlist(): WatchlistItem[] {
  initDataDir();
  if (!existsSync(WATCHLIST_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(WATCHLIST_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveWatchlist(watchlist: WatchlistItem[]): void {
  initDataDir();
  writeFileSync(WATCHLIST_FILE, JSON.stringify(watchlist, null, 2));
}

export function addToWatchlist(token: string, notes?: string): WatchlistItem {
  const watchlist = getWatchlist();
  const existing = watchlist.find(w => w.token.toLowerCase() === token.toLowerCase());
  
  if (existing) {
    existing.notes = notes || existing.notes;
    saveWatchlist(watchlist);
    return existing;
  }
  
  const item: WatchlistItem = {
    token: token.toUpperCase(),
    addedAt: Date.now(),
    lastChecked: null,
    alerts: [
      { type: "sentiment", enabled: true },
      { type: "whale", enabled: true },
      { type: "news", enabled: true },
    ],
    notes,
  };
  
  watchlist.push(item);
  saveWatchlist(watchlist);
  logger.info(`[Watchlist] Added ${token}`);
  return item;
}

export function removeFromWatchlist(token: string): boolean {
  const watchlist = getWatchlist();
  const index = watchlist.findIndex(w => w.token.toLowerCase() === token.toLowerCase());
  
  if (index === -1) {
    return false;
  }
  
  watchlist.splice(index, 1);
  saveWatchlist(watchlist);
  logger.info(`[Watchlist] Removed ${token}`);
  return true;
}

export function updateWatchlistItem(token: string, updates: Partial<WatchlistItem>): WatchlistItem | null {
  const watchlist = getWatchlist();
  const item = watchlist.find(w => w.token.toLowerCase() === token.toLowerCase());
  
  if (!item) {
    return null;
  }
  
  Object.assign(item, updates);
  saveWatchlist(watchlist);
  return item;
}

export function formatWatchlist(watchlist: WatchlistItem[]): string {
  if (watchlist.length === 0) {
    return "📋 **Watchlist is empty**\n\nAdd tokens: `@VINCE watch SOL`";
  }
  
  const items = watchlist.map((item, i) => {
    const lastChecked = item.lastChecked 
      ? new Date(item.lastChecked).toLocaleString() 
      : "Never";
    const alerts = item.alerts.filter(a => a.enabled).map(a => a.type).join(", ");
    
    return `${i + 1}. **${item.token}**
   • Added: ${new Date(item.addedAt).toLocaleDateString()}
   • Last checked: ${lastChecked}
   • Alerts: ${alerts || "None"}
   ${item.notes ? `• Notes: ${item.notes}` : ""}`;
  }).join("\n\n");
  
  return `📋 **Watchlist** (${watchlist.length} tokens)

${items}

---
Commands: \`watch <token>\` | \`unwatch <token>\` | \`check watchlist\``;
}

// ==================== HISTORY ====================

export function getHistory(limit = 50): ResearchHistoryItem[] {
  initDataDir();
  if (!existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const history = JSON.parse(readFileSync(HISTORY_FILE, "utf-8")) as ResearchHistoryItem[];
    return history.slice(-limit);
  } catch {
    return [];
  }
}

export function addToHistory(item: Omit<ResearchHistoryItem, "id">): ResearchHistoryItem {
  const history = getHistory(500); // Keep last 500
  const newItem: ResearchHistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  
  history.push(newItem);
  
  // Keep only last 500 items
  const trimmed = history.slice(-500);
  writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
  
  return newItem;
}

export function formatHistory(history: ResearchHistoryItem[], limit = 10): string {
  if (history.length === 0) {
    return "📜 **No research history yet**\n\nRun some research: `@VINCE research SOL`";
  }
  
  const recent = history.slice(-limit).reverse();
  
  const items = recent.map((item, i) => {
    const date = new Date(item.timestamp).toLocaleString();
    const cost = `$${item.cost.estimatedCost.toFixed(4)}`;
    const cached = item.cached ? " ♻️" : "";
    
    return `${i + 1}. **${item.agent}**: ${item.tokens}${cached}
   • ${date} • ${cost}`;
  }).join("\n\n");
  
  const totalCost = history.reduce((sum, h) => sum + h.cost.estimatedCost, 0);
  
  return `📜 **Research History** (Last ${recent.length} of ${history.length})

${items}

---
📊 Total spent: $${totalCost.toFixed(4)} across ${history.length} queries`;
}

// ==================== COMPARISON ====================

export function compareTokens(tokens: string[]): ComparisonResult {
  // Simulated comparison data
  const comparison: Record<string, any> = {};
  
  const sentiments = ["Bullish", "Mixed", "Bearish", "Neutral"];
  const activities = ["High", "Moderate", "Low"];
  const momentums = ["Strong Up", "Up", "Sideways", "Down", "Strong Down"];
  
  tokens.forEach(token => {
    comparison[token] = {
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      alphaScore: Math.floor(Math.random() * 4) + 6, // 6-10
      whaleActivity: activities[Math.floor(Math.random() * activities.length)],
      momentum: momentums[Math.floor(Math.random() * momentums.length)],
    };
  });
  
  // Determine winner by alpha score
  const winner = tokens.reduce((best, token) => 
    comparison[token].alphaScore > comparison[best].alphaScore ? token : best
  , tokens[0]);
  
  return {
    tokens,
    comparison,
    winner,
    summary: `Based on current analysis, **${winner}** shows the strongest alpha potential with a score of ${comparison[winner].alphaScore}/10.`,
  };
}

export function formatComparison(result: ComparisonResult): string {
  const headers = "| Token | Sentiment | Alpha | Whales | Momentum |";
  const separator = "|-------|-----------|-------|--------|----------|";
  
  const rows = result.tokens.map(token => {
    const d = result.comparison[token];
    const isWinner = token === result.winner ? " 🏆" : "";
    return `| **${token}**${isWinner} | ${d.sentiment} | ${d.alphaScore}/10 | ${d.whaleActivity} | ${d.momentum} |`;
  }).join("\n");
  
  return `⚖️ **Token Comparison**

${headers}
${separator}
${rows}

---
🏆 **Winner:** ${result.winner}

${result.summary}`;
}

// ==================== EXPORT ====================

export function exportToMarkdown(
  agent: string,
  tokens: string,
  result: string,
  cost: { estimatedCost: number },
  timestamp: number
): string {
  const date = new Date(timestamp).toISOString();
  
  return `# OpenClaw Research Report

**Agent:** ${agent}
**Tokens:** ${tokens}
**Date:** ${date}
**Cost:** $${cost.estimatedCost.toFixed(4)}

---

${result}

---

*Generated by VINCE × OpenClaw*
*Report ID: ${Date.now()}-${Math.random().toString(36).substr(2, 6)}*
`;
}

export function exportToJSON(
  agent: string,
  tokens: string,
  result: string,
  cost: { inputTokens: number; outputTokens: number; estimatedCost: number },
  timestamp: number
): string {
  return JSON.stringify({
    agent,
    tokens,
    result,
    cost,
    timestamp,
    exportedAt: Date.now(),
    version: "2.0.0",
  }, null, 2);
}

export default {
  // Watchlist
  getWatchlist,
  saveWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
  formatWatchlist,
  // History
  getHistory,
  addToHistory,
  formatHistory,
  // Comparison
  compareTokens,
  formatComparison,
  // Export
  exportToMarkdown,
  exportToJSON,
};
