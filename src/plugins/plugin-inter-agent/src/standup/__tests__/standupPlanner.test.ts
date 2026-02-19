/**
 * Unit tests for standup planner (prioritizeActionItems).
 */

import { describe, it, expect } from "bun:test";
import { prioritizeActionItems } from "../standupPlanner";
import type { ActionItem } from "../actionItemTracker";

function item(
  overrides: Partial<ActionItem> & { what: string; owner: string },
): ActionItem {
  const now = new Date().toISOString();
  return {
    id: `ai-${Math.random().toString(36).slice(2, 9)}`,
    date: now.slice(0, 10),
    what: overrides.what,
    how: overrides.how ?? "",
    why: overrides.why ?? "",
    owner: overrides.owner,
    urgency: overrides.urgency ?? "today",
    status: overrides.status ?? "new",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("standupPlanner", () => {
  describe("prioritizeActionItems", () => {
    it("returns empty array when no items", () => {
      expect(prioritizeActionItems([])).toEqual([]);
    });

    it("assigns priority 1..N by urgency (now before today before this_week before backlog)", () => {
      const items: ActionItem[] = [
        item({
          what: "B",
          owner: "X",
          urgency: "today",
          createdAt: "2026-02-14T10:00:00Z",
        }),
        item({
          what: "A",
          owner: "X",
          urgency: "now",
          createdAt: "2026-02-14T09:00:00Z",
        }),
        item({
          what: "C",
          owner: "X",
          urgency: "backlog",
          createdAt: "2026-02-14T08:00:00Z",
        }),
      ];
      const result = prioritizeActionItems(items);
      expect(result).toHaveLength(3);
      expect(
        result.map((r) => ({ what: r.what, priority: r.priority })),
      ).toEqual([
        { what: "A", priority: 1 },
        { what: "B", priority: 2 },
        { what: "C", priority: 3 },
      ]);
    });

    it("sorts by createdAt within same urgency", () => {
      const items: ActionItem[] = [
        item({
          what: "Second",
          owner: "X",
          urgency: "today",
          createdAt: "2026-02-14T11:00:00Z",
        }),
        item({
          what: "First",
          owner: "X",
          urgency: "today",
          createdAt: "2026-02-14T10:00:00Z",
        }),
      ];
      const result = prioritizeActionItems(items);
      expect(result[0].what).toBe("First");
      expect(result[0].priority).toBe(1);
      expect(result[1].what).toBe("Second");
      expect(result[1].priority).toBe(2);
    });

    it("does not mutate input items", () => {
      const items: ActionItem[] = [
        item({ what: "Only", owner: "X", urgency: "today" }),
      ];
      const before = items[0].priority;
      const result = prioritizeActionItems(items);
      expect(items[0].priority).toBe(before);
      expect(result[0].priority).toBe(1);
    });
  });
});
