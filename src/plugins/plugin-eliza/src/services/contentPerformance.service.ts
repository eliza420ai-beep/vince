/**
 * Content Performance Feedback Loop
 *
 * Tracks drafted and published content (Substack essays, tweets) and source inputs.
 * Persists to data/content-performance.jsonl.
 * Plain TS class (no ElizaOS Service inheritance).
 *
 * PRD Phase 8, Task #46.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface ContentRecord {
  contentId: string;
  type: "substack" | "tweet";
  draftedAt: string;
  title: string;
  sourceInputs: string[];
  published: boolean;
  qualityScore?: number;
}

const FILE_NAME = "content-performance.jsonl";

function generateContentId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ==========================================
// Service
// ==========================================

export class ContentPerformanceService {
  private readonly filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private loadAll(): ContentRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: ContentRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as ContentRecord);
      } catch {
        // skip malformed
      }
    }
    return records;
  }

  private saveAll(records: ContentRecord[]): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.filePath,
      records.map((r) => JSON.stringify(r)).join("\n") +
        (records.length ? "\n" : ""),
      "utf-8",
    );
  }

  private appendRecord(record: ContentRecord): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(record) + "\n", "utf-8");
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Record a new content draft. Returns the generated contentId.
   */
  recordDraft(
    type: "substack" | "tweet",
    title: string,
    sourceInputs: string[],
  ): string {
    const contentId = generateContentId();
    const record: ContentRecord = {
      contentId,
      type,
      draftedAt: new Date().toISOString(),
      title,
      sourceInputs,
      published: false,
    };
    this.appendRecord(record);
    return contentId;
  }

  /**
   * Mark a content item as published (rewrites file).
   */
  markPublished(contentId: string): void {
    const all = this.loadAll();
    let updated = false;
    for (const record of all) {
      if (record.contentId === contentId) {
        record.published = true;
        updated = true;
        break;
      }
    }
    if (updated) {
      this.saveAll(all);
    }
  }

  /**
   * Get the most frequently used source inputs across all content, sorted by frequency desc.
   */
  getTopSourceInputs(): string[] {
    const all = this.loadAll();
    const counts = new Map<string, number>();
    for (const record of all) {
      for (const src of record.sourceInputs) {
        counts.set(src, (counts.get(src) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([src]) => src);
  }

  /**
   * Get weekly output summary (last 7 days).
   */
  getWeeklyOutput(): {
    substacks: number;
    tweets: number;
    publishRate: number;
  } {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = this.loadAll().filter(
      (r) => new Date(r.draftedAt).getTime() >= cutoff,
    );
    const substacks = recent.filter((r) => r.type === "substack").length;
    const tweets = recent.filter((r) => r.type === "tweet").length;
    const published = recent.filter((r) => r.published).length;
    const publishRate = recent.length > 0 ? published / recent.length : 0;
    return { substacks, tweets, publishRate };
  }
}

/**
 * Singleton-style accessor for ContentPerformanceService.
 * Used by actions that want a simple, fire-and-forget interface.
 */
let sharedContentPerformance: ContentPerformanceService | null = null;

export function getContentPerformance(): ContentPerformanceService {
  if (!sharedContentPerformance) {
    sharedContentPerformance = new ContentPerformanceService();
  }
  return sharedContentPerformance;
}
