import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { readStockCalibrationNotes } from "../utils/stockRecommendationsStore";

function wantsStockCalibration(messageText: string): boolean {
  const t = (messageText || "").toLowerCase();
  const keys = [
    "stock",
    "stocks",
    "analyze",
    "theme radar",
    "theme",
    "ai infrastructure",
    "accumulate",
    "watch",
    "avoid",
  ];
  return keys.some((k) => t.includes(k));
}

export const solusStockCalibrationContextProvider: Provider = {
  name: "SOLUS_STOCK_CALIBRATION_CONTEXT",
  description:
    "Injects Solus stock calibration notes (score buckets, hit-rate, invalidation failures).",
  position: 12,
  get: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const text = message.content?.text || "";
    if (!wantsStockCalibration(text)) {
      return { text: "", values: {} };
    }
    const notes = readStockCalibrationNotes();
    if (!notes) return { text: "", values: {} };
    return {
      text: `[Solus stock calibration context]\n${notes}`,
      values: { solusStockCalibration: notes },
    };
  },
};
