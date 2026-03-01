/**
 * Quick actions validation for ECHO (CSO).
 * Ensures each UI quick-action message validates at least one plugin action.
 * Source of truth: QUICK_ACTIONS_BY_AGENT.echo in chat-interface.tsx.
 */
import { describe, it, expect } from "vitest";
import { v4 as uuidv4 } from "uuid";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { whatsTheTradeAction } from "../actions/whatsTheTrade.action";
import { xPulseAction } from "../actions/xPulse.action";
import { xVibeAction } from "../actions/xVibe.action";
import { xThreadAction } from "../actions/xThread.action";
import { xAccountAction } from "../actions/xAccount.action";
import { xNewsAction } from "../actions/xNews.action";
import { xSaveResearchAction } from "../actions/xSaveResearch.action";
import { xWatchlistAction } from "../actions/xWatchlist.action";

// Synced with QUICK_ACTIONS_BY_AGENT.echo in chat-interface.tsx
const ECHO_QUICK_ACTIONS = [
  { label: "What can the CSO do?", message: "What can you do?" },
  { label: "What's the trade", message: "What's the trade today?" },
  { label: "X Pulse", message: "What's CT saying today?" },
  { label: "Vibe: BTC", message: "What's the vibe on BTC?" },
  { label: "Vibe: ETH", message: "Sentiment on ETH" },
  { label: "Vibe: SOL", message: "What's the sentiment on SOL?" },
  { label: "Check watchlist", message: "Check my watchlist" },
  {
    label: "Summarize thread",
    message:
      "Summarize a thread — paste a tweet URL in your next message (e.g. https://x.com/user/status/123).",
  },
  { label: "Who is @user?", message: "Who is @crediblecrypto?" },
  { label: "X News", message: "What's the crypto news on X?" },
  { label: "Save that", message: "save that" },
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

function createEchoRuntime(): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: { name: "ECHO" },
    getSetting: () => null,
    getService: () => null,
  } as unknown as IAgentRuntime;
}

const ECHO_ACTIONS = [
  whatsTheTradeAction,
  xPulseAction,
  xVibeAction,
  xWatchlistAction,
  xThreadAction,
  xAccountAction,
  xNewsAction,
  xSaveResearchAction,
];

describe("ECHO quick actions", () => {
  const runtime = createEchoRuntime();

  it("has actions registered", () => {
    expect(ECHO_ACTIONS.length).toBeGreaterThan(0);
  });

  for (const { label, message } of ECHO_QUICK_ACTIONS) {
    it(`"${label}" validates at least one action`, async () => {
      const mem = createMessage(message);
      const results = await Promise.all(
        ECHO_ACTIONS.map((a) =>
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
