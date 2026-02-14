/**
 * Day Report Persistence
 *
 * Saves day reports to files for history and accountability.
 * Location: standup-deliverables/day-reports/YYYY-MM-DD-day-report.md
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "@elizaos/core";

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
export function saveSharedDailyInsights(content: string, date?: Date): string | null {
  try {
    const dir = getSharedInsightsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`[SharedInsights] Created directory: ${dir}`);
    }
    const filepath = getSharedInsightsPath(date);
    const d = date || new Date();
    const metadata = `---
date: ${d.toISOString()}
type: shared-daily-insights
---

`;
    fs.writeFileSync(filepath, metadata + content, "utf-8");
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
export function loadSharedDailyInsights(date?: Date): string | null {
  try {
    const filepath = getSharedInsightsPath(date);
    if (!fs.existsSync(filepath)) return null;
    return fs.readFileSync(filepath, "utf-8");
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
export function saveDayReport(content: string, date?: Date): string | null {
  try {
    const dir = getDayReportsDir();
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`[DayReport] Created directory: ${dir}`);
    }

    const filepath = getDayReportPath(date);
    
    // Add metadata header
    const metadata = `---
date: ${(date || new Date()).toISOString()}
type: day-report
generated: automated-standup
---

`;
    
    fs.writeFileSync(filepath, metadata + content, "utf-8");
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
export function loadDayReport(date?: Date): string | null {
  try {
    const filepath = getDayReportPath(date);
    
    if (!fs.existsSync(filepath)) {
      return null;
    }

    return fs.readFileSync(filepath, "utf-8");
  } catch (err) {
    logger.error({ err }, "[DayReport] Failed to load day report");
    return null;
  }
}

/**
 * List all day reports
 */
export function listDayReports(limit: number = 30): string[] {
  try {
    const dir = getDayReportsDir();
    
    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs.readdirSync(dir)
      .filter((f) => f.endsWith("-day-report.md"))
      .sort()
      .reverse()
      .slice(0, limit);

    return files.map((f) => path.join(dir, f));
  } catch (err) {
    logger.error({ err }, "[DayReport] Failed to list day reports");
    return [];
  }
}

/**
 * Get recent day reports content (for context)
 */
export function getRecentReportsContext(days: number = 3): string {
  const reports = listDayReports(days);
  
  if (reports.length === 0) {
    return "*No previous day reports found*";
  }

  const summaries: string[] = [];
  
  for (const filepath of reports) {
    try {
      const content = fs.readFileSync(filepath, "utf-8");
      const filename = path.basename(filepath);
      const date = filename.replace("-day-report.md", "");
      
      // Extract TL;DR if present
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
 * Append to the day report manifest
 */
export function updateDayReportManifest(filepath: string, summary: string): void {
  try {
    const manifestPath = path.join(getDeliverablesDir(), "day-reports-manifest.md");
    const date = new Date().toISOString().slice(0, 10);
    const entry = `| ${date} | ${summary.slice(0, 80)} | [View](${path.relative(getDeliverablesDir(), filepath)}) |\n`;

    // Create manifest if it doesn't exist
    if (!fs.existsSync(manifestPath)) {
      const header = `# Day Reports Manifest

| Date | Summary | Link |
|------|---------|------|
`;
      fs.writeFileSync(manifestPath, header, "utf-8");
    }

    fs.appendFileSync(manifestPath, entry, "utf-8");
    logger.info(`[DayReport] Updated manifest`);
  } catch (err) {
    logger.warn({ err }, "[DayReport] Failed to update manifest");
  }
}
