/**
 * Memory Graph Service
 *
 * Builds a lightweight knowledge graph from weekly intelligence briefs,
 * post-mortems, and agent lessons. Enables querying "what have we learned about X?"
 *
 * PRD: One Dream Phase 12 — Task #77
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";

export interface MemoryNode {
  id: string;
  type: "lesson" | "pattern" | "asset" | "agent" | "event";
  label: string;
  content: string;
  learnedAt: string;
  sourceAgent: string;
  relatedAssets: string[];
  tags: string[];
  weight: number; // 0–1, recency-decayed (1 = fresh this week, decays 10%/week)
}

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");
const MEMORY_FILE = "memory-graph.jsonl";
const DEFAULT_MIN_WEIGHT = 0.05;
const DECAY_FACTOR = 0.9;

export class MemoryGraphService {
  private readonly memoryPath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? DEFAULT_DATA_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.memoryPath = path.join(dir, MEMORY_FILE);
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private readAll(): MemoryNode[] {
    if (!fs.existsSync(this.memoryPath)) return [];
    const content = fs.readFileSync(this.memoryPath, "utf-8");
    const nodes: MemoryNode[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        nodes.push(JSON.parse(trimmed) as MemoryNode);
      } catch {
        // skip malformed
      }
    }
    return nodes;
  }

  private writeAll(nodes: MemoryNode[]): void {
    const lines = nodes.map((n) => JSON.stringify(n)).join("\n");
    fs.writeFileSync(this.memoryPath, lines + (lines ? "\n" : ""), "utf-8");
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Add a new memory node with weight=1.0 and current timestamp.
   */
  addNode(
    node: Omit<MemoryNode, "id" | "learnedAt" | "weight">,
  ): MemoryNode {
    const newNode: MemoryNode = {
      ...node,
      id: uuidv4(),
      learnedAt: new Date().toISOString(),
      weight: 1.0,
    };
    const all = this.readAll();
    all.push(newNode);
    this.writeAll(all);
    return newNode;
  }

  /**
   * Query nodes by tags, asset, type, and/or minimum weight.
   * Returns results sorted by weight descending.
   */
  query(query: {
    tags?: string[];
    asset?: string;
    type?: string;
    minWeight?: number;
  }): MemoryNode[] {
    let nodes = this.readAll();

    if (query.minWeight !== undefined) {
      nodes = nodes.filter((n) => n.weight >= query.minWeight!);
    }
    if (query.type) {
      nodes = nodes.filter((n) => n.type === query.type);
    }
    if (query.asset) {
      const assetLower = query.asset.toLowerCase();
      nodes = nodes.filter((n) =>
        n.relatedAssets.some((a) => a.toLowerCase() === assetLower),
      );
    }
    if (query.tags && query.tags.length > 0) {
      nodes = nodes.filter((n) =>
        query.tags!.some((tag) => n.tags.includes(tag)),
      );
    }

    return nodes.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Apply weekly decay: multiply each node's weight by 0.9.
   */
  decay(): void {
    const all = this.readAll();
    const decayed = all.map((n) => ({ ...n, weight: n.weight * DECAY_FACTOR }));
    this.writeAll(decayed);
  }

  /**
   * Return top 5 nodes by weight as a markdown list.
   * Optionally filter by asset.
   */
  getSummary(asset?: string): string {
    let nodes = this.readAll().sort((a, b) => b.weight - a.weight);
    if (asset) {
      const assetLower = asset.toLowerCase();
      nodes = nodes.filter((n) =>
        n.relatedAssets.some((a) => a.toLowerCase() === assetLower),
      );
    }
    const top5 = nodes.slice(0, 5);
    if (top5.length === 0) return "_No memory nodes found._";
    return top5
      .map(
        (n) =>
          `- **[${n.type}]** ${n.label} _(weight: ${n.weight.toFixed(2)})_: ${n.content}`,
      )
      .join("\n");
  }

  /**
   * Remove nodes with weight below minWeight. Returns count removed.
   */
  pruneExpired(minWeight: number = DEFAULT_MIN_WEIGHT): number {
    const all = this.readAll();
    const before = all.length;
    const surviving = all.filter((n) => n.weight >= minWeight);
    this.writeAll(surviving);
    return before - surviving.length;
  }

  /**
   * Count of all nodes.
   */
  getNodeCount(): number {
    return this.readAll().length;
  }

  /**
   * Average weight across all nodes.
   */
  getAvgWeight(): number {
    const all = this.readAll();
    if (all.length === 0) return 0;
    return all.reduce((s, n) => s + n.weight, 0) / all.length;
  }

  /**
   * Count nodes with weight above threshold.
   */
  getActiveNodeCount(minWeight = 0.2): number {
    return this.readAll().filter((n) => n.weight >= minWeight).length;
  }

  // ── Singleton ──────────────────────────────────────────────────────────────

  private static _instance: MemoryGraphService | null = null;

  static getInstance(): MemoryGraphService {
    if (!MemoryGraphService._instance) {
      MemoryGraphService._instance = new MemoryGraphService();
    }
    return MemoryGraphService._instance;
  }

  static setInstance(instance: MemoryGraphService): void {
    MemoryGraphService._instance = instance;
  }
}
