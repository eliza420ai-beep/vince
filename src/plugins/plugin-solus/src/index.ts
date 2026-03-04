/**
 * Plugin-Solus — Hypersurface expertise for Solus: mechanics, strike ritual, position assessment, optimal strike.
 * Provider injects Hypersurface cheat sheet into every reply; actions give structured responses for key intents.
 * Also: offchain stock specialist — Finnhub service + stock pulse provider for watchlist sectors/tickers.
 */

import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { hypersurfaceContextProvider } from "./providers/hypersurfaceContext.provider";
import { hypersurfaceSpotPricesProvider } from "./providers/hypersurfaceSpotPrices.provider";
import { solusSizingStateProvider } from "./providers/solusSizingState.provider";
import { solusMarketContextProvider } from "./providers/solusMarketContext.provider";
import { solusOptionsContextProvider } from "./providers/solusOptionsContext.provider";
import { solusCalibrationContextProvider } from "./providers/solusCalibrationContext.provider";
import { solusStockPulseProvider } from "./providers/solusStockPulse.provider";
import { solusStockCalibrationContextProvider } from "./providers/solusStockCalibrationContext.provider";
import { solusThemeBriefProvider } from "./providers/solusThemeBrief.provider";
import { vinceStrikeSuggestionProvider } from "./providers/vinceStrikeSuggestion.provider";
import { echoWttSignalProvider } from "./providers/echoWttSignal.provider";
import { AlphaVantageService } from "./services/alphaVantage.service";
import { FinnhubService } from "./services/finnhub.service";
import { FMPService } from "./services/fmp.service";
import { MissionControlService } from "./services/missionControl.service";
import { SolusMlInferenceService } from "./services/solusMlInference.service";
import { SolusOptionsCacheService } from "./services/solusOptionsCache.service";
import { SolusThemeBriefService } from "./services/solusThemeBrief.service";
import { registerSolusAssignmentResolveReminderTask } from "./tasks/solusAssignmentResolveReminder.tasks";
import { registerSolusOptionsRefreshTask } from "./tasks/solusOptionsRefresh.tasks";
import { registerSolusCalibrationNotesTask } from "./tasks/solusCalibrationNotes.tasks";
import { registerSolusTrainCalibrationTask } from "./tasks/solusTrainCalibration.tasks";
import { registerSolusStockCalibrationTask } from "./tasks/solusStockCalibration.tasks";
import {
  solusStrikeRitualAction,
  solusHypersurfaceExplainAction,
  solusPositionAssessAction,
  solusOptimalStrikeAction,
  solusAnalyzeAction,
  solusThemeRadarAction,
  solusEarningsCalendarAction,
  solusPremiumPnlAction,
  solusAssignmentCalibrationAction,
  mcRegisterSatoshiAction,
  mcAssignTaskAction,
  mcListTasksAction,
} from "./actions";

