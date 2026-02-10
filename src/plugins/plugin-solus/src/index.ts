/**
 * Plugin-Solus — Hypersurface expertise for Solus: mechanics, strike ritual, position assessment, optimal strike.
 * Provider injects Hypersurface cheat sheet into every reply; actions give structured responses for key intents.
 */

import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { hypersurfaceContextProvider } from "./providers/hypersurfaceContext.provider";
import { hypersurfaceSpotPricesProvider } from "./providers/hypersurfaceSpotPrices.provider";
import {
  solusStrikeRitualAction,
  solusHypersurfaceExplainAction,
  solusPositionAssessAction,
  solusOptimalStrikeAction,
} from "./actions";

export const solusPlugin: Plugin = {
  name: "plugin-solus",
  description:
    "Hypersurface expertise for Solus: mechanics, strike ritual, position assess, optimal strike. Provider + four actions; Solus only.",

  providers: [hypersurfaceContextProvider, hypersurfaceSpotPricesProvider],
  actions: [
    solusStrikeRitualAction,
    solusHypersurfaceExplainAction,
    solusPositionAssessAction,
    solusOptimalStrikeAction,
  ],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    const name = (runtime.character?.name ?? "").toUpperCase();
    if (name !== "SOLUS") {
      return;
    }
    logger.info("[Solus] Hypersurface actions and provider registered.");
  },
};

export { hypersurfaceContextProvider } from "./providers/hypersurfaceContext.provider";
export { hypersurfaceSpotPricesProvider } from "./providers/hypersurfaceSpotPrices.provider";
export { solusStrikeRitualAction } from "./actions/solusStrikeRitual.action";
export { solusHypersurfaceExplainAction } from "./actions/solusHypersurfaceExplain.action";
export { solusPositionAssessAction } from "./actions/solusPositionAssess.action";
export { solusOptimalStrikeAction } from "./actions/solusOptimalStrike.action";
