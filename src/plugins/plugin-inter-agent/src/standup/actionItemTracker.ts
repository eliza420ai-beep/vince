/**
 * Action Item Tracker
 *
 * Tracks action items from standups and their completion status.
 * Enables accountability: did we do what we said we'd do?
 *
 * Storage: standup-deliverables/action-items.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "@elizaos/core";

/** Action item status */
export type ActionItemStatus = "new" | "in_progress" | "done" | "cancelled" | "failed";

/** Action item urgency */
export type ActionItemUrgency = "now" | "today" | "this_week" | "backlog";

/** Action item */
export interface ActionItem {
  id: string;
  date: string;
  what: string;
  how: string;
  why: string;
  owner: string;
  urgency: ActionItemUrgency;
  status: ActionItemStatus;
  outcome?: string;
  pnl?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/** Action items store */
interface ActionItemStore {
  items: ActionItem[];
  lastUpdated: string;
}

/** Get the action items file path */
function getActionItemsPath(): string {
  const dir = process.env.STANDUP_DELIVERABLES_DIR?.trim() ||
    path.join(process.cwd(), "standup-deliverables");
  return path.join(dir, "action-items.json");
}

/** Load action items from disk */
function loadStore(): ActionItemStore {
  try {
    const filepath = getActionItemsPath();
    
    if (!fs.existsSync(filepath)) {
      return { items: [], lastUpdated: new Date().toISOString() };
    }

    const content = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    logger.warn({ err }, "[ActionItems] Failed to load store, starting fresh");
    return { items: [], lastUpdated: new Date().toISOString() };
  }
}

/** Save action items to disk */
function saveStore(store: ActionItemStore): void {
  try {
    const filepath = getActionItemsPath();
    const dir = path.dirname(filepath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(filepath, JSON.stringify(store, null, 2), "utf-8");
    logger.info(`[ActionItems] Saved ${store.items.length} items`);
  } catch (err) {
    logger.error({ err }, "[ActionItems] Failed to save store");
  }
}

/** Generate a unique ID */
function generateId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Add a new action item
 */
export function addActionItem(item: Omit<ActionItem, "id" | "status" | "createdAt" | "updatedAt">): ActionItem {
  const store = loadStore();
  
  const newItem: ActionItem = {
    ...item,
    id: generateId(),
    status: "new",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.items.push(newItem);
  saveStore(store);

  logger.info(`[ActionItems] Added: ${newItem.what} (${newItem.owner})`);
  return newItem;
}

/**
 * Update an action item's status
 */
export function updateActionItem(
  id: string,
  updates: Partial<Pick<ActionItem, "status" | "outcome" | "pnl">>
): ActionItem | null {
  const store = loadStore();
  const index = store.items.findIndex((item) => item.id === id);

  if (index === -1) {
    logger.warn(`[ActionItems] Item not found: ${id}`);
    return null;
  }

  store.items[index] = {
    ...store.items[index],
    ...updates,
    updatedAt: new Date().toISOString(),
    ...(updates.status === "done" || updates.status === "failed" || updates.status === "cancelled"
      ? { completedAt: new Date().toISOString() }
      : {}),
  };

  saveStore(store);
  logger.info(`[ActionItems] Updated ${id}: ${updates.status}`);
  return store.items[index];
}

/**
 * Get action items by status
 */
export function getActionItemsByStatus(status: ActionItemStatus): ActionItem[] {
  const store = loadStore();
  return store.items.filter((item) => item.status === status);
}

/**
 * Get pending action items (new or in_progress)
 */
export function getPendingActionItems(): ActionItem[] {
  const store = loadStore();
  return store.items.filter((item) => item.status === "new" || item.status === "in_progress");
}

/**
 * Get action items for today
 */
export function getTodayActionItems(): ActionItem[] {
  const store = loadStore();
  const today = new Date().toISOString().slice(0, 10);
  return store.items.filter((item) => item.date === today);
}

/**
 * Get recent completed action items with outcomes
 */
export function getRecentCompletedItems(days: number = 7): ActionItem[] {
  const store = loadStore();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return store.items
    .filter((item) => item.status === "done" && item.completedAt)
    .filter((item) => new Date(item.completedAt!) >= cutoff)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
}

/**
 * Calculate win rate from completed items
 */
export function calculateWinRate(): { wins: number; losses: number; rate: number } {
  const store = loadStore();
  const completed = store.items.filter((item) => item.status === "done" && item.pnl !== undefined);

  const wins = completed.filter((item) => (item.pnl || 0) > 0).length;
  const losses = completed.filter((item) => (item.pnl || 0) < 0).length;
  const rate = completed.length > 0 ? wins / completed.length : 0;

  return { wins, losses, rate };
}

/**
 * Format action items as markdown table
 */
export function formatActionItemsTable(items: ActionItem[]): string {
  if (items.length === 0) {
    return "*No action items*";
  }

  const statusEmoji: Record<ActionItemStatus, string> = {
    new: "🔵",
    in_progress: "🟡",
    done: "✅",
    cancelled: "⏹️",
    failed: "❌",
  };

  const rows = items.map((item) => {
    const status = statusEmoji[item.status];
    const outcome = item.pnl !== undefined ? `$${item.pnl > 0 ? "+" : ""}${item.pnl}` : item.outcome || "—";
    return `| ${item.date} | ${item.what.slice(0, 30)} | @${item.owner} | ${status} | ${outcome} |`;
  });

  return `| Date | Action | Owner | Status | Outcome |
|------|--------|-------|--------|---------|
${rows.join("\n")}`;
}

/**
 * Parse action items from a day report
 */
export function parseActionItemsFromReport(report: string, date: string): Partial<ActionItem>[] {
  const items: Partial<ActionItem>[] = [];

  // Look for action plan table
  const tableMatch = report.match(/\|\s*WHAT\s*\|\s*HOW\s*\|\s*WHY\s*\|\s*OWNER[\s\S]*?\n([\s\S]*?)(?=\n\n|\n#|$)/i);
  
  if (!tableMatch) return items;

  const rows = tableMatch[1].split("\n").filter((row) => row.trim().startsWith("|"));

  for (const row of rows) {
    const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 4 && !cells[0].match(/^-+$/)) {
      const owner = cells[3].replace("@", "").trim();
      if (owner && owner !== "OWNER") {
        items.push({
          date,
          what: cells[0],
          how: cells[1] || "",
          why: cells[2] || "",
          owner,
          urgency: cells[4]?.toLowerCase().includes("now") ? "now" : "today",
        });
      }
    }
  }

  return items;
}

/**
 * Get action items context for standup
 */
export function getActionItemsContext(): string {
  const pending = getPendingActionItems();
  const winRate = calculateWinRate();

  let context = "## Action Items Status\n\n";

  if (pending.length > 0) {
    context += `### Pending (${pending.length})\n${formatActionItemsTable(pending)}\n\n`;
  } else {
    context += "### Pending\n*All clear — no pending items*\n\n";
  }

  if (winRate.wins + winRate.losses > 0) {
    context += `### Track Record\n`;
    context += `- Win rate: ${(winRate.rate * 100).toFixed(0)}% (${winRate.wins}W/${winRate.losses}L)\n`;
  }

  return context;
}
