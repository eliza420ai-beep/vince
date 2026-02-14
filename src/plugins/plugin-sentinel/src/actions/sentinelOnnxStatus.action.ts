/**
 * SENTINEL_ONNX_STATUS — Feature-store state, ONNX training readiness, one-line next step.
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "onnx status",
  "feature store",
  "ml pipeline",
  "training data",
  "feature-store",
  "onnx",
];

function wantsOnnxStatus(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelOnnxStatusAction: Action = {
  name: "SENTINEL_ONNX_STATUS",
  similes: ["ONNX_STATUS", "FEATURE_STORE_STATUS", "ML_PIPELINE_STATUS"],
  description:
    "Summarizes feature-store state (local jsonl, PGLite/Postgres, Supabase), ONNX training readiness (90+ rows), and one-line next step (train_models, enable Supabase). Uses knowledge FEATURE-STORE, ONNX.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsOnnxStatus(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_ONNX_STATUS] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const prompt = `You are Sentinel. The user asked about ONNX status, feature store, or ML pipeline. Using the context below (internal-docs, FEATURE-STORE.md, ONNX.md, WORTH_IT_PROOF.md), write one short paragraph (flowing prose, no bullet list). Cover: where the feature store lives (local jsonl, PGLite/Postgres plugin_vince.paper_bot_features, optional Supabase), ONNX training readiness (90+ rows; mention enabling dual-write if Supabase/key not set), and one clear next step (e.g. run train_models.py, set SUPABASE_SERVICE_ROLE_KEY, or add more paper trades). No preamble.

${NO_AI_SLOP}

Context:\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      const out = "Here's the ONNX and feature-store status—\n\n" + text.trim();
      await callback({ text: out });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_ONNX_STATUS] Failed:", error);
      await callback({
        text: "Feature store: local jsonl in .elizadb/vince-paper-bot/features/; PGLite/Postgres table plugin_vince.paper_bot_features; optional Supabase vince_paper_bot_features (SUPABASE_SERVICE_ROLE_KEY). ONNX: 90+ rows then run train_models.py. Refs: FEATURE-STORE.md, ONNX.md.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "What is the ONNX and feature store status?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Feature store: jsonl + PGLite/Postgres; optional Supabase for 500+ query. ONNX: 90+ rows then train_models.py. Next step: if 90+ rows run train_models.py; else enable Supabase dual-write and collect more trades. Refs: FEATURE-STORE.md, ONNX.md.",
        },
      },
    ],
  ],
};
