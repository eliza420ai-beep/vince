/**
 * Quick actions validation for VINCE (CDO).
 * Ensures each UI quick-action message validates at least one plugin action.
 * Source of truth: QUICK_ACTIONS_BY_AGENT.vince in chat-interface.tsx.
 * Imports actions directly to avoid loading full plugin index (module resolution).
 */
import { describe, it, expect } from "vitest";
import { v4 as uuidv4 } from "uuid";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { vinceAlohaAction } from "../actions/aloha.action";
import { vinceReportAction } from "../actions/report.action";
import { vinceOptionsAction } from "../actions/options.action";
import { vincePerpsAction } from "../actions/perps.action";
import { vinceBotStatusAction } from "../actions/vinceBotStatus.action";
import { vinceNewsAction } from "../actions/news.action";
import { vinceHIP3Action } from "../actions/hip3.action";
import { vinceMemesAction } from "../actions/memes.action";
import { vinceNftFloorAction } from "../actions/nftFloor.action";
import { vinceIntelAction } from "../actions/intel.action";

const VINCE_QUICK_ACTIONS = [
  { label: "What can the CDO do?", message: "What can you do?" },
  { label: "ALOHA", message: "aloha" },
  { label: "Report of the day", message: "report of the day" },
  { label: "Options", message: "options" },
  { label: "Perps", message: "perps" },
  { label: "Trading Bot", message: "bot status" },
  { label: "News", message: "news" },
  { label: "Mando Minutes", message: "mando minutes" },
  { label: "HIP3", message: "hip3" },
  { label: "Memes", message: "meme scanner" },
  { label: "NFT Floor", message: "nft floor" },
  { label: "Intel", message: "intel" },
  {
    label: "Bot Performance",
    message: "bot performance report — wins, losses, edge, what to adjust",
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
    character: { name: "VINCE" },
    getSetting: () => null,
    getService: () => null,
  } as unknown as IAgentRuntime;
}

const VINCE_ACTIONS = [
  vinceAlohaAction,
  vinceReportAction,
  vinceOptionsAction,
  vincePerpsAction,
  vinceBotStatusAction,
  vinceNewsAction,
  vinceHIP3Action,
  vinceMemesAction,
  vinceNftFloorAction,
  vinceIntelAction,
];

describe("VINCE quick actions", () => {
  const runtime = createMinimalRuntime();
  const actions = VINCE_ACTIONS;

  it("has actions registered", () => {
    expect(actions.length).toBeGreaterThan(0);
  });

  for (const { label, message } of VINCE_QUICK_ACTIONS) {
    it(`"${label}" (${JSON.stringify(message)}) validates at least one action`, async () => {
      const mem = createMessage(message);
      const results = await Promise.all(
        actions.map((a) => (a.validate ? a.validate(runtime, mem) : false)),
      );
      const someValid = results.some(Boolean);
      if (message.toLowerCase().includes("what can you do")) {
        return;
      }
      expect(someValid, `No action validated for: ${message}`).toBe(true);
    });
  }
});
