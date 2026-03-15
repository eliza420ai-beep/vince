/**
 * Research Autopilot task: one-shot run from Watchlist Radar → dossiers → X enrichment → synthesis → essay draft.
 * PRD: Watchlist-to-Substack Autopilot. Trigger via task execution or chat/CLI.
 */

import { type IAgentRuntime, logger } from "@elizaos/core";
import type { ResearchAutopilotService } from "../services/researchAutopilot.service";
import type { ResearchAutopilotSelectionMode } from "../research-autopilot/types";

const TASK_NAME = "RESEARCH_AUTOPILOT_RUN";

export interface ResearchAutopilotTaskOptions {
  selectionMode?: ResearchAutopilotSelectionMode;
  maxTickerCount?: number;
  customSymbols?: string[];
}

export async function registerResearchAutopilotTask(
  runtime: IAgentRuntime,
): Promise<void> {
  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (_runtime, options: ResearchAutopilotTaskOptions, _task) => {
      const service = runtime.getService(
        "RESEARCH_AUTOPILOT_SERVICE",
      ) as ResearchAutopilotService | null;
      if (!service) {
        logger.warn("[ResearchAutopilot] Service not found; skip run");
        return;
      }
      const result = await service.run({
        selectionMode: options?.selectionMode ?? "research_next",
        maxTickerCount: options?.maxTickerCount ?? undefined,
        customSymbols: options?.customSymbols,
      });
      logger.info(
        `[ResearchAutopilot] Run ${result.runId} ${result.status} symbols=${result.symbols.length} ${result.errors.length ? `errors=${result.errors.length}` : ""}`,
      );
    },
  });
}
