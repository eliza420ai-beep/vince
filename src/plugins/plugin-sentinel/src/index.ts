/**
 * Plugin-Sentinel — Core dev: ops, architecture, benchmarks, examples, plugins, cost steward.
 *
 * Actions: SENTINEL_SUGGEST, SENTINEL_CLAWDBOT_GUIDE, SENTINEL_SETTINGS_SUGGEST,
 * SENTINEL_ONNX_STATUS, SENTINEL_ART_GEMS, SENTINEL_COST_STATUS, SENTINEL_ART_PITCH. Weekly + optional daily tasks. Sentinel only.
 */

import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { sentinelSuggestAction } from "./actions/sentinelSuggest.action";
import { sentinelClawdbotGuideAction } from "./actions/sentinelClawdbotGuide.action";
import { sentinelSettingsSuggestAction } from "./actions/sentinelSettingsSuggest.action";
import { sentinelOnnxStatusAction } from "./actions/sentinelOnnxStatus.action";
import { sentinelArtGemsAction } from "./actions/sentinelArtGems.action";
import { sentinelDocImproveAction } from "./actions/sentinelDocImprove.action";
import { sentinelCostStatusAction } from "./actions/sentinelCostStatus.action";
import { sentinelArtPitchAction } from "./actions/sentinelArtPitch.action";
import { registerSentinelWeeklyTask } from "./tasks/sentinelWeekly.tasks";
import { registerSentinelDailyTask } from "./tasks/sentinelDaily.tasks";

export const sentinelPlugin: Plugin = {
  name: "plugin-sentinel",
  description:
    "Core dev: ops, runbook, architecture steward, proactive suggestions, ONNX/ML, ART, clawdbot, settings, benchmarks, examples, elizaos-plugins. Sentinel only.",

  actions: [
    sentinelSuggestAction,
    sentinelClawdbotGuideAction,
    sentinelSettingsSuggestAction,
    sentinelOnnxStatusAction,
    sentinelArtGemsAction,
    sentinelDocImproveAction,
    sentinelCostStatusAction,
    sentinelArtPitchAction,
  ],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    const name = (runtime.character?.name ?? "").toUpperCase();
    if (name !== "SENTINEL") {
      return;
    }
    setImmediate(async () => {
      try {
        await registerSentinelWeeklyTask(runtime);
        await registerSentinelDailyTask(runtime);
      } catch (e) {
        logger.warn("[Sentinel] Failed to register tasks:", e);
      }
    });
  },
};

export { sentinelSuggestAction } from "./actions/sentinelSuggest.action";
export { sentinelClawdbotGuideAction } from "./actions/sentinelClawdbotGuide.action";
export { sentinelSettingsSuggestAction } from "./actions/sentinelSettingsSuggest.action";
export { sentinelOnnxStatusAction } from "./actions/sentinelOnnxStatus.action";
export { sentinelArtGemsAction } from "./actions/sentinelArtGems.action";
export { sentinelDocImproveAction } from "./actions/sentinelDocImprove.action";
export { sentinelCostStatusAction } from "./actions/sentinelCostStatus.action";
export { sentinelArtPitchAction } from "./actions/sentinelArtPitch.action";
export { registerSentinelWeeklyTask } from "./tasks/sentinelWeekly.tasks";
export { registerSentinelDailyTask } from "./tasks/sentinelDaily.tasks";
