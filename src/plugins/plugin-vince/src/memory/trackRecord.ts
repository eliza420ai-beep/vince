/**
 * Crypto intel track record (Phase 4).
 * File: track_record.json — single JSON object with wins, losses, entries, lessons.
 */

import * as fs from "fs";
import * as path from "path";
import type { TrackRecord, TrackRecordEntry } from "../types/cryptoIntelMemory";

const TRACK_RECORD_FILE = "track_record.json";

export async function readTrackRecord(
  memoryDir: string,
): Promise<TrackRecord | null> {
  const filepath = path.join(memoryDir, TRACK_RECORD_FILE);
  if (!fs.existsSync(filepath)) return null;
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    const obj = JSON.parse(raw) as TrackRecord;
    if (!obj || typeof obj !== "object") return null;
    return {
      wins: typeof obj.wins === "number" ? obj.wins : 0,
      losses: typeof obj.losses === "number" ? obj.losses : 0,
      win_rate: obj.win_rate,
      by_category: obj.by_category,
      by_source: obj.by_source,
      lessons: Array.isArray(obj.lessons) ? obj.lessons : [],
      ev_calibration: obj.ev_calibration,
      entries: Array.isArray(obj.entries) ? obj.entries : [],
    };
  } catch {
    return null;
  }
}

export async function updateTrackRecord(
  memoryDir: string,
  record: TrackRecord,
): Promise<void> {
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  const filepath = path.join(memoryDir, TRACK_RECORD_FILE);
  fs.writeFileSync(filepath, JSON.stringify(record, null, 2), "utf-8");
}

/**
 * Append one closed trade and update wins/losses.
 */
export async function appendTrackRecordEntry(
  memoryDir: string,
  entry: TrackRecordEntry,
): Promise<void> {
  const current = await readTrackRecord(memoryDir);
  const record: TrackRecord = current ?? {
    wins: 0,
    losses: 0,
    entries: [],
  };
  record.entries = record.entries ?? [];
  record.entries.push(entry);
  if (entry.pnl > 0) {
    record.wins = (record.wins ?? 0) + 1;
  } else {
    record.losses = (record.losses ?? 0) + 1;
  }
  record.win_rate =
    record.wins + record.losses > 0
      ? (record.wins / (record.wins + record.losses)) * 100
      : undefined;
  await updateTrackRecord(memoryDir, record);
}
