/**
 * Plugin-Solus — Hypersurface expertise for Solus: mechanics, strike ritual, position assessment, optimal strike.
 * Provider injects Hypersurface cheat sheet into every reply; actions give structured responses for key intents.
 * Also: offchain stock specialist — Finnhub service + stock pulse provider for watchlist sectors/tickers.
 */

import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { hypersurfaceContextProvider } from "./providers/hypersurfaceContext.provider";
import { hypersurfaceSpotPricesProvider } from "./providers/hypersurfaceSpotPrices.provider";
import { solusStockPulseProvider } from "./providers/solusStockPulse.provider";
import { AlphaVantageService } from "./services/alphaVantage.service";
import { FinnhubService } from "./services/finnhub.service";
import { FMPService } from "./services/fmp.service";
import { MissionControlService } from "./services/missionControl.service";
import {
  solusStrikeRitualAction,
  solusHypersurfaceExplainAction,
  solusPositionAssessAction,
  solusOptimalStrikeAction,
  solusAnalyzeAction,
  solusEarningsCalendarAction,
  mcRegisterSatoshiAction,
  mcAssignTaskAction,
  mcListTasksAction,
} from "./actions";

export const solusPlugin: Plugin = {
  name: "plugin-solus",
  description:
    "Hypersurface expertise for Solus: mechanics, strike ritual, position assess, optimal strike. Offchain stock pulse via Finnhub. Solus only.",

  services: [FinnhubService, AlphaVantageService, FMPService, MissionControlService],
  providers: [
    hypersurfaceContextProvider,
    hypersurfaceSpotPricesProvider,
    solusStockPulseProvider,
  ],
  actions: [
    solusStrikeRitualAction,
    solusHypersurfaceExplainAction,
    solusPositionAssessAction,
    solusOptimalStrikeAction,
    solusAnalyzeAction,
    solusEarningsCalendarAction,
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
  },
};

export { hypersurfaceContextProvider } from "./providers/hypersurfaceContext.provider";
export { hypersurfaceSpotPricesProvider } from "./providers/hypersurfaceSpotPrices.provider";
export { solusStockPulseProvider } from "./providers/solusStockPulse.provider";
export { AlphaVantageService } from "./services/alphaVantage.service";
export { FinnhubService } from "./services/finnhub.service";
export { FMPService } from "./services/fmp.service";
export { MissionControlService } from "./services/missionControl.service";
export { solusStrikeRitualAction } from "./actions/solusStrikeRitual.action";
export { solusHypersurfaceExplainAction } from "./actions/solusHypersurfaceExplain.action";
export { solusPositionAssessAction } from "./actions/solusPositionAssess.action";
export { solusOptimalStrikeAction } from "./actions/solusOptimalStrike.action";
export { solusAnalyzeAction } from "./actions/solusAnalyze.action";
export { solusEarningsCalendarAction } from "./actions/solusEarningsCalendar.action";
export { mcRegisterSatoshiAction } from "./actions/missionControl.actions";
export { mcAssignTaskAction } from "./actions/missionControl.actions";
export { mcListTasksAction } from "./actions/missionControl.actions";
