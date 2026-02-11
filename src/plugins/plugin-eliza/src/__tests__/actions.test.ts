/**
 * Plugin Eliza - Action tests
 *
 * Tests action validators and, where practical, handler behavior
 * without full runtime (mocked IAgentRuntime and Memory).
 */

import { describe, it, expect } from "bun:test";
import type { IAgentRuntime, Memory } from "@elizaos/core";
import { knowledgeStatusAction } from "../actions/knowledgeStatus.action";
import { autoResearchAction } from "../actions/autoResearch.action";

// Minimal mock runtime: only agentId is needed for validate checks
function mockRuntime(agentId = "agent-eliza-123"): IAgentRuntime {
  return { agentId } as IAgentRuntime;
}

function mockMessage(text: string, entityId: string): Memory {
  return {
    entityId,
    content: { text },
  } as Memory;
}

describe("KNOWLEDGE_STATUS action", () => {
  const runtime = mockRuntime();

  it("validate: returns true for 'knowledge status'", async () => {
    const message = mockMessage("knowledge status", "user-1");
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'how's the knowledge base'", async () => {
    const message = mockMessage("how's the knowledge base?", "user-1");
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'kb status'", async () => {
    const message = mockMessage("kb status", "user-1");
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns false when message is from the agent itself", async () => {
    const message = mockMessage("knowledge status", runtime.agentId);
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(false);
  });

  it("validate: returns false for unrelated text", async () => {
    const message = mockMessage("hello, what's the weather?", "user-1");
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(false);
  });
});

describe("AUTO_RESEARCH action", () => {
  const runtime = mockRuntime();

  it("validate: returns true for 'audit knowledge'", async () => {
    const message = mockMessage("audit knowledge", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'research agenda'", async () => {
    const message = mockMessage("research agenda", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'fill gaps'", async () => {
    const message = mockMessage("fill gaps", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'what are the knowledge gaps'", async () => {
    const message = mockMessage("what are the knowledge gaps?", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns false for unrelated text", async () => {
    const message = mockMessage("hello", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(false);
  });
});
