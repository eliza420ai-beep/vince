/**
 * Naval quick-actions validation tests.
 * Quick-action messages from QUICK_ACTIONS_BY_AGENT.naval in chat-interface.tsx.
 * Asserts at least one relevant action validates for each message (except "What can you do?").
 */

import { describe, it, expect } from "vitest";
import type { IAgentRuntime, Memory } from "@elizaos/core";
import { navalPushNotPullAction } from "../actions/navalPushNotPull.action";
import { navalOneTeamOneDreamAction } from "../actions/navalOneTeamOneDream.action";
import { navalThesisFirstAction } from "../actions/navalThesisFirst.action";
import { navalSignalNotHypeAction } from "../actions/navalSignalNotHype.action";
import { navalPaperBeforeLiveAction } from "../actions/navalPaperBeforeLive.action";
import { navalOneCommandAction } from "../actions/navalOneCommand.action";
import { navalSizeSkipWatchAction } from "../actions/navalSizeSkipWatch.action";
import { navalWhyThisTradeAction } from "../actions/navalWhyThisTrade.action";
import { navalOneTerminalAction } from "../actions/navalOneTerminal.action";
import { navalAgentsAsLeverageAction } from "../actions/navalAgentsAsLeverage.action";
import { navalTouchGrassAction } from "../actions/navalTouchGrass.action";
import { navalCoverCostsThenProfitAction } from "../actions/navalCoverCostsThenProfit.action";
import { navalSpecificKnowledgeAuditAction } from "../actions/navalSpecificKnowledgeAudit.action";
import { navalExpectedValueAction } from "../actions/navalExpectedValue.action";

const NAVAL_QUICK_ACTIONS = [
  { label: "What can Naval do?", message: "What can you do?" },
  { label: "Push Not Pull", message: "push not pull" },
  { label: "One Team One Dream", message: "one team one dream" },
  { label: "Thesis First", message: "thesis first" },
  { label: "Signal Not Hype", message: "signal not hype" },
  { label: "Paper Before Live", message: "paper before live" },
  { label: "One Command", message: "one command" },
  { label: "Size / Skip / Watch", message: "size skip watch" },
  { label: "Why This Trade", message: "why this trade" },
  { label: "One Terminal", message: "one terminal" },
  { label: "Agents as Leverage", message: "agents as leverage" },
  { label: "Touch Grass", message: "touch grass" },
  { label: "Cover Costs Then Profit", message: "cover costs then profit" },
  { label: "Specific Knowledge Audit", message: "specific knowledge audit" },
  { label: "Expected Value", message: "expected value" },
];

const allActions = [
  navalPushNotPullAction,
  navalOneTeamOneDreamAction,
  navalThesisFirstAction,
  navalSignalNotHypeAction,
  navalPaperBeforeLiveAction,
  navalOneCommandAction,
  navalSizeSkipWatchAction,
  navalWhyThisTradeAction,
  navalOneTerminalAction,
  navalAgentsAsLeverageAction,
  navalTouchGrassAction,
  navalCoverCostsThenProfitAction,
  navalSpecificKnowledgeAuditAction,
  navalExpectedValueAction,
];

const runtime = undefined as unknown as IAgentRuntime;

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

describe("Naval quick actions", () => {
  for (const { label, message: messageText } of NAVAL_QUICK_ACTIONS) {
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
