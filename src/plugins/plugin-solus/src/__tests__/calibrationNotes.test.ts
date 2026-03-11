/**
 * Unit tests for computeCalibrationNotes and writeCalibrationNotesFile.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import {
  computeCalibrationNotes,
  writeCalibrationNotesFile,
  getCalibrationNotesPath,
} from "../utils/calibrationNotes";
import {
  appendRecord,
  getStoreDir,
  resolveLatestForAssetStrike,
} from "../utils/assignmentPredictionsStore";

describe("calibrationNotes", () => {
  let tmpDir: string;
  const savedPath = process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `solus-notes-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH = path.join(
      tmpDir,
      "predictions.jsonl",
    );
  });

  afterEach(() => {
    if (savedPath !== undefined)
      process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH = savedPath;
    else delete process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH;
    try {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("returns empty string when no resolved predictions", () => {
    const notes = computeCalibrationNotes(90);
    expect(notes).toBe("");
  });

  it("returns Learning and Brier when at least one resolved row exists", () => {
    appendRecord({
      asset: "BTC",
      strike: 106000,
      expiryUtc: new Date().toISOString(),
      predictedAssignProb: 0.24,
    });
    resolveLatestForAssetStrike("BTC", 1, 106000);
    const notes = computeCalibrationNotes(90);
    expect(notes).toContain("Learning:");
    expect(notes).toContain("Brier");
    expect(notes).toContain("Overall");
  });

  it("getCalibrationNotesPath returns path under store dir", () => {
    const p = getCalibrationNotesPath();
    expect(p).toContain(getStoreDir());
    expect(p).toEndWith("solus-calibration-notes.txt");
  });

  it("writeCalibrationNotesFile writes when content exists", () => {
    appendRecord({
      asset: "BTC",
      strike: 106000,
      expiryUtc: new Date().toISOString(),
      predictedAssignProb: 0.24,
    });
    resolveLatestForAssetStrike("BTC", 1, 106000);
    writeCalibrationNotesFile(90);
    const notesPath = getCalibrationNotesPath();
    expect(fs.existsSync(notesPath)).toBe(true);
    const content = fs.readFileSync(notesPath, "utf-8");
    expect(content).toContain("Learning:");
  });
});
