/**
 * Oracle quick-actions validation tests.
 * Quick-action messages from QUICK_ACTIONS_BY_AGENT.oracle in chat-interface.tsx.
 * Asserts at least one relevant action validates for each message (except "What can you do?").
 */

import { describe, it, expect } from "bun:test";
import { getVincePolymarketMarketsAction } from "../actions/getVincePolymarketMarkets.action";
import { getActiveMarketsAction } from "../actions/getActiveMarkets.action";
import { searchMarketsAction } from "../actions/searchMarkets.action";
import { getMarketCategoriesAction } from "../actions/getMarketCategories.action";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockPolymarketService,
} from "./test-utils";
// Desk actions (Oracle edge check + desk report)
import { polymarketEdgeCheckAction } from "../../../plugin-polymarket-desk/src/actions/polymarketEdgeCheck.action";
import { polymarketDeskReportAction } from "../../../plugin-polymarket-desk/src/actions/polymarketDeskReport.action";

const ORACLE_QUICK_ACTIONS = [
  { label: "What can the CPO do?", message: "What can you do?" },
  {
    label: "Our focus markets",
    message: "What Polymarket markets matter for us?",
  },
  {
    label: "Trending predictions",
    message: "What are the trending polymarket predictions?",
  },
  {
    label: "Search: Bitcoin",
    message: "Search polymarket for bitcoin predictions",
  },
  {
    label: "Edge check",
    message: "Run Polymarket edge check for BTC",
  },
  {
    label: "Desk report",
    message: "Polymarket desk report for the last 7 days",
  },
  {
    label: "Why we care",
    message: "Why do we care about these Polymarket markets?",
  },
];

const discoveryActions = [
  getVincePolymarketMarketsAction,
  getActiveMarketsAction,
  searchMarketsAction,
  getMarketCategoriesAction,
];

const deskActions = [polymarketEdgeCheckAction, polymarketDeskReportAction];

const allActions = [...discoveryActions, ...deskActions];

function stateWithMessageText(messageText: string) {
  return createMockState({
    recentMessagesData: [
      { id: "1", content: { text: messageText }, createdAt: 0 } as any,
    ],
  });
}

describe("Oracle quick actions", () => {
  const runtime = createMockRuntime({
    polymarketService: createMockPolymarketService([]),
  });

  for (const { label, message: messageText } of ORACLE_QUICK_ACTIONS) {
    if (messageText === "What can you do?") {
      it(`skips "${label}" (discovery)`, () => {});
      continue;
    }

    it(`at least one action validates for: "${label}"`, async () => {
      const message = createMockMessage(messageText);
      const state = stateWithMessageText(messageText);

      let anyValid = false;
      for (const action of allActions) {
        const ok = await action.validate(runtime, message, state);
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
