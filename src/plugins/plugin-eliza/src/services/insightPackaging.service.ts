/**
 * Insight Packaging System (#70)
 *
 * Packages raw research and trade data into reusable insight formats:
 * thread, newsletter-section, short-form, data-table.
 *
 * Persists to data/packaged-insights.jsonl.
 */

import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

// ==========================================
// Types
// ==========================================

export type InsightFormat =
  | "thread"
  | "newsletter-section"
  | "short-form"
  | "data-table";

export interface PackagedInsight {
  id: string;
  format: InsightFormat;
  topic: string;
  headline: string;
  body: string;
  sourceAgents: string[];
  metrics: Record<string, string | number>;
  packagedAt: string;
  readyToPublish: boolean;
}

const FILE_NAME = "packaged-insights.jsonl";

// ==========================================
// Service
// ==========================================

export class InsightPackagingService {
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
   * Package raw content into a structured insight for publishing.
   */
  packageInsight(params: {
    format: InsightFormat;
    topic: string;
    rawContent: string;
    sourceAgents: string[];
    metrics: Record<string, string | number>;
  }): PackagedInsight {
    const headline = this.generateHeadline(params.topic);
    const body = this.formatBody(
      params.format,
      params.rawContent,
      params.topic,
      params.metrics,
    );

    const insight: PackagedInsight = {
      id: randomUUID(),
      format: params.format,
      topic: params.topic,
      headline,
      body,
      sourceAgents: params.sourceAgents,
      metrics: params.metrics,
      packagedAt: new Date().toISOString(),
      readyToPublish: false,
    };

    this.append(insight);
    return insight;
  }

  /**
   * Get insights packaged within the last N hours.
   */
  getRecentInsights(hours: number): PackagedInsight[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.loadAll().filter(
      (i) => new Date(i.packagedAt).getTime() >= cutoff,
    );
  }

  /**
   * Mark an insight as ready to publish.
   */
  markReadyToPublish(id: string): void {
    const all = this.loadAll();
    const idx = all.findIndex((i) => i.id === id);
    if (idx < 0) return;
    all[idx].readyToPublish = true;
    this.saveAll(all);
  }

  /**
   * Get insights that are ready to publish.
   */
  getPublishQueue(): PackagedInsight[] {
    return this.loadAll().filter((i) => i.readyToPublish);
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private generateHeadline(topic: string): string {
    // Use first sentence if < 80 chars, else truncate + "..."
    const firstSentence = topic.split(/[.!?]/)[0].trim();
    if (firstSentence.length < 80) return firstSentence;
    return firstSentence.slice(0, 77) + "...";
  }

  private formatBody(
    format: InsightFormat,
    rawContent: string,
    topic: string,
    metrics: Record<string, string | number>,
  ): string {
    switch (format) {
      case "thread": {
        const paragraphs = rawContent.split(/\n\n+/).filter((p) => p.trim());
        return paragraphs.map((p, i) => `${i + 1}/ ${p.trim()}`).join("\n\n");
      }

      case "newsletter-section": {
        return `### ${topic}\n\n${rawContent}`;
      }

      case "short-form": {
        return rawContent.slice(0, 280);
      }

      case "data-table": {
        if (Object.keys(metrics).length === 0) return rawContent;
        const rows = Object.entries(metrics)
          .map(([k, v]) => `| ${k} | ${v} |`)
          .join("\n");
        return `| Metric | Value |\n|--------|-------|\n${rows}`;
      }

      default:
        return rawContent;
    }
  }

  private loadAll(): PackagedInsight[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const results: PackagedInsight[] = [];
    for (const line of lines) {
      try {
        results.push(JSON.parse(line) as PackagedInsight);
      } catch {
        // skip malformed
      }
    }
    return results;
  }

  private saveAll(records: PackagedInsight[]): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.filePath,
      records.map((r) => JSON.stringify(r)).join("\n") +
        (records.length ? "\n" : ""),
      "utf-8",
    );
  }

  private append(insight: PackagedInsight): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(insight) + "\n", "utf-8");
  }
}
