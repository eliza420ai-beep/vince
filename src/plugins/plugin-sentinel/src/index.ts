/**
 * Plugin-Sentinel — Core dev: ops, architecture, benchmarks, examples, plugins, cost steward.
 *
 * Actions (12):
 * - SENTINEL_SUGGEST: General improvement suggestions
 * - SENTINEL_SHIP: What to ship for maximum impact (uses Project Radar + Impact Scorer)
 * - SENTINEL_CLAWDBOT_GUIDE: Knowledge research setup
 * - SENTINEL_SETTINGS_SUGGEST: Settings recommendations
 * - SENTINEL_ONNX_STATUS: ML/ONNX health check
 * - SENTINEL_ART_GEMS: ElizaOS examples/art gems
 * - SENTINEL_DOC_IMPROVE: Documentation improvements
 * - SENTINEL_COST_STATUS: Cost and treasury status
 * - SENTINEL_ART_PITCH: Gen art pitch
 * - SENTINEL_INVESTOR_REPORT: VC/investor pitch
 * - SENTINEL_HOW_DID_WE_DO: Outcome review
 * - SENTINEL_SECURITY_CHECKLIST: Security hygiene
 *
 * Services (2):
 * - projectRadar.service: Scans entire project state (plugins, progress, knowledge, north star)
 * - impactScorer.service: RICE + strategic scoring, learns from suggestion outcomes
 *
 * Weekly + optional daily tasks. Sentinel only.
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
import { sentinelInvestorReportAction } from "./actions/sentinelInvestorReport.action";
import { sentinelHowDidWeDoAction } from "./actions/sentinelHowDidWeDo.action";
import { sentinelSecurityChecklistAction } from "./actions/sentinelSecurityChecklist.action";
import { sentinelShipAction } from "./actions/sentinelShip.action";
import { registerSentinelWeeklyTask } from "./tasks/sentinelWeekly.tasks";
import { registerSentinelDailyTask } from "./tasks/sentinelDaily.tasks";

// Services
import * as projectRadarService from "./services/projectRadar.service";
import * as impactScorerService from "./services/impactScorer.service";

export const sentinelPlugin: Plugin = {
  name: "plugin-sentinel",
  description:
    "Core dev: ops, runbook, architecture steward, proactive suggestions, ONNX/ML, ART, clawdbot, settings, benchmarks, examples, elizaos-plugins. Sentinel only.",

  actions: [
    sentinelSuggestAction,
    sentinelShipAction, // NEW: What to ship for max impact
    sentinelClawdbotGuideAction,
    sentinelSettingsSuggestAction,
    sentinelOnnxStatusAction,
    sentinelArtGemsAction,
    sentinelDocImproveAction,
    sentinelCostStatusAction,
    sentinelArtPitchAction,
    sentinelInvestorReportAction,
    sentinelHowDidWeDoAction,
    sentinelSecurityChecklistAction,
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
export { sentinelInvestorReportAction } from "./actions/sentinelInvestorReport.action";
export { sentinelHowDidWeDoAction } from "./actions/sentinelHowDidWeDo.action";
export { sentinelSecurityChecklistAction } from "./actions/sentinelSecurityChecklist.action";
export { registerSentinelWeeklyTask } from "./tasks/sentinelWeekly.tasks";
export { registerSentinelDailyTask } from "./tasks/sentinelDaily.tasks";
export { sentinelShipAction } from "./actions/sentinelShip.action";

// Services
export * as projectRadar from "./services/projectRadar.service";
export * as impactScorer from "./services/impactScorer.service";
