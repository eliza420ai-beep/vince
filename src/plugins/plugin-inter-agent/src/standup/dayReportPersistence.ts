/**
 * Day Report Persistence
 *
 * Saves day reports to files for history and accountability.
 * Location: standup-deliverables/day-reports/YYYY-MM-DD-day-report.md
 * Uses async fs; manifest updates use file locking.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "@elizaos/core";
import { withLock } from "./fileLock";

/** Get the deliverables directory */
function getDeliverablesDir(): string {
  const envDir = process.env.STANDUP_DELIVERABLES_DIR?.trim();
  if (envDir) {
    return path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), envDir);
  }
  return path.join(process.cwd(), "standup-deliverables");
}

/** Get the day reports directory */
function getDayReportsDir(): string {
  return path.join(getDeliverablesDir(), "day-reports");
}

/** Get the daily insights directory (shared pre-standup artifact) */
export function getSharedInsightsDir(): string {
  return path.join(getDeliverablesDir(), "daily-insights");
}

/** Generate filename for shared daily insights */
function getSharedInsightsFilename(date?: Date): string {
  const d = date || new Date();
  const dateStr = d.toISOString().slice(0, 10);
  return `${dateStr}-shared-insights.md`;
}

/** Get full path for shared daily insights */
export function getSharedInsightsPath(date?: Date): string {
  return path.join(getSharedInsightsDir(), getSharedInsightsFilename(date));
}

/**
 * Save shared daily insights to disk (pre-standup artifact).
 * Location: standup-deliverables/daily-insights/YYYY-MM-DD-shared-insights.md
 */
export async function saveSharedDailyInsights(content: string, date?: Date): Promise<string | null> {
  try {
    const dir = getSharedInsightsDir();
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      logger.info(`[SharedInsights] Created directory: ${dir}`);
    }
    const filepath = getSharedInsightsPath(date);
    const d = date || new Date();
    const metadata = `---
date: ${d.toISOString()}
type: shared-daily-insights
---

`;
    await fs.writeFile(filepath, metadata + content, "utf-8");
    logger.info(`[SharedInsights] Saved to ${filepath}`);
    return filepath;
  } catch (err) {
    logger.error({ err }, "[SharedInsights] Failed to save shared daily insights");
    return null;
  }
}

/**
 * Load shared daily insights from disk. Returns null if file missing.
 */
export async function loadSharedDailyInsights(date?: Date): Promise<string | null> {
  try {
    const filepath = getSharedInsightsPath(date);
    try {
      return await fs.readFile(filepath, "utf-8");
    } catch {
      return null;
    }
  } catch (err) {
    logger.warn({ err }, "[SharedInsights] Failed to load shared daily insights");
    return null;
  }
}

/** Generate filename for a day report */
export function getDayReportFilename(date?: Date): string {
  const d = date || new Date();
  const dateStr = d.toISOString().slice(0, 10);
  return `${dateStr}-day-report.md`;
}

/** Get full path for a day report */
export function getDayReportPath(date?: Date): string {
  return path.join(getDayReportsDir(), getDayReportFilename(date));
}

/**
 * Save a day report to disk
 */
export async function saveDayReport(content: string, date?: Date): Promise<string | null> {
  try {
    const dir = getDayReportsDir();
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      logger.info(`[DayReport] Created directory: ${dir}`);
    }

    const filepath = getDayReportPath(date);
    const metadata = `---
date: ${(date || new Date()).toISOString()}
type: day-report
generated: automated-standup
---

`;
    await fs.writeFile(filepath, metadata + content, "utf-8");
    logger.info(`[DayReport] Saved to ${filepath}`);
    return filepath;
  } catch (err) {
    logger.error({ err }, "[DayReport] Failed to save day report");
    return null;
  }
}

/**
 * Load a day report from disk
 */
export async function loadDayReport(date?: Date): Promise<string | null> {
  try {
    const filepath = getDayReportPath(date);
    try {
      return await fs.readFile(filepath, "utf-8");
    } catch {
      return null;
    }
  } catch (err) {
    logger.error({ err }, "[DayReport] Failed to load day report");
    return null;
  }
}

/**
 * List all day reports
 */
export async function listDayReports(limit: number = 30): Promise<string[]> {
  try {
    const dir = getDayReportsDir();
    try {
      const files = await fs.readdir(dir);
      return files
        .filter((f) => f.endsWith("-day-report.md"))
        .sort()
        .reverse()
        .slice(0, limit)
        .map((f) => path.join(dir, f));
    } catch {
      return [];
    }
  } catch (err) {
    logger.error({ err }, "[DayReport] Failed to list day reports");
    return [];
  }
}

/**
 * Get recent day reports content (for context)
 */
export async function getRecentReportsContext(days: number = 3): Promise<string> {
  const reports = await listDayReports(days);

  if (reports.length === 0) {
    return "*No previous day reports found*";
  }

  const summaries: string[] = [];

  for (const filepath of reports) {
    try {
      const content = await fs.readFile(filepath, "utf-8");
      const filename = path.basename(filepath);
      const date = filename.replace("-day-report.md", "");
      const tldrMatch = content.match(/### TL;DR\n([^\n#]+)/);
      const tldr = tldrMatch ? tldrMatch[1].trim() : "No summary";
      summaries.push(`**${date}**: ${tldr}`);
    } catch {
      // Skip files we can't read
    }
  }

  return summaries.join("\n");
}

/**
 * Append to the day report manifest (uses lock)
 */
export async function updateDayReportManifest(filepath: string, summary: string): Promise<void> {
  const manifestPath = path.join(getDeliverablesDir(), "day-reports-manifest.md");
  try {
    await withLock(manifestPath, async () => {
      const date = new Date().toISOString().slice(0, 10);
      const entry = `| ${date} | ${summary.slice(0, 80)} | [View](${path.relative(getDeliverablesDir(), filepath)}) |\n`;

      let header = `# Day Reports Manifest

| Date | Summary | Link |
|------|---------|------|
`;
      try {
        await fs.readFile(manifestPath, "utf-8");
      } catch {
        await fs.mkdir(path.dirname(manifestPath), { recursive: true });
        await fs.writeFile(manifestPath, header, "utf-8");
      }
      await fs.appendFile(manifestPath, entry, "utf-8");
    });
    logger.info(`[DayReport] Updated manifest`);
  } catch (err) {
    logger.warn({ err }, "[DayReport] Failed to update manifest");
  }
}
