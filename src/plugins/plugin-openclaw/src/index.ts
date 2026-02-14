import type { Plugin } from "@elizaos/core";
import { openclawGatewayStatusAction } from "./actions/gatewayStatus.action";
import { openclawSecurityGuideAction } from "./actions/openclawSecurityGuide.action";
import { openclawSetupGuideAction } from "./actions/setupGuide.action";
import { openclawAgentsGuideAction } from "./actions/openclawAgentsGuide.action";
import { openclawTipsAction } from "./actions/openclawTips.action";
import { openclawUseCasesAction } from "./actions/openclawUseCases.action";
import { openclawWorkspaceSyncAction } from "./actions/openclawWorkspaceSync.action";
import { openclawAi2027Action } from "./actions/ai2027.action";
import { openclawAiResearchAgentsAction } from "./actions/aiResearchAgents.action";
import { openclawHip3AiAssetsAction } from "./actions/hip3AiAssets.action";
import { openclawContextProvider } from "./providers/openclawContext.provider";
import { shouldOpenclawPluginBeInContext } from "../matcher";

export const openclawPlugin: Plugin = {
  name: "plugin-openclaw",
  description: `AI-obsessed plugin — OpenClaw as core expertise. AI 2027, AGI timelines, research agents, alignment. Setup, gateway, openclaw-agents, tips, use cases.`,
  actions: [
    openclawGatewayStatusAction,
    openclawSecurityGuideAction,
    openclawSetupGuideAction,
    openclawAgentsGuideAction,
    openclawTipsAction,
    openclawUseCasesAction,
    openclawWorkspaceSyncAction,
    openclawAi2027Action,
    openclawAiResearchAgentsAction,
    openclawHip3AiAssetsAction,
  ],
  evaluators: [],
  providers: [openclawContextProvider],
};

export default openclawPlugin;

export {
  openclawGatewayStatusAction,
  openclawSecurityGuideAction,
  openclawSetupGuideAction,
  openclawAgentsGuideAction,
  openclawTipsAction,
  openclawUseCasesAction,
  openclawWorkspaceSyncAction,
  openclawAi2027Action,
  openclawAiResearchAgentsAction,
  openclawHip3AiAssetsAction,
  shouldOpenclawPluginBeInContext,
};
