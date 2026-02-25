/**
 * Research Queue Service (#71)
 *
 * Tracks what content resonated and feeds back into the research queue
 * for Echo and Vince.
 *
 * Persists to data/research-queue.jsonl.
 */

import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

// ==========================================
// Types
// ==========================================

export interface ResearchQueueItem {
  id: string;
  topic: string;
  asset?: string;
  priority: "high" | "medium" | "low";
  source: "audience-feedback" | "post-mortem" | "narrative-decay" | "manual";
  addedAt: string;
  completedAt?: string;
  assignedTo: "echo" | "vince" | "both";
}

const FILE_NAME = "research-queue.jsonl";
const PRIORITY_ORDER: Record<ResearchQueueItem["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// ==========================================
// Service
// ==========================================

export class ResearchQueueService {
  private readonly filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Add an item to the research queue.
   */
  addToQueue(
    item: Omit<ResearchQueueItem, "id" | "addedAt">,
  ): ResearchQueueItem {
    const record: ResearchQueueItem = {
      ...item,
      id: randomUUID(),
      addedAt: new Date().toISOString(),
    };
    this.append(record);
    return record;
  }

  /**
   * Get uncompleted items, optionally filtered by assignee.
   */
  getQueue(assignedTo?: string): ResearchQueueItem[] {
    const all = this.loadAll();
    return all.filter(
      (item) =>
        !item.completedAt &&
        (assignedTo === undefined || item.assignedTo === assignedTo),
    );
  }

  /**
   * Mark an item complete.
   */
  markComplete(id: string): void {
    const all = this.loadAll();
    const idx = all.findIndex((i) => i.id === id);
    if (idx < 0) return;
    all[idx].completedAt = new Date().toISOString();
    this.saveAll(all);
  }

  /**
   * Get uncompleted items sorted by priority (high → medium → low).
   */
  getPriorityQueue(): ResearchQueueItem[] {
    return this.getQueue().sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
    );
  }

  /**
   * Auto-add a research item after a post-mortem loss.
   */
  addFromPostMortem(asset: string, tradeId: string): void {
    this.addToQueue({
      topic: `Research ${asset} narrative after loss on ${tradeId}`,
      asset,
      priority: "high",
      source: "post-mortem",
      assignedTo: "both",
    });
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private loadAll(): ResearchQueueItem[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const results: ResearchQueueItem[] = [];
    for (const line of lines) {
      try {
        results.push(JSON.parse(line) as ResearchQueueItem);
      } catch {
        // skip malformed
      }
    }
    return results;
  }

  private saveAll(records: ResearchQueueItem[]): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.filePath,
      records.map((r) => JSON.stringify(r)).join("\n") +
        (records.length ? "\n" : ""),
      "utf-8",
    );
  }

  private append(record: ResearchQueueItem): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(record) + "\n", "utf-8");
  }
}
