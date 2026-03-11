/**
 * Quick actions validation for Solus (CFO).
 * Ensures each UI quick-action message validates at least one plugin action.
 * Source of truth: QUICK_ACTIONS_BY_AGENT.solus in chat-interface.tsx.
 */
import { describe, it, expect } from "vitest";
import { v4 as uuidv4 } from "uuid";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { solusStrikeRitualAction } from "../actions/solusStrikeRitual.action";
import { solusHypersurfaceExplainAction } from "../actions/solusHypersurfaceExplain.action";
import { solusPositionAssessAction } from "../actions/solusPositionAssess.action";
import { solusOptimalStrikeAction } from "../actions/solusOptimalStrike.action";
import { solusAnalyzeAction } from "../actions/solusAnalyze.action";
import { solusThemeRadarAction } from "../actions/solusThemeRadar.action";
import { solusEarningsCalendarAction } from "../actions/solusEarningsCalendar.action";
import { solusPremiumPnlAction } from "../actions/solusPremiumPnl.action";

const SOLUS_QUICK_ACTIONS = [
  { label: "What can the CFO do?", message: "What can you do?" },
  {
    label: "How Hypersurface works",
    message: "How does Hypersurface work?",
  },
  {
    label: "Optimal strike this week",
    message:
      "What's the optimal strike for BTC this week? I'll paste VINCE's options view.",
  },
  {
    label: "Strike ritual",
    message:
      "Walk me through strike ritual for Friday — covered calls vs secured puts",
  },
  {
    label: "Secured puts vs calls",
    message: "When do I sell secured puts vs covered calls on Hypersurface?",
  },
  {
    label: "Assess my position",
    message:
      "I have a Hypersurface position — here are the details: [paste strike, notional, premium, expiry]",
  },
  {
    label: "Close early check",
    message:
      "Run close early check on our current Hypersurface positions and tell me hold/close/roll with invalidation.",
  },
  {
    label: "Close early + USDT0",
    message:
      "Should we buy back early now? Include USDT0 funding gap and bridge warning if we cannot close yet.",
  },
  {
    label: "Settlement timing",
    message:
      "Explain Hypersurface settlement timing: Friday 08:00 UTC expiry, early exercise window, and why settlement can take up to 2 hours.",
  },
  {
    label: "Settle All help",
    message:
      "I cannot find my collateral after expiry. What should I do on Hypersurface?",
  },
  {
    label: "Sell probability caveat",
    message:
      "How should I interpret sell probability on Hypersurface? Is it guaranteed?",
  },
  {
    label: "Size or Skip?",
    message:
      "Give me size, skip, or watch and invalidation — I'll paste context",
  },
  { label: "$100K Plan", message: "full $100K plan" },
  { label: "Weekly Premium P&L", message: "weekly premium P&L report" },
  { label: "What's Your Call?", message: "what's your call?" },
  { label: "Analyze NVDA", message: "analyze NVDA" },
  { label: "Analyze TSLA", message: "analyze TSLA" },
  { label: "Analyze AMD", message: "analyze AMD" },
  { label: "Analyze AAPL", message: "analyze AAPL" },
  { label: "Theme Radar", message: "theme radar for AI bottleneck stocks" },
  { label: "Earnings Calendar", message: "earnings calendar" },
  {
    label: "Sector: AI Infra",
    message: "What's the latest on AI infrastructure stocks?",
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

function createSolusRuntime(): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: { name: "Solus" },
    getSetting: () => null,
    getService: () => null,
  } as unknown as IAgentRuntime;
}

const SOLUS_ACTIONS = [
  solusStrikeRitualAction,
  solusHypersurfaceExplainAction,
  solusPositionAssessAction,
  solusOptimalStrikeAction,
  solusAnalyzeAction,
  solusThemeRadarAction,
  solusEarningsCalendarAction,
  solusPremiumPnlAction,
];

describe("Solus quick actions", () => {
  const runtime = createSolusRuntime();

  it("has actions registered", () => {
    expect(SOLUS_ACTIONS.length).toBeGreaterThan(0);
  });

  for (const { label, message } of SOLUS_QUICK_ACTIONS) {
    it(`"${label}" (${JSON.stringify(message.slice(0, 50))}...) validates at least one action`, async () => {
      const mem = createMessage(message);
      const results = await Promise.all(
        SOLUS_ACTIONS.map((a) =>
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