export const solusPlugin: Plugin = {
  name: "plugin-solus",
  description:
    "Hypersurface expertise for Solus: mechanics, strike ritual, position assess, optimal strike. Offchain stock pulse via Finnhub. Solus only.",

  services: [
    FinnhubService,
    AlphaVantageService,
    FMPService,
    MissionControlService,
    SolusMlInferenceService,
    SolusOptionsCacheService,
    SolusThemeBriefService,
  ],
  providers: [
    hypersurfaceContextProvider,
    hypersurfaceSpotPricesProvider,
    solusSizingStateProvider,
    solusMarketContextProvider,
    solusOptionsContextProvider,
    solusCalibrationContextProvider,
    solusStockPulseProvider,
    solusStockCalibrationContextProvider,
    solusThemeBriefProvider,
    vinceStrikeSuggestionProvider,
    echoWttSignalProvider,
  ],
  actions: [
    solusStrikeRitualAction,
    solusHypersurfaceExplainAction,
    solusPositionAssessAction,
    solusOptimalStrikeAction,
    solusAnalyzeAction,
    solusThemeRadarAction,
    solusEarningsCalendarAction,
    solusPremiumPnlAction,
    solusAssignmentCalibrationAction,
    mcRegisterSatoshiAction,
    mcAssignTaskAction,
    mcListTasksAction,
  ],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    const name = (runtime.character?.name ?? "").toUpperCase();
    if (name !== "SOLUS") {
      return;
    }
    const finnhubOk = runtime.getService("FINNHUB_SERVICE");
    const avOk = runtime.getService("ALPHA_VANTAGE_SERVICE");
    const stockOk = finnhubOk || avOk;
    const mcOk = runtime.getService("MISSION_CONTROL_SERVICE");
    logger.info(
      "[Solus] Hypersurface actions and providers registered." +
        (stockOk
          ? " Stock pulse enabled (Finnhub or Alpha Vantage)."
          : " Set FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY for offchain stock pulse. MCP: https://mcp.alphavantage.co/") +
        (mcOk
          ? " Mission Control connected."
          : " Set MISSION_CONTROL_TOKEN to connect to Mission Control."),
    );

    setImmediate(() => {
      registerSolusAssignmentResolveReminderTask(runtime).catch((err) => {
        logger.warn(
          "[Solus] registerSolusAssignmentResolveReminderTask failed:",
          err,
        );
      });
      registerSolusCalibrationNotesTask(runtime).catch((err) => {
        logger.warn("[Solus] registerSolusCalibrationNotesTask failed:", err);
      });
      registerSolusTrainCalibrationTask(runtime).catch((err) => {
        logger.warn("[Solus] registerSolusTrainCalibrationTask failed:", err);
      });
      registerSolusOptionsRefreshTask(runtime).catch((err) => {
        logger.warn("[Solus] registerSolusOptionsRefreshTask failed:", err);
      });
      registerSolusStockCalibrationTask(runtime).catch((err) => {
        logger.warn("[Solus] registerSolusStockCalibrationTask failed:", err);
      });
    });
  },
};

export { hypersurfaceContextProvider } from "./providers/hypersurfaceContext.provider";
export { hypersurfaceSpotPricesProvider } from "./providers/hypersurfaceSpotPrices.provider";
export { solusStockPulseProvider } from "./providers/solusStockPulse.provider";
export { solusStockCalibrationContextProvider } from "./providers/solusStockCalibrationContext.provider";
export { solusThemeBriefProvider } from "./providers/solusThemeBrief.provider";
export { echoWttSignalProvider } from "./providers/echoWttSignal.provider";
export { AlphaVantageService } from "./services/alphaVantage.service";
export { FinnhubService } from "./services/finnhub.service";
export { FMPService } from "./services/fmp.service";
export { SolusThemeBriefService } from "./services/solusThemeBrief.service";
export { MissionControlService } from "./services/missionControl.service";
export { solusStrikeRitualAction } from "./actions/solusStrikeRitual.action";
export { solusHypersurfaceExplainAction } from "./actions/solusHypersurfaceExplain.action";
export { solusPositionAssessAction } from "./actions/solusPositionAssess.action";
export { solusOptimalStrikeAction } from "./actions/solusOptimalStrike.action";
export { solusAnalyzeAction } from "./actions/solusAnalyze.action";
export { solusThemeRadarAction } from "./actions/solusThemeRadar.action";
export { solusEarningsCalendarAction } from "./actions/solusEarningsCalendar.action";
export { solusPremiumPnlAction } from "./actions/solusPremiumPnl.action";
export { solusAssignmentCalibrationAction } from "./actions/solusAssignmentCalibration.action";
export { mcRegisterSatoshiAction } from "./actions/missionControl.actions";
export { mcAssignTaskAction } from "./actions/missionControl.actions";
export { mcListTasksAction } from "./actions/missionControl.actions";
export { registerSolusAssignmentResolveReminderTask } from "./tasks/solusAssignmentResolveReminder.tasks";
export { registerSolusCalibrationNotesTask } from "./tasks/solusCalibrationNotes.tasks";
export { registerSolusTrainCalibrationTask } from "./tasks/solusTrainCalibration.tasks";
export { registerSolusOptionsRefreshTask } from "./tasks/solusOptionsRefresh.tasks";
export { registerSolusStockCalibrationTask } from "./tasks/solusStockCalibration.tasks";
