/**
 * Otaku quick-actions validation tests.
 * Quick-action messages from QUICK_ACTIONS_BY_AGENT.otaku in chat-interface.tsx.
 * Asserts at least one relevant action validates for each message (except "What can you do?").
 */

import { describe, it, expect } from "vitest";
import type { IAgentRuntime, Memory } from "@elizaos/core";
import {
  otakuSwapAction,
  otakuLimitOrderAction,
  otakuDcaAction,
  otakuPositionsAction,
  otakuBridgeAction,
  otakuBalanceAction,
  otakuStopLossAction,
  otakuMorphoAction,
  otakuNftMintAction,
  otakuYieldRecommendAction,
  otakuExecuteVinceSignalAction,
} from "../actions";
import { bankrAgentPromptAction } from "../../../plugin-bankr/src/actions/bankr-agent-prompt.action";

const OTAKU_QUICK_ACTIONS = [
  { label: "What can the COO do?", message: "What can you do?" },
  { label: "Smart Money", message: "smart money flows" },
  { label: "Token Discovery", message: "token discovery screener" },
  { label: "Morpho", message: "Morpho vault APY" },
  { label: "Bridge", message: "Bridge 0.1 ETH to Arbitrum" },
  {
    label: "DCA",
    message: "Set up a DCA: $50 into ETH over 5 days on Base",
  },
  { label: "PnL Leaderboard", message: "PnL leaderboard" },
  { label: "Yield Rates", message: "best DeFi yield rates" },
  { label: "Portfolio", message: "Show my portfolio" },
  {
    label: "Bankr: Balance",
    message: "Ask Bankr: what is my ETH balance on Base?",
  },
  {
    label: "Bankr: Swap",
    message: "Ask Bankr to swap 10 USDC for ETH on Base",
  },
  {
    label: "Launch Token",
    message:
      "Ask Bankr to deploy a token called MyAgent with symbol AGENT on base",
  },
  {
    label: "Limit Order Quote",
    message: "Get a limit buy quote for ETH on Base via Bankr",
  },
  {
    label: "Stop-loss",
    message: "Set stop-loss at $1800 and take-profit at $2200 for 1 ETH",
  },
  { label: "NFT mint", message: "Mint an NFT" },
  {
    label: "Execute Vince Signal",
    message: "Execute latest Vince signal",
  },
];

const otakuActions = [
  otakuSwapAction,
  otakuLimitOrderAction,
  otakuDcaAction,
  otakuPositionsAction,
  otakuBridgeAction,
  otakuBalanceAction,
  otakuStopLossAction,
  otakuMorphoAction,
  otakuNftMintAction,
  otakuYieldRecommendAction,
  otakuExecuteVinceSignalAction,
];
const allActions = [...otakuActions, bankrAgentPromptAction];

function createMockRuntime(): IAgentRuntime {
  return {
    getService: (name: string) => {
      if (name === "otaku") return { isBankrAvailable: () => true };
      if (name === "relay" || name === "morpho" || name === "cdp") return {};
      if (name === "bankr_agent") return { isConfigured: () => true };
      if (name === "bankr_orders") return { isConfigured: () => true };
      return null;
    },
    getSetting: () => undefined,
    getCache: async () => undefined,
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

describe("Otaku quick actions", () => {
  const runtime = createMockRuntime();

  for (const { label, message: messageText } of OTAKU_QUICK_ACTIONS) {
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
