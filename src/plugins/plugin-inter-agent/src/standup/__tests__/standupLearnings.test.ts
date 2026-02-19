/**
 * Unit tests for standup learnings (appendLearning).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { appendLearning } from "../standupLearnings";
import type { ActionItem } from "../actionItemTracker";

const TEST_DIR = path.join(
  process.cwd(),
  "standup-learnings-test-" + Date.now(),
);

function item(overrides: Partial<ActionItem> = {}): ActionItem {
  const now = new Date().toISOString();
  return {
    id: "ai-learn-1",
    date: now.slice(0, 10),
    what: "Ship the script",
    how: "Run tests",
    why: "Deadline",
    owner: "Sentinel",
    urgency: "today",
    status: "done",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("standupLearnings", () => {
  beforeEach(async () => {
    process.env.STANDUP_DELIVERABLES_DIR = TEST_DIR;
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("appendLearning", () => {
    it("creates file and appends first entry", async () => {
      const actionItem = item();
      await appendLearning(actionItem, "Deliverable written to prds/foo.md");
      const filepath = path.join(TEST_DIR, "standup-learnings.md");
      const content = await fs.readFile(filepath, "utf-8");
      expect(content).toContain("Standup learnings");
      expect(content).toContain("Ship the script");
      expect(content).toContain("Sentinel");
      expect(content).toContain("Deliverable written to prds/foo.md");
    });

    it("appends second entry without overwriting", async () => {
      const actionItem = item({
        id: "ai-2",
        what: "Second item",
        owner: "Kelly",
      });
      await appendLearning(item({ id: "ai-1" }), "First outcome");
      await appendLearning(actionItem, "Second outcome");
      const filepath = path.join(TEST_DIR, "standup-learnings.md");
      const content = await fs.readFile(filepath, "utf-8");
      expect(content).toContain("First outcome");
      expect(content).toContain("Second outcome");
      expect(content).toContain("Second item");
    });

    it("includes optional learning sentence", async () => {
      await appendLearning(item(), "Done", "We learned to run tests first.");
      const filepath = path.join(TEST_DIR, "standup-learnings.md");
      const content = await fs.readFile(filepath, "utf-8");
      expect(content).toContain("Learning: We learned to run tests first.");
    });
  });
});
