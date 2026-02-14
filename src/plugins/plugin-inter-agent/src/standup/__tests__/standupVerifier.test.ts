/**
 * Unit tests for standup verifier (verifyActionItem).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { verifyActionItem } from "../standupVerifier";
import type { ActionItem } from "../actionItemTracker";

const TEST_DIR = path.join(process.cwd(), "standup-verifier-test-" + Date.now());

function item(overrides: Partial<ActionItem> = {}): ActionItem {
  const now = new Date().toISOString();
  return {
    id: "ai-test-1",
    date: now.slice(0, 10),
    what: "Test item",
    how: "",
    why: "",
    owner: "Sentinel",
    urgency: "today",
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("standupVerifier", () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("verifyActionItem", () => {
    it("returns ok: false when result is null", async () => {
      const runtime = {} as any;
      const result = await verifyActionItem(runtime, item(), null);
      expect(result.ok).toBe(false);
      expect(result.message).toContain("No result");
    });

    it("returns ok: true when result has only message (e.g. remind sent)", async () => {
      const runtime = {} as any;
      const result = await verifyActionItem(runtime, item(), { message: "remind sent" });
      expect(result.ok).toBe(true);
    });

    it("returns ok: false when path does not exist", async () => {
      const runtime = {} as any;
      const result = await verifyActionItem(runtime, item(), {
        path: path.join(TEST_DIR, "nonexistent.txt"),
      });
      expect(result.ok).toBe(false);
      expect(result.message).toBeDefined();
    });

    it("returns ok: false when path is empty file", async () => {
      const filepath = path.join(TEST_DIR, "empty.txt");
      await fs.writeFile(filepath, "", "utf-8");
      const runtime = {} as any;
      const result = await verifyActionItem(runtime, item(), { path: filepath });
      expect(result.ok).toBe(false);
      expect(result.message).toContain("empty");
    });

    it("returns ok: true when path exists and is non-empty", async () => {
      const filepath = path.join(TEST_DIR, "content.md");
      await fs.writeFile(filepath, "# Hello\n\nContent here.", "utf-8");
      const runtime = {} as any;
      const result = await verifyActionItem(runtime, item(), { path: filepath });
      expect(result.ok).toBe(true);
    });
  });
});
