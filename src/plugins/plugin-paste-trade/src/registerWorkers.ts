import type { IAgentRuntime, Task } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { PasteTradeClient } from "./pasteTradeClient.ts";
import { runPasteTradePipeline } from "./pipeline.ts";
import { getRun, updateRun } from "./runRegistry.ts";

export function registerPasteTradeTaskWorkers(runtime: IAgentRuntime): void {
  runtime.registerTaskWorker({
    name: "PASTE_TRADE_PIPELINE",
    validate: async () => true,
    execute: async (
      rt: IAgentRuntime,
      _options: Record<string, unknown>,
      task: Task,
    ) => {
      const runId = String((task.metadata as { runId?: string })?.runId ?? "");
      if (!runId) {
        logger.warn("[paste-trade] PASTE_TRADE_PIPELINE missing runId");
        return;
      }
      const rec = getRun(runId);
      if (!rec) {
        logger.warn(`[paste-trade] PASTE_TRADE_PIPELINE unknown run ${runId}`);
        return;
      }
      if (rec.localOnly) {
        await runPasteTradePipeline(rt, rec, null);
        return;
      }
      const client = PasteTradeClient.fromRuntime(rt);
      if (!client) {
        logger.warn(
          `[paste-trade] PASTE_TRADE_PIPELINE run ${runId} needs PASTE_TRADE_KEY for remote publish`,
        );
        updateRun(runId, {
          status: "error",
          error: "PASTE_TRADE_KEY not configured (required for remote publish)",
        });
        return;
      }
      await runPasteTradePipeline(rt, rec, client);
    },
  });
}
