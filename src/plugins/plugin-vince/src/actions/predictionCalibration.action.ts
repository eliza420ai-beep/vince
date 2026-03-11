import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import type { PredictionTrackerService } from "../services/predictionTracker.service";

function parseWindowDays(text: string): number {
  const m = text.match(/(\d+)\s*d/);
  const parsed = m ? Number.parseInt(m[1], 10) : 30;
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(180, parsed));
}

export const vincePredictionCalibrationAction: Action = {
  name: "VINCE_PREDICTION_CALIBRATION",
  similes: [
    "PREDICTION_CALIBRATION",
    "PREDICTION_BRIER",
    "CALIBRATION_STATUS",
    "PREDICTION_SCORE",
  ],
  description:
    "Read-only prediction calibration status from Vince prediction tracker (Brier by agent).",
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content.text?.toLowerCase() ?? "";
    return (
      text.includes("prediction calibration") ||
      text.includes("brier") ||
      text.includes("calibration status") ||
      text.includes("prediction score")
    );
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const tracker = runtime.getService<PredictionTrackerService>(
      "VINCE_PREDICTION_TRACKER_SERVICE",
    );
    if (!tracker) {
      await callback({
        text: "Prediction tracker unavailable.",
        actions: ["REPLY"],
      });
      return undefined;
    }
    const text = message.content.text ?? "";
    const windowDays = parseWindowDays(text);
    const snap = tracker.getCalibrationSnapshot(windowDays);
    const overall =
      snap.overallMeanBrier == null ? "n/a" : snap.overallMeanBrier.toFixed(4);
    const lines = [
      `Prediction calibration (${windowDays}d): overallBrier=${overall} count=${snap.overallCount}`,
      `predictionBrier=${overall} predictionCount=${snap.overallCount}`,
    ];
    if (snap.byAgent.length > 0) {
      lines.push(
        ...snap.byAgent
          .sort((a, b) => a.meanBrier - b.meanBrier)
          .slice(0, 5)
          .map(
            (row) =>
              `- ${row.agent}: brier=${row.meanBrier.toFixed(4)} n=${row.count}`,
          ),
      );
    }
    await callback({
      text: lines.join("\n"),
      actions: ["VINCE_PREDICTION_CALIBRATION"],
    });
    return undefined;
  },
  examples: [
    [
      { name: "{{name1}}", content: { text: "prediction calibration 30d" } },
      {
        name: "{{name2}}",
        content: {
          text: "Prediction calibration (30d): overallBrier=0.1830 count=24",
          actions: ["VINCE_PREDICTION_CALIBRATION"],
        },
      },
    ],
  ],
};
