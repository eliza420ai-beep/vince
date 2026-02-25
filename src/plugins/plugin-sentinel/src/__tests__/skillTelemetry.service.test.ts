/**
 * Tests for SkillTelemetryService — skill usage tracking and scoreboard.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  SkillTelemetryService,
  type SkillUsageEvent,
} from "../services/skillTelemetry.service";

let tmpDir: string;
let service: SkillTelemetryService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-telemetry-test-"));
  service = new SkillTelemetryService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// recordUsage
// ---------------------------------------------------------------------------

describe("recordUsage", () => {
  it("creates the JSONL file on first record", () => {
    service.recordUsage({
      skillName: "x-research",
      agentId: "echo-agent",
      outcome: "success",
    });
    const filePath = path.join(tmpDir, "skill-telemetry.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("appends one JSON line per event", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo" });
    service.recordUsage({ skillName: "trading-agent", agentId: "otaku" });

    const filePath = path.join(tmpDir, "skill-telemetry.jsonl");
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter(Boolean);
    expect(lines).toHaveLength(2);
  });

  it("includes triggeredAt as an ISO timestamp", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo" });

    const filePath = path.join(tmpDir, "skill-telemetry.jsonl");
    const line = fs.readFileSync(filePath, "utf-8").split("\n")[0];
    const event = JSON.parse(line) as SkillUsageEvent;

    expect(event.triggeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("persists all optional fields when provided", () => {
    service.recordUsage({
      skillName: "trading-agent",
      agentId: "otaku",
      latencyMs: 350,
      outcome: "success",
      downstreamImpact: "trade",
    });

    const filePath = path.join(tmpDir, "skill-telemetry.jsonl");
    const event = JSON.parse(
      fs.readFileSync(filePath, "utf-8").trim(),
    ) as SkillUsageEvent;

    expect(event.latencyMs).toBe(350);
    expect(event.outcome).toBe("success");
    expect(event.downstreamImpact).toBe("trade");
  });

  it("works when dataDir is created on the fly", () => {
    const nestedDir = path.join(tmpDir, "nested", "data");
    const nested = new SkillTelemetryService(nestedDir);
    expect(() =>
      nested.recordUsage({ skillName: "x-research", agentId: "echo" }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getWeeklyScoreboard
// ---------------------------------------------------------------------------

describe("getWeeklyScoreboard", () => {
  it("returns empty array when no events recorded", () => {
    expect(service.getWeeklyScoreboard()).toEqual([]);
  });

  it("returns entries sorted by usageCount descending", () => {
    // 3 x-research events, 1 trading-agent event
    for (let i = 0; i < 3; i++) {
      service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "success" });
    }
    service.recordUsage({ skillName: "trading-agent", agentId: "otaku", outcome: "success" });

    const scoreboard = service.getWeeklyScoreboard();
    expect(scoreboard[0].skillName).toBe("x-research");
    expect(scoreboard[0].usageCount).toBe(3);
    expect(scoreboard[1].skillName).toBe("trading-agent");
    expect(scoreboard[1].usageCount).toBe(1);
  });

  it("calculates successRate correctly", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "success" });
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "success" });
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "failure" });

    const [entry] = service.getWeeklyScoreboard();
    expect(entry.successRate).toBeCloseTo(2 / 3, 5);
  });

  it("calculates avgLatencyMs correctly", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo", latencyMs: 100 });
    service.recordUsage({ skillName: "x-research", agentId: "echo", latencyMs: 300 });

    const [entry] = service.getWeeklyScoreboard();
    expect(entry.avgLatencyMs).toBe(200);
  });

  it("reports 0 successRate when no outcome set", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo" });
    const [entry] = service.getWeeklyScoreboard();
    expect(entry.successRate).toBe(0);
  });

  it("builds impactBreakdown correctly", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo", downstreamImpact: "trade" });
    service.recordUsage({ skillName: "x-research", agentId: "echo", downstreamImpact: "insight" });
    service.recordUsage({ skillName: "x-research", agentId: "echo", downstreamImpact: "trade" });

    const [entry] = service.getWeeklyScoreboard();
    expect(entry.impactBreakdown.trade).toBe(2);
    expect(entry.impactBreakdown.insight).toBe(1);
  });

  it("excludes events older than 7 days", () => {
    // Manually write an old event to the file
    const oldEvent: SkillUsageEvent = {
      skillName: "old-skill",
      triggeredAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      agentId: "echo",
      outcome: "success",
    };
    const filePath = path.join(tmpDir, "skill-telemetry.jsonl");
    fs.appendFileSync(filePath, JSON.stringify(oldEvent) + "\n");

    // Record a recent event for a different skill
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "success" });

    const scoreboard = service.getWeeklyScoreboard();
    const names = scoreboard.map((e) => e.skillName);
    expect(names).toContain("x-research");
    expect(names).not.toContain("old-skill");
  });
});

// ---------------------------------------------------------------------------
// getSkillStats
// ---------------------------------------------------------------------------

describe("getSkillStats", () => {
  it("returns null when no events for the skill", () => {
    expect(service.getSkillStats("nonexistent")).toBeNull();
  });

  it("returns total count across all history", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "success" });
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "failure" });

    const stats = service.getSkillStats("x-research");
    expect(stats).not.toBeNull();
    expect(stats!.total).toBe(2);
  });

  it("returns correct successRate", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "success" });
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "success" });
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "failure" });

    const stats = service.getSkillStats("x-research");
    expect(stats!.successRate).toBeCloseTo(2 / 3, 5);
  });

  it("returns lastUsed as most recent ISO timestamp", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo" });
    const beforeSecond = new Date().toISOString();
    service.recordUsage({ skillName: "x-research", agentId: "echo" });

    const stats = service.getSkillStats("x-research");
    expect(stats!.lastUsed).toBeTypeOf("string");
    expect(new Date(stats!.lastUsed).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeSecond).getTime() - 10,
    );
  });

  it("does not include events from other skills", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "success" });
    service.recordUsage({ skillName: "trading-agent", agentId: "otaku", outcome: "failure" });

    const stats = service.getSkillStats("x-research");
    expect(stats!.total).toBe(1);
    expect(stats!.successRate).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// buildWeeklyScoreboardSection
// ---------------------------------------------------------------------------

describe("buildWeeklyScoreboardSection", () => {
  it("returns empty string when no events", () => {
    expect(service.buildWeeklyScoreboardSection()).toBe("");
  });

  it("includes the Skill Scoreboard header", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo", outcome: "success" });
    const section = service.buildWeeklyScoreboardSection();
    expect(section).toContain("## Skill Scoreboard");
  });

  it("includes skill names in the output", () => {
    service.recordUsage({ skillName: "x-research", agentId: "echo" });
    service.recordUsage({ skillName: "trading-agent", agentId: "otaku" });
    const section = service.buildWeeklyScoreboardSection();
    expect(section).toContain("x-research");
    expect(section).toContain("trading-agent");
  });
});
