/**
 * ResearchQueueService Tests (#71)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ResearchQueueService } from "../services/researchQueue.service";

let tmpDir: string;
let svc: ResearchQueueService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "research-queue-test-"));
  svc = new ResearchQueueService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("ResearchQueueService", () => {
  describe("addToQueue", () => {
    it("adds an item and returns it with id + addedAt", () => {
      const item = svc.addToQueue({
        topic: "BTC narrative analysis",
        asset: "BTC",
        priority: "high",
        source: "manual",
        assignedTo: "vince",
      });

      expect(item.id).toBeTruthy();
      expect(item.addedAt).toBeTruthy();
      expect(item.topic).toBe("BTC narrative analysis");
      expect(item.priority).toBe("high");
      expect(item.assignedTo).toBe("vince");
      expect(item.completedAt).toBeUndefined();
    });

    it("persists to disk", () => {
      svc.addToQueue({
        topic: "ETH research",
        priority: "medium",
        source: "manual",
        assignedTo: "echo",
      });
      const svc2 = new ResearchQueueService(tmpDir);
      const queue = svc2.getQueue();
      expect(queue).toHaveLength(1);
    });
  });

  describe("getQueue", () => {
    it("returns only uncompleted items", () => {
      const item = svc.addToQueue({
        topic: "SOL",
        priority: "low",
        source: "manual",
        assignedTo: "both",
      });
      svc.addToQueue({
        topic: "BTC",
        priority: "high",
        source: "manual",
        assignedTo: "vince",
      });
      svc.markComplete(item.id);

      const queue = svc.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].topic).toBe("BTC");
    });

    it("filters by assignedTo", () => {
      svc.addToQueue({
        topic: "Echo topic",
        priority: "medium",
        source: "manual",
        assignedTo: "echo",
      });
      svc.addToQueue({
        topic: "Vince topic",
        priority: "high",
        source: "manual",
        assignedTo: "vince",
      });

      const echoQueue = svc.getQueue("echo");
      expect(echoQueue).toHaveLength(1);
      expect(echoQueue[0].topic).toBe("Echo topic");

      const vinceQueue = svc.getQueue("vince");
      expect(vinceQueue).toHaveLength(1);
      expect(vinceQueue[0].topic).toBe("Vince topic");

      const allQueue = svc.getQueue();
      expect(allQueue).toHaveLength(2);
    });
  });

  describe("markComplete", () => {
    it("sets completedAt timestamp", () => {
      const item = svc.addToQueue({
        topic: "complete me",
        priority: "low",
        source: "manual",
        assignedTo: "both",
      });
      svc.markComplete(item.id);

      // Reload to check persistence
      const svc2 = new ResearchQueueService(tmpDir);
      const all = svc2.getQueue(); // should be empty (completed)
      expect(all).toHaveLength(0);
    });

    it("does nothing for unknown id", () => {
      svc.addToQueue({
        topic: "test",
        priority: "low",
        source: "manual",
        assignedTo: "both",
      });
      // Should not throw
      expect(() => svc.markComplete("nonexistent-id")).not.toThrow();
      expect(svc.getQueue()).toHaveLength(1);
    });
  });

  describe("getPriorityQueue", () => {
    it("sorts high → medium → low", () => {
      svc.addToQueue({ topic: "low task", priority: "low", source: "manual", assignedTo: "both" });
      svc.addToQueue({ topic: "high task", priority: "high", source: "manual", assignedTo: "both" });
      svc.addToQueue({ topic: "medium task", priority: "medium", source: "manual", assignedTo: "both" });

      const queue = svc.getPriorityQueue();
      expect(queue[0].priority).toBe("high");
      expect(queue[1].priority).toBe("medium");
      expect(queue[2].priority).toBe("low");
    });

    it("returns only uncompleted items sorted by priority", () => {
      const low = svc.addToQueue({ topic: "l", priority: "low", source: "manual", assignedTo: "both" });
      svc.addToQueue({ topic: "h", priority: "high", source: "manual", assignedTo: "both" });
      svc.markComplete(low.id);

      const queue = svc.getPriorityQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].priority).toBe("high");
    });
  });

  describe("addFromPostMortem", () => {
    it("adds a high-priority item for both agents", () => {
      svc.addFromPostMortem("BTC", "trade-xyz-123");
      const queue = svc.getPriorityQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].priority).toBe("high");
      expect(queue[0].assignedTo).toBe("both");
      expect(queue[0].source).toBe("post-mortem");
      expect(queue[0].topic).toContain("BTC");
      expect(queue[0].topic).toContain("trade-xyz-123");
      expect(queue[0].asset).toBe("BTC");
    });
  });
});
