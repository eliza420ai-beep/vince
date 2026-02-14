/**
 * Standup Scheduler
 *
 * Automatically triggers standups at scheduled times.
 * Can run with or without the human (livethelifetv) present.
 *
 * Config via env:
 * - STANDUP_SCHEDULE: Cron expression (default: "0 8 * * *" = 8 AM UTC daily)
 * - STANDUP_AUTO_START: "true" to enable (default: false)
 * - STANDUP_TIMEZONE: Timezone (default: UTC)
 */

import { type IAgentRuntime, logger } from "@elizaos/core";
import { getStandupHumanName } from "./standup.constants";

/** Default schedule: 8 AM UTC daily */
const DEFAULT_SCHEDULE = "0 8 * * *";

/** Parse cron-like schedule to next run time */
export function getNextStandupTime(schedule: string = DEFAULT_SCHEDULE): Date {
  // Simple parser for "0 H * * *" format (minute hour * * *)
  const parts = schedule.split(" ");
  if (parts.length !== 5) {
    logger.warn(`[StandupScheduler] Invalid schedule "${schedule}", using default`);
    return getNextStandupTime(DEFAULT_SCHEDULE);
  }

  const [minute, hour] = parts.map((p) => parseInt(p, 10));
  const now = new Date();
  const next = new Date(now);
  
  next.setUTCHours(hour, minute, 0, 0);
  
  // If we've passed today's time, schedule for tomorrow
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

/**
 * Check if it's time for standup.
 * Uses a ±1 minute window so triggers are not missed when the check interval doesn't align with the exact minute.
 */
export function isStandupTime(schedule: string = DEFAULT_SCHEDULE): boolean {
  const parts = schedule.split(" ");
  if (parts.length !== 5) return false;

  const [minute, hour] = parts.map((p) => parseInt(p, 10));
  if (isNaN(minute) || isNaN(hour)) return false;

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();

  if (currentHour !== hour) return false;
  const minMinute = Math.max(0, minute - 1);
  const maxMinute = Math.min(59, minute + 1);
  return currentMinute >= minMinute && currentMinute <= maxMinute;
}

/** Get standup config from runtime */
export function getStandupConfig(runtime: IAgentRuntime): {
  enabled: boolean;
  schedule: string;
  timezone: string;
  nextRun: Date;
} {
  const enabled = runtime.getSetting("STANDUP_AUTO_START") === "true" ||
    process.env.STANDUP_AUTO_START === "true";
  const schedule = (runtime.getSetting("STANDUP_SCHEDULE") as string) ||
    process.env.STANDUP_SCHEDULE ||
    DEFAULT_SCHEDULE;
  const timezone = (runtime.getSetting("STANDUP_TIMEZONE") as string) ||
    process.env.STANDUP_TIMEZONE ||
    "UTC";

  return {
    enabled,
    schedule,
    timezone,
    nextRun: getNextStandupTime(schedule),
  };
}

/** Format schedule for display */
export function formatSchedule(schedule: string): string {
  const parts = schedule.split(" ");
  if (parts.length !== 5) return schedule;

  const [minute, hour] = parts;
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")} UTC daily`;
}

/**
 * Build the auto-standup kickoff message
 */
export function buildAutoStandupKickoff(): string {
  const date = new Date().toISOString().slice(0, 10);
  const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];

  return `## 🎯 Automated Trading Standup — ${date} (${day})

*One Team, One Dream — Autonomous Mode*

---

This standup was triggered automatically. ${getStandupHumanName()} may or may not join.

**Rules for autonomous mode:**
- HIGH confidence actions: proceed without approval
- MEDIUM/LOW confidence: flag for async review
- Log everything to day report

---

@VINCE, market data on BTC, SOL, HYPE — go.`;
}
