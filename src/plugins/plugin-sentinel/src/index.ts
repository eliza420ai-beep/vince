/**
 * Plugin-Sentinel — Core Dev: PRDs, Project Radar, Impact-Scored Suggestions, OpenClaw Expert
 *
 * The 10x upgrade: Sentinel is now a world-class core dev that:
 * - Produces enterprise-grade PRDs for Cursor/Claude Code
 * - Deeply understands project state via Project Radar
 * - Scores suggestions by impact (RICE + strategic alignment)
 * - Knows OpenClaw (formerly ClawdBot/MoltBot) inside and out
 * - Tracks 24/7 market research as TOP PRIORITY
 *
 * Actions (13):
 * - SENTINEL_SUGGEST: Impact-scored suggestions with project awareness
 * - SENTINEL_PRD: World-class PRD generation
 * - SENTINEL_SHIP: What to ship for maximum impact
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
 * Services (4):
 * - projectRadar.service: Deep project state scanning (plugins, progress, knowledge, docs, todos)
 * - impactScorer.service: RICE + strategic scoring, learns from outcomes
 * - prdGenerator.service: World-class PRD templates with architecture rules
 * - openclawKnowledge.service: Deep OpenClaw/Milaidy/Clawdbot expertise
 *
 * Weekly + optional daily tasks. Sentinel only.
 */

import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";

// Actions
import { sentinelSuggestAction } from "./actions/sentinelSuggest.action";
import { sentinelPrdAction } from "./actions/sentinelPrd.action";
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

// Tasks
import { registerSentinelWeeklyTask } from "./tasks/sentinelWeekly.tasks";
import { registerSentinelDailyTask } from "./tasks/sentinelDaily.tasks";

// Services
import * as projectRadarService from "./services/projectRadar.service";
import * as impactScorerService from "./services/impactScorer.service";
import * as prdGeneratorService from "./services/prdGenerator.service";
import * as openclawKnowledgeService from "./services/openclawKnowledge.service";

export const sentinelPlugin: Plugin = {
  name: "plugin-sentinel",
  description:
    "Core dev: world-class PRDs, project radar, impact-scored suggestions, OpenClaw expert. 24/7 market research is TOP PRIORITY. OpenClaw matters A LOT. Sentinel only.",

  actions: [
    sentinelSuggestAction,      // Impact-scored suggestions
    sentinelPrdAction,          // NEW: World-class PRD generation
    sentinelShipAction,         // What to ship for max impact
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
    
    logger.info("[Sentinel] 🦞 Core dev initialized — PRDs, Project Radar, Impact Scorer, OpenClaw Expert");
    logger.info("[Sentinel] North star: 24/7 market research is TOP PRIORITY. OpenClaw matters A LOT.");
    
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

// Action exports
export { sentinelSuggestAction } from "./actions/sentinelSuggest.action";
export { sentinelPrdAction } from "./actions/sentinelPrd.action";
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
export { sentinelShipAction } from "./actions/sentinelShip.action";

// Task exports
export { registerSentinelWeeklyTask } from "./tasks/sentinelWeekly.tasks";
export { registerSentinelDailyTask } from "./tasks/sentinelDaily.tasks";

// Service exports — use these programmatically
export * as projectRadar from "./services/projectRadar.service";
export * as impactScorer from "./services/impactScorer.service";
export * as prdGenerator from "./services/prdGenerator.service";
export * as openclawKnowledge from "./services/openclawKnowledge.service";
