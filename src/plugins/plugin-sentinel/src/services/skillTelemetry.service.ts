/**
 * Skill Telemetry Service
 *
 * Tracks skill usage events and produces a weekly scoreboard.
 * Persists events to data/skill-telemetry.jsonl (one JSON object per line).
 *
 * Plain TS class — not an ElizaOS Service subclass.
 * Constructor accepts optional dataDir so tests can use a tmp directory.
 *
 * PRD: One Dream Phase 9 — Skills OS, Task #53
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface SkillUsageEvent {
  skillName: string;
  triggeredAt: string; // ISO timestamp
  agentId: string;
  latencyMs?: number;
  outcome?: "success" | "failure" | "skipped";
  downstreamImpact?: "trade" | "content" | "insight" | "none";
}

export interface SkillScoreboardEntry {
  skillName: string;
  usageCount: number;
  successRate: number; // 0-1
  avgLatencyMs: number;
  impactBreakdown: Record<string, number>;
}

export interface SkillStats {
  total: number;
  successRate: number; // 0-1
  lastUsed: string; // ISO timestamp
}

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");
const TELEMETRY_FILE = "skill-telemetry.jsonl";

export class SkillTelemetryService {
  private readonly telemetryPath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? DEFAULT_DATA_DIR;
    // Ensure data directory exists on first use
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.telemetryPath = path.join(dir, TELEMETRY_FILE);
  }

  /**
   * Record a skill usage event. Adds the current ISO timestamp automatically.
   */
  recordUsage(event: Omit<SkillUsageEvent, "triggeredAt">): void {
    const fullEvent: SkillUsageEvent = {
      ...event,
      triggeredAt: new Date().toISOString(),
    };
    const line = JSON.stringify(fullEvent) + "\n";
    fs.appendFileSync(this.telemetryPath, line, "utf-8");
  }

  /**
   * Read all events from the JSONL file. Tolerates malformed lines.
   */
  private readAllEvents(): SkillUsageEvent[] {
    if (!fs.existsSync(this.telemetryPath)) return [];
    const content = fs.readFileSync(this.telemetryPath, "utf-8");
    const events: SkillUsageEvent[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed) as SkillUsageEvent;
        if (event.skillName && event.triggeredAt && event.agentId) {
          events.push(event);
        }
      } catch {
        // Skip malformed lines
      }
    }
    return events;
  }

  /**
   * Get all events from the last 7 days.
   */
  private getRecentEvents(): SkillUsageEvent[] {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.readAllEvents().filter(
      (e) => new Date(e.triggeredAt).getTime() > cutoff,
    );
  }

  /**
   * Return the weekly scoreboard: skill usage stats for the past 7 days,
   * sorted by usageCount descending.
   */
  getWeeklyScoreboard(): SkillScoreboardEntry[] {
    const events = this.getRecentEvents();
    if (events.length === 0) return [];

    // Group by skillName
    const bySkill = new Map<string, SkillUsageEvent[]>();
    for (const event of events) {
      const existing = bySkill.get(event.skillName) ?? [];
      existing.push(event);
      bySkill.set(event.skillName, existing);
    }

    const scoreboard: SkillScoreboardEntry[] = [];

    for (const [skillName, skillEvents] of bySkill.entries()) {
      const usageCount = skillEvents.length;

      // Success rate (only count events with outcome set)
      const withOutcome = skillEvents.filter((e) => e.outcome !== undefined);
      const successCount = withOutcome.filter(
        (e) => e.outcome === "success",
      ).length;
      const successRate =
        withOutcome.length > 0 ? successCount / withOutcome.length : 0;

      // Average latency (only count events with latencyMs set)
      const withLatency = skillEvents.filter(
        (e) => typeof e.latencyMs === "number",
      );
      const avgLatencyMs =
        withLatency.length > 0
          ? withLatency.reduce((sum, e) => sum + (e.latencyMs ?? 0), 0) /
            withLatency.length
          : 0;

      // Impact breakdown
      const impactBreakdown: Record<string, number> = {};
      for (const event of skillEvents) {
        const impact = event.downstreamImpact ?? "none";
        impactBreakdown[impact] = (impactBreakdown[impact] ?? 0) + 1;
      }

      scoreboard.push({
        skillName,
        usageCount,
        successRate,
        avgLatencyMs,
        impactBreakdown,
      });
    }

    // Sort by usageCount descending
    return scoreboard.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * Get aggregate stats for a specific skill across all recorded history.
   * Returns null if no events found for the skill.
   */
  getSkillStats(skillName: string): SkillStats | null {
    const allEvents = this.readAllEvents().filter(
      (e) => e.skillName === skillName,
    );
    if (allEvents.length === 0) return null;

    const total = allEvents.length;

    const withOutcome = allEvents.filter((e) => e.outcome !== undefined);
    const successCount = withOutcome.filter(
      (e) => e.outcome === "success",
    ).length;
    const successRate =
      withOutcome.length > 0 ? successCount / withOutcome.length : 0;

    // Most recent event
    const lastUsed = allEvents
      .map((e) => e.triggeredAt)
      .sort()
      .at(-1) as string;

    return { total, successRate, lastUsed };
  }

  /**
   * Generate the Skill Scoreboard section for the weekly report.
   * Returns empty string if no skills were used this week.
   */
  buildWeeklyScoreboardSection(): string {
    const scoreboard = this.getWeeklyScoreboard();
    if (scoreboard.length === 0) return "";

    const lines = [
      "",
      "## Skill Scoreboard (Last 7 Days)",
      "",
      "| Skill | Uses | Success Rate | Avg Latency | Top Impact |",
      "|-------|------|-------------|-------------|------------|",
    ];

    for (const entry of scoreboard) {
      const successPct =
        entry.successRate > 0
          ? `${(entry.successRate * 100).toFixed(0)}%`
          : "n/a";
      const latency =
        entry.avgLatencyMs > 0 ? `${entry.avgLatencyMs.toFixed(0)}ms` : "n/a";
      const topImpact =
        Object.entries(entry.impactBreakdown)
          .sort(([, a], [, b]) => b - a)
          .map(([k, v]) => `${k}(${v})`)
          .slice(0, 2)
          .join(", ") || "none";
      lines.push(
        `| **${entry.skillName}** | ${entry.usageCount} | ${successPct} | ${latency} | ${topImpact} |`,
      );
    }

    lines.push(
      "",
      "_Tracked via SkillTelemetryService → data/skill-telemetry.jsonl_",
    );
    return lines.join("\n");
  }
}

// Singleton for production use (lazy-init)
let _defaultInstance: SkillTelemetryService | null = null;

export function getSkillTelemetry(): SkillTelemetryService {
  if (!_defaultInstance) {
    _defaultInstance = new SkillTelemetryService();
  }
  return _defaultInstance;
}
