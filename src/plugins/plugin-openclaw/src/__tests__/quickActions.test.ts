/**
 * Clawterm quick-actions validation tests.
 * Quick-action messages from QUICK_ACTIONS_BY_AGENT.clawterm in chat-interface.tsx.
 * Asserts at least one relevant action validates for each message (except "What can you do?").
 */

import { describe, it, expect } from "vitest";
import type { IAgentRuntime, Memory } from "@elizaos/core";
import { openclawGatewayStatusAction } from "../actions/gatewayStatus.action";
import { openclawSecurityGuideAction } from "../actions/openclawSecurityGuide.action";
import { openclawSetupGuideAction } from "../actions/setupGuide.action";
import { openclawAgentsGuideAction } from "../actions/openclawAgentsGuide.action";
import { openclawTipsAction } from "../actions/openclawTips.action";
import { openclawUseCasesAction } from "../actions/openclawUseCases.action";
import { openclawWorkspaceSyncAction } from "../actions/openclawWorkspaceSync.action";
import { openclawAi2027Action } from "../actions/ai2027.action";
import { openclawAiResearchAgentsAction } from "../actions/aiResearchAgents.action";
import { openclawHip3AiAssetsAction } from "../actions/hip3AiAssets.action";
import { xSearchAction } from "../../../plugin-x-research/src/actions/xSearch.action";

const CLAWTERM_QUICK_ACTIONS = [
  { label: "What can Clawterm do?", message: "What can you do?" },
  { label: "AI 2027", message: "What's AI 2027?" },
  { label: "AGI timeline", message: "Tell me about the AGI timeline" },
  { label: "Research agents", message: "What are research agents?" },
  { label: "Gateway Status", message: "gateway status" },
  { label: "OpenClaw Setup", message: "openclaw setup" },
  { label: "OpenClaw security", message: "OpenClaw security guide" },
  { label: "OpenClaw agents", message: "openclaw agents" },
  { label: "Workspace sync", message: "workspace sync" },
  { label: "OpenClaw tips", message: "tips for OpenClaw" },
  { label: "Use cases", message: "What are OpenClaw use cases?" },
  { label: "HIP-3 AI assets", message: "HIP-3 AI assets on Hyperliquid?" },
  { label: "Search X: AGI", message: "Search X for AGI timeline" },
  { label: "Search X: OpenClaw", message: "Search X for OpenClaw" },
];

const openclawActions = [
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
];

const allActions = [...openclawActions, xSearchAction];

function createMockRuntime(): IAgentRuntime {
  return {
    character: { name: "Clawterm" },
    getService: () => null,
    getSetting: () => undefined,
  } as unknown as IAgentRuntime;
}

function createMessage(text: string): Memory {
  return {
    id: "test-id" as any,
    entityId: "test-entity" as any,
    roomId: "test-room" as any,
    agentId: "test-agent" as any,
    content: { text, source: "test" },
    createdAt: Date.now(),
  } as Memory;
}

describe("Clawterm quick actions", () => {
  const runtime = createMockRuntime();

  for (const { label, message: messageText } of CLAWTERM_QUICK_ACTIONS) {
    if (messageText === "What can you do?") {
      it(`skips "${label}" (discovery)`, () => {});
      continue;
    }

    it(`at least one action validates for: "${label}"`, async () => {
      const message = createMessage(messageText);

      let anyValid = false;
      for (const action of allActions) {
        const ok = await action.validate!(runtime, message);
        if (ok) {
          anyValid = true;
          break;
        }
      }
      expect(
        anyValid,
        `No action validated for quick action "${label}" (message: "${messageText}"). Add or fix a trigger.`,
      ).toBe(true);
    });
  }
});
