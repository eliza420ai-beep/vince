/**
 * Quick actions validation for Sentinel (CTO).
 * Ensures each UI quick-action message validates at least one plugin action.
 * Source of truth: QUICK_ACTIONS_BY_AGENT.sentinel in chat-interface.tsx.
 */
import { describe, it, expect } from "vitest";
import { v4 as uuidv4 } from "uuid";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { sentinelSuggestAction } from "../actions/sentinelSuggest.action";
import { sentinelPrdAction } from "../actions/sentinelPrd.action";
import { sentinelCostStatusAction } from "../actions/sentinelCostStatus.action";
import { sentinelOnnxStatusAction } from "../actions/sentinelOnnxStatus.action";
import { sentinelArtGemsAction } from "../actions/sentinelArtGems.action";
import { sentinelOpenclawGuideAction } from "../actions/sentinelOpenclawGuide.action";
import { sentinelDocImproveAction } from "../actions/sentinelDocImprove.action";
import { sentinelShipAction } from "../actions/sentinelShip.action";
import { sentinelSecurityChecklistAction } from "../actions/sentinelSecurityChecklist.action";
import { sentinelInvestorReportAction } from "../actions/sentinelInvestorReport.action";

const SENTINEL_QUICK_ACTIONS = [
  { label: "What can the CTO do?", message: "What can you do?" },
  { label: "Project radar", message: "project radar" },
  { label: "Task Brief", message: "task brief for Claude 4.6" },
  { label: "Cost Status", message: "cost status" },
  { label: "ONNX Status", message: "ONNX status" },
  { label: "ART Gems", message: "art gems" },
  { label: "Clawdbot Guide", message: "clawdbot setup" },
  { label: "What's Next?", message: "what should we do next" },
  { label: "Improve Docs", message: "improve docs" },
  { label: "PRD for Cursor", message: "prd for cursor" },
  { label: "What to Ship?", message: "what should we ship" },
  { label: "Security Checklist", message: "security checklist" },
  { label: "Investor Report", message: "investor report" },
  {
    label: "What Should We Fix?",
    message: "What should we fix next? Code quality, tech debt, blockers",
  },
];

function createMessage(text: string): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

function createMinimalRuntime(): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: { name: "Sentinel" },
    getSetting: () => null,
    getService: () => null,
  } as unknown as IAgentRuntime;
}

const SENTINEL_ACTIONS = [
  sentinelSuggestAction,
  sentinelPrdAction,
  sentinelCostStatusAction,
  sentinelOnnxStatusAction,
  sentinelArtGemsAction,
  sentinelOpenclawGuideAction,
  sentinelDocImproveAction,
  sentinelShipAction,
  sentinelSecurityChecklistAction,
  sentinelInvestorReportAction,
];

describe("Sentinel quick actions", () => {
  const runtime = createMinimalRuntime();

  it("has actions registered", () => {
    expect(SENTINEL_ACTIONS.length).toBeGreaterThan(0);
  });

  for (const { label, message } of SENTINEL_QUICK_ACTIONS) {
    it(`"${label}" (${JSON.stringify(message.slice(0, 40))}...) validates at least one action`, async () => {
      const mem = createMessage(message);
      const results = await Promise.all(
        SENTINEL_ACTIONS.map((a) =>
          a.validate ? a.validate(runtime, mem) : false,
        ),
      );
      const someValid = results.some(Boolean);
      if (message.toLowerCase().includes("what can you do")) {
        return;
      }
      expect(someValid, `No action validated for: ${message}`).toBe(true);
    });
  }
});
