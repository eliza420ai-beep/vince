/**
 * Tests for MemoryGraphService.
 * PRD: One Dream Phase 12 — Task #77
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { MemoryGraphService } from "../services/memoryGraph.service";

let tmpDir: string;
let service: MemoryGraphService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-graph-test-"));
  service = new MemoryGraphService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("addNode", () => {
  it("creates a node with id, learnedAt, and weight=1.0", () => {
    const node = service.addNode({
      type: "lesson",
      label: "BTC sentiment matters",
      content: "High fear/greed correlates with reversals.",
      sourceAgent: "vince",
      relatedAssets: ["BTC"],
      tags: ["sentiment", "btc"],
    });
    expect(node.id).toBeTruthy();
    expect(node.learnedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(node.weight).toBe(1.0);
    expect(node.label).toBe("BTC sentiment matters");
  });

  it("persists node to JSONL file", () => {
    service.addNode({
      type: "pattern",
      label: "Regime peak signal",
      content: "Peak regime + high transition risk → avoid longs.",
      sourceAgent: "sentinel",
      relatedAssets: ["ETH"],
      tags: ["regime"],
    });
    const filePath = path.join(tmpDir, "memory-graph.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter(Boolean);
    expect(lines).toHaveLength(1);
  });
});

describe("query", () => {
  beforeEach(() => {
    service.addNode({
      type: "lesson",
      label: "BTC lesson",
      content: "content 1",
      sourceAgent: "vince",
      relatedAssets: ["BTC"],
      tags: ["sentiment"],
    });
    service.addNode({
      type: "asset",
      label: "ETH pattern",
      content: "content 2",
      sourceAgent: "sentinel",
      relatedAssets: ["ETH"],
      tags: ["regime"],
    });
    service.addNode({
      type: "lesson",
      label: "BTC regime lesson",
      content: "content 3",
      sourceAgent: "vince",
      relatedAssets: ["BTC"],
      tags: ["sentiment", "regime"],
    });
  });

  it("queries by asset", () => {
    const results = service.query({ asset: "BTC" });
    expect(results).toHaveLength(2);
    expect(results.every((n) => n.relatedAssets.includes("BTC"))).toBe(true);
  });

  it("queries by tag", () => {
    const results = service.query({ tags: ["regime"] });
    expect(results).toHaveLength(2);
  });

  it("queries by type", () => {
    const results = service.query({ type: "lesson" });
    expect(results).toHaveLength(2);
  });

  it("queries by minWeight", () => {
    const results = service.query({ minWeight: 1.0 });
    // All fresh nodes have weight=1.0
    expect(results).toHaveLength(3);
  });

  it("returns results sorted by weight descending", () => {
    const results = service.query({});
    const weights = results.map((n) => n.weight);
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeLessThanOrEqual(weights[i - 1]);
    }
  });

  it("returns empty array for unknown asset", () => {
    const results = service.query({ asset: "UNKNOWN" });
    expect(results).toHaveLength(0);
  });
});

describe("decay", () => {
  it("multiplies each node weight by 0.9", () => {
    service.addNode({
      type: "lesson",
      label: "test",
      content: "c",
      sourceAgent: "vince",
      relatedAssets: [],
      tags: [],
    });
    service.decay();
    const nodes = service.query({});
    expect(nodes[0].weight).toBeCloseTo(0.9, 5);
  });

  it("applies decay cumulatively across multiple calls", () => {
    service.addNode({
      type: "lesson",
      label: "test",
      content: "c",
      sourceAgent: "vince",
      relatedAssets: [],
      tags: [],
    });
    service.decay();
    service.decay();
    const nodes = service.query({});
    expect(nodes[0].weight).toBeCloseTo(0.81, 4);
  });
});

describe("pruneExpired", () => {
  it("removes nodes below minWeight and returns count", () => {
    // Add 3 nodes, then decay them below threshold
    for (let i = 0; i < 3; i++) {
      service.addNode({
        type: "lesson",
        label: `lesson-${i}`,
        content: `c${i}`,
        sourceAgent: "vince",
        relatedAssets: [],
        tags: [],
      });
    }
    // Decay 25 times → 0.9^25 ≈ 0.072 (still above 0.05)
    // Decay 30 times → 0.9^30 ≈ 0.042 (below 0.05)
    for (let i = 0; i < 30; i++) {
      service.decay();
    }
    const removed = service.pruneExpired(0.05);
    expect(removed).toBe(3);
    expect(service.getNodeCount()).toBe(0);
  });

  it("returns 0 when no nodes expire", () => {
    service.addNode({
      type: "lesson",
      label: "fresh",
      content: "c",
      sourceAgent: "vince",
      relatedAssets: [],
      tags: [],
    });
    const removed = service.pruneExpired(0.05);
    expect(removed).toBe(0);
    expect(service.getNodeCount()).toBe(1);
  });
});

describe("getSummary", () => {
  it("returns top 5 nodes as markdown list", () => {
    for (let i = 0; i < 7; i++) {
      service.addNode({
        type: "lesson",
        label: `lesson-${i}`,
        content: `content ${i}`,
        sourceAgent: "vince",
        relatedAssets: [],
        tags: [],
      });
    }
    const summary = service.getSummary();
    const lines = summary.split("\n").filter((l) => l.startsWith("- "));
    expect(lines).toHaveLength(5);
  });

  it("returns placeholder for empty graph", () => {
    const summary = service.getSummary();
    expect(summary).toContain("No memory nodes");
  });
});
