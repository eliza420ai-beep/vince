/**
 * Standup planner: prioritize action items for the Ralph loop.
 * Rule-based order: urgency (now < today < this_week < backlog), then createdAt.
 */

import type { ActionItem, ActionItemUrgency } from "./actionItemTracker";

const URGENCY_ORDER: ActionItemUrgency[] = ["now", "today", "this_week", "backlog"];

function urgencyRank(u: ActionItemUrgency | undefined): number {
  const i = URGENCY_ORDER.indexOf(u ?? "today");
  return i === -1 ? URGENCY_ORDER.length : i;
}

/**
 * Return items with priority set (1 = do first). Does not mutate; returns new array.
 */
export function prioritizeActionItems(items: ActionItem[]): ActionItem[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    const ur = urgencyRank(a.urgency);
    const br = urgencyRank(b.urgency);
    if (ur !== br) return ur - br;
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });

  return sorted.map((item, index) => ({
    ...item,
    priority: index + 1,
  }));
}
