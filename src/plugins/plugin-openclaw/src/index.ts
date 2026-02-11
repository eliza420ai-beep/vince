import type { Plugin } from "@elizaos/core";
import { runResearchAction } from "./actions/runResearch.action";
import { shouldOpenclawPluginBeInContext } from "../matcher";

export const openclawPlugin: Plugin = {
  name: "plugin-openclaw",
  description:
    "OpenClaw integration for VINCE - spawns isolated sub-agents for crypto research including alpha (X/Twitter sentiment, KOL tracking), market data (prices, volume, funding, OI), on-chain analysis (whale flows, smart money, DEX liquidity), and news aggregation",
  actions: [runResearchAction],
  evaluators: [],
  providers: [],
};

export default openclawPlugin;

export { runResearchAction, shouldOpenclawPluginBeInContext };
