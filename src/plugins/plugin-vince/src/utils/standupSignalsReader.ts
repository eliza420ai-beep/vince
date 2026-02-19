/**
 * Standup Signals Reader — Paper bot aggregator
 *
 * Reads the standup/signals file written by plugin-inter-agent after the Day Report.
 * Path: STANDUP_DELIVERABLES_DIR/signals/YYYY-MM-DD-signals.json or docs/standup/signals/.
 * Contract matches plugin-inter-agent standupSignals.ts (no cross-package dependency).
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface StandupSignalEntry {
  asset: string;
  direction: "long" | "short" | "neutral";
  confidence_pct?: number;
  source: "standup" | "solus";
  raw?: string;
}

export interface StandupSignalsFile {
  date: string;
  signals: StandupSignalEntry[];
}

function getSignalsDir(): string {
  const envDir = process.env.STANDUP_DELIVERABLES_DIR?.trim();
  const base = envDir
    ? path.isAbsolute(envDir)
      ? envDir
      : path.join(process.cwd(), envDir)
    : path.join(process.cwd(), "docs", "standup");
  return path.join(base, "signals");
}

export function getStandupSignalsPath(date?: Date): string {
  const d = date ?? new Date();
  const dateStr = d.toISOString().slice(0, 10);
  return path.join(getSignalsDir(), `${dateStr}-signals.json`);
}

/**
 * Load today's (or given date's) standup signals file.
 * Returns null when file is missing or invalid.
 */
export async function loadStandupSignals(
  date?: Date,
): Promise<StandupSignalsFile | null> {
  try {
    const filepath = getStandupSignalsPath(date);
    const raw = await fs.readFile(filepath, "utf-8");
    const data = JSON.parse(raw) as StandupSignalsFile;
    if (!data || !Array.isArray(data.signals)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Get the standup signal for a given asset (case-insensitive match).
 */
export function getStandupSignalForAsset(
  data: StandupSignalsFile,
  asset: string,
): StandupSignalEntry | undefined {
  const upper = asset.toUpperCase();
  return data.signals.find((s) => (s.asset ?? "").toUpperCase() === upper);
}
