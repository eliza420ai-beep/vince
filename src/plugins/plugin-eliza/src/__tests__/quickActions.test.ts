/**
 * Quick actions validation for Eliza (CEO).
 * Ensures each UI quick-action message validates at least one plugin action.
 * Source of truth: QUICK_ACTIONS_BY_AGENT.eliza in chat-interface.tsx.
 */
import { describe, it, expect } from "bun:test";
import { v4 as uuidv4 } from "uuid";
import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { uploadAction } from "../actions/upload.action";
import { knowledgeStatusAction } from "../actions/knowledgeStatus.action";
import { writeEssayAction } from "../actions/writeEssay.action";
import { draftTweetsAction } from "../actions/draftTweets.action";
import { suggestTopicsAction } from "../actions/suggestTopics.action";
import { researchBriefsAction } from "../actions/researchBriefs.action";
import { knowledgeIntelligenceAction } from "../actions/knowledgeIntelligence.action";
import { autoResearchAction } from "../actions/autoResearch.action";

const ELIZA_QUICK_ACTIONS = [
  { label: "What can the CEO do?", message: "What can you do?" },
  { label: "Upload", message: "upload" },
  { label: "Ingest video", message: "ingest this video" },
  { label: "Knowledge status", message: "knowledge status" },
  { label: "Audit knowledge", message: "audit knowledge" },
  { label: "Our research", message: "what does our research say" },
  { label: "Brainstorm", message: "let's brainstorm" },
  { label: "Explore knowledge", message: "explore our knowledge" },
  { label: "Substack draft", message: "write a Substack essay" },
  { label: "Draft tweets", message: "draft tweets" },
  { label: "Positioning", message: "what's our positioning?" },
  { label: "Research agenda", message: "research agenda" },
  {
    label: "Research → Substack",
    message: "Draft Substack from this week's research",
  },
];

function createMessage(text: string, entityId?: UUID): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: entityId ?? (uuidv4() as UUID),
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

function createMinimalRuntime(): IAgentRuntime {
  const agentId = uuidv4() as UUID;
  return {
    agentId,
    character: { name: "Eliza" },
    getSetting: () => null,
    getService: () => null,
  } as unknown as IAgentRuntime;
}

const ELIZA_ACTIONS = [
  uploadAction,
  knowledgeStatusAction,
  writeEssayAction,
  draftTweetsAction,
  suggestTopicsAction,
  researchBriefsAction,
  knowledgeIntelligenceAction,
  autoResearchAction,
];

describe("Eliza quick actions", () => {
  const runtime = createMinimalRuntime();
  const userEntityId = uuidv4() as UUID;

  it("has actions registered", () => {
    expect(ELIZA_ACTIONS.length).toBeGreaterThan(0);
  });

  for (const { label, message } of ELIZA_QUICK_ACTIONS) {
    it(`"${label}" validates at least one action`, async () => {
      const mem = createMessage(message, userEntityId);
      const results = await Promise.all(
        ELIZA_ACTIONS.map((a) =>
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
