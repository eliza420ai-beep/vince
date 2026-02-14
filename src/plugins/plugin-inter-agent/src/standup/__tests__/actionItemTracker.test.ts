/**
 * Tests for action item tracker (parseActionItemsFromReport, formatActionItemsTable, calculateWinRate, getActionItemsContext).
 * Uses temp dir via STANDUP_DELIVERABLES_DIR to avoid touching real data.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  addActionItem,
  updateActionItem,
  updateActionItemPriorities,
  getActionItemsByStatus,
  getPendingActionItems,
  getTodayActionItems,
  getRecentCompletedItems,
  calculateWinRate,
  formatActionItemsTable,
  parseActionItemsFromReport,
  getActionItemsContext,
  type ActionItem,
} from "../actionItemTracker";

const TEST_DIR = path.join(process.cwd(), "standup-deliverables-test-" + Date.now());

describe("actionItemTracker", () => {
  beforeEach(() => {
    process.env.STANDUP_DELIVERABLES_DIR = TEST_DIR;
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  describe("parseActionItemsFromReport", () => {
    it("returns empty array when no WHAT/HOW/WHY/OWNER table", () => {
      const report = "# Day Report\n\nNo table here.";
      expect(parseActionItemsFromReport(report, "2026-02-14")).toEqual([]);
    });

    it("parses action plan table rows", () => {
      const report = `
# Day Report

| WHAT | HOW | WHY | OWNER |
|------|-----|-----|-------|
| Ship script | Run tests | Deadline | @Sentinel |
| Remind Yves | DM | Follow-up | @Kelly |
`;
      const items = parseActionItemsFromReport(report, "2026-02-14");
      expect(items).toHaveLength(2);
      expect(items[0]).toMatchObject({
        date: "2026-02-14",
        what: "Ship script",
        how: "Run tests",
        why: "Deadline",
        owner: "Sentinel",
      });
      expect(items[1].owner).toBe("Kelly");
    });

    it("skips separator rows and OWNER header cell", () => {
      const report = `
| WHAT | HOW | WHY | OWNER |
|------|-----|-----|-------|
| Only row | x | y | @VINCE |
`;
      const items = parseActionItemsFromReport(report, "2026-02-14");
      expect(items).toHaveLength(1);
      expect(items[0].owner).toBe("VINCE");
    });
  });

  describe("formatActionItemsTable", () => {
    it("returns *No action items* when empty", () => {
      expect(formatActionItemsTable([])).toBe("*No action items*");
    });

    it("returns markdown table with headers when items present", () => {
      const items: ActionItem[] = [
        {
          id: "1",
          date: "2026-02-14",
          what: "Do thing",
          how: "Step",
          why: "Reason",
          owner: "Sentinel",
          urgency: "today",
          status: "new",
          createdAt: "",
          updatedAt: "",
        },
      ];
      const table = formatActionItemsTable(items);
      expect(table).toContain("| Date | Action | Owner | Status | Outcome |");
      expect(table).toContain("Sentinel");
      expect(table).toContain("🔵");
    });
  });

  describe("calculateWinRate", () => {
    it("returns 0 rate when no completed items with pnl", async () => {
      const { wins, losses, rate } = await calculateWinRate();
      expect(wins).toBe(0);
      expect(losses).toBe(0);
      expect(rate).toBe(0);
    });
  });

  describe("addActionItem / getPendingActionItems / getActionItemsByStatus", () => {
    it("adds item and returns it with id and status new", async () => {
      const added = await addActionItem({
        date: "2026-02-14",
        what: "Test task",
        how: "Steps",
        why: "Reason",
        owner: "Sentinel",
        urgency: "today",
      });
      expect(added.id).toMatch(/^ai-/);
      expect(added.status).toBe("new");
      expect(added.what).toBe("Test task");

      const pending = await getPendingActionItems();
      expect(pending.length).toBeGreaterThanOrEqual(1);
      expect(pending.some((p) => p.id === added.id)).toBe(true);

      const byStatus = await getActionItemsByStatus("new");
      expect(byStatus.some((p) => p.id === added.id)).toBe(true);
    });
  });

  describe("updateActionItem", () => {
    it("updates status and returns item", async () => {
      const added = await addActionItem({
        date: "2026-02-14",
        what: "Update me",
        how: "",
        why: "",
        owner: "VINCE",
        urgency: "today",
      });
      const updated = await updateActionItem(added.id, { status: "done", outcome: "Done." });
      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("done");
      expect(updated!.outcome).toBe("Done.");
      expect(updated!.completedAt).toBeDefined();
    });

    it("returns null for unknown id", async () => {
      expect(await updateActionItem("ai-nonexistent", { status: "done" })).toBe(null);
    });

    it("updates priority", async () => {
      const added = await addActionItem({
        date: "2026-02-14",
        what: "Priority item",
        how: "",
        why: "",
        owner: "X",
        urgency: "today",
      });
      const updated = await updateActionItem(added.id, { priority: 1 });
      expect(updated?.priority).toBe(1);
    });
  });

  describe("updateActionItemPriorities", () => {
    it("batch-updates priorities for multiple items", async () => {
      const a = await addActionItem({
        date: "2026-02-14",
        what: "First",
        how: "",
        why: "",
        owner: "A",
        urgency: "today",
      });
      const b = await addActionItem({
        date: "2026-02-14",
        what: "Second",
        how: "",
        why: "",
        owner: "B",
        urgency: "today",
      });
      await updateActionItemPriorities([
        { id: b.id, priority: 1 },
        { id: a.id, priority: 2 },
      ]);
      const pending = await getPendingActionItems();
      const foundA = pending.find((p) => p.id === a.id);
      const foundB = pending.find((p) => p.id === b.id);
      expect(foundA?.priority).toBe(2);
      expect(foundB?.priority).toBe(1);
    });
  });

  describe("getActionItemsContext", () => {
    it("returns markdown with Pending and optional Track Record", async () => {
      const context = await getActionItemsContext();
      expect(context).toContain("## Action Items Status");
      expect(context).toContain("### Pending");
    });
  });
});
