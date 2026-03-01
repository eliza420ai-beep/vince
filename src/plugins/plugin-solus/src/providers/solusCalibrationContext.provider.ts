/**
 * SOLUS_CALIBRATION_CONTEXT — Injects assignment calibration (Brier + recent outcomes) into state
 * so Solus sees its own track record when giving strike/strategy advice. Enables recursive learning:
 * the model can temper confidence or note bias when Brier is high or recent outcomes show systematic error.
 */

import * as fs from "node:fs";
import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { loadRecords, computeBrier } from "../utils/assignmentPredictionsStore";
import { getCalibrationNotesPath } from "../utils/calibrationNotes";

const RECENT_COUNT = 10;

export const solusCalibrationContextProvider: Provider = {
  name: "SOLUS_CALIBRATION_CONTEXT",
  description:
    "Assignment calibration: Brier score (last 30d) and recent resolved outcomes. Use to temper confidence or note bias when giving strike advice.",
  position: -3,

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const report = computeBrier(30);
    const records = loadRecords();
    const resolved = records
      .filter((r) => r.resolvedAt != null && r.outcome !== undefined)
      .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
      .slice(0, RECENT_COUNT);

    let text: string;
    if (report.count === 0) {
      text =
        'Assignment calibration: No resolved predictions yet. Record with "record assignment prediction: <asset> <strike> <prob>%" and resolve at expiry with "we got assigned" or "we didn\'t get assigned."';
    } else {
      const recentLines = resolved.map((r) => {
        const pct = Math.round(r.predictedAssignProb * 100);
        const outcome = r.outcome === 1 ? "assigned" : "not assigned";
        return `${r.asset} $${r.strike.toLocaleString()} ${pct}% → ${outcome}`;
      });
      text = [
        `Assignment calibration (last 30d): Brier = ${report.meanBrier.toFixed(4)} (n = ${report.count}). Lower is better.`,
        "Recent:",
        ...recentLines,
      ].join(" ");
    }

    let notesLine = "";
    try {
      const notesPath = getCalibrationNotesPath();
      if (fs.existsSync(notesPath)) {
        const notesContent = fs.readFileSync(notesPath, "utf-8").trim();
        if (notesContent) notesLine = ` Calibration notes: ${notesContent}`;
      }
    } catch {
      // non-fatal: provider still returns Brier + recent
    }

    return {
      text: `[Solus calibration]\n${text}${notesLine}`,
      values: {
        brierMean: report.meanBrier,
        brierCount: report.count,
        recentResolved: resolved,
      },
    };
  },
};
