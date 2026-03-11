/**
 * InsightPackagingService Tests (#70)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { InsightPackagingService } from "../services/insightPackaging.service";

let tmpDir: string;
let svc: InsightPackagingService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "insight-pkg-test-"));
  svc = new InsightPackagingService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("InsightPackagingService", () => {
  describe("packageInsight - thread format", () => {
    it("prefixes each paragraph with number", () => {
      const insight = svc.packageInsight({
        format: "thread",
        topic: "BTC analysis",
        rawContent: "Paragraph one.\n\nParagraph two.\n\nParagraph three.",
        sourceAgents: ["vince", "echo"],
        metrics: {},
      });

      expect(insight.format).toBe("thread");
      expect(insight.body).toContain("1/ Paragraph one.");
      expect(insight.body).toContain("2/ Paragraph two.");
      expect(insight.body).toContain("3/ Paragraph three.");
      expect(insight.sourceAgents).toEqual(["vince", "echo"]);
      expect(insight.readyToPublish).toBe(false);
      expect(insight.id).toBeTruthy();
      expect(insight.packagedAt).toBeTruthy();
    });
  });

  describe("packageInsight - newsletter-section format", () => {
    it("adds ### topic header", () => {
      const insight = svc.packageInsight({
        format: "newsletter-section",
        topic: "ETH Outlook",
        rawContent: "Ethereum looks strong heading into Q2.",
        sourceAgents: ["eliza"],
        metrics: { price: 3000 },
      });

      expect(insight.format).toBe("newsletter-section");
      expect(insight.body).toContain("### ETH Outlook");
      expect(insight.body).toContain("Ethereum looks strong heading into Q2.");
    });
  });

  describe("packageInsight - short-form format", () => {
    it("truncates content to 280 chars", () => {
      const longContent = "A".repeat(500);
      const insight = svc.packageInsight({
        format: "short-form",
        topic: "Quick take",
        rawContent: longContent,
        sourceAgents: ["vince"],
        metrics: {},
      });

      expect(insight.format).toBe("short-form");
      expect(insight.body.length).toBeLessThanOrEqual(280);
    });

    it("keeps short content unchanged", () => {
      const shortContent = "BTC is bullish.";
      const insight = svc.packageInsight({
        format: "short-form",
        topic: "Take",
        rawContent: shortContent,
        sourceAgents: [],
        metrics: {},
      });
      expect(insight.body).toBe(shortContent);
    });
  });

  describe("packageInsight - data-table format", () => {
    it("renders metrics as markdown table", () => {
      const insight = svc.packageInsight({
        format: "data-table",
        topic: "Weekly stats",
        rawContent: "Summary.",
        sourceAgents: ["vince"],
        metrics: { winRate: "75%", pnl: "$1,200" },
      });

      expect(insight.format).toBe("data-table");
      expect(insight.body).toContain("| Metric | Value |");
      expect(insight.body).toContain("winRate");
      expect(insight.body).toContain("75%");
    });

    it("falls back to rawContent when no metrics", () => {
      const insight = svc.packageInsight({
        format: "data-table",
        topic: "Empty stats",
        rawContent: "No data available.",
        sourceAgents: [],
        metrics: {},
      });
      expect(insight.body).toBe("No data available.");
    });
  });

  describe("headline generation", () => {
    it("uses topic as headline when < 80 chars", () => {
      const insight = svc.packageInsight({
        format: "short-form",
        topic: "BTC analysis",
        rawContent: "Content",
        sourceAgents: [],
        metrics: {},
      });
      expect(insight.headline).toBe("BTC analysis");
    });

    it("truncates long topic to 77 chars + ...", () => {
      const longTopic = "A".repeat(100);
      const insight = svc.packageInsight({
        format: "short-form",
        topic: longTopic,
        rawContent: "Content",
        sourceAgents: [],
        metrics: {},
      });
      expect(insight.headline).toHaveLength(80);
      expect(insight.headline.endsWith("...")).toBe(true);
    });
  });

  describe("getPublishQueue / markReadyToPublish", () => {
    it("returns empty publish queue initially", () => {
      expect(svc.getPublishQueue()).toHaveLength(0);
    });

    it("adds to publish queue after markReadyToPublish", () => {
      const insight = svc.packageInsight({
        format: "short-form",
        topic: "Test",
        rawContent: "Content.",
        sourceAgents: [],
        metrics: {},
      });

      svc.markReadyToPublish(insight.id);
      const queue = svc.getPublishQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe(insight.id);
      expect(queue[0].readyToPublish).toBe(true);
    });

    it("does not affect unpublished insights", () => {
      const i1 = svc.packageInsight({
        format: "short-form",
        topic: "A",
        rawContent: "a",
        sourceAgents: [],
        metrics: {},
      });
      svc.packageInsight({
        format: "thread",
        topic: "B",
        rawContent: "b",
        sourceAgents: [],
        metrics: {},
      });

      svc.markReadyToPublish(i1.id);
      const queue = svc.getPublishQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe(i1.id);
    });
  });

  describe("getRecentInsights", () => {
    it("returns insights within time window", () => {
      svc.packageInsight({
        format: "short-form",
        topic: "Recent",
        rawContent: "r",
        sourceAgents: [],
        metrics: {},
      });
      const recent = svc.getRecentInsights(1);
      expect(recent).toHaveLength(1);
    });

    it("returns empty for past window", () => {
      svc.packageInsight({
        format: "short-form",
        topic: "Old",
        rawContent: "o",
        sourceAgents: [],
        metrics: {},
      });
      // Manually set old date in the file
      const filePath = path.join(tmpDir, "packaged-insights.jsonl");
      const insights = fs
        .readFileSync(filePath, "utf-8")
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => {
          const r = JSON.parse(l);
          r.packagedAt = new Date(
            Date.now() - 10 * 60 * 60 * 1000,
          ).toISOString(); // 10h ago
          return JSON.stringify(r);
        });
      fs.writeFileSync(filePath, insights.join("\n") + "\n");

      const svc2 = new InsightPackagingService(tmpDir);
      const recent = svc2.getRecentInsights(1); // 1 hour window
      expect(recent).toHaveLength(0);
    });
  });
});
