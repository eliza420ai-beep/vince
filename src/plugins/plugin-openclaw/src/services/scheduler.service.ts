/**
 * OpenClaw Scheduled Research Service
 * 
 * Automatic periodic research for watchlist tokens
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { logger } from "@elizaos/core";

const DATA_DIR = path.resolve(process.cwd(), ".openclaw-data");
const SCHEDULES_FILE = path.join(DATA_DIR, "schedules.json");

type Frequency = "hourly" | "daily" | "weekly";

interface ScheduledResearch {
  id: string;
  tokens: string[];
  agent: string;
  frequency: Frequency;
  enabled: boolean;
  lastRun: number | null;
  nextRun: number;
  createdAt: number;
  results: ScheduledResult[];
}

interface ScheduledResult {
  timestamp: number;
  summary: string;
  cost: number;
}

// Initialize data directory
function initDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Calculate next run time
function calculateNextRun(frequency: Frequency, fromTime: number = Date.now()): number {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  
  switch (frequency) {
    case "hourly":
      return fromTime + hour;
    case "daily":
      return fromTime + day;
    case "weekly":
      return fromTime + 7 * day;
    default:
      return fromTime + day;
  }
}

// Get all schedules
export function getSchedules(): ScheduledResearch[] {
  initDataDir();
  if (!existsSync(SCHEDULES_FILE)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(SCHEDULES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

// Save schedules
export function saveSchedules(schedules: ScheduledResearch[]): void {
  initDataDir();
  writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
}

// Create a new schedule
export function createSchedule(
  tokens: string[],
  agent: string,
  frequency: Frequency
): ScheduledResearch {
  const schedules = getSchedules();
  
  const schedule: ScheduledResearch = {
    id: `sched-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    tokens,
    agent,
    frequency,
    enabled: true,
    lastRun: null,
    nextRun: calculateNextRun(frequency),
    createdAt: Date.now(),
    results: [],
  };
  
  schedules.push(schedule);
  saveSchedules(schedules);
  
  logger.info(`[Scheduler] Created: ${schedule.id} for ${tokens.join(", ")} (${frequency})`);
  return schedule;
}

// Delete a schedule
export function deleteSchedule(id: string): boolean {
  const schedules = getSchedules();
  const index = schedules.findIndex(s => s.id === id);
  
  if (index === -1) {
    return false;
  }
  
  schedules.splice(index, 1);
  saveSchedules(schedules);
  
  logger.info(`[Scheduler] Deleted: ${id}`);
  return true;
}

// Toggle schedule enabled/disabled
export function toggleSchedule(id: string): ScheduledResearch | null {
  const schedules = getSchedules();
  const schedule = schedules.find(s => s.id === id);
  
  if (!schedule) {
    return null;
  }
  
  schedule.enabled = !schedule.enabled;
  saveSchedules(schedules);
  
  logger.info(`[Scheduler] ${schedule.id} is now ${schedule.enabled ? "enabled" : "disabled"}`);
  return schedule;
}

// Get due schedules
export function getDueSchedules(): ScheduledResearch[] {
  const schedules = getSchedules();
  const now = Date.now();
  
  return schedules.filter(s => s.enabled && s.nextRun <= now);
}

// Mark schedule as run
export function markScheduleRun(id: string, summary: string, cost: number): ScheduledResearch | null {
  const schedules = getSchedules();
  const schedule = schedules.find(s => s.id === id);
  
  if (!schedule) {
    return null;
  }
  
  const now = Date.now();
  schedule.lastRun = now;
  schedule.nextRun = calculateNextRun(schedule.frequency, now);
  schedule.results.push({ timestamp: now, summary, cost });
  
  // Keep only last 10 results
  if (schedule.results.length > 10) {
    schedule.results = schedule.results.slice(-10);
  }
  
  saveSchedules(schedules);
  
  logger.info(`[Scheduler] ${id} run complete. Next: ${new Date(schedule.nextRun).toISOString()}`);
  return schedule;
}

// Format schedules for display
export function formatSchedules(schedules: ScheduledResearch[]): string {
  if (schedules.length === 0) {
    return `⏰ **No scheduled research**

Create one: \`@VINCE schedule SOL BTC daily\``;
  }
  
  const items = schedules.map((s, i) => {
    const status = s.enabled ? "✅" : "⏸️";
    const lastRun = s.lastRun ? new Date(s.lastRun).toLocaleString() : "Never";
    const nextRun = new Date(s.nextRun).toLocaleString();
    const tokens = s.tokens.join(", ");
    
    return `${i + 1}. ${status} **${s.agent}**: ${tokens}
   • Frequency: ${s.frequency}
   • Last run: ${lastRun}
   • Next run: ${nextRun}
   • ID: \`${s.id}\``;
  }).join("\n\n");
  
  return `⏰ **Scheduled Research** (${schedules.length})

${items}

---
Commands:
• \`schedule <tokens> <hourly|daily|weekly>\` - Create
• \`unschedule <id>\` - Delete
• \`toggle <id>\` - Enable/disable`;
}

// Format frequency as human readable
export function formatFrequency(frequency: Frequency): string {
  switch (frequency) {
    case "hourly":
      return "Every hour";
    case "daily":
      return "Every day";
    case "weekly":
      return "Every week";
    default:
      return frequency;
  }
}

// Get schedule by ID
export function getScheduleById(id: string): ScheduledResearch | null {
  const schedules = getSchedules();
  return schedules.find(s => s.id === id) || null;
}

// Update schedule
export function updateSchedule(id: string, updates: Partial<ScheduledResearch>): ScheduledResearch | null {
  const schedules = getSchedules();
  const schedule = schedules.find(s => s.id === id);
  
  if (!schedule) {
    return null;
  }
  
  Object.assign(schedule, updates);
  saveSchedules(schedules);
  
  return schedule;
}

export default {
  getSchedules,
  saveSchedules,
  createSchedule,
  deleteSchedule,
  toggleSchedule,
  getDueSchedules,
  markScheduleRun,
  formatSchedules,
  formatFrequency,
  getScheduleById,
  updateSchedule,
};
